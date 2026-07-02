"use client";

import { useState, useEffect } from "react";
import { Building2, Users, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Society, Profile } from "@/lib/types";

export default function AdminPage() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    registration_number: "",
    state_code: "",
    zip_code: "",
    address: "",
    contact_email: "",
    contact_phone: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [socRes, userRes] = await Promise.all([
        fetch("/api/admin/societies"),
        fetch("/api/admin/users"),
      ]);
      const socData = await socRes.json();
      const userData = await userRes.json();
      if (socRes.ok) setSocieties(socData.societies ?? []);
      if (userRes.ok) setUsers(userData.users ?? []);
    } catch {
      console.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSociety(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const response = await fetch("/api/admin/societies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        setFormError(data.error || "Failed to create society.");
        return;
      }

      setShowForm(false);
      setForm({
        name: "",
        registration_number: "",
        state_code: "",
        zip_code: "",
        address: "",
        contact_email: "",
        contact_phone: "",
      });
      loadData();
    } catch {
      setFormError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleSocietyStatus(id: string, currentStatus: boolean) {
    await fetch("/api/admin/societies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !currentStatus }),
    });
    loadData();
  }

  const activeUsers = users.filter((u) => u.is_active);
  const activeSocieties = societies.filter((s) => s.is_active);

  return (
    <>
      <Header
        title="Super Admin Dashboard"
        subtitle="Society registration and platform management"
      />
      <div className="p-6">
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card flex items-center gap-4">
            <Building2 className="h-8 w-8 text-saathi-blue-500" />
            <div>
              <p className="text-sm text-gray-500">Active Societies</p>
              <p className="text-2xl font-bold">{activeSocieties.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <Users className="h-8 w-8 text-saathi-green-500" />
            <div>
              <p className="text-sm text-gray-500">Active Users</p>
              <p className="text-2xl font-bold">{activeUsers.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <Building2 className="h-8 w-8 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Total Societies</p>
              <p className="text-2xl font-bold">{societies.length}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex justify-end">
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Register Society
          </Button>
        </div>

        {showForm && (
          <div className="card mb-6">
            <h3 className="mb-4 text-base font-semibold">Register New Society</h3>
            <form onSubmit={handleCreateSociety} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Society Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label="Registration Number" value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} required />
              <Input label="State Code (e.g. MH)" value={form.state_code} onChange={(e) => setForm({ ...form, state_code: e.target.value.toUpperCase() })} maxLength={2} required />
              <Input label="ZIP/PIN Code" value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} required />
              <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="sm:col-span-2" />
              <Input label="Contact Email" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              <Input label="Contact Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
              {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}
              <div className="flex gap-3 sm:col-span-2">
                <Button type="submit" loading={submitting}>Create Society</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card">
            <h3 className="mb-4 text-base font-semibold">Registered Societies</h3>
            {loading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : societies.length === 0 ? (
              <p className="text-sm text-gray-400">No societies registered yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {societies.map((society) => (
                  <div key={society.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{society.name}</p>
                      <p className="text-xs text-gray-500">
                        {society.registration_number} &middot; {society.state_code}-{society.zip_code}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleSocietyStatus(society.id, society.is_active)}
                      className="text-gray-400 hover:text-gray-600"
                      title={society.is_active ? "Deactivate" : "Activate"}
                    >
                      {society.is_active ? (
                        <ToggleRight className="h-6 w-6 text-saathi-green-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-gray-300" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="mb-4 text-base font-semibold">Active Users</h3>
            {loading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : activeUsers.length === 0 ? (
              <p className="text-sm text-gray-400">No active users.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {activeUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    <span className="badge-blue">{u.role.replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
