import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler } from "@/lib/api-handler";

export const PATCH = apiHandler(async (request, { params }) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  // Only allow updating specific fields
  const { description, responseWindow, benefits, discounts, isActive } = body;

  const existing = await prisma.servicePlan.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Service plan not found" }, { status: 404 });
  }

  const plan = await prisma.servicePlan.update({
    where: { id },
    data: {
      ...(description !== undefined && { description }),
      ...(responseWindow !== undefined && { responseWindow }),
      ...(benefits !== undefined && { benefits }),
      ...(discounts !== undefined && { discounts }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
  });

  return NextResponse.json(plan);
});
