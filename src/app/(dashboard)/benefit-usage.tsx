"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/fetch-api";

interface BenefitData {
  tier: string;
  cleanings: { used: number; allowed: number; remaining: number };
  inspections: { used: number; allowed: number; remaining: number };
}

export default function BenefitUsage({ accountId }: { accountId: string }) {
  const [data, setData] = useState<BenefitData | null>(null);

  useEffect(() => {
    fetchApi<BenefitData>(`/api/accounts/${accountId}/benefits`).then(({ data: d }) => {
      if (d) setData(d);
    });
  }, [accountId]);

  if (!data) return null;

  const tierLabel = data.tier.charAt(0) + data.tier.slice(1).toLowerCase();
  const hasBenefits = data.cleanings.allowed > 0 || data.inspections.allowed > 0;

  if (!hasBenefits) return null;

  return (
    <div className="rounded border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
        {tierLabel} Benefits
      </h2>
      <div className="space-y-2 text-sm">
        {data.cleanings.allowed > 0 && (
          <BenefitRow
            label="Panel Cleanings"
            used={data.cleanings.used}
            allowed={data.cleanings.allowed}
            remaining={data.cleanings.remaining}
          />
        )}
        {data.inspections.allowed > 0 && (
          <BenefitRow
            label="Inspections"
            used={data.inspections.used}
            allowed={data.inspections.allowed}
            remaining={data.inspections.remaining}
          />
        )}
      </div>
    </div>
  );
}

function BenefitRow({
  label,
  used,
  allowed,
  remaining,
}: {
  label: string;
  used: number;
  allowed: number;
  remaining: number;
}) {
  const pct = allowed > 0 ? (used / allowed) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-gray-700">
        <span>{label}</span>
        <span>
          {remaining > 0 ? (
            <span className="text-green-700">{remaining} remaining</span>
          ) : (
            <span className="text-gray-400">All used</span>
          )}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded h-1.5 mt-1">
        <div
          className={`h-1.5 rounded ${pct >= 100 ? "bg-gray-400" : "bg-green-500"}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-0.5">{used} of {allowed} used this year</p>
    </div>
  );
}
