import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler } from "@/lib/api-handler";

// GET /api/admin/time-off?userId=...&from=...&to=...
export const GET = apiHandler(async (request) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const timeOffs = await prisma.timeOff.findMany({
    where: {
      ...(userId && { userId }),
      ...(from && to && {
        date: { gte: new Date(from), lte: new Date(to) },
      }),
    },
    include: { user: { select: { id: true, email: true } } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(timeOffs);
});

// POST /api/admin/time-off
export const POST = apiHandler(async (request) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const body = await request.json();
  const { userId, date, startTime, endTime, reason } = body;

  if (!userId || !date) {
    return NextResponse.json({ error: "userId and date are required" }, { status: 400 });
  }

  const timeOff = await prisma.timeOff.create({
    data: {
      userId,
      date: new Date(date),
      startTime: startTime || null,
      endTime: endTime || null,
      reason: reason?.trim() || null,
    },
  });

  return NextResponse.json(timeOff, { status: 201 });
});
