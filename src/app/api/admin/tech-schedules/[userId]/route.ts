import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler } from "@/lib/api-handler";

// PUT /api/admin/tech-schedules/:userId — set all 7 days for a tech
export const PUT = apiHandler(async (request, { params }) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const { userId } = await params;
  const body = await request.json();
  const { days } = body;

  if (!Array.isArray(days) || days.length !== 7) {
    return NextResponse.json(
      { error: "days must be an array of 7 entries (Mon-Sun)" },
      { status: 400 }
    );
  }

  // Delete existing and recreate
  await prisma.techSchedule.deleteMany({ where: { userId } });

  const schedules = await prisma.techSchedule.createManyAndReturn({
    data: days.map((day: { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }) => ({
      userId,
      dayOfWeek: day.dayOfWeek,
      startTime: day.startTime || "07:00",
      endTime: day.endTime || "17:00",
      isAvailable: day.isAvailable ?? true,
    })),
  });

  return NextResponse.json(schedules);
});
