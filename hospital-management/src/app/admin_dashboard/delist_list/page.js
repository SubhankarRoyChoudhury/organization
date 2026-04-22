"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  get_Hospital_User_Login_Details,
  getDelistedCompanyUsers,
  restoreDelistedCompanyUser,
} from "@/app/api/apiService";
import { CheckSquare, X } from "lucide-react";

const roleFilters = [
  { value: "all", label: "All" },
  { value: "doctor", label: "Doctor" },
  { value: "administration", label: "Administrator" },
  { value: "staff", label: "Staff" },
];

const formatDate = (value) => {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch (error) {
    return value;
  }
};

const resolveCompanyId = (data) => {
  const direct = Number(data);
  if (Number.isInteger(direct) && direct > 0) return direct;
  const candidates = [
    data?.company_id,
    data?.user?.company_id,
    data?.companies?.[0]?.company_id,
    data?.companies?.[0]?.id,
    data?.company?.id,
  ];
  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  if (Array.isArray(data?.companies)) {
    for (const company of data.companies) {
      const parsed = Number(company?.company_id ?? company?.id);
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
    }
  }
  return null;
};

const getRoleLabel = (role) => {
  if (!role) return "-";
  const normalized = String(role).toLowerCase();
  if (normalized === "administration") return "Administrator";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getDepartmentOrType = (user) => {
  return (
    user?.department_name ||
    user?.doctor_type_name ||
    user?.administration_type_name ||
    user?.staff_department_name ||
    user?.staff_job_title_name ||
    user?.job_title ||
    "-"
  );
};

export default function DelistList() {
  const [delistedUsers, setDelistedUsers] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [pendingRestoreUser, setPendingRestoreUser] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const fetchDelistedUsers = useCallback(
    async (companyIdToUse, role) => {
      if (!companyIdToUse) return;
      setIsLoading(true);
      try {
        const normalizedRole = role === "all" ? "" : role;
        const data = await getDelistedCompanyUsers(
          companyIdToUse,
          normalizedRole,
        );
        setDelistedUsers(Array.isArray(data) ? data : []);
        setError(null);
      } catch (fetchError) {
        console.error("Error fetching delisted users:", fetchError);
        setError("Unable to load delisted users. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const requestRestoreConfirmation = (user) => {
    setPendingRestoreUser(user);
    setIsConfirmOpen(true);
  };

  const closeRestoreConfirmation = () => {
    setIsConfirmOpen(false);
    setPendingRestoreUser(null);
  };

  const confirmRestore = async () => {
    if (!pendingRestoreUser || !companyId) return;
    setIsRestoring(true);
    try {
      await restoreDelistedCompanyUser(pendingRestoreUser.id, companyId);
      setDelistedUsers((prev) =>
        prev.filter((item) => item.id !== pendingRestoreUser.id),
      );
      closeRestoreConfirmation();
    } catch (restoreError) {
      console.error("Error restoring user:", restoreError);
      setError("Unable to restore user. Please try again.");
    } finally {
      setIsRestoring(false);
    }
  };

  useEffect(() => {
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (!username) {
      setError("Missing login context. Please sign in again.");
      setIsLoading(false);
      return;
    }
    const loadUser = async () => {
      try {
        const data = await get_Hospital_User_Login_Details(username);
        const resolvedCompanyId = resolveCompanyId(data);
        if (!resolvedCompanyId) {
          setError("Unable to determine your company. Please contact support.");
          setIsLoading(false);
          return;
        }
        setCompanyId(resolvedCompanyId);
      } catch (fetchError) {
        console.error("Error fetching user details:", fetchError);
        setError("Failed to load user details. Please try again later.");
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!companyId) return;
    fetchDelistedUsers(companyId, roleFilter);
  }, [companyId, roleFilter, fetchDelistedUsers]);

  const tableRows = useMemo(() => {
    return delistedUsers.map((user) => ({
      id: user.id,
      user,
      name: user.full_name || user.name || "-",
      role: getRoleLabel(user.role),
      email: user.email || "-",
      phone: user.phone || user.mobile || "-",
      deptType: getDepartmentOrType(user),
      delistedBy: user.delisted_by || "-",
      delistedOn: formatDate(user.delisted_on),
    }));
  }, [delistedUsers]);

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Delisted Users
          </h1>
          <p className="text-sm text-gray-500">
            Review all delisted staff, administrators, and doctors.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {roleFilters.map((role) => (
            <button
              key={role.value}
              onClick={() => setRoleFilter(role.value)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                roleFilter === role.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
              type="button"
            >
              {role.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500">Loading...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : tableRows.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No delisted users found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Department / Type
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Delisted By
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Delisted On
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.role}</td>
                    <td className="px-4 py-3 text-gray-700">{row.email}</td>
                    <td className="px-4 py-3 text-gray-700">{row.phone}</td>
                    <td className="px-4 py-3 text-gray-700">{row.deptType}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {row.delistedBy}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {row.delistedOn}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => requestRestoreConfirmation(row.user)}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                      >
                        <CheckSquare size={16} />
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isConfirmOpen && pendingRestoreUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <CheckSquare size={18} className="text-emerald-600" />
                  Approve{" "}
                  <span className="font-semibold text-emerald-700">
                    {pendingRestoreUser.full_name ||
                      pendingRestoreUser.name ||
                      "user"}
                  </span>
                </h2>
              </div>
              <button
                type="button"
                onClick={closeRestoreConfirmation}
                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close confirmation"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 text-sm text-gray-600">
              Restore this user and remove them from the delist list?
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={closeRestoreConfirmation}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                disabled={isRestoring}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRestore}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isRestoring}
              >
                {isRestoring ? "Approving..." : "Yes, approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
