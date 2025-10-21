#!/bin/bash

echo "🚀 Setting up RestaurantReel with SQLite for local development..."

# Backup original schema
cp prisma/schema.prisma prisma/schema.postgres.prisma

# Use SQLite schema
cp prisma/schema.sqlite.prisma prisma/schema.prisma

# Update .env for SQLite
cat > .env << EOF
# Database (SQLite for local development)
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="development-secret-change-in-production"

# Cloudflare R2 Storage (optional for basic setup)
CLOUDFLARE_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
EOF

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push database schema
echo "📊 Creating SQLite database..."
npx prisma db push

echo "✅ Setup complete! You can now run 'npm run dev'"
echo "📝 Note: Using SQLite for local development. Original PostgreSQL schema backed up to prisma/schema.postgres.prisma"