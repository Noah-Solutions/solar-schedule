import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { apiHandler } from "@/lib/api-handler";
import "@/lib/auth-types";

// GET /api/my/profile — customer's own profile + accounts + memberships
export const GET = apiHandler(async () => {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customerId = session.user.customerId;
  if (!customerId) return NextResponse.json({ error: "No customer profile" }, { status: 404 });

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      accounts: {
        include: { membership: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  return NextResponse.json(customer);
});
