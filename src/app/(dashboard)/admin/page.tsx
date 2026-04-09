"use client";

import { useEffect, useState } from "react";

type Tab = "plans" | "catalog" | "templates" | "users";

interface InternalUser {
  id: string;
  email: string;
  createdAt: string;
  roles: { role: string }[];
}

interface ServicePlan {
  id: string;
  tier: string;
  name: string;
  description: string;
  benefits: string[];
  responseWindow: string;
  isActive: boolean;
}

interface CatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
}

interface Template {
  id: string;
  triggerEvent: string;
  name: string;
  subject: string;
  body: string;
  isActive: boolean;
}

const CATEGORIES = [
  "SOMETHING_WRONG",
  "MAINTENANCE",
  "CLEANING",
  "INSPECTION",
  "BATTERY",
  "WARRANTY",
  "OTHER",
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("plans");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin</h1>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {(["plans", "catalog", "templates", "users"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "plans"
              ? "Service Plans"
              : t === "catalog"
                ? "Service Catalog"
                : t === "templates"
                  ? "Templates"
                  : "Users"}
          </button>
        ))}
      </div>

      {tab === "plans" && <PlansTab />}
      {tab === "catalog" && <CatalogTab />}
      {tab === "templates" && <TemplatesTab />}
      {tab === "users" && <UsersTab />}
    </div>
  );
}

// ─── Service Plans Tab ──────────────────────────────────────

