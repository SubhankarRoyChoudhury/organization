"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DelistConfirmDialog from "@/components/ui/DelistConfirmDialog";
import DialogStudentFeesCollection from "@/components/ui/DialogStudentFeesCollection";
import DialogStudentFessCollectionHistory from "@/components/ui/DialogStudentFessCollectionHistory";
import {
  createStudentFeesCollection,
  delistStudentFeesCollection,
  getClassFeeStructureList,
  getCurrentSchoolInfo,
  getStudentAcademicRecordList,
  getStudentFeesCollectionById,
  getStudentFeesCollectionList,
  updateStudentFeesCollection,
} from "@/lib/apiService";

function formatAmount(value) {
  const parsed = Number.parseFloat(String(value ?? "0"));
  if (!Number.isFinite(parsed)) {
    return "0.00";
  }
  return parsed.toFixed(2);
}

function resolveDefaultAcademicYearLabel(academicYearLabels = []) {
  const labels = Array.isArray(academicYearLabels) ? academicYearLabels : [];
  if (!labels.length) {
    return "";
  }

  const currentYear = new Date().getFullYear();
  const parsed = labels
    .map((label) => {
      const normalized = String(label || "").trim();
      const [startText, endText] = normalized.split("-");
      const startYear = Number.parseInt(startText, 10);
      const endYear = Number.parseInt(endText, 10);
      if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) {
        return null;
      }
      return { label: normalized, startYear, endYear };
    })
    .filter(Boolean);

  const currentStartMatch = parsed.find((item) => item.startYear === currentYear);
  if (currentStartMatch?.label) {
    return currentStartMatch.label;
  }

  const currentRangeMatch = parsed.find(
    (item) => currentYear >= item.startYear && currentYear <= item.endYear,
  );
  if (currentRangeMatch?.label) {
    return currentRangeMatch.label;
  }

  return labels[labels.length - 1] || "";
}

function getCollectionStudentFilterId(item) {
  const candidate =
    item?.student_academic_rcord_id ??
    item?.studentAcademicRecordId ??
    item?.student_academic_record_id ??
    "";
  const normalized = String(candidate).trim();
  return normalized;
}

