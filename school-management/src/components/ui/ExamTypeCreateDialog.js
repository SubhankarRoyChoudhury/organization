"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCurrentSchoolInfo } from "@/lib/apiService";
import DatePickerField from "@/components/ui/DatePickerField";

const EXAM_TYPE_OPTIONS = [
  { value: "unit_test", label: "Unit Test" },
  { value: "monthly_test", label: "Monthly Test" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half Yearly" },
  { value: "annual", label: "Annual" },
  { value: "practical", label: "Practical" },
  { value: "other", label: "Other" },
];

const EXAM_NAME_OPTIONS_BY_TYPE = {
  unit_test: [
    { value: "Unit Test 1", label: "Unit Test 1" },
    { value: "Unit Test 2", label: "Unit Test 2" },
    { value: "Unit Test 3", label: "Unit Test 3" },
    { value: "Unit Test 4", label: "Unit Test 4" },
    { value: "Unit Test 5", label: "Unit Test 5" },
    { value: "Unit Test 6", label: "Unit Test 6" },
    { value: "Unit Test 7", label: "Unit Test 7" },
    { value: "Unit Test 8", label: "Unit Test 8" },
  ],
  monthly_test: [
    { value: "Monthly Test", label: "Monthly Test" },
  ],
  quarterly: [
    { value: "Quarterly 1", label: "Quarterly 1" },
    { value: "Quarterly 2", label: "Quarterly 2" },
    { value: "Quarterly 3", label: "Quarterly 3" },
    { value: "Quarterly 4", label: "Quarterly 4" },
  ],
  half_yearly: [
    { value: "Half Yearly", label: "Half Yearly" },
  ],
  annual: [
    { value: "Annual", label: "Annual" },
  ],
  practical: [
    { value: "Practical 1", label: "Practical 1" },
    { value: "Practical 2", label: "Practical 2" },
  ],
  other: [
    { value: "Other", label: "Other" },
  ],
};

function getTotalMarksForExamType(examType, fallbackMarks) {
  const normalizedType = String(examType || "").trim();
  if (normalizedType === "unit_test") {
    return "20";
  }
  if (normalizedType === "annual" || normalizedType === "half_yearly") {
    return "100";
  }
  return fallbackMarks;
}

function getInitialFormData({
  mode = "create",
  initialData = null,
  defaultAcademicYearId = "",
} = {}) {
  const isEditMode = mode === "edit";
  const examType = String(initialData?.exam_type || initialData?.examType || "unit_test");
  const examName = String(initialData?.exam_name || initialData?.examName || "").trim();
  return {
    academicYearId: String(
      initialData?.academic_year_id ||
        initialData?.academicYearId ||
        (isEditMode ? "" : defaultAcademicYearId || ""),
    ),
    examName,
    examType,
    totalMarks: String(initialData?.total_marks ?? initialData?.totalMarks ?? "20"),
    startDate: String(initialData?.start_date || initialData?.startDate || ""),
    endDate: String(initialData?.end_date || initialData?.endDate || ""),
    isActive: Boolean(initialData?.is_active ?? initialData?.isActive ?? true),
  };
}

function formatAcademicYearOption(academicYear) {
  return String(academicYear?.year_name || academicYear?.yearName || "").trim();
}

function getAcademicYearSortKey(item) {
  const yearName = formatAcademicYearOption(item);
  if (!yearName) {
    return Number.POSITIVE_INFINITY;
  }

  const startYear = Number(yearName.split("-")[0]);
  return Number.isFinite(startYear) ? startYear : Number.POSITIVE_INFINITY;
}

function sortAcademicYearsBySequence(items) {
  return [...(Array.isArray(items) ? items : [])].sort((left, right) => {
    const leftKey = getAcademicYearSortKey(left);
    const rightKey = getAcademicYearSortKey(right);
    if (leftKey !== rightKey) {
      return leftKey - rightKey;
    }

    return formatAcademicYearOption(left).localeCompare(formatAcademicYearOption(right));
  });
}

function getCurrentAcademicYearLabel() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const academicYearStart = now.getMonth() >= 3 ? currentYear : currentYear - 1;
  return `${academicYearStart}-${academicYearStart + 1}`;
}

