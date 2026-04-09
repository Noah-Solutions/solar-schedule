import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function proxy(request: Request) {
  const session = await auth();
  const url = new URL(request.url);

  const isAuthPage =
    url.pathname.startsWith("/login") || url.pathname.startsWith("/signup");
  const isPublicPage = url.pathname === "/" || url.pathname.startsWith("/request");
  const isApi = url.pathname.startsWith("/api");

  // Allow public pages and API routes through
  if (isPublicPage || isApi) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from auth pages
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL("/requests", request.url));
  }

  // Redirect unauthenticated users to login
  if (!isAuthPage && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
