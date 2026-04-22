"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CalendarClock,
  Plus,
  ShieldPlus,
  Stethoscope,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Dialog } from "@/components/dialog";
import { clinicFetch, getClinicCompanyId } from "@/lib/clinic-api";
import { relationshipCards } from "@/lib/clinic-data";

type DoctorRow = {
  id: number;
  doctor_id: string;
  name: string;
  email?: string;
  mobile?: string;
  medical_council_registration?: string;
  specialty: string;
  appointments_count: number;
  load: string;
  status: string;
};

type DoctorFormState = {
  name: string;
  email: string;
  mobile: string;
  medical_council_registration: string;
  specialty: string;
  status: string;
};

const emptyForm: DoctorFormState = {
  name: "",
  email: "",
  mobile: "",
  medical_council_registration: "",
  specialty: "",
  status: "Available",
};

export default function DoctorsPage() {
  const [companyId, setCompanyId] = useState("");
  const [rows, setRows] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<DoctorRow | null>(null);
  const [form, setForm] = useState<DoctorFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await clinicFetch<DoctorRow[]>("doctors/");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load doctors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const resolvedCompanyId = getClinicCompanyId();
    setCompanyId(resolvedCompanyId);
    if (!resolvedCompanyId) {
      setLoading(false);
      setError("Missing company context.");
    }
  }, []);

  useEffect(() => {
    if (!companyId) {
      return;
    }
    loadData();
  }, [companyId]);

  const openCreateDialog = () => {
    setEditingRow(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (row: DoctorRow) => {
    setEditingRow(row);
    setForm({
      name: row.name || "",
      email: row.email || "",
      mobile: row.mobile || "",
      medical_council_registration: row.medical_council_registration || "",
      specialty: row.specialty || "",
      status: row.status || "Available",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (submitting) {
      return;
    }
    setDialogOpen(false);
    setEditingRow(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        email: form.email || null,
        mobile: form.mobile || "",
        medical_council_registration: form.medical_council_registration || "",
        specialty: form.specialty,
        status: form.status,
      };
      if (editingRow) {
        await clinicFetch(`doctors/${editingRow.id}/`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await clinicFetch("doctors/", {
          method: "POST",
          body: payload,
        });
      }
      closeDialog();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save doctor.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row: DoctorRow) => {
    const confirmed = window.confirm(`Delete doctor ${row.name}?`);
    if (!confirmed) {
      return;
    }
    try {
      await clinicFetch(`doctors/${row.id}/`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete doctor.");
    }
  };

  const doctorCount = rows.length;
  const activeCount = rows.filter((row) => row.status === "Available").length;
  const approvedCount = rows.filter((row) => row.status === "Approved").length;
  const totalAppointments = rows.reduce(
    (sum, row) => sum + (row.appointments_count || 0),
    0,
  );

  const panelClassName =
    "rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,248,250,0.96)_100%)] shadow-[0_28px_70px_rgba(9,18,34,0.08)]";
  const inputClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";
  const statusTone = (status: string) => {
    if (status === "Available") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (status === "Approved") {
      return "border-sky-200 bg-sky-50 text-sky-700";
    }
    return "border-amber-200 bg-amber-50 text-amber-700";
  };

  return (
    <AppShell title="Doctors" eyebrow="Provider Records">
      <div className="grid gap-5">
        <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(125deg,#0f172a_0%,#123848_46%,#e9f5f1_46.2%,#f8fbfc_100%)] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.12)] sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.24),transparent_48%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.18),transparent_38%)]"
          />
          <div className="relative grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-teal-200">
                <Stethoscope className="h-3.5 w-3.5" />
                Provider Operations
              </div>
              <h2 className="mt-5 max-w-xl text-[38px] font-semibold leading-[1.02] tracking-[-0.05em] text-white">
                Doctor onboarding should feel clinical, precise, and operational.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                The registry now reads like a real care-team control panel instead
                of a default dashboard card stack. You can review capacity,
                approval state, and credentials from one surface.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Doctors
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
                    {doctorCount}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Available
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-teal-300">
                    {activeCount}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Approved
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-sky-300">
                    {approvedCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 self-end">
              <article className="rounded-[28px] border border-teal-100/80 bg-white/92 p-5 shadow-[0_20px_60px_rgba(10,37,64,0.1)] backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-teal-700/70">
                      Core Relation
                    </p>
                    <p className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-slate-950">
                      {relationshipCards[3]?.ratio}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {relationshipCards[3]?.description}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
                    <Activity className="h-5 w-5" />
                  </div>
                </div>
              </article>
              <div className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                        Active Load
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                        {totalAppointments}
                      </p>
                    </div>
                  </div>
                </article>
                <article className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                      <ShieldPlus className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                        Login Ready
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                        {approvedCount}
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[0.84fr_1.16fr]">
          <section className="grid gap-5">
            <article className={`${panelClassName} p-6`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-400">
                    Specialty Coverage
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    Who is on the floor
                  </h2>
                </div>
                <div className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-medium uppercase tracking-[0.24em] text-white">
                  {doctorCount} Listed
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {loading ? (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-white/80 p-5 text-sm text-slate-500">
                    Loading doctors...
                  </div>
                ) : error ? (
                  <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
                    {error}
                  </div>
                ) : rows.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-white/80 p-5 text-sm text-slate-500">
                    No doctors found for this company.
                  </div>
                ) : (
                  rows.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f766e_0%,#0f172a_100%)] text-sm font-semibold text-white">
                              {row.name
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-slate-950">
                                {row.name}
                              </p>
                              <p className="truncate text-sm text-slate-500">
                                {row.specialty || "General Practice"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-600">
                              {row.doctor_id}
                            </span>
                            <span
                              className={`rounded-full border px-3 py-1 font-medium ${statusTone(
                                row.status,
                              )}`}
                            >
                              {row.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                            Load
                          </p>
                          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                            {row.appointments_count}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>

          <section className={`${panelClassName} overflow-hidden`}>
            <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(243,248,250,0.92)_100%)] px-6 py-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-400">
                    Doctor Registry
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    Credentialed care team
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Doctors are stored as company users, with login access,
                    approval state, and council registration tied to each record.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateDialog}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4" />
                  Add doctor
                </button>
              </div>
            </div>

            <div className="overflow-x-auto px-4 pb-4 pt-3 sm:px-6">
              <table className="min-w-full border-separate border-spacing-y-3 text-left">
                <thead>
                  <tr className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                    <th className="px-3 pb-1">Doctor</th>
                    <th className="px-3 pb-1">Identifier</th>
                    <th className="px-3 pb-1">Specialty</th>
                    <th className="px-3 pb-1">Appointments</th>
                    <th className="px-3 pb-1">Status</th>
                    <th className="px-3 pb-1 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        className="rounded-[22px] border border-dashed border-slate-200 bg-white px-4 py-10 text-sm text-slate-500"
                        colSpan={6}
                      >
                        Loading doctors...
                      </td>
                    </tr>
                  ) : error || !companyId ? (
                    <tr>
                      <td
                        className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-10 text-sm text-rose-700"
                        colSpan={6}
                      >
                        {error || "Missing company context."}
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        className="rounded-[22px] border border-dashed border-slate-200 bg-white px-4 py-10 text-sm text-slate-500"
                        colSpan={6}
                      >
                        No doctors found for this company.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="text-sm text-slate-700">
                        <td className="rounded-l-[22px] border-y border-l border-slate-200 bg-white px-3 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ecfeff_0%,#dbeafe_100%)] text-sm font-semibold text-slate-900">
                              {row.name
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-950">
                                {row.name}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {row.email || row.mobile || "No contact"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="border-y border-slate-200 bg-white px-3 py-4 font-medium text-slate-600">
                          {row.doctor_id}
                        </td>
                        <td className="border-y border-slate-200 bg-white px-3 py-4">
                          {row.specialty || "General Practice"}
                        </td>
                        <td className="border-y border-slate-200 bg-white px-3 py-4">
                          {row.appointments_count}
                        </td>
                        <td className="border-y border-slate-200 bg-white px-3 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusTone(
                              row.status,
                            )}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="rounded-r-[22px] border-y border-r border-slate-200 bg-white px-3 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditDialog(row)}
                              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              className="rounded-full border border-rose-200 px-4 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        title={editingRow ? "Edit doctor" : "Add doctor"}
        description="Create a credentialed provider record with login access, registration data, and operational status."
        onClose={closeDialog}
      >
        <form className="grid gap-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 rounded-[26px] border border-slate-200 bg-white/80 p-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
              Full name
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className={inputClassName}
                placeholder="Dr. Aditi Rao"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                required={!editingRow}
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                className={inputClassName}
                placeholder="doctor@clinic.com"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Mobile
              <input
                required
                value={form.mobile}
                onChange={(event) =>
                  setForm((current) => ({ ...current, mobile: event.target.value }))
                }
                className={inputClassName}
                placeholder="98XXXXXXXX"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Medical registration
              <input
                required={!editingRow}
                value={form.medical_council_registration}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    medical_council_registration: event.target.value,
                  }))
                }
                className={inputClassName}
                placeholder="Council registration ID"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Specialty
              <input
                value={form.specialty}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    specialty: event.target.value,
                  }))
                }
                className={inputClassName}
                placeholder="Cardiology"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value }))
                }
                className={inputClassName}
              >
                <option value="Available">Available</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
              </select>
            </label>
          </div>
          <div className="flex rounded-[24px] border border-teal-100 bg-[linear-gradient(135deg,rgba(240,253,250,0.95)_0%,rgba(248,250,252,0.96)_100%)] p-5 justify-end">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Saving..."
                  : editingRow
                    ? "Update doctor"
                    : "Create doctor"}
              </button>
            </div>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
