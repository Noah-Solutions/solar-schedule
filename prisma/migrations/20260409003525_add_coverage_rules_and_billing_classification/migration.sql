-- CreateEnum
CREATE TYPE "BillingClassification" AS ENUM ('COVERED', 'DISCOUNTED', 'BILLABLE');

-- CreateEnum
CREATE TYPE "CoverageRuleType" AS ENUM ('FREE_PER_YEAR', 'DISCOUNT_PERCENT', 'INCLUDED_HOURS', 'FULL_PRICE');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "billingClassification" "BillingClassification",
ADD COLUMN     "billingNote" TEXT;

-- CreateTable
CREATE TABLE "CoverageRule" (
    "id" UUID NOT NULL,
    "tier" "MembershipTier",
    "category" "ServiceCategory" NOT NULL,
    "ruleType" "CoverageRuleType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fallbackRuleType" "CoverageRuleType",
    "fallbackValue" DOUBLE PRECISION,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverageRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoverageRule_tier_category_key" ON "CoverageRule"("tier", "category");
