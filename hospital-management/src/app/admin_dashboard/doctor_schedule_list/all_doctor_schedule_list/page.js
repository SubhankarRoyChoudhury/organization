"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getAllDoctorSchedules,
  get_Hospital_User_Login_Details,
  updateDoctorSchedule,
} from "@/app/api/apiService";

const LoadingState = () => (
  <div className="p-10 text-center text-sm text-gray-500">
    Loading doctor schedules...
  </div>
);

const EmptyState = () => (
  <div className="p-10 text-center text-sm text-gray-500">
    No doctor schedules found yet.
  </div>
);

export default function AllDoctorScheduleList() {
  const [companyId, setCompanyId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [editingIsAvailable, setEditingIsAvailable] = useState(false);
  const [rowActionError, setRowActionError] = useState(null);
  const [rowLoadingId, setRowLoadingId] = useState(null);
  const router = useRouter();

  const fetchUserDetails = useCallback(async () => {
    try {
      const username =
        typeof window !== "undefined" ? localStorage.getItem("username") : null;
      if (!username) {
        setError("Missing login context. Please sign in again.");
        setIsLoading(false);
        return;
      }
      const details = await get_Hospital_User_Login_Details(username);
      if (!details?.company_id) {
        setError("Unable to determine your company.");
        setIsLoading(false);
        return;
      }
      setCompanyId(details.company_id);
    } catch (err) {
      console.error("Error fetching user details:", err);
      setError("Failed to load your company details. Try again later.");
      setIsLoading(false);
    }
  }, []);

  const transformSchedules = useCallback((items = []) => {
    const rows = [];
    const normalizeSlotIds = (value) => {
      if (Array.isArray(value)) {
        return value
          .map((slot) => Number(slot))
          .filter((slot) => Number.isFinite(slot));
      }
      if (value === undefined || value === null || value === "") return [];
      const parsed = Number(value);
      return Number.isFinite(parsed) ? [parsed] : [];
    };

    const normalizeLabels = (value) => {
      if (Array.isArray(value)) return value.filter(Boolean);
      if (value === undefined || value === null) return [];
      return [value];
    };

    items.forEach((item) => {
      const readable = item.readable_schedule || item.readable_slots || {};
      const daySlots = item.available_day_slots || {};
      const daysSet = new Set([
        ...Object.keys(readable || {}),
        ...Object.keys(daySlots || {}),
      ]);
      const days = Array.from(daysSet);
      if (days.length === 0) {
        rows.push({
          id: item.id,
          schedule_id: item.id,
          doctor: item.doctor,
          doctor_name: item.doctor_name,
          doctor_type_name: item.doctor_type_name,
          department_name: item.doctor_department,
          association_type: item.association_type,
          day: "—",
          time_slot_display: "—",
          slot_id: null,
          is_available: item.is_available,
        });
        return;
      }
      days.forEach((day) => {
        const slotIds = normalizeSlotIds(daySlots[day]);
        const labels = normalizeLabels(readable[day]);
        const iterations = Math.max(slotIds.length, labels.length, 1);
        for (let idx = 0; idx < iterations; idx += 1) {
          rows.push({
            id: `${item.id}-${day}-${idx}`,
            base_id: item.id,
            schedule_id: item.id,
            doctor: item.doctor,
            doctor_name: item.doctor_name,
            doctor_type_name: item.doctor_type_name,
            department_name: item.doctor_department,
            association_type: item.association_type,
            day,
            time_slot_display: labels[idx] ?? labels[0] ?? "—",
            slot_id: slotIds[idx] ?? slotIds[0] ?? null,
            is_available: item.is_available,
          });
        }
      });
    });
    return rows;
  }, []);

  const fetchSchedules = useCallback(
    async (company) => {
      if (!company) return;
      setIsLoading(true);
      try {
        const response = await getAllDoctorSchedules(company);
        setSchedules(transformSchedules(response));
        setError(null);
      } catch (err) {
        console.error("Failed to load doctor schedules:", err);
        setError("Unable to load doctor schedules. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    },
    [transformSchedules]
  );

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  useEffect(() => {
    if (companyId) {
      fetchSchedules(companyId);
    }
  }, [companyId, fetchSchedules]);

  const startEditing = (row) => {
    setEditingScheduleId(row.schedule_id);
    setEditingIsAvailable(Boolean(row.is_available));
    setRowActionError(null);
  };

  const cancelEditing = () => {
    setEditingScheduleId(null);
    setEditingIsAvailable(false);
    setRowActionError(null);
    setRowLoadingId(null);
  };

  const handleUpdateAvailability = async () => {
    if (!editingScheduleId || !companyId) return;
    setRowLoadingId(editingScheduleId);
    try {
      await updateDoctorSchedule(editingScheduleId, companyId, {
        is_available: editingIsAvailable,
      });
      await fetchSchedules(companyId);
      cancelEditing();
    } catch (err) {
      console.error("Failed to update schedule:", err);
      const apiError =
        err.response?.data?.errors ||
        err.response?.data?.error ||
        err.message ||
        "Unable to update schedule.";
      setRowActionError(
        typeof apiError === "string" ? apiError : "Unable to update schedule."
      );
    } finally {
      setRowLoadingId(null);
    }
  };

  const handleEditRedirect = (schedule) => {
    if (!schedule?.doctor) return;
    router.push(
      `/admin_dashboard/doctor_schedule_list/doctor_schedule?doctor_id=${schedule.doctor}`
    );
  };

  const renderedRows = useMemo(() => schedules, [schedules]);

  return (
    <div className="h-full w-full bg-gradient-to-br from-[#f9fafc] to-[#eef3f9] overflow-hidden">
      <div className="flex flex-col h-full overflow-hidden px-6 py-6 box-border">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-900">
            All Doctor Schedule List
          </h1>
          {/* <p className="text-sm text-gray-500">
            Review registered doctor schedules and open them for editing.
          </p> */}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-gray-100 bg-white shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          {isLoading ? (
            <LoadingState />
          ) : renderedRows.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex-1 overflow-auto min-h-0">
              <table className="min-w-[900px] w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-[14px] font-semibold uppercase tracking-wide text-gray-500">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-[14px] font-semibold uppercase tracking-wide text-gray-500">
                      Doctor
                    </th>
                    <th className="px-4 py-3 text-left text-[14px] font-semibold uppercase tracking-wide text-gray-500">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-[14px] font-semibold uppercase tracking-wide text-gray-500">
                      Day
                    </th>
                    <th className="px-4 py-3 text-left text-[14px] font-semibold uppercase tracking-wide text-gray-500">
                      Time Slot
                    </th>
                    <th className="px-4 py-3 text-left text-[14px] font-semibold uppercase tracking-wide text-gray-500">
                      Association
                    </th>
                    <th className="px-4 py-3 text-left text-[14px] font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-[14px] font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {renderedRows.map((row, index) => {
                    const isEditing = editingScheduleId === row.schedule_id;
                    return (
                      <tr
                        key={`${row.id}-${index}`}
                        className="hover:bg-gray-50/60"
                      >
                        <td className="px-4 py-3 text-gray-500 text-[15px]">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-gray-900 text-[15px]">
                          <div className="font-semibold">
                            {row.doctor_name || `Doctor #${row.doctor}`}
                          </div>
                          {row.doctor_type_name && (
                            <p className="text-xs text-gray-500">
                              {row.doctor_type_name}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-[15px]">
                          {row.department_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-[15px]">
                          {row.day}
                        </td>
                        <td className="px-4 py-3 text-gray-800 text-[15px]">
                          {row.time_slot_display || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-[15px]">
                          {row.association_type || "—"}
                        </td>
                        <td className="px-4 py-3   text-[15px]">
                          {isEditing ? (
                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={editingIsAvailable}
                                onChange={(event) =>
                                  setEditingIsAvailable(event.target.checked)
                                }
                              />
                              {editingIsAvailable ? "Active" : "Inactive"}
                            </label>
                          ) : row.is_available ? (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-[14px] font-semibold text-green-600 text-[15px]">
                              Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-[14px] font-semibold text-red-600 text-[15px]">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                disabled={rowLoadingId === editingScheduleId}
                                onClick={handleUpdateAvailability}
                                className="rounded-full border border-green-100 bg-green-50 px-3 py-1 text-[14px] font-semibold text-green-600 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {rowLoadingId === editingScheduleId
                                  ? "Updating..."
                                  : "Update"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditing}
                                className="rounded-full border border-gray-200 px-3 py-1 text-[14px] font-semibold text-gray-500 transition hover:bg-gray-100"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center  justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditing(row)}
                                className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[14px] font-semibold text-blue-600 transition hover:bg-blue-100"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditRedirect(row)}
                                className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[14px] font-semibold text-indigo-600 transition hover:bg-indigo-100"
                              >
                                View
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {rowActionError && (
          <div className="mt-4 rounded-xl border border-yellow-100 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            {rowActionError}
          </div>
        )}
      </div>
    </div>
  );
}
