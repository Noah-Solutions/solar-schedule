import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler, isValidEnum } from "@/lib/api-handler";

const ACCOUNT_TYPES = ["RESIDENTIAL", "COMMERCIAL"] as const;
const INSTALLED_BY = ["EGT", "OTHER"] as const;

export const GET = apiHandler(async (_request, { params }) => {
  const { error } = await requireRoles("GM", "ADMIN", "BOOKKEEPER");
  if (error) return error;

  const { id } = await params;

  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, email: true, primaryPhone: true } },
      membership: true,
      serviceRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json(account);
});

export const PATCH = apiHandler(async (request, { params }) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { type, name, addressLine1, addressLine2, city, state, zip, installedBy } = body;

  if (type !== undefined && !isValidEnum(type, [...ACCOUNT_TYPES])) {
    return NextResponse.json({ error: "type must be RESIDENTIAL or COMMERCIAL" }, { status: 400 });
  }
  if (installedBy !== undefined && !isValidEnum(installedBy, [...INSTALLED_BY])) {
    return NextResponse.json({ error: "installedBy must be EGT or OTHER" }, { status: 400 });
  }

  const existing = await prisma.account.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const account = await prisma.account.update({
    where: { id },
    data: {
      ...(type !== undefined && { type }),
      ...(name !== undefined && { name: name?.trim() || null }),
      ...(addressLine1 !== undefined && { addressLine1: addressLine1.trim() }),
      ...(addressLine2 !== undefined && { addressLine2: addressLine2?.trim() || null }),
      ...(city !== undefined && { city: city.trim() }),
      ...(state !== undefined && { state: state.trim().toUpperCase() }),
      ...(zip !== undefined && { zip: zip.trim() }),
      ...(installedBy !== undefined && { installedBy }),
    },
    include: { membership: true },
  });

  return NextResponse.json(account);
});
