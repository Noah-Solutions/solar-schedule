"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  assignedTechnicianId: string | null;
  scheduledDate: string | null;
  scheduledWindow: string | null;
  technicianNotes: string | null;
  followUpNeeded: boolean;
  followUpNote: string | null;
  rescheduleReason: string | null;
  rescheduleSuggestedTimes: { date: string; startTime: string; endTime: string }[] | null;
  comments: Comment[];
}

interface ServiceRequest {
  id: string;
  category: string;
  urgency: string;
  status: string;
  previousStatus: string | null;
  description: string;
  preferredWindows: { date: string; startTime: string; endTime: string }[];
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  serviceAddress: { addressLine1: string; city: string; state: string; zip: string; installedBy?: string } | null;
  createdAt: string;
  account: {
    id: string;
    name: string | null;
    addressLine1: string;
    city: string;
    state: string;
    zip: string;
    installedBy: string;
    customer: { id: string; firstName: string; lastName: string; email: string; primaryPhone: string };
    membership: { tier: string; status: string } | null;
  } | null;
  job: Job | null;
  attachments: { id: string; fileName: string }[];
}

interface Technician { id: string; email: string; }

const STATUS_FLOW = ["SUBMITTED", "UNDER_REVIEW", "SCHEDULED", "IN_PROGRESS", "COMPLETE", "CLOSED", "RESCHEDULE_REQUESTED", "CANCEL_REQUESTED", "CANCELED"];

const categoryLabels: Record<string, string> = {
  SOMETHING_WRONG: "Something Wrong", MAINTENANCE: "Maintenance", CLEANING: "Cleaning",
  INSPECTION: "Inspection", BATTERY: "Battery", WARRANTY: "Warranty", OTHER: "Other",
};

