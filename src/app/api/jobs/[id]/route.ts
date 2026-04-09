import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler } from "@/lib/api-handler";
import "@/lib/auth-types";

export const GET = apiHandler(async (_request, { params }) => {
  const { error, session } = await requireRoles("GM", "ADMIN", "TECHNICIAN");
  if (error) return error;

  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      serviceRequest: {
        include: {
          account: {
            include: {
              customer: { select: { id: true, firstName: true, lastName: true, email: true, primaryPhone: true } },
              membership: { select: { tier: true, status: true } },
            },
          },
        },
      },
      comments: {
        include: {
          author: { select: { id: true, email: true, roles: { select: { role: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Technicians can only view their assigned jobs
  const roles = session!.user.roles as string[];
  const isTechOnly = roles.includes("TECHNICIAN") && !roles.some((r) => ["GM", "ADMIN"].includes(r));
  if (isTechOnly && job.assignedTechnicianId !== session!.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(job);
});
