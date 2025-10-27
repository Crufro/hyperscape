#!/bin/bash
set -e

# Setup Assets Script
# Downloads 3D models and assets from HyperscapeAI/assets repository

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR="$ROOT_DIR/assets/world"
TEMP_ASSETS="$ROOT_DIR/.temp-assets"

echo "🚀 Setting up game assets..."

# Create assets directories
mkdir -p "$ASSETS_DIR/models"
mkdir -p "$ASSETS_DIR/manifests"

# Clone assets repo to temp location
if [ -d "$TEMP_ASSETS" ]; then
  echo "📦 Updating existing assets repository..."
  cd "$TEMP_ASSETS"
  git pull
else
  echo "📦 Cloning assets repository..."
  git clone https://github.com/HyperscapeAI/assets.git "$TEMP_ASSETS"
fi

# Copy models
echo "📁 Copying 3D models..."
cp -r "$TEMP_ASSETS/models/"* "$ASSETS_DIR/models/"

# Copy manifests
echo "📋 Copying manifests..."
cp -r "$TEMP_ASSETS/manifests/"* "$ASSETS_DIR/manifests/"

# Cleanup temp directory
echo "🧹 Cleaning up..."
rm -rf "$TEMP_ASSETS"

echo "✅ Assets setup complete!"
echo ""
echo "📊 Asset Summary:"
echo "   Models: $(find "$ASSETS_DIR/models" -name "*.glb" | wc -l | tr -d ' ') GLB files"
echo "   Manifests: $(ls "$ASSETS_DIR/manifests"/*.json 2>/dev/null | wc -l | tr -d ' ') files"
echo ""
echo "🌐 CDN will serve from: http://localhost:8080/assets/world/"
