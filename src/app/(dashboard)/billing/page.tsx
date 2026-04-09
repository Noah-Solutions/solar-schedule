"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/fetch-api";

interface BillingJob {
  id: string;
  billingStatus: string;
  scheduledDate: string | null;
  updatedAt: string;
  serviceRequest: {
    id: string;
    category: string;
    urgency: string;
    description: string;
    createdAt: string;
    account: {
      id: string;
      name: string | null;
      addressLine1: string;
      customer: { id: string; firstName: string; lastName: string };
      membership: { tier: string; status: string } | null;
    } | null;
  };
}

const categoryLabels: Record<string, string> = {
  SOMETHING_WRONG: "Something Wrong", MAINTENANCE: "Maintenance", CLEANING: "Cleaning",
  INSPECTION: "Inspection", BATTERY: "Battery", WARRANTY: "Warranty", OTHER: "Other",
};

const tierColors: Record<string, string> = {
  BASIC: "bg-gray-100 text-gray-700",
  ELITE: "bg-blue-100 text-blue-700",
  PLATINUM: "bg-purple-100 text-purple-700",
};

export default function BillingPage() {
  const [jobs, setJobs] = useState<BillingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApi<BillingJob[]>("/api/billing").then(({ data, error: err }) => {
      if (err) { setError(err); } else { setJobs(data!); }
      setLoading(false);
    });
  }, []);

  async function markBilled(jobId: string, serviceRequestId: string) {
    const { error: err } = await fetchApi(`/api/service-requests/${serviceRequestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billingStatus: "BILLED" }),
    });
    if (err) { setError(err); return; }
    setJobs(jobs.filter((j) => j.id !== jobId));
  }

  async function markNotApplicable(jobId: string, serviceRequestId: string) {
    const { error: err } = await fetchApi(`/api/service-requests/${serviceRequestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billingStatus: "NOT_APPLICABLE" }),
    });
    if (err) { setError(err); return; }
    setJobs(jobs.filter((j) => j.id !== jobId));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Billing Queue</h1>
      <p className="text-sm text-gray-500 mb-4">
        Closed jobs awaiting billing action. Mark as billed after QuickBooks handoff, or not applicable for covered work.
      </p>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : jobs.length === 0 ? (
        <p className="text-gray-500">No jobs pending billing.</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const sr = job.serviceRequest;
            const acct = sr.account;
            const cust = acct?.customer;
            return (
              <div key={job.id} className="rounded border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/requests/${sr.id}`} className="font-medium text-blue-600 hover:underline">
                        {categoryLabels[sr.category] || sr.category}
                      </Link>
                      {cust && (
                        <span className="text-sm text-gray-600">
                          — {cust.firstName} {cust.lastName}
                        </span>
                      )}
                      {acct?.membership?.status === "ACTIVE" && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tierColors[acct.membership.tier] || ""}`}>
                          {acct.membership.tier.charAt(0) + acct.membership.tier.slice(1).toLowerCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {sr.description.length > 120 ? sr.description.slice(0, 120) + "..." : sr.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Closed {new Date(job.updatedAt).toLocaleDateString()}
                      {acct && ` — ${acct.name || acct.addressLine1}`}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4 shrink-0">
                    <button onClick={() => markBilled(job.id, sr.id)}
                      className="rounded bg-green-600 px-3 py-1.5 text-xs text-white font-medium hover:bg-green-700">
                      Mark Billed
                    </button>
                    <button onClick={() => markNotApplicable(job.id, sr.id)}
                      className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
                      N/A
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
