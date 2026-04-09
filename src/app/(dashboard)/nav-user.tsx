"use client";

import { signOut, useSession } from "next-auth/react";
import "@/lib/auth-types";

export default function NavUser() {
  const { data: session } = useSession();
  if (!session) return null;

  const roles = session.user.roles;

  return (
    <div className="border-t border-gray-200 pt-3 mt-3">
      <p className="text-sm font-medium text-gray-700 truncate">
        {session.user.email}
      </p>
      <p className="text-xs text-gray-500">
        {roles.join(", ")}
      </p>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-2 w-full rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
      >
        Sign out
      </button>
    </div>
  );
}
