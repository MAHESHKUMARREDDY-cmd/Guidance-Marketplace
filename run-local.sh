#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker, then run this script again."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is required. Install the Docker Compose plugin, then run this script again."
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Creating local environment secrets..."
  if ! command -v openssl >/dev/null 2>&1; then
    echo "OpenSSL is required to create local secrets."
    exit 1
  fi
  printf 'JWT_SECRET=%s\nMESSAGE_ENCRYPTION_KEY=%s\n' \
    "$(openssl rand -hex 32)" \
    "$(openssl rand -hex 32)" > .env
fi

echo "Starting Guidance Marketplace..."
echo "Open http://localhost:5173 when the containers are ready."

# The database has a named persistent container. Reuse it when it was created
# by an earlier Compose run instead of trying to create a duplicate container.
if docker container inspect guidance_db >/dev/null 2>&1; then
  docker start guidance_db >/dev/null 2>&1 || true
  docker network create guidance-marketplace_default >/dev/null 2>&1 || true
  docker network connect --alias db guidance-marketplace_default guidance_db >/dev/null 2>&1 || true
  docker rm -f guidance_backend guidance_frontend >/dev/null 2>&1 || true
  docker compose up --build -d --no-deps backend frontend
else
  docker compose up --build -d
fi

echo "Guidance Marketplace is running in the background."
docker compose ps
