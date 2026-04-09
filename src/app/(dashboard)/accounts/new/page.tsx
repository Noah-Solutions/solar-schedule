"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function NewAccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customerId");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!customerId) {
    return (
      <div>
        <p className="text-red-600">Missing customerId parameter.</p>
        <button
          onClick={() => router.back()}
          className="mt-2 text-blue-600 hover:underline text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const res = await fetch(`/api/customers/${customerId}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: formData.get("type"),
        name: formData.get("name") || null,
        addressLine1: formData.get("addressLine1"),
        addressLine2: formData.get("addressLine2") || null,
        city: formData.get("city"),
        state: formData.get("state"),
        zip: formData.get("zip"),
        installedBy: formData.get("installedBy"),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create account");
      setSaving(false);
      return;
    }

    const account = await res.json();
    router.push(`/accounts/${account.id}`);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700"
        >
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold">New Account</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="type" className="block text-sm font-medium">
              Account type
            </label>
            <select
              id="type"
              name="type"
              required
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            >
              <option value="RESIDENTIAL">Residential</option>
              <option value="COMMERCIAL">Commercial</option>
            </select>
          </div>
          <div>
            <label htmlFor="installedBy" className="block text-sm font-medium">
              System installed by
            </label>
            <select
              id="installedBy"
              name="installedBy"
              required
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            >
              <option value="EGT">EGT</option>
              <option value="OTHER">Other provider</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Account label{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="name"
            name="name"
            placeholder='e.g., "Main house", "Warehouse"'
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="addressLine1" className="block text-sm font-medium">
            Address line 1
          </label>
          <input
            id="addressLine1"
            name="addressLine1"
            required
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="addressLine2" className="block text-sm font-medium">
            Address line 2{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="addressLine2"
            name="addressLine2"
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="city" className="block text-sm font-medium">
              City
            </label>
            <input
              id="city"
              name="city"
              required
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="state" className="block text-sm font-medium">
              State
            </label>
            <input
              id="state"
              name="state"
              required
              maxLength={2}
              placeholder="AZ"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="zip" className="block text-sm font-medium">
              ZIP
            </label>
            <input
              id="zip"
              name="zip"
              required
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Account"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
