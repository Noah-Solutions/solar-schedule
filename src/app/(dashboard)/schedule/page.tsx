"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { fetchApi } from "@/lib/fetch-api";
import "@/lib/auth-types";

interface TechScheduleDay {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface TimeOffEntry {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

interface CalendarJob {
  id: string;
  serviceRequestId: string;
  scheduledDate: string;
  scheduledWindow: string | null;
  category: string;
  urgency: string;
  status: string;
  customerName: string;
  location: string;
  address: string;
}

interface CalendarTech {
  id: string;
  email: string;
  name: string;
  schedule: TechScheduleDay[];
  timeOff: TimeOffEntry[];
  jobs: CalendarJob[];
}

interface UnscheduledRequest {
  id: string;
  category: string;
  urgency: string;
  status: string;
  contactName: string | null;
  account: {
    city: string;
    state: string;
    customer: { firstName: string; lastName: string };
    membership: { tier: string } | null;
  } | null;
}

interface CalendarData {
  weekOf: string;
  techs: CalendarTech[];
  unscheduled: UnscheduledRequest[];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const categoryLabels: Record<string, string> = {
  SOMETHING_WRONG: "Repair", MAINTENANCE: "Maint.", CLEANING: "Clean",
  INSPECTION: "Inspect", BATTERY: "Battery", WARRANTY: "Warranty", OTHER: "Other",
};

const urgencyColors: Record<string, string> = {
  URGENT: "border-l-red-500",
  NORMAL: "border-l-blue-400",
};

const statusBg: Record<string, string> = {
  SCHEDULED: "bg-indigo-50", IN_PROGRESS: "bg-orange-50", COMPLETE: "bg-green-50",
  CLOSED: "bg-gray-50", RESCHEDULE_REQUESTED: "bg-amber-50", CANCEL_REQUESTED: "bg-red-50",
};

export default function SchedulePage() {
  const { data: session } = useSession();
  const roles = session?.user?.roles || [];
  const isGM = roles.some((r) => ["GM", "ADMIN"].includes(r));

  const [data, setData] = useState<CalendarData | null>(null);
  const [weekOf, setWeekOf] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(monday.getDate() + diff);
    return monday.toISOString().split("T")[0];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { loadCalendar(); }, [weekOf]);

  async function loadCalendar() {
    setLoading(true);
    const { data: d, error: err } = await fetchApi<CalendarData>(`/api/schedule?weekOf=${weekOf}`);
    if (err) { setError(err); } else { setData(d); setError(""); }
    setLoading(false);
  }

  function navigateWeek(delta: number) {
    const d = new Date(weekOf + "T00:00:00");
    d.setDate(d.getDate() + delta * 7);
    setWeekOf(d.toISOString().split("T")[0]);
  }

  function getWeekDates(): Date[] {
    const monday = new Date(weekOf + "T00:00:00");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    });
  }

  const weekDates = getWeekDates();

  if (loading && !data) return <p className="text-gray-500">Loading schedule...</p>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => navigateWeek(-1)} className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">&larr; Prev</button>
          <span className="text-sm font-medium">
            Week of {new Date(weekOf + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <button onClick={() => navigateWeek(1)} className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Next &rarr;</button>
          <button onClick={() => {
            const now = new Date();
            const day = now.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            now.setDate(now.getDate() + diff);
            setWeekOf(now.toISOString().split("T")[0]);
          }} className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Today</button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded mb-4">{error}</p>}

      {data && (
        <>
          {/* Calendar Grid */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="w-28 p-2 text-left text-gray-500 font-medium border-b">Tech</th>
                  {weekDates.map((d, i) => {
                    const isToday = d.toDateString() === new Date().toDateString();
                    return (
                      <th key={i} className={`p-2 text-left font-medium border-b min-w-[140px] ${isToday ? "bg-blue-50 text-blue-700" : "text-gray-500"}`}>
                        {DAY_NAMES[i]} {d.getMonth() + 1}/{d.getDate()}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.techs.map((tech) => (
                  <tr key={tech.id} className="border-b">
                    <td className="p-2 font-medium text-gray-700 align-top">
                      {tech.name}
                    </td>
                    {weekDates.map((date, dayIdx) => {
                      const dateStr = date.toISOString().split("T")[0];
                      const scheduleDay = tech.schedule.find((s) => s.dayOfWeek === dayIdx);
                      const isOff = scheduleDay && !scheduleDay.isAvailable;
                      const timeOff = tech.timeOff.find((t) => t.date.split("T")[0] === dateStr);
                      const dayJobs = tech.jobs.filter((j) => j.scheduledDate.split("T")[0] === dateStr);
                      const isToday = date.toDateString() === new Date().toDateString();

                      return (
                        <td key={dayIdx} className={`p-1.5 align-top ${isToday ? "bg-blue-50/50" : ""} ${isOff ? "bg-gray-100" : ""}`}>
                          {isOff && (
                            <div className="text-xs text-gray-400 italic mb-1">Day off</div>
                          )}
                          {timeOff && (
                            <div className="text-xs text-red-400 italic mb-1">
                              {timeOff.startTime ? `${timeOff.startTime}-${timeOff.endTime}` : "All day"}: {timeOff.reason || "Time off"}
                            </div>
                          )}
                          {scheduleDay?.isAvailable && !isOff && dayJobs.length === 0 && !timeOff && (
                            <div className="text-xs text-green-500">
                              {scheduleDay.startTime}–{scheduleDay.endTime}
                            </div>
                          )}
                          <div className="space-y-1">
                            {dayJobs.map((job) => (
                              <Link
                                key={job.id}
                                href={`/requests/${job.serviceRequestId}`}
                                className={`block rounded border-l-4 ${urgencyColors[job.urgency] || "border-l-gray-300"} ${statusBg[job.status] || "bg-white"} p-1.5 text-xs hover:shadow-sm transition-shadow`}
                              >
                                <div className="font-medium truncate">{job.customerName}</div>
                                <div className="text-gray-500">
                                  {job.scheduledWindow || ""} {categoryLabels[job.category] || job.category}
                                </div>
                                <div className="text-gray-400 truncate">{job.location}</div>
                              </Link>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.techs.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No technicians found.</p>
            )}
          </div>

          {/* Unscheduled requests (GM only) */}
          {isGM && data.unscheduled.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">
                Needs Scheduling ({data.unscheduled.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {data.unscheduled.map((sr) => (
                  <Link
                    key={sr.id}
                    href={`/requests/${sr.id}`}
                    className="block rounded border border-gray-200 p-3 text-sm hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {sr.account
                          ? `${sr.account.customer.lastName}, ${sr.account.customer.firstName}`
                          : sr.contactName || "Unknown"}
                      </span>
                      {sr.urgency === "URGENT" && (
                        <span className="rounded-full bg-red-100 text-red-700 px-1.5 py-0.5 text-xs font-medium">Urgent</span>
                      )}
                      {sr.account?.membership && (
                        <span className="text-xs text-gray-400">
                          {sr.account.membership.tier.charAt(0) + sr.account.membership.tier.slice(1).toLowerCase()}
                        </span>
                      )}
                    </div>
                    <div className="text-gray-500 mt-0.5">
                      {categoryLabels[sr.category] || sr.category}
                      {sr.account && ` — ${sr.account.city}, ${sr.account.state}`}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
