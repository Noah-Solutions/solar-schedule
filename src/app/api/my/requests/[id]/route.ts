import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { apiHandler } from "@/lib/api-handler";
import "@/lib/auth-types";

// GET /api/my/requests/:id — customer's own request detail (read-only)
export const GET = apiHandler(async (_request, { params }) => {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customerId = session.user.customerId;
  if (!customerId) return NextResponse.json({ error: "No customer account" }, { status: 403 });

  const { id } = await params;

  const sr = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      account: {
        select: {
          id: true, name: true, addressLine1: true, city: true, state: true, zip: true,
          membership: { select: { tier: true, status: true } },
        },
      },
      job: { select: { scheduledDate: true, scheduledWindow: true } },
    },
  });

  if (!sr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sr.account) {
    // Verify ownership
    const account = await prisma.account.findUnique({ where: { id: sr.account.id }, select: { customerId: true } });
    if (account?.customerId !== customerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(sr);
});

// PATCH /api/my/requests/:id — customer self-cancel (SUBMITTED or UNDER_REVIEW only)
export const PATCH = apiHandler(async (request, { params }) => {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customerId = session.user.customerId;
  if (!customerId) {
    return NextResponse.json({ error: "No customer account" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action } = body;

  if (action !== "cancel") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const sr = await prisma.serviceRequest.findUnique({
    where: { id },
    include: { account: { select: { customerId: true } } },
  });

  if (!sr) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // Verify ownership
  if (sr.account?.customerId !== customerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only allow cancel on SUBMITTED or UNDER_REVIEW
  if (!["SUBMITTED", "UNDER_REVIEW"].includes(sr.status)) {
    return NextResponse.json(
      { error: "Cannot cancel — request has already been scheduled. Please contact EGT." },
      { status: 400 }
    );
  }

  await prisma.serviceRequest.update({
    where: { id },
    data: { status: "CANCELED" },
  });

  return NextResponse.json({ message: "Request canceled" });
});
