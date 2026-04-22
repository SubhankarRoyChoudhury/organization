"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearLoginSession,
  getActivitySummary,
  getAllCompanies,
  getCompanyTotalUsage,
  getOrganizationTotalUsage,
  getOrganizations,
} from "@/app/api/apiService";

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }
  try {
    return new Date(value).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (err) {
    return String(value);
  }
};

const formatDuration = (value) => {
  if (!value) {
    return "-";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const dayMatch = trimmed.match(/^(\d+)\s+day[s]?,\s*(.+)$/i);
    let timePart = trimmed;
    let days = 0;
    if (dayMatch) {
      days = Number(dayMatch[1]) || 0;
      timePart = dayMatch[2];
    }
    const pureTime = timePart.split(".")[0];
    const parts = pureTime.split(":").map((part) => Number(part));
    if (parts.length >= 2) {
      const [hours = 0, minutes = 0, seconds = 0] = parts;
      const totalHours = hours + days * 24;
      const hh = String(totalHours).padStart(2, "0");
      const mm = String(minutes).padStart(2, "0");
      const ss = String(seconds).padStart(2, "0");
      return `${hh}:${mm}:${ss}`;
    }
    return pureTime;
  }
  return String(value);
};

const formatNumber = (value, digits = 2) => {
  const numberValue = Number(value || 0);
  if (Number.isNaN(numberValue)) {
    return "-";
  }
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(numberValue);
};

