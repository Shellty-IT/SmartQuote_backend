-- AlterTable
ALTER TABLE "follow_ups" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "follow_ups_status_dueDate_reminderSentAt_idx" ON "follow_ups"("status", "dueDate", "reminderSentAt");
