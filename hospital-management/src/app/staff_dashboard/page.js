"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchStaffDepartment,
  get_Hospital_User_Login_Details,
} from "@/app/api/apiService";

export default function StaffDashboard() {
  const router = useRouter();
  const cardTemplates = useMemo(
    () => [
      {
        title: "Font Office",
        accent: "from-amber-500 to-orange-500",
        items: [
          { label: "Pending Bills", value: "11" },
          { label: "Collections", value: "₹ 82,300" },
          { label: "Insurance", value: "5" },
          { label: "Refunds", value: "2" },
        ],
      },
      {
        title: "Nursing",
        accent: "from-emerald-500 to-teal-500",
        items: [
          { label: "Active Rounds", value: "4" },
          { label: "Vitals Due", value: "12" },
          { label: "Discharges", value: "3" },
          { label: "OT Prep", value: "2" },
        ],
      },
      {
        title: "Housekeeping & Security",
        accent: "from-sky-500 to-indigo-500",
        items: [
          { label: "On Shift", value: "28" },
          { label: "Late Arrivals", value: "2" },
          { label: "Leaves Today", value: "3" },
          { label: "Requests", value: "6" },
        ],
      },
      {
        title: "ICU",
        accent: "from-fuchsia-500 to-rose-500",
        items: [
          { label: "Beds Ready", value: "18" },
          { label: "Cleanings", value: "7" },
          { label: "Stocks Low", value: "5" },
          { label: "OT Slots", value: "4" },
        ],
      },
      {
        title: "Maintenance",
        accent: "from-fuchsia-500 to-rose-500",
        items: [
          { label: "Beds Ready", value: "18" },
          { label: "Cleanings", value: "7" },
          { label: "Stocks Low", value: "5" },
          { label: "OT Slots", value: "4" },
        ],
      },
    ],
    [],
  );

  const [staffDepartments, setStaffDepartments] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [staffDepartmentName, setStaffDepartmentName] = useState("");

  const sanitizeCompanyId = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const num = Number(value);
    if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
      return null;
    }
    return num;
  };

  const resolveCompanyId = (data) => {
    const direct = sanitizeCompanyId(data);
    if (direct) return direct;
    const candidates = [
      data?.company_id,
      data?.user?.company_id,
      data?.companies?.[0]?.company_id,
      data?.companies?.[0]?.id,
      data?.company?.id,
    ];
    for (const candidate of candidates) {
      const parsed = sanitizeCompanyId(candidate);
      if (parsed) return parsed;
    }
    if (Array.isArray(data?.companies)) {
      for (const company of data.companies) {
        const parsed = sanitizeCompanyId(company?.company_id ?? company?.id);
        if (parsed) return parsed;
      }
    }
    return null;
  };

  useEffect(() => {
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    const accessToken =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;
    console.log("staff_dashboard auth", {
      username,
      hasAccessToken: Boolean(accessToken),
    });
    if (!username || !accessToken) {
      console.warn(
        "Missing username or access_token; cannot load user details",
      );
      return;
    }
    get_Hospital_User_Login_Details(username)
      .then((data) => {
        console.log("user_detailssss", data);

        const resolvedCompanyId = resolveCompanyId(data);
        if (resolvedCompanyId) {
          setCompanyId(resolvedCompanyId);
        }
        const departmentName = data?.user?.staff_department_name ?? "";
        setStaffDepartmentName(
          typeof departmentName === "string" ? departmentName : "",
        );
      })
      .catch((error) => {
        console.error("Failed to load user details:", error);
      });
  }, []);

  useEffect(() => {
    if (!companyId) return;
    fetchStaffDepartment(companyId)
      .then((data) => {
        console.log(data);

        setStaffDepartments(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Failed to load staff departments:", error);
      });
  }, [companyId]);

  const approvedDepartments = useMemo(
    () => staffDepartments.filter((dept) => dept?.is_approve === true),
    [staffDepartments],
  );

  const dashboardCards = useMemo(() => {
    if (!staffDepartments.length) {
      return cardTemplates;
    }
    if (!approvedDepartments.length) {
      return [];
    }
    const pickTemplate = (dept) => {
      const seed = String(dept?.id ?? dept?.name ?? "");
      let hash = 0;
      for (let i = 0; i < seed.length; i += 1) {
        hash = (hash * 31 + seed.charCodeAt(i)) % cardTemplates.length;
      }
      return cardTemplates[Math.abs(hash) % cardTemplates.length];
    };
    return approvedDepartments
      .slice()
      .sort((a, b) =>
        String(a?.name ?? "")
          .trim()
          .localeCompare(String(b?.name ?? "").trim(), undefined, {
            sensitivity: "base",
          }),
      )
      .map((dept, idx) => {
        const template = pickTemplate(dept);
        return {
          ...template,
          title: dept?.name || template.title,
          key: dept?.id ?? `${template.title}-${idx}`,
        };
      });
  }, [staffDepartments, approvedDepartments, cardTemplates]);

  const normalizeName = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase();

  const normalizedStaffDepartment = normalizeName(staffDepartmentName);

  return (
    <div className="min-h-full bg-[#f7f4ef] text-slate-900">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap");
        .font-display {
          font-family: "Fraunces", ui-serif, Georgia, serif;
        }
        .font-body {
          font-family:
            "Space Grotesk",
            ui-sans-serif,
            system-ui,
            -apple-system,
            sans-serif;
        }
      `}</style>

      <div className="relative overflow-hidden">
        {/* <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-24 -left-16 h-72 w-72 rounded-full bg-orange-200/50 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-40 w-[520px] -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl" /> */}

        <div className="mx-auto max-w-9xl px-6 py-10 font-body">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Staff Dashboard
              </p>
              <h1 className="font-display text-3xl md:text-4xl font-semibold">
                Good shift. Let’s keep the ward moving.
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-600">
                Track patient flow, triage tasks, and quick actions without
                losing momentum.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Print Shift Sheet
              </button>
              <button
                type="button"
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:bg-slate-800"
              >
                Start Rounds
              </button>
            </div>
          </div>

          <div className="mt-10 grid gap-6  sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
            {dashboardCards.map((card, idx) => {
              const isActive =
                normalizedStaffDepartment &&
                normalizedStaffDepartment === normalizeName(card.title);
              const cardClasses = isActive
                ? "group relative overflow-hidden rounded-[32px] border border-white/60 bg-white/80 p-6 shadow-xl shadow-slate-200/70 backdrop-blur transition hover:-translate-y-1"
                : "relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-slate-50/90 p-6 shadow-inner shadow-slate-200/60 opacity-70";
              const buttonClasses = isActive
                ? "mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                : "mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed";
              const accentClasses = isActive
                ? `absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${card.accent}`
                : "absolute inset-x-0 top-0 h-1.5 bg-slate-300";
              return (
                <div
                  key={card.key ?? `${card.title}-${idx}`}
                  className={cardClasses}
                >
                  <div className={accentClasses} />
                  <div className="flex items-center justify-between">
                    <h2
                      className={
                        isActive
                          ? "font-display text-xl font-semibold text-slate-900"
                          : "font-display text-xl font-semibold text-slate-500"
                      }
                    >
                      {card.title}
                    </h2>
                    <span
                      className={
                        isActive
                          ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                          : "rounded-full bg-slate-300 px-3 py-1 text-xs font-semibold text-slate-600"
                      }
                    >
                      {isActive ? "Today" : "Locked"}
                    </span>
                  </div>
                  <p
                    className={
                      isActive
                        ? "mt-2 text-sm text-slate-500"
                        : "mt-2 text-sm text-slate-400"
                    }
                  >
                    Snapshot of key items for this shift.
                  </p>
                  {/* <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {card.items.map((item) => (
                    <div
                      key={item.label}
                      className={
                        isActive
                          ? "rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm"
                          : "rounded-2xl border border-slate-200 bg-slate-100 p-4"
                      }
                    >
                      <p
                        className={
                          isActive
                            ? "text-xs uppercase tracking-wider text-slate-400"
                            : "text-xs uppercase tracking-wider text-slate-300"
                        }
                      >
                        {item.label}
                      </p>
                      <p
                        className={
                          isActive
                            ? "mt-2 text-2xl font-display text-slate-900"
                            : "mt-2 text-2xl font-display text-slate-500"
                        }
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div> */}
                  <button
                    type="button"
                    className={buttonClasses}
                    disabled={!isActive}
                    aria-disabled={!isActive}
                    onClick={() => {
                      if (!isActive) return;
                      router.push("/duty_roaster?from=staff");
                    }}
                  >
                    Duty Roaster
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
