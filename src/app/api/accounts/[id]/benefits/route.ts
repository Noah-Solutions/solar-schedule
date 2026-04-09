import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
  const roles = session.user.roles as string[];
  const isInternal = roles.some((r) => ["GM", "ADMIN", "TECHNICIAN", "BOOKKEEPER"].includes(r));

  // Customers can only view their own account's benefits
  if (!isInternal) {
    const account = await prisma.account.findUnique({
      where: { id },
      include: { customer: { include: { user: { select: { id: true } } } } },
    });
    if (!account || account.customer.user?.id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const usage = await getBenefitUsage(id);

  if (!usage) {
    return NextResponse.json({ error: "No active membership" }, { status: 404 });
  }

  return NextResponse.json(usage);
});
