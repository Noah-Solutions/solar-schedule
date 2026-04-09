import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler, isValidEnum } from "@/lib/api-handler";

const CATEGORIES = ["SOMETHING_WRONG", "MAINTENANCE", "CLEANING", "INSPECTION", "BATTERY", "WARRANTY", "OTHER"] as const;

export const GET = apiHandler(async () => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const items = await prisma.serviceCatalogItem.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(items);
});

export const POST = apiHandler(async (request) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const body = await request.json();
  const { name, description, category } = body;

  if (!name?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "name and description are required" }, { status: 400 });
  }
  if (!isValidEnum(category, [...CATEGORIES])) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const item = await prisma.serviceCatalogItem.create({
    data: { name: name.trim(), description: description.trim(), category },
  });
  return NextResponse.json(item, { status: 201 });
});
