"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CalendarCheck2,
  ClipboardList,
  Coins,
  EllipsisVertical,
  ShieldPlus,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { clinicFetch, formatCurrency, formatDateTime, getClinicCompanyId } from "@/lib/clinic-api";

type DashboardPayload = {
  metrics: {
    appointments: number;
    operations: number;
    new_patients: number;
    earning: number;
  };
  overview: {
    users: number;
    patients: number;
    doctors: number;
    appointments_today: number;
  };
  highlights: {
    appointments_with_outputs: number;
    total_appointments: number;
    pending_billing_follow_up: number;
    active_doctors: number;
    total_billed_amount: number;
    total_paid_amount: number;
  };
  latest_appointments: Array<{
    id: number;
    appointment_id: string;
    scheduled_for: string;
    patient_name: string;
    doctor_name: string;
    billing_id: string;
  }>;
  booked_appointments: Array<{
    id: number;
    appointment_id: string;
    assigned_doctor: string;
    patient_name: string;
    scheduled_for: string;
    disease: string;
  }>;
  doctors_list: Array<{
    id: number;
    doctor_name: string;
    subtitle: string;
    status: string;
  }>;
  reports: {
    survey: {
      range_label: string;
      labels: string[];
      new_patients: number[];
      old_patients: number[];
    };
  };
};

const sparklinePath = "M4 27 C12 18, 18 18, 24 25 C30 32, 38 10, 46 17 C52 22, 58 7, 66 13 C74 19, 82 16, 92 24";

