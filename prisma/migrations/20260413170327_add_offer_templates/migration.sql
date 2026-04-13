-- CreateTable
CREATE TABLE "offer_templates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "defaultPaymentDays" INTEGER NOT NULL DEFAULT 14,
    "defaultTerms" TEXT,
    "defaultNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_template_items" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'szt.',
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 23,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "variantName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offer_templates_userId_idx" ON "offer_templates"("userId");

-- CreateIndex
CREATE INDEX "offer_templates_userId_category_idx" ON "offer_templates"("userId", "category");

-- CreateIndex
CREATE INDEX "offer_template_items_templateId_idx" ON "offer_template_items"("templateId");

-- AddForeignKey
ALTER TABLE "offer_templates" ADD CONSTRAINT "offer_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_template_items" ADD CONSTRAINT "offer_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "offer_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
