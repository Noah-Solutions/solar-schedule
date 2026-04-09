import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler } from "@/lib/api-handler";

// DELETE /api/admin/time-off/:id
export const DELETE = apiHandler(async (_request, { params }) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const { id } = await params;
  await prisma.timeOff.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted" });
});
