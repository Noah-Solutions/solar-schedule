import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler } from "@/lib/api-handler";

// GET /api/billing — jobs that are CLOSED with billingStatus=PENDING
export const GET = apiHandler(async () => {
  const { error } = await requireRoles("GM", "ADMIN", "BOOKKEEPER");
  if (error) return error;

  const jobs = await prisma.job.findMany({
    where: {
      billingStatus: "PENDING",
      serviceRequest: { status: "CLOSED" },
    },
    include: {
      serviceRequest: {
        select: {
          id: true,
          category: true,
          urgency: true,
          status: true,
          description: true,
          createdAt: true,
          account: {
            include: {
              customer: { select: { id: true, firstName: true, lastName: true } },
              membership: { select: { tier: true, status: true } },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(jobs);
});
