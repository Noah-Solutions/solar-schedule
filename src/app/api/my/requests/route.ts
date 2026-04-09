import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { apiHandler } from "@/lib/api-handler";
import "@/lib/auth-types";

export const GET = apiHandler(async () => {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customerId = session.user.customerId;
  if (!customerId) {
    return NextResponse.json([]);
  }

  const requests = await prisma.serviceRequest.findMany({
    where: { account: { customerId } },
    include: {
      account: {
        select: { id: true, name: true, addressLine1: true, city: true, state: true },
      },
      job: { select: { scheduledDate: true, scheduledWindow: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
});
