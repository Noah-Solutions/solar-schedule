import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler, isValidEnum } from "@/lib/api-handler";
import type { MembershipTier, ServiceCategory, CoverageRuleType } from "@/generated/prisma/client";

const TIERS = ["BASIC", "ELITE", "PLATINUM"] as const;
const CATEGORIES = ["SOMETHING_WRONG", "MAINTENANCE", "CLEANING", "INSPECTION", "BATTERY", "WARRANTY", "OTHER"] as const;
const RULE_TYPES = ["FREE_PER_YEAR", "DISCOUNT_PERCENT", "INCLUDED_HOURS", "FULL_PRICE"] as const;

// GET /api/admin/coverage-rules?tier=BASIC (optional filter)
export const GET = apiHandler(async (request) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const url = new URL(request.url);
  const tier = url.searchParams.get("tier");

  const rules = await prisma.coverageRule.findMany({
    where: tier && isValidEnum(tier, [...TIERS]) ? { tier: tier as MembershipTier } : undefined,
    orderBy: [{ tier: "asc" }, { category: "asc" }],
  });

  return NextResponse.json(rules);
});

// POST /api/admin/coverage-rules
export const POST = apiHandler(async (request) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const body = await request.json();
  const { tier, category, ruleType, value, fallbackRuleType, fallbackValue, priority } = body;

  if (!isValidEnum(category, [...CATEGORIES])) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!isValidEnum(ruleType, [...RULE_TYPES])) {
    return NextResponse.json({ error: "Invalid ruleType" }, { status: 400 });
  }
  if (tier !== null && tier !== undefined && !isValidEnum(tier, [...TIERS])) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }
  if (fallbackRuleType && !isValidEnum(fallbackRuleType, [...RULE_TYPES])) {
    return NextResponse.json({ error: "Invalid fallbackRuleType" }, { status: 400 });
  }

  const rule = await prisma.coverageRule.create({
    data: {
      tier: (tier as MembershipTier) || null,
      category: category as ServiceCategory,
      ruleType: ruleType as CoverageRuleType,
      value: Number(value) || 0,
      fallbackRuleType: (fallbackRuleType as CoverageRuleType) || null,
      fallbackValue: fallbackValue != null ? Number(fallbackValue) : null,
      priority: Number(priority) || 0,
    },
  });

  return NextResponse.json(rule, { status: 201 });
});