export default function SuperAdminUsageReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activityRows, setActivityRows] = useState([]);
  const [companyUsageRows, setCompanyUsageRows] = useState([]);
  const [organizationUsageRows, setOrganizationUsageRows] = useState([]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [organizationsResponse, companiesResponse, activityResponse] =
        await Promise.all([
          getOrganizations(),
          getAllCompanies(),
          getActivitySummary(),
        ]);

      const organizations = Array.isArray(organizationsResponse)
        ? organizationsResponse
        : [];
      const companies = Array.isArray(companiesResponse?.companies)
        ? companiesResponse.companies
        : [];
      const activity = Array.isArray(activityResponse) ? activityResponse : [];

      const organizationNameById = new Map(
        organizations.map((organization) => [
          String(organization.id),
          organization.name || organization.organization_name || "Organization",
        ]),
      );

      const companyById = new Map(
        companies.map((company) => [String(company.id), company]),
      );

      const usageResults = await Promise.all(
        companies.map(async (company) => {
          try {
            const usage = await getCompanyTotalUsage(company.id);
            return {
              company,
              usage,
            };
          } catch (err) {
            return {
              company,
              usage: {
                company_id: company.id,
                storage_usage_mb: 0,
                db_row_size_kb: 0,
                total_usage_mb: 0,
                error: true,
              },
            };
          }
        }),
      );

      const companyUsage = usageResults.map(({ company, usage }) => {
        const organizationId = company.organization_id
          ? String(company.organization_id)
          : "";
        return {
          company_id: company.id,
          company_name: company.company_name || company.company_id || "Company",
          organization_id: organizationId,
          organization_name:
            organizationNameById.get(organizationId) || "Unassigned",
          storage_usage_mb: Number(usage?.storage_usage_mb || 0),
          db_row_size_kb: Number(usage?.db_row_size_kb || 0),
          total_usage_mb: Number(usage?.total_usage_mb || 0),
          has_error: Boolean(usage?.error),
        };
      });

      const orgUsageResults = await Promise.all(
        organizations.map(async (organization) => {
          try {
            const usage = await getOrganizationTotalUsage(organization.id);
            return { organization, usage };
          } catch (err) {
            return {
              organization,
              usage: {
                organization_id: organization.id,
                organization_name:
                  organization.name || organization.organization_name || "Organization",
                company_count: 0,
                storage_usage_mb: 0,
                db_row_size_kb: 0,
                total_usage_mb: 0,
                error: true,
              },
            };
          }
        }),
      );

      const companyCountByOrg = new Map();
      companies.forEach((company) => {
        const orgId = company.organization_id ? String(company.organization_id) : "";
        if (!orgId) {
          return;
        }
        companyCountByOrg.set(orgId, (companyCountByOrg.get(orgId) || 0) + 1);
      });

      const organizationUsage = orgUsageResults
        .map(({ organization, usage }) => {
          const orgId = String(organization.id);
          const name =
            organization.name || organization.organization_name || "Organization";
          return {
            organization_id: orgId,
            organization_name: usage?.organization_name || name,
            company_count: Number(companyCountByOrg.get(orgId) || usage?.company_count || 0),
            storage_usage_mb: Number(usage?.storage_usage_mb || 0),
            db_row_size_kb: Number(usage?.db_row_size_kb || 0),
            total_usage_mb: Number(usage?.total_usage_mb || 0),
            has_error: Boolean(usage?.error),
          };
        })
        .sort((a, b) => a.organization_name.localeCompare(b.organization_name));

      const activityWithOrg = activity.map((row) => {
        const companyId = row.company_user__company__id
          ? String(row.company_user__company__id)
          : "";
        const company = companyById.get(companyId);
        const rowOrganizationId = row.organization_id
          ? String(row.organization_id)
          : "";
        const organizationId =
          rowOrganizationId ||
          (company?.organization_id ? String(company.organization_id) : "");
        const organizationName =
          row.organization_name ||
          organizationNameById.get(organizationId) ||
          company?.organization_name ||
          "Unassigned";
        return {
          ...row,
          company_id: companyId,
          organization_id: organizationId,
          organization_name: organizationName,
        };
      });

      const filteredActivity = activityWithOrg.filter((row) => {
        const hasCompany =
          Boolean(row.company_user__company__company_name) || Boolean(row.company_id);
        const hasOrganization =
          Boolean(row.organization_name && row.organization_name !== "Unassigned") ||
          Boolean(row.organization_id);
        return hasCompany || hasOrganization;
      });

      setActivityRows(filteredActivity);
      setCompanyUsageRows(companyUsage);
      setOrganizationUsageRows(organizationUsage);
    } catch (err) {
      setError("Unable to load usage report.");
      setActivityRows([]);
      setCompanyUsageRows([]);
      setOrganizationUsageRows([]);
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
    loadReport();
  }, [loadReport, router]);

  const handleLogout = () => {
    clearLoginSession();
    router.replace("/login");
  };

  const summaryStats = useMemo(() => {
    const totalOrganizations = organizationUsageRows.length;
    const totalCompanies = organizationUsageRows.reduce(
      (sum, row) => sum + (Number(row.company_count) || 0),
      0,
    );
    const totalUsers = activityRows.length;
    const totalStorage = organizationUsageRows.reduce(
      (sum, row) => sum + (Number(row.storage_usage_mb) || 0),
      0,
    );
    const totalDbKb = organizationUsageRows.reduce(
      (sum, row) => sum + (Number(row.db_row_size_kb) || 0),
      0,
    );
    const totalUsage = organizationUsageRows.reduce(
      (sum, row) => sum + (Number(row.total_usage_mb) || 0),
      0,
    );

    return {
      totalCompanies,
      totalOrganizations,
      totalUsers,
      totalStorage,
      totalDbKb,
      totalUsage,
    };
  }, [activityRows, organizationUsageRows]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-200 text-slate-900">
      <div className="space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-[32px] border border-white/70 bg-white/75 px-6 py-5 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.45em] text-sky-700">
                Super Admin
              </p>
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
                  Usage &amp; Login Report
                </h1>
              </div>
              <p className="max-w-3xl text-sm text-slate-500">
                Track user login activity, organization usage, and media storage across companies.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <button
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.35em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={loadReport}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
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
                      Usage Report
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

        <section className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Snapshot</h2>
              <p className="mt-1 text-sm text-slate-500">
                High-level totals across organizations, companies, and users.
              </p>
            </div>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Totals
            </span>
          </div>
          {loading ? (
            <p className="pt-6 text-sm text-slate-500">Loading report...</p>
          ) : error ? (
            <p className="pt-6 text-sm text-rose-600">{error}</p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Organizations
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {summaryStats.totalOrganizations}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Companies
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {summaryStats.totalCompanies}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Users Tracked
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {summaryStats.totalUsers}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Media Usage (MB)
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {formatNumber(summaryStats.totalStorage)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  DB Usage (KB)
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {formatNumber(summaryStats.totalDbKb)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Total Usage (MB)
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {formatNumber(summaryStats.totalUsage)}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">User Login Activity</h2>
              <p className="mt-1 text-sm text-slate-500">
                Last login, total active time, and login counts across users.
              </p>
            </div>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Logins
            </span>
          </div>
          {loading ? (
            <p className="pt-6 text-sm text-slate-500">Loading user activity...</p>
          ) : activityRows.length === 0 ? (
            <p className="pt-6 text-sm text-slate-500">No login activity found.</p>
          ) : (
            <div className="mt-6 max-h-[420px] overflow-auto rounded-[24px] border border-slate-100">
              <table className="min-w-full text-left text-sm text-slate-600">
                <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Organization</th>
                    <th className="px-4 py-3 font-semibold">Company</th>
                    <th className="px-4 py-3 font-semibold">User Name</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">First Login</th>
                    <th className="px-4 py-3 font-semibold">Last Activity</th>
                    <th className="px-4 py-3 font-semibold">Total Login Time</th>
                    <th className="px-4 py-3 font-semibold">Login Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {activityRows.map((row, index) => (
                    <tr
                      key={`${row.company_user__id || "user"}-${row.user_type || "type"}-${row.company_user__company__id || row.organization_id || "org"}-${index}`}
                    >
                      <td className="px-4 py-3">{row.organization_name || "Unassigned"}</td>
                      <td className="px-4 py-3">{row.company_user__company__company_name || "-"}</td>
                      <td className="px-4 py-3">{row.company_user__username || "-"}</td>
                      <td className="px-4 py-3">{row.company_user__name || "-"}</td>
                      <td className="px-4 py-3">{formatDateTime(row.first_login)}</td>
                      <td className="px-4 py-3">{formatDateTime(row.last_activity)}</td>
                      <td className="px-4 py-3">{formatDuration(row.total_login)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{row.login_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Organization Usage</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Aggregated DB and media usage per organization.
                </p>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                Organizations
              </span>
            </div>
            {loading ? (
              <p className="pt-6 text-sm text-slate-500">Loading organization usage...</p>
            ) : organizationUsageRows.length === 0 ? (
              <p className="pt-6 text-sm text-slate-500">No organization usage data.</p>
            ) : (
              <div className="mt-6 max-h-[420px] overflow-auto rounded-[24px] border border-slate-100">
                <table className="min-w-full text-left text-sm text-slate-600">
                  <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Organization</th>
                      <th className="px-4 py-3 font-semibold">Companies</th>
                      <th className="px-4 py-3 font-semibold">Media (MB)</th>
                      <th className="px-4 py-3 font-semibold">DB (KB)</th>
                      <th className="px-4 py-3 font-semibold">Total (MB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {organizationUsageRows.map((row) => (
                      <tr key={row.organization_id}>
                        <td className="px-4 py-3">{row.organization_name || "Unassigned"}</td>
                        <td className="px-4 py-3">{row.company_count}</td>
                        <td className="px-4 py-3">{formatNumber(row.storage_usage_mb)}</td>
                        <td className="px-4 py-3">{formatNumber(row.db_row_size_kb)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {formatNumber(row.total_usage_mb)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Company Usage</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Media and database usage for each company.
                </p>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                Companies
              </span>
            </div>
            {loading ? (
              <p className="pt-6 text-sm text-slate-500">Loading company usage...</p>
            ) : companyUsageRows.length === 0 ? (
              <p className="pt-6 text-sm text-slate-500">No company usage data.</p>
            ) : (
              <div className="mt-6 max-h-[420px] overflow-auto rounded-[24px] border border-slate-100">
                <table className="min-w-full text-left text-sm text-slate-600">
                  <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Company</th>
                      <th className="px-4 py-3 font-semibold">Organization</th>
                      <th className="px-4 py-3 font-semibold">Media (MB)</th>
                      <th className="px-4 py-3 font-semibold">DB (KB)</th>
                      <th className="px-4 py-3 font-semibold">Total (MB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {companyUsageRows.map((row) => (
                      <tr key={row.company_id}>
                        <td className="px-4 py-3">{row.company_name}</td>
                        <td className="px-4 py-3">{row.organization_name || "Unassigned"}</td>
                        <td className="px-4 py-3">{formatNumber(row.storage_usage_mb)}</td>
                        <td className="px-4 py-3">{formatNumber(row.db_row_size_kb)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {formatNumber(row.total_usage_mb)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
