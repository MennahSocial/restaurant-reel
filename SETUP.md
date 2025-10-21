# RestaurantReel Local Setup Guide

## Option 1: Quick Setup with SQLite (Recommended for testing)

1. **Update Prisma to use SQLite:**
   ```bash
   # This will switch to SQLite for easier local development
   npm run setup:sqlite
   ```

## Option 2: Full PostgreSQL Setup

1. **Install PostgreSQL:**
   ```bash
   # Install PostgreSQL using Homebrew
   brew install postgresql@14
   
   # Start PostgreSQL service
   brew services start postgresql@14
   
   # Add PostgreSQL to your PATH (add to ~/.zshrc)
   echo 'export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

2. **Create Database:**
   ```bash
   # Create the database
   createdb restaurant_reel
   
   # Push the schema
   npx prisma db push
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

## Environment Variables

The `.env` file has been created with basic settings. Update the DATABASE_URL if needed:

- For PostgreSQL: `postgresql://username@localhost:5432/restaurant_reel`
- For SQLite: `file:./dev.db`

## Troubleshooting

- If you get database connection errors, make sure PostgreSQL is running
- If you get migration errors, try `npx prisma db push --force-reset`
- If you get environment variable errors, make sure `.env` exists in the project root

## Current Issue

The main issue appears to be that PostgreSQL is not installed on your system. The easiest solution for local development is to use SQLite instead.