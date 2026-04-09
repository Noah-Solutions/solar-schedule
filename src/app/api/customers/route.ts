import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async (request) => {
  const { error } = await requireRoles("GM", "ADMIN", "BOOKKEEPER");
  if (error) return error;

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";

  const customers = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { primaryPhone: { contains: search } },
          ],
        }
      : undefined,
    include: {
      accounts: {
        include: { membership: { select: { tier: true, status: true } } },
      },
    },
    orderBy: { lastName: "asc" },
  });

  return NextResponse.json(customers);
});

export const POST = apiHandler(async (request) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const body = await request.json();
  const { firstName, lastName, email, primaryPhone } = body;

  if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !primaryPhone?.trim()) {
    return NextResponse.json(
      { error: "firstName, lastName, email, and primaryPhone are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.customer.findFirst({
    where: { OR: [{ email }, { primaryPhone }] },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A customer with this email or phone already exists" },
      { status: 409 }
    );
  }

  const customer = await prisma.customer.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      primaryPhone: primaryPhone.trim(),
    },
  });

  return NextResponse.json(customer, { status: 201 });
});
