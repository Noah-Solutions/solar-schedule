"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Job {
  id: string;
  scheduledDate: string | null;
  scheduledWindow: string | null;
  assignedTechnicianId: string | null;
  serviceRequest: {
    id: string;
    category: string;
    urgency: string;
    status: string;
    description: string;
    account: {
      name: string | null;
      addressLine1: string;
      city: string;
      state: string;
      customer: {
        firstName: string;
        lastName: string;
        primaryPhone: string;
      };
      membership: { tier: string; status: string } | null;
    };
  };
  comments: { id: string }[];
}

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

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => {
        setJobs(data);
        setLoading(false);
      });
  }, []);

  const activeJobs = jobs.filter(
    (j) => !["COMPLETE", "CLOSED", "CANCELED"].includes(j.serviceRequest.status)
  );
  const completedJobs = jobs.filter((j) =>
    ["COMPLETE", "CLOSED", "CANCELED"].includes(j.serviceRequest.status)
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Jobs</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : jobs.length === 0 ? (
        <p className="text-gray-500">No jobs assigned.</p>
      ) : (
        <>
          {activeJobs.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                Active ({activeJobs.length})
              </h2>
              <div className="space-y-2">
                {activeJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </div>
          )}

          {completedJobs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                Completed ({completedJobs.length})
              </h2>
              <div className="space-y-2">
                {completedJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const sr = job.serviceRequest;
  const acct = sr.account;
  const cust = acct.customer;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {cust.lastName}, {cust.firstName}
            </span>
            <span className="text-sm text-gray-500">
              {categoryLabels[sr.category] || sr.category}
            </span>
            {sr.urgency === "URGENT" && (
              <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
                Urgent
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {acct.name || acct.addressLine1}, {acct.city}, {acct.state}
          </p>
          {job.scheduledDate && (
            <p className="text-sm text-gray-500 mt-1">
              Scheduled: {new Date(job.scheduledDate).toLocaleDateString()}
              {job.scheduledWindow && ` (${job.scheduledWindow})`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {job.comments.length > 0 && (
            <span className="text-xs text-gray-400">
              {job.comments.length} note{job.comments.length !== 1 ? "s" : ""}
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[sr.status] || ""}`}
          >
            {sr.status.replace("_", " ")}
          </span>
        </div>
      </div>
    </Link>
  );
}
