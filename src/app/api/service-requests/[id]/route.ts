import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler, isValidEnum } from "@/lib/api-handler";
import { canTransition } from "@/lib/status-transitions";
import type { Role, ServiceRequestStatus } from "@/generated/prisma/client";
import "@/lib/auth-types";

const STATUSES = ["SUBMITTED", "UNDER_REVIEW", "SCHEDULED", "IN_PROGRESS", "COMPLETE", "CLOSED", "RESCHEDULE_REQUESTED", "CANCEL_REQUESTED", "CANCELED"] as const;
const BILLING_STATUSES = ["PENDING", "BILLED", "NOT_APPLICABLE"] as const;

export const GET = apiHandler(async (_request, { params }) => {
  const { error } = await requireRoles("GM", "ADMIN", "TECHNICIAN", "BOOKKEEPER");
  if (error) return error;

  const { id } = await params;

  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      account: {
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true, primaryPhone: true } },
          membership: true,
        },
      },
      job: {
        include: {
          comments: {
            include: {
              author: { select: { id: true, email: true, roles: { select: { role: true } } } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      attachments: true,
    },
  });

  if (!serviceRequest) {
    return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  }

  return NextResponse.json(serviceRequest);
});

export const PATCH = apiHandler(async (request, { params }) => {
  const { error, session } = await requireRoles("GM", "ADMIN", "TECHNICIAN");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const {
    status,
    assignedTechnicianId,
    scheduledDate,
    scheduledWindow,
    // Reschedule fields
    rescheduleReason,
    rescheduleSuggestedTimes,
    // Follow-up fields
    followUpNeeded,
    followUpNote,
    // Link unlinked request to an account
    accountId,
    // Billing
    billingStatus,
  } = body;

  const existing = await prisma.serviceRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  }

  const userRoles = session!.user.roles as Role[];

  // ─── Status transition ────────────────────────────────────
  if (status !== undefined) {
    if (!isValidEnum(status, [...STATUSES])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const transition = canTransition(
      existing.status,
      status as ServiceRequestStatus,
      userRoles
    );
    if (!transition.allowed) {
      return NextResponse.json({ error: transition.reason }, { status: 403 });
    }

    const updateData: Record<string, unknown> = { status };

    // Store previous status when entering CANCEL_REQUESTED so GM can revert
    if (status === "CANCEL_REQUESTED") {
      updateData.previousStatus = existing.status;
    }

    // When GM rejects a cancel request, revert to previous status
    if (existing.status === "CANCEL_REQUESTED" && status !== "CANCELED") {
      // The new status is the revert — previousStatus is already stored
    }

    await prisma.serviceRequest.update({
      where: { id },
      data: updateData,
    });
  }

  // ─── Link unlinked request to account ─────────────────────
  if (accountId !== undefined) {
    if (!userRoles.includes("GM") && !userRoles.includes("ADMIN")) {
      return NextResponse.json({ error: "Only GM/Admin can link requests to accounts" }, { status: 403 });
    }
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    await prisma.serviceRequest.update({
      where: { id },
      data: { accountId },
    });
  }

  // ─── Job updates (scheduling, reschedule, follow-up, billing) ──
  if (
    assignedTechnicianId !== undefined ||
    scheduledDate !== undefined ||
    scheduledWindow !== undefined ||
    rescheduleReason !== undefined ||
    followUpNeeded !== undefined ||
    billingStatus !== undefined
  ) {
    if (scheduledDate && isNaN(Date.parse(scheduledDate))) {
      return NextResponse.json({ error: "scheduledDate must be a valid date" }, { status: 400 });
    }

    const existingJob = await prisma.job.findUnique({
      where: { serviceRequestId: id },
    });

    const jobData: Record<string, unknown> = {};
    if (assignedTechnicianId !== undefined) jobData.assignedTechnicianId = assignedTechnicianId || null;
    if (scheduledDate !== undefined) jobData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    if (scheduledWindow !== undefined) jobData.scheduledWindow = scheduledWindow || null;
    if (rescheduleReason !== undefined) jobData.rescheduleReason = rescheduleReason;
    if (rescheduleSuggestedTimes !== undefined) jobData.rescheduleSuggestedTimes = rescheduleSuggestedTimes;
    if (followUpNeeded !== undefined) jobData.followUpNeeded = Boolean(followUpNeeded);
    if (followUpNote !== undefined) jobData.followUpNote = followUpNote;
    if (billingStatus !== undefined && isValidEnum(billingStatus, [...BILLING_STATUSES])) {
      jobData.billingStatus = billingStatus;
    }

    if (existingJob) {
      await prisma.job.update({
        where: { serviceRequestId: id },
        data: jobData,
      });
    } else {
      await prisma.job.create({
        data: {
          serviceRequestId: id,
          assignedTechnicianId: (assignedTechnicianId as string) || null,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
          scheduledWindow: (scheduledWindow as string) || null,
          ...(rescheduleReason !== undefined && { rescheduleReason }),
          ...(rescheduleSuggestedTimes !== undefined && { rescheduleSuggestedTimes }),
          ...(followUpNeeded !== undefined && { followUpNeeded: Boolean(followUpNeeded) }),
          ...(followUpNote !== undefined && { followUpNote }),
        },
      });
    }
  }

  // Return full updated record
  const updated = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      account: {
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true, primaryPhone: true } },
          membership: true,
        },
      },
      job: true,
    },
  });

  return NextResponse.json(updated);
});
