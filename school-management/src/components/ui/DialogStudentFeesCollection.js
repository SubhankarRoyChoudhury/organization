"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCurrentSchoolInfo } from "@/lib/apiService";
import DatePickerField from "@/components/ui/DatePickerField";

const INSTALLMENT_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half Yearly" },
  { value: "yearly", label: "Yearly" },
  { value: "due", label: "Due" },
];

const PAYMENT_MODE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "online", label: "Online" },
  { value: "cheque", label: "Cheque" },
  { value: "upi", label: "UPI" },
];

function getDefaultFormData() {
  return {
    studentAcademicRecordId: "",
    feeStructureId: "",
    installmentName: "monthly",
    dueDate: "",
    paidAmount: "0",
    paymentDate: "",
    paymentMode: "",
    transactionId: "",
    remarks: "",
  };
}

function getFormDataFromInitial(initialData, options = {}) {
  if (!initialData || typeof initialData !== "object") {
    return getDefaultFormData();
  }
  const shouldClearPaymentFields = Boolean(options?.clearPaymentFields);

  const rawInstallment = String(
    initialData.installment_name ?? initialData.installmentName ?? "monthly",
  )
    .trim()
    .toLowerCase();
  const formInstallment = rawInstallment === "one_time" ? "due" : rawInstallment;

  return {
    studentAcademicRecordId: String(
      initialData.student_academic_rcord_id ?? initialData.studentAcademicRecordId ?? "",
    ),
    feeStructureId: String(initialData.fee_structure_id ?? initialData.feeStructureId ?? ""),
    installmentName: formInstallment,
    dueDate: String(initialData.due_date ?? initialData.dueDate ?? ""),
    paidAmount: String(initialData.paid_amount ?? initialData.paidAmount ?? "0"),
    paymentDate: shouldClearPaymentFields
      ? ""
      : String(initialData.payment_date ?? initialData.paymentDate ?? ""),
    paymentMode: shouldClearPaymentFields
      ? ""
      : String(initialData.payment_mode ?? initialData.paymentMode ?? ""),
    transactionId: shouldClearPaymentFields
      ? ""
      : String(initialData.transaction_id ?? initialData.transactionId ?? ""),
    remarks: String(initialData.remarks ?? ""),
  };
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function SingleSelectDropdown({
  value,
  options,
  onChange,
  placeholder = "Select option",
  disabled = false,
  className = "",
  autoFocus = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const hasAutoOpenedRef = useRef(false);

  const selectedOption = options.find((option) => String(option?.id) === String(value || ""));
  const selectedLabel = String(selectedOption?.label || "").trim();

  const updateMenuPosition = () => {
    const containerElement = containerRef.current;
    const menuElement = menuRef.current;
    if (!containerElement || !menuElement) {
      return;
    }

    const rect = containerElement.getBoundingClientRect();
    const viewportPadding = 8;
    const menuWidth = rect.width;
    const menuMaxHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = openAbove
      ? Math.max(160, Math.min(menuMaxHeight, spaceAbove))
      : Math.max(160, Math.min(menuMaxHeight, spaceBelow));

    const left = Math.max(
      viewportPadding,
      Math.min(rect.left, window.innerWidth - menuWidth - viewportPadding),
    );
    const top = openAbove
      ? Math.max(viewportPadding, rect.top - maxHeight - 6)
      : rect.bottom + 6;

    menuElement.style.left = `${left}px`;
    menuElement.style.top = `${top}px`;
    menuElement.style.width = `${menuWidth}px`;
    menuElement.style.maxHeight = `${maxHeight}px`;
  };

  useEffect(() => {
    if (!isOpen || disabled) {
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
  }, [disabled, isOpen]);

  useEffect(() => {
    if (!autoFocus || disabled) {
      return undefined;
    }

    const focusId = window.requestAnimationFrame(() => {
      const buttonElement = buttonRef.current;
      if (!buttonElement) {
        return;
      }

      buttonElement.focus({ preventScroll: true });

      if (!hasAutoOpenedRef.current) {
        hasAutoOpenedRef.current = true;
        setIsOpen(true);
      }
    });

    return () => {
      window.cancelAnimationFrame(focusId);
    };
  }, [autoFocus, disabled]);

  const chooseOption = (optionId) => {
    onChange(optionId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-white disabled:text-slate-500"
      >
        <span className={`truncate ${selectedLabel ? "text-slate-900" : "text-slate-400"}`}>
          {selectedLabel || placeholder}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[2500] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.22)]"
              role="listbox"
            >
              <div className="max-h-full overflow-y-auto p-1">
                {options.length > 0 ? (
                  options.map((option) => {
                    const optionId = String(option?.id || "");
                    const isSelected = String(value || "") === optionId;
                    return (
                      <button
                        key={optionId || `option-${option?.label}`}
                        type="button"
                        onClick={() => chooseOption(optionId)}
                        className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition ${
                          isSelected
                            ? "bg-sky-50 text-sky-700"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className="truncate">{String(option?.label || "")}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-3 text-sm text-slate-500">No options found.</div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default function DialogStudentFeesCollection({
  open,
  onClose,
  onCreate,
  onUpdate,
  onRepay,
  companyId,
  studentAcademicOptions = [],
  feeStructureOptions = [],
  initialData = null,
  createInitialData = null,
  mode = "create",
}) {
  const isEditMode = mode === "edit";
  const isReviewMode = mode === "review";
  const isRepayMode = mode === "repay";
  const hasInitialDataMode = isEditMode || isReviewMode || isRepayMode;
  const hasCreateInitialData =
    !hasInitialDataMode && createInitialData && typeof createInitialData === "object";
  const [formData, setFormData] = useState(() =>
    hasInitialDataMode
      ? getFormDataFromInitial(initialData, { clearPaymentFields: isRepayMode })
      : hasCreateInitialData
        ? { ...getDefaultFormData(), ...createInitialData }
        : getDefaultFormData(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentSchoolName, setCurrentSchoolName] = useState("");
  const dialogRef = useRef(null);
  const dragStateRef = useRef(null);
  const paidAmountInputRef = useRef(null);
  const hasAutoFocusedPaidAmountRef = useRef(false);

  const selectedStudentRecord = useMemo(() => {
    const selectedId = Number(formData.studentAcademicRecordId);
    if (!Number.isFinite(selectedId)) {
      return null;
    }
    return (Array.isArray(studentAcademicOptions) ? studentAcademicOptions : []).find(
      (item) => Number(item?.id) === selectedId,
    );
  }, [formData.studentAcademicRecordId, studentAcademicOptions]);

  const academicYearId = useMemo(() => {
    const raw = selectedStudentRecord?.academic_year_id ?? selectedStudentRecord?.academicYearId;
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : null;
  }, [selectedStudentRecord]);

  const classDetailsId = useMemo(() => {
    const raw = selectedStudentRecord?.class_details_id ?? selectedStudentRecord?.classDetailsId;
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : null;
  }, [selectedStudentRecord]);

  const filteredFeeStructureOptions = useMemo(() => {
    if (!academicYearId || !classDetailsId) {
      return [];
    }
    return (Array.isArray(feeStructureOptions) ? feeStructureOptions : [])
      .filter((item) => {
        const itemAcademicYearId = Number(item?.academic_year_id ?? item?.academicYearId);
        const itemClassDetailsId = Number(item?.class_details_id ?? item?.classDetailsId);
        return itemAcademicYearId === academicYearId && itemClassDetailsId === classDetailsId;
      })
      .sort((left, right) => Number(left?.id) - Number(right?.id));
  }, [academicYearId, classDetailsId, feeStructureOptions]);

  const selectedFeeStructure = useMemo(() => {
    const selectedId = Number(formData.feeStructureId);
    if (!Number.isFinite(selectedId)) {
      return null;
    }
    return filteredFeeStructureOptions.find((item) => Number(item?.id) === selectedId) || null;
  }, [filteredFeeStructureOptions, formData.feeStructureId]);

  const totalAmount = useMemo(() => {
    if (hasInitialDataMode) {
      const initialTotal = initialData?.total_amount ?? initialData?.totalAmount;
      const normalizedInitialTotal = toAmount(initialTotal);
      if (Number.isFinite(normalizedInitialTotal) && normalizedInitialTotal > 0) {
        return formatAmount(normalizedInitialTotal);
      }
    }
    const raw = selectedFeeStructure?.total_fees ?? selectedFeeStructure?.totalFees;
    return formatAmount(toAmount(raw));
  }, [hasInitialDataMode, initialData, selectedFeeStructure]);

  const dueAmount = useMemo(() => {
    const total = toAmount(totalAmount);
    const paid = toAmount(formData.paidAmount);
    return formatAmount(Math.max(0, total - paid));
  }, [formData.paidAmount, totalAmount]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (hasInitialDataMode) {
      setFormData(
        getFormDataFromInitial(initialData, { clearPaymentFields: isRepayMode }),
      );
      return;
    }

    if (hasCreateInitialData) {
      setFormData({
        ...getDefaultFormData(),
        ...createInitialData,
      });
      return;
    }

    setFormData(getDefaultFormData());
  }, [
    open,
    hasInitialDataMode,
    hasCreateInitialData,
    initialData,
    createInitialData,
    isRepayMode,
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

  useEffect(() => {
    if (!open) {
      hasAutoFocusedPaidAmountRef.current = false;
      return undefined;
    }

    if (!isRepayMode || isReviewMode || hasAutoFocusedPaidAmountRef.current) {
      return undefined;
    }

    let timeoutId = null;
    const focusPaidAmountInput = () => {
      const inputElement = paidAmountInputRef.current;
      if (!inputElement || inputElement.disabled) {
        return false;
      }
      inputElement.focus({ preventScroll: true });
      inputElement.select();
      hasAutoFocusedPaidAmountRef.current = true;
      return true;
    };

    const frameId = window.requestAnimationFrame(() => {
      if (!focusPaidAmountInput()) {
        timeoutId = window.setTimeout(() => {
          focusPaidAmountInput();
        }, 80);
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [open, isRepayMode, isReviewMode]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let mounted = true;

    getCurrentSchoolInfo()
      .then((data) => {
        if (!mounted) {
          return;
        }
        setCurrentSchoolName(
          String(data?.school?.name || data?.company?.name || "").trim(),
        );
      })
      .catch(() => {
        if (mounted) {
          setCurrentSchoolName("");
        }
      });

    return () => {
      mounted = false;
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    onClose();
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
  };

  const handleFieldChange = (name, value) => {
    if (isReviewMode) {
      return;
    }
    setFormData((previous) => {
      return {
        ...previous,
        [name]: value,
        ...(name === "studentAcademicRecordId" ? { feeStructureId: "" } : {}),
      };
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    handleFieldChange(name, value);
  };

  const handlePrintReceipt = () => {
    const installmentLabel =
      INSTALLMENT_OPTIONS.find(
        (option) => option.value === String(formData.installmentName || "").trim().toLowerCase(),
      )?.label || "-";
    const paymentModeLabel =
      PAYMENT_MODE_OPTIONS.find(
        (option) => option.value === String(formData.paymentMode || "").trim().toLowerCase(),
      )?.label || "-";
    const studentName = String(
      selectedStudentRecord?.student_name ||
        selectedStudentRecord?.student?.name ||
        "-",
    ).trim() || "-";
    const rollNo = String(selectedStudentRecord?.roll_no || selectedStudentRecord?.rollNo || "-").trim() || "-";
    const className = String(selectedStudentRecord?.class_name || "-").trim() || "-";
    const sectionName = String(selectedStudentRecord?.section_name || "-").trim() || "-";
    const paidAmount = formatAmount(toAmount(formData.paidAmount));
    const due = formatAmount(Math.max(0, toAmount(totalAmount) - toAmount(formData.paidAmount)));
    const paymentDate = String(formData.paymentDate || "-").trim() || "-";
    const dueDate = String(formData.dueDate || "-").trim() || "-";
    const transactionId = String(formData.transactionId || "-").trim() || "-";
    const remarks = String(formData.remarks || "-").trim() || "-";
    const schoolName = String(
      currentSchoolName || selectedStudentRecord?.school_name || "School Management",
    ).trim();

    const receiptHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>StudentFeesCollectionReceipt</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 0; color: #1e293b; background: #f1f5f9; }
            .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 10mm; background: #fff; }
            .receipt-wrap {
              border: 1px solid #bfdbfe;
              border-radius: 16px;
              padding: 10px;
              background: linear-gradient(145deg, #ffffff, #f8fbff 45%, #eef8ff);
            }
            .inner {
              border: 2px dashed #cbd5e1;
              border-radius: 12px;
              padding: 12px;
            }
            .school {
              display: flex;
              align-items: center;
              gap: 10px;
              border: 1px solid #bae6fd;
              border-radius: 10px;
              padding: 10px 12px;
              background: linear-gradient(90deg, #f0f9ff, #f8fafc);
            }
            .logo {
              width: 34px;
              height: 34px;
              border-radius: 999px;
              background: linear-gradient(145deg, #06b6d4, #22c55e);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #fff;
              font-size: 16px;
              font-weight: 700;
            }
            .school-name { font-size: 20px; font-weight: 700; color: #1e3a8a; }
            .school-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
            .top {
              display: flex;
              justify-content: space-between;
              align-items: end;
              margin-top: 14px;
              margin-bottom: 12px;
            }
            .title { font-size: 32px; font-weight: 800; line-height: 1.1; color: #1e3a8a; }
            .sub { color: #64748b; font-size: 12px; margin-top: 4px; }
            .pill {
              background: linear-gradient(90deg, #e0f2fe, #f0fdf4);
              border: 1px solid #bae6fd;
              border-radius: 8px;
              padding: 8px 10px;
              font-size: 13px;
              color: #334155;
            }
            .info {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 8px 14px;
              margin-top: 8px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              border-bottom: 1px dashed #dbeafe;
              padding: 7px 0;
            }
            .label { color: #475569; font-size: 13px; }
            .value { font-weight: 700; font-size: 14px; text-align: right; color: #0f172a; }
            .amount-box {
              margin-top: 14px;
              border-top: 2px solid #e2e8f0;
              padding-top: 10px;
            }
            .amount-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px dashed #e2e8f0;
              font-size: 16px;
            }
            .amount-label { font-weight: 700; color: #334155; }
            .amount-value { font-weight: 800; color: #0f172a; }
            .paid .amount-label, .paid .amount-value { color: #15803d; }
            .due .amount-label, .due .amount-value { color: #dc2626; }
            .signatures {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 18px;
              margin-top: 24px;
            }
            .sign-box {
              border-top: 1px dashed #94a3b8;
              padding-top: 6px;
              font-size: 12px;
              color: #64748b;
              text-align: center;
            }
            @page { size: A4; margin: 8mm; }
            @media print { body { background: #fff; } .sheet { padding: 0; box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="receipt-wrap">
              <div class="inner">
                <div class="school">
                  <div class="logo">₹</div>
                  <div>
                    <div class="school-name">${escapeHtml(schoolName)}</div>
                    <div class="school-sub">Fees & Accounts Department</div>
                  </div>
                </div>

                <div class="top">
                  <div>
                    <div class="title">Fees Collection Receipt</div>
                  </div>
                  <div class="sub">Printed On: ${escapeHtml(new Date().toLocaleString())}</div>
                </div>

                <div class="pill">Installment: <strong>${escapeHtml(installmentLabel)}</strong></div>

                <div class="info">
                  <div class="row"><span class="label">Student Name</span><span class="value">${escapeHtml(studentName)}</span></div>
                  <div class="row"><span class="label">Roll No</span><span class="value">${escapeHtml(rollNo)}</span></div>
                  <div class="row"><span class="label">Class</span><span class="value">${escapeHtml(className)}</span></div>
                  <div class="row"><span class="label">Section</span><span class="value">${escapeHtml(sectionName)}</span></div>
                  <div class="row"><span class="label">Due Date</span><span class="value">${escapeHtml(dueDate)}</span></div>
                  <div class="row"><span class="label">Payment Date</span><span class="value">${escapeHtml(paymentDate)}</span></div>
                  <div class="row"><span class="label">Payment Mode</span><span class="value">${escapeHtml(paymentModeLabel)}</span></div>
                  <div class="row"><span class="label">Transaction ID</span><span class="value">${escapeHtml(transactionId)}</span></div>
                  <div class="row"><span class="label">Remarks</span><span class="value">${escapeHtml(remarks)}</span></div>
                  <div class="row"><span class="label">Status</span><span class="value">${toAmount(due) <= 0 ? "Paid" : toAmount(paidAmount) > 0 ? "Partially Paid" : "Pending"}</span></div>
                </div>

                <div class="amount-box">
                  <div class="amount-row">
                    <span class="amount-label">Total Amount</span>
                    <span class="amount-value">₹ ${escapeHtml(totalAmount)}</span>
                  </div>
                  <div class="amount-row paid">
                    <span class="amount-label">Paid Amount</span>
                    <span class="amount-value">₹ ${escapeHtml(paidAmount)}</span>
                  </div>
                  <div class="amount-row due">
                    <span class="amount-label">Due Amount</span>
                    <span class="amount-value">₹ ${escapeHtml(due)}</span>
                  </div>
                </div>

                <div class="signatures">
                  <div class="sign-box">Parent/Guardian Signature</div>
                  <div class="sign-box">Received By</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printFrame = document.createElement("iframe");
    const originalDocumentTitle = document.title;
    document.title = "StudentFeesCollectionReceipt";
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "1px";
    printFrame.style.height = "1px";
    printFrame.style.border = "0";
    printFrame.style.opacity = "0";
    printFrame.style.pointerEvents = "none";
    printFrame.setAttribute("aria-hidden", "true");

    const cleanup = () => {
      window.setTimeout(() => {
        document.title = originalDocumentTitle;
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 150);
    };

    document.body.appendChild(printFrame);
    const frameDocument =
      printFrame.contentDocument || printFrame.contentWindow?.document || null;
    if (!frameDocument || !printFrame.contentWindow) {
      cleanup();
      setErrorMessage("Unable to print receipt. Please try again.");
      return;
    }

    frameDocument.open();
    frameDocument.write(receiptHtml);
    frameDocument.close();
    frameDocument.title = "";

    window.setTimeout(() => {
      const frameWindow = printFrame.contentWindow;
      if (!frameWindow) {
        cleanup();
        setErrorMessage("Unable to print receipt. Please try again.");
        return;
      }
      frameWindow.focus();
      frameWindow.onafterprint = cleanup;
      frameWindow.print();
    }, 250);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isReviewMode) {
      return;
    }
    setErrorMessage("");

    if (!String(formData.studentAcademicRecordId || "").trim()) {
      setErrorMessage("Please select student academic record.");
      return;
    }

    if (!String(formData.feeStructureId || "").trim()) {
      setErrorMessage("Please select fee structure.");
      return;
    }

    const paid = toAmount(formData.paidAmount);
    const total = toAmount(totalAmount);
    if (paid > total) {
      setErrorMessage("Paid amount cannot exceed total amount.");
      return;
    }

    const accessToken =
      typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";

    setIsSubmitting(true);
    try {
      const payload = {
        id: initialData?.id,
        studentAcademicRecordId: Number(formData.studentAcademicRecordId),
        feeStructureId: Number(formData.feeStructureId),
        installmentName: formData.installmentName,
        dueDate: formData.dueDate || null,
        totalAmount,
        paidAmount: formatAmount(paid),
        paymentDate: formData.paymentDate || null,
        paymentMode: formData.paymentMode || null,
        transactionId: String(formData.transactionId || "").trim(),
        remarks: String(formData.remarks || "").trim(),
        companyId: companyId || undefined,
        accessToken,
      };

      if (isRepayMode) {
        if (typeof onRepay === "function") {
          await onRepay({
            ...payload,
            sourceCollectionId: initialData?.id,
            repayAmount: formatAmount(paid),
            currentDueAmount: totalAmount,
          });
        } else if (typeof onUpdate === "function") {
          await onUpdate(payload);
        } else {
          throw new Error("Repay handler is not available.");
        }
      } else if (isEditMode) {
        if (typeof onUpdate !== "function") {
          throw new Error("Update handler is not available.");
        }
        await onUpdate(payload);
      } else {
        await onCreate(payload);
      }
    } catch (error) {
      setErrorMessage(
        error?.message
            || (isRepayMode
              ? "Unable to process repayment."
              : isEditMode
                ? "Unable to update student fees collection."
                : "Unable to create student fees collection."),
      );
      setIsSubmitting(false);
    }
  };

  const studentLabel = (record) => {
    if (!record) {
      return "";
    }
    const studentName = String(record.student_name || record.studentName || "").trim();
    const className = String(record.class_name || record.className || "").trim();
    const sectionName = String(record.section_name || record.sectionName || "").trim();
    const rollNumber = String(
      record.roll_number || record.rollNo || record.student_roll_number || "",
    ).trim();
    const parts = [studentName];
    const meta = [
      className,
      sectionName,
      rollNumber,
    ]
      .filter(Boolean)
      .join(" / ");
    if (meta) {
      parts.push(`(${meta})`);
    }
    return parts.filter(Boolean).join(" ");
  };

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center overflow-hidden p-2 sm:p-6">
      <button
        type="button"
        onClick={handleClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        aria-label="Close student fees collection dialog"
      />

      <div
        ref={dialogRef}
        style={{
          transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
        }}
        className="relative z-10 flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] will-change-transform max-h-[calc(100svh-0.5rem)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl"
      >
        <div className="border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                {isReviewMode
                  ? "Review Student Fees Collection"
                  : isRepayMode
                    ? "Re-Pay Student Fees Collection"
                    : isEditMode
                    ? "Edit Student Fees Collection"
                    : "Add Student Fees Collection"}
              </h2>
              {/* <p className="text-sm text-slate-500">
                Record installment payments and track pending dues.
              </p> */}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                title="Print receipt"
                aria-label="Print receipt"
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
                  <path d="M7 9V4h10v5" />
                  <rect x="6" y="14" width="12" height="6" rx="1" />
                  <path d="M6 12H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1" />
                </svg>
              </button>
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
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-5"
        >
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Student Academic Record</span>
            <SingleSelectDropdown
              value={formData.studentAcademicRecordId}
              onChange={(value) => handleFieldChange("studentAcademicRecordId", value)}
              options={(Array.isArray(studentAcademicOptions) ? studentAcademicOptions : []).map(
                (record) => ({
                  id: String(record.id),
                  label: studentLabel(record) || `Record #${record.id}`,
                }),
              )}
              placeholder="Select student record"
              autoFocus
              disabled={
                isEditMode ||
                isReviewMode ||
                isRepayMode
              }
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Academic Year</span>
            <input
              type="text"
              value={String(selectedStudentRecord?.academic_year_name || "")}
              disabled
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none disabled:cursor-not-allowed disabled:bg-white"
              placeholder="-"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Class</span>
            <input
              type="text"
              value={String(selectedStudentRecord?.class_name || "")}
              disabled
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none disabled:cursor-not-allowed disabled:bg-white"
              placeholder="-"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 sm:col-span-1">
            <span>Fee Structure</span>
            <SingleSelectDropdown
              value={formData.feeStructureId}
              onChange={(value) => handleFieldChange("feeStructureId", value)}
              options={filteredFeeStructureOptions.map((item) => ({
                id: String(item.id),
                label: `${item.class_name || "Class"} / ${item.academic_year_name || "Year"} / Total ${formatAmount(item.total_fees)}`,
              }))}
              placeholder="Select fee structure"
              disabled={!selectedStudentRecord || isReviewMode || isRepayMode}
            />
            {selectedStudentRecord && filteredFeeStructureOptions.length === 0 ? (
              <div className="text-xs text-amber-700">
                No fee structure found for selected academic year and class.
              </div>
            ) : null}
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Installment</span>
            <SingleSelectDropdown
              value={formData.installmentName}
              onChange={(value) => handleFieldChange("installmentName", value)}
              options={INSTALLMENT_OPTIONS.map((item) => ({
                id: item.value,
                label: item.label,
              }))}
              placeholder="Select installment"
              disabled={isReviewMode}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Due Date</span>
            <DatePickerField
              value={formData.dueDate}
              onChange={(value) =>
                handleChange({
                  target: { name: "dueDate", value },
                })
              }
              disabled={isReviewMode}
              ariaLabel="Due Date"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Total Due Amount</span>
            <input
              type="text"
              value={totalAmount}
              disabled
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none disabled:cursor-not-allowed disabled:bg-white"
              placeholder="0.00"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Paid Amount</span>
            <input
              ref={paidAmountInputRef}
              type="number"
              min="0"
              step="0.01"
              name="paidAmount"
              value={formData.paidAmount}
              onChange={handleChange}
              disabled={isReviewMode}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Balanced Due Amount</span>
            <input
              type="text"
              value={dueAmount}
              disabled
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none disabled:cursor-not-allowed disabled:bg-white"
              placeholder="0.00"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Payment Date</span>
            <DatePickerField
              value={formData.paymentDate}
              onChange={(value) =>
                handleChange({
                  target: { name: "paymentDate", value },
                })
              }
              disabled={isReviewMode}
              ariaLabel="Payment Date"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Payment Mode</span>
            <SingleSelectDropdown
              value={formData.paymentMode}
              onChange={(value) => handleFieldChange("paymentMode", value)}
              options={[
                { id: "", label: "None" },
                ...PAYMENT_MODE_OPTIONS.map((item) => ({ id: item.value, label: item.label })),
              ]}
              placeholder="Select payment mode"
              disabled={isReviewMode}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Transaction ID</span>
            <input
              type="text"
              name="transactionId"
              value={formData.transactionId}
              onChange={handleChange}
              disabled={isReviewMode}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="Optional"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 sm:col-span-3">
            <span>Remarks</span>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              disabled={isReviewMode}
              className="min-h-[88px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="Optional"
            />
          </label>

          {errorMessage ? (
            <div className="sm:col-span-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-200 bg-white pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isReviewMode ? "Close" : "Cancel"}
            </button>
            {!isReviewMode ? (
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : isRepayMode ? "Re-Pay" : isEditMode ? "Update" : "Save"}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
