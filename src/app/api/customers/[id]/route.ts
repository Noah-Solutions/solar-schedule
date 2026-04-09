import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async (_request, { params }) => {
  const { error } = await requireRoles("GM", "ADMIN", "BOOKKEEPER");
  if (error) return error;

  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      accounts: {
        include: { membership: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json(customer);
});

export const PATCH = apiHandler(async (request, { params }) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { firstName, lastName, email, primaryPhone, additionalPhones } = body;

  // Validate additionalPhones is an array if provided
  if (additionalPhones !== undefined && !Array.isArray(additionalPhones)) {
    return NextResponse.json(
      { error: "additionalPhones must be an array" },
      { status: 400 }
    );
  }

  // Check existence
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Check uniqueness if changing email or phone
  if (email && email !== existing.email) {
    const dup = await prisma.customer.findUnique({ where: { email } });
    if (dup) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
  }
  if (primaryPhone && primaryPhone !== existing.primaryPhone) {
    const dup = await prisma.customer.findUnique({ where: { primaryPhone } });
    if (dup) {
      return NextResponse.json({ error: "Phone number already in use" }, { status: 409 });
    }
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...(firstName !== undefined && { firstName: firstName.trim() }),
      ...(lastName !== undefined && { lastName: lastName.trim() }),
      ...(email !== undefined && { email: email.trim().toLowerCase() }),
      ...(primaryPhone !== undefined && { primaryPhone: primaryPhone.trim() }),
      ...(additionalPhones !== undefined && { additionalPhones }),
    },
  });

  return NextResponse.json(customer);
});
