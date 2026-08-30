#!/bin/sh
set -eu

cd /server/apps/backend

echo "Running Medusa database migrations..."
pnpm medusa db:migrate

echo "Seeding Phase 1 demo data when needed..."
pnpm seed

echo "Ensuring the local admin user exists..."
if ! pnpm medusa user -e "${MEDUSA_ADMIN_EMAIL}" -p "${MEDUSA_ADMIN_PASSWORD}"; then
  echo "Admin user already exists; continuing."
fi

echo "Starting Medusa backend and Admin..."
exec pnpm dev
