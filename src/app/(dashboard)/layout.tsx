import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import NavUser from "./nav-user";
import "@/lib/auth-types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const roles = session.user.roles;
  const isInternal = roles.some((r) =>
    ["GM", "TECHNICIAN", "BOOKKEEPER", "ADMIN"].includes(r)
  );
  const canSeeBilling = roles.some((r) =>
    ["GM", "ADMIN", "BOOKKEEPER"].includes(r)
  );

  return (
    <div className="flex min-h-full">
      <nav className="w-56 shrink-0 border-r border-gray-200 bg-gray-50 p-4 flex flex-col justify-between max-md:hidden">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
            Service
          </p>
          <NavLink href="/requests">Requests</NavLink>
          <NavLink href="/jobs">Jobs</NavLink>

          {isInternal && (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase mt-6 mb-3">
                Management
              </p>
              <NavLink href="/customers">Customers</NavLink>
              <NavLink href="/accounts">Accounts</NavLink>
              {canSeeBilling && <NavLink href="/billing">Billing</NavLink>}
              <NavLink href="/admin">Admin</NavLink>
            </>
          )}
        </div>
        <NavUser />
      </nav>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 px-2 py-1 flex justify-around">
        <MobileLink href="/requests" label="Requests" />
        <MobileLink href="/jobs" label="Jobs" />
        {isInternal && (
          <>
            <MobileLink href="/customers" label="Customers" />
            {canSeeBilling && <MobileLink href="/billing" label="Billing" />}
            <MobileLink href="/admin" label="Admin" />
          </>
        )}
      </div>

      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
    >
      {children}
    </Link>
  );
}

function MobileLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center px-2 py-1 text-xs text-gray-600"
    >
      {label}
    </Link>
  );
}
