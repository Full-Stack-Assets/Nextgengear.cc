#!/bin/bash
set -euo pipefail

# Build script that handles TinaCMS configuration gracefully.
# If TinaCMS credentials are not provided, skip the TinaCMS cloud build and
# compile the site directly from repository content.

if [ -z "${NEXT_PUBLIC_TINA_CLIENT_ID:-}" ] || [ -z "${TINA_TOKEN:-}" ]; then
  echo "⚠️  TinaCMS credentials not found. Skipping TinaCMS cloud build..."
  echo "ℹ️  TinaCMS will run in self-hosted mode (local filesystem editing)"
else
  echo "ℹ️  TinaCMS credentials found. Building with cloud support..."
  echo "🔨 Building TinaCMS admin..."
  npx tinacms build
fi

echo "🔨 Building Next.js app..."
npx next build

echo "✅ Build completed successfully!"
