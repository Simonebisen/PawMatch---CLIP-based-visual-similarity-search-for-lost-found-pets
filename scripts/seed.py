#!/usr/bin/env python3
"""Seed the database with synthetic lost/found reports from the Oxford-IIIT Pet Dataset.

Run inside the backend container (needs the real app.* modules, Postgres, and
the dataset mounted at /data/source — see docker-compose.yml):

    docker compose -f docker/docker-compose.yml exec api python scripts/seed.py --limit 500
    docker compose -f docker/docker-compose.yml exec api python scripts/seed.py --limit 500 --reset

`--limit` is the TOTAL number of report rows to create. A fraction of them
(PAIR_FRACTION, ~15-20%) are deliberately created as "obvious pairs": the same
source photo used for one "lost" report and one "found" report, with close-by
coordinates and a found_date a few days after the lost_date, so Phase 3
matching has real matches to find rather than pure noise.
"""

import argparse
import asyncio
import io
import math
import random
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.config import settings  # noqa: E402
from app.db.session import AsyncSessionLocal, engine  # noqa: E402
from app.models.report import Report, ReportEmbedding  # noqa: E402
from app.services.embedding import embed_image  # noqa: E402
from app.services.storage import save_image_bytes  # noqa: E402

DEFAULT_DATASET_DIR = "/data/source"
SEED_IMAGE_PREFIX = "seed-"
PAIR_FRACTION = 0.175
BATCH_SIZE = 50

COLORS = ["black", "white", "brown", "golden", "gray", "tan", "black and white", "orange"]
NEIGHBORHOODS = [
    "Riverside", "Downtown", "Uptown", "Westside", "Eastside",
    "Parkside", "Lakeview", "Hillcrest", "Midtown", "Northgate",
]
DESCRIPTION_TEMPLATES = [
    "{action} {breed} in the {neighborhood} area, {color} coat.",
    "{action} {breed} near {neighborhood}. Has a {color} coat.",
    "{action} {breed}, {color} coat, last seen around {neighborhood}.",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed demo reports from the Oxford-IIIT Pet Dataset.")
    parser.add_argument("--limit", type=int, default=500, help="Total number of reports to create (default: 500)")
    parser.add_argument(
        "--dataset-dir",
        default=DEFAULT_DATASET_DIR,
        help=f"Dataset root containing images/ and annotations/list.txt (default: {DEFAULT_DATASET_DIR})",
    )
    parser.add_argument("--lat", type=float, default=39.7392, help="City center latitude (default: Denver, CO)")
    parser.add_argument("--lon", type=float, default=-104.9903, help="City center longitude (default: Denver, CO)")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Truncate reports/report_embeddings and delete previously-seeded images first",
    )
    return parser.parse_args()


def load_dataset_entries(dataset_dir: Path) -> list[tuple[Path, str, str]]:
    """Return (image_path, species, breed) for every annotated image found on disk."""
    list_path = dataset_dir / "annotations" / "list.txt"
    images_dir = dataset_dir / "images"

    entries = []
    with list_path.open() as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            filename, _class_id, species_id, _breed_id = line.split()
            image_path = images_dir / f"{filename}.jpg"
            if not image_path.exists():
                continue
            species = "cat" if species_id == "1" else "dog"
            breed = filename.rsplit("_", 1)[0].replace("_", " ").title()
            entries.append((image_path, species, breed))
    return entries


def random_point_near(lat: float, lon: float, radius_km: float) -> tuple[float, float]:
    """Uniform random point within a radius_km x radius_km box centered on (lat, lon)."""
    lat_deg_per_km = 1 / 111.0
    lon_deg_per_km = 1 / (111.0 * max(math.cos(math.radians(lat)), 0.01))
    d_lat = random.uniform(-radius_km, radius_km) * lat_deg_per_km
    d_lon = random.uniform(-radius_km, radius_km) * lon_deg_per_km
    return lat + d_lat, lon + d_lon


def build_description(action: str, breed: str, neighborhood: str, color: str) -> str:
    template = random.choice(DESCRIPTION_TEMPLATES)
    return template.format(action=action, breed=breed, neighborhood=neighborhood, color=color)


def embed_source_image(image_path: Path) -> tuple[bytes, list[float]]:
    contents = image_path.read_bytes()
    with Image.open(io.BytesIO(contents)) as img:
        img.load()
        vector = embed_image(img)
    return contents, vector


def make_single_plan(species: str, breed: str, city_lat: float, city_lon: float, contact_n: int) -> dict:
    report_type = random.choice(["lost", "found"])
    lat, lon = random_point_near(city_lat, city_lon, radius_km=15)
    color = random.choice(COLORS)
    neighborhood = random.choice(NEIGHBORHOODS)
    return dict(
        report_type=report_type,
        species=species,
        breed=breed,
        color=color,
        description=build_description(report_type.capitalize(), breed, neighborhood, color),
        contact_info=f"reporter{contact_n}@example.com",
        latitude=lat,
        longitude=lon,
        event_date=date.today() - timedelta(days=random.randint(0, 60)),
        status="open",
    )


