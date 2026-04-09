"use client";

import { signOut, useSession } from "next-auth/react";
import "@/lib/auth-types";

export default function NavUser() {
  const { data: session } = useSession();
  if (!session) return null;

  const roles = session.user.roles;
  const name = session.user.name || session.user.email?.split("@")[0];

  return (
    <div className="border-t border-gray-200 pt-3 mt-3 max-md:border-0 max-md:pt-0 max-md:mt-0">
      <p className="text-sm font-medium text-gray-700 truncate max-md:hidden">
        {name}
      </p>
      <p className="text-xs text-gray-500 max-md:hidden">
        {roles.join(", ")}
      </p>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-2 max-md:mt-0 w-full max-md:w-auto rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
      >
        Sign out
      </button>
    </div>
  );
}
