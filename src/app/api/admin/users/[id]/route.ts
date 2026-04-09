import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler, isValidEnum } from "@/lib/api-handler";
import type { Role } from "@/generated/prisma/client";

const INTERNAL_ROLES = ["GM", "TECHNICIAN", "BOOKKEEPER", "ADMIN"] as const;

export const PATCH = apiHandler(async (request, { params }) => {
  const { error } = await requireRoles("ADMIN");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { roles } = body;

  if (!Array.isArray(roles) || roles.length === 0) {
    return NextResponse.json({ error: "At least one role is required" }, { status: 400 });
  }
  for (const role of roles) {
    if (!isValidEnum(role, [...INTERNAL_ROLES])) {
      return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 });
    }
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.userRole.deleteMany({
    where: { userId: id, role: { not: "CUSTOMER" } },
  });

  await prisma.userRole.createMany({
    data: roles.map((role: string) => ({ userId: id, role: role as Role })),
    skipDuplicates: true,
  });

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      createdAt: true,
      roles: { select: { role: true } },
    },
  });

  return NextResponse.json(user);
});