def make_pair_plans(
    species: str, breed: str, city_lat: float, city_lon: float, contact_n_lost: int, contact_n_found: int
) -> tuple[dict, dict]:
    base_lat, base_lon = random_point_near(city_lat, city_lon, radius_km=15)
    lost_lat, lost_lon = random_point_near(base_lat, base_lon, radius_km=1)
    found_lat, found_lon = random_point_near(base_lat, base_lon, radius_km=1)

    lost_date = date.today() - timedelta(days=random.randint(10, 60))
    found_date = lost_date + timedelta(days=random.randint(2, 7))

    neighborhood = random.choice(NEIGHBORHOODS)
    lost_color = random.choice(COLORS)
    found_color = random.choice(COLORS)

    lost_plan = dict(
        report_type="lost",
        species=species,
        breed=breed,
        color=lost_color,
        description=build_description("Lost", breed, neighborhood, lost_color),
        contact_info=f"reporter{contact_n_lost}@example.com",
        latitude=lost_lat,
        longitude=lost_lon,
        event_date=lost_date,
        status="open",
    )
    found_plan = dict(
        report_type="found",
        species=species,
        breed=breed,
        color=found_color,
        description=build_description("Found", breed, neighborhood, found_color),
        contact_info=f"reporter{contact_n_found}@example.com",
        latitude=found_lat,
        longitude=found_lon,
        event_date=found_date,
        status="open",
    )
    return lost_plan, found_plan


def build_work_items(
    pair_entries: list[tuple[Path, str, str]],
    single_entries: list[tuple[Path, str, str]],
    city_lat: float,
    city_lon: float,
) -> list[tuple[Path, str, list[dict], bool]]:
    """Each item is (image_path, species, [plan, ...], is_pair) — 2 plans for pairs, 1 for singles."""
    items = []
    contact_n = 1

    for image_path, species, breed in pair_entries:
        lost_plan, found_plan = make_pair_plans(species, breed, city_lat, city_lon, contact_n, contact_n + 1)
        contact_n += 2
        items.append((image_path, species, [lost_plan, found_plan], True))

    for image_path, species, breed in single_entries:
        plan = make_single_plan(species, breed, city_lat, city_lon, contact_n)
        contact_n += 1
        items.append((image_path, species, [plan], False))

    random.shuffle(items)
    return items


async def reset_data() -> None:
    async with engine.begin() as conn:
        await conn.execute(text("TRUNCATE TABLE report_embeddings, reports"))

    storage_dir = Path(settings.image_storage_path)
    if storage_dir.exists():
        for f in storage_dir.glob(f"{SEED_IMAGE_PREFIX}*"):
            f.unlink()


async def main() -> None:
    args = parse_args()
    dataset_dir = Path(args.dataset_dir)

    if args.reset:
        print("Resetting: truncating reports/report_embeddings and clearing previously-seeded images...")
        await reset_data()

    entries = load_dataset_entries(dataset_dir)
    if not entries:
        print(f"No dataset entries found under {dataset_dir}. Check --dataset-dir.", file=sys.stderr)
        sys.exit(1)

    num_paired_reports = int(args.limit * PAIR_FRACTION)
    if num_paired_reports % 2 == 1:
        num_paired_reports -= 1
    num_pairs = num_paired_reports // 2
    num_singles = args.limit - num_paired_reports
    num_images_needed = num_pairs + num_singles

    if num_images_needed > len(entries):
        print(
            f"Requested {num_images_needed} distinct images but the dataset only has {len(entries)}. "
            "Reduce --limit.",
            file=sys.stderr,
        )
        sys.exit(1)

    selected = random.sample(entries, num_images_needed)
    pair_entries = selected[:num_pairs]
    single_entries = selected[num_pairs:]
    items = build_work_items(pair_entries, single_entries, args.lat, args.lon)

    print(
        f"Seeding {args.limit} reports ({num_pairs} obvious pairs = {num_paired_reports} reports, "
        f"{num_singles} singles) from {num_images_needed} distinct images..."
    )

    started = datetime.now(timezone.utc)
    created_count = 0
    failed = 0
    uncommitted = 0
    pair_ids: list[tuple[str, str]] = []
    type_counts = {"lost": 0, "found": 0}
    species_counts = {"dog": 0, "cat": 0}

    async with AsyncSessionLocal() as session:
        for image_path, species, plans, is_pair in items:
            try:
                contents, vector = embed_source_image(image_path)
            except Exception as exc:  # noqa: BLE001 - dataset can contain occasional corrupt images
                failed += 1
                print(f"  WARNING: skipping {image_path.name}: {exc}", file=sys.stderr)
                continue

            row_ids = []
            for plan in plans:
                image_dest = save_image_bytes(contents, suffix=".jpg", prefix=SEED_IMAGE_PREFIX)
                report = Report(**plan, image_path=image_dest)
                session.add(report)
                await session.flush()
                session.add(ReportEmbedding(report_id=report.id, embedding=vector))

                type_counts[plan["report_type"]] += 1
                species_counts[species] += 1
                row_ids.append(str(report.id))
                uncommitted += 1

            if is_pair:
                pair_ids.append((row_ids[0], row_ids[1]))

            created_count += len(plans)
            if uncommitted >= BATCH_SIZE:
                await session.commit()
                uncommitted = 0
                print(f"  ...{created_count}/{args.limit} reports created")

        if uncommitted:
            await session.commit()

    elapsed = (datetime.now(timezone.utc) - started).total_seconds()

    print()
    print("=== Seed summary ===")
    print(f"Total reports created: {created_count}" + (f" ({failed} images skipped)" if failed else ""))
    print(f"By type: lost={type_counts['lost']}, found={type_counts['found']}")
    print(f"By species: dog={species_counts['dog']}, cat={species_counts['cat']}")
    print(f"Obvious pairs planted: {len(pair_ids)}")
    print(f"Elapsed: {elapsed:.1f}s")
    if pair_ids:
        print("Sample pair report ids (lost_id, found_id):")
        for lost_id, found_id in pair_ids[:5]:
            print(f"  {lost_id}  <->  {found_id}")


if __name__ == "__main__":
    asyncio.run(main())
