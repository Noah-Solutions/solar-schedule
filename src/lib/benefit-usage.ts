import { prisma } from "@/lib/prisma";
import type { ServiceCategory } from "@/generated/prisma/client";

interface BenefitItem {
  category: string;
  label: string;
  used: number;
  allowed: number;
  remaining: number;
}

export interface BenefitUsage {
  tier: string;
  periodStart: string;
  periodEnd: string;
  benefits: BenefitItem[];
}

const CATEGORY_LABELS: Record<string, string> = {
  CLEANING: "Panel Cleanings",
  INSPECTION: "Inspections",
  MAINTENANCE: "Maintenance",
  SOMETHING_WRONG: "Repairs",
  BATTERY: "Battery Service",
  WARRANTY: "Warranty",
  OTHER: "Other",
};

/**
 * Calculates benefit usage for an account by reading FREE_PER_YEAR coverage rules
 * and counting CLOSED jobs within the current billing cycle.
 *
 * Billing cycle uses startDate → renewalDate from the membership record.
 * If renewalDate is null, falls back to 1-year periods from startDate.
 */
export async function getBenefitUsage(accountId: string): Promise<BenefitUsage | null> {
  const membership = await prisma.membership.findUnique({
    where: { accountId },
  });

  if (!membership || membership.status !== "ACTIVE") {
    return null;
  }

  // Find all FREE_PER_YEAR rules for this tier
  const freeRules = await prisma.coverageRule.findMany({
    where: {
      tier: membership.tier,
      ruleType: "FREE_PER_YEAR",
      isActive: true,
    },
  });

  if (freeRules.length === 0) {
    return { tier: membership.tier, periodStart: "", periodEnd: "", benefits: [] };
  }

  const now = new Date();
  const startDate = new Date(membership.startDate);

  if (startDate > now) {
    return {
      tier: membership.tier,
      periodStart: startDate.toISOString(),
      periodEnd: membership.renewalDate
        ? new Date(membership.renewalDate).toISOString()
        : new Date(new Date(startDate).setFullYear(startDate.getFullYear() + 1)).toISOString(),
      benefits: freeRules.map((rule) => ({
        category: rule.category,
        label: CATEGORY_LABELS[rule.category] || rule.category,
        used: 0,
        allowed: rule.value,
        remaining: rule.value,
      })),
    };
  }

  // Determine current billing period
  const { periodStart, periodEnd } = getCurrentBillingPeriod(startDate, membership.renewalDate ? new Date(membership.renewalDate) : null, now);

  // Count CLOSED jobs for each category in the billing period
  const categories = freeRules.map((r) => r.category);
  const closedJobs = await prisma.serviceRequest.findMany({
    where: {
      accountId,
      status: "CLOSED",
      category: { in: categories as ServiceCategory[] },
      updatedAt: { gte: periodStart, lt: periodEnd },
    },
    select: { category: true },
  });

  const usageByCategory: Record<string, number> = {};
  for (const job of closedJobs) {
    usageByCategory[job.category] = (usageByCategory[job.category] || 0) + 1;
  }

  return {
    tier: membership.tier,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    benefits: freeRules.map((rule) => {
      const used = usageByCategory[rule.category] || 0;
      return {
        category: rule.category,
        label: CATEGORY_LABELS[rule.category] || rule.category,
        used,
        allowed: rule.value,
        remaining: Math.max(0, rule.value - used),
      };
    }),
  };
}

/**
 * Determines the current billing period based on start and renewal dates.
 *
 * If renewalDate is set, the billing cycle is startDate → renewalDate,
 * then renewalDate → renewalDate+1yr, etc.
 * If no renewalDate, falls back to 1-year periods from startDate.
 */
function getCurrentBillingPeriod(
  startDate: Date,
  renewalDate: Date | null,
  now: Date
): { periodStart: Date; periodEnd: Date } {
  if (renewalDate) {
    // The first period is startDate → renewalDate
    // Subsequent periods are each 1 year from renewalDate
    let pStart = new Date(startDate);
    let pEnd = new Date(renewalDate);

    // If we've passed the first renewal, step forward in yearly increments
    while (pEnd <= now) {
      pStart = new Date(pEnd);
      pEnd = new Date(pEnd);
      pEnd.setFullYear(pEnd.getFullYear() + 1);
    }

    return { periodStart: pStart, periodEnd: pEnd };
  }

  // No renewal date — use 1-year periods from startDate
  const periodStart = new Date(startDate);
  const periodEnd = new Date(startDate);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  while (periodEnd <= now) {
    periodStart.setFullYear(periodStart.getFullYear() + 1);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  return { periodStart, periodEnd };
}
