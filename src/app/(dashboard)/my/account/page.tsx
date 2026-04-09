"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/fetch-api";
import BenefitUsage from "../../benefit-usage";

interface Membership {
  tier: string;
  status: string;
  startDate: string;
  renewalDate: string | null;
}

interface Account {
  id: string;
  type: string;
  name: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
  installedBy: string;
  membership: Membership | null;
}

interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  primaryPhone: string;
  additionalPhones: string[];
  accounts: Account[];
}

export default function MyAccountPage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApi<CustomerProfile>("/api/my/profile").then(({ data, error: err }) => {
      if (err) setError(err);
      else setProfile(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!profile) return <p className="text-gray-500">No profile found.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Account</h1>

      {/* Profile info */}
      <div className="rounded border border-gray-200 p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Contact Information</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-gray-500">Name</dt>
            <dd className="font-medium">{profile.firstName} {profile.lastName}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd>{profile.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Phone</dt>
            <dd>{profile.primaryPhone}</dd>
          </div>
          {profile.additionalPhones.length > 0 && (
            <div>
              <dt className="text-gray-500">Additional phones</dt>
              <dd>{profile.additionalPhones.join(", ")}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Accounts / Properties */}
      <h2 className="text-lg font-semibold mb-3">My Properties ({profile.accounts.length})</h2>

      {profile.accounts.length === 0 ? (
        <div className="rounded border border-gray-200 p-6 text-center text-gray-500">
          <p>No service locations on file.</p>
          <p className="text-sm mt-1">Contact EGT to set up your first property.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {profile.accounts.map((account) => (
            <div key={account.id} className="rounded border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">
                    {account.name || account.addressLine1}
                    <span className="ml-2 text-xs text-gray-500">
                      {account.type === "RESIDENTIAL" ? "Residential" : "Commercial"}
                    </span>
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {account.addressLine1}
                    {account.addressLine2 ? `, ${account.addressLine2}` : ""}
                    <br />
                    {account.city}, {account.state} {account.zip}
                  </p>
                </div>
                {account.membership?.status === "ACTIVE" && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    account.membership.tier === "PLATINUM" ? "bg-purple-100 text-purple-700"
                      : account.membership.tier === "ELITE" ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                  }`}>
                    {account.membership.tier.charAt(0) + account.membership.tier.slice(1).toLowerCase()}
                  </span>
                )}
              </div>

              {account.membership?.status === "ACTIVE" && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-sm text-gray-600 mb-2">
                    Membership since {new Date(account.membership.startDate).toLocaleDateString()}
                    {account.membership.renewalDate && (
                      <span> &middot; Renews {new Date(account.membership.renewalDate).toLocaleDateString()}</span>
                    )}
                  </div>
                  <BenefitUsage accountId={account.id} />
                </div>
              )}

              {!account.membership && (
                <p className="text-sm text-gray-400 mt-2">No membership — contact EGT for plan options.</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link href="/request" className="rounded bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700">
          Request Service
        </Link>
      </div>
    </div>
  );
}
