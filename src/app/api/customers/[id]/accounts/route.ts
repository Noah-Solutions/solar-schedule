import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler, isValidEnum } from "@/lib/api-handler";

const ACCOUNT_TYPES = ["RESIDENTIAL", "COMMERCIAL"] as const;
const INSTALLED_BY = ["EGT", "OTHER"] as const;

export const POST = apiHandler(async (request, { params }) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const { id: customerId } = await params;
  const body = await request.json();
  const { type, name, addressLine1, addressLine2, city, state, zip, installedBy } = body;

  if (!addressLine1?.trim() || !city?.trim() || !state?.trim() || !zip?.trim()) {
    return NextResponse.json(
      { error: "addressLine1, city, state, and zip are required" },
      { status: 400 }
    );
  }

  if (!isValidEnum(type, [...ACCOUNT_TYPES])) {
    return NextResponse.json(
      { error: "type must be RESIDENTIAL or COMMERCIAL" },
      { status: 400 }
    );
  }

  if (!isValidEnum(installedBy, [...INSTALLED_BY])) {
    return NextResponse.json(
      { error: "installedBy must be EGT or OTHER" },
      { status: 400 }
    );
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const account = await prisma.account.create({
    data: {
      customerId,
      type,
      name: name?.trim() || null,
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2?.trim() || null,
      city: city.trim(),
      state: state.trim().toUpperCase(),
      zip: zip.trim(),
      installedBy,
    },
    include: { membership: true },
  });

  return NextResponse.json(account, { status: 201 });
});
