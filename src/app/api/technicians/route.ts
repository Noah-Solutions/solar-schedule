import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async () => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const techRoles = await prisma.userRole.findMany({
    where: { role: "TECHNICIAN" },
    include: { user: { select: { id: true, email: true } } },
  });

  return NextResponse.json(techRoles.map((r) => r.user));
});
