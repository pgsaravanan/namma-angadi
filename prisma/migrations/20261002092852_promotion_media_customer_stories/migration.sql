-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "mediaUrl" TEXT;

-- CreateTable
CREATE TABLE "CustomerStory" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "customerName" TEXT,
    "place" TEXT,
    "mediaUrl" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerStory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerStory_shopId_isActive_position_idx" ON "CustomerStory"("shopId", "isActive", "position");

-- AddForeignKey
ALTER TABLE "CustomerStory" ADD CONSTRAINT "CustomerStory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
