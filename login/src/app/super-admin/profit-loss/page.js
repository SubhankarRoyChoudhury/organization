"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearLoginSession,
  getCompaniesProfitLossSummary,
} from "@/app/api/apiService";
import { formatCurrencyValue } from "@/lib/companyLocale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const getDefaultRange = () => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const nextYear = year + 1;
  return {
    min_date: `${year}-04-01`,
    max_date: `${nextYear}-03-31`,
  };
};

const formatCurrency = (value) =>
  formatCurrencyValue(value, {
    maximumFractionDigits: 2,
  });

export default function SuperAdminProfitLossPage() {
  const router = useRouter();
  const [range, setRange] = useState(getDefaultRange);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({
    income: 0,
    taxes: 0,
    expenses: 0,
    net_profit_loss: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRangeDialogOpen, setRangeDialogOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const loadReport = useCallback(async (nextRange) => {
    try {
      setLoading(true);
      setError("");
      const response = await getCompaniesProfitLossSummary(nextRange);
      setRows(response?.rows || []);
      setTotals(
        response?.totals || {
          income: 0,
          taxes: 0,
          expenses: 0,
          net_profit_loss: 0,
        },
      );
    } catch (err) {
      setError("Unable to load company profit and loss report.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const isSuperuser = localStorage.getItem("is_superuser") === "true";
    if (!isSuperuser) {
      router.replace("/home");
      return;
    }
    loadReport(getDefaultRange());
  }, [loadReport, router]);

  const handleRangeSubmit = async (event) => {
    event.preventDefault();
    await loadReport(range);
  };

  const handleLogout = () => {
    clearLoginSession();
    router.replace("/login");
  };

  const chartRows = rows.map((row) => ({
    label: row.company_name || row.organization_name || "Company",
    net: Number(row.net_profit_loss || 0),
  }));
  const maxChartValue = Math.max(
    1,
    ...chartRows.map((row) => Math.abs(row.net)),
  );
  const chartData = chartRows.slice(0, 12);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-200 text-slate-900">
      <div className="space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-[32px] border border-white/70 bg-white/70 px-6 py-5 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              {/* <p className="text-xs font-semibold uppercase tracking-[0.45em] text-sky-700">
                Super Admin
              </p> */}
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  type="button"
                  onClick={() => router.push("/super-admin")}
                  aria-label="Back to Dashboard"
                  title="Back to Dashboard"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <h1 className="text-3xl font-semibold leading-tight text-slate-900">
                  Company Profit &amp; Loss
                </h1>
              </div>
              {/* <p className="max-w-2xl text-sm text-slate-500">
                Compare income, taxes, expenses, and net position for every company in one report.
              </p> */}
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <button
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.35em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                type="button"
                onClick={() => setRangeDialogOpen(true)}
              >
                Report Range
              </button>
              <div className="rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                {range.min_date} to {range.max_date}
              </div>
              <div className="relative">
                <button
                  className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-[0_15px_35px_rgba(15,23,42,0.08)] transition hover:border-slate-300"
                  type="button"
                  onClick={() => setProfileMenuOpen((open) => !open)}
                >
                  <span className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500" />
                  <div className="text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-600">
                      Super Admin
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">
                      Profit &amp; Loss
                    </p>
                  </div>
                </button>
                {profileMenuOpen ? (
                  <div
                    className="absolute right-0 top-full z-20 mt-2 min-w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_48px_rgba(15,23,42,0.18)]"
                    role="menu"
                  >
                    <button
                      className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                      type="button"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.7fr_minmax(280px,0.9fr)]">
          <div className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  Profit &amp; Loss Overview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Net result trend across companies in the selected range.
                </p>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                Summary
              </span>
            </div>

            {loading ? (
              <p className="pt-6 text-sm text-slate-500">Loading chart...</p>
            ) : error ? (
              <p className="pt-6 text-sm text-rose-600">{error}</p>
            ) : rows.length === 0 ? (
              <p className="pt-6 text-sm text-slate-500">No chart data available.</p>
            ) : (
              <div className="pt-6">
                <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  <span>Profit</span>
                  <span>Loss</span>
                </div>
                <div className="flex h-80 items-end gap-3 overflow-x-auto rounded-[28px] border border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 pb-6 pt-8">
                  {chartData.map((row) => {
                    const height = (Math.abs(row.net) / maxChartValue) * 100;
                    return (
                      <div
                        key={row.label}
                        className="flex min-w-16 flex-1 flex-col items-center justify-end gap-3"
                      >
                        <span className="text-[11px] font-semibold text-slate-500">
                          {formatCurrency(row.net)}
                        </span>
                        <div className="flex h-full w-full items-end justify-center rounded-full bg-slate-100/80 p-2">
                          <div
                            className={`w-full rounded-full ${
                              row.net >= 0
                                ? "bg-gradient-to-t from-emerald-500 to-emerald-300"
                                : "bg-gradient-to-t from-rose-500 to-orange-300"
                            }`}
                            style={{ height: `${Math.max(8, height)}%` }}
                            title={`${row.label}: ${formatCurrency(row.net)}`}
                          />
                        </div>
                        <span
                          className="w-full truncate text-center text-xs font-medium text-slate-500"
                          title={row.label}
                        >
                          {row.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {rows.length > 12 ? (
                  <p className="mt-3 text-sm text-slate-500">
                    Showing first 12 rows. Use the table for full details.
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/80 bg-slate-900 p-6 text-white shadow-[0_30px_60px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    Net Summary
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">Live Snapshot</h2>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
                  Live
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Companies
                  </p>
                  <p className="mt-3 text-4xl font-semibold">{rows.length}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Net Result
                  </p>
                  <p className="mt-3 text-3xl font-semibold">
                    {formatCurrency(totals.net_profit_loss)}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-300">Income</span>
                  <span className="font-semibold text-emerald-300">
                    {formatCurrency(totals.income)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-300">Taxes</span>
                  <span className="font-semibold text-amber-300">
                    {formatCurrency(totals.taxes)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-300">Expenses</span>
                  <span className="font-semibold text-rose-300">
                    {formatCurrency(totals.expenses)}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Profit &amp; Loss Table
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Company-wise financial summary for the selected date range.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
              {rows.length} companies
            </div>
          </div>

          {loading ? (
            <p className="pt-6 text-sm text-slate-500">Loading report...</p>
          ) : error ? (
            <p className="pt-6 text-sm text-rose-600">{error}</p>
          ) : rows.length === 0 ? (
            <p className="pt-6 text-sm text-slate-500">
              No companies available for this range.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-[28px] border border-slate-100">
              <table className="min-w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Company</th>
                    <th className="px-4 py-3 font-semibold">Organization</th>
                    <th className="px-4 py-3 font-semibold">Admin</th>
                    <th className="px-4 py-3 font-semibold">Income</th>
                    <th className="px-4 py-3 font-semibold">Taxes</th>
                    <th className="px-4 py-3 font-semibold">Expenses</th>
                    <th className="px-4 py-3 font-semibold">Net Profit/Loss</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((row) => {
                    const isProfit = row.status === "profit";
                    return (
                      <tr key={row.company_id} className="align-top">
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {row.company_name || "Unnamed"}
                        </td>
                        <td className="px-4 py-4">{row.organization_name || "-"}</td>
                        <td className="px-4 py-4">{row.admin_name || "-"}</td>
                        <td className="px-4 py-4">{formatCurrency(row.income)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.taxes)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.expenses)}</td>
                        <td
                          className={`px-4 py-4 font-semibold ${
                            Number(row.net_profit_loss) >= 0
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {formatCurrency(row.net_profit_loss)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                              isProfit
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {isProfit ? "Profit" : "Loss"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 text-sm font-semibold text-slate-800">
                  <tr>
                    <th className="px-4 py-4">Total</th>
                    <th className="px-4 py-4">-</th>
                    <th className="px-4 py-4">-</th>
                    <th className="px-4 py-4">{formatCurrency(totals.income)}</th>
                    <th className="px-4 py-4">{formatCurrency(totals.taxes)}</th>
                    <th className="px-4 py-4">{formatCurrency(totals.expenses)}</th>
                    <th
                      className={`px-4 py-4 ${
                        totals.net_profit_loss >= 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {formatCurrency(totals.net_profit_loss)}
                    </th>
                    <th className="px-4 py-4">
                      {totals.net_profit_loss >= 0 ? "Profit" : "Loss"}
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={isRangeDialogOpen}
        onOpenChange={(open) => setRangeDialogOpen(open)}
      >
        <DialogContent className="max-w-xl border border-blue-100 bg-white/95">
          <DialogHeader>
            <DialogTitle className="text-2xl text-gray-900">
              Report Range
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Adjust the date range for the profit &amp; loss report.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              handleRangeSubmit(event);
              setRangeDialogOpen(false);
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="profit-loss-min-date-dialog"
                >
                  From
                </label>
                <input
                  id="profit-loss-min-date-dialog"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                  type="date"
                  value={range.min_date}
                  onChange={(event) =>
                    setRange((current) => ({
                      ...current,
                      min_date: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="profit-loss-max-date-dialog"
                >
                  To
                </label>
                <input
                  id="profit-loss-max-date-dialog"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                  type="date"
                  value={range.max_date}
                  onChange={(event) =>
                    setRange((current) => ({
                      ...current,
                      max_date: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                type="button"
                onClick={() => setRangeDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={loading}
              >
                {loading ? "Loading..." : "Apply Range"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
