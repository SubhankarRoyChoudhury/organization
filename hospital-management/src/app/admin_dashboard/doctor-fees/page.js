"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { createPortal } from "react-dom";
import {
  get_Hospital_User_Login_Details,
  getAllDoctors,
  getApprovedDepartments,
  getApprovedDoctorTypes,
  getDoctorFees,
  createDoctorFees,
  updateDoctorFees,
  delistDoctorFees,
} from "@/app/api/apiService";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export default function DoctorFeesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <DoctorFeesContent />
    </Suspense>
  );
}

function DoctorFeesContent() {
  const searchParams = useSearchParams();
  const [companyId, setCompanyId] = useState(null);
  const [loggedInDetails, setLoggedInDetails] = useState(null);
  const [doctorFees, setDoctorFees] = useState([]);
  const [doctorOptions, setDoctorOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [doctorTypeOptions, setDoctorTypeOptions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeFeeId, setActiveFeeId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [rowActionLoadingId, setRowActionLoadingId] = useState(null);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [actionMenuRect, setActionMenuRect] = useState(null);
  const hasPrefilledFromQuery = useRef(false);
  const [formData, setFormData] = useState({
    doctor: "",
    department: "",
    doctor_type: "",
    fees: "",
  });

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
    if (!username) return;
    get_Hospital_User_Login_Details(username)
      .then((data) => {
        setLoggedInDetails(data);
        const resolvedCompanyId = resolveCompanyId(data);
        console.log("data", data);
        console.log("data", resolvedCompanyId);

        if (resolvedCompanyId) {
          setCompanyId(resolvedCompanyId);
          return;
        }
        setFormError("Unable to determine company context.");
      })
      .catch(() => setFormError("Failed to load user information."));
  }, []);

  useEffect(() => {
    if (!companyId) return;
    loadDropdowns(companyId);
    fetchDoctorFees(companyId);
  }, [companyId]);

  const prefillDoctor = searchParams?.get("doctor") || "";
  const prefillDepartment = searchParams?.get("department") || "";
  const prefillDoctorType = searchParams?.get("doctor_type") || "";
  const shouldOpenFromQuery =
    searchParams?.get("modal") === "add" ||
    prefillDoctor ||
    prefillDepartment ||
    prefillDoctorType;

  useEffect(() => {
    if (!shouldOpenFromQuery || hasPrefilledFromQuery.current) return;
    setIsModalOpen(true);
    setFormError("");
    setFormData((prev) => ({
      ...prev,
      doctor: prefillDoctor || prev.doctor,
      department: prefillDepartment || prev.department,
      doctor_type: prefillDoctorType || prev.doctor_type,
    }));
    hasPrefilledFromQuery.current = true;
  }, [
    shouldOpenFromQuery,
    prefillDoctor,
    prefillDepartment,
    prefillDoctorType,
  ]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("[data-fees-action-menu]")) {
        setOpenActionMenuId(null);
        setActionMenuRect(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpenActionMenuId(null);
        setActionMenuRect(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!formData.doctor || formData.department) return;
    const doctorEntry = doctorOptions.find(
      (doctor) => String(doctor.id) === String(formData.doctor),
    );
    if (!doctorEntry) return;
    const departmentId =
      doctorEntry.department?.id ??
      doctorEntry.department_id ??
      doctorEntry.department ??
      "";
    const doctorTypeId =
      doctorEntry.doctor_type?.id ??
      doctorEntry.doctor_type ??
      doctorEntry.doctor_type_id ??
      "";
    setFormData((prev) => ({
      ...prev,
      department: departmentId ? String(departmentId) : prev.department,
      doctor_type: prev.doctor_type || (doctorTypeId ? String(doctorTypeId) : ""),
    }));
  }, [doctorOptions, formData.department, formData.doctor, formData.doctor_type]);

  const loadDropdowns = async (company_id) => {
    try {
      const [doctors, departments, doctorTypes] = await Promise.all([
        getAllDoctors(company_id),
        getApprovedDepartments(company_id),
        getApprovedDoctorTypes(company_id),
      ]);
      setDoctorOptions(Array.isArray(doctors) ? doctors : []);
      setDepartmentOptions(Array.isArray(departments) ? departments : []);
      setDoctorTypeOptions(Array.isArray(doctorTypes) ? doctorTypes : []);
    } catch (error) {
      console.error("Failed to load dropdown data:", error);
      setFormError("Unable to load dropdown data.");
    }
  };

  const fetchDoctorFees = async (company_id) => {
    try {
      const data = await getDoctorFees(company_id);
      setDoctorFees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load doctor fees:", error);
      setDoctorFees([]);
      setFormError("Unable to load doctor fees.");
    }
  };

  const handleOpenModal = () => {
    setIsEditMode(false);
    setActiveFeeId(null);
    setIsModalOpen(true);
    setFormError("");
    setFormData({
      doctor: "",
      department: "",
      doctor_type: "",
      fees: "",
    });
  };

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setIsEditMode(false);
    setActiveFeeId(null);
    setFormData({
      doctor: "",
      department: "",
      doctor_type: "",
      fees: "",
    });
    setFormError("");
  };

  const handleEdit = (entry) => {
    setOpenActionMenuId(null);
    setActionMenuRect(null);
    setIsEditMode(true);
    setActiveFeeId(entry.id);
    setFormData({
      doctor: entry.doctor ? String(entry.doctor) : "",
      department: entry.department ? String(entry.department) : "",
      doctor_type: entry.doctor_type ? String(entry.doctor_type) : "",
      fees:
        entry.fees === undefined || entry.fees === null ? "" : String(entry.fees),
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    if (name === "department") {
      setFormData((prev) => ({
        ...prev,
        department: value,
        doctor: "",
        doctor_type: "",
      }));
      return;
    }
    if (name === "doctor") {
      const doctorEntry = doctorOptions.find(
        (doctor) => String(doctor.id) === String(value),
      );
      setFormData((prev) => ({
        ...prev,
        doctor: value,
        doctor_type: doctorEntry?.doctor_type
          ? String(doctorEntry.doctor_type)
          : prev.doctor_type,
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const filteredDoctorOptions = useMemo(() => {
    if (!formData.department) return doctorOptions;
    return doctorOptions.filter(
      (doctor) =>
        String(doctor.department) === String(formData.department) ||
        String(doctor.department_id) === String(formData.department) ||
        String(doctor.department?.id) === String(formData.department),
    );
  }, [doctorOptions, formData.department]);

  const handleSave = async (event) => {
    event.preventDefault();
    const resolvedCompanyId =
      companyId ||
      sanitizeCompanyId(
        typeof window !== "undefined"
          ? localStorage.getItem("company_id")
          : null,
      );
    if (!resolvedCompanyId) {
      setFormError("Unable to determine company context.");
      return;
    }
    if (!formData.doctor || !formData.department || !formData.doctor_type) {
      setFormError("Please select doctor, department, and doctor type.");
      return;
    }
    if (!formData.fees || Number(formData.fees) <= 0) {
      setFormError("Fees must be greater than zero.");
      return;
    }
    setFormError("");
    setIsSaving(true);
    try {
      const createdBy =
        loggedInDetails?.user?.name ||
        loggedInDetails?.user?.username ||
        loggedInDetails?.username ||
        "unknown";
      const updatedBy = createdBy;
      const payload = {
        doctor: Number(formData.doctor),
        department: Number(formData.department),
        doctor_type: Number(formData.doctor_type),
        fees: Number(formData.fees),
        ...(isEditMode
          ? { updated_by: updatedBy }
          : { created_by: createdBy }),
      };
      if (isEditMode && activeFeeId) {
        const updated = await updateDoctorFees(
          activeFeeId,
          payload,
          resolvedCompanyId,
        );
        setDoctorFees((prev) =>
          prev.map((entry) => (entry.id === activeFeeId ? updated : entry)),
        );
      } else {
        const created = await createDoctorFees(payload, resolvedCompanyId);
        setDoctorFees((prev) => [created, ...prev]);
      }
      handleCloseModal();
    } catch (error) {
      setFormError(
        error.response?.data?.errors?.non_field_errors?.[0] ||
          error.response?.data?.errors?.doctor?.[0] ||
          error.response?.data?.errors?.department?.[0] ||
          error.response?.data?.errors?.doctor_type?.[0] ||
          error.response?.data?.errors?.fees?.[0] ||
          error.response?.data?.errors ||
          error.response?.data?.detail ||
          "Unable to save doctor fees.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelist = async (entry) => {
    setOpenActionMenuId(null);
    setActionMenuRect(null);
    if (!companyId) {
      setFormError("Unable to determine company context.");
      return;
    }
    const confirmed = window.confirm(
      `Delist fee record for ${entry.doctor_name || "this doctor"}?`,
    );
    if (!confirmed) return;
    setRowActionLoadingId(entry.id);
    try {
      const delistedBy =
        loggedInDetails?.user?.name ||
        loggedInDetails?.user?.username ||
        loggedInDetails?.username ||
        "";
      await delistDoctorFees(entry.id, companyId, delistedBy);
      setDoctorFees((prev) => prev.filter((item) => item.id !== entry.id));
    } catch (error) {
      setFormError(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          "Unable to delist doctor fee record.",
      );
    } finally {
      setRowActionLoadingId(null);
    }
  };

  return (
    <section className="min-h-screen bg-slate-50 p-6">
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Doctor Fees</h1>
            <p className="text-sm text-slate-500">
              Overview of consultation fees by doctor, department, and role.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenModal}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
          >
            Add Fees
          </button>
        </header>

        <div className="rounded-2xl bg-white shadow-sm">
          {formError && !isModalOpen && (
            <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm font-medium text-red-600">
              {String(formError)}
            </div>
          )}
          {doctorFees.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">
              No doctor fee records available.
            </p>
          ) : (
            <div className="max-h-[68vh] overflow-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
                <thead className="sticky top-0 z-10 bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left whitespace-nowrap">SL No.</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Doctor</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Department</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Doctor Type</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Fees</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctorFees.map((entry, index) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {entry.doctor_name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {entry.department_name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {entry.doctor_type_name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(Number(entry.fees) || 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div
                          className="relative inline-block"
                          data-fees-action-menu
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              const rect = event.currentTarget.getBoundingClientRect();
                              const menuWidth = 140;
                              const menuHeight = 164;
                              const margin = 8;
                              let left = rect.right - menuWidth;
                              left = Math.max(
                                margin,
                                Math.min(left, window.innerWidth - menuWidth - margin),
                              );
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const shouldOpenUp = spaceBelow < menuHeight;
                              const top = shouldOpenUp
                                ? Math.max(margin, rect.top - menuHeight - 6)
                                : Math.min(
                                    rect.bottom + 6,
                                    window.innerHeight - menuHeight - margin,
                                  );
                              setOpenActionMenuId((prev) => {
                                const next = prev === entry.id ? null : entry.id;
                                if (next) {
                                  setActionMenuRect({ top, left, width: menuWidth });
                                } else {
                                  setActionMenuRect(null);
                                }
                                return next;
                              });
                            }}
                            disabled={rowActionLoadingId === entry.id}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
                            aria-label="Open actions menu"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {openActionMenuId &&
        actionMenuRect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
            style={{
              position: "fixed",
              top: actionMenuRect.top,
              left: actionMenuRect.left,
              width: actionMenuRect.width,
              zIndex: 70,
            }}
            data-fees-action-menu
          >
            <button
              type="button"
              className="block w-full px-4 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => {
                const entry = doctorFees.find((item) => item.id === openActionMenuId);
                if (entry) handleEdit(entry);
              }}
            >
              Review
            </button>
            <button
              type="button"
              className="block w-full px-4 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => {
                const entry = doctorFees.find((item) => item.id === openActionMenuId);
                if (entry) handleEdit(entry);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="block w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              onClick={() => {
                const entry = doctorFees.find((item) => item.id === openActionMenuId);
                if (entry) handleDelist(entry);
              }}
            >
              Delist
            </button>
          </div>,
          document.body,
        )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl sm:max-h-[90vh] sm:overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {isEditMode ? "Edit Doctor Fees" : "Add Doctor Fees"}
                </h2>
                <p className="text-sm text-slate-500">
                  Assign or update consultation fees for a doctor.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                disabled={isSaving}
              >
                <span className="text-lg">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-slate-600">
                  Department
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleFormChange}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                    required
                  >
                    <option value="">Select department</option>
                    {departmentOptions.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-slate-600">
                  Doctor
                  <select
                    name="doctor"
                    value={formData.doctor}
                    onChange={handleFormChange}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                    required
                    disabled={!formData.department}
                  >
                    <option value="">
                      {formData.department
                        ? "Select doctor"
                        : "Select department first"}
                    </option>
                    {filteredDoctorOptions.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.full_name ||
                          doctor.name ||
                          `Doctor #${doctor.id}`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-slate-600">
                  Doctor Type
                  <select
                    name="doctor_type"
                    value={formData.doctor_type}
                    onChange={handleFormChange}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                    required
                  >
                    <option value="">Select doctor type</option>
                    {doctorTypeOptions.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-slate-600">
                  Consultation Fees
                  <input
                    type="number"
                    name="fees"
                    value={formData.fees}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                    placeholder="Enter consultation fee"
                    required
                  />
                </label>
              </div>

              {formError && (
                <p className="text-sm font-medium text-red-500">{formError}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : isEditMode
                      ? "Update Fees"
                      : "Save Fees"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
