import { prisma } from "@/lib/prisma";

interface BenefitAllowance {
  cleaningsPerYear: number;
  inspectionsPerYear: number;
}

const TIER_BENEFITS: Record<string, BenefitAllowance> = {
  BASIC: { cleaningsPerYear: 0, inspectionsPerYear: 0 },
  ELITE: { cleaningsPerYear: 1, inspectionsPerYear: 1 },
  PLATINUM: { cleaningsPerYear: 2, inspectionsPerYear: 1 },
};

export interface BenefitUsage {
  tier: string;
  cleanings: { used: number; allowed: number; remaining: number };
  inspections: { used: number; allowed: number; remaining: number };
}

/**
 * Calculates benefit usage for a given account by counting CLOSED jobs
 * within the membership year.
 */
export async function getBenefitUsage(accountId: string): Promise<BenefitUsage | null> {
  const membership = await prisma.membership.findUnique({
    where: { accountId },
  });

  if (!membership || membership.status !== "ACTIVE") {
    return null;
  }

  const allowance = TIER_BENEFITS[membership.tier] || TIER_BENEFITS.BASIC;

  // Determine the current benefit period (membership year)
  const now = new Date();
  const startDate = new Date(membership.startDate);
  let periodStart = new Date(startDate);

  // Roll forward to the current period
  while (periodStart.getFullYear() < now.getFullYear() ||
    (periodStart.getFullYear() === now.getFullYear() && periodStart.getMonth() < startDate.getMonth())) {
    periodStart.setFullYear(periodStart.getFullYear() + 1);
  }
  // If we overshot, go back one year
  if (periodStart > now) {
    periodStart.setFullYear(periodStart.getFullYear() - 1);
  }

  const periodEnd = new Date(periodStart);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  // Count CLOSED jobs by category within the benefit period
  const closedJobs = await prisma.serviceRequest.findMany({
    where: {
      accountId,
      status: "CLOSED",
      category: { in: ["CLEANING", "INSPECTION"] },
      updatedAt: { gte: periodStart, lt: periodEnd },
    },
    select: { category: true },
  });

  const cleaningsUsed = closedJobs.filter((j) => j.category === "CLEANING").length;
  const inspectionsUsed = closedJobs.filter((j) => j.category === "INSPECTION").length;

  return {
    tier: membership.tier,
    cleanings: {
      used: cleaningsUsed,
      allowed: allowance.cleaningsPerYear,
      remaining: Math.max(0, allowance.cleaningsPerYear - cleaningsUsed),
    },
    inspections: {
      used: inspectionsUsed,
      allowed: allowance.inspectionsPerYear,
      remaining: Math.max(0, allowance.inspectionsPerYear - inspectionsUsed),
    },
  };
}
