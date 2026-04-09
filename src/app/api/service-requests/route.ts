import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { auth } from "@/lib/auth";
import { apiHandler, isValidEnum } from "@/lib/api-handler";
import "@/lib/auth-types";

const CATEGORIES = ["SOMETHING_WRONG", "MAINTENANCE", "CLEANING", "INSPECTION", "BATTERY", "WARRANTY", "OTHER"] as const;
const URGENCIES = ["NORMAL", "URGENT"] as const;
const STATUSES = ["SUBMITTED", "UNDER_REVIEW", "SCHEDULED", "IN_PROGRESS", "COMPLETE", "CLOSED", "RESCHEDULE_REQUESTED", "CANCEL_REQUESTED", "CANCELED"] as const;

// GET /api/service-requests — internal queue
export const GET = apiHandler(async (request) => {
  const { error } = await requireRoles("GM", "ADMIN", "TECHNICIAN", "BOOKKEEPER");
  if (error) return error;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const urgency = url.searchParams.get("urgency");

  const serviceRequests = await prisma.serviceRequest.findMany({
    where: {
      ...(status && isValidEnum(status, [...STATUSES]) && { status }),
      ...(urgency && isValidEnum(urgency, [...URGENCIES]) && { urgency }),
    },
    include: {
      account: {
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, primaryPhone: true } },
          membership: { select: { tier: true, status: true } },
        },
      },
      job: {
        select: {
          id: true,
          assignedTechnicianId: true,
          scheduledDate: true,
          followUpNeeded: true,
          rescheduleReason: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Sort by priority: tier (Platinum > Elite > Basic > none), then urgency, then date
  const tierOrder: Record<string, number> = { PLATINUM: 0, ELITE: 1, BASIC: 2 };
  const urgencyOrder: Record<string, number> = { URGENT: 0, NORMAL: 1 };

  serviceRequests.sort((a, b) => {
    const aTier = a.account?.membership?.status === "ACTIVE"
      ? (tierOrder[a.account.membership.tier] ?? 3) : 3;
    const bTier = b.account?.membership?.status === "ACTIVE"
      ? (tierOrder[b.account.membership.tier] ?? 3) : 3;
    if (aTier !== bTier) return aTier - bTier;

    const aUrg = urgencyOrder[a.urgency] ?? 1;
    const bUrg = urgencyOrder[b.urgency] ?? 1;
    if (aUrg !== bUrg) return aUrg - bUrg;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return NextResponse.json(serviceRequests);
});

// POST /api/service-requests — submit a new request (linked or unlinked)
export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const {
    accountId,
    category,
    urgency,
    description,
    preferredWindows,
    // Unlinked request fields
    contactName,
    contactPhone,
    contactEmail,
    serviceAddress,
  } = body;

  if (!description?.trim()) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }
  if (!isValidEnum(category, [...CATEGORIES])) {
    return NextResponse.json({ error: "Invalid service category" }, { status: 400 });
  }
  if (!isValidEnum(urgency, [...URGENCIES])) {
    return NextResponse.json({ error: "urgency must be NORMAL or URGENT" }, { status: 400 });
  }
  if (preferredWindows !== undefined && !Array.isArray(preferredWindows)) {
    return NextResponse.json({ error: "preferredWindows must be an array" }, { status: 400 });
  }

  // Linked request — verify account ownership
  if (accountId) {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { customer: { include: { user: { select: { id: true } } } } },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const userRoles = session.user.roles as string[];
    const isGMAdmin = userRoles.some((r) => ["GM", "ADMIN"].includes(r));
    if (!isGMAdmin && account.customer.user?.id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Unlinked request — require contact info
  if (!accountId) {
    if (!contactName?.trim() || !contactPhone?.trim() || !contactEmail?.trim()) {
      return NextResponse.json(
        { error: "contactName, contactPhone, and contactEmail are required for requests without an account" },
        { status: 400 }
      );
    }
    if (!serviceAddress || !serviceAddress.addressLine1 || !serviceAddress.city || !serviceAddress.state || !serviceAddress.zip) {
      return NextResponse.json(
        { error: "serviceAddress with addressLine1, city, state, and zip is required for requests without an account" },
        { status: 400 }
      );
    }
  }

  const serviceRequest = await prisma.serviceRequest.create({
    data: {
      accountId: accountId || null,
      category,
      urgency,
      description: description.trim(),
      preferredWindows: preferredWindows || [],
      status: "SUBMITTED",
      contactName: contactName?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      contactEmail: contactEmail?.trim() || null,
      serviceAddress: serviceAddress || null,
    },
  });

  return NextResponse.json(serviceRequest, { status: 201 });
});
