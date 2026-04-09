import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async (request) => {
  const { error } = await requireRoles("GM", "ADMIN", "BOOKKEEPER");
  if (error) return error;

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";

  const accounts = await prisma.account.findMany({
    where: search
      ? {
          OR: [
            { addressLine1: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            {
              customer: {
                OR: [
                  { firstName: { contains: search, mode: "insensitive" } },
                  { lastName: { contains: search, mode: "insensitive" } },
                ],
              },
            },
          ],
        }
      : undefined,
    include: {
      customer: { select: { id: true, firstName: true, lastName: true } },
      membership: { select: { tier: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(accounts);
});
