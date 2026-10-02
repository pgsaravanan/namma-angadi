/*
  Warnings:

  - You are about to drop the column `announcement` on the `Shop` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "stockAmount" INTEGER;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "stockUnit" TEXT;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "packAmount" INTEGER;

-- CreateTable
CREATE TABLE "ShopAnnouncement" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'launch',
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "couponId" TEXT,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProductToPromotion" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProductToPromotion_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "ShopAnnouncement_shopId_position_idx" ON "ShopAnnouncement"("shopId", "position");

-- CreateIndex
CREATE INDEX "Promotion_shopId_isActive_idx" ON "Promotion"("shopId", "isActive");

-- CreateIndex
CREATE INDEX "_ProductToPromotion_B_index" ON "_ProductToPromotion"("B");

-- AddForeignKey
ALTER TABLE "ShopAnnouncement" ADD CONSTRAINT "ShopAnnouncement_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToPromotion" ADD CONSTRAINT "_ProductToPromotion_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToPromotion" ADD CONSTRAINT "_ProductToPromotion_B_fkey" FOREIGN KEY ("B") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Move each shop's single announcement into the new list
INSERT INTO "ShopAnnouncement" ("id", "shopId", "message")
SELECT 'ann_' || md5(random()::text || "id"), "id", trim("announcement")
FROM "Shop"
WHERE "announcement" IS NOT NULL AND trim("announcement") <> '';

-- AlterTable
ALTER TABLE "Shop" DROP COLUMN "announcement";
