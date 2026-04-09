import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler } from "@/lib/api-handler";
import { suggestCoverage } from "@/lib/coverage-engine";

// GET /api/service-requests/:id/coverage-suggestion
export const GET = apiHandler(async (_request, { params }) => {
  const { error } = await requireRoles("GM", "ADMIN", "TECHNICIAN");
  if (error) return error;

  const { id } = await params;

  const sr = await prisma.serviceRequest.findUnique({
    where: { id },
    select: { accountId: true, category: true },
  });

  if (!sr) {
    return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  }

  const suggestion = await suggestCoverage(sr.accountId, sr.category);
  return NextResponse.json(suggestion);
});
