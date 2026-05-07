-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ChequeFlow" AS ENUM ('RECEIVED', 'ISSUED');

-- CreateEnum
CREATE TYPE "ChequeStatus" AS ENUM ('RECEIVED', 'ENDORSED', 'CUSTODY', 'ACCEPTED', 'REJECTED', 'DISCOUNTED', 'PAID', 'ISSUED', 'PENDING', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ImportSource" AS ENUM ('RECEIVED_FILE', 'ENDORSED_FILE', 'CUSTODY_FILE', 'ISSUED_FILE', 'MANUAL');

-- CreateEnum
CREATE TYPE "DiscountStatus" AS ENUM ('REQUESTED', 'SETTLED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counterparty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Counterparty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "source" "ImportSource" NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cheque" (
    "id" TEXT NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "sourceChequeId" TEXT,
    "number" TEXT,
    "cmc7" TEXT,
    "echeqId" TEXT,
    "status" "ChequeStatus" NOT NULL DEFAULT 'UNKNOWN',
    "sourceStatus" TEXT,
    "sourceActionStatus" TEXT,
    "sourceKind" "ImportSource" NOT NULL DEFAULT 'MANUAL',
    "flow" "ChequeFlow" NOT NULL DEFAULT 'RECEIVED',
    "issueType" TEXT,
    "issuerTaxId" TEXT,
    "issuerName" TEXT,
    "bankRaw" TEXT,
    "bankCode" TEXT,
    "bankName" TEXT,
    "bankCanonical" TEXT,
    "endosoHistory" TEXT,
    "issueDate" TIMESTAMP(3),
    "paymentDate" TIMESTAMP(3),
    "amount" DECIMAL(18,2),
    "currency" TEXT,
    "account" TEXT,
    "endorseeTaxId" TEXT,
    "endorseeName" TEXT,
    "assignedById" TEXT,
    "projectId" TEXT,
    "rawData" JSONB,
    "lastImportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cheque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChequeStatusHistory" (
    "id" TEXT NOT NULL,
    "chequeId" TEXT NOT NULL,
    "fromStatus" "ChequeStatus",
    "toStatus" "ChequeStatus" NOT NULL,
    "source" "ImportSource" NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "details" JSONB,

    CONSTRAINT "ChequeStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "chequeId" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "grossAmount" DECIMAL(18,2),
    "feeAmount" DECIMAL(18,2),
    "netAmount" DECIMAL(18,2),
    "reference" TEXT,
    "status" "DiscountStatus" NOT NULL DEFAULT 'REQUESTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Counterparty_name_key" ON "Counterparty"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Cheque_canonicalKey_key" ON "Cheque"("canonicalKey");

-- CreateIndex
CREATE INDEX "Cheque_status_paymentDate_idx" ON "Cheque"("status", "paymentDate");

-- CreateIndex
CREATE INDEX "Cheque_bankCanonical_idx" ON "Cheque"("bankCanonical");

-- CreateIndex
CREATE INDEX "Cheque_projectId_idx" ON "Cheque"("projectId");

-- CreateIndex
CREATE INDEX "ChequeStatusHistory_chequeId_observedAt_idx" ON "ChequeStatusHistory"("chequeId", "observedAt");

-- CreateIndex
CREATE INDEX "Discount_chequeId_idx" ON "Discount"("chequeId");

-- AddForeignKey
ALTER TABLE "Cheque" ADD CONSTRAINT "Cheque_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cheque" ADD CONSTRAINT "Cheque_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChequeStatusHistory" ADD CONSTRAINT "ChequeStatusHistory_chequeId_fkey" FOREIGN KEY ("chequeId") REFERENCES "Cheque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_chequeId_fkey" FOREIGN KEY ("chequeId") REFERENCES "Cheque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

