import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiHandler } from "@/lib/api-handler";
import { getBenefitUsage } from "@/lib/benefit-usage";
import "@/lib/auth-types";

// GET /api/accounts/:id/benefits — benefit usage for this account
export const GET = apiHandler(async (_request, { params }) => {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const usage = await getBenefitUsage(id);

  if (!usage) {
    return NextResponse.json({ error: "No active membership" }, { status: 404 });
  }

  return NextResponse.json(usage);
});
