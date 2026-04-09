import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler } from "@/lib/api-handler";

export const PATCH = apiHandler(async (request, { params }) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { name, description, isActive } = body;

  const existing = await prisma.serviceCatalogItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Catalog item not found" }, { status: 404 });
  }

  const item = await prisma.serviceCatalogItem.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
  });

  return NextResponse.json(item);
});
