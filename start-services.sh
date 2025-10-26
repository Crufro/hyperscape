#!/bin/bash
# Start Asset Forge services with PostgreSQL and API

echo "🚀 Starting Asset Forge Services..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop first."
  exit 1
fi

# Check for required environment variables
if [ ! -f "apps/api/.env" ]; then
  echo "⚠️  No .env file found at apps/api/.env"
  echo "Please create one with:"
  echo "  OPENAI_API_KEY=your_key_here"
  echo "  MESHY_API_KEY=your_key_here"
  echo "  ANTHROPIC_API_KEY=your_key_here (optional)"
  exit 1
fi

# Install dependencies if needed
echo "📦 Installing dependencies..."
cd apps/api && bun install && cd ../..

# Start services with docker-compose
echo "🐳 Starting Docker services (PostgreSQL + API)..."
docker-compose up -d

# Wait for PostgreSQL to be healthy
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout=60
elapsed=0
while [ $elapsed -lt $timeout ]; do
  if docker exec asset-forge-db pg_isready -U asset_forge > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready!"
    break
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done

if [ $elapsed -ge $timeout ]; then
  echo "❌ PostgreSQL failed to start within ${timeout} seconds"
  docker-compose logs postgres
  exit 1
fi

# Show logs
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "✅ Services started successfully!"
echo ""
echo "📡 Endpoints:"
echo "  - API Server: http://localhost:3004"
echo "  - PostgreSQL: localhost:5433"
echo "  - Database: asset_forge"
echo ""
echo "🔍 View logs:"
echo "  docker-compose logs -f api     # API server logs"
echo "  docker-compose logs -f postgres # PostgreSQL logs"
echo ""
echo "🛑 Stop services:"
echo "  docker-compose down"
