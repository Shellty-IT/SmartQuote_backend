/*
  Warnings:

  - A unique constraint covering the columns `[publicToken]` on the table `offers` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('VIEW', 'ITEM_SELECT', 'ITEM_DESELECT', 'QUANTITY_CHANGE', 'ACCEPT', 'REJECT', 'COMMENT', 'PDF_DOWNLOAD');

-- CreateEnum
CREATE TYPE "CommentAuthor" AS ENUM ('CLIENT', 'SELLER');

-- AlterTable
ALTER TABLE "offer_items" ADD COLUMN     "isOptional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSelected" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxQuantity" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "minQuantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "clientSelectedData" JSONB,
ADD COLUMN     "isInteractive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastViewedAt" TIMESTAMP(3),
ADD COLUMN     "publicToken" TEXT,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "offer_views" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "duration" INTEGER,

    CONSTRAINT "offer_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_interactions" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_comments" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "author" "CommentAuthor" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offer_views_offerId_idx" ON "offer_views"("offerId");

-- CreateIndex
CREATE INDEX "offer_interactions_offerId_idx" ON "offer_interactions"("offerId");

-- CreateIndex
CREATE INDEX "offer_interactions_offerId_type_idx" ON "offer_interactions"("offerId", "type");

-- CreateIndex
CREATE INDEX "offer_comments_offerId_idx" ON "offer_comments"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "offers_publicToken_key" ON "offers"("publicToken");

-- CreateIndex
CREATE INDEX "offers_publicToken_idx" ON "offers"("publicToken");

-- AddForeignKey
ALTER TABLE "offer_views" ADD CONSTRAINT "offer_views_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_interactions" ADD CONSTRAINT "offer_interactions_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_comments" ADD CONSTRAINT "offer_comments_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
