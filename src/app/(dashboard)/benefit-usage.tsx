"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/fetch-api";

interface BenefitItem {
  category: string;
  label: string;
  used: number;
  allowed: number;
  remaining: number;
}

interface BenefitData {
  tier: string;
  benefits: BenefitItem[];
}

export default function BenefitUsage({ accountId }: { accountId: string }) {
  const [data, setData] = useState<BenefitData | null>(null);

  useEffect(() => {
    fetchApi<BenefitData>(`/api/accounts/${accountId}/benefits`).then(({ data: d }) => {
      if (d) setData(d);
    });
  }, [accountId]);

  if (!data || data.benefits.length === 0) return null;

  const tierLabel = data.tier.charAt(0) + data.tier.slice(1).toLowerCase();

  return (
    <div className="rounded border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
        {tierLabel} Benefits
      </h2>
      <div className="space-y-2 text-sm">
        {data.benefits.map((b) => (
          <BenefitRow key={b.category} {...b} />
        ))}
      </div>
    </div>
  );
}

function BenefitRow({ label, used, allowed, remaining }: BenefitItem) {
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
