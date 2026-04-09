import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler, isValidEnum } from "@/lib/api-handler";
import bcrypt from "bcryptjs";
import type { Role } from "@/generated/prisma/client";

const INTERNAL_ROLES = ["GM", "TECHNICIAN", "BOOKKEEPER", "ADMIN"] as const;

export const GET = apiHandler(async () => {
  const { error } = await requireRoles("ADMIN");
  if (error) return error;

  const users = await prisma.user.findMany({
    where: {
      roles: { some: { role: { in: ["GM", "TECHNICIAN", "BOOKKEEPER", "ADMIN"] } } },
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
      roles: { select: { role: true } },
    },
    orderBy: { email: "asc" },
  });

  return NextResponse.json(users);
});

export const POST = apiHandler(async (request) => {
  const { error } = await requireRoles("ADMIN");
  if (error) return error;

  const body = await request.json();
  const { email, password, roles } = body;

  if (!email?.trim() || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (!Array.isArray(roles) || roles.length === 0) {
    return NextResponse.json({ error: "At least one role is required" }, { status: 400 });
  }
  for (const role of roles) {
    if (!isValidEnum(role, [...INTERNAL_ROLES])) {
      return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 });
    }
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      passwordHash,
      roles: {
        create: roles.map((role: string) => ({ role: role as Role })),
      },
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
      roles: { select: { role: true } },
    },
  });

  return NextResponse.json(user, { status: 201 });
});
