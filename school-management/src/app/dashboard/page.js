"use client";

import { useEffect, useState } from "react";
import {
  getCompanyStudentCount,
  getCompanyTeacherCount,
  getCurrentSchoolInfo,
} from "@/lib/apiService";

const classSchedule = [
  {
    time: "08:30 AM",
    className: "Grade 6 - A",
    subject: "Mathematics",
    teacher: "Ms. Kavita Rao",
  },
  {
    time: "09:20 AM",
    className: "Grade 9 - C",
    subject: "Physics",
    teacher: "Mr. Arjun Mehta",
  },
  {
    time: "10:15 AM",
    className: "Grade 3 - B",
    subject: "English",
    teacher: "Ms. Tina Roy",
  },
  {
    time: "11:00 AM",
    className: "Grade 12 - A",
    subject: "Computer Science",
    teacher: "Mr. Rahul Das",
  },
];

const announcements = [
  {
    title: "PTM Scheduled",
    detail:
      "Parent-Teacher Meeting is scheduled on Saturday, 10:00 AM to 2:00 PM.",
    tag: "Academic",
  },
  {
    title: "Transport Update",
    detail:
      "Route 3 bus timing updated for evening dispersal from next Monday.",
    tag: "Transport",
  },
  {
    title: "Science Fair",
    detail: "Final project submissions close by Friday, 5:00 PM.",
    tag: "Events",
  },
];

const admissions = [
  { name: "Aarav Sharma", grade: "Grade 5", status: "Document Review" },
  { name: "Maira Khan", grade: "Grade 2", status: "Interview Scheduled" },
  { name: "Ishaan Gupta", grade: "Grade 8", status: "Fee Pending" },
];

function StatCard({ label, value, trend }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-2 text-sm text-emerald-600">{trend}</p>
    </article>
  );
}

