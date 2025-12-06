-- AlterEnum
ALTER TYPE "FollowUpType" ADD VALUE 'TASK';

-- AlterTable
ALTER TABLE "follow_ups" ADD COLUMN     "contractId" TEXT,
ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE INDEX "follow_ups_clientId_idx" ON "follow_ups"("clientId");

-- CreateIndex
CREATE INDEX "follow_ups_offerId_idx" ON "follow_ups"("offerId");

-- CreateIndex
CREATE INDEX "follow_ups_contractId_idx" ON "follow_ups"("contractId");

-- CreateIndex
CREATE INDEX "follow_ups_priority_idx" ON "follow_ups"("priority");

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
