-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CONTRACT_SIGNED';

-- CreateTable
CREATE TABLE "contract_signature_logs" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentHash" TEXT NOT NULL,
    "signatureImage" TEXT NOT NULL,
    "signedData" JSONB NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "totalNet" DECIMAL(12,2) NOT NULL,
    "totalVat" DECIMAL(12,2) NOT NULL,
    "totalGross" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_signature_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_signature_logs_contractId_key" ON "contract_signature_logs"("contractId");

-- CreateIndex
CREATE INDEX "contract_signature_logs_contractId_idx" ON "contract_signature_logs"("contractId");

-- CreateIndex
CREATE INDEX "contract_signature_logs_contentHash_idx" ON "contract_signature_logs"("contentHash");

-- AddForeignKey
ALTER TABLE "contract_signature_logs" ADD CONSTRAINT "contract_signature_logs_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
