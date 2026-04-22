"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CalendarClock,
  ClipboardPenLine,
  Plus,
  ScanSearch,
  Stethoscope,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Dialog } from "@/components/dialog";
import { clinicFetch, getClinicCompanyId } from "@/lib/clinic-api";

type PrescriptionRow = {
  id: number;
  appointment: number;
  prescription_id: string;
  patient_name: string;
  doctor_name: string;
  summary: string;
  status: string;
  follow_up_in_days?: number | null;
};

type AppointmentOption = {
  id: number;
  appointment_id: string;
  patient_name: string;
  doctor_name: string;
};

type PrescriptionFormState = {
  appointment: string;
  status: string;
  summary: string;
  follow_up_in_days: string;
};

const emptyForm: PrescriptionFormState = {
  appointment: "",
  status: "DRAFT",
  summary: "",
  follow_up_in_days: "",
};

export default function PrescriptionPage() {
  const [companyId, setCompanyId] = useState("");
  const [rows, setRows] = useState<PrescriptionRow[]>([]);
  const [appointmentOptions, setAppointmentOptions] = useState<AppointmentOption[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<PrescriptionRow | null>(null);
  const [form, setForm] = useState<PrescriptionFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [prescriptions, appointments] = await Promise.all([
        clinicFetch<PrescriptionRow[]>("prescriptions/"),
        clinicFetch<AppointmentOption[]>("appointments/"),
      ]);
      setRows(Array.isArray(prescriptions) ? prescriptions : []);
      setAppointmentOptions(Array.isArray(appointments) ? appointments : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load prescriptions.",
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

  const openEditDialog = (row: PrescriptionRow) => {
    setEditingRow(row);
    setForm({
      appointment: String(row.appointment),
      status: row.status || "DRAFT",
      summary: row.summary || "",
      follow_up_in_days:
        row.follow_up_in_days === null || row.follow_up_in_days === undefined
          ? ""
          : String(row.follow_up_in_days),
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
        appointment: Number(form.appointment),
        status: form.status,
        summary: form.summary,
        follow_up_in_days: form.follow_up_in_days
          ? Number(form.follow_up_in_days)
          : null,
      };
      if (editingRow) {
        await clinicFetch(`prescriptions/${editingRow.id}/`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await clinicFetch("prescriptions/", {
          method: "POST",
          body: payload,
        });
      }
      closeDialog();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save prescription.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row: PrescriptionRow) => {
    const confirmed = window.confirm(
      `Delete prescription ${row.prescription_id}?`,
    );
    if (!confirmed) {
      return;
    }
    try {
      await clinicFetch(`prescriptions/${row.id}/`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete prescription.",
      );
    }
  };

  const prescriptionCount = rows.length;
  const issuedCount = rows.filter((row) => row.status === "ISSUED").length;
  const readyCount = rows.filter((row) => row.status === "READY").length;
  const followUpCount = rows.filter(
    (row) => (row.follow_up_in_days ?? 0) > 0,
  ).length;
  const featuredRows = rows.slice(0, 4);

  const panelClassName =
    "rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,248,250,0.96)_100%)] shadow-[0_24px_64px_rgba(9,18,34,0.08)]";
  const inputClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";
  const statusTone = (status: string) => {
    if (status === "ISSUED") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (status === "READY") {
      return "border-sky-200 bg-sky-50 text-sky-700";
    }
    return "border-amber-200 bg-amber-50 text-amber-700";
  };

  return (
    <AppShell title="Prescription" eyebrow="Clinical Orders">
      <div className="grid gap-5">
        <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(125deg,#0f172a_0%,#17344a_46%,#e8f7f6_46.2%,#fbfdff_100%)] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.12)] sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.24),transparent_48%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.16),transparent_42%)]"
          />
          <div className="relative grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-teal-200">
                <ClipboardPenLine className="h-3.5 w-3.5" />
                Care Orders
              </div>
              <h2 className="mt-5 max-w-xl text-[38px] font-semibold leading-[1.02] tracking-[-0.05em] text-white">
                Keep prescription output clear, current, and ready to issue.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                Review draft notes, see what is ready for release, and keep
                follow-up guidance attached to the right appointment record.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Prescriptions
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
                    {prescriptionCount}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Ready
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-teal-300">
                    {readyCount}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Issued
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-sky-300">
                    {issuedCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 self-end">
              <article className="rounded-[28px] border border-teal-100/80 bg-white/92 p-5 shadow-[0_20px_60px_rgba(10,37,64,0.1)] backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-teal-700/70">
                      Follow-up Queue
                    </p>
                    <p className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-slate-950">
                      {followUpCount}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Prescriptions that already carry a follow-up interval.
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
                        Drafts
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                        {rows.filter((row) => row.status === "DRAFT").length}
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
                        Coverage
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                        {appointmentOptions.length}
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <section className={`${panelClassName} overflow-hidden p-5 sm:p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-400">
                  Prescription Ledger
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                  Active medication records
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Keep every prescription tied to the correct appointment and
                  see whether it is still being drafted, prepared, or already
                  issued to the patient.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateDialog}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Add prescription
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.24em] text-slate-400">
                    <th className="pb-4 font-medium">Prescription</th>
                    <th className="pb-4 font-medium">Patient</th>
                    <th className="pb-4 font-medium">Doctor</th>
                    <th className="pb-4 font-medium">Status</th>
                    <th className="pb-4 font-medium">Follow up</th>
                    <th className="pb-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="py-8 text-sm text-slate-400" colSpan={6}>
                        Loading prescriptions...
                      </td>
                    </tr>
                  ) : error || !companyId ? (
                    <tr>
                      <td className="py-8 text-sm text-rose-500" colSpan={6}>
                        {error || "Missing company context."}
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td className="py-8 text-sm text-slate-400" colSpan={6}>
                        No prescriptions found for this company.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-slate-100 text-sm text-slate-700"
                      >
                        <td className="py-4">
                          <p className="font-semibold text-slate-950">
                            {row.prescription_id || "-"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Appointment #{row.appointment}
                          </p>
                        </td>
                        <td className="py-4 font-medium text-slate-900">
                          {row.patient_name || "-"}
                        </td>
                        <td className="py-4">{row.doctor_name || "-"}</td>
                        <td className="py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusTone(row.status)}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-4">
                          {row.follow_up_in_days
                            ? `${row.follow_up_in_days} days`
                            : "-"}
                        </td>
                        <td className="py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEditDialog(row)}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
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

          <section className={`${panelClassName} p-5 sm:p-6`}>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-950 p-3 text-white">
                <ScanSearch className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                  Ready To Review
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                  Recent prescriptions
                </h3>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {loading ? (
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-400">
                  Loading review queue...
                </div>
              ) : error || !companyId ? (
                <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-500">
                  {error || "Missing company context."}
                </div>
              ) : featuredRows.length === 0 ? (
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-400">
                  No prescriptions available yet.
                </div>
              ) : (
                featuredRows.map((row) => (
                  <article
                    key={row.id}
                    className="rounded-[22px] border border-slate-200/80 bg-white/90 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {row.patient_name || "-"}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">
                          {row.prescription_id || "Pending ID"}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium ${statusTone(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {row.summary || "No summary added yet."}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">
                      {row.doctor_name || "-"}
                      {row.follow_up_in_days
                        ? ` • Follow up in ${row.follow_up_in_days} days`
                        : ""}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        title={editingRow ? "Edit prescription" : "Add prescription"}
        description="Attach each prescription to a company-scoped appointment and keep the clinical summary current."
        onClose={closeDialog}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium text-slate-600">
            Appointment
            <select
              required
              value={form.appointment}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  appointment: event.target.value,
                }))
              }
              className={inputClassName}
            >
              <option value="">Select appointment</option>
              {appointmentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.appointment_id} - {option.patient_name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-600">
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                className={inputClassName}
              >
                <option value="DRAFT">Draft</option>
                <option value="READY">Ready</option>
                <option value="ISSUED">Issued</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-600">
              Follow up in days
              <input
                type="number"
                min="0"
                value={form.follow_up_in_days}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    follow_up_in_days: event.target.value,
                  }))
                }
                className={inputClassName}
                placeholder="Optional"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium text-slate-600">
            Summary
            <textarea
              rows={6}
              value={form.summary}
              onChange={(event) =>
                setForm((current) => ({ ...current, summary: event.target.value }))
              }
              className={`${inputClassName} resize-none`}
              placeholder="Medication notes, dosage guidance, and instructions"
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeDialog}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Saving..."
                : editingRow
                  ? "Update prescription"
                  : "Create prescription"}
            </button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
