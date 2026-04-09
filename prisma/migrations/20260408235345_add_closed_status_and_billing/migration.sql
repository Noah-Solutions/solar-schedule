-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'BILLED', 'NOT_APPLICABLE');

-- AlterEnum
ALTER TYPE "ServiceRequestStatus" ADD VALUE 'CLOSED';

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "billingStatus" "BillingStatus" NOT NULL DEFAULT 'PENDING';
