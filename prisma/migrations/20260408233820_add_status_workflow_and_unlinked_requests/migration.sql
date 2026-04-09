-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ServiceRequestStatus" ADD VALUE 'RESCHEDULE_REQUESTED';
ALTER TYPE "ServiceRequestStatus" ADD VALUE 'CANCEL_REQUESTED';

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "followUpNote" TEXT,
ADD COLUMN     "rescheduleReason" TEXT,
ADD COLUMN     "rescheduleSuggestedTimes" JSONB;

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "previousStatus" "ServiceRequestStatus",
ADD COLUMN     "serviceAddress" JSONB,
ALTER COLUMN "accountId" DROP NOT NULL;
