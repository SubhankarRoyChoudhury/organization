"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CalendarClock,
  Plus,
  ReceiptText,
  Stethoscope,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Dialog } from "@/components/dialog";
import {
  clinicFetch,
  formatDateTime,
  getClinicCompanyId,
  toDateTimeInputValue,
} from "@/lib/clinic-api";

type AppointmentRow = {
  id: number;
  appointment_id: string;
  patient: number;
  patient_name: string;
  doctor: number | null;
  doctor_name: string;
  scheduled_for: string;
  reason: string;
  status: string;
  prescription_id: string;
  billing_id: string;
};

type Option = {
  id: number;
  name?: string;
  full_name?: string;
};

type AppointmentFormState = {
  patient: string;
  doctor: string;
  scheduled_for: string;
  reason: string;
  status: string;
};

const emptyForm: AppointmentFormState = {
  patient: "",
  doctor: "",
  scheduled_for: "",
  reason: "",
  status: "SCHEDULED",
};

export default function AppointmentsPage() {
  const [companyId, setCompanyId] = useState("");
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [patientOptions, setPatientOptions] = useState<Option[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<AppointmentRow | null>(null);
  const [form, setForm] = useState<AppointmentFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [appointments, patients, doctors] = await Promise.all([
        clinicFetch<AppointmentRow[]>("appointments/"),
        clinicFetch<Option[]>("patients/"),
        clinicFetch<Option[]>("doctors/"),
      ]);
      setRows(Array.isArray(appointments) ? appointments : []);
      setPatientOptions(Array.isArray(patients) ? patients : []);
      setDoctorOptions(Array.isArray(doctors) ? doctors : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load appointments.",
      );
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

  const openEditDialog = (row: AppointmentRow) => {
    setEditingRow(row);
    setForm({
      patient: row.patient ? String(row.patient) : "",
      doctor: row.doctor ? String(row.doctor) : "",
      scheduled_for: toDateTimeInputValue(row.scheduled_for),
      reason: row.reason || "",
      status: row.status || "SCHEDULED",
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
        patient: Number(form.patient),
        doctor: form.doctor ? Number(form.doctor) : null,
        scheduled_for: form.scheduled_for,
        reason: form.reason,
        status: form.status,
      };
      if (editingRow) {
        await clinicFetch(`appointments/${editingRow.id}/`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await clinicFetch("appointments/", {
          method: "POST",
          body: payload,
        });
      }
      closeDialog();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save appointment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row: AppointmentRow) => {
    const confirmed = window.confirm(`Delete appointment ${row.appointment_id}?`);
    if (!confirmed) {
      return;
    }
    try {
      await clinicFetch(`appointments/${row.id}/`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete appointment.",
      );
    }
  };

  const appointmentCount = rows.length;
  const scheduledCount = rows.filter((row) => row.status === "SCHEDULED").length;
  const completedCount = rows.filter((row) => row.status === "COMPLETED").length;
  const outputReadyCount = rows.filter(
    (row) => row.prescription_id || row.billing_id,
  ).length;
  const featuredAppointments = rows.slice(0, 4);

  const panelClassName =
    "rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,248,250,0.96)_100%)] shadow-[0_24px_64px_rgba(9,18,34,0.08)]";
  const inputClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";
  const statusTone = (status: string) => {
    if (status === "COMPLETED") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (status === "CHECKED_IN" || status === "SCHEDULED") {
      return "border-sky-200 bg-sky-50 text-sky-700";
    }
    return "border-amber-200 bg-amber-50 text-amber-700";
  };

  return (
    <AppShell title="Appointments" eyebrow="Activity Layer">
      <div className="grid gap-5">
        <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(125deg,#0f172a_0%,#123848_48%,#edf7f5_48.2%,#fbfdff_100%)] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.12)] sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.24),transparent_48%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.16),transparent_40%)]"
          />
          <div className="relative grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-teal-200">
                <CalendarClock className="h-3.5 w-3.5" />
                Scheduling Operations
              </div>
              <h2 className="mt-5 max-w-xl text-[38px] font-semibold leading-[1.02] tracking-[-0.05em] text-white">
                Run the appointment desk without schema cards getting in the way.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                Manage the live appointment queue, track completion state, and see
                which bookings already have downstream records attached.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Appointments
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
                    {appointmentCount}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Scheduled
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-teal-300">
                    {scheduledCount}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Completed
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-sky-300">
                    {completedCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 self-end">
              <article className="rounded-[28px] border border-teal-100/80 bg-white/92 p-5 shadow-[0_20px_60px_rgba(10,37,64,0.1)] backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-teal-700/70">
                      Output Readiness
                    </p>
                    <p className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-slate-950">
                      {outputReadyCount}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Appointments already linked to billing or prescription records.
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
                      <ReceiptText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                        Billing Linked
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                        {rows.filter((row) => row.billing_id).length}
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
                        Prescription Linked
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                        {rows.filter((row) => row.prescription_id).length}
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
                    Appointment Ledger
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    Live booking queue
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Company-scoped appointments with patient, doctor, billing, and prescription links.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateDialog}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4" />
                  New appointment
                </button>
              </div>
            </div>

            <div className="overflow-x-auto px-4 pb-4 pt-3 sm:px-6">
              <table className="min-w-full border-separate border-spacing-y-3 text-left">
                <thead>
                  <tr className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                    <th className="px-3 pb-1">Appointment</th>
                    <th className="px-3 pb-1">Patient</th>
                    <th className="px-3 pb-1">Doctor</th>
                    <th className="px-3 pb-1">Outputs</th>
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
                        Loading appointments...
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
                        No appointments found for this company.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="text-sm text-slate-700">
                        <td className="rounded-l-[22px] border-y border-l border-slate-200 bg-white px-3 py-4">
                          <p className="font-medium text-slate-900">
                            {row.appointment_id || "-"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatDateTime(row.scheduled_for)}
                          </p>
                        </td>
                        <td className="border-y border-slate-200 bg-white px-3 py-4">
                          {row.patient_name || "-"}
                        </td>
                        <td className="border-y border-slate-200 bg-white px-3 py-4">
                          {row.doctor_name || "Unassigned"}
                        </td>
                        <td className="border-y border-slate-200 bg-white px-3 py-4">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                              PR: {row.prescription_id || "-"}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                              INV: {row.billing_id || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="border-y border-slate-200 bg-white px-3 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusTone(
                              row.status,
                            )}`}
                          >
                            {row.status.replaceAll("_", " ")}
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
                    Queue Focus
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    Next appointments
                  </h2>
                </div>
                <div className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-medium uppercase tracking-[0.24em] text-white">
                  {featuredAppointments.length} Shown
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {loading ? (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-white/80 p-5 text-sm text-slate-500">
                    Loading queue...
                  </div>
                ) : error ? (
                  <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
                    {error}
                  </div>
                ) : featuredAppointments.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-white/80 p-5 text-sm text-slate-500">
                    No appointments available.
                  </div>
                ) : (
                  featuredAppointments.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {row.patient_name}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {row.doctor_name || "Awaiting doctor assignment"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(
                            row.status,
                          )}`}
                        >
                          {row.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                            Time
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-700">
                            {formatDateTime(row.scheduled_for)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                            Reason
                          </p>
                          <p className="mt-2 truncate text-sm font-medium text-slate-700">
                            {row.reason || "General consultation"}
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
        title={editingRow ? "Edit appointment" : "New appointment"}
        description="Create and maintain appointments inside the active company workspace."
        onClose={closeDialog}
      >
        <form className="grid gap-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 rounded-[26px] border border-slate-200 bg-white/80 p-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Patient
              <select
                required
                value={form.patient}
                onChange={(event) =>
                  setForm((current) => ({ ...current, patient: event.target.value }))
                }
                className={inputClassName}
              >
                <option value="">Select patient</option>
                {patientOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.full_name || option.name || `Patient ${option.id}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Doctor
              <select
                value={form.doctor}
                onChange={(event) =>
                  setForm((current) => ({ ...current, doctor: event.target.value }))
                }
                className={inputClassName}
              >
                <option value="">Select doctor</option>
                {doctorOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name || `Doctor ${option.id}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Scheduled for
              <input
                required
                type="datetime-local"
                value={form.scheduled_for}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scheduled_for: event.target.value,
                  }))
                }
                className={inputClassName}
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
                <option value="SCHEDULED">Scheduled</option>
                <option value="CHECKED_IN">Checked in</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="NO_SHOW">No show</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
              Reason
              <textarea
                value={form.reason}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reason: event.target.value }))
                }
                rows={4}
                className={inputClassName}
                placeholder="Reason for consultation"
              />
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
                  ? "Update appointment"
                  : "Create appointment"}
            </button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
