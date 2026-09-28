-- AlterTable
ALTER TABLE "SimulatedPayment" ADD COLUMN "activeKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SimulatedPayment_activeKey_key" ON "SimulatedPayment"("activeKey");
