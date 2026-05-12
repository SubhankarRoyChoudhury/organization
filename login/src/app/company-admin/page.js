"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearLoginSession,
  getCompanyInfo,
  getOrganizationUsers,
} from "@/app/api/apiService";
import { formatDateValue, syncLocaleSettingsFromPayload } from "@/lib/companyLocale";

const resolveCompanyInfo = (response) => {
  const info =
    response?.response?.company_info ||
    response?.response?.companyInfo ||
    response?.company_info ||
    response?.companyInfo ||
    response?.company_details ||
    {};
  return info || {};
};

export default function CompanyAdminPage() {
  const router = useRouter();
  const [companyInfo, setCompanyInfo] = useState({});
  const [companyUsers, setCompanyUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState("");
  const [usersError, setUsersError] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadCompanyInfo = async () => {
      try {
        setLoading(true);
        setError("");
        setUsersLoading(true);
        setUsersError("");
        const companyId =
          localStorage.getItem("company_id") ||
          localStorage.getItem("organization_id") ||
          "";
        if (!companyId) {
          throw new Error("Missing company id.");
        }
        const [companyResponse, usersResponse] = await Promise.all([
          getCompanyInfo(companyId),
          getOrganizationUsers({ organization_id: companyId }),
        ]);
        if (!mounted) {
          return;
        }
        syncLocaleSettingsFromPayload(companyResponse);
        setCompanyInfo(resolveCompanyInfo(companyResponse));
        setCompanyUsers(Array.isArray(usersResponse) ? usersResponse : []);
      } catch (err) {
        if (mounted) {
          setError("Unable to load company details.");
          setUsersError("Unable to load company users.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setUsersLoading(false);
        }
      }
    };

    loadCompanyInfo();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {
    clearLoginSession();
    router.replace("/login");
  };

  const details = [
    {
      label: "Company name",
      value: companyInfo.organization_name || companyInfo.company_name || "-",
    },
    {
      label: "Company ID",
      value:
        companyInfo.organization_id ||
        companyInfo.company_id ||
        companyInfo.id ||
        "-",
    },
    { label: "Admin name", value: companyInfo.admin_name || "-" },
    { label: "Admin user", value: companyInfo.admin_user_name || "-" },
    { label: "Email", value: companyInfo.email || "-" },
    { label: "Phone", value: companyInfo.phone_number || "-" },
    { label: "Address", value: companyInfo.address || "-" },
    { label: "City", value: companyInfo.city || "-" },
    { label: "State", value: companyInfo.state || "-" },
    { label: "Country", value: companyInfo.country || "-" },
    {
      label: "Postal code",
      value: companyInfo.postal_code || companyInfo.pin || "-",
    },
    {
      label: "Approved",
      value: companyInfo.is_approved === true ? "Yes" : "No",
    },
    { label: "Delisted", value: companyInfo.delist === true ? "Yes" : "No" },
    { label: "Active until", value: formatDateValue(companyInfo.active_upto) },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 px-4 py-6 lg:px-6">
      <div className="mx-auto flex w-full max-w-[1400px] gap-6">
        <aside className="hidden w-72 shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:block">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-sm" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Company Admin</p>
              <p className="text-xs text-slate-500">Control Center</p>
            </div>
          </div>
          <nav className="space-y-2">
            <button
              className="w-full rounded-xl bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-700"
              type="button"
              onClick={() => router.push("/company-admin")}
            >
              Dashboard
            </button>
            <button
              className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              type="button"
              onClick={() => router.push("/category")}
            >
              Organization Console
            </button>
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                Welcome back
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
                Company Admin Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                View the company details linked to your account.
              </p>
            </div>
            <div className="flex items-center">
              <div className="relative">
                <button
                  className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left shadow-sm"
                  type="button"
                  onClick={() => setProfileMenuOpen((open) => !open)}
                >
                  <span className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Company Admin</p>
                    <p className="text-xs text-slate-500">Admin Access</p>
                  </div>
                </button>
                {profileMenuOpen ? (
                  <div
                    className="absolute right-0 z-30 mt-2 min-w-[180px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
                    role="menu"
                  >
                    <button
                      className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      type="button"
                      onClick={() => router.push("/category")}
                    >
                      Back to console
                    </button>
                    <button
                      className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                      type="button"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <div className="grid gap-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Company Overview</h2>
                  <p className="text-sm text-slate-500">
                    Details for the company linked to your login.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  Live
                </span>
              </div>
              {loading ? (
                <p className="text-sm text-slate-500">Loading company details...</p>
              ) : error ? (
                <p className="text-sm text-slate-500">{error}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Company
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">
                      {companyInfo.organization_name ||
                        companyInfo.company_name ||
                        "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Approved
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">
                      {companyInfo.is_approved === true ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Active Until
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">
                      {formatDateValue(companyInfo.active_upto)}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Company Details</h2>
              {loading ? (
                <p className="text-sm text-slate-500">Loading details...</p>
              ) : error ? (
                <p className="text-sm text-slate-500">{error}</p>
              ) : (
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-3 py-3 text-left font-semibold text-slate-700">Field</th>
                        <th className="px-3 py-3 text-left font-semibold text-slate-700">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.map((row) => (
                        <tr key={row.label} className="border-b border-slate-100">
                          <td className="px-3 py-3 text-slate-600">{row.label}</td>
                          <td className="px-3 py-3 text-slate-900">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Company Users</h2>
              {usersLoading ? (
                <p className="text-sm text-slate-500">Loading users...</p>
              ) : usersError ? (
                <p className="text-sm text-slate-500">{usersError}</p>
              ) : companyUsers.length === 0 ? (
                <p className="text-sm text-slate-500">No users found for this company.</p>
              ) : (
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-3 py-3 text-left font-semibold text-slate-700">Name</th>
                        <th className="px-3 py-3 text-left font-semibold text-slate-700">Username</th>
                        <th className="px-3 py-3 text-left font-semibold text-slate-700">Email</th>
                        <th className="px-3 py-3 text-left font-semibold text-slate-700">Phone</th>
                        <th className="px-3 py-3 text-left font-semibold text-slate-700">Role</th>
                        <th className="px-3 py-3 text-left font-semibold text-slate-700">Delisted</th>
                        <th className="px-3 py-3 text-left font-semibold text-slate-700">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyUsers.map((user) => (
                        <tr key={user.id || user.username} className="border-b border-slate-100">
                          <td className="px-3 py-3 text-slate-900">{user.name || "-"}</td>
                          <td className="px-3 py-3 text-slate-600">{user.username || "-"}</td>
                          <td className="px-3 py-3 text-slate-600">{user.email || "-"}</td>
                          <td className="px-3 py-3 text-slate-600">{user.phone_number || user.mobile || "-"}</td>
                          <td className="px-3 py-3 text-slate-600">{user.role || "-"}</td>
                          <td className="px-3 py-3 text-slate-600">{user.delist ? "Yes" : "No"}</td>
                          <td className="px-3 py-3 text-slate-600">
                            {formatDateValue(user.created_on)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
