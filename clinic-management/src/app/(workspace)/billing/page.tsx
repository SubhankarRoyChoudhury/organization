"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CalendarClock,
  Plus,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Dialog } from "@/components/dialog";
import {
  clinicFetch,
  formatCurrency,
  getClinicCompanyId,
  toDateInputValue,
} from "@/lib/clinic-api";

type BillingRow = {
  id: number;
  appointment: number;
  billing_id: string;
  appointment_id: string;
  patient_name: string;
  total_amount: number;
  amount_paid: number;
  status: string;
  due_date?: string | null;
};

type AppointmentOption = {
  id: number;
  appointment_id: string;
  patient_name: string;
};

type BillingFormState = {
  appointment: string;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  amount_paid: string;
  status: string;
  due_date: string;
  notes: string;
};

const emptyForm: BillingFormState = {
  appointment: "",
  subtotal: "0",
  tax_amount: "0",
  discount_amount: "0",
  total_amount: "0",
  amount_paid: "0",
  status: "PENDING",
  due_date: "",
  notes: "",
};

export default function BillingPage() {
  const [companyId, setCompanyId] = useState("");
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [appointmentOptions, setAppointmentOptions] = useState<AppointmentOption[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<BillingRow | null>(null);
  const [form, setForm] = useState<BillingFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [billings, appointments] = await Promise.all([
        clinicFetch<BillingRow[]>("billings/"),
        clinicFetch<AppointmentOption[]>("appointments/"),
      ]);
      setRows(Array.isArray(billings) ? billings : []);
      setAppointmentOptions(Array.isArray(appointments) ? appointments : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billings.");
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

  const openEditDialog = (row: BillingRow) => {
    setEditingRow(row);
    setForm({
      appointment: String(row.appointment),
      subtotal: String(row.total_amount || 0),
      tax_amount: "0",
      discount_amount: "0",
      total_amount: String(row.total_amount || 0),
      amount_paid: String(row.amount_paid || 0),
      status: row.status || "PENDING",
      due_date: toDateInputValue(row.due_date),
      notes: "",
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
        subtotal: Number(form.subtotal || 0),
        tax_amount: Number(form.tax_amount || 0),
        discount_amount: Number(form.discount_amount || 0),
        total_amount: Number(form.total_amount || 0),
        amount_paid: Number(form.amount_paid || 0),
        status: form.status,
        due_date: form.due_date || null,
        notes: form.notes,
      };
      if (editingRow) {
        await clinicFetch(`billings/${editingRow.id}/`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await clinicFetch("billings/", {
          method: "POST",
          body: payload,
        });
      }
      closeDialog();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save billing.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row: BillingRow) => {
    const confirmed = window.confirm(`Delete billing ${row.billing_id}?`);
    if (!confirmed) {
      return;
    }
    try {
      await clinicFetch(`billings/${row.id}/`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete billing.");
    }
  };

  const invoiceCount = rows.length;
  const totalBilled = rows.reduce(
    (sum, row) => sum + Number(row.total_amount || 0),
    0,
  );
  const totalCollected = rows.reduce(
    (sum, row) => sum + Number(row.amount_paid || 0),
    0,
  );
  const totalOutstanding = rows.reduce(
    (sum, row) =>
      sum + Math.max(Number(row.total_amount || 0) - Number(row.amount_paid || 0), 0),
    0,
  );
  const dueQueue = rows.filter(
    (row) => row.status === "PENDING" || row.status === "PARTIAL",
  );
  const featuredRows = dueQueue.slice(0, 4);

  const panelClassName =
    "rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,248,250,0.96)_100%)] shadow-[0_24px_64px_rgba(9,18,34,0.08)]";
  const inputClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";
  const statusTone = (status: string) => {
    if (status === "PAID") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (status === "PARTIAL") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }
    if (status === "VOID") {
      return "border-slate-200 bg-slate-100 text-slate-600";
    }
    return "border-rose-200 bg-rose-50 text-rose-700";
  };

  return (
    <AppShell title="Billing" eyebrow="Revenue Control">
      <div className="grid gap-5">
        <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(125deg,#0f172a_0%,#183a49_46%,#e7f7f4_46.2%,#fbfdff_100%)] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.12)] sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.22),transparent_48%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.16),transparent_44%)]"
          />
          <div className="relative grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-teal-200">
                <WalletCards className="h-3.5 w-3.5" />
                Collections Desk
              </div>
              <h2 className="mt-5 max-w-xl text-[38px] font-semibold leading-[1.02] tracking-[-0.05em] text-white">
                Make the billing page feel like finance operations, not a plain table.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                Track invoice volume, see what is collected, and keep outstanding
                amounts visible without losing the appointment link behind each bill.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Invoices
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
                    {invoiceCount}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Collected
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-teal-300">
                    {formatCurrency(totalCollected)}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Outstanding
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-sky-300">
                    {formatCurrency(totalOutstanding)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 self-end">
              <article className="rounded-[28px] border border-teal-100/80 bg-white/92 p-5 shadow-[0_20px_60px_rgba(10,37,64,0.1)] backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-teal-700/70">
                      Revenue Snapshot
                    </p>
                    <p className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-slate-950">
                      {formatCurrency(totalBilled)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Total invoice value currently recorded for this clinic company.
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
                        Pending
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                        {dueQueue.length}
                      </p>
                    </div>
                  </div>
                </article>
                <article className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                      <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                        Paid in Full
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                        {rows.filter((row) => row.status === "PAID").length}
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.16fr_0.84fr]">
          <section className={`${panelClassName} overflow-hidden p-5 sm:p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-400">
                  Invoice Ledger
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                  Billing records
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Every invoice stays tied to an appointment while showing the
                  financial state clearly enough for day-to-day collections work.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateDialog}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Create invoice
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.24em] text-slate-400">
                    <th className="pb-4 font-medium">Invoice</th>
                    <th className="pb-4 font-medium">Appointment</th>
                    <th className="pb-4 font-medium">Patient</th>
                    <th className="pb-4 font-medium">Amount</th>
                    <th className="pb-4 font-medium">Paid</th>
                    <th className="pb-4 font-medium">Status</th>
                    <th className="pb-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="py-8 text-sm text-slate-400" colSpan={7}>
                        Loading billings...
                      </td>
                    </tr>
                  ) : error || !companyId ? (
                    <tr>
                      <td className="py-8 text-sm text-rose-500" colSpan={7}>
                        {error || "Missing company context."}
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td className="py-8 text-sm text-slate-400" colSpan={7}>
                        No billing records found for this company.
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
                            {row.billing_id}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {row.due_date || "No due date"}
                          </p>
                        </td>
                        <td className="py-4">{row.appointment_id}</td>
                        <td className="py-4 font-medium text-slate-900">
                          {row.patient_name}
                        </td>
                        <td className="py-4">{formatCurrency(row.total_amount)}</td>
                        <td className="py-4">{formatCurrency(row.amount_paid)}</td>
                        <td className="py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusTone(row.status)}`}
                          >
                            {row.status}
                          </span>
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
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                  Collection Queue
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                  Outstanding invoices
                </h3>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {loading ? (
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-400">
                  Loading collection queue...
                </div>
              ) : error || !companyId ? (
                <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-500">
                  {error || "Missing company context."}
                </div>
              ) : featuredRows.length === 0 ? (
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-400">
                  No pending invoices right now.
                </div>
              ) : (
                featuredRows.map((row) => {
                  const outstanding = Math.max(
                    Number(row.total_amount || 0) - Number(row.amount_paid || 0),
                    0,
                  );
                  return (
                    <article
                      key={row.id}
                      className="rounded-[22px] border border-slate-200/80 bg-white/90 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {row.patient_name}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">
                            {row.billing_id}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium ${statusTone(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                            Total
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-950">
                            {formatCurrency(row.total_amount)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-rose-50 px-3 py-3">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-rose-400">
                            Outstanding
                          </p>
                          <p className="mt-2 text-sm font-semibold text-rose-700">
                            {formatCurrency(outstanding)}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-slate-400">
                        Appointment {row.appointment_id}
                        {row.due_date ? ` • Due ${row.due_date}` : ""}
                      </p>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        title={editingRow ? "Edit invoice" : "Create invoice"}
        description="Link billing to the appointment and keep collection details updated for the finance desk."
        onClose={closeDialog}
      >
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium text-slate-600 md:col-span-2">
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
          {[
            ["subtotal", "Subtotal"],
            ["tax_amount", "Tax"],
            ["discount_amount", "Discount"],
            ["total_amount", "Total amount"],
            ["amount_paid", "Amount paid"],
          ].map(([key, label]) => (
            <label
              key={key}
              className="grid gap-2 text-sm font-medium text-slate-600"
            >
              {label}
              <input
                type="number"
                min="0"
                step="0.01"
                value={form[key as keyof BillingFormState] as string}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </label>
          ))}
          <label className="grid gap-2 text-sm font-medium text-slate-600">
            Status
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value }))
              }
              className={inputClassName}
            >
              <option value="PENDING">Pending</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="VOID">Void</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-600">
            Due date
            <input
              type="date"
              value={form.due_date}
              onChange={(event) =>
                setForm((current) => ({ ...current, due_date: event.target.value }))
              }
              className={inputClassName}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-600 md:col-span-2">
            Notes
            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              className={`${inputClassName} resize-none`}
              placeholder="Optional finance notes"
            />
          </label>
          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
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
                  ? "Update invoice"
                  : "Create invoice"}
            </button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
