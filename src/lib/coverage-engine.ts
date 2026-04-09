import { prisma } from "@/lib/prisma";
import type { MembershipTier, ServiceCategory, CoverageRuleType } from "@/generated/prisma/client";

export interface CoverageSuggestion {
  classification: "COVERED" | "DISCOUNTED" | "BILLABLE";
  reason: string;
  discountPercent?: number;
}

/**
 * Suggests a billing classification for a job based on coverage rules.
 *
 * Looks up the coverage rule for the account's tier + service category,
 * checks benefit usage within the billing cycle, and returns a suggestion.
 */
export async function suggestCoverage(
  accountId: string | null,
  category: ServiceCategory
): Promise<CoverageSuggestion> {
  if (!accountId) {
    return { classification: "BILLABLE", reason: "No account linked" };
  }

  const membership = await prisma.membership.findUnique({
    where: { accountId },
  });

  const tier: MembershipTier | null = membership?.status === "ACTIVE" ? membership.tier : null;

  // Find matching coverage rule (tier-specific first, then null-tier fallback)
  const rules = await prisma.coverageRule.findMany({
    where: {
      category,
      isActive: true,
      OR: [{ tier }, { tier: null }],
    },
    orderBy: [{ priority: "desc" }, { tier: "asc" }],
  });

  const rule = rules.find((r) => r.tier === tier) || rules.find((r) => r.tier === null);

  if (!rule) {
    return { classification: "BILLABLE", reason: "No coverage rule defined" };
  }

  return await applyRule(
    rule,
    accountId,
    category,
    tier,
    membership?.startDate || null,
    membership?.renewalDate || null
  );
}

async function applyRule(
  rule: {
    ruleType: CoverageRuleType;
    value: number;
    fallbackRuleType: CoverageRuleType | null;
    fallbackValue: number | null;
  },
  accountId: string,
  category: ServiceCategory,
  tier: MembershipTier | null,
  startDate: Date | null,
  renewalDate: Date | null
): Promise<CoverageSuggestion> {
  const tierLabel = tier ? tier.charAt(0) + tier.slice(1).toLowerCase() : "Non-member";

  switch (rule.ruleType) {
    case "FREE_PER_YEAR": {
      const used = await countUsedInBillingCycle(accountId, category, startDate, renewalDate);
      const allowed = rule.value;
      if (used < allowed) {
        return {
          classification: "COVERED",
          reason: `${tierLabel}: ${used + 1} of ${allowed} free this cycle`,
        };
      }
      if (rule.fallbackRuleType) {
        return applySimpleRule(rule.fallbackRuleType, rule.fallbackValue || 0, tierLabel, "free benefits used");
      }
      return { classification: "BILLABLE", reason: `${tierLabel}: all ${allowed} free uses exhausted` };
    }

    case "DISCOUNT_PERCENT":
      return {
        classification: "DISCOUNTED",
        reason: `${tierLabel}: ${rule.value}% discount`,
        discountPercent: rule.value,
      };

    case "INCLUDED_HOURS":
      return {
        classification: "COVERED",
        reason: `${tierLabel}: ${rule.value} hour(s) included`,
      };

    case "FULL_PRICE":
      return { classification: "BILLABLE", reason: `${tierLabel}: full price` };

    default:
      return { classification: "BILLABLE", reason: "Unknown rule type" };
  }
}

function applySimpleRule(
  ruleType: CoverageRuleType,
  value: number,
  tierLabel: string,
  context: string
): CoverageSuggestion {
  switch (ruleType) {
    case "DISCOUNT_PERCENT":
      return {
        classification: "DISCOUNTED",
        reason: `${tierLabel}: ${value}% discount (${context})`,
        discountPercent: value,
      };
    case "FULL_PRICE":
      return { classification: "BILLABLE", reason: `${tierLabel}: full price (${context})` };
    default:
      return { classification: "BILLABLE", reason: `${tierLabel}: ${context}` };
  }
}

/**
 * Counts CLOSED jobs of a given category within the current billing cycle.
 * Uses startDate → renewalDate as cycle boundaries.
 */
async function countUsedInBillingCycle(
  accountId: string,
  category: ServiceCategory,
  startDate: Date | null,
  renewalDate: Date | null
): Promise<number> {
  const now = new Date();

  let periodStart: Date;
  let periodEnd: Date;

  if (startDate && renewalDate) {
    periodStart = new Date(startDate);
    periodEnd = new Date(renewalDate);
    while (periodEnd <= now) {
      periodStart = new Date(periodEnd);
      periodEnd = new Date(periodEnd);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }
  } else if (startDate) {
    periodStart = new Date(startDate);
    periodEnd = new Date(startDate);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    while (periodEnd <= now) {
      periodStart.setFullYear(periodStart.getFullYear() + 1);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }
  } else {
    // No membership dates — use calendar year
    periodStart = new Date(now.getFullYear(), 0, 1);
    periodEnd = new Date(now.getFullYear() + 1, 0, 1);
  }

  return await prisma.serviceRequest.count({
    where: {
      accountId,
      category,
      status: "CLOSED",
      updatedAt: { gte: periodStart, lt: periodEnd },
    },
  });
}