function MiniSparkline() {
  return (
    <svg
      viewBox="0 0 96 36"
      className="h-10 w-20 text-[#5b7cf7]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={sparklinePath}
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TinyLineChart({
  labels,
  newPatients,
  oldPatients,
}: {
  labels: string[];
  newPatients: number[];
  oldPatients: number[];
}) {
  const width = 320;
  const maxValue = Math.max(...newPatients, ...oldPatients, 1);
  const stepX = labels.length > 1 ? (width - 16) / (labels.length - 1) : 0;
  const toY = (value: number) => 18 + (1 - value / maxValue) * 96;
  const buildPath = (values: number[]) =>
    values
      .map((value, index) => `${index === 0 ? "M" : "L"} ${8 + index * stepX} ${toY(value)}`)
      .join(" ");
  const highlightIndex = Math.max(Math.floor(labels.length / 2), 0);
  const highlightX = 8 + highlightIndex * stepX;
  const highlightNew = newPatients[highlightIndex] ?? 0;
  const highlightOld = oldPatients[highlightIndex] ?? 0;
  const tooltipX = Math.min(Math.max(highlightX - 28, 120), 210);

  return (
    <div className="mt-5 rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fafcff_100%)] p-3">
      <svg viewBox="0 0 320 150" className="h-[150px] w-full" fill="none" aria-hidden="true">
        {[0, 1, 2, 3].map((line) => (
          <path
            key={line}
            d={`M0 ${28 + line * 30} H320`}
            stroke="#e8eef8"
            strokeDasharray="4 4"
          />
        ))}
        <path
          d={buildPath(oldPatients)}
          stroke="#ff6d8f"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={buildPath(newPatients)}
          stroke="#5c6bff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={highlightX} cy={toY(highlightOld)} r="4.5" fill="#ff6d8f" />
        <circle cx={highlightX} cy={toY(highlightNew)} r="4.5" fill="#5c6bff" />
        <rect x={tooltipX} y="42" width="92" height="54" rx="14" fill="#ffffff" stroke="#e7edf8" />
        <text x={tooltipX + 16} y="62" fill="#0f172a" fontSize="11" fontWeight="600">
          {labels[highlightIndex] || "-"}
        </text>
        <circle cx={tooltipX + 16} cy="76" r="4" fill="#5c6bff" />
        <text x={tooltipX + 26} y="80" fill="#64748b" fontSize="10">
          New Patients {highlightNew}
        </text>
        <circle cx={tooltipX + 16} cy="90" r="4" fill="#ff6d8f" />
        <text x={tooltipX + 26} y="94" fill="#64748b" fontSize="10">
          Old Patients {highlightOld}
        </text>
      </svg>
      <div
        className="mt-1 grid text-[10px] font-medium text-slate-400"
        style={{ gridTemplateColumns: `repeat(${Math.max(labels.length, 1)}, minmax(0, 1fr))` }}
      >
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [companyId, setCompanyId] = useState("");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

    let cancelled = false;

    Promise.resolve().then(async () => {
      if (cancelled) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const payload = await clinicFetch<DashboardPayload>("dashboard/");
        if (!cancelled) {
          setData(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const appointments = data?.metrics.appointments ?? 0;
  const operations = data?.metrics.operations ?? 0;
  const newPatients = data?.metrics.new_patients ?? 0;
  const earnings = data?.metrics.earning ?? 0;
  const doctorRows = data?.doctors_list ?? [];
  const bookedRows = data?.booked_appointments ?? [];
  const survey = data?.reports.survey;

  const metricCards = [
    {
      label: "Appointments",
      value: loading ? "..." : appointments.toFixed(2),
      icon: CalendarCheck2,
      tone: "bg-[#fff3f3] text-[#ff6b6b]",
    },
    {
      label: "Operations",
      value: loading ? "..." : operations.toFixed(2),
      icon: ClipboardList,
      tone: "bg-[#fff4eb] text-[#f58a3a]",
    },
    {
      label: "New Patients",
      value: loading ? "..." : newPatients.toFixed(2),
      icon: UserPlus,
      tone: "bg-[#ebfbf8] text-[#13b8a6]",
    },
    {
      label: "Earning",
      value: loading ? "..." : formatCurrency(earnings),
      icon: Coins,
      tone: "bg-[#eef6ff] text-[#2792f5]",
    },
  ];

  const cardClassName =
    "rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]";

  return (
    <AppShell title="Dashboard" eyebrow="Clinic Overview">
      <div className="grid gap-4">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className={`${cardClassName} overflow-hidden`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`inline-flex rounded-xl p-2.5 ${item.tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[32px] font-semibold tracking-[-0.04em] text-slate-950">
                      {item.value}
                    </p>
                  </div>
                  <div className="pt-8">
                    <MiniSparkline />
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <article className={cardClassName}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Patient and Appointment Activity
                </h2>
                <div className="mt-3 flex flex-wrap gap-4 text-xs">
                  <span className="inline-flex items-center gap-2 text-slate-500">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#5c6bff]" />
                    New Patients
                  </span>
                  <span className="inline-flex items-center gap-2 text-slate-500">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff6d8f]" />
                    Old Patients
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500">
                {survey?.range_label || "Last 7 Days"}
              </div>
            </div>
            <TinyLineChart
              labels={survey?.labels ?? []}
              newPatients={survey?.new_patients ?? []}
              oldPatients={survey?.old_patients ?? []}
            />
          </article>

          <article className={cardClassName}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Operations Summary
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Real workflow and billing counts from the active company.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500">
                Live
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  Total Appointments
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                  {loading ? "..." : data?.highlights.total_appointments ?? 0}
                </p>
              </div>
              <div className="rounded-[18px] border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  With Outputs
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                  {loading ? "..." : data?.highlights.appointments_with_outputs ?? 0}
                </p>
              </div>
              <div className="rounded-[18px] border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  Pending Billing
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                  {loading ? "..." : data?.highlights.pending_billing_follow_up ?? 0}
                </p>
              </div>
              <div className="rounded-[18px] border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  Active Doctors
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                  {loading ? "..." : data?.highlights.active_doctors ?? 0}
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <article className={cardClassName}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">
                Booked Appointment
              </h2>
              <button className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700">
                <EllipsisVertical className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-left">
                <thead>
                  <tr className="text-xs font-medium text-slate-400">
                    <th className="rounded-l-xl bg-slate-50 px-4 py-3">Assigned Doctor</th>
                    <th className="bg-slate-50 px-4 py-3">Patient Name</th>
                    <th className="bg-slate-50 px-4 py-3">Date</th>
                    <th className="bg-slate-50 px-4 py-3">Diseases</th>
                    <th className="rounded-r-xl bg-slate-50 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-sm text-slate-500">
                        Loading dashboard...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-sm text-rose-500">
                        {error}
                      </td>
                    </tr>
                  ) : bookedRows.length ? (
                    bookedRows.map((row) => (
                      <tr key={row.id} className="text-sm text-slate-700">
                        <td className="rounded-l-[16px] border-y border-l border-slate-100 bg-white px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d7f2ff_0%,#ebfff8_100%)] text-xs font-semibold text-slate-900">
                              {row.assigned_doctor
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-900">{row.assigned_doctor}</span>
                          </div>
                        </td>
                        <td className="border-y border-slate-100 bg-white px-4 py-3">
                          {row.patient_name}
                        </td>
                        <td className="border-y border-slate-100 bg-white px-4 py-3 text-slate-500">
                          {formatDateTime(row.scheduled_for)}
                        </td>
                        <td className="border-y border-slate-100 bg-white px-4 py-3">
                          {row.disease}
                        </td>
                        <td className="rounded-r-[16px] border-y border-r border-slate-100 bg-white px-4 py-3">
                          <div className="flex items-center gap-3 text-slate-400">
                            <Activity className="h-4 w-4" />
                            <ShieldPlus className="h-4 w-4 text-rose-300" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-sm text-slate-500">
                        No appointments found for this company.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className={cardClassName}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">
                Doctors List
              </h2>
              <button className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700">
                <EllipsisVertical className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 rounded-[18px] bg-slate-50 px-4 py-3 text-xs font-medium text-slate-400">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <span>Doctor Name</span>
                <span>Status</span>
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {loading ? (
                <div className="rounded-[16px] border border-slate-100 bg-white px-4 py-6 text-sm text-slate-500">
                  Loading doctors...
                </div>
              ) : error ? (
                <div className="rounded-[16px] border border-rose-100 bg-rose-50 px-4 py-6 text-sm text-rose-500">
                  {error}
                </div>
              ) : doctorRows.length ? (
                doctorRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-[16px] border border-slate-100 bg-white px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d7f2ff_0%,#ebfff8_100%)] text-xs font-semibold text-slate-900">
                        {row.doctor_name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{row.doctor_name}</p>
                        <p className="text-xs text-slate-400">{row.subtitle}</p>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-2 text-sm">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          row.status === "Available" ? "bg-emerald-400" : "bg-rose-400"
                        }`}
                      />
                      <span className="text-slate-600">{row.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[16px] border border-slate-100 bg-white px-4 py-6 text-sm text-slate-500">
                  No doctors found for this company.
                </div>
              )}
            </div>
            <div className="mt-4 rounded-[18px] border border-slate-100 bg-[linear-gradient(135deg,#f8fbff_0%,#f3f9ff_100%)] p-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                Revenue Summary
              </p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">Collected</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    {loading ? "..." : formatCurrency(data?.highlights.total_paid_amount ?? 0)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-3 text-[#386bff]">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>
    </AppShell>
  );
}
