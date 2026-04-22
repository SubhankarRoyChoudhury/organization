"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOrganizationSchools } from "@/app/api/apiService";

const formatDate = (value) => {
  if (!value) {
    return "-";
  }
  try {
    return new Date(value).toISOString().split("T")[0];
  } catch (err) {
    return "-";
  }
};

export default function OrganizationAdminSchoolListPage() {
  const router = useRouter();
  const [schools, setSchools] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSchools = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getOrganizationSchools();
      setSchools(Array.isArray(response?.schools) ? response.schools : []);
      setTotal(
        typeof response?.total === "number"
          ? response.total
          : Array.isArray(response?.schools)
          ? response.schools.length
          : 0,
      );
    } catch (err) {
      setError("Unable to load the school list.");
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  const renderTable = () => {
    if (loading) {
      return <p className="text-sm text-slate-500">Loading schools...</p>;
    }
    if (error) {
      return (
        <p className="text-sm font-medium text-rose-600">
          {error}
        </p>
      );
    }
    if (schools.length === 0) {
      return <p className="text-sm text-slate-500">No schools found.</p>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-3 px-3">School</th>
              <th className="py-3 px-3">Admin</th>
              <th className="py-3 px-3">Email</th>
              <th className="py-3 px-3">Approved</th>
              <th className="py-3 px-3">Active from</th>
              <th className="py-3 px-3">Active upto</th>
              <th className="py-3 px-3">Registered</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => (
              <tr
                key={school.id}
                className="border-b border-slate-100 last:border-b-0"
              >
                <td className="py-3 px-3 font-medium text-slate-900">
                  {school.company_name || "—"}
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {school.admin_name || "—"}
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {school.email || "—"}
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      school.is_approved
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {school.is_approved ? "Yes" : "Pending"}
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {formatDate(school.active_from)}
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {formatDate(school.active_upto)}
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {formatDate(school.registrationDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[2px] text-slate-400">
                Organization Admin
              </p>
              <h1 className="text-2xl font-semibold text-slate-900">
                School accounts (Schools)
              </h1>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push("/organization-admin")}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
              >
                Back to dashboard
              </button>
              <button
                type="button"
                onClick={loadSchools}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Refresh
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            The list shows only companies from your organization whose sub-category is &quot;School&quot;.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[1px] text-slate-400">
                Total schools
              </p>
              <p className="text-3xl font-semibold text-slate-900">
                {total ?? "-"}
              </p>
            </div>
            <p className="text-sm text-slate-500">
              Showing the current roster of School sub-category companies.
            </p>
          </div>
          <div className="mt-6">{renderTable()}</div>
        </section>
      </div>
    </main>
  );
}
