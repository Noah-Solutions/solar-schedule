"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import BenefitUsage from "../../benefit-usage";

interface Membership {
  id: string;
  tier: string;
  status: string;
  startDate: string;
  renewalDate: string | null;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
}

interface ServiceRequest {
  id: string;
  category: string;
  urgency: string;
  status: string;
  createdAt: string;
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
  customer: Customer;
  membership: Membership | null;
  serviceRequests: ServiceRequest[];
}

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    type: "",
    name: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zip: "",
    installedBy: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/accounts/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setAccount(data);
        setForm({
          type: data.type,
          name: data.name || "",
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2 || "",
          city: data.city,
          state: data.state,
          zip: data.zip,
          installedBy: data.installedBy,
        });
      });
  }, [params.id]);

  async function handleSave() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/accounts/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        name: form.name || null,
        addressLine2: form.addressLine2 || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
      setSaving(false);
      return;
    }
    const updated = await res.json();
    setAccount({ ...account!, ...updated });
    setEditing(false);
    setSaving(false);
  }

  if (!account) return <p className="text-gray-500">Loading...</p>;

  const categoryLabels: Record<string, string> = {
    SOMETHING_WRONG: "Something Wrong",
    MAINTENANCE: "Maintenance",
    CLEANING: "Cleaning",
    INSPECTION: "Inspection",
    BATTERY: "Battery",
    WARRANTY: "Warranty",
    OTHER: "Other",
  };

  const statusColors: Record<string, string> = {
    SUBMITTED: "bg-yellow-100 text-yellow-800",
    UNDER_REVIEW: "bg-blue-100 text-blue-800",
    SCHEDULED: "bg-indigo-100 text-indigo-800",
    IN_PROGRESS: "bg-orange-100 text-orange-800",
    COMPLETE: "bg-green-100 text-green-800",
    CANCELED: "bg-gray-100 text-gray-600",
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`/customers/${account.customer.id}`)}
          className="text-gray-500 hover:text-gray-700"
        >
          &larr; {account.customer.firstName} {account.customer.lastName}
        </button>
        <h1 className="text-2xl font-bold">
          {account.name || account.addressLine1}
        </h1>
        <span className="text-sm text-gray-500">
          {account.type === "RESIDENTIAL" ? "Residential" : "Commercial"}
        </span>
        {account.installedBy === "OTHER" && (
          <span className="text-sm text-orange-600 font-medium">
            Outside Install
          </span>
        )}
      </div>

      {/* Account Info */}
      <div className="rounded border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Account Details</h2>
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
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="COMMERCIAL">Commercial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Installed by
                </label>
                <select
                  value={form.installedBy}
                  onChange={(e) =>
                    setForm({ ...form, installedBy: e.target.value })
                  }
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="EGT">EGT</option>
                  <option value="OTHER">Other provider</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Label
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Address line 1
              </label>
              <input
                value={form.addressLine1}
                onChange={(e) =>
                  setForm({ ...form, addressLine1: e.target.value })
                }
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Address line 2
              </label>
              <input
                value={form.addressLine2}
                onChange={(e) =>
                  setForm({ ...form, addressLine2: e.target.value })
                }
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  State
                </label>
                <input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  maxLength={2}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ZIP
                </label>
                <input
                  value={form.zip}
                  onChange={(e) => setForm({ ...form, zip: e.target.value })}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
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
              <dt className="text-gray-500">Address</dt>
              <dd>
                {account.addressLine1}
                {account.addressLine2 ? `, ${account.addressLine2}` : ""}
                <br />
                {account.city}, {account.state} {account.zip}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Customer</dt>
              <dd>
                <Link
                  href={`/customers/${account.customer.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {account.customer.firstName} {account.customer.lastName}
                </Link>
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/* Membership */}
      <MembershipSection
        accountId={account.id}
        membership={account.membership}
        onUpdate={(m) => setAccount({ ...account, membership: m })}
      />

      {/* Benefit Usage */}
      {account.membership?.status === "ACTIVE" && (
        <div className="mb-6">
          <BenefitUsage accountId={account.id} />
        </div>
      )}

      {/* Recent Service Requests */}
      <div className="rounded border border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-3">Recent Service Requests</h2>
        {account.serviceRequests.length === 0 ? (
          <p className="text-sm text-gray-500">No service requests yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Urgency</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {account.serviceRequests.map((sr) => (
                <tr key={sr.id} className="border-b">
                  <td className="py-2">
                    {new Date(sr.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2">
                    {categoryLabels[sr.category] || sr.category}
                  </td>
                  <td className="py-2">
                    {sr.urgency === "URGENT" ? (
                      <span className="text-red-600 font-medium">Urgent</span>
                    ) : (
                      "Normal"
                    )}
                  </td>
                  <td className="py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[sr.status] || ""}`}
                    >
                      {sr.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MembershipSection({
  accountId,
  membership,
  onUpdate,
}: {
  accountId: string;
  membership: Membership | null;
  onUpdate: (m: Membership | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tier: membership?.tier || "BASIC",
    status: membership?.status || "ACTIVE",
    startDate: membership?.startDate?.split("T")[0] || new Date().toISOString().split("T")[0],
    renewalDate: membership?.renewalDate?.split("T")[0] || "",
  });

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/accounts/${accountId}/membership`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdate(updated);
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleCancel() {
    setSaving(true);
    const res = await fetch(`/api/accounts/${accountId}/membership`, {
      method: "DELETE",
    });
    if (res.ok) {
      onUpdate({ ...membership!, status: "CANCELED" });
      setEditing(false);
    }
    setSaving(false);
  }

  return (
    <div className="rounded border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Membership</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            {membership ? "Edit" : "Assign Membership"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tier</label>
              <select
                value={form.tier}
                onChange={(e) => setForm({ ...form, tier: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="BASIC">Basic</option>
                <option value="ELITE">Elite</option>
                <option value="PLATINUM">Platinum</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="CANCELED">Canceled</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Renewal date</label>
              <input
                type="date"
                value={form.renewalDate}
                onChange={(e) => setForm({ ...form, renewalDate: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            {membership && membership.status === "ACTIVE" && (
              <button
                onClick={handleCancel}
                disabled={saving}
                className="ml-auto rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Cancel Membership
              </button>
            )}
          </div>
        </div>
      ) : membership ? (
        <dl className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-gray-500">Tier</dt>
            <dd className="font-medium">
              {membership.tier.charAt(0) + membership.tier.slice(1).toLowerCase()}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd>{membership.status}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Renewal</dt>
            <dd>
              {membership.renewalDate
                ? new Date(membership.renewalDate).toLocaleDateString()
                : "N/A"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-gray-500">No membership assigned.</p>
      )}
    </div>
  );
}
