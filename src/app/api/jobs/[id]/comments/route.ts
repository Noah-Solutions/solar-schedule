import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { apiHandler } from "@/lib/api-handler";
import "@/lib/auth-types";

export const POST = apiHandler(async (request, { params }) => {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: jobId } = await params;
  const body = await request.json();
  const { body: commentBody } = body;

  if (!commentBody?.trim()) {
    return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Technicians can only comment on their assigned jobs
  const roles = session.user.roles as string[];
  const isTechOnly = roles.includes("TECHNICIAN") && !roles.some((r) => ["GM", "ADMIN"].includes(r));
  if (isTechOnly && job.assignedTechnicianId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const comment = await prisma.comment.create({
    data: {
      jobId,
      authorId: session.user.id,
      body: commentBody.trim(),
    },
    include: {
      author: { select: { id: true, email: true, roles: { select: { role: true } } } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
});
