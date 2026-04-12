-- prisma/migrations/20260415000000_add_email_logs_and_templates/migration.sql

CREATE TYPE "EmailLogStatus" AS ENUM ('SENT', 'FAILED', 'DRAFT');

CREATE TABLE "email_logs" (
                              "id" TEXT NOT NULL,
                              "userId" TEXT NOT NULL,
                              "to" TEXT NOT NULL,
                              "toName" TEXT,
                              "subject" TEXT NOT NULL,
                              "body" TEXT NOT NULL,
                              "status" "EmailLogStatus" NOT NULL DEFAULT 'SENT',
                              "errorMessage" TEXT,
                              "attachments" JSONB NOT NULL DEFAULT '[]',
                              "clientId" TEXT,
                              "offerId" TEXT,
                              "contractId" TEXT,
                              "templateId" TEXT,
                              "templateName" TEXT,
                              "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              "updatedAt" TIMESTAMP(3) NOT NULL,

                              CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_templates" (
                                   "id" TEXT NOT NULL,
                                   "userId" TEXT NOT NULL,
                                   "name" TEXT NOT NULL,
                                   "subject" TEXT NOT NULL,
                                   "body" TEXT NOT NULL,
                                   "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
                                   "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                   "updatedAt" TIMESTAMP(3) NOT NULL,

                                   CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_logs_userId_idx" ON "email_logs"("userId");
CREATE INDEX "email_logs_userId_status_idx" ON "email_logs"("userId", "status");
CREATE INDEX "email_logs_userId_sentAt_idx" ON "email_logs"("userId", "sentAt");
CREATE INDEX "email_logs_clientId_idx" ON "email_logs"("clientId");
CREATE INDEX "email_logs_offerId_idx" ON "email_logs"("offerId");
CREATE INDEX "email_logs_contractId_idx" ON "email_logs"("contractId");
CREATE INDEX "email_templates_userId_idx" ON "email_templates"("userId");
CREATE INDEX "email_templates_userId_name_idx" ON "email_templates"("userId", "name");

ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_offerId_fkey"
    FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;