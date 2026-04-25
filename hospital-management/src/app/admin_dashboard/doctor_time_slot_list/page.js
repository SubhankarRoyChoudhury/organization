"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createTimeSlot,
  getAllTimeSlots,
  get_Hospital_User_Login_Details,
  updateTimeSlot,
} from "@/app/api/apiService";
import ActionMenu from "@/components/ui/ActionMenu";
import DialogCreateTimeSlot from "@/components/ui/DialogCreateTimeSlot";

export default function DoctorTimeSlotListPage() {
  const [companyId, setCompanyId] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [formData, setFormData] = useState({
    start_time: "",
    end_time: "",
  });

  const isEditMode = editingSlotId !== null;

  const resolveCompanyId = (data) => {
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
    return null;
  };

  const loadTimeSlots = useCallback(async (resolvedCompanyId) => {
    setIsLoading(true);
    try {
      const rows = await getAllTimeSlots(resolvedCompanyId);
      setTimeSlots(Array.isArray(rows) ? rows : []);
      setError("");
    } catch (fetchError) {
      console.error("Failed to fetch time slots:", fetchError);
      setTimeSlots([]);
      setError("Unable to load time slots.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const username =
        typeof window !== "undefined" ? localStorage.getItem("username") : null;
      if (!username) {
        setError("Missing login context. Please sign in again.");
        setIsLoading(false);
        return;
      }
      try {
        const details = await get_Hospital_User_Login_Details(username);
        const resolvedCompanyId = resolveCompanyId(details);
        if (!resolvedCompanyId) {
          setError("Unable to determine company context.");
          setIsLoading(false);
          return;
        }
        setCompanyId(resolvedCompanyId);
        await loadTimeSlots(resolvedCompanyId);
      } catch (detailsError) {
        console.error("Failed to load user details:", detailsError);
        setError("Unable to load user details.");
        setIsLoading(false);
      }
    };
    initialize();
  }, [loadTimeSlots]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const normalizeInputTime = (timeValue) => {
    const value = String(timeValue || "");
    if (!value.includes(":")) return "";
    const [hour = "", minute = ""] = value.split(":");
    if (!hour || !minute) return "";
    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  };

  const closeDialog = () => {
    if (isSaving) return;
    setIsDialogOpen(false);
    setEditingSlotId(null);
    setFormError("");
    setFormData({ start_time: "", end_time: "" });
  };

  const openCreateDialog = () => {
    setEditingSlotId(null);
    setFormError("");
    setFormData({ start_time: "", end_time: "" });
    setIsDialogOpen(true);
  };

  const handleEditSlot = (slot) => {
    if (!slot?.id) return;
    setEditingSlotId(slot.id);
    setFormError("");
    setFormData({
      start_time: normalizeInputTime(slot.start_time),
      end_time: normalizeInputTime(slot.end_time),
    });
    setIsDialogOpen(true);
  };

  const handleSubmitTimeSlot = async (event) => {
    event.preventDefault();

    if (!companyId) {
      setFormError("Missing company context.");
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      setFormError("Start time and end time are required.");
      return;
    }
    if (formData.end_time <= formData.start_time) {
      setFormError("End time must be after start time.");
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      const payload = {
        start_time: formData.start_time,
        end_time: formData.end_time,
      };
      if (isEditMode) {
        await updateTimeSlot(editingSlotId, payload, companyId);
      } else {
        await createTimeSlot(payload, companyId);
      }
      await loadTimeSlots(companyId);
      setIsDialogOpen(false);
      setEditingSlotId(null);
      setFormData({ start_time: "", end_time: "" });
    } catch (saveError) {
      const apiError =
        saveError?.response?.data?.errors?.end_time?.[0] ||
        saveError?.response?.data?.errors?.start_time?.[0] ||
        saveError?.response?.data?.detail ||
        saveError?.response?.data?.error ||
        (isEditMode ? "Unable to update time slot." : "Unable to create time slot.");
      setFormError(
        typeof apiError === "string"
          ? apiError
          : isEditMode
            ? "Unable to update time slot."
            : "Unable to create time slot.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const sortedTimeSlots = useMemo(
    () =>
      [...timeSlots].sort((a, b) =>
        String(a.start_time).localeCompare(String(b.start_time)),
      ),
    [timeSlots],
  );

  return (
    <section className="min-h-screen bg-slate-50 p-6">
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Doctor Time Slots</h1>
            <p className="text-sm text-slate-500">
              Manage reusable time slots for doctor schedules.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateDialog}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
          >
            Create Time Slot
          </button>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {isLoading ? (
            <p className="p-6 text-sm text-slate-500">Loading time slots...</p>
          ) : sortedTimeSlots.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">
              No time slots available. Create your first one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
                <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">SL No.</th>
                    <th className="px-4 py-3 text-left">Company</th>
                    <th className="px-4 py-3 text-left">Start Time</th>
                    <th className="px-4 py-3 text-left">End Time</th>
                    <th className="px-4 py-3 text-left">Display Time</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedTimeSlots.map((slot, index) => (
                    <tr key={slot.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {slot.company_name || "—"}
                      </td>
                      <td className="px-4 py-3">{slot.start_time || "—"}</td>
                      <td className="px-4 py-3">{slot.end_time || "—"}</td>
                      <td className="px-4 py-3">{slot.display_time || "—"}</td>
                      <td className="px-4 py-3">
                        <ActionMenu
                          items={[
                            {
                              label: "Edit",
                              onClick: () => handleEditSlot(slot),
                            },
                          ]}
                          buttonLabel={`Open actions for slot ${slot.id}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <DialogCreateTimeSlot
        isOpen={isDialogOpen}
        isSaving={isSaving}
        formData={formData}
        formError={formError}
        mode={isEditMode ? "edit" : "create"}
        onClose={closeDialog}
        onSubmit={handleSubmitTimeSlot}
        onChange={handleFormChange}
      />
    </section>
  );
}
