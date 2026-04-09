"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { fetchApi } from "@/lib/fetch-api";
import "@/lib/auth-types";

// Internal queue request shape
interface QueueRequest {
  id: string;
  category: string;
  urgency: string;
  status: string;
  description: string;
  createdAt: string;
  contactName: string | null;
  contactPhone: string | null;
  serviceAddress: { addressLine1: string; city: string; state: string } | null;
  account: {
    id: string;
    name: string | null;
    addressLine1: string;
    city: string;
    state: string;
    customer: {
      id: string;
      firstName: string;
      lastName: string;
      primaryPhone: string;
    };
    membership: { tier: string; status: string } | null;
  } | null;
  job: { id: string; assignedTechnicianId: string | null; scheduledDate: string | null; followUpNeeded: boolean; rescheduleReason: string | null } | null;
}

// Customer's own request shape
interface MyRequest {
  id: string;
  category: string;
  urgency: string;
  status: string;
  description: string;
  createdAt: string;
  account: {
    id: string;
    name: string | null;
    addressLine1: string;
    city: string;
    state: string;
  };
  job: { scheduledDate: string | null; scheduledWindow: string | null } | null;
}

const STATUS_OPTIONS = ["", "SUBMITTED", "UNDER_REVIEW", "SCHEDULED", "IN_PROGRESS", "COMPLETE", "CLOSED", "RESCHEDULE_REQUESTED", "CANCEL_REQUESTED", "CANCELED"];

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
  CLOSED: "bg-gray-200 text-gray-800",
  RESCHEDULE_REQUESTED: "bg-amber-100 text-amber-800",
  CANCEL_REQUESTED: "bg-red-100 text-red-800",
  CANCELED: "bg-gray-100 text-gray-600",
};

const tierColors: Record<string, string> = {
  BASIC: "bg-gray-100 text-gray-700",
  ELITE: "bg-blue-100 text-blue-700",
  PLATINUM: "bg-purple-100 text-purple-700",
};

export default function RequestsPage() {
  const { data: session } = useSession();
  const roles = session?.user?.roles || [];
  const isInternal = roles.some((r) =>
    ["GM", "ADMIN", "TECHNICIAN", "BOOKKEEPER"].includes(r)
  );

  if (!session) return <p className="text-gray-500">Loading...</p>;

  return isInternal ? <InternalQueue /> : <CustomerRequests />;
}

// ─── Internal Queue ─────────────────────────────────────────

function InternalQueue() {
  const [requests, setRequests] = useState<QueueRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  async function fetchRequests() {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : "";
    const { data, error: err } = await fetchApi<QueueRequest[]>(`/api/service-requests${params}`);
    if (err) { setError(err); } else { setRequests(data!); setError(""); }
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Service Request Queue</h1>

      <div className="flex gap-2 mb-4">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s || "all"}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium border ${
              statusFilter === s
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s ? s.replace("_", " ") : "All"}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-gray-500">No service requests found.</p>
      ) : (
        <div className="space-y-2">
          {requests.map((sr) => (
            <Link
              key={sr.id}
              href={`/requests/${sr.id}`}
              className="block rounded border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {sr.account
                        ? `${sr.account.customer.lastName}, ${sr.account.customer.firstName}`
                        : sr.contactName || "Unknown"}
                    </span>
                    {sr.account?.membership?.status === "ACTIVE" && (
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tierColors[sr.account.membership.tier] || ""}`}>
                        {sr.account.membership.tier.charAt(0) + sr.account.membership.tier.slice(1).toLowerCase()}
                      </span>
                    )}
                    {sr.urgency === "URGENT" && (
                      <span className="inline-block rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">Urgent</span>
                    )}
                    {!sr.account && (
                      <span className="inline-block rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-xs font-medium">Unlinked</span>
                    )}
                    {sr.job?.followUpNeeded && (
                      <span className="inline-block rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">Follow-up</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {categoryLabels[sr.category] || sr.category} &mdash;{" "}
                    {sr.description.length > 100 ? sr.description.slice(0, 100) + "..." : sr.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {sr.account
                      ? `${sr.account.name || sr.account.addressLine1}, ${sr.account.city}, ${sr.account.state}`
                      : sr.serviceAddress
                        ? `${sr.serviceAddress.addressLine1}, ${sr.serviceAddress.city}, ${sr.serviceAddress.state}`
                        : "No address"
                    }
                    {" "}&middot; {new Date(sr.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${statusColors[sr.status] || ""}`}>
                  {sr.status.replace(/_/g, " ")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Customer Requests View ─────────────────────────────────

function CustomerRequests() {
  const [requests, setRequests] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApi<MyRequest[]>("/api/my/requests").then(({ data, error: err }) => {
      if (err) { setError(err); } else { setRequests(data!); }
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Service Requests</h1>
        <Link
          href="/request"
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700"
        >
          New Request
        </Link>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">You haven&apos;t submitted any service requests yet.</p>
          <Link
            href="/request"
            className="rounded bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700"
          >
            Request Service
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((sr) => (
            <div
              key={sr.id}
              className="rounded border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {categoryLabels[sr.category] || sr.category}
                    </span>
                    {sr.urgency === "URGENT" && (
                      <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
                        Urgent
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {sr.description.length > 150
                      ? sr.description.slice(0, 150) + "..."
                      : sr.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {sr.account.name || sr.account.addressLine1}, {sr.account.city},{" "}
                    {sr.account.state} &middot; Submitted{" "}
                    {new Date(sr.createdAt).toLocaleDateString()}
                  </p>
                  {sr.job?.scheduledDate && (
                    <p className="text-xs text-indigo-600 mt-1">
                      Scheduled: {new Date(sr.job.scheduledDate).toLocaleDateString()}
                      {sr.job.scheduledWindow && ` (${sr.job.scheduledWindow})`}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${statusColors[sr.status] || ""}`}
                >
                  {sr.status.replace("_", " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