const statusColors: Record<string, string> = {
  SUBMITTED: "bg-yellow-100 text-yellow-800", UNDER_REVIEW: "bg-blue-100 text-blue-800",
  SCHEDULED: "bg-indigo-100 text-indigo-800", IN_PROGRESS: "bg-orange-100 text-orange-800",
  COMPLETE: "bg-green-100 text-green-800", CLOSED: "bg-gray-200 text-gray-800",
  CANCELED: "bg-gray-100 text-gray-600",
  RESCHEDULE_REQUESTED: "bg-amber-100 text-amber-800", CANCEL_REQUESTED: "bg-red-100 text-red-800",
};

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [sr, setSr] = useState<ServiceRequest | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const [scheduleForm, setScheduleForm] = useState({
    status: "", assignedTechnicianId: "", scheduledDate: "", scheduledWindow: "",
  });
  const [commentBody, setCommentBody] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // Link unlinked request
  const [showLink, setShowLink] = useState(false);
  const [linkAccountId, setLinkAccountId] = useState("");

  useEffect(() => {
    loadRequest();
    fetchApi<Technician[]>("/api/technicians").then(({ data }) => { if (data) setTechnicians(data); });
  }, [params.id]);

  async function loadRequest() {
    const { data, error: err } = await fetchApi<ServiceRequest>(`/api/service-requests/${params.id}`);
    if (err) { setError(err); return; }
    setSr(data);
    setScheduleForm({
      status: data!.status,
      assignedTechnicianId: data!.job?.assignedTechnicianId || "",
      scheduledDate: data!.job?.scheduledDate?.split("T")[0] || "",
      scheduledWindow: data!.job?.scheduledWindow || "",
    });
    setError("");
  }

  async function handleUpdate() {
    setUpdating(true);
    setError("");
    const { error: err } = await fetchApi(`/api/service-requests/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignedTechnicianId: scheduleForm.assignedTechnicianId || null,
        scheduledDate: scheduleForm.scheduledDate || null,
        scheduledWindow: scheduleForm.scheduledWindow || null,
      }),
    });
    if (err) { setError(err); } else { await loadRequest(); }
    setUpdating(false);
  }

  async function changeStatus(newStatus: string) {
    setUpdating(true);
    setError("");
    const { error: err } = await fetchApi(`/api/service-requests/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (err) { setError(err); } else { await loadRequest(); }
    setUpdating(false);
  }

  function StatusButton({ label, status, color, text }: { label: string; status: string; color: string; text?: boolean }) {
    return (
      <button onClick={() => changeStatus(status)} disabled={updating}
        className={`rounded px-4 py-2 text-sm font-medium disabled:opacity-50 ${text ? color : `${color} text-white`}`}>
        {label}
      </button>
    );
  }

  async function handleCancelApprove() {
    setUpdating(true);
    setError("");
    const { error: err } = await fetchApi(`/api/service-requests/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELED" }),
    });
    if (err) { setError(err); } else { await loadRequest(); }
    setUpdating(false);
  }

  async function handleCancelReject() {
    setUpdating(true);
    setError("");
    const revertTo = sr?.previousStatus || "SCHEDULED";
    const { error: err } = await fetchApi(`/api/service-requests/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: revertTo }),
    });
    if (err) { setError(err); } else { await loadRequest(); }
    setUpdating(false);
  }

  async function handleLinkAccount() {
    if (!linkAccountId) return;
    setUpdating(true);
    setError("");
    const { data, error: err } = await fetchApi<ServiceRequest>(`/api/service-requests/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: linkAccountId }),
    });
    if (err) { setError(err); } else if (data) { setSr(data); setShowLink(false); }
    setUpdating(false);
  }

  async function handleComment() {
    if (!commentBody.trim() || !sr?.job) return;
    setPostingComment(true);
    setError("");
    const { error: err } = await fetchApi(`/api/jobs/${sr.job.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody }),
    });
    if (err) { setError(err); } else { setCommentBody(""); await loadRequest(); }
    setPostingComment(false);
  }

  if (error && !sr) return <p className="text-red-600">{error}</p>;
  if (!sr) return <p className="text-gray-500">Loading...</p>;

  const cust = sr.account?.customer;
  const mem = sr.account?.membership;
  const isUnlinked = !sr.account;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => router.push("/requests")} className="text-gray-500 hover:text-gray-700">&larr; Queue</button>
        <h1 className="text-2xl font-bold">{categoryLabels[sr.category] || sr.category}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[sr.status] || ""}`}>
          {sr.status.replace(/_/g, " ")}
        </span>
        {sr.urgency === "URGENT" && (
          <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">Urgent</span>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded mb-4">{error}</p>}

      {/* Alerts */}
      {isUnlinked && (
        <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4 text-sm flex items-center justify-between">
          <div>
            <span className="font-medium text-orange-800">Unlinked Request</span>
            <span className="text-orange-700 ml-2">No account — contact info only. Link to an account to proceed.</span>
          </div>
          <button onClick={() => setShowLink(true)} className="text-sm text-orange-700 font-medium hover:underline">Link Account</button>
        </div>
      )}

      {sr.status === "CANCEL_REQUESTED" && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-sm flex items-center gap-3">
          <span className="font-medium text-red-800">Technician requested cancellation</span>
          <button onClick={handleCancelApprove} disabled={updating}
            className="rounded bg-red-600 px-3 py-1 text-xs text-white font-medium hover:bg-red-700 disabled:opacity-50">Approve Cancel</button>
          <button onClick={handleCancelReject} disabled={updating}
            className="rounded border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50">Reject</button>
        </div>
      )}

      {sr.status === "RESCHEDULE_REQUESTED" && sr.job && (
        <div className="bg-amber-50 border border-amber-200 rounded p-4 mb-4 text-sm">
          <span className="font-medium text-amber-800">Reschedule Requested</span>
          {sr.job.rescheduleReason && <p className="text-amber-700 mt-1">Reason: {sr.job.rescheduleReason}</p>}
          {sr.job.rescheduleSuggestedTimes && (sr.job.rescheduleSuggestedTimes as { date: string; startTime: string; endTime: string }[]).length > 0 && (
            <div className="mt-2">
              <p className="text-amber-700 font-medium mb-1">Suggested times — click to accept:</p>
              <div className="flex flex-wrap gap-2">
                {(sr.job.rescheduleSuggestedTimes as { date: string; startTime: string; endTime: string }[]).map((t, i) => (
                  <button key={i} onClick={async () => {
                    setUpdating(true); setError("");
                    const { error: err } = await fetchApi(`/api/service-requests/${params.id}`, {
                      method: "PATCH", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        status: "SCHEDULED",
                        scheduledDate: t.date,
                        scheduledWindow: `${t.startTime}–${t.endTime}`,
                      }),
                    });
                    if (err) { setError(err); } else { await loadRequest(); }
                    setUpdating(false);
                  }} disabled={updating}
                    className="rounded border border-amber-400 bg-white px-3 py-1.5 text-amber-800 font-medium hover:bg-amber-100 disabled:opacity-50">
                    {new Date(t.date + "T00:00").toLocaleDateString()} {t.startTime}–{t.endTime}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-amber-600 text-xs mt-2">Or use the controls below to set a custom date and change status to Scheduled.</p>
        </div>
      )}

      {sr.job?.followUpNeeded && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 text-sm">
          <span className="font-medium text-amber-800">Follow-Up Needed:</span>{" "}
          <span className="text-amber-700">{sr.job.followUpNote || "Additional work discovered"}</span>
        </div>
      )}

      {/* Link account modal */}
      {showLink && (
        <div className="rounded border border-orange-200 bg-orange-50 p-4 mb-4">
          <h3 className="font-medium text-orange-800 mb-2">Link to Account</h3>
          <p className="text-sm text-orange-700 mb-3">Enter the account ID to link this request. Create the customer/account first if needed.</p>
          <div className="flex gap-2">
            <input value={linkAccountId} onChange={(e) => setLinkAccountId(e.target.value)}
              placeholder="Account ID" className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm" />
            <button onClick={handleLinkAccount} disabled={updating || !linkAccountId}
              className="rounded bg-orange-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-orange-700 disabled:opacity-50">Link</button>
            <button onClick={() => setShowLink(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Description</h2>
            <p className="whitespace-pre-wrap">{sr.description}</p>
          </div>

          {/* Preferred windows */}
          {sr.preferredWindows.length > 0 && (
            <div className="rounded border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Preferred Appointment Windows</h2>
              <ul className="space-y-1 text-sm">
                {sr.preferredWindows.map((w, i) => (
                  <li key={i}>{new Date(w.date + "T00:00").toLocaleDateString()} {w.startTime}–{w.endTime}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Status Actions */}
          <div className="rounded border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Actions</h2>
            <div className="flex flex-wrap gap-2">
              {sr.status === "SUBMITTED" && (
                <StatusButton label="Begin Review" status="UNDER_REVIEW" color="bg-blue-600 hover:bg-blue-700" />
              )}
              {sr.status === "UNDER_REVIEW" && (
                <>
                  <StatusButton label="Schedule" status="SCHEDULED" color="bg-indigo-600 hover:bg-indigo-700" />
                  <StatusButton label="Back to Submitted" status="SUBMITTED" color="border border-gray-300 !text-gray-700 !bg-white hover:!bg-gray-50" text />
                </>
              )}
              {sr.status === "SCHEDULED" && (
                <>
                  <StatusButton label="Start Work" status="IN_PROGRESS" color="bg-orange-500 hover:bg-orange-600" />
                  <StatusButton label="Back to Review" status="UNDER_REVIEW" color="border border-gray-300 !text-gray-700 !bg-white hover:!bg-gray-50" text />
                </>
              )}
              {sr.status === "IN_PROGRESS" && (
                <>
                  <StatusButton label="Mark Complete" status="COMPLETE" color="bg-green-600 hover:bg-green-700" />
                  <StatusButton label="Back to Scheduled" status="SCHEDULED" color="border border-gray-300 !text-gray-700 !bg-white hover:!bg-gray-50" text />
                </>
              )}
              {sr.status === "COMPLETE" && (
                <>
                  <StatusButton label="Close & Sign Off" status="CLOSED" color="bg-gray-800 hover:bg-gray-900" />
                  <StatusButton label="Reopen" status="IN_PROGRESS" color="border border-gray-300 !text-gray-700 !bg-white hover:!bg-gray-50" text />
                </>
              )}
              {sr.status === "CLOSED" && (
                <StatusButton label="Reopen (Back to Complete)" status="COMPLETE" color="border border-gray-300 !text-gray-700 !bg-white hover:!bg-gray-50" text />
              )}
              {sr.status === "RESCHEDULE_REQUESTED" && (
                <StatusButton label="Schedule" status="SCHEDULED" color="bg-indigo-600 hover:bg-indigo-700" />
              )}
              {!["CANCELED", "CLOSED"].includes(sr.status) && (
                <StatusButton label="Cancel" status="CANCELED" color="border border-red-300 !text-red-600 !bg-white hover:!bg-red-50" text />
              )}
            </div>
          </div>

          {/* Scheduling Details */}
          <div className="rounded border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Scheduling</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Assign Technician</label>
                <select value={scheduleForm.assignedTechnicianId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, assignedTechnicianId: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Unassigned</option>
                  {technicians.map((t) => <option key={t.id} value={t.id}>{t.email}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Scheduled Date</label>
                <input type="date" value={scheduleForm.scheduledDate}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time Window</label>
                <input type="text" placeholder="e.g., 9am-12pm" value={scheduleForm.scheduledWindow}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledWindow: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <button onClick={handleUpdate} disabled={updating}
              className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50">
              {updating ? "Saving..." : "Save Scheduling"}
            </button>
          </div>

          {/* Comments */}
          {sr.job && (
            <div className="rounded border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Job Notes</h2>
              {sr.job.comments.length === 0 ? (
                <p className="text-sm text-gray-400 mb-3">No notes yet.</p>
              ) : (
                <div className="space-y-3 mb-4">
                  {sr.job.comments.map((c) => (
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
                <button onClick={handleComment} disabled={postingComment || !commentBody.trim()}
                  className="rounded bg-gray-800 px-3 py-2 text-sm text-white font-medium hover:bg-gray-900 disabled:opacity-50">Post</button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {cust ? (
            <div className="rounded border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Customer</h2>
              <Link href={`/customers/${cust.id}`} className="font-medium text-blue-600 hover:underline">
                {cust.firstName} {cust.lastName}
              </Link>
              <p className="text-sm text-gray-600 mt-1">{cust.email}</p>
              <p className="text-sm text-gray-600">{cust.primaryPhone}</p>
            </div>
          ) : (
            <div className="rounded border border-orange-200 bg-orange-50 p-4">
              <h2 className="text-sm font-semibold text-orange-800 uppercase mb-2">Contact Info (Unlinked)</h2>
              <p className="font-medium">{sr.contactName}</p>
              <p className="text-sm text-gray-600 mt-1">{sr.contactEmail}</p>
              <p className="text-sm text-gray-600">{sr.contactPhone}</p>
            </div>
          )}

          {sr.account ? (
            <div className="rounded border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Property</h2>
              <Link href={`/accounts/${sr.account.id}`} className="font-medium text-blue-600 hover:underline">
                {sr.account.name || sr.account.addressLine1}
              </Link>
              <p className="text-sm text-gray-600 mt-1">
                {sr.account.addressLine1}, {sr.account.city}, {sr.account.state} {sr.account.zip}
              </p>
              {sr.account.installedBy === "OTHER" && (
                <p className="text-sm text-orange-600 font-medium mt-1">Outside Install</p>
              )}
            </div>
          ) : sr.serviceAddress ? (
            <div className="rounded border border-orange-200 bg-orange-50 p-4">
              <h2 className="text-sm font-semibold text-orange-800 uppercase mb-2">Service Address (Unlinked)</h2>
              <p className="font-medium">{sr.serviceAddress.addressLine1}</p>
              <p className="text-sm text-gray-600 mt-1">
                {sr.serviceAddress.city}, {sr.serviceAddress.state} {sr.serviceAddress.zip}
              </p>
              {sr.serviceAddress.installedBy === "OTHER" && (
                <p className="text-sm text-orange-600 font-medium mt-1">Outside Install</p>
              )}
            </div>
          ) : null}

          {mem && mem.status === "ACTIVE" && (
            <div className="rounded border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Membership</h2>
              <p className="font-medium">{mem.tier.charAt(0) + mem.tier.slice(1).toLowerCase()}</p>
            </div>
          )}

          {sr.account && <BenefitUsage accountId={sr.account.id} />}

          <div className="rounded border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Submitted</h2>
            <p className="text-sm">{new Date(sr.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
