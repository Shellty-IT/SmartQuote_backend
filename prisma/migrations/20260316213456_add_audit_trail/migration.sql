-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "requireAuditTrail" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "offer_acceptance_logs" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentHash" TEXT NOT NULL,
    "acceptedData" JSONB NOT NULL,
    "clientName" TEXT,
    "clientEmail" TEXT,
    "selectedVariant" TEXT,
    "totalNet" DECIMAL(12,2) NOT NULL,
    "totalVat" DECIMAL(12,2) NOT NULL,
    "totalGross" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_acceptance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offer_acceptance_logs_offerId_key" ON "offer_acceptance_logs"("offerId");

-- CreateIndex
CREATE INDEX "offer_acceptance_logs_offerId_idx" ON "offer_acceptance_logs"("offerId");

-- CreateIndex
CREATE INDEX "offer_acceptance_logs_contentHash_idx" ON "offer_acceptance_logs"("contentHash");

-- AddForeignKey
ALTER TABLE "offer_acceptance_logs" ADD CONSTRAINT "offer_acceptance_logs_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
