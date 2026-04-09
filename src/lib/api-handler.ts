import { NextResponse } from "next/server";

/**
 * Wraps an API route handler with try-catch error handling.
 * Returns 500 with a generic message on unhandled errors.
 */
export function apiHandler(
  handler: (
    request: Request,
    context: { params: Promise<Record<string, string>> }
  ) => Promise<NextResponse>
) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> }
  ) => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error("API Error:", error);

      // Prisma known error codes
      if (typeof error === "object" && error !== null && "code" in error) {
        const prismaError = error as { code: string; meta?: Record<string, unknown> };
        if (prismaError.code === "P2025") {
          return NextResponse.json({ error: "Record not found" }, { status: 404 });
        }
        if (prismaError.code === "P2002") {
          return NextResponse.json(
            { error: "A record with this value already exists" },
            { status: 409 }
          );
        }
      }

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/** Validates that a value is one of the allowed enum values */
export function isValidEnum<T extends string>(value: unknown, allowed: T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}
