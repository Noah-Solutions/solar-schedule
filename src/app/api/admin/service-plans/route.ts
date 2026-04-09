import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async () => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const plans = await prisma.servicePlan.findMany({ orderBy: { tier: "asc" } });
  return NextResponse.json(plans);
});
