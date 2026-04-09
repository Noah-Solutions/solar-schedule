import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/client";
import "@/lib/auth-types";

export async function requireRoles(...roles: Role[]) {
  const session = await auth();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }

  const userRoles = session.user.roles as Role[];
  const hasRole = roles.some((r) => userRoles.includes(r));
  if (!hasRole) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }

  return { error: null, session };
}
