-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "reviewRequests" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "OrderFeedback" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "canPublish" BOOLEAN NOT NULL DEFAULT false,
    "storyId" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "OrderFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderFeedback_orderId_key" ON "OrderFeedback"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderFeedback_storyId_key" ON "OrderFeedback"("storyId");

-- CreateIndex
CREATE INDEX "OrderFeedback_shopId_status_createdAt_idx" ON "OrderFeedback"("shopId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderFeedback" ADD CONSTRAINT "OrderFeedback_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderFeedback" ADD CONSTRAINT "OrderFeedback_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
