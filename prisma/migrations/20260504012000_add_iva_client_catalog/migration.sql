-- CreateTable
CREATE TABLE "IvaClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IvaClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IvaClient_name_key" ON "IvaClient"("name");

-- AlterTable
ALTER TABLE "Cheque"
ADD COLUMN "hasIvaClient" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "ivaClientId" TEXT;

-- CreateIndex
CREATE INDEX "Cheque_ivaClientId_idx" ON "Cheque"("ivaClientId");

-- AddForeignKey
ALTER TABLE "Cheque" ADD CONSTRAINT "Cheque_ivaClientId_fkey" FOREIGN KEY ("ivaClientId") REFERENCES "IvaClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
