import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler, isValidEnum } from "@/lib/api-handler";
import type { CoverageRuleType } from "@/generated/prisma/client";

const RULE_TYPES = ["FREE_PER_YEAR", "DISCOUNT_PERCENT", "INCLUDED_HOURS", "FULL_PRICE"] as const;

export const PATCH = apiHandler(async (request, { params }) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { ruleType, value, fallbackRuleType, fallbackValue, priority, isActive } = body;

  const existing = await prisma.coverageRule.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Coverage rule not found" }, { status: 404 });
  }

  if (ruleType !== undefined && !isValidEnum(ruleType, [...RULE_TYPES])) {
    return NextResponse.json({ error: "Invalid ruleType" }, { status: 400 });
  }
  if (fallbackRuleType !== undefined && fallbackRuleType !== null && !isValidEnum(fallbackRuleType, [...RULE_TYPES])) {
    return NextResponse.json({ error: "Invalid fallbackRuleType" }, { status: 400 });
  }

  const rule = await prisma.coverageRule.update({
    where: { id },
    data: {
      ...(ruleType !== undefined && { ruleType: ruleType as CoverageRuleType }),
      ...(value !== undefined && { value: Number(value) }),
      ...(fallbackRuleType !== undefined && { fallbackRuleType: (fallbackRuleType as CoverageRuleType) || null }),
      ...(fallbackValue !== undefined && { fallbackValue: fallbackValue != null ? Number(fallbackValue) : null }),
      ...(priority !== undefined && { priority: Number(priority) }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
  });

  return NextResponse.json(rule);
});

export const DELETE = apiHandler(async (_request, { params }) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const { id } = await params;
  await prisma.coverageRule.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted" });
});
