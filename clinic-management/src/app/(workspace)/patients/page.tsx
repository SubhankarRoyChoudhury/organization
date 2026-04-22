"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CalendarClock,
  Plus,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Dialog } from "@/components/dialog";
import { clinicFetch, getClinicCompanyId } from "@/lib/clinic-api";

type PatientRow = {
  id: number;
  patient_id: string;
  full_name: string;
  email?: string;
  phone_number?: string;
  primary_doctor?: number | null;
  primary_doctor_name: string;
  appointments_count: number;
};

type DoctorOption = {
  id: number;
  name: string;
};

type PatientFormState = {
  full_name: string;
  email: string;
  phone_number: string;
  primary_doctor: string;
};

const emptyForm: PatientFormState = {
  full_name: "",
  email: "",
  phone_number: "",
  primary_doctor: "",
};

export default function PatientsPage() {
  const [companyId, setCompanyId] = useState("");
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<PatientRow | null>(null);
  const [form, setForm] = useState<PatientFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [patients, doctors] = await Promise.all([
        clinicFetch<PatientRow[]>("patients/"),
        clinicFetch<DoctorOption[]>("doctors/"),
      ]);
      setRows(Array.isArray(patients) ? patients : []);
      setDoctorOptions(Array.isArray(doctors) ? doctors : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients.");
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

  const openEditDialog = (row: PatientRow) => {
    setEditingRow(row);
    setForm({
      full_name: row.full_name || "",
      email: row.email || "",
      phone_number: row.phone_number || "",
      primary_doctor: row.primary_doctor ? String(row.primary_doctor) : "",
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
        full_name: form.full_name,
        email: form.email || null,
        phone_number: form.phone_number || null,
        primary_doctor: form.primary_doctor ? Number(form.primary_doctor) : null,
      };
      if (editingRow) {
        await clinicFetch(`patients/${editingRow.id}/`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await clinicFetch("patients/", {
          method: "POST",
          body: payload,
        });
      }
      closeDialog();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save patient.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row: PatientRow) => {
    const confirmed = window.confirm(`Delete patient ${row.full_name}?`);
    if (!confirmed) {
      return;
    }
    try {
      await clinicFetch(`patients/${row.id}/`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete patient.");
    }
  };

  const patientCount = rows.length;
  const assignedCount = rows.filter((row) => row.primary_doctor_name).length;
  const totalAppointments = rows.reduce(
    (sum, row) => sum + (row.appointments_count || 0),
    0,
  );
  const followUpPool = rows.filter((row) => (row.appointments_count || 0) > 0).length;
  const featuredPatients = rows.slice(0, 4);

  const panelClassName =
    "rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,248,250,0.96)_100%)] shadow-[0_24px_64px_rgba(9,18,34,0.08)]";
  const inputClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";

  return (
    <AppShell title="Patients" eyebrow="Clinical Records">
      <div className="grid gap-5">
        <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(125deg,#0f172a_0%,#123848_48%,#edf7f5_48.2%,#fbfdff_100%)] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.12)] sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.24),transparent_48%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.16),transparent_40%)]"
          />
          <div className="relative grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-teal-200">
                <UsersRound className="h-3.5 w-3.5" />
                Patient Operations
              </div>
              <h2 className="mt-5 max-w-xl text-[38px] font-semibold leading-[1.02] tracking-[-0.05em] text-white">
                A cleaner patient registry with actual operational context.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                Review live patient volume, assignment coverage, and follow-up load
                from one place. No schema filler, just the records that matter.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Patients
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
                    {patientCount}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Assigned
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-teal-300">
                    {assignedCount}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Follow-ups
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-sky-300">
                    {followUpPool}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 self-end">
              <article className="rounded-[28px] border border-teal-100/80 bg-white/92 p-5 shadow-[0_20px_60px_rgba(10,37,64,0.1)] backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-teal-700/70">
                      Registry Pulse
                    </p>
                    <p className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-slate-950">
                      {totalAppointments}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Total appointments linked across the current patient pool.
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
                        Avg Load
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                        {patientCount ? (totalAppointments / patientCount).toFixed(1) : "0.0"}
                      </p>
                    </div>
                  </div>
                </article>
                <article className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                        Doctors Linked
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                        {new Set(rows.map((row) => row.primary_doctor_name).filter(Boolean)).size}
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
          <section className={`${panelClassName} overflow-hidden`}>
            <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(243,248,250,0.92)_100%)] px-6 py-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-400">
                    Patient Registry
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    Active patient list
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Company-scoped patient records with doctor assignment and appointment volume.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateDialog}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4" />
                  Add patient
                </button>
              </div>
            </div>

            <div className="overflow-x-auto px-4 pb-4 pt-3 sm:px-6">
              <table className="min-w-full border-separate border-spacing-y-3 text-left">
                <thead>
                  <tr className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                    <th className="px-3 pb-1">Patient</th>
                    <th className="px-3 pb-1">Identifier</th>
                    <th className="px-3 pb-1">Primary Doctor</th>
                    <th className="px-3 pb-1">Appointments</th>
                    <th className="px-3 pb-1 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        className="rounded-[22px] border border-dashed border-slate-200 bg-white px-4 py-10 text-sm text-slate-500"
                        colSpan={5}
                      >
                        Loading patients...
                      </td>
                    </tr>
                  ) : error || !companyId ? (
                    <tr>
                      <td
                        className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-10 text-sm text-rose-700"
                        colSpan={5}
                      >
                        {error || "Missing company context."}
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        className="rounded-[22px] border border-dashed border-slate-200 bg-white px-4 py-10 text-sm text-slate-500"
                        colSpan={5}
                      >
                        No patients found for this company.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="text-sm text-slate-700">
                        <td className="rounded-l-[22px] border-y border-l border-slate-200 bg-white px-3 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ecfeff_0%,#dbeafe_100%)] text-sm font-semibold text-slate-900">
                              {row.full_name
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-950">
                                {row.full_name}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {row.email || row.phone_number || "No contact provided"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="border-y border-slate-200 bg-white px-3 py-4 font-medium text-slate-600">
                          {row.patient_id || "-"}
                        </td>
                        <td className="border-y border-slate-200 bg-white px-3 py-4">
                          {row.primary_doctor_name || "Unassigned"}
                        </td>
                        <td className="border-y border-slate-200 bg-white px-3 py-4">
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                            {row.appointments_count || 0} linked
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

          <section className="grid gap-5">
            <article className={`${panelClassName} p-6`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-400">
                    Care Coverage
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    Patients needing attention
                  </h2>
                </div>
                <div className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-medium uppercase tracking-[0.24em] text-white">
                  {featuredPatients.length} Shown
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {loading ? (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-white/80 p-5 text-sm text-slate-500">
                    Loading patient coverage...
                  </div>
                ) : error ? (
                  <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
                    {error}
                  </div>
                ) : featuredPatients.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-white/80 p-5 text-sm text-slate-500">
                    No patient records available.
                  </div>
                ) : (
                  featuredPatients.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{row.full_name}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {row.primary_doctor_name || "Awaiting doctor assignment"}
                          </p>
                        </div>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                          {row.patient_id || "-"}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                            Appointments
                          </p>
                          <p className="mt-2 text-lg font-semibold text-slate-950">
                            {row.appointments_count || 0}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                            Contact
                          </p>
                          <p className="mt-2 truncate text-sm font-medium text-slate-700">
                            {row.phone_number || row.email || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        title={editingRow ? "Edit patient" : "Add patient"}
        description="Create and maintain company-scoped patient records."
        onClose={closeDialog}
      >
        <form className="grid gap-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 rounded-[26px] border border-slate-200 bg-white/80 p-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
              Full name
              <input
                required
                value={form.full_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, full_name: event.target.value }))
                }
                className={inputClassName}
                placeholder="Patient name"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                className={inputClassName}
                placeholder="patient@example.com"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Phone number
              <input
                value={form.phone_number}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone_number: event.target.value,
                  }))
                }
                className={inputClassName}
                placeholder="98XXXXXXXX"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
              Primary doctor
              <select
                value={form.primary_doctor}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    primary_doctor: event.target.value,
                  }))
                }
                className={inputClassName}
              >
                <option value="">Select doctor</option>
                {doctorOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-3 rounded-[24px] border border-teal-100 bg-[linear-gradient(135deg,rgba(240,253,250,0.95)_0%,rgba(248,250,252,0.96)_100%)] p-5">
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
                  ? "Update patient"
                  : "Create patient"}
            </button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
