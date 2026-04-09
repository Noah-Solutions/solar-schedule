"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { fetchApi } from "@/lib/fetch-api";

const CATEGORIES = [
  { value: "SOMETHING_WRONG", label: "Something is wrong", description: "My system isn't working correctly" },
  { value: "MAINTENANCE", label: "Routine maintenance", description: "Scheduled upkeep for my system" },
  { value: "CLEANING", label: "Cleaning", description: "Panel cleaning service" },
  { value: "INSPECTION", label: "Inspection", description: "On-site system inspection" },
  { value: "BATTERY", label: "Battery help", description: "Battery-related service or questions" },
  { value: "WARRANTY", label: "Warranty help", description: "Warranty claim or question" },
  { value: "OTHER", label: "Other service", description: "Something not listed above" },
];

interface PreferredWindow { date: string; startTime: string; endTime: string; }

interface FormData {
  category: string;
  urgency: string;
  description: string;
  preferredWindows: PreferredWindow[];
}

interface AccountOption { id: string; name: string | null; addressLine1: string; city: string; state: string; }

type Step = "category" | "details" | "schedule" | "review" | "submitted";

export default function ServiceRequestPage() {
  const { data: session, status: sessionStatus } = useSession();
  const sessionLoading = sessionStatus === "loading";
  const isLoggedIn = sessionStatus === "authenticated";
  const hasCustomerId = !!(session?.user as Record<string, unknown>)?.customerId;

  const [step, setStep] = useState<Step>("category");
  const [form, setForm] = useState<FormData>({
    category: "", urgency: "NORMAL", description: "", preferredWindows: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");

  // Linked flow — logged in customer with accounts
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Unlinked flow — no login or no accounts
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [installedBy, setInstalledBy] = useState("EGT");

  const isUnlinked = !sessionLoading && (!isLoggedIn || !hasCustomerId || accounts.length === 0);

  useEffect(() => {
    if (isLoggedIn && hasCustomerId) {
      loadAccounts();
    }
  }, [isLoggedIn, hasCustomerId]);

  async function loadAccounts() {
    setLoadingAccounts(true);
    const { data } = await fetchApi<AccountOption[]>("/api/my/accounts");
    if (data) {
      setAccounts(data);
      if (data.length === 1) setSelectedAccountId(data[0].id);
    }
    setLoadingAccounts(false);
  }

  function handleCategorySelect(category: string) {
    setForm({ ...form, category });
    setStep("details");
  }

  function addWindow() {
    setForm({ ...form, preferredWindows: [...form.preferredWindows, { date: "", startTime: "09:00", endTime: "12:00" }] });
  }

  function updateWindow(i: number, field: keyof PreferredWindow, value: string) {
    const updated = [...form.preferredWindows];
    updated[i] = { ...updated[i], [field]: value };
    setForm({ ...form, preferredWindows: updated });
  }

  function removeWindow(i: number) {
    setForm({ ...form, preferredWindows: form.preferredWindows.filter((_, idx) => idx !== i) });
  }

  function canProceedFromDetails(): boolean {
    if (!form.description.trim()) return false;
    if (isUnlinked) {
      return !!(contactName.trim() && contactPhone.trim() && contactEmail.trim() && addressLine1.trim() && city.trim() && state.trim() && zip.trim());
    }
    return !!selectedAccountId;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    const payload: Record<string, unknown> = {
      category: form.category,
      urgency: form.urgency,
      description: form.description,
      preferredWindows: form.preferredWindows.filter((w) => w.date),
    };

    if (isUnlinked) {
      payload.contactName = contactName.trim();
      payload.contactPhone = contactPhone.trim();
      payload.contactEmail = contactEmail.trim();
      payload.serviceAddress = {
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        zip: zip.trim(),
        installedBy,
      };
    } else {
      payload.accountId = selectedAccountId;
    }

    const { data, error: err } = await fetchApi<{ id: string }>("/api/service-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (err) { setError(err); setSubmitting(false); return; }
    setRequestId(data!.id);
    setStep("submitted");
    setSubmitting(false);
  }

  const categoryLabel = CATEGORIES.find((c) => c.value === form.category)?.label || form.category;

  return (
    <div className="flex min-h-full items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">&larr; Back to home</Link>
          <h1 className="text-2xl font-bold mt-2">Request Service</h1>
          {step !== "submitted" && step !== "category" && (
            <div className="flex gap-2 mt-3">
              {(["category", "details", "schedule", "review"] as Step[]).map((s, i) => (
                <div key={s} className={`h-1 flex-1 rounded ${
                  ["category", "details", "schedule", "review"].indexOf(step) >= i ? "bg-blue-600" : "bg-gray-200"
                }`} />
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded mb-4">{error}</p>}

        {/* Step 1: Category */}
        {step === "category" && (
          <div className="space-y-2">
            <p className="text-gray-600 mb-4">What do you need help with?</p>
            {CATEGORIES.map((cat) => (
              <button key={cat.value} onClick={() => handleCategorySelect(cat.value)}
                className="w-full text-left rounded border border-gray-200 p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <span className="font-medium">{cat.label}</span>
                <span className="block text-sm text-gray-500 mt-0.5">{cat.description}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Details */}
        {step === "details" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Category: <span className="font-medium text-gray-700">{categoryLabel}</span>
              <button onClick={() => setStep("category")} className="ml-2 text-blue-600 hover:underline">Change</button>
            </p>

            {/* Session still loading */}
            {(sessionLoading || loadingAccounts) && (
              <p className="text-gray-500 text-sm">Loading your account info...</p>
            )}

            {/* Linked: account selection */}
            {!sessionLoading && isLoggedIn && hasCustomerId && !loadingAccounts && accounts.length > 1 && (
              <div>
                <label className="block text-sm font-medium mb-1">Which property is this for?</label>
                <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2">
                  <option value="">Select a property...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name || a.addressLine1}, {a.city}, {a.state}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Unlinked: contact info + address */}
            {isUnlinked && !sessionLoading && !loadingAccounts && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                  {isLoggedIn
                    ? "We don't have a service location on file. Please provide your contact and address info."
                    : "Please provide your contact details so our team can follow up."}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium">Full name</label>
                    <input value={contactName} onChange={(e) => setContactName(e.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Phone</label>
                    <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+1XXXXXXXXXX" className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Email</label>
                    <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium">Service address</label>
                  <input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Street address" className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium">City</label>
                    <input value={city} onChange={(e) => setCity(e.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">State</label>
                    <input value={state} onChange={(e) => setState(e.target.value)} maxLength={2} placeholder="AZ"
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">ZIP</label>
                    <input value={zip} onChange={(e) => setZip(e.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium">Who installed your system?</label>
                  <select value={installedBy} onChange={(e) => setInstalledBy(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2">
                    <option value="EGT">EGT</option>
                    <option value="OTHER">Another company</option>
                  </select>
                </div>
              </>
            )}

            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium mb-1">How urgent is this?</label>
              <div className="flex gap-3">
                <button onClick={() => setForm({ ...form, urgency: "NORMAL" })}
                  className={`flex-1 rounded border p-3 text-sm ${form.urgency === "NORMAL" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-gray-300"}`}>
                  <span className="font-medium">Normal</span>
                  <span className="block text-xs mt-0.5 opacity-75">Standard scheduling</span>
                </button>
                <button onClick={() => setForm({ ...form, urgency: "URGENT" })}
                  className={`flex-1 rounded border p-3 text-sm ${form.urgency === "URGENT" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 hover:border-gray-300"}`}>
                  <span className="font-medium">Urgent</span>
                  <span className="block text-xs mt-0.5 opacity-75">System down or critical issue</span>
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">Tell us what&apos;s going on</label>
              <textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4} placeholder="Describe the issue or what you need in your own words..."
                className="w-full rounded border border-gray-300 px-3 py-2" />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep("schedule")} disabled={!canProceedFromDetails()}
                className="rounded bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50">Next: Scheduling</button>
              <button onClick={() => setStep("category")}
                className="rounded border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50">Back</button>
            </div>
          </div>
        )}

        {/* Step 3: Scheduling preferences */}
        {step === "schedule" && (
          <div className="space-y-4">
            <p className="text-gray-600">Add your preferred appointment windows. Our team will confirm a final time with you.</p>
            {form.preferredWindows.map((w, i) => (
              <div key={i} className="flex items-end gap-2 rounded border border-gray-200 p-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500">Date</label>
                  <input type="date" value={w.date} onChange={(e) => updateWindow(i, "date", e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">From</label>
                  <input type="time" value={w.startTime} onChange={(e) => updateWindow(i, "startTime", e.target.value)}
                    className="mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">To</label>
                  <input type="time" value={w.endTime} onChange={(e) => updateWindow(i, "endTime", e.target.value)}
                    className="mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm" />
                </div>
                <button onClick={() => removeWindow(i)} className="text-gray-400 hover:text-red-500 pb-1">&times;</button>
              </div>
            ))}
            <button onClick={addWindow} className="text-sm text-blue-600 hover:underline">+ Add a preferred time</button>
            <div className="flex gap-2">
              <button onClick={() => setStep("review")}
                className="rounded bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700">Next: Review</button>
              <button onClick={() => setStep("details")}
                className="rounded border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50">Back</button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === "review" && (
          <div className="space-y-4">
            <p className="text-gray-600 mb-2">Review your service request:</p>
            <dl className="space-y-3 text-sm">
              <ReviewItem label="Category" value={categoryLabel} />
              <ReviewItem label="Urgency" value={form.urgency === "URGENT" ? <span className="text-red-600">Urgent</span> : "Normal"} />
              <ReviewItem label="Description" value={<span className="whitespace-pre-wrap">{form.description}</span>} />
              {isUnlinked ? (
                <>
                  <ReviewItem label="Contact" value={`${contactName} — ${contactPhone} — ${contactEmail}`} />
                  <ReviewItem label="Address" value={`${addressLine1}, ${city}, ${state} ${zip}`} />
                  <ReviewItem label="Installed by" value={installedBy === "EGT" ? "EGT" : "Other provider"} />
                </>
              ) : (
                <ReviewItem label="Property" value={
                  accounts.find((a) => a.id === selectedAccountId)?.name ||
                  accounts.find((a) => a.id === selectedAccountId)?.addressLine1 || "—"
                } />
              )}
              {form.preferredWindows.length > 0 && (
                <ReviewItem label="Preferred times" value={
                  form.preferredWindows.filter((w) => w.date).map((w, i) => (
                    <div key={i}>{new Date(w.date + "T00:00").toLocaleDateString()} {w.startTime}–{w.endTime}</div>
                  ))
                } />
              )}
            </dl>
            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={submitting}
                className="rounded bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50">
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
              <button onClick={() => setStep("schedule")}
                className="rounded border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50">Back</button>
            </div>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === "submitted" && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4" aria-hidden="true">&#10003;</div>
            <h2 className="text-xl font-bold mb-2">Request Submitted</h2>
            <p className="text-gray-600 mb-6">
              Your service request has been received. Our team will review it and reach out to confirm scheduling.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Reference: <code className="bg-gray-100 px-1 rounded">{requestId.slice(0, 8)}</code>
            </p>
            <Link href="/" className="rounded bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700">Back to Home</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded bg-gray-50 p-3">
      <dt className="text-gray-500 text-xs uppercase">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
