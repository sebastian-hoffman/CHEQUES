-- CreateEnum
CREATE TYPE "OwnBank" AS ENUM ('SANTANDER', 'BBVA', 'BAPRO', 'OTHER');

-- AlterTable
ALTER TABLE "Cheque" ADD COLUMN "ownBank" "OwnBank";
