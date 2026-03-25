-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "invoiceExternalId" TEXT,
ADD COLUMN     "invoiceSentAt" TIMESTAMP(3);
