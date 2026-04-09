import type { Role } from "@/generated/prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    roles: Role[];
    customerId: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      roles: Role[];
      customerId: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles: Role[];
    customerId: string | null;
  }
}
