import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler } from "@/lib/api-handler";

// GET /api/admin/tech-schedules — all tech schedules
export const GET = apiHandler(async () => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const schedules = await prisma.techSchedule.findMany({
    include: { user: { select: { id: true, email: true } } },
    orderBy: [{ userId: "asc" }, { dayOfWeek: "asc" }],
  });

  return NextResponse.json(schedules);
});
