"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AccessDeniedDialog from "@/components/ui/AccessDeniedDialog";
import DelistConfirmDialog from "@/components/ui/DelistConfirmDialog";
import DialogStudentFeesCollection from "@/components/ui/DialogStudentFeesCollection";
import DialogStudentFessCollectionHistory from "@/components/ui/DialogStudentFessCollectionHistory";
import {
  createReceiptVoucher,
  createStudentFeesCollection,
  delistStudentFeesCollection,
  generateReceiptVoucherId,
  getClassFeeStructureList,
  getCurrentSchoolInfo,
  getReceiptVoucherCreditAccounts,
  getReceiptVoucherDebitAccounts,
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

function parseAmount(value) {
  const parsed = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeReceiptPaymentMethod(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "CASH" || normalized === "ONLINE") {
    return normalized;
  }
  return "ONLINE";
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
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
  searchable = false,
  searchPlaceholder = "Search...",
  disabled = false,
  contentWidthCh = null,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [menuStyle, setMenuStyle] = useState(null);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedOption = options.find((option) => String(option?.id) === String(value || ""));
  const selectedLabel = String(selectedOption?.label || "").trim();
  const filteredOptions = useMemo(() => {
    const normalizedQuery = String(searchTerm || "").trim().toLowerCase();
    if (!searchable || !normalizedQuery) {
      return options;
    }
    return options.filter((option) =>
      String(option?.label || "")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [options, searchTerm, searchable]);

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

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      return undefined;
    }
    if (!searchable) {
      return undefined;
    }
    const focusId = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    });
    return () => {
      window.cancelAnimationFrame(focusId);
    };
  }, [isOpen, searchable]);

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
              {searchable ? (
                <div className="border-b border-slate-200 p-2">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              ) : null}
              <div className="max-h-full overflow-y-auto p-1">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => {
                    const optionId = String(option?.id || "");
                    const isActive = String(value || "") === optionId;
                    return (
                      <button
                        key={optionId}
                        type="button"
                        onClick={() => {
                          onChange(optionId);
                          setSearchTerm("");
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
  const PAGE_SIZE = 5;
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
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [isAccessDeniedDialogOpen, setIsAccessDeniedDialogOpen] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");
  const [isReceiptVoucherOpen, setIsReceiptVoucherOpen] = useState(false);
  const [receiptSourceCollection, setReceiptSourceCollection] = useState(null);
  const [receiptVoucherForm, setReceiptVoucherForm] = useState({
    drAccount: "",
    crAccount: "",
    voucherDate: "",
    amount: "",
    method: "ONLINE",
    docNumber: "",
    description: "",
  });
  const [receiptVoucherId, setReceiptVoucherId] = useState("");
  const [receiptDebitAccounts, setReceiptDebitAccounts] = useState([]);
  const [receiptCreditAccounts, setReceiptCreditAccounts] = useState([]);
  const [isReceiptBootstrapping, setIsReceiptBootstrapping] = useState(false);
  const [isReceiptSaving, setIsReceiptSaving] = useState(false);
  const [receiptFormError, setReceiptFormError] = useState("");
  const [hasUserSelectedAcademicYearFilter, setHasUserSelectedAcademicYearFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
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
        setCurrentUserRole(String(data?.role || "").trim().toLowerCase());
      } catch (_error) {
        setCompanyId(null);
        setCurrentUserRole("");
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
    if (currentUserRole === "non-teaching") {
      setAccessDeniedMessage("You do not have permission to edit student fees collection.");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
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
    if (currentUserRole === "non-teaching") {
      setAccessDeniedMessage("You do not have permission to delist student fees collection.");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
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

  const handleOpenReceiptVoucher = (item) => {
    setActiveMenu(null);
    const studentName = String(item?.student_name || "").trim();
    const className = String(item?.class_name || "").trim();
    const sectionName = String(item?.section_name || item?.section || "").trim();
    const rollNo = String(
      item?.roll_no || item?.rollNo || item?.roll_number || item?.rollNumber || "",
    ).trim();
    const receiptMethod = normalizeReceiptPaymentMethod(item?.payment_mode);
    setReceiptSourceCollection(item || null);
    setReceiptVoucherForm({
      drAccount: "",
      crAccount: "",
      voucherDate: new Date().toISOString().split("T")[0],
      amount: String(parseAmount(item?.paid_amount || 0)),
      method: receiptMethod,
      docNumber: item?.transaction_id || "",
      description: [
        studentName ? `Student: ${studentName}` : "",
        className ? `Class: ${className}` : "",
        sectionName ? `Section: ${sectionName}` : "",
        rollNo ? `Roll: ${rollNo}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    });
    setReceiptVoucherId("");
    setReceiptFormError("");
    setIsReceiptVoucherOpen(true);
  };

  const handleCloseReceiptVoucher = () => {
    if (isReceiptSaving) return;
    setIsReceiptVoucherOpen(false);
    setReceiptSourceCollection(null);
    setReceiptVoucherForm({
      drAccount: "",
      crAccount: "",
      voucherDate: "",
      amount: "",
      method: "ONLINE",
      docNumber: "",
      description: "",
    });
    setReceiptVoucherId("");
    setReceiptDebitAccounts([]);
    setReceiptCreditAccounts([]);
    setReceiptFormError("");
  };

  const handleConfirmDelist = async () => {
    if (!delistTarget?.id) {
      return;
    }
    if (currentUserRole === "non-teaching") {
      setIsDelistDialogOpen(false);
      setDelistTarget(null);
      setAccessDeniedMessage("You do not have permission to delist student fees collection.");
      setIsAccessDeniedDialogOpen(true);
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
    const filtered = (Array.isArray(collections) ? collections : []).filter((item) => {
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

    return filtered.sort((left, right) => {
      const leftStudentName = String(left?.student_name || "").trim();
      const rightStudentName = String(right?.student_name || "").trim();
      const nameComparison = leftStudentName.localeCompare(rightStudentName, undefined, {
        sensitivity: "base",
      });
      if (nameComparison !== 0) {
        return nameComparison;
      }
      return String(left?.id || "").localeCompare(String(right?.id || ""));
    });
  }, [collections, filters]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredCollections.length / PAGE_SIZE)),
    [filteredCollections.length, PAGE_SIZE],
  );

  const paginatedCollections = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredCollections.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredCollections, PAGE_SIZE]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.studentName, filters.academicYear, filters.className]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

  useEffect(() => {
    if (!isReceiptVoucherOpen || !companyId) return;
    let isMounted = true;
    const bootstrap = async () => {
      setIsReceiptBootstrapping(true);
      setReceiptFormError("");
      try {
        const [debitAccounts, creditAccounts, voucherId] = await Promise.all([
          getReceiptVoucherDebitAccounts(),
          getReceiptVoucherCreditAccounts(),
          generateReceiptVoucherId(companyId),
        ]);
        if (!isMounted) return;
        setReceiptDebitAccounts(Array.isArray(debitAccounts) ? debitAccounts : []);
        setReceiptCreditAccounts(Array.isArray(creditAccounts) ? creditAccounts : []);
        setReceiptVoucherId(voucherId || "");
      } catch (_error) {
        if (!isMounted) return;
        setReceiptFormError("Unable to load receipt voucher accounts.");
      } finally {
        if (isMounted) {
          setIsReceiptBootstrapping(false);
        }
      }
    };
    bootstrap();
    return () => {
      isMounted = false;
    };
  }, [isReceiptVoucherOpen, companyId]);

  const handleReceiptVoucherSubmit = async (event) => {
    event.preventDefault();
    if (!companyId) {
      setReceiptFormError("Company context missing.");
      return;
    }
    if (!receiptVoucherForm.drAccount) {
      setReceiptFormError("Select Receipt In A/c (Dr.).");
      return;
    }
    if (!receiptVoucherForm.crAccount) {
      setReceiptFormError("Select Paid By (Cr.).");
      return;
    }
    if (!receiptVoucherForm.amount || Number(receiptVoucherForm.amount) <= 0) {
      setReceiptFormError("Enter valid receipt amount.");
      return;
    }
    if (!receiptVoucherForm.voucherDate) {
      setReceiptFormError("Transaction date is required.");
      return;
    }

    const username =
      (typeof window !== "undefined" &&
        (localStorage.getItem("user_display_name") ||
          localStorage.getItem("user_name") ||
          localStorage.getItem("username") ||
          localStorage.getItem("user"))) ||
      "Web User";

    setIsReceiptSaving(true);
    setReceiptFormError("");
    try {
      await createReceiptVoucher({
        company_id: companyId,
        voucher_id: receiptVoucherId || null,
        voucher_table_id: null,
        transaction_id: null,
        voucher_date: receiptVoucherForm.voucherDate,
        amount: Number(receiptVoucherForm.amount) || 0,
        dr_account_name_id: Number(receiptVoucherForm.drAccount),
        cr_account_name_id: Number(receiptVoucherForm.crAccount),
        description: receiptVoucherForm.description || "",
        payment_mode: receiptVoucherForm.method || "ONLINE",
        reference_no: receiptVoucherForm.docNumber || "",
        created_by: username,
      });
      handleCloseReceiptVoucher();
    } catch (error) {
      setReceiptFormError(
        error?.response?.data?.msg ||
          error?.response?.data?.response ||
          "Unable to save receipt voucher.",
      );
    } finally {
      setIsReceiptSaving(false);
    }
  };

  return (
    <main className="dashboard-shell h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full w-full flex-col px-2 pb-3 pt-4 sm:px-6 sm:pb-4 lg:px-8 lg:pt-8">
        <section className="shrink-0 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-700 via-cyan-700 to-teal-700 px-2.5 py-3 text-white shadow-[0_16px_34px_rgba(14,116,144,0.25)] sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-1.5 sm:gap-3">
            <h1 className="min-w-0 flex-1 text-lg font-semibold leading-tight tracking-wide sm:text-2xl">
              Student Fees Collection List
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
                searchable
                searchPlaceholder="Search student..."
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

            {/* <button
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
            </button> */}
          </div>

          <div className="mt-2.5 grid gap-1.5 lg:hidden">
            <div className="grid grid-cols-2 gap-1.5">
              <FilterSelect
                value={filters.studentName}
                onChange={(selectedValue) =>
                  setFilters((prev) => ({ ...prev, studentName: selectedValue }))
                }
                options={studentFilterOptions}
                placeholder="All students"
                className="min-w-0 w-full"
                searchable
                searchPlaceholder="Search student..."
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
            <div className="grid grid-cols-2 gap-1.5">
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

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:mt-6 sm:p-5">
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
                  {/* <th className="px-2 py-3 font-semibold">Payment Date</th>
                  <th className="px-2 py-3 font-semibold">Payment Mode</th>
                  <th className="px-2 py-3 font-semibold">Status</th>
                  <th className="px-2 py-3 font-semibold">Transaction ID</th> */}
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

                {paginatedCollections.map((item, index) => (
                  <tr key={item.id} className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3 font-medium text-slate-800">
                      {(currentPage - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <td className="px-2 py-3">{item.student_name || "-"}</td>
                    <td className="px-2 py-3">{item.academic_year_name || "-"}</td>
                    <td className="px-2 py-3">{item.class_name || "-"}</td>
                    <td className="px-2 py-3">{item.installment_name_display || item.installment_name || "-"}</td>
                    <td className="px-2 py-3">{formatDate(item.due_date)}</td>
                    <td className="px-2 py-3 font-semibold text-slate-900">{formatAmount(item.total_amount)}</td>
                    <td className="px-2 py-3">{formatAmount(item.paid_amount)}</td>
                    <td className="px-2 py-3">{formatAmount(item.due_amount)}</td>
                    {/* <td className="px-2 py-3">{item.payment_date || "-"}</td>
                    <td className="px-2 py-3">{item.payment_mode_display || item.payment_mode || "-"}</td>
                    <td className="px-2 py-3">
                      <span className={statusClassName(item.status)}>
                        {item.status_display || item.status || "-"}
                      </span>
                    </td>
                    <td className="px-2 py-3">{item.transaction_id || "-"}</td> */}
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
          {!isLoading && !errorMessage && filteredCollections.length > PAGE_SIZE ? (
            <div className="mt-3 shrink-0 flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
              <p className="text-xs text-slate-600 sm:text-sm">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={isLoading || currentPage === 1}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={isLoading || currentPage === totalPages}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
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
                onClick={() => handleOpenReceiptVoucher(activeMenu.item)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Receipt Voucher
              </button>
              <button
                type="button"
                onClick={() => handleReview(activeMenu.item)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Review
              </button>
              {currentUserRole !== "non-teaching" ? (
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
              ) : null}
              {currentUserRole !== "non-teaching" ? (
                <button
                  type="button"
                  onClick={() => handleDelist(activeMenu.item)}
                  className="block w-full px-3 py-2 text-left text-sm text-red-600 transition hover:bg-slate-100"
                >
                  Delist
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}

      {isReceiptVoucherOpen && typeof document !== "undefined"
        ? createPortal(
        <div className="fixed inset-0 z-[3200] flex items-end justify-center overflow-y-auto p-2 sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={handleCloseReceiptVoucher} />
          <div className="relative z-10 flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-3xl">
            <div className="flex items-center justify-between bg-blue-800 px-4 py-4 text-white sm:px-6">
              <div>
                <h3 className="text-xl font-semibold sm:text-2xl"> Receipt Voucher</h3>
                {/* <p className="hidden text-xs text-white/80 lg:block lg:text-sm">
                  Record incoming receipts against your accounts.
                </p> */}
              </div>
              <button
                type="button"
                onClick={handleCloseReceiptVoucher}
                className="rounded-full border border-white/30 p-2 hover:bg-white/10"
                disabled={isReceiptSaving}
              >
                <span className="text-lg">&times;</span>
              </button>
            </div>

            <form onSubmit={handleReceiptVoucherSubmit} className="min-h-0 space-y-4 overflow-y-auto px-3 py-3 sm:px-6 sm:py-6">
              {receiptFormError ? (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {receiptFormError}
                </div>
              ) : null}

              <div className="grid grid-cols-1 rounded-xl border border-slate-200 bg-white md:grid-cols-2">
                <div className="flex flex-col border-b border-slate-200 p-3 sm:p-4 md:border-b-0 md:border-r">
                  <label className="text-sm font-semibold text-slate-700">
                    Receipt In A/c (Dr.) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={receiptVoucherForm.drAccount}
                    onChange={(event) =>
                      setReceiptVoucherForm((prev) => ({ ...prev, drAccount: event.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-[16px] leading-5 text-slate-800 outline-none sm:text-sm"
                    required
                    disabled={isReceiptBootstrapping || isReceiptSaving}
                  >
                    <option value="">Select Account</option>
                    {receiptDebitAccounts.map((account) => (
                      <option key={`receipt-dr-${account.id}`} value={account.id}>
                        {account.account_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col p-3 sm:p-4">
                  <label className="text-sm font-semibold text-slate-700">
                    Paid By (Cr.) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={receiptVoucherForm.crAccount}
                    onChange={(event) =>
                      setReceiptVoucherForm((prev) => ({ ...prev, crAccount: event.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-[16px] leading-5 text-slate-800 outline-none sm:text-sm"
                    required
                    disabled={isReceiptBootstrapping || isReceiptSaving}
                  >
                    <option value="">Select Account</option>
                    {receiptCreditAccounts.map((account) => (
                      <option key={`receipt-cr-${account.id}`} value={account.id}>
                        {account.account_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 rounded-xl border border-slate-200 bg-white md:grid-cols-2">
                <div className="flex flex-col border-b border-slate-200 p-3 sm:p-4 md:border-b-0 md:border-r">
                  <label className="text-sm font-semibold text-slate-700">Transaction Date :</label>
                  <input
                    type="date"
                    value={receiptVoucherForm.voucherDate}
                    onChange={(event) =>
                      setReceiptVoucherForm((prev) => ({ ...prev, voucherDate: event.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-[16px] leading-5 text-slate-800 outline-none sm:text-sm"
                    required
                    disabled={isReceiptSaving}
                  />
                </div>
                <div className="flex flex-col p-3 sm:p-4">
                  <label className="text-sm font-semibold text-slate-700">
                    Receipt Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={receiptVoucherForm.amount}
                    onChange={(event) =>
                      setReceiptVoucherForm((prev) => ({ ...prev, amount: event.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-right text-[16px] leading-5 text-slate-800 outline-none sm:text-sm"
                    required
                    disabled={isReceiptSaving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 rounded-xl border border-slate-200 bg-white md:grid-cols-2">
                <div className="flex flex-col border-b border-slate-200 p-3 sm:p-4 md:border-b-0 md:border-r">
                  <label className="text-sm font-semibold text-slate-700">
                    Payment Method <span className="text-rose-500">*</span>
                  </label>
                  <div className="mt-2 flex flex-wrap gap-4">
                    {["CASH", "ONLINE", "CARD", "CHECK"].map((method) => (
                      <label key={method} className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name="receipt-payment-method"
                          value={method}
                          checked={receiptVoucherForm.method === method}
                          onChange={(event) =>
                            setReceiptVoucherForm((prev) => ({ ...prev, method: event.target.value }))
                          }
                          disabled={isReceiptSaving}
                        />
                        {method}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col p-3 sm:p-4">
                  <label className="text-sm font-semibold text-slate-700">Document Number</label>
                  <input
                    type="text"
                    value={receiptVoucherForm.docNumber}
                    onChange={(event) =>
                      setReceiptVoucherForm((prev) => ({ ...prev, docNumber: event.target.value }))
                    }
                    placeholder="Optional"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-[16px] leading-5 text-slate-800 outline-none sm:text-sm"
                    disabled={isReceiptSaving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 rounded-xl border border-slate-200 bg-white md:grid-cols-2">
                <div className="flex flex-col border-b border-slate-200 p-3 sm:p-4 md:border-b-0 md:border-r">
                  <label className="text-sm font-semibold text-slate-700">Description</label>
                  <textarea
                    rows={2}
                    value={receiptVoucherForm.description}
                    onChange={(event) =>
                      setReceiptVoucherForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-[16px] leading-5 text-slate-800 outline-none sm:text-sm"
                    disabled={isReceiptSaving}
                  />
                </div>
                <div className="flex flex-col p-3 sm:p-4 text-sm text-slate-600">
                  <span className="font-semibold text-slate-700">Voucher ID :</span>
                  <span>{receiptVoucherId || "-"}</span>
                  <span className="mt-2 font-semibold text-slate-700">Fees Collection ID :</span>
                  <span>{receiptSourceCollection?.id || "-"}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 px-1 pt-4">
                <button
                  type="button"
                  onClick={handleCloseReceiptVoucher}
                  className="rounded-full border border-slate-300 px-5 py-2 font-medium text-slate-700 hover:bg-slate-50"
                  disabled={isReceiptSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-blue-700 px-6 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                  disabled={isReceiptSaving || isReceiptBootstrapping}
                >
                  {isReceiptSaving ? "Saving..." : "Save & Close"}
                </button>
              </div>
            </form>
          </div>
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

      <AccessDeniedDialog
        open={isAccessDeniedDialogOpen}
        message={accessDeniedMessage || "You do not have permission for this action."}
        onClose={() => {
          setIsAccessDeniedDialogOpen(false);
          setAccessDeniedMessage("");
        }}
      />
    </main>
  );
}
