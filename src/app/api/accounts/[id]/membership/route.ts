import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler, isValidEnum } from "@/lib/api-handler";

const TIERS = ["BASIC", "ELITE", "PLATINUM"] as const;
const STATUSES = ["ACTIVE", "CANCELED", "EXPIRED"] as const;

export const PUT = apiHandler(async (request, { params }) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const { id: accountId } = await params;
  const body = await request.json();
  const { tier, status, startDate, renewalDate } = body;

  if (!isValidEnum(tier, [...TIERS])) {
    return NextResponse.json({ error: "tier must be BASIC, ELITE, or PLATINUM" }, { status: 400 });
  }
  if (!isValidEnum(status, [...STATUSES])) {
    return NextResponse.json({ error: "status must be ACTIVE, CANCELED, or EXPIRED" }, { status: 400 });
  }
  if (!startDate || isNaN(Date.parse(startDate))) {
    return NextResponse.json({ error: "Valid startDate is required" }, { status: 400 });
  }
  if (renewalDate && isNaN(Date.parse(renewalDate))) {
    return NextResponse.json({ error: "renewalDate must be a valid date" }, { status: 400 });
  }

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const membership = await prisma.membership.upsert({
    where: { accountId },
    create: {
      accountId,
      tier,
      status,
      startDate: new Date(startDate),
      renewalDate: renewalDate ? new Date(renewalDate) : null,
    },
    update: {
      tier,
      status,
      startDate: new Date(startDate),
      renewalDate: renewalDate ? new Date(renewalDate) : null,
    },
  });

  return NextResponse.json(membership);
});

export const DELETE = apiHandler(async (_request, { params }) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const { id: accountId } = await params;

  const existing = await prisma.membership.findUnique({ where: { accountId } });
  if (!existing) {
    return NextResponse.json({ error: "No membership found" }, { status: 404 });
  }

  await prisma.membership.update({
    where: { accountId },
    data: { status: "CANCELED" },
  });

  return NextResponse.json({ message: "Membership canceled" });
});
