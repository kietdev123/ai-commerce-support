#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
DIFY_DIR="$SCRIPT_DIR/dify"
DIFY_ENV="$DIFY_DIR/docker/.env"
DIFY_COMPOSE="$DIFY_DIR/docker/docker-compose.yaml"
DIFY_OVERRIDE="$PROJECT_DIR/docker-compose.dify.yml"
SHARED_NETWORK=ai-commerce-support_default

if [ ! -f "$DIFY_COMPOSE" ]; then
  echo "Dify source is missing from ai-platform/dify. Restore it from this repository." >&2
  exit 1
fi

if [ ! -f "$DIFY_ENV" ]; then
  cp "$DIFY_DIR/docker/.env.example" "$DIFY_ENV"
  echo "Created $DIFY_ENV from the upstream example." >&2
fi

export EXPOSE_NGINX_PORT="127.0.0.1:${DIFY_PORT:-3000}"
export EXPOSE_NGINX_SSL_PORT="127.0.0.1:${DIFY_SSL_PORT:-3443}"

run_compose() {
  docker compose \
    --project-name ai-commerce-support-dify \
    --env-file "$DIFY_ENV" \
    -f "$DIFY_COMPOSE" \
    -f "$DIFY_OVERRIDE" \
    "$@"
}

case "${1:-up}" in
  up)
    if ! docker network inspect "$SHARED_NETWORK" >/dev/null 2>&1; then
      echo "Docker network $SHARED_NETWORK is missing." >&2
      echo "Start the commerce stack first with: docker compose up --build -d" >&2
      exit 1
    fi
    run_compose up -d
    ;;
  down)
    run_compose down
    ;;
  logs)
    run_compose logs -f
    ;;
  ps)
    run_compose ps
    ;;
  config)
    run_compose config
    ;;
  *)
    echo "Usage: $0 {up|down|logs|ps|config}" >&2
    exit 2
    ;;
esac
