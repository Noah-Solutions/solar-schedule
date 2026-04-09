import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler } from "@/lib/api-handler";
import "@/lib/auth-types";

export const GET = apiHandler(async () => {
  const { error, session } = await requireRoles("GM", "ADMIN", "TECHNICIAN");
  if (error) return error;

  const roles = session!.user.roles as string[];
  const isTechOnly =
    roles.includes("TECHNICIAN") &&
    !roles.some((r) => ["GM", "ADMIN"].includes(r));

  const jobs = await prisma.job.findMany({
    where: isTechOnly ? { assignedTechnicianId: session!.user.id } : undefined,
    include: {
      serviceRequest: {
        select: {
          id: true,
          category: true,
          urgency: true,
          status: true,
          description: true,
          account: {
            include: {
              customer: { select: { id: true, firstName: true, lastName: true, primaryPhone: true } },
              membership: { select: { tier: true, status: true } },
            },
          },
        },
      },
      comments: { select: { id: true } },
    },
    orderBy: { scheduledDate: "asc" },
  });

  return NextResponse.json(jobs);
});
