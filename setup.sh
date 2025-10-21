#!/bin/bash

echo "🚀 Setting up RestaurantReel locally..."

# Check if PostgreSQL is running
if ! pg_isready -q; then
  echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
  echo "   On macOS: brew services start postgresql"
  echo "   On Ubuntu: sudo service postgresql start"
  exit 1
fi

# Create database if it doesn't exist
echo "📊 Setting up database..."
createdb restaurant_reel 2>/dev/null || echo "Database already exists"

# Update DATABASE_URL in .env.local
if [ ! -f .env.local ]; then
  echo "📝 Creating .env.local file..."
  cat > .env.local << EOF
# Database
DATABASE_URL="postgresql://\$USER@localhost:5432/restaurant_reel?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="development-secret-change-in-production"

# Cloudflare R2 Storage (optional for basic setup)
CLOUDFLARE_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
EOF
else
  echo "✅ .env.local already exists"
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push database schema
echo "📊 Pushing database schema..."
npx prisma db push

echo "✅ Setup complete! You can now run 'npm run dev'"