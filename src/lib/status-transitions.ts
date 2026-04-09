import type { ServiceRequestStatus, Role } from "@/generated/prisma/client";

/**
 * Defines which status transitions are allowed for each role group.
 * GM/ADMIN have full override authority.
 * Technicians have limited transitions.
 */

const TECH_ALLOWED_FROM: Record<string, ServiceRequestStatus[]> = {
  SCHEDULED: ["IN_PROGRESS", "RESCHEDULE_REQUESTED", "CANCEL_REQUESTED"],
  IN_PROGRESS: ["COMPLETE", "SCHEDULED", "RESCHEDULE_REQUESTED", "CANCEL_REQUESTED"],
  COMPLETE: ["IN_PROGRESS"],
  // Techs cannot touch: SUBMITTED, UNDER_REVIEW, CLOSED, CANCELED
};

export function canTransition(
  from: ServiceRequestStatus,
  to: ServiceRequestStatus,
  roles: Role[]
): { allowed: boolean; reason?: string } {
  // GM and ADMIN can do anything
  if (roles.includes("GM") || roles.includes("ADMIN")) {
    return { allowed: true };
  }

  // Technician rules
  if (roles.includes("TECHNICIAN")) {
    const allowed = TECH_ALLOWED_FROM[from];
    if (!allowed) {
      return {
        allowed: false,
        reason: `Technicians cannot change requests in ${from} status`,
      };
    }
    if (!allowed.includes(to)) {
      return {
        allowed: false,
        reason: `Technicians cannot move from ${from} to ${to}`,
      };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: "Insufficient permissions" };
}
