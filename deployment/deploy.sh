#!/usr/bin/env bash
set -e

# Always run from the directory where the script and docker-compose file live
cd "$(dirname "$0")"

echo "========================================="
echo " Deploying web-ai-agent (latest)"
echo "========================================="

if [ -d "./src-build" ]; then
  echo "==> [1/3] Building image from local src-build..."
  docker compose build
else
  echo "==> [1/3] Pulling latest image from registry..."
  docker compose pull
fi

echo "==> [2/3] Stopping and removing existing container..."
docker compose down

echo "==> [3/3] Starting new container..."
docker compose up -d

echo "========================================="
echo " Container Status:"
echo "========================================="
docker compose ps
echo "========================================="
echo " Deployment completed successfully!"
echo "========================================="
