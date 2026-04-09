import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-roles";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async () => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const templates = await prisma.communicationTemplate.findMany({
    orderBy: { triggerEvent: "asc" },
  });
  return NextResponse.json(templates);
});

export const POST = apiHandler(async (request) => {
  const { error } = await requireRoles("GM", "ADMIN");
  if (error) return error;

  const body = await request.json();
  const { triggerEvent, name, subject, body: templateBody } = body;

  if (!triggerEvent?.trim() || !name?.trim() || !subject?.trim() || !templateBody?.trim()) {
    return NextResponse.json(
      { error: "triggerEvent, name, subject, and body are required" },
      { status: 400 }
    );
  }

  const template = await prisma.communicationTemplate.create({
    data: {
      triggerEvent: triggerEvent.trim(),
      name: name.trim(),
      subject: subject.trim(),
      body: templateBody.trim(),
    },
  });
  return NextResponse.json(template, { status: 201 });
});
