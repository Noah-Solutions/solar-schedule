"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Membership {
  tier: string;
  status: string;
}

interface Account {
  id: string;
  type: string;
  installedBy: string;
  membership: Membership | null;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  primaryPhone: string;
  accounts: Account[];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function fetchCustomers(query: string) {
    setLoading(true);
    const params = query ? `?search=${encodeURIComponent(query)}` : "";
    const res = await fetch(`/api/customers${params}`);
    if (res.ok) {
      setCustomers(await res.json());
    }
    setLoading(false);
  }

  function getHighestTier(accounts: Account[]): string | null {
    const tiers = accounts
      .map((a) => a.membership)
      .filter((m): m is Membership => m !== null && m.status === "ACTIVE")
      .map((m) => m.tier);
    if (tiers.includes("PLATINUM")) return "Platinum";
    if (tiers.includes("ELITE")) return "Elite";
    if (tiers.includes("BASIC")) return "Basic";
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Link
          href="/customers/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700"
        >
          Add Customer
        </Link>
      </div>

      <input
        type="text"
        placeholder="Search by name, email, or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md rounded border border-gray-300 px-3 py-2 mb-4"
      />

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : customers.length === 0 ? (
        <p className="text-gray-500">No customers found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Phone</th>
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Accounts</th>
              <th className="pb-2 font-medium">Membership</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="py-3">
                  <Link
                    href={`/customers/${c.id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {c.lastName}, {c.firstName}
                  </Link>
                </td>
                <td className="py-3">{c.primaryPhone}</td>
                <td className="py-3">{c.email}</td>
                <td className="py-3">{c.accounts.length}</td>
                <td className="py-3">
                  {getHighestTier(c.accounts) ? (
                    <TierBadge tier={getHighestTier(c.accounts)!} />
                  ) : (
                    <span className="text-gray-400">None</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    Basic: "bg-gray-100 text-gray-700",
    Elite: "bg-blue-100 text-blue-700",
    Platinum: "bg-purple-100 text-purple-700",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[tier] || ""}`}
    >
      {tier}
    </span>
  );
}