function buildStudentFilterLabel(item, studentAcademicRecord = null) {
  const studentName =
    String(item?.student_name || studentAcademicRecord?.student_name || "").trim() || "-";
  const className =
    String(
      item?.class_name ||
        studentAcademicRecord?.class_name ||
        studentAcademicRecord?.class_details?.class_name ||
        "",
    ).trim() || "-";
  const sectionName =
    String(
      item?.section_name ||
        item?.section ||
        studentAcademicRecord?.section_name ||
        studentAcademicRecord?.section ||
        studentAcademicRecord?.section_details?.section_name ||
        "",
    ).trim() || "-";
  const rollNo = String(
    item?.roll_no ||
      item?.rollNo ||
      item?.roll_number ||
      item?.rollNumber ||
      studentAcademicRecord?.roll_no ||
      studentAcademicRecord?.rollNo ||
      studentAcademicRecord?.roll_number ||
      studentAcademicRecord?.rollNumber ||
      "",
  ).trim() || "-";
  return `${studentName} / ${className} / ${sectionName} / ${rollNo}`;
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  contentWidthCh = null,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const selectedOption = options.find((option) => String(option?.id) === String(value || ""));
  const selectedLabel = String(selectedOption?.label || "").trim();

  const updateMenuPosition = () => {
    const buttonElement = buttonRef.current;
    if (!buttonElement) {
      setMenuStyle(null);
      return;
    }

    const rect = buttonElement.getBoundingClientRect();
    const viewportPadding = 8;
    const menuWidth = rect.width;
    const menuMaxHeight = 232;
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
    if (!isOpen || disabled) {
      return undefined;
    }

    const animationFrameId = window.requestAnimationFrame(updateMenuPosition);

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
      window.cancelAnimationFrame(animationFrameId);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll, true);
    };
  }, [disabled, isOpen]);

  const isDynamicWidth = Number.isFinite(contentWidthCh) && contentWidthCh > 0;

  return (
    <div
      ref={containerRef}
      className={`${isDynamicWidth ? "relative" : "relative min-w-[140px]"} ${className}`.trim()}
      style={
        isDynamicWidth
          ? {
              width: `${contentWidthCh}ch`,
              minWidth: "220px",
              maxWidth: "min(560px, calc(100vw - 2rem))",
            }
          : undefined
      }
    >
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        className="flex h-10 w-full items-center justify-between rounded-md border border-sky-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        <span className="line-clamp-1 text-left">{selectedLabel || placeholder}</span>
        <svg
          viewBox="0 0 24 24"
          className={`ml-2 h-3 w-3 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && !disabled && menuStyle && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[2400] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.18)]"
              style={{
                left: menuStyle.left,
                top: menuStyle.top,
                width: menuStyle.width,
                maxHeight: menuStyle.maxHeight,
              }}
              role="listbox"
            >
              <div className="max-h-full overflow-y-auto p-1">
                {options.length > 0 ? (
                  options.map((option) => {
                    const optionId = String(option?.id || "");
                    const isActive = String(value || "") === optionId;
                    return (
                      <button
                        key={optionId}
                        type="button"
                        onClick={() => {
                          onChange(optionId);
                          setIsOpen(false);
                        }}
                        className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                          isActive
                            ? "bg-sky-50 text-sky-700"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                        role="option"
                        aria-selected={isActive}
                      >
                        <span className="truncate">{String(option?.label || "")}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-sm text-slate-500">No options found.</div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default function StudentFeesCollectionPage() {
  const [collections, setCollections] = useState([]);
  const [studentAcademicOptions, setStudentAcademicOptions] = useState([]);
  const [feeStructureOptions, setFeeStructureOptions] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [selectedCollectionData, setSelectedCollectionData] = useState(null);
  const [isDelistDialogOpen, setIsDelistDialogOpen] = useState(false);
  const [delistTarget, setDelistTarget] = useState(null);
  const [isDelisting, setIsDelisting] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [hasUserSelectedAcademicYearFilter, setHasUserSelectedAcademicYearFilter] = useState(false);
  const [filters, setFilters] = useState({
    academicYear: "",
    className: "",
    studentName: "",
  });

  const hasPendingDueAmount = useCallback((item) => {
    const dueAmount = Number.parseFloat(String(item?.due_amount ?? "0"));
    return Number.isFinite(dueAmount) && dueAmount > 0;
  }, []);
  const isLockedAfterRepay = useCallback((item) => Boolean(item?.delist), []);

  const fetchCollections = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getStudentFeesCollectionList();
      setCollections(Array.isArray(data) ? data : []);
    } catch (_error) {
      setCollections([]);
      setErrorMessage("Unable to load student fees collection list.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const [studentRecords, feeStructures] = await Promise.all([
        getStudentAcademicRecordList(),
        getClassFeeStructureList(),
      ]);
      setStudentAcademicOptions(Array.isArray(studentRecords) ? studentRecords : []);
      setFeeStructureOptions(Array.isArray(feeStructures) ? feeStructures : []);
    } catch (_error) {
      setStudentAcademicOptions([]);
      setFeeStructureOptions([]);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const data = await getCurrentSchoolInfo();
        if (data?.company?.id) {
          setCompanyId(data.company.id);
        }
      } catch (_error) {
        setCompanyId(null);
      }
    };
    loadCompany();
  }, []);

  const handleCreate = async (payload) => {
    const requestPayload = {
      student_academic_rcord_id: payload.studentAcademicRecordId,
      fee_structure_id: payload.feeStructureId,
      installment_name: payload.installmentName,
      due_date: payload.dueDate,
      paid_amount: payload.paidAmount,
      payment_date: payload.paymentDate,
      payment_mode: payload.paymentMode,
      transaction_id: payload.transactionId,
      remarks: payload.remarks,
      company_id: payload.companyId || companyId || undefined,
    };

    await createStudentFeesCollection(requestPayload, payload.accessToken);
    await fetchCollections();
    setIsCreateDialogOpen(false);
    setDialogMode("create");
    setSelectedCollectionId(null);
    setSelectedCollectionData(null);
  };

  const handleUpdate = async (payload) => {
    if (!payload?.id) {
      throw new Error("Unable to update student fees collection: missing id");
    }

    const requestPayload = {
      fee_structure_id: payload.feeStructureId,
      installment_name: payload.installmentName,
      due_date: payload.dueDate,
      paid_amount: payload.paidAmount,
      payment_date: payload.paymentDate,
      payment_mode: payload.paymentMode,
      transaction_id: payload.transactionId,
      remarks: payload.remarks,
      company_id: payload.companyId || companyId || undefined,
    };

    await updateStudentFeesCollection(payload.id, requestPayload, payload.accessToken);
    await fetchCollections();
    setIsCreateDialogOpen(false);
    setDialogMode("create");
    setSelectedCollectionId(null);
    setSelectedCollectionData(null);
  };

  const handleOpenCreate = () => {
    setErrorMessage("");
    setDialogMode("create");
    setSelectedCollectionId(null);
    setSelectedCollectionData(null);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = async (item) => {
    setActiveMenu(null);
    if (isLockedAfterRepay(item)) {
      setErrorMessage("Previous repaid fees collection cannot be edited.");
      return;
    }
    setDialogMode("edit");
    setSelectedCollectionId(item?.id || null);
    setSelectedCollectionData(null);
    setErrorMessage("");

    if (!item?.id) {
      setErrorMessage("Unable to load selected student fees collection record.");
      return;
    }

    try {
      const data = await getStudentFeesCollectionById(item.id);
      setSelectedCollectionData(data);
      setIsCreateDialogOpen(true);
    } catch (_error) {
      setSelectedCollectionData(null);
      setErrorMessage("Unable to load selected student fees collection record.");
    }
  };

  const handleReview = async (item) => {
    setActiveMenu(null);
    setDialogMode("review");
    setSelectedCollectionId(item?.id || null);
    setSelectedCollectionData(null);
    setErrorMessage("");

    if (!item?.id) {
      setErrorMessage("Unable to load selected student fees collection record.");
      return;
    }

    try {
      const data = await getStudentFeesCollectionById(item.id);
      setSelectedCollectionData(data);
      setIsCreateDialogOpen(true);
    } catch (_error) {
      setSelectedCollectionData(null);
      setErrorMessage("Unable to load selected student fees collection record.");
    }
  };

  const handleRepay = async (item) => {
    setActiveMenu(null);
    setErrorMessage("");
    if (isLockedAfterRepay(item)) {
      setErrorMessage("Previous repaid fees collection cannot be re-paid.");
      return;
    }

    const listDueAmount = Number.parseFloat(String(item?.due_amount ?? "0"));
    if (!Number.isFinite(listDueAmount) || listDueAmount <= 0) {
      setErrorMessage("All Payment is Given By this Student");
      return;
    }

    setDialogMode("repay");
    setSelectedCollectionId(item?.id || null);
    setSelectedCollectionData(null);

    if (!item?.id) {
      setErrorMessage("Unable to load selected student fees collection record.");
      return;
    }

    try {
      const data = await getStudentFeesCollectionById(item.id);
      const dueFromDetails = Number.parseFloat(String(data?.due_amount ?? listDueAmount));
      const effectiveDueAmount =
        Number.isFinite(dueFromDetails) && dueFromDetails > 0 ? dueFromDetails : listDueAmount;

      if (!Number.isFinite(effectiveDueAmount) || effectiveDueAmount <= 0) {
        setErrorMessage("All Payment is Given By this Student");
        setDialogMode("create");
        setSelectedCollectionId(null);
        return;
      }

      setSelectedCollectionData({
        ...data,
        student_academic_rcord_id:
          data?.student_academic_rcord_id ?? item?.student_academic_rcord_id ?? "",
        total_amount: formatAmount(effectiveDueAmount),
        paid_amount: "0.00",
      });
      setIsCreateDialogOpen(true);
    } catch (_error) {
      setSelectedCollectionData(null);
      setErrorMessage("Unable to load selected student fees collection record.");
    }
  };

  const handleRepayUpdate = async (payload) => {
    if (!payload?.sourceCollectionId) {
      throw new Error("Unable to process repayment: missing source collection id");
    }

    const repayAmount = Number.parseFloat(String(payload.repayAmount ?? "0"));
    const currentDueAmount = Number.parseFloat(String(payload.currentDueAmount ?? "0"));
    const safeRepayAmount = Number.isFinite(repayAmount) && repayAmount > 0 ? repayAmount : 0;
    const safeCurrentDueAmount =
      Number.isFinite(currentDueAmount) && currentDueAmount > 0 ? currentDueAmount : 0;

    const requestPayload = {
      student_academic_rcord_id: payload.studentAcademicRecordId,
      fee_structure_id: payload.feeStructureId,
      installment_name: payload.installmentName,
      due_date: payload.dueDate,
      total_amount: formatAmount(safeCurrentDueAmount),
      paid_amount: formatAmount(safeRepayAmount),
      payment_date: payload.paymentDate,
      payment_mode: payload.paymentMode,
      transaction_id: payload.transactionId,
      remarks: payload.remarks,
      company_id: payload.companyId || companyId || undefined,
    };

    await createStudentFeesCollection(requestPayload, payload.accessToken);
    await delistStudentFeesCollection(payload.sourceCollectionId, payload.accessToken);
    await fetchCollections();
    setIsCreateDialogOpen(false);
    setDialogMode("create");
    setSelectedCollectionId(null);
    setSelectedCollectionData(null);
  };

  const handleDelist = (item) => {
    setActiveMenu(null);
    setDelistTarget(item);
    setIsDelistDialogOpen(true);
  };

  const handleOpenPaymentHistory = (item) => {
    setActiveMenu(null);
    const studentAcademicRecordId = Number(
      item?.student_academic_rcord_id ?? item?.studentAcademicRecordId ?? 0,
    );
    if (!Number.isFinite(studentAcademicRecordId) || studentAcademicRecordId <= 0) {
      setErrorMessage("Unable to load payment history for the selected student.");
      return;
    }

    setErrorMessage("");
    setHistoryTarget({
      studentAcademicRecordId,
      studentName: item?.student_name || "",
    });
    setIsHistoryDialogOpen(true);
  };

  const handleConfirmDelist = async () => {
    if (!delistTarget?.id) {
      return;
    }

    setIsDelisting(true);
    const accessToken =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token") || ""
        : "";

    try {
      await delistStudentFeesCollection(delistTarget.id, accessToken);
      await fetchCollections();
      setIsDelistDialogOpen(false);
      setDelistTarget(null);
    } finally {
      setIsDelisting(false);
    }
  };

  const toggleActionMenu = (event, item) => {
    event.stopPropagation();
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 144;
    const menuHeight = 126;
    const gap = 6;
    const viewportPadding = 8;

    const left = Math.min(
      Math.max(viewportPadding, buttonRect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );

    const canOpenBelow =
      window.innerHeight - buttonRect.bottom >= menuHeight + gap + viewportPadding;
    const top = canOpenBelow
      ? buttonRect.bottom + gap
      : Math.max(viewportPadding, buttonRect.top - menuHeight - gap);

    const nextMenu = {
      id: item.id,
      item,
      top,
      left,
    };

    setActiveMenu((prev) => (prev?.id === item.id ? null : nextMenu));
  };

  const statusClassName = useCallback((status) => {
    const normalized = String(status || "").trim().toLowerCase();
    if (normalized === "fully_paid" || normalized === "paid") {
      return "inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700";
    }
    if (normalized === "partial") {
      return "inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700";
    }
    if (normalized === "overdue") {
      return "inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700";
    }
    return "inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600";
  }, []);

  const filterOptions = useMemo(() => {
    const academicYears = new Set();
    const classes = new Set();

    (Array.isArray(collections) ? collections : []).forEach((item) => {
      const academicYear = String(item?.academic_year_name || "").trim();
      const className = String(item?.class_name || "").trim();

      if (academicYear) academicYears.add(academicYear);
      if (className) classes.add(className);
    });

    return {
      academicYears: Array.from(academicYears).sort((a, b) => a.localeCompare(b)),
      classes: Array.from(classes).sort((a, b) => a.localeCompare(b)),
    };
  }, [collections]);

  const studentAcademicRecordById = useMemo(() => {
    const recordById = new Map();
    (Array.isArray(studentAcademicOptions) ? studentAcademicOptions : []).forEach((record) => {
      const recordId = String(record?.id || "").trim();
      if (!recordId || recordById.has(recordId)) {
        return;
      }
      recordById.set(recordId, record);
    });
    return recordById;
  }, [studentAcademicOptions]);

  const studentFilterOptions = useMemo(() => {
    const optionsById = new Map();

    (Array.isArray(collections) ? collections : []).forEach((item) => {
      const optionId = getCollectionStudentFilterId(item);
      if (!optionId || optionsById.has(optionId)) {
        return;
      }
      const linkedAcademicRecord = studentAcademicRecordById.get(optionId) || null;
      optionsById.set(optionId, {
        id: optionId,
        label: buildStudentFilterLabel(item, linkedAcademicRecord),
      });
    });

    return Array.from(optionsById.values()).sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }, [collections, studentAcademicRecordById]);

  const studentFilterWidthCh = useMemo(() => {
    const longestLabelLength = studentFilterOptions.reduce((maxLength, option) => {
      const nextLength = String(option?.label || "").length;
      return nextLength > maxLength ? nextLength : maxLength;
    }, String("All students").length);
    return Math.min(64, Math.max(24, longestLabelLength + 2));
  }, [studentFilterOptions]);

  const academicYearFilterOptions = useMemo(
    () =>
      filterOptions.academicYears.map((option) => ({
        id: String(option),
        label: String(option),
      })),
    [filterOptions.academicYears],
  );

  const classFilterOptions = useMemo(
    () =>
      filterOptions.classes.map((option) => ({
        id: String(option),
        label: String(option),
      })),
    [filterOptions.classes],
  );

  const clearAllFilters = useCallback(() => {
    setFilters({
      academicYear: "",
      className: "",
      studentName: "",
    });
  }, []);

  const filteredCollections = useMemo(() => {
    return (Array.isArray(collections) ? collections : []).filter((item) => {
      const studentFilterId = getCollectionStudentFilterId(item);
      const academicYear = String(item?.academic_year_name || "").trim();
      const className = String(item?.class_name || "").trim();

      if (filters.studentName && studentFilterId !== filters.studentName) {
        return false;
      }
      if (filters.academicYear && academicYear !== filters.academicYear) {
        return false;
      }
      if (filters.className && className !== filters.className) {
        return false;
      }
      return true;
    });
  }, [collections, filters]);

  useEffect(() => {
    if (hasUserSelectedAcademicYearFilter) {
      return;
    }
    if (!filterOptions.academicYears.length) {
      return;
    }

    setFilters((previous) => {
      if (String(previous.academicYear || "").trim()) {
        return previous;
      }
      const defaultAcademicYear = resolveDefaultAcademicYearLabel(filterOptions.academicYears);
      if (!defaultAcademicYear) {
        return previous;
      }
      return {
        ...previous,
        academicYear: defaultAcademicYear,
      };
    });
  }, [filterOptions.academicYears, hasUserSelectedAcademicYearFilter]);

  const dialogKey = useMemo(
    () => `${dialogMode}-${selectedCollectionId || "new"}-${isCreateDialogOpen ? "open" : "closed"}`,
    [dialogMode, isCreateDialogOpen, selectedCollectionId],
  );

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        setActiveMenu(null);
        return;
      }
      if (
        target.closest("[data-action-menu-trigger='true']") ||
        target.closest("[data-action-menu='true']")
      ) {
        return;
      }
      setActiveMenu(null);
    };

    const closeMenu = () => setActiveMenu(null);

    document.addEventListener("click", closeOnOutsideClick);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      document.removeEventListener("click", closeOnOutsideClick);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, []);

  return (
    <main className="dashboard-shell h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full w-full flex-col px-3 pb-4 pt-16 sm:px-6 lg:px-8 lg:pt-8">
        <section className="shrink-0 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-700 via-cyan-700 to-teal-700 px-4 py-5 text-white shadow-[0_16px_34px_rgba(14,116,144,0.25)] sm:px-6">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <h1 className="min-w-0 flex-1 text-lg font-semibold leading-tight tracking-wide sm:text-2xl">
              Student Fees Collection
            </h1>

            <div className="hidden items-center gap-2 lg:flex">
              <FilterSelect
                value={filters.studentName}
                onChange={(selectedValue) =>
                  setFilters((prev) => ({ ...prev, studentName: selectedValue }))
                }
                options={studentFilterOptions}
                placeholder="All students"
                contentWidthCh={studentFilterWidthCh}
              />
              <FilterSelect
                value={filters.academicYear}
                onChange={(selectedValue) => {
                  setHasUserSelectedAcademicYearFilter(true);
                  setFilters((prev) => ({ ...prev, academicYear: selectedValue }));
                }}
                options={academicYearFilterOptions}
                placeholder="All academic years"
              />
              <FilterSelect
                value={filters.className}
                onChange={(selectedValue) =>
                  setFilters((prev) => ({ ...prev, className: selectedValue }))
                }
                options={classFilterOptions}
                placeholder="All classes"
              />
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Clear filters"
                title="Clear filters"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="whitespace-nowrap rounded-lg bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
              >
                Add New Fees Collection
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white text-sky-700 shadow-sm transition hover:bg-sky-50 lg:hidden"
              aria-label="Add fees collection"
              title="Add New Fees Collection"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>

          <div className="mt-3 grid gap-2 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              <FilterSelect
                value={filters.studentName}
                onChange={(selectedValue) =>
                  setFilters((prev) => ({ ...prev, studentName: selectedValue }))
                }
                options={studentFilterOptions}
                placeholder="All students"
                className="min-w-0 w-full"
              />
              <FilterSelect
                value={filters.academicYear}
                onChange={(selectedValue) => {
                  setHasUserSelectedAcademicYearFilter(true);
                  setFilters((prev) => ({ ...prev, academicYear: selectedValue }));
                }}
                options={academicYearFilterOptions}
                placeholder="All academic years"
                className="min-w-0 w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FilterSelect
                value={filters.className}
                onChange={(selectedValue) =>
                  setFilters((prev) => ({ ...prev, className: selectedValue }))
                }
                options={classFilterOptions}
                placeholder="All classes"
                className="min-w-0 w-full"
              />
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex h-10 w-full items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Clear filters"
                title="Clear filters"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            </div>
            </div>
        </section>

        <section className="mt-6 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1380px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3 font-semibold">SL.No.</th>
                  <th className="px-2 py-3 font-semibold">Student</th>
                  <th className="px-2 py-3 font-semibold">Academic Year</th>
                  <th className="px-2 py-3 font-semibold">Class</th>
                  <th className="px-2 py-3 font-semibold">Installment</th>
                  <th className="px-2 py-3 font-semibold">Due Date</th>
                  <th className="px-2 py-3 font-semibold">Total</th>
                  <th className="px-2 py-3 font-semibold">Paid</th>
                  <th className="px-2 py-3 font-semibold">Due</th>
                  <th className="px-2 py-3 font-semibold">Payment Date</th>
                  <th className="px-2 py-3 font-semibold">Payment Mode</th>
                  <th className="px-2 py-3 font-semibold">Status</th>
                  <th className="px-2 py-3 font-semibold">Transaction ID</th>
                  <th className="px-2 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3" colSpan={14}>
                      Loading...
                    </td>
                  </tr>
                ) : null}

                {!isLoading && errorMessage ? (
                  <tr className="border-b border-slate-100 text-sm text-red-600">
                    <td className="px-2 py-3" colSpan={14}>
                      {errorMessage}
                    </td>
                  </tr>
                ) : null}

                {!isLoading && !errorMessage && filteredCollections.length === 0 ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3" colSpan={14}>
                      No student fees collection records found.
                    </td>
                  </tr>
                ) : null}

                {filteredCollections.map((item, index) => (
                  <tr key={item.id} className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3 font-medium text-slate-800">{index + 1}</td>
                    <td className="px-2 py-3">{item.student_name || "-"}</td>
                    <td className="px-2 py-3">{item.academic_year_name || "-"}</td>
                    <td className="px-2 py-3">{item.class_name || "-"}</td>
                    <td className="px-2 py-3">{item.installment_name_display || item.installment_name || "-"}</td>
                    <td className="px-2 py-3">{item.due_date || "-"}</td>
                    <td className="px-2 py-3 font-semibold text-slate-900">{formatAmount(item.total_amount)}</td>
                    <td className="px-2 py-3">{formatAmount(item.paid_amount)}</td>
                    <td className="px-2 py-3">{formatAmount(item.due_amount)}</td>
                    <td className="px-2 py-3">{item.payment_date || "-"}</td>
                    <td className="px-2 py-3">{item.payment_mode_display || item.payment_mode || "-"}</td>
                    <td className="px-2 py-3">
                      <span className={statusClassName(item.status)}>
                        {item.status_display || item.status || "-"}
                      </span>
                    </td>
                    <td className="px-2 py-3">{item.transaction_id || "-"}</td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        data-action-menu-trigger="true"
                        onClick={(event) => toggleActionMenu(event, item)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
                        aria-label="Student fees collection actions"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="5" r="1.8" />
                          <circle cx="12" cy="12" r="1.8" />
                          <circle cx="12" cy="19" r="1.8" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <DialogStudentFeesCollection
        key={dialogKey}
        open={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setDialogMode("create");
          setSelectedCollectionId(null);
          setSelectedCollectionData(null);
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onRepay={handleRepayUpdate}
        companyId={companyId}
        studentAcademicOptions={studentAcademicOptions}
        feeStructureOptions={feeStructureOptions}
        initialData={selectedCollectionData}
        mode={dialogMode}
      />

      <DialogStudentFessCollectionHistory
        open={isHistoryDialogOpen}
        onClose={() => {
          setIsHistoryDialogOpen(false);
          setHistoryTarget(null);
        }}
        studentAcademicRecordId={historyTarget?.studentAcademicRecordId}
        studentName={historyTarget?.studentName}
      />

      {activeMenu && typeof document !== "undefined"
        ? createPortal(
            <div
              data-action-menu="true"
              className="fixed z-[1000] w-36 overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.28)]"
              style={{ top: activeMenu.top, left: activeMenu.left }}
            >
              {hasPendingDueAmount(activeMenu.item) && !isLockedAfterRepay(activeMenu.item) ? (
                <button
                  type="button"
                  onClick={() => handleRepay(activeMenu.item)}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Re-Pay
                </button>
              ) : hasPendingDueAmount(activeMenu.item) && isLockedAfterRepay(activeMenu.item) ? (
                <button
                  type="button"
                  disabled
                  className="block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-slate-400"
                >
                  Re-Pay
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenPaymentHistory(activeMenu.item)}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Payment History
                </button>
              )}
              <button
                type="button"
                onClick={() => handleReview(activeMenu.item)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Review
              </button>
              <button
                type="button"
                onClick={() => handleEdit(activeMenu.item)}
                disabled={isLockedAfterRepay(activeMenu.item)}
                className={`block w-full px-3 py-2 text-left text-sm transition ${
                  isLockedAfterRepay(activeMenu.item)
                    ? "cursor-not-allowed text-slate-400"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelist(activeMenu.item)}
                className="block w-full px-3 py-2 text-left text-sm text-red-600 transition hover:bg-slate-100"
              >
                Delist
              </button>
            </div>,
            document.body,
          )
        : null}

      <DelistConfirmDialog
        open={isDelistDialogOpen}
        onClose={() => {
          if (isDelisting) {
            return;
          }
          setIsDelistDialogOpen(false);
          setDelistTarget(null);
        }}
        onConfirm={handleConfirmDelist}
        itemLabel={delistTarget?.student_name || "this student fees collection record"}
        isSubmitting={isDelisting}
      />
    </main>
  );
}
