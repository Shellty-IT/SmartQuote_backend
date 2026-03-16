-- AlterEnum
ALTER TYPE "InteractionType" ADD VALUE 'VARIANT_SWITCH';

-- AlterTable
ALTER TABLE "offer_items" ADD COLUMN     "variantName" TEXT;

-- CreateIndex
CREATE INDEX "offer_items_offerId_variantName_idx" ON "offer_items"("offerId", "variantName");
