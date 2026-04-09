import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";

export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { email, password, firstName, lastName, primaryPhone } = body;

  if (!email?.trim() || !password || !firstName?.trim() || !lastName?.trim() || !primaryPhone?.trim()) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const existingPhone = await prisma.customer.findUnique({
    where: { primaryPhone: primaryPhone.trim() },
  });
  if (existingPhone) {
    return NextResponse.json(
      { error: "An account with this phone number already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const customer = await prisma.customer.create({
    data: {
      primaryPhone: primaryPhone.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      user: {
        create: {
          email: email.trim().toLowerCase(),
          passwordHash,
          roles: {
            create: { role: "CUSTOMER" },
          },
        },
      },
    },
  });

  return NextResponse.json(
    { message: "Account created", customerId: customer.id },
    { status: 201 }
  );
});
