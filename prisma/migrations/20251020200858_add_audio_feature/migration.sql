-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('RAW_VIDEO', 'TRIMMED_VIDEO', 'FINAL_EXPORT', 'FINAL_VIDEO', 'THUMBNAIL', 'AUDIO');

-- CreateTable
CREATE TABLE "reel_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reel_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reel_brand_kits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#000000',
    "secondaryColor" TEXT NOT NULL DEFAULT '#ffffff',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reel_brand_kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reel_projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PENDING',
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reel_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reel_assets" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "url" TEXT NOT NULL,
    "duration" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reel_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reel_users_email_key" ON "reel_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "reel_brand_kits_userId_key" ON "reel_brand_kits"("userId");

-- AddForeignKey
ALTER TABLE "reel_brand_kits" ADD CONSTRAINT "reel_brand_kits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "reel_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_projects" ADD CONSTRAINT "reel_projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "reel_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_assets" ADD CONSTRAINT "reel_assets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "reel_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
