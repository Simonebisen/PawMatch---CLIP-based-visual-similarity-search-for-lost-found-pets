"""CLIP-based image embedding service.

The model is loaded once and cached (see `load_model`, called from the FastAPI
lifespan in app/main.py) rather than per-request — loading ViT-B-32 takes a
noticeable amount of time and memory, so doing it on every request would make
the API unusably slow.
"""

from functools import lru_cache

import open_clip
import torch
from PIL import Image

MODEL_NAME = "ViT-B-32"
PRETRAINED = "openai"
EMBEDDING_DIM = 512


@lru_cache
def _get_model():
    model, _, preprocess = open_clip.create_model_and_transforms(MODEL_NAME, pretrained=PRETRAINED)
    model.eval()
    return model, preprocess


def load_model() -> None:
    """Eagerly load and cache the CLIP model. Call once at app startup."""
    _get_model()


def embed_image(image: Image.Image) -> list[float]:
    """Embed a PIL image into a 512-dim, L2-normalized CLIP vector.

    Normalizing so downstream cosine-similarity search (the ivfflat
    vector_cosine_ops index) behaves as expected.
    """
    model, preprocess = _get_model()
    tensor = preprocess(image.convert("RGB")).unsqueeze(0)

    with torch.no_grad():
        features = model.encode_image(tensor)
        features = features / features.norm(dim=-1, keepdim=True)

    return features.squeeze(0).tolist()
