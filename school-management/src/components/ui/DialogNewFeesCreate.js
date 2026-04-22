"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

function getDefaultAcademicYearId(academicYearOptions) {
  const active = (Array.isArray(academicYearOptions) ? academicYearOptions : []).find(
    (item) => Boolean(item?.is_active ?? item?.isActive),
  );
  return String(active?.id || "");
}

function getDefaultFormData(academicYearOptions) {
  return {
    classDetailsId: "",
    academicYearId: getDefaultAcademicYearId(academicYearOptions),
    admissionFee: "0",
    tuitionFee: "0",
    examFee: "0",
    annualCharge: "0",
    isActive: true,
  };
}

function buildFormDataFromFeeStructure(item, academicYearOptions) {
  const academicYearId = String(
    item?.academic_year_id ?? item?.academicYearId ?? getDefaultAcademicYearId(academicYearOptions),
  );
  return {
    classDetailsId: String(item?.class_details_id ?? item?.classDetailsId ?? ""),
    academicYearId: academicYearId === "null" ? "" : academicYearId,
    admissionFee: String(item?.admission_fee ?? item?.admissionFee ?? "0"),
    tuitionFee: String(item?.tuition_fee ?? item?.tuitionFee ?? "0"),
    examFee: String(item?.exam_fee ?? item?.examFee ?? "0"),
    annualCharge: String(item?.annual_charge ?? item?.annualCharge ?? "0"),
    isActive: Boolean(item?.is_active ?? item?.isActive ?? true),
  };
}

function getInitialFormData(mode, initialData, academicYearOptions) {
  if (mode === "edit" && initialData) {
    return buildFormDataFromFeeStructure(initialData, academicYearOptions);
  }
  return getDefaultFormData(academicYearOptions);
}

function toAmount(value) {
  const parsed = Number.parseFloat(String(value || "0").trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function formatAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "0.00";
  }
  return amount.toFixed(2);
}

export default function DialogNewFeesCreate({
  open,
  onClose,
  onCreate,
  onUpdate = null,
  initialData = null,
  mode = "create",
  companyId,
  classOptions = [],
  academicYearOptions = [],
}) {
  const isEditMode = mode === "edit";
  const [formData, setFormData] = useState(() =>
    getInitialFormData(mode, initialData, academicYearOptions),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const sortedAcademicYearOptions = useMemo(() => {
    return [...(Array.isArray(academicYearOptions) ? academicYearOptions : [])].sort(
      (left, right) => {
        const leftName = String(left?.year_name || left?.yearName || "").trim();
        const rightName = String(right?.year_name || right?.yearName || "").trim();

        const leftStartYear = Number(leftName.split("-")[0]);
        const rightStartYear = Number(rightName.split("-")[0]);

        if (Number.isFinite(leftStartYear) && Number.isFinite(rightStartYear)) {
          return leftStartYear - rightStartYear;
        }
        return leftName.localeCompare(rightName);
      },
    );
  }, [academicYearOptions]);

  const totalFees = useMemo(() => {
    const total =
      toAmount(formData.admissionFee) +
      toAmount(formData.tuitionFee) +
      toAmount(formData.examFee) +
      toAmount(formData.annualCharge);
    return formatAmount(total);
  }, [
    formData.admissionFee,
    formData.tuitionFee,
    formData.examFee,
    formData.annualCharge,
  ]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";

    const handleEscape = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [open, onClose, isSubmitting]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!String(formData.classDetailsId || "").trim()) {
      setErrorMessage("Please select class.");
      return;
    }

    const accessToken =
      typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";

    setIsSubmitting(true);
    try {
      const payload = {
        id: initialData?.id,
        classDetailsId: Number(formData.classDetailsId),
        academicYearId: formData.academicYearId ? Number(formData.academicYearId) : null,
        admissionFee: formatAmount(toAmount(formData.admissionFee)),
        tuitionFee: formatAmount(toAmount(formData.tuitionFee)),
        examFee: formatAmount(toAmount(formData.examFee)),
        annualCharge: formatAmount(toAmount(formData.annualCharge)),
        totalFees,
        frequency: "monthly",
        isActive: Boolean(formData.isActive),
        companyId: companyId || undefined,
        accessToken,
      };

      if (isEditMode && typeof onUpdate === "function") {
        await onUpdate(payload);
      } else {
        await onCreate(payload);
      }
    } catch (error) {
      setErrorMessage(error?.message || (isEditMode ? "Unable to update fees." : "Unable to create fees."));
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        onClick={isSubmitting ? undefined : onClose}
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-[1px]"
        aria-label="Close fees dialog"
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.35)]"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEditMode ? "Update Fees" : "Add New Fees"}
          </h2>
          <button
            type="button"
            onClick={isSubmitting ? undefined : onClose}
            className="rounded-md p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:px-6 sm:py-5">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Class</span>
            <select
              name="classDetailsId"
              value={formData.classDetailsId}
              onChange={handleChange}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              required
            >
              <option value="">Select class</option>
              {(Array.isArray(classOptions) ? classOptions : []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.class_name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Academic Year</span>
            <select
              name="academicYearId"
              value={formData.academicYearId}
              onChange={handleChange}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Select academic year</option>
              {sortedAcademicYearOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.year_name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Admission Fee</span>
            <input
              type="number"
              min="0"
              step="0.01"
              name="admissionFee"
              value={formData.admissionFee}
              onChange={handleChange}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Tuition Fee</span>
            <input
              type="number"
              min="0"
              step="0.01"
              name="tuitionFee"
              value={formData.tuitionFee}
              onChange={handleChange}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Exam Fee</span>
            <input
              type="number"
              min="0"
              step="0.01"
              name="examFee"
              value={formData.examFee}
              onChange={handleChange}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Annual Charge</span>
            <input
              type="number"
              min="0"
              step="0.01"
              name="annualCharge"
              value={formData.annualCharge}
              onChange={handleChange}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="flex items-center gap-2 self-end pb-1 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="isActive"
              checked={Boolean(formData.isActive)}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-200"
            />
            Active
          </label>

          <div className="sm:col-span-2">
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">
              Total Fees: {totalFees}
            </div>
          </div>

          {errorMessage ? (
            <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : isEditMode ? "Update Fees" : "Save Fees"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
