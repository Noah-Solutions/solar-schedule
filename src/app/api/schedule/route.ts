import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler } from "@/lib/api-handler";
import "@/lib/auth-types";

// GET /api/schedule?weekOf=2026-04-14 — calendar data for the week
// Returns all techs with their schedules, time-off, and jobs for the week
export const GET = apiHandler(async (request) => {
  const { error, session } = await requireRoles("GM", "ADMIN", "TECHNICIAN");
  if (error) return error;

  const url = new URL(request.url);
  const weekOfParam = url.searchParams.get("weekOf");

  // Parse the Monday of the requested week
  let monday: Date;
  if (weekOfParam) {
    monday = new Date(weekOfParam + "T00:00:00");
    // Snap to Monday
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
  } else {
    monday = new Date();
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
  }

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 7);

  const roles = session!.user.roles as string[];
  const isTechOnly = roles.includes("TECHNICIAN") && !roles.some((r) => ["GM", "ADMIN"].includes(r));

  // Get all technicians (or just self if tech-only)
  const techRoles = await prisma.userRole.findMany({
    where: {
      role: "TECHNICIAN",
      ...(isTechOnly ? { userId: session!.user.id } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          techSchedules: true,
          timeOffs: {
            where: {
              date: { gte: monday, lt: sunday },
            },
          },
        },
      },
    },
  });

  const techIds = techRoles.map((r) => r.user.id);

  // Get all jobs for these techs in this week
  const jobs = await prisma.job.findMany({
    where: {
      assignedTechnicianId: { in: techIds },
      scheduledDate: { gte: monday, lt: sunday },
    },
    include: {
      serviceRequest: {
        select: {
          id: true,
          category: true,
          urgency: true,
          status: true,
          account: {
            select: {
              name: true,
              addressLine1: true,
              city: true,
              state: true,
              customer: {
                select: { firstName: true, lastName: true },
              },
            },
          },
          contactName: true,
          serviceAddress: true,
        },
      },
    },
  });

  // Group jobs by tech
  const jobsByTech: Record<string, typeof jobs> = {};
  for (const job of jobs) {
    const techId = job.assignedTechnicianId!;
    if (!jobsByTech[techId]) jobsByTech[techId] = [];
    jobsByTech[techId].push(job);
  }

  // Build response
  const techs = techRoles.map((r) => ({
    id: r.user.id,
    email: r.user.email,
    name: r.user.name || r.user.email.split("@")[0],
    schedule: r.user.techSchedules,
    timeOff: r.user.timeOffs,
    jobs: (jobsByTech[r.user.id] || []).map((job) => ({
      id: job.id,
      serviceRequestId: job.serviceRequest.id,
      scheduledDate: job.scheduledDate,
      scheduledWindow: job.scheduledWindow,
      category: job.serviceRequest.category,
      urgency: job.serviceRequest.urgency,
      status: job.serviceRequest.status,
      customerName: job.serviceRequest.account
        ? `${job.serviceRequest.account.customer.lastName}, ${job.serviceRequest.account.customer.firstName}`
        : job.serviceRequest.contactName || "Unknown",
      location: job.serviceRequest.account
        ? `${job.serviceRequest.account.city}, ${job.serviceRequest.account.state}`
        : (job.serviceRequest.serviceAddress as { city?: string; state?: string })
          ? `${(job.serviceRequest.serviceAddress as { city: string }).city}, ${(job.serviceRequest.serviceAddress as { state: string }).state}`
          : "Unknown",
      address: job.serviceRequest.account?.addressLine1
        || (job.serviceRequest.serviceAddress as { addressLine1?: string })?.addressLine1
        || "",
    })),
  }));

  // Also get unscheduled requests (for GM view)
  let unscheduled: unknown[] = [];
  if (!isTechOnly) {
    unscheduled = await prisma.serviceRequest.findMany({
      where: {
        status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
      },
      select: {
        id: true,
        category: true,
        urgency: true,
        status: true,
        preferredWindows: true,
        account: {
          select: {
            city: true,
            state: true,
            customer: { select: { firstName: true, lastName: true } },
            membership: { select: { tier: true } },
          },
        },
        contactName: true,
      },
      orderBy: { createdAt: "asc" },
      take: 20,
    });
  }

  return NextResponse.json({
    weekOf: monday.toISOString().split("T")[0],
    techs,
    unscheduled,
  });
});
