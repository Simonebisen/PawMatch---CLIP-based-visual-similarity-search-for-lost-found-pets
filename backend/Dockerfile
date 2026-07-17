FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffering stdout/stderr.
# HF_HOME redirects the CLIP weight cache (downloaded via huggingface_hub on
# first use) under /data instead of the default ~/.cache/huggingface, so it
# survives container restarts as long as /data is a mounted volume/disk —
# without this, every fresh container re-downloads ~350MB of weights.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/data/hf-cache

WORKDIR /app

# Install dependencies first so this layer is cached across code changes.
# --extra-index-url pulls the CPU-only torch wheel (~200MB) instead of the
# default CUDA build (~2GB+), which we don't need for in-process CPU inference.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

# Copy the application code. In dev this is also bind-mounted over by
# docker-compose so edits reload live.
COPY . .

EXPOSE 8000

# --reload for development; drop it for production images.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
