#!/bin/sh
set -eu

key_file="${STOREFRONT_API_KEY_FILE:-/runtime/publishable-api-key}"

echo "Waiting for the Medusa publishable API key..."
while [ ! -s "$key_file" ]; do
  sleep 1
done

export NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="$(tr -d '\r\n' < "$key_file")"

cd /server/apps/storefront
echo "Starting Next.js storefront..."
exec pnpm dev