function PlansTab() {
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ description: "", responseWindow: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/service-plans")
      .then((r) => r.json())
      .then(setPlans);
  }, []);

  async function handleSave(id: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/service-plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await res.json();
      setPlans(plans.map((p) => (p.id === id ? updated : p)));
      setEditing(null);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <div key={plan.id} className="rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{plan.name}</h3>
              <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">
                {plan.tier}
              </span>
              {!plan.isActive && (
                <span className="text-xs text-red-500">Archived</span>
              )}
            </div>
            {editing !== plan.id && (
              <button
                onClick={() => {
                  setEditing(plan.id);
                  setForm({
                    description: plan.description,
                    responseWindow: plan.responseWindow,
                  });
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Edit
              </button>
            )}
          </div>

          {editing === plan.id ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Response window
                </label>
                <input
                  value={form.responseWindow}
                  onChange={(e) =>
                    setForm({ ...form, responseWindow: e.target.value })
                  }
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave(plan.id)}
                  disabled={saving}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">{plan.description}</p>
              <p className="text-sm text-gray-500 mt-1">
                Response: {plan.responseWindow}
              </p>
              {Array.isArray(plan.benefits) && (
                <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                  {plan.benefits.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Service Catalog Tab ────────────────────────────────────

function CatalogTab() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({
    name: "",
    description: "",
    category: "OTHER",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/catalog")
      .then((r) => r.json())
      .then(setItems);
  }, []);

  async function handleCreate() {
    setSaving(true);
    const res = await fetch("/api/admin/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newForm),
    });
    if (res.ok) {
      const item = await res.json();
      setItems([...items, item]);
      setNewForm({ name: "", description: "", category: "OTHER" });
      setShowNew(false);
    }
    setSaving(false);
  }

  async function toggleActive(item: CatalogItem) {
    const res = await fetch(`/api/admin/catalog/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems(items.map((i) => (i.id === item.id ? updated : i)));
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowNew(!showNew)}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-blue-700"
        >
          Add Item
        </button>
      </div>

      {showNew && (
        <div className="rounded border border-blue-200 bg-blue-50 p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                value={newForm.name}
                onChange={(e) =>
                  setNewForm({ ...newForm, name: e.target.value })
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Category</label>
              <select
                value={newForm.category}
                onChange={(e) =>
                  setNewForm({ ...newForm, category: e.target.value })
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Description</label>
            <input
              value={newForm.description}
              onChange={(e) =>
                setNewForm({ ...newForm, description: e.target.value })
              }
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !newForm.name || !newForm.description}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => setShowNew(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Category</th>
            <th className="pb-2 font-medium">Description</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-3 font-medium">{item.name}</td>
              <td className="py-3">{item.category.replace("_", " ")}</td>
              <td className="py-3 text-gray-600">{item.description}</td>
              <td className="py-3">
                <button
                  onClick={() => toggleActive(item)}
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {item.isActive ? "Active" : "Archived"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Communication Templates Tab ────────────────────────────

function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", body: "" });
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({
    triggerEvent: "",
    name: "",
    subject: "",
    body: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/templates")
      .then((r) => r.json())
      .then(setTemplates);
  }, []);

  async function handleSave(id: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await res.json();
      setTemplates(templates.map((t) => (t.id === id ? updated : t)));
      setEditing(null);
    }
    setSaving(false);
  }

  async function handleCreate() {
    setSaving(true);
    const res = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newForm),
    });
    if (res.ok) {
      const t = await res.json();
      setTemplates([...templates, t]);
      setNewForm({ triggerEvent: "", name: "", subject: "", body: "" });
      setShowNew(false);
    }
    setSaving(false);
  }

  async function toggleActive(template: Template) {
    const res = await fetch(`/api/admin/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !template.isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTemplates(templates.map((t) => (t.id === template.id ? updated : t)));
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowNew(!showNew)}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-blue-700"
        >
          Add Template
        </button>
      </div>

      {showNew && (
        <div className="rounded border border-blue-200 bg-blue-50 p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Trigger event</label>
              <input
                value={newForm.triggerEvent}
                onChange={(e) =>
                  setNewForm({ ...newForm, triggerEvent: e.target.value })
                }
                placeholder="e.g., request_submitted"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                value={newForm.name}
                onChange={(e) =>
                  setNewForm({ ...newForm, name: e.target.value })
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Subject</label>
            <input
              value={newForm.subject}
              onChange={(e) =>
                setNewForm({ ...newForm, subject: e.target.value })
              }
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Body</label>
            <textarea
              value={newForm.body}
              onChange={(e) =>
                setNewForm({ ...newForm, body: e.target.value })
              }
              rows={4}
              placeholder="Use {{customerName}}, {{category}}, etc. for variables"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={
                saving ||
                !newForm.triggerEvent ||
                !newForm.name ||
                !newForm.subject ||
                !newForm.body
              }
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => setShowNew(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {templates.map((t) => (
          <div key={t.id} className="rounded border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{t.name}</h3>
                <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5 text-gray-600">
                  {t.triggerEvent}
                </code>
                <button
                  onClick={() => toggleActive(t)}
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {t.isActive ? "Active" : "Disabled"}
                </button>
              </div>
              {editing !== t.id && (
                <button
                  onClick={() => {
                    setEditing(t.id);
                    setForm({ subject: t.subject, body: t.body });
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>

            {editing === t.id ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Subject
                  </label>
                  <input
                    value={form.subject}
                    onChange={(e) =>
                      setForm({ ...form, subject: e.target.value })
                    }
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Body
                  </label>
                  <textarea
                    value={form.body}
                    onChange={(e) =>
                      setForm({ ...form, body: e.target.value })
                    }
                    rows={4}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(t.id)}
                    disabled={saving}
                    className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-700">
                  <span className="text-gray-500">Subject:</span> {t.subject}
                </p>
                <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">
                  {t.body}
                </p>
              </>
            )}
          </div>
        ))}
        {templates.length === 0 && (
          <p className="text-sm text-gray-500">
            No templates yet. Add one to get started.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Users Tab ──────────────────────────────────────────────

const INTERNAL_ROLES = ["GM", "TECHNICIAN", "BOOKKEEPER", "ADMIN"];

function UsersTab() {
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({
    email: "",
    password: "",
    roles: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then(setUsers);
  }, []);

  function toggleNewRole(role: string) {
    setNewForm((f) => ({
      ...f,
      roles: f.roles.includes(role)
        ? f.roles.filter((r) => r !== role)
        : [...f.roles, role],
    }));
  }

  async function handleCreate() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newForm),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create user");
      setSaving(false);
      return;
    }
    const user = await res.json();
    setUsers([...users, user]);
    setNewForm({ email: "", password: "", roles: [] });
    setShowNew(false);
    setSaving(false);
  }

  async function toggleRole(userId: string, role: string, currentRoles: string[]) {
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];

    if (newRoles.length === 0) return; // must have at least one role

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roles: newRoles }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers(users.map((u) => (u.id === userId ? updated : u)));
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowNew(!showNew)}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-blue-700"
        >
          Add User
        </button>
      </div>

      {showNew && (
        <div className="rounded border border-blue-200 bg-blue-50 p-4 mb-4 space-y-3">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                type="email"
                value={newForm.email}
                onChange={(e) =>
                  setNewForm({ ...newForm, email: e.target.value })
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Password</label>
              <input
                type="text"
                value={newForm.password}
                onChange={(e) =>
                  setNewForm({ ...newForm, password: e.target.value })
                }
                placeholder="Temporary password"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Roles</label>
            <div className="flex gap-2">
              {INTERNAL_ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => toggleNewRole(role)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border ${
                    newForm.roles.includes(role)
                      ? "border-blue-500 bg-blue-100 text-blue-700"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !newForm.email || !newForm.password || newForm.roles.length === 0}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => { setShowNew(false); setError(""); }}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2 font-medium">Email</th>
            <th className="pb-2 font-medium">Roles</th>
            <th className="pb-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const userRoles = user.roles.map((r) => r.role);
            return (
              <tr key={user.id} className="border-b">
                <td className="py-3 font-medium">{user.email}</td>
                <td className="py-3">
                  <div className="flex gap-1">
                    {INTERNAL_ROLES.map((role) => (
                      <button
                        key={role}
                        onClick={() => toggleRole(user.id, role, userRoles)}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium border ${
                          userRoles.includes(role)
                            ? "border-blue-500 bg-blue-100 text-blue-700"
                            : "border-gray-200 text-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="py-3 text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
