"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/fetch-api";
import BenefitUsage from "../../../benefit-usage";

interface ServiceRequest {
  id: string;
  category: string;
  urgency: string;
  status: string;
  description: string;
  preferredWindows: { date: string; startTime: string; endTime: string }[];
  createdAt: string;
  account: {
    id: string;
    name: string | null;
    addressLine1: string;
    city: string;
    state: string;
    zip: string;
    membership: { tier: string; status: string } | null;
  };
  job: {
    scheduledDate: string | null;
    scheduledWindow: string | null;
  } | null;
}

const categoryLabels: Record<string, string> = {
  SOMETHING_WRONG: "Something Wrong", MAINTENANCE: "Maintenance", CLEANING: "Cleaning",
  INSPECTION: "Inspection", BATTERY: "Battery", WARRANTY: "Warranty", OTHER: "Other",
};

const statusLabels: Record<string, string> = {
  SUBMITTED: "Submitted", UNDER_REVIEW: "Under Review", SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress", COMPLETE: "Complete", CLOSED: "Complete",
  RESCHEDULE_REQUESTED: "Rescheduling", CANCEL_REQUESTED: "Cancellation Pending",
  CANCELED: "Canceled",
};

const statusColors: Record<string, string> = {
  SUBMITTED: "bg-yellow-100 text-yellow-800", UNDER_REVIEW: "bg-blue-100 text-blue-800",
  SCHEDULED: "bg-indigo-100 text-indigo-800", IN_PROGRESS: "bg-orange-100 text-orange-800",
  COMPLETE: "bg-green-100 text-green-800", CLOSED: "bg-green-100 text-green-800",
  RESCHEDULE_REQUESTED: "bg-amber-100 text-amber-800", CANCEL_REQUESTED: "bg-red-100 text-red-800",
  CANCELED: "bg-gray-100 text-gray-600",
};

export default function CustomerRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [sr, setSr] = useState<ServiceRequest | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApi<ServiceRequest>(`/api/my/requests/${params.id}`).then(({ data, error: err }) => {
      if (err) setError(err);
      else setSr(data);
    });
  }, [params.id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!sr) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => router.push("/requests")} className="text-gray-500 hover:text-gray-700">&larr; My Requests</button>
        <h1 className="text-2xl font-bold">{categoryLabels[sr.category] || sr.category}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[sr.status] || ""}`}>
          {statusLabels[sr.status] || sr.status}
        </span>
        {sr.urgency === "URGENT" && (
          <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">Urgent</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Your Description</h2>
            <p className="whitespace-pre-wrap">{sr.description}</p>
          </div>

          {/* Status timeline */}
          <div className="rounded border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Status</h2>
            <div className="text-sm space-y-2">
              {sr.job?.scheduledDate ? (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span>
                    Appointment scheduled for{" "}
                    <span className="font-medium">{new Date(sr.job.scheduledDate).toLocaleDateString()}</span>
                    {sr.job.scheduledWindow && <span className="text-gray-500"> ({sr.job.scheduledWindow})</span>}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  <span>Our team is reviewing your request and will reach out to schedule.</span>
                </div>
              )}
              {sr.status === "IN_PROGRESS" && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span>A technician is currently working on your service.</span>
                </div>
              )}
              {(sr.status === "COMPLETE" || sr.status === "CLOSED") && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span>Service has been completed.</span>
                </div>
              )}
              {sr.status === "RESCHEDULE_REQUESTED" && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Your appointment is being rescheduled. We&apos;ll confirm a new time soon.</span>
                </div>
              )}
              {sr.status === "CANCELED" && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                  <span>This request has been canceled.</span>
                </div>
              )}
            </div>
          </div>

          {/* Preferred windows */}
          {sr.preferredWindows.length > 0 && (
            <div className="rounded border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Your Preferred Times</h2>
              <ul className="space-y-1 text-sm">
                {sr.preferredWindows.map((w, i) => (
                  <li key={i}>{new Date(w.date + "T00:00").toLocaleDateString()} {w.startTime}–{w.endTime}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Property</h2>
            <p className="font-medium">{sr.account.name || sr.account.addressLine1}</p>
            <p className="text-sm text-gray-600 mt-1">
              {sr.account.addressLine1}<br />
              {sr.account.city}, {sr.account.state} {sr.account.zip}
            </p>
          </div>

          {sr.account.membership?.status === "ACTIVE" && (
            <div className="rounded border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Membership</h2>
              <p className="font-medium">
                {sr.account.membership.tier.charAt(0) + sr.account.membership.tier.slice(1).toLowerCase()}
              </p>
            </div>
          )}

          <BenefitUsage accountId={sr.account.id} />

          <div className="rounded border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Submitted</h2>
            <p className="text-sm">{new Date(sr.createdAt).toLocaleString()}</p>
          </div>

          <div className="text-sm text-gray-500 p-4">
            <p>Reference: <code className="bg-gray-100 px-1 rounded">{sr.id.slice(0, 8)}</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
