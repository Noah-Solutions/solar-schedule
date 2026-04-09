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
  name: string | null;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  installedBy: string;
  membership: Membership | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => fetchAccounts(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function fetchAccounts(query: string) {
    setLoading(true);
    const params = query ? `?search=${encodeURIComponent(query)}` : "";
    const res = await fetch(`/api/accounts${params}`);
    if (res.ok) {
      setAccounts(await res.json());
    }
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Accounts</h1>

      <input
        type="text"
        placeholder="Search by address, city, or customer name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md rounded border border-gray-300 px-3 py-2 mb-4"
      />

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : accounts.length === 0 ? (
        <p className="text-gray-500">No accounts found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">Address</th>
              <th className="pb-2 font-medium">Customer</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">Installer</th>
              <th className="pb-2 font-medium">Membership</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-b hover:bg-gray-50">
                <td className="py-3">
                  <Link
                    href={`/accounts/${a.id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {a.name || a.addressLine1}
                  </Link>
                  <span className="block text-xs text-gray-500">
                    {a.city}, {a.state} {a.zip}
                  </span>
                </td>
                <td className="py-3">
                  <Link
                    href={`/customers/${a.customer.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {a.customer.lastName}, {a.customer.firstName}
                  </Link>
                </td>
                <td className="py-3">
                  {a.type === "RESIDENTIAL" ? "Residential" : "Commercial"}
                </td>
                <td className="py-3">
                  {a.installedBy === "OTHER" ? (
                    <span className="text-orange-600 font-medium">Outside</span>
                  ) : (
                    "EGT"
                  )}
                </td>
                <td className="py-3">
                  {a.membership && a.membership.status === "ACTIVE" ? (
                    <TierBadge tier={a.membership.tier} />
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
    BASIC: "bg-gray-100 text-gray-700",
    ELITE: "bg-blue-100 text-blue-700",
    PLATINUM: "bg-purple-100 text-purple-700",
  };
  const labels: Record<string, string> = {
    BASIC: "Basic",
    ELITE: "Elite",
    PLATINUM: "Platinum",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[tier] || ""}`}
    >
      {labels[tier] || tier}
    </span>
  );
}
