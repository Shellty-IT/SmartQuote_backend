/*
  Warnings:

  - A unique constraint covering the columns `[publicToken]` on the table `contracts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "publicToken" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "contracts_publicToken_key" ON "contracts"("publicToken");

-- CreateIndex
CREATE INDEX "contracts_publicToken_idx" ON "contracts"("publicToken");
