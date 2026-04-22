"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, ChevronLeft } from "lucide-react";
import ActionMenu from "@/components/ui/ActionMenu";
import {
  get_Hospital_User_Login_Details,
  createWardRecord,
  updateWardRecord,
  getWards,
} from "@/app/api/apiService";

import SuccessDialog from "../../../SuccessDialog/page";

const GENDER_OPTIONS = [
  { value: "male", label: "Male Ward" },
  { value: "female", label: "Female Ward" },
  { value: "mixed", label: "Mixed Ward" },
];

export default function WardsPage() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [wards, setWards] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [loggedInDetails, setLoggedInDetails] = useState(null);
  const [editingWardId, setEditingWardId] = useState(null);
  const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 0 });
  const [isDraggingDialog, setIsDraggingDialog] = useState(false);
  const dialogRef = useRef(null);
  const resolvedCompanyId =
    loggedInDetails?.company_id || loggedInDetails?.companies?.[0]?.company_id;
  const dragStateRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const [formState, setFormState] = useState({
    name: "",
    gender_type: "mixed",
    status: true,
  });

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (username) fetchUserDetails(username);
  }, []);

  const filteredWards = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return wards;
    return wards.filter((ward) =>
      [ward.name, ward.ward_code, ward.gender_type_display]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [searchTerm, wards]);

  const fetchUserDetails = async (username) => {
    try {
      const data = await get_Hospital_User_Login_Details(username);
      setLoggedInDetails(data);
      const resolvedCompanyId =
        data?.company_id || data?.companies?.[0]?.company_id;
      fetchWards(resolvedCompanyId);
      setError(null);
    } catch (err) {
      console.error("Error fetching user:", err);
      setError("Failed to fetch user details.");
    }
  };

  const fetchWards = async (company_id) => {
    if (!company_id) return;
    try {
      const data = await getWards(company_id);
      setWards(data);
    } catch (err) {
      console.error("Error loading wards:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCreateWard = async (event) => {
    event.preventDefault();

    if (!formState.name.trim()) {
      setFormError("Ward name is required.");
      return;
    }

    if (!resolvedCompanyId) {
      setFormError("Missing company context. Please refresh and try again.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        name: formState.name.trim(),
        gender_type: formState.gender_type,
        status: formState.status,
      };
      if (editingWardId) {
        await updateWardRecord(editingWardId, payload, resolvedCompanyId);
      } else {
        await createWardRecord(payload, resolvedCompanyId);
      }

      closeDialog();
      setSuccessMessage(
        editingWardId ? "Ward updated successfully" : "Ward saved successfully",
      );
      setIsSuccessDialogOpen(true);
      fetchWards(resolvedCompanyId);
    } catch (creationError) {
      console.error(creationError);
      const apiError =
        creationError.response?.data?.errors ||
        creationError.response?.data?.detail ||
        "Could not create ward. Please try again.";
      setFormError(
        typeof apiError === "string" ? apiError : "Could not create ward.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSuccessDialog = () => {
    setIsSuccessDialogOpen(false);
  };

  const closeDialog = () => {
    setModalOpen(false);
    setEditingWardId(null);
    setFormState({
      name: "",
      gender_type: "mixed",
      status: true,
    });
    setFormError(null);
    setDialogPosition({ x: 0, y: 0 });
  };

  const handleEditWard = (ward) => {
    setEditingWardId(ward.id);
    setModalOpen(true);
    setFormError(null);
    setDialogPosition({ x: 0, y: 0 });
    setFormState({
      name: ward.name || "",
      gender_type: ward.gender_type || "mixed",
      status: Boolean(ward.status),
    });
  };

  const clampDialogPosition = useCallback((position) => {
    const dialog = dialogRef.current;
    if (!dialog || typeof window === "undefined") return position;
    const padding = 2;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dialogWidth = dialog.offsetWidth;
    const dialogHeight = dialog.offsetHeight;
    const maxX = Math.max(0, (viewportWidth - dialogWidth) / 2 - padding);
    const maxY = Math.max(0, (viewportHeight - dialogHeight) / 2 - padding);
    return {
      x: Math.min(maxX, Math.max(-maxX, position.x)),
      y: Math.min(maxY, Math.max(-maxY, position.y)),
    };
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    setDialogPosition({ x: 0, y: 0 });
  }, [modalOpen]);

  useEffect(() => {
    if (!isDraggingDialog) return;
    const handleMouseMove = (event) => {
      const deltaX = event.clientX - dragStateRef.current.startX;
      const deltaY = event.clientY - dragStateRef.current.startY;
      setDialogPosition(
        clampDialogPosition({
          x: dragStateRef.current.originX + deltaX,
          y: dragStateRef.current.originY + deltaY,
        }),
      );
    };
    const handleMouseUp = () => {
      setIsDraggingDialog(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [clampDialogPosition, isDraggingDialog]);

  useEffect(() => {
    if (!modalOpen) return;
    const handleResize = () => {
      setDialogPosition((prev) => clampDialogPosition(prev));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampDialogPosition, modalOpen]);

  const handleDialogDragStart = (event) => {
    event.preventDefault();
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: dialogPosition.x,
      originY: dialogPosition.y,
    };
    setIsDraggingDialog(true);
  };

  const normalizedUserType = String(loggedInDetails?.user_type || "")
    .trim()
    .toLowerCase();
  const canAccessValue = loggedInDetails?.can_access;
  const normalizedCanAccess =
    canAccessValue === true ||
    canAccessValue === "true" ||
    canAccessValue === "True" ||
    canAccessValue === 1 ||
    canAccessValue === "1"
      ? true
      : canAccessValue === false ||
          canAccessValue === "false" ||
          canAccessValue === "False" ||
          canAccessValue === 0 ||
          canAccessValue === "0"
        ? false
        : null;
  const isCompanyAdmin = normalizedUserType === "company_admin";
  const isAccessRestricted = !isCompanyAdmin && normalizedCanAccess === false;

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Go back"
                className="mt-1 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-500">
                IPD Admin
              </p>
              <h1 className="text-2xl font-bold text-slate-800">Ward List</h1>
              <p className="text-sm text-slate-500">
                Manage ward inventory and gender specific wards.
              </p>
              </div>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs uppercase text-slate-400">
                Total Wards
              </span>
              <span className="text-2xl font-semibold text-slate-800">
                {wards.length}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search Here..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2 pr-11 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring focus:ring-blue-200/40"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              // className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              disabled={isAccessRestricted}
              className={`flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition ${
                isAccessRestricted
                  ? "cursor-not-allowed opacity-60"
                  : "hover:bg-blue-700"
              }`}
            >
              <span className="text-lg">＋</span>
              Add Ward
            </button>
          </div>
        </header>

        <div className="rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4 border">Ward</th>
                  <th className="px-6 py-4 border">Code</th>
                  <th className="px-6 py-4 border">Gender</th>
                  <th className="px-6 py-4 border">Status</th>
                  <th className="px-2 py-1 border text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWards.map((ward) => (
                  <tr key={ward.id} className="text-slate-700">
                    <td className="px-6 py-4 border">
                      <p className="font-semibold text-slate-900">
                        {ward.name}
                      </p>
                    </td>
                    <td className="px-6 py-4 border font-mono text-sm text-slate-600">
                      {ward.ward_code}
                    </td>
                    <td className="px-6 py-4 border">
                      {ward.gender_type_display}
                    </td>
                    <td className="px-6 py-4 border">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          ward.status
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {ward.status ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-2 py-1 border text-center">
                      <ActionMenu
                        buttonLabel="Ward actions"
                        disabled={isAccessRestricted}
                        items={[
                          {
                            label: "Edit",
                            onClick: () => handleEditWard(ward),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
                {filteredWards.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      No wards available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4">
            <div
              ref={dialogRef}
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
              style={{
                transform: `translate(${dialogPosition.x}px, ${dialogPosition.y}px)`,
              }}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {editingWardId ? "Edit Ward" : "Add Ward"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {editingWardId
                      ? "Update ward details and gender segregation."
                      : "Provide ward details and gender segregation."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onMouseDown={handleDialogDragStart}
                    className="cursor-grab rounded-full border border-slate-200 p-2 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    aria-label="Drag dialog"
                  >
                    <GripVertical size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {formError && (
                <p className="mb-2 text-sm text-red-600">{formError}</p>
              )}
              <form className="space-y-4" onSubmit={handleCreateWard}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-600">
                    Ward Name
                    <input
                      type="text"
                      name="name"
                      value={formState.name}
                      onChange={handleChange}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-200/40"
                    />
                  </label>
                </div>
                <label className="text-sm font-medium text-slate-600">
                  Gender Type
                  <select
                    name="gender_type"
                    value={formState.gender_type}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-200/40"
                  >
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mt-5">
                  <input
                    type="checkbox"
                    name="status"
                    checked={formState.status}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Active
                </label>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-75"
                  >
                    {isSubmitting
                      ? "Saving..."
                      : editingWardId
                        ? "Update Ward"
                        : "Add Ward"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <SuccessDialog
          open={isSuccessDialogOpen}
          onClose={closeSuccessDialog}
          message={successMessage}
        />
        {error && (
          <p className="text-center text-sm text-red-500">Error: {error}</p>
        )}
      </div>
    </section>
  );
}