function SingleSelectDropdown({
  value,
  options,
  onChange,
  placeholder = "Select option",
  disabled = false,
  autoFocus = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const hasAutoOpenedRef = useRef(false);

  const selectedOption = options.find((option) => String(option?.value) === String(value || ""));

  const updateMenuPosition = () => {
    const buttonElement = buttonRef.current;
    if (!buttonElement) {
      setMenuStyle(null);
      return;
    }

    const rect = buttonElement.getBoundingClientRect();
    const viewportPadding = 8;
    const menuWidth = rect.width;
    const menuMaxHeight = 224;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openAbove = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxHeight = openAbove
      ? Math.max(140, Math.min(menuMaxHeight, spaceAbove))
      : Math.max(140, Math.min(menuMaxHeight, spaceBelow));

    setMenuStyle({
      left: Math.max(
        viewportPadding,
        Math.min(rect.left, window.innerWidth - menuWidth - viewportPadding),
      ),
      top: openAbove ? Math.max(viewportPadding, rect.top - maxHeight - 6) : rect.bottom + 6,
      width: menuWidth,
      maxHeight,
    });
  };

  useEffect(() => {
    if (!isOpen) {
      setMenuStyle(null);
      return undefined;
    }

    updateMenuPosition();

    const handleOutsideClick = (event) => {
      if (!(event.target instanceof Node)) {
        setIsOpen(false);
        return;
      }
      if (
        !containerRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleResizeOrScroll = () => {
      updateMenuPosition();
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleResizeOrScroll);
    window.addEventListener("scroll", handleResizeOrScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (autoFocus && !disabled) {
      const buttonElement = buttonRef.current;
      if (!buttonElement) {
        return undefined;
      }

      buttonElement.focus({ preventScroll: true });

      if (!hasAutoOpenedRef.current) {
        hasAutoOpenedRef.current = true;
        setIsOpen(true);
      }
    }
  }, [autoFocus, disabled]);

  return (
    <div ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex min-h-[42px] w-full items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-left text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        <span className="line-clamp-1">{String(selectedOption?.label || placeholder)}</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-slate-500 transition ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && menuStyle && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[2400] overflow-y-auto rounded-lg border border-slate-300 bg-slate-50 shadow-[0_14px_36px_rgba(15,23,42,0.28)]"
              style={{
                left: menuStyle.left,
                top: menuStyle.top,
                width: menuStyle.width,
                maxHeight: menuStyle.maxHeight,
              }}
            >
              {options.map((option, index) => {
                const optionValue = String(option?.value ?? "");
                const isActive = String(value || "") === optionValue;
                return (
                  <button
                    key={`${optionValue}-${index}`}
                    type="button"
                    onClick={() => {
                      onChange(optionValue);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-sky-100 ${
                      isActive ? "bg-sky-50 text-sky-700" : "text-slate-700"
                    }`}
                  >
                    <span className="flex-1">{String(option?.label || "")}</span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default function ExamTypeCreateDialog({
  open,
  onClose,
  onCreate,
  onUpdate = null,
  companyId,
  academicYears = [],
  initialData = null,
  mode = "create",
}) {
  const isEditMode = mode === "edit";
  const defaultAcademicYearId = useMemo(() => {
    const sortedAcademicYears = sortAcademicYearsBySequence(academicYears);
    const currentYearLabel = getCurrentAcademicYearLabel();
    const currentAcademicYear = sortedAcademicYears.find(
      (item) => formatAcademicYearOption(item) === currentYearLabel,
    );
    const activeAcademicYear = sortedAcademicYears.find(
      (item) => Boolean(item?.is_active ?? item?.isActive),
    );
    return String(
      currentAcademicYear?.id ||
        activeAcademicYear?.id ||
        sortedAcademicYears[0]?.id ||
        "",
    );
  }, [academicYears]);

  const [formData, setFormData] = useState(() =>
    getInitialFormData({ mode, initialData, defaultAcademicYearId }),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolLocationName, setSchoolLocationName] = useState("");
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dialogRef = useRef(null);
  const dragStateRef = useRef(null);

  const examNameOptions = useMemo(() => {
    const selectedType = String(formData.examType || "other").trim();
    return EXAM_NAME_OPTIONS_BY_TYPE[selectedType] || EXAM_NAME_OPTIONS_BY_TYPE.other;
  }, [formData.examType]);

  const examNameSelectOptions = useMemo(() => {
    const options = examNameOptions.map((option) => ({
      value: option.value,
      label: option.label,
    }));
    const currentExamName = String(formData.examName || "").trim();
    if (currentExamName && !options.some((option) => option.value === currentExamName)) {
      options.push({ value: currentExamName, label: currentExamName });
    }
    return options;
  }, [examNameOptions, formData.examName]);

  const sortedAcademicYears = useMemo(
    () => sortAcademicYearsBySequence(academicYears),
    [academicYears],
  );

  const resetDialog = useCallback(() => {
    setFormData(
      getInitialFormData({
        mode: "create",
        initialData: null,
        defaultAcademicYearId,
      }),
    );
    setIsSubmitting(false);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    dragStateRef.current = null;
  }, [defaultAcademicYearId]);

  const handleClose = useCallback(() => {
    resetDialog();
    onClose();
  }, [onClose, resetDialog]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [open, handleClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let mounted = true;
    getCurrentSchoolInfo()
      .then((data) => {
        if (!mounted || !data) {
          return;
        }
        setCompanyName(String(data?.company?.name || "").trim());
        setSchoolCode(String(data?.company?.school_code || "").trim());
        setSchoolLocationName(
          String(data?.company?.location_name || data?.company?.location || "").trim(),
        );
      })
      .catch(() => {
        // keep the dialog usable even if the lookup fails
      });

    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormData(
      getInitialFormData({
        mode,
        initialData,
        defaultAcademicYearId,
      }),
    );
  }, [defaultAcademicYearId, initialData, mode, open]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    const nextExamNameOptions =
      name === "examType"
        ? EXAM_NAME_OPTIONS_BY_TYPE[String(value || "other").trim()] ||
          EXAM_NAME_OPTIONS_BY_TYPE.other
        : examNameOptions;
    setFormData((prev) => ({
      ...prev,
      ...(name === "startDate" && prev.endDate && prev.endDate < value
        ? { endDate: "" }
        : null),
      ...(name === "examType"
        ? {
            totalMarks: getTotalMarksForExamType(value, prev.totalMarks),
            examName: nextExamNameOptions.some((option) => option.value === prev.examName)
              ? prev.examName
              : "",
          }
        : null),
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSelectChange = useCallback((name, value) => {
    const nextValue = String(value || "");
    setFormData((prev) => {
      if (name === "examType") {
        const nextExamNameOptions =
          EXAM_NAME_OPTIONS_BY_TYPE[nextValue] || EXAM_NAME_OPTIONS_BY_TYPE.other;
        return {
          ...prev,
          examType: nextValue,
          totalMarks: getTotalMarksForExamType(nextValue, prev.totalMarks),
          examName: nextExamNameOptions.some((option) => option.value === prev.examName)
            ? prev.examName
            : "",
        };
      }

      return {
        ...prev,
        [name]: nextValue,
      };
    });
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const examName = String(formData.examName || "").trim();
    const academicYearId = String(formData.academicYearId || "").trim();
    const totalMarks = String(formData.totalMarks || "").trim();
    const startDate = String(formData.startDate || "").trim();
    const endDate = String(formData.endDate || "").trim();

    if (!examName || !academicYearId || !totalMarks || !startDate || !endDate) {
      return;
    }
    if (endDate < startDate) {
      return;
    }

    const accessToken =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token") || ""
        : "";
    const loggedInUsername =
      typeof window !== "undefined"
        ? localStorage.getItem("username") || ""
        : "";

    setIsSubmitting(true);
    try {
      const payload = {
        academicYearId,
        examName,
        examType: formData.examType,
        totalMarks,
        startDate,
        endDate,
        isActive: Boolean(formData.isActive),
        companyId: companyId || null,
        created_by: loggedInUsername || null,
        updated_by: loggedInUsername || null,
        accessToken,
      };

      if (isEditMode && typeof onUpdate === "function") {
        await onUpdate({
          id: initialData?.id || null,
          ...payload,
        });
      } else {
        await onCreate(payload);
      }
      resetDialog();
      onClose();
    } catch (_error) {
      setIsSubmitting(false);
    }
  };

  const handleDragStart = (event) => {
    if (event.button !== 0) {
      return;
    }

    const dialogElement = dialogRef.current;
    const dragHandle = event.currentTarget;
    if (!dialogElement || !(dragHandle instanceof HTMLElement)) {
      return;
    }

    dragHandle.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: dragOffset.x,
      startOffsetY: dragOffset.y,
      startRect: dialogElement.getBoundingClientRect(),
    };
    setIsDragging(true);
    event.preventDefault();
  };

  const handleDragMove = (event) => {
    const dragState = dragStateRef.current;
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const isDesktop = window.innerWidth >= 640;
    const screenPaddingX = isDesktop ? 5 : 8;
    const screenPaddingY = isDesktop ? 5 : 0;
    const minLeft = screenPaddingX;
    const minTop = screenPaddingY;
    const maxLeft = Math.max(
      screenPaddingX,
      window.innerWidth - dragState.startRect.width - screenPaddingX,
    );
    const maxTop = Math.max(
      screenPaddingY,
      window.innerHeight - dragState.startRect.height - screenPaddingY,
    );

    const proposedLeft = dragState.startRect.left + deltaX;
    const proposedTop = dragState.startRect.top + deltaY;
    const clampedLeft = Math.min(maxLeft, Math.max(minLeft, proposedLeft));
    const clampedTop = Math.min(maxTop, Math.max(minTop, proposedTop));
    const nextX =
      dragState.startOffsetX + (clampedLeft - dragState.startRect.left);
    const nextY =
      dragState.startOffsetY + (clampedTop - dragState.startRect.top);

    setDragOffset((prev) =>
      prev.x === nextX && prev.y === nextY ? prev : { x: nextX, y: nextY },
    );
  };

  const stopDragging = (event) => {
    const dragState = dragStateRef.current;
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
    setIsDragging(false);
  };

  if (!open) {
    return null;
  }

  const academicYearAvailable = academicYears.length > 0;

  const dialogContent = (
    <div className="fixed inset-0 z-[2300] flex items-center justify-center overflow-hidden p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={handleClose}
        aria-label="Close exam type dialog"
      />

      <div
        ref={dialogRef}
        style={{
          transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
        }}
        className={`relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] will-change-transform max-h-[calc(100svh-0.5rem)] sm:max-h-[calc(100dvh-3rem)] ${
          isDragging ? "cursor-grabbing" : ""
        }`}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="pr-4">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              {isEditMode ? "Edit Exam Type" : "Create Exam Type"}
            </h2>
            {(companyName || schoolCode || schoolLocationName) ? (
              <p className="mt-1 text-sm text-slate-500">
                {companyName ? companyName : "School"}
                {schoolLocationName ? `, ${schoolLocationName}` : ""}
                {schoolCode ? (
                  <>
                    {" ("}
                    <span className="font-semibold text-sky-600">{schoolCode}</span>
                    {")"}
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-drag-handle="true"
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              aria-label="Drag dialog"
              className="hidden h-8 w-8 touch-none cursor-grab items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 active:cursor-grabbing sm:inline-flex"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="8" cy="7" r="1.4" />
                <circle cx="16" cy="7" r="1.4" />
                <circle cx="8" cy="12" r="1.4" />
                <circle cx="16" cy="12" r="1.4" />
                <circle cx="8" cy="17" r="1.4" />
                <circle cx="16" cy="17" r="1.4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close dialog"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex flex-1 flex-col overflow-hidden px-4 py-4 text-slate-900 sm:px-6 sm:py-5"
        >
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2">

              <label className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">Exam Type</span>
                <SingleSelectDropdown
                  value={formData.examType}
                  onChange={(value) => handleSelectChange("examType", value)}
                  options={EXAM_TYPE_OPTIONS}
                  placeholder="Select exam type"
                  autoFocus
                />
              </label>

              <label className="space-y-2 ">
                <span className="block text-sm font-medium text-slate-700">Exam Name</span>
                <SingleSelectDropdown
                  value={formData.examName}
                  onChange={(value) => handleSelectChange("examName", value)}
                  options={examNameSelectOptions}
                  placeholder="Select exam name"
                  disabled={!formData.examType}
                />
              </label>

              <label className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">Academic Year</span>
                <SingleSelectDropdown
                  value={formData.academicYearId}
                  onChange={(value) => handleSelectChange("academicYearId", value)}
                  options={sortedAcademicYears.map((item) => ({
                    value: String(item.id),
                    label: formatAcademicYearOption(item) || `Academic Year ${item.id}`,
                  }))}
                  placeholder={academicYearAvailable ? "Select academic year" : "No academic year available"}
                  disabled={!academicYearAvailable}
                />
                {!academicYearAvailable ? (
                  <p className="text-xs text-amber-600">Create an academic year before adding exam types.</p>
                ) : null}
              </label>

              <label className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">Total Marks</span>
                <input
                  type="number"
                  name="totalMarks"
                  value={formData.totalMarks}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">Start Date</span>
                <DatePickerField
                  value={formData.startDate}
                  onChange={(value) =>
                    handleChange({
                      target: { name: "startDate", value },
                    })
                  }
                  ariaLabel="Start Date"
                />
              </label>

              <label className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">End Date</span>
                <DatePickerField
                  value={formData.endDate}
                  onChange={(value) =>
                    handleChange({
                      target: { name: "endDate", value },
                    })
                  }
                  min={formData.startDate || ""}
                  ariaLabel="End Date"
                />
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 sm:col-span-2">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  Mark as active exam type
                </span>
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-row flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-4 md:mt-5 md:border-t-0 md:bg-transparent md:pb-0 md:pt-0">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-11 min-w-[96px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-[17px] font-semibold leading-none text-slate-700 transition hover:bg-slate-100 sm:h-10 sm:min-w-[92px] sm:px-4 sm:text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !academicYearAvailable}
              className="inline-flex h-11 min-w-[132px] items-center justify-center rounded-xl bg-sky-600 px-6 text-[17px] font-semibold leading-none text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:min-w-[120px] sm:px-5 sm:text-sm"
            >
              {isSubmitting
                ? "Saving..."
                : isEditMode
                  ? "Update Exam Type"
                  : "Save Exam Type"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(dialogContent, document.body);
}