export default function DashboardPage() {
  const [studentCount, setStudentCount] = useState("0");
  const [teacherCount, setTeacherCount] = useState("0");
  const [currentUserAccess, setCurrentUserAccess] = useState({
    role: "",
    isHeadMaster: false,
  });
  const [accessDialogState, setAccessDialogState] = useState({
    open: false,
    feature: "",
  });

  const normalizeRoleValue = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");

  useEffect(() => {
    let mounted = true;

    const loadCounts = async () => {
      try {
        const [studentData, teacherData] = await Promise.all([
          getCompanyStudentCount(),
          getCompanyTeacherCount(),
        ]);
        if (!mounted) {
          return;
        }
        const nextStudentCount = Number(studentData?.count || 0);
        const nextTeacherCount = Number(teacherData?.count || 0);
        setStudentCount(new Intl.NumberFormat("en-IN").format(nextStudentCount));
        setTeacherCount(new Intl.NumberFormat("en-IN").format(nextTeacherCount));
      } catch (_error) {
        if (!mounted) {
          return;
        }
        setStudentCount("0");
        setTeacherCount("0");
      }
    };

    loadCounts();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    getCurrentSchoolInfo()
      .then((data) => {
        if (!mounted || !data) {
          return;
        }

        setCurrentUserAccess({
          role: String(data.role || ""),
          isHeadMaster: Boolean(data.is_head_master),
        });
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setCurrentUserAccess({
          role: "",
          isHeadMaster: false,
        });
      });

    return () => {
      mounted = false;
    };
  }, []);

  const quickStats = [
    { label: "Total Students", value: studentCount, },
    { label: "Teachers", value: teacherCount, },
    { label: "Today's Attendance", value: "94.6%",},
    { label: "Pending Fees", value: "₹ 3.8L", },
  ];

  const navigateTo = (path) => {
    if (typeof window === "undefined") {
      return;
    }
    window.location.href = path;
  };

  const normalizedCurrentRole = normalizeRoleValue(currentUserAccess.role);
  const canAccessAccountsAndPayroll =
    currentUserAccess.isHeadMaster ||
    [
      "assistantheadmaster",
      "asistantheadmaster",
      "clerk",
      "liabraryperson",
      "libraryperson",
    ].includes(normalizedCurrentRole);
  const canAccessAccessControl =
    currentUserAccess.isHeadMaster ||
    ["admin", "administrator"].includes(normalizedCurrentRole);

  const getAccessRestrictionText = (feature) => {
    if (feature === "Access Control") {
      return "Only Admin or Head Master users can use this section.";
    }

    return "Only Head Master, Assistant HeadMaster, Clerk, or Library Person users can use this section.";
  };

  const handleProtectedNavigation = (
    path,
    feature,
    canAccess = canAccessAccountsAndPayroll,
  ) => {
    if (canAccess) {
      navigateTo(path);
      return;
    }

    setAccessDialogState({
      open: true,
      feature,
    });
  };

  return (
    <main className="dashboard-shell h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full w-full flex-col px-3 pb-4 pt-16 sm:px-6 lg:px-8 lg:pt-8">
        <section className="shrink-0 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-700 via-cyan-700 to-teal-700 px-4 py-5 text-white shadow-[0_16px_34px_rgba(14,116,144,0.25)] sm:rounded-2xl sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] md:text-[16px] font-semibold uppercase tracking-[0.2em] text-sky-100">
              School Dashboard
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleProtectedNavigation(
                    "/accounts-management/?from=school-management",
                    "Accounts",
                  )
                }
                className="inline-flex h-9 items-center justify-center rounded-lg border border-white/25 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Accounts
              </button>
              {canAccessAccessControl ? (
                <button
                  type="button"
                  onClick={() =>
                    handleProtectedNavigation(
                      "/access-control/?from=school-management",
                      "Access Control",
                      canAccessAccessControl,
                    )
                  }
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-white/25 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Access Control
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  handleProtectedNavigation(
                    "/vidya-payroll-management/dashboard/",
                    "Payroll",
                  )
                }
                className="inline-flex h-9 items-center justify-center rounded-lg border border-white/25 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Payroll
              </button>
            </div>
          </div>
        </section>

        <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1 pb-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickStats.map((item) => (
              <StatCard
                key={item.label}
                label={item.label}
                value={item.value}
                trend={item.trend}
              />
            ))}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
            <div className="space-y-6">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:p-5">
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Attendance Overview
                    </h2>
                    <p className="text-sm text-slate-500">
                      Today&apos;s attendance split by school section.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:w-auto"
                  >
                    View Full Report
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        Primary Section
                      </span>
                      <span className="text-slate-500">96%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div className="h-2 w-[96%] rounded-full bg-sky-500" />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        Middle Section
                      </span>
                      <span className="text-slate-500">93%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div className="h-2 w-[93%] rounded-full bg-cyan-500" />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        Senior Section
                      </span>
                      <span className="text-slate-500">91%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div className="h-2 w-[91%] rounded-full bg-teal-500" />
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:p-5">
                <h2 className="text-xl font-semibold text-slate-900">
                  Today&apos;s Class Schedule
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Upcoming classes assigned to administration supervision.
                </p>

                <div className="mt-4 space-y-3 md:hidden">
                  {classSchedule.map((item) => (
                    <article
                      key={`${item.time}-${item.className}-mobile`}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">
                          {item.className}
                        </p>
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                          {item.time}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">
                        {item.subject}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.teacher}
                      </p>
                    </article>
                  ))}
                </div>

                <div className="mt-4 hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[620px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <th className="py-2 font-semibold">Time</th>
                        <th className="py-2 font-semibold">Class</th>
                        <th className="py-2 font-semibold">Subject</th>
                        <th className="py-2 font-semibold">Teacher</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classSchedule.map((item) => (
                        <tr
                          key={`${item.time}-${item.className}`}
                          className="border-b border-slate-100 text-sm text-slate-700"
                        >
                          <td className="py-3 font-medium">{item.time}</td>
                          <td className="py-3">{item.className}</td>
                          <td className="py-3">{item.subject}</td>
                          <td className="py-3">{item.teacher}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>

            <div className="space-y-6">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:p-5">
                <h2 className="text-xl font-semibold text-slate-900">
                  Announcements
                </h2>
                <div className="mt-4 space-y-3">
                  {announcements.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-800">
                          {item.title}
                        </p>
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                          {item.tag}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:p-5">
                <h2 className="text-xl font-semibold text-slate-900">
                  Recent Admissions
                </h2>
                <div className="mt-4 space-y-3">
                  {admissions.map((item) => (
                    <div
                      key={item.name}
                      className="rounded-xl border border-slate-200 p-3"
                    >
                      <p className="font-medium text-slate-800">{item.name}</p>
                      <p className="text-sm text-slate-500">{item.grade}</p>
                      <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:p-5">
                <h2 className="text-xl font-semibold text-slate-900">
                  Fee Collection
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Collected this month:{" "}
                  <span className="font-semibold text-slate-800">₹ 18.4L</span>
                </p>
                <div className="mt-4 h-2 rounded-full bg-slate-200">
                  <div className="h-2 w-[78%] rounded-full bg-emerald-500" />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  78% of monthly target achieved
                </p>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
                  >
                    Send Reminders
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Export Report
                  </button>
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>

      {accessDialogState.open ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_22px_70px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Access Restricted
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  You don&apos;t have access to {accessDialogState.feature}.
                  {" "}
                  {getAccessRestrictionText(accessDialogState.feature)}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setAccessDialogState({
                    open: false,
                    feature: "",
                  })
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close access dialog"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setAccessDialogState({
                    open: false,
                    feature: "",
                  })
                }
                className="inline-flex h-10 items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
