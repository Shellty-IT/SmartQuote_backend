-- CreateIndex
CREATE INDEX "clients_userId_name_idx" ON "clients"("userId", "name");

-- CreateIndex
CREATE INDEX "contracts_userId_status_idx" ON "contracts"("userId", "status");

-- CreateIndex
CREATE INDEX "follow_ups_userId_status_idx" ON "follow_ups"("userId", "status");

-- CreateIndex
CREATE INDEX "follow_ups_userId_dueDate_idx" ON "follow_ups"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "offer_comments_offerId_createdAt_idx" ON "offer_comments"("offerId", "createdAt");

-- CreateIndex
CREATE INDEX "offer_interactions_offerId_createdAt_idx" ON "offer_interactions"("offerId", "createdAt");

-- CreateIndex
CREATE INDEX "offer_items_offerId_name_idx" ON "offer_items"("offerId", "name");

-- CreateIndex
CREATE INDEX "offer_items_name_idx" ON "offer_items"("name");

-- CreateIndex
CREATE INDEX "offer_legacy_insights_userId_createdAt_idx" ON "offer_legacy_insights"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "offer_views_offerId_viewedAt_idx" ON "offer_views"("offerId", "viewedAt");

-- CreateIndex
CREATE INDEX "offers_userId_status_idx" ON "offers"("userId", "status");

-- CreateIndex
CREATE INDEX "offers_userId_createdAt_idx" ON "offers"("userId", "createdAt");
