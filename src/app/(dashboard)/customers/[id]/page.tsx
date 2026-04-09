"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Membership {
  id: string;
  tier: string;
  status: string;
  startDate: string;
  renewalDate: string | null;
}

interface Account {
  id: string;
  type: string;
  name: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
  installedBy: string;
  membership: Membership | null;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  primaryPhone: string;
  additionalPhones: string[];
  accounts: Account[];
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    primaryPhone: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/customers/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setCustomer(data);
        setForm({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          primaryPhone: data.primaryPhone,
        });
      });
  }, [params.id]);

  async function handleSave() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/customers/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
      setSaving(false);
      return;
    }
    const updated = await res.json();
    setCustomer({ ...customer!, ...updated });
    setEditing(false);
    setSaving(false);
  }

  if (!customer) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/customers")}
          className="text-gray-500 hover:text-gray-700"
        >
          &larr; Customers
        </button>
        <h1 className="text-2xl font-bold">
          {customer.firstName} {customer.lastName}
        </h1>
      </div>

      {/* Customer Info */}
      <div className="rounded border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Customer Info</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">
            {error}
          </p>
        )}

        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="First name"
                value={form.firstName}
                onChange={(v) => setForm({ ...form, firstName: v })}
              />
              <Field
                label="Last name"
                value={form.lastName}
                onChange={(v) => setForm({ ...form, lastName: v })}
              />
            </div>
            <Field
              label="Email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />
            <Field
              label="Primary phone"
              value={form.primaryPhone}
              onChange={(v) => setForm({ ...form, primaryPhone: v })}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setForm({
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    email: customer.email,
                    primaryPhone: customer.primaryPhone,
                  });
                  setError("");
                }}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd>{customer.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Primary phone</dt>
              <dd>{customer.primaryPhone}</dd>
            </div>
            {customer.additionalPhones.length > 0 && (
              <div>
                <dt className="text-gray-500">Additional phones</dt>
                <dd>{customer.additionalPhones.join(", ")}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {/* Accounts */}
      <div className="rounded border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            Accounts ({customer.accounts.length})
          </h2>
          <Link
            href={`/accounts/new?customerId=${customer.id}`}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-blue-700"
          >
            Add Account
          </Link>
        </div>

        {customer.accounts.length === 0 ? (
          <p className="text-sm text-gray-500">No accounts yet.</p>
        ) : (
          <div className="space-y-3">
            {customer.accounts.map((a) => (
              <Link
                key={a.id}
                href={`/accounts/${a.id}`}
                className="block rounded border border-gray-100 p-3 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">
                      {a.name || a.addressLine1}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      {a.type === "RESIDENTIAL" ? "Residential" : "Commercial"}
                    </span>
                    {a.installedBy === "OTHER" && (
                      <span className="ml-2 text-xs text-orange-600 font-medium">
                        Outside Install
                      </span>
                    )}
                  </div>
                  {a.membership && a.membership.status === "ACTIVE" && (
                    <TierBadge tier={a.membership.tier} />
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {a.addressLine1}
                  {a.addressLine2 ? `, ${a.addressLine2}` : ""}, {a.city},{" "}
                  {a.state} {a.zip}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
      />
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
