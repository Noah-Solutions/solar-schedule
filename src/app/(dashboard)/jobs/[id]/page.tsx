"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/fetch-api";
import BenefitUsage from "../../benefit-usage";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; email: string; roles: { role: string }[] };
}

interface Job {
  id: string;
  scheduledDate: string | null;
  scheduledWindow: string | null;
  technicianNotes: string | null;
  followUpNeeded: boolean;
  followUpNote: string | null;
  rescheduleReason: string | null;
  rescheduleSuggestedTimes: { date: string; startTime: string; endTime: string }[] | null;
  serviceRequest: {
    id: string;
    category: string;
    urgency: string;
    status: string;
    description: string;
    account: {
      id: string;
      name: string | null;
      addressLine1: string;
      addressLine2: string | null;
      city: string;
      state: string;
      zip: string;
      installedBy: string;
      customer: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        primaryPhone: string;
      };
      membership: { tier: string; status: string } | null;
    } | null;
    contactName: string | null;
    contactPhone: string | null;
    serviceAddress: { addressLine1: string; city: string; state: string; zip: string } | null;
  };
  comments: Comment[];
}

const categoryLabels: Record<string, string> = {
  SOMETHING_WRONG: "Something Wrong", MAINTENANCE: "Maintenance", CLEANING: "Cleaning",
  INSPECTION: "Inspection", BATTERY: "Battery", WARRANTY: "Warranty", OTHER: "Other",
};

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-indigo-100 text-indigo-800", IN_PROGRESS: "bg-orange-100 text-orange-800",
  COMPLETE: "bg-green-100 text-green-800", CLOSED: "bg-gray-200 text-gray-800",
  CANCELED: "bg-gray-100 text-gray-600",
  RESCHEDULE_REQUESTED: "bg-amber-100 text-amber-800", CANCEL_REQUESTED: "bg-red-100 text-red-800",
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Reschedule modal
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleTimes, setRescheduleTimes] = useState([
    { date: "", startTime: "09:00", endTime: "12:00" },
  ]);

  // Follow-up
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpNote, setFollowUpNote] = useState("");

  useEffect(() => { loadJob(); }, [params.id]);

  async function loadJob() {
    const { data, error: err } = await fetchApi<Job>(`/api/jobs/${params.id}`);
    if (err) { setError(err); return; }
    setJob(data);
    setError("");
  }

  async function handleStatusChange(newStatus: string, extra?: Record<string, unknown>) {
    setUpdatingStatus(true);
    setError("");
    const { error: err } = await fetchApi(`/api/service-requests/${job!.serviceRequest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, ...extra }),
    });
    if (err) { setError(err); setUpdatingStatus(false); return; }
    await loadJob();
    setUpdatingStatus(false);
  }

  async function handleReschedule() {
    await handleStatusChange("RESCHEDULE_REQUESTED", {
      rescheduleReason,
      rescheduleSuggestedTimes: rescheduleTimes.filter((t) => t.date),
    });
    setShowReschedule(false);
    setRescheduleReason("");
    setRescheduleTimes([{ date: "", startTime: "09:00", endTime: "12:00" }]);
  }

  async function handleFollowUp() {
    setUpdatingStatus(true);
    setError("");
    const { error: err } = await fetchApi(`/api/service-requests/${job!.serviceRequest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followUpNeeded: true, followUpNote }),
    });
    if (err) { setError(err); } else { await loadJob(); }
    setUpdatingStatus(false);
    setShowFollowUp(false);
    setFollowUpNote("");
  }

  async function handleComment() {
    if (!commentBody.trim()) return;
    setPosting(true);
    setError("");
    const { error: err } = await fetchApi(`/api/jobs/${params.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody }),
    });
    if (err) { setError(err); setPosting(false); return; }
    setCommentBody("");
    await loadJob();
    setPosting(false);
  }

  if (error && !job) return <p className="text-red-600">{error}</p>;
  if (!job) return <p className="text-gray-500">Loading...</p>;

  const sr = job.serviceRequest;
  const acct = sr.account;
  const cust = acct?.customer;
  const status = sr.status;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => router.push("/jobs")} className="text-gray-500 hover:text-gray-700">&larr; Jobs</button>
        <h1 className="text-2xl font-bold">{categoryLabels[sr.category] || sr.category}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[status] || "bg-gray-100"}`}>
          {status.replace(/_/g, " ")}
        </span>
        {sr.urgency === "URGENT" && (
          <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">Urgent</span>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded mb-4">{error}</p>}

      {job.followUpNeeded && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 text-sm">
          <span className="font-medium text-amber-800">Follow-up flagged:</span>{" "}
          <span className="text-amber-700">{job.followUpNote || "Additional work needed"}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Customer Description</h2>
            <p className="whitespace-pre-wrap">{sr.description}</p>
          </div>

          {/* Status actions */}
          <div className="rounded border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Actions</h2>
            <div className="flex flex-wrap gap-2">
              {status === "SCHEDULED" && (
                <button onClick={() => handleStatusChange("IN_PROGRESS")} disabled={updatingStatus}
                  className="rounded bg-orange-500 px-4 py-2 text-sm text-white font-medium hover:bg-orange-600 disabled:opacity-50">
                  Start Work
                </button>
              )}
              {status === "IN_PROGRESS" && (
                <>
                  <button onClick={() => handleStatusChange("COMPLETE")} disabled={updatingStatus}
                    className="rounded bg-green-600 px-4 py-2 text-sm text-white font-medium hover:bg-green-700 disabled:opacity-50">
                    Mark Complete
                  </button>
                  <button onClick={() => handleStatusChange("SCHEDULED")} disabled={updatingStatus}
                    className="rounded border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                    Back to Scheduled
                  </button>
                </>
              )}
              {status === "COMPLETE" && (
                <button onClick={() => handleStatusChange("IN_PROGRESS")} disabled={updatingStatus}
                  className="rounded border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                  Reopen (Back to In Progress)
                </button>
              )}
              {status === "CLOSED" && (
                <p className="text-sm text-gray-600 py-2">This job is closed and signed off by GM.</p>
              )}

              {["SCHEDULED", "IN_PROGRESS"].includes(status) && (
                <>
                  <button onClick={() => setShowReschedule(true)} disabled={updatingStatus}
                    className="rounded border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50">
                    Request Reschedule
                  </button>
                  <button onClick={() => handleStatusChange("CANCEL_REQUESTED")} disabled={updatingStatus}
                    className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                    Request Cancel
                  </button>
                </>
              )}

              {["SCHEDULED", "IN_PROGRESS", "COMPLETE"].includes(status) && !job.followUpNeeded && (
                <button onClick={() => setShowFollowUp(true)} disabled={updatingStatus}
                  className="rounded border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                  Flag Follow-Up
                </button>
              )}

              {status === "RESCHEDULE_REQUESTED" && (
                <p className="text-sm text-amber-700 py-2">Reschedule requested — waiting for GM.</p>
              )}
              {status === "CANCEL_REQUESTED" && (
                <p className="text-sm text-red-600 py-2">Cancellation requested — waiting for GM approval.</p>
              )}
            </div>
          </div>

          {/* Reschedule modal */}
          {showReschedule && (
            <div className="rounded border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-medium text-amber-800 mb-3">Request Reschedule</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason</label>
                  <input value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="Why does this need to be rescheduled?"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Suggested times</label>
                  {rescheduleTimes.map((t, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input type="date" value={t.date} onChange={(e) => {
                        const updated = [...rescheduleTimes]; updated[i] = { ...t, date: e.target.value }; setRescheduleTimes(updated);
                      }} className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
                      <input type="time" value={t.startTime} onChange={(e) => {
                        const updated = [...rescheduleTimes]; updated[i] = { ...t, startTime: e.target.value }; setRescheduleTimes(updated);
                      }} className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
                      <input type="time" value={t.endTime} onChange={(e) => {
                        const updated = [...rescheduleTimes]; updated[i] = { ...t, endTime: e.target.value }; setRescheduleTimes(updated);
                      }} className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
                    </div>
                  ))}
                  <button onClick={() => setRescheduleTimes([...rescheduleTimes, { date: "", startTime: "09:00", endTime: "12:00" }])}
                    className="text-xs text-blue-600 hover:underline">+ Add time</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleReschedule} disabled={updatingStatus || !rescheduleReason.trim()}
                    className="rounded bg-amber-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-amber-700 disabled:opacity-50">Submit</button>
                  <button onClick={() => setShowReschedule(false)}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Follow-up modal */}
          {showFollowUp && (
            <div className="rounded border border-gray-200 bg-gray-50 p-4">
              <h3 className="font-medium mb-3">Flag for Follow-Up</h3>
              <textarea value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)}
                placeholder="Describe the additional work needed..."
                rows={3} className="w-full rounded border border-gray-300 px-3 py-2 text-sm mb-3" />
              <div className="flex gap-2">
                <button onClick={handleFollowUp} disabled={updatingStatus || !followUpNote.trim()}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50">Flag for GM</button>
                <button onClick={() => setShowFollowUp(false)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="rounded border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Notes ({job.comments.length})</h2>
            {job.comments.length === 0 ? (
              <p className="text-sm text-gray-400 mb-3">No notes yet.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {job.comments.map((c) => (
                  <div key={c.id} className="rounded bg-gray-50 p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <span className="font-medium text-gray-700">{c.author.email}</span>
                      <span>{c.author.roles.map((r) => r.role).join(", ")}</span>
                      <span>&middot;</span>
                      <span>{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={commentBody} onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Add a note..." className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }} />
              <button onClick={handleComment} disabled={posting || !commentBody.trim()}
                className="rounded bg-gray-800 px-3 py-2 text-sm text-white font-medium hover:bg-gray-900 disabled:opacity-50">Post</button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Schedule</h2>
            {job.scheduledDate ? (
              <>
                <p className="font-medium">{new Date(job.scheduledDate).toLocaleDateString()}</p>
                {job.scheduledWindow && <p className="text-sm text-gray-600">{job.scheduledWindow}</p>}
              </>
            ) : (
              <p className="text-sm text-gray-400">Not yet scheduled</p>
            )}
          </div>
          <div className="rounded border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Customer</h2>
            {cust ? (
              <>
                <p className="font-medium">{cust.firstName} {cust.lastName}</p>
                <p className="text-sm text-gray-600 mt-1">{cust.primaryPhone}</p>
                <p className="text-sm text-gray-600">{cust.email}</p>
              </>
            ) : (
              <>
                <p className="font-medium">{sr.contactName || "Unknown"}</p>
                <p className="text-sm text-gray-600 mt-1">{sr.contactPhone}</p>
              </>
            )}
          </div>
          <div className="rounded border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Property</h2>
            {acct ? (
              <>
                <p className="font-medium">{acct.name || acct.addressLine1}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {acct.addressLine1}{acct.addressLine2 ? `, ${acct.addressLine2}` : ""}<br />
                  {acct.city}, {acct.state} {acct.zip}
                </p>
                {acct.installedBy === "OTHER" && (
                  <p className="text-sm text-orange-600 font-medium mt-1">Outside Install</p>
                )}
              </>
            ) : sr.serviceAddress ? (
              <>
                <p className="font-medium">{(sr.serviceAddress as { addressLine1: string }).addressLine1}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {(sr.serviceAddress as { city: string }).city}, {(sr.serviceAddress as { state: string }).state} {(sr.serviceAddress as { zip: string }).zip}
                </p>
                <p className="text-sm text-orange-600 font-medium mt-1">Unlinked Request</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">No address on file</p>
            )}
          </div>
          {acct?.membership?.status === "ACTIVE" && (
            <div className="rounded border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Membership</h2>
              <p className="font-medium">
                {acct.membership.tier.charAt(0) + acct.membership.tier.slice(1).toLowerCase()}
              </p>
            </div>
          )}
          {acct && <BenefitUsage accountId={acct.id} />}
        </div>
      </div>
    </div>
  );
}
