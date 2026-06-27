"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  GraduationCap,
  Percent,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";
import { getSchoolCurrentStatus } from "@/app/api/apiService";

function formatNumber(value, options = {}) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value);
  }
  return new Intl.NumberFormat("en-IN", options).format(numericValue);
}

function formatPercent(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return `${formatNumber(value, { maximumFractionDigits: 2 })}%`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function MetricCard({ icon: Icon, label, value, detail, accent }) {
  return (
    <article className="min-h-[154px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accent}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <BarChart3 className="h-4 w-4 text-slate-300" />
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
        {value}
      </p>
      {detail ? (
        <p className="mt-2 min-h-5 text-sm text-slate-500">{detail}</p>
      ) : null}
    </article>
  );
}

export default function SchoolAnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const rawSchoolId = Array.isArray(params?.schoolId)
    ? params.schoolId[0]
    : params?.schoolId;
  const schoolId = String(rawSchoolId || "").trim();
  const [statusData, setStatusData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadStatus = useCallback(async () => {
    if (!schoolId) {
      setErrorMessage("Selected school was not found.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");
      const response = await getSchoolCurrentStatus(schoolId);
      setStatusData(response || null);
    } catch (error) {
      console.error("Unable to load school current status:", error);
      setErrorMessage(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          "Unable to load school analytics.",
      );
      setStatusData(null);
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const company = useMemo(() => statusData?.company || {}, [statusData]);
  const summary = useMemo(() => statusData?.summary || {}, [statusData]);
  const period = useMemo(() => statusData?.period || {}, [statusData]);

  const metricCards = useMemo(
    () => [
      {
        label: "Total student",
        value: formatNumber(summary.total_students),
        detail: `${formatNumber(summary.total_teachers)} teachers active`,
        icon: GraduationCap,
        accent: "bg-emerald-50 text-emerald-700",
      },
      {
        label: "Student teacher ratio",
        value: summary.student_teacher_ratio_display || "-",
        detail:
          summary.total_teachers > 0
            ? `${formatNumber(summary.total_students)} students / ${formatNumber(
                summary.total_teachers,
              )} teachers`
            : "Teacher data unavailable",
        icon: Users,
        accent: "bg-sky-50 text-sky-700",
      },
      {
        label: "Exam conducted",
        value: formatNumber(summary.exams_conducted),
        detail: `${formatNumber(summary.exam_schedules_conducted)} schedules till date`,
        icon: BookOpenCheck,
        accent: "bg-amber-50 text-amber-700",
      },
      {
        label: "Avg marks / student",
        value: formatNumber(summary.average_marks_percentage, {
          maximumFractionDigits: 2,
        }),
        detail: `${formatPercent(summary.average_marks_per_student)} average score`,
        icon: Percent,
        accent: "bg-indigo-50 text-indigo-700",
      },
      {
        label: "Highest marks",
        value: formatNumber(summary.highest_marks, {
          maximumFractionDigits: 2,
        }),
        detail: summary.highest_marks_student_name
          ? `${summary.highest_marks_student_name} - ${formatPercent(
              summary.highest_marks_percentage,
            )}`
          : "No marks recorded",
        icon: Trophy,
        accent: "bg-rose-50 text-rose-700",
      },
    ],
    [summary],
  );

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => router.push("/category/vidya/school")}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                <ArrowLeft className="h-4 w-4" />
                School List
              </button>
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[2px] text-slate-400">
                  Current Status
                </p>
                <h1 className="mt-2 truncate text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                  {company.company_name || "School Analytics"}
                </h1>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
                  {company.school_category ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                      {company.school_category}
                    </span>
                  ) : null}
                  {company.location ? <span>{company.location}</span> : null}
                  {company.district ? <span>{company.district}</span> : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">
                  {period.label || "Year to date"}
                </span>
                <span className="ml-2">
                  {formatDate(period.start_date)} - {formatDate(period.end_date)}
                </span>
              </div>
              <button
                type="button"
                onClick={loadStatus}
                disabled={isLoading}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </header>

        {errorMessage ? (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700 shadow-sm">
            {errorMessage}
          </section>
        ) : null}

        {isLoading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading school analytics...
          </section>
        ) : null}

        {!isLoading && !errorMessage ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {metricCards.map((card) => (
                <MetricCard key={card.label} {...card} />
              ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">
                  School Details
                </h2>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  {[
                    ["Admin", company.admin_name],
                    ["Email", company.email],
                    ["Mobile", company.mobile_no],
                    ["School code", company.school_code],
                    ["Address", company.address],
                    ["City", company.city],
                    ["State", company.state],
                    ["Country", company.country],
                  ].map(([label, value]) => (
                    <div key={label} className="border-b border-slate-100 pb-3">
                      <dt className="text-xs font-semibold uppercase tracking-[1.5px] text-slate-400">
                        {label}
                      </dt>
                      <dd className="mt-1 break-words text-sm font-medium text-slate-800">
                        {value || "-"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">
                  Marks Coverage
                </h2>
                <dl className="mt-5 space-y-4">
                  {[
                    ["Students with marks", formatNumber(summary.students_with_marks)],
                    ["Marks entries", formatNumber(summary.marks_entries)],
                    ["Average score", formatPercent(summary.average_marks_percentage)],
                    ["Highest score", formatPercent(summary.highest_marks_percentage)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3"
                    >
                      <dt className="text-sm text-slate-500">{label}</dt>
                      <dd className="text-sm font-semibold text-slate-900">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
