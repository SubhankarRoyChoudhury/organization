"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCurrentSchoolInfo } from "@/lib/apiService";
import CreateAcademicYearDialog from "@/components/ui/CreateAcademicYearDialog";
import DatePickerField from "@/components/ui/DatePickerField";

function getDefaultFormData() {
  return {
    studentId: "",
    academicYearId: "",
    classDetailsId: "",
    sectionDetailsId: "",
    rollNumber: "",
    admissionDate: "",
    status: "active",
    remarks: "",
  };
}

function buildFormDataFromRecord(record) {
  const admissionDateRaw = String(record?.admission_date || "").trim();
  const admissionDateOnly = admissionDateRaw ? admissionDateRaw.slice(0, 10) : "";

  return {
    studentId:
      record?.student_company_user_id === null || record?.student_company_user_id === undefined
        ? (
          record?.student_id === null || record?.student_id === undefined
            ? ""
            : String(record.student_id)
        )
        : String(record.student_company_user_id),
    academicYearId:
      record?.academic_year_id === null || record?.academic_year_id === undefined
        ? ""
        : String(record.academic_year_id),
    classDetailsId:
      record?.class_details_id === null || record?.class_details_id === undefined
        ? ""
        : String(record.class_details_id),
    sectionDetailsId:
      record?.section_details_id === null || record?.section_details_id === undefined
        ? ""
        : String(record.section_details_id),
    rollNumber: String(record?.roll_number || "").trim(),
    admissionDate: admissionDateOnly,
    status: String(record?.status || "active").trim() || "active",
    remarks: String(record?.remarks || "").trim(),
  };
}

function getInitialFormData(mode, initialData, initialStudentId, createInitialData = null) {
  if ((mode === "edit" || mode === "review") && initialData) {
    return buildFormDataFromRecord(initialData);
  }
  const defaults = getDefaultFormData();
  const nextStudentId = String(initialStudentId || "").trim();
  if (nextStudentId) {
    defaults.studentId = nextStudentId;
  }
  if (createInitialData && typeof createInitialData === "object") {
    const createStudentId = String(
      createInitialData.studentId ?? createInitialData.student_id ?? "",
    ).trim();
    const nextAcademicYearId = String(
      createInitialData.academicYearId ?? createInitialData.academic_year_id ?? "",
    ).trim();
    const nextClassDetailsId = String(
      createInitialData.classDetailsId ?? createInitialData.class_details_id ?? "",
    ).trim();
    const nextSectionDetailsId = String(
      createInitialData.sectionDetailsId ?? createInitialData.section_details_id ?? "",
    ).trim();
    const nextRollNumber = String(
      createInitialData.rollNumber ?? createInitialData.roll_number ?? "",
    ).trim();
    const nextStatus = String(createInitialData.status ?? "").trim().toLowerCase();
    const nextRemarks = String(createInitialData.remarks ?? "").trim();

    if (createStudentId) defaults.studentId = createStudentId;
    if (nextAcademicYearId) defaults.academicYearId = nextAcademicYearId;
    if (nextClassDetailsId) defaults.classDetailsId = nextClassDetailsId;
    if (nextSectionDetailsId) defaults.sectionDetailsId = nextSectionDetailsId;
    if (nextRollNumber) defaults.rollNumber = nextRollNumber;
    if (nextStatus) defaults.status = nextStatus;
    if (nextRemarks) defaults.remarks = nextRemarks;
  }
  return defaults;
}

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "promoted", label: "Promoted" },
  { value: "detained", label: "Detained" },
  { value: "passed_out", label: "Passed Out" },
  { value: "left", label: "Left" },
];

function getAcademicYearOptionLabel(item) {
  return String(item?.year_name || item?.yearName || "").trim();
}

function getStudentOptionLabel(item) {
  const studentName = String(item?.name || item?.student_name || "").trim();
  const guardianName = String(item?.guardian_name || item?.guardianName || "").trim();
  if (studentName && guardianName) {
    return `${studentName} (${guardianName})`;
  }
  return studentName || guardianName || "";
}

function getStudentOptionAliases(item) {
  return Array.from(
    new Set(
      [
        item?.id,
        item?.student_id,
        item?.studentId,
        item?.student_company_user_id,
        item?.studentCompanyUserId,
        item?.company_user_id,
        item?.companyUserId,
        item?.user_id,
        item?.userId,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

function getPrimaryStudentOptionId(item) {
  const aliases = getStudentOptionAliases(item);
  return aliases[0] || "";
}

function resolveStudentOptionId(rawStudentId, normalizedStudentOptions = []) {
  const normalized = String(rawStudentId || "").trim();
  if (!normalized) {
    return "";
  }

  const directMatch = normalizedStudentOptions.find(
    (item) => String(item?.id || "").trim() === normalized,
  );
  if (directMatch) {
    return String(directMatch.id);
  }

  const aliasMatch = normalizedStudentOptions.find((item) =>
    Array.isArray(item?.aliases) && item.aliases.includes(normalized),
  );
  if (aliasMatch) {
    return String(aliasMatch.id || "");
  }

  return normalized;
}

function resolveStudentOptionIdByName(studentName, guardianName, normalizedStudentOptions = []) {
  const normalizedStudentName = String(studentName || "").trim().toLowerCase();
  const normalizedGuardianName = String(guardianName || "").trim().toLowerCase();
  if (!normalizedStudentName) {
    return "";
  }

  const normalizedOptions = Array.isArray(normalizedStudentOptions)
    ? normalizedStudentOptions
    : [];

  const exactMatch = normalizedOptions.find((item) => {
    const optionStudentName = String(item?.studentName || "").trim().toLowerCase();
    const optionGuardianName = String(item?.guardianName || "").trim().toLowerCase();
    return (
      optionStudentName &&
      optionStudentName === normalizedStudentName &&
      (!normalizedGuardianName || optionGuardianName === normalizedGuardianName)
    );
  });
  if (exactMatch) {
    return String(exactMatch.id || "");
  }

  const sameNameMatches = normalizedOptions.filter(
    (item) => String(item?.studentName || "").trim().toLowerCase() === normalizedStudentName,
  );
  if (sameNameMatches.length === 1) {
    return String(sameNameMatches[0].id || "");
  }

  return "";
}

function AcademicYearDropdown({
  value,
  onSelect,
  academicYears,
  onAddNew,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const containerRef = useRef(null);
  const menuRef = useRef(null);

  const selectedLabel = useMemo(() => {
    const selectedItem = (Array.isArray(academicYears) ? academicYears : []).find(
      (item) => String(item?.id || "") === String(value || ""),
    );
    return selectedItem ? getAcademicYearOptionLabel(selectedItem) : "";
  }, [academicYears, value]);

  const updateMenuPosition = () => {
    const containerElement = containerRef.current;
    if (!containerElement) {
      setMenuStyle(null);
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
  }, [disabled, isOpen]);

  const academicYearItems = Array.isArray(academicYears) ? academicYears : [];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        disabled={disabled}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`truncate ${selectedLabel ? "text-slate-900" : "text-slate-400"}`}>
          {selectedLabel || "Select Academic Year"}
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

      {isOpen && menuStyle && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[2500] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.22)]"
              style={{
                left: menuStyle.left,
                top: menuStyle.top,
                width: menuStyle.width,
                maxHeight: menuStyle.maxHeight,
              }}
              role="listbox"
            >
              <div className="max-h-full overflow-y-auto p-1">
                {!disabled && typeof onAddNew === "function" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNew();
                    }}
                    className="mb-1 flex w-full items-center justify-between rounded-lg border border-dashed border-sky-200 bg-sky-50 px-3 py-2 text-left text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                  >
                    <span>Add new Academic Year</span>
                    <span className="text-lg leading-none">+</span>
                  </button>
                ) : null}

                {academicYearItems.length > 0 ? (
                  academicYearItems.map((item) => {
                    const itemLabel = getAcademicYearOptionLabel(item);
                    const itemId = String(item?.id || "");
                    const isSelected = String(value || "") === itemId;
                    return (
                      <button
                        key={itemId}
                        type="button"
                        onClick={() => {
                          onSelect(itemId);
                          setIsOpen(false);
                        }}
                        className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition ${
                          isSelected
                            ? "bg-sky-50 text-sky-700"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className="truncate">{itemLabel || "-"}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-3 text-sm text-slate-500">
                    No academic years found
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
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
  const [menuStyle, setMenuStyle] = useState(null);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const hasAutoOpenedRef = useRef(false);

  const selectedOption = options.find((option) => String(option?.id) === String(value || ""));
  const selectedLabel = String(selectedOption?.label || "").trim();

  const updateMenuPosition = () => {
    const containerElement = containerRef.current;
    if (!containerElement) {
      setMenuStyle(null);
      return;
    }

    const rect = containerElement.getBoundingClientRect();
    const viewportPadding = 8;
    const menuWidth = rect.width;
    const menuMaxHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = openAbove
      ? Math.max(160, Math.min(menuMaxHeight, spaceAbove))
      : Math.max(160, Math.min(menuMaxHeight, spaceBelow));

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
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
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

      {isOpen && menuStyle && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[2500] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.22)]"
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
                    const isSelected = String(value || "") === optionId;
                    return (
                      <button
                        key={optionId}
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

export default function StudentAcademicRecordCreateDialog({
  open,
  onClose,
  onCreate,
  companyId,
  existingRecords = [],
  studentOptions = [],
  academicYearOptions = [],
  classOptions = [],
  sectionOptions = [],
  mode = "create",
  initialStudentId = "",
  initialData = null,
  createInitialData = null,
  redirectAfterSubmit = true,
  onCreateAcademicYear = null,
}) {
  const [formData, setFormData] = useState(() =>
    getInitialFormData(mode, initialData, initialStudentId, createInitialData),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolLocationName, setSchoolLocationName] = useState("");
  const [isAcademicYearDialogOpen, setIsAcademicYearDialogOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dialogRef = useRef(null);
  const dragStateRef = useRef(null);
  const isEditMode = mode === "edit";
  const isReviewMode = mode === "review";
  const normalizedStudentOptions = useMemo(() => {
    const source = Array.isArray(studentOptions) ? studentOptions : [];
    return source
      .map((item) => {
        const id = getPrimaryStudentOptionId(item);
        if (!id) {
          return null;
        }
        return {
          id,
          label: getStudentOptionLabel(item),
          aliases: getStudentOptionAliases(item),
          studentName: String(item?.name || item?.student_name || "").trim(),
          guardianName: String(item?.guardian_name || item?.guardianName || "").trim(),
        };
      })
      .filter(Boolean);
  }, [studentOptions]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setFormData(getInitialFormData(mode, initialData, initialStudentId, createInitialData));
  }, [open, mode, initialData, initialStudentId, createInitialData]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const rawStudentId = String(formData.studentId || "").trim();
    if (!rawStudentId || !normalizedStudentOptions.length) {
      return;
    }
    const resolvedStudentId = resolveStudentOptionId(rawStudentId, normalizedStudentOptions);
    if (!resolvedStudentId || resolvedStudentId === rawStudentId) {
      return;
    }
    setFormData((prev) => {
      if (String(prev.studentId || "").trim() === resolvedStudentId) {
        return prev;
      }
      return {
        ...prev,
        studentId: resolvedStudentId,
      };
    });
  }, [open, formData.studentId, normalizedStudentOptions]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const rawStudentId = String(formData.studentId || "").trim();
    if (!normalizedStudentOptions.length) {
      return;
    }

    const resolvedFromCurrent = resolveStudentOptionId(rawStudentId, normalizedStudentOptions);
    const isCurrentSelectionResolved = normalizedStudentOptions.some(
      (item) => String(item?.id || "").trim() === String(resolvedFromCurrent || "").trim(),
    );
    if (isCurrentSelectionResolved) {
      return;
    }

    const fallbackStudentId = resolveStudentOptionIdByName(
      createInitialData?.studentName ?? createInitialData?.student_name ?? "",
      createInitialData?.guardianName ?? createInitialData?.guardian_name ?? "",
      normalizedStudentOptions,
    );
    if (!fallbackStudentId) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      studentId: fallbackStudentId,
    }));
  }, [open, formData.studentId, createInitialData, normalizedStudentOptions]);

  const filteredSectionOptions = useMemo(() => {
    if (!formData.classDetailsId) {
      return sectionOptions;
    }
    return sectionOptions.filter(
      (item) => String(item.class_details_id) === String(formData.classDetailsId),
    );
  }, [formData.classDetailsId, sectionOptions]);

  const existingRecordForSelectedStudentAndYear = useMemo(() => {
    const studentId = resolveStudentOptionId(formData.studentId, normalizedStudentOptions);
    const academicYearId = String(formData.academicYearId || "").trim();
    if (!studentId || !academicYearId) {
      return null;
    }

    return (
      (Array.isArray(existingRecords) ? existingRecords : []).find((item) => {
        const sameStudent = [
          item?.student_company_user_id,
          item?.student_id,
          item?.student?.id,
        ]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
          .includes(studentId);
        const sameAcademicYear =
          String(item?.academic_year_id || "") === academicYearId;
        const sameRecord = isEditMode && String(item?.id || "") === String(initialData?.id || "");
        return sameStudent && sameAcademicYear && !sameRecord;
      }) || null
    );
  }, [
    existingRecords,
    formData.academicYearId,
    formData.studentId,
    initialData?.id,
    isEditMode,
    normalizedStudentOptions,
  ]);
  const hasResolvedStudentSelection = useMemo(() => {
    const resolvedStudentId = resolveStudentOptionId(formData.studentId, normalizedStudentOptions);
    if (!resolvedStudentId) {
      return false;
    }
    return normalizedStudentOptions.some(
      (item) => String(item?.id || "").trim() === String(resolvedStudentId).trim(),
    );
  }, [formData.studentId, normalizedStudentOptions]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (isEditMode || isReviewMode) {
      return;
    }

    const classId = String(formData.classDetailsId || "").trim();
    const sectionId = String(formData.sectionDetailsId || "").trim();
    const academicYearId = String(formData.academicYearId || "").trim();
    if (!classId || !sectionId) {
      return;
    }

    const matchingRollNumbers = existingRecords
      .filter((item) => {
        const sameClass = String(item?.class_details_id || "") === classId;
        const sameSection = String(item?.section_details_id || "") === sectionId;
        if (!academicYearId) {
          return sameClass && sameSection;
        }
        const sameAcademicYear =
          String(item?.academic_year_id || "") === academicYearId;
        return sameClass && sameSection && sameAcademicYear;
      })
      .map((item) => String(item?.roll_number || "").trim())
      .map((rollText) => Number.parseInt(rollText, 10))
      .filter((rollNumber) => Number.isInteger(rollNumber) && rollNumber > 0);

    const nextRollNumber =
      matchingRollNumbers.length > 0
        ? String(Math.max(...matchingRollNumbers) + 1)
        : "1";

    setFormData((prev) => {
      if (prev.rollNumber === nextRollNumber) {
        return prev;
      }
      return {
        ...prev,
        rollNumber: nextRollNumber,
      };
    });
  }, [
    open,
    formData.classDetailsId,
    formData.sectionDetailsId,
    formData.academicYearId,
    existingRecords,
    isEditMode,
    isReviewMode,
  ]);

  const resetDialog = () => {
    setFormData(getDefaultFormData());
    setIsSubmitting(false);
    setSubmitErrorMessage("");
    setIsAcademicYearDialogOpen(false);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    dragStateRef.current = null;
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

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
        resetDialog();
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [open, onClose]);

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
        // keep default subtitle when school info lookup fails
      });

    return () => {
      mounted = false;
    };
  }, [open]);

  const handleChange = (event) => {
    if (isReviewMode) {
      return;
    }
    const { name, value } = event.target;
    setSubmitErrorMessage("");
    if (name === "classDetailsId") {
      setFormData((prev) => ({
        ...prev,
        classDetailsId: value,
        sectionDetailsId: "",
        rollNumber: "",
      }));
      return;
    }
    if (name === "sectionDetailsId" || name === "academicYearId") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        rollNumber: "",
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAcademicYearCreated = async (createdAcademicYear) => {
    const createdId = String(
      createdAcademicYear?.id ||
        createdAcademicYear?.response?.id ||
        createdAcademicYear?.academic_year?.id ||
        "",
    ).trim();
    if (!createdId) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      academicYearId: createdId,
    }));
    setIsAcademicYearDialogOpen(false);
  };

  const handleCreateAcademicYear = async (payload) => {
    if (typeof onCreateAcademicYear !== "function") {
      throw new Error("Academic year creation is unavailable.");
    }

    const createdAcademicYear = await onCreateAcademicYear(payload);
    await handleAcademicYearCreated(createdAcademicYear);
    return createdAcademicYear;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting || isReviewMode) {
      return;
    }

    const academicYearId = String(formData.academicYearId || "").trim();
    if (!academicYearId) {
      setSubmitErrorMessage("Academic Year is required.");
      return;
    }

    if (existingRecordForSelectedStudentAndYear) {
      const existingClassName = String(existingRecordForSelectedStudentAndYear?.class_name || "").trim();
      const existingSectionName = String(existingRecordForSelectedStudentAndYear?.section_name || "").trim();
      setSubmitErrorMessage(
        existingClassName && existingSectionName
          ? `Selected student already has an academic record for this academic year in Class ${existingClassName} Section ${existingSectionName}.`
          : "Selected student already has an academic record for this academic year.",
      );
      return;
    }

    const accessToken =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token") || ""
        : "";

    setIsSubmitting(true);
    setSubmitErrorMessage("");
    try {
      const resolvedStudentId = resolveStudentOptionId(formData.studentId, normalizedStudentOptions);
      await onCreate({
        id: initialData?.id || null,
        studentId: Number(resolvedStudentId || formData.studentId),
        academicYearId: Number(academicYearId),
        classDetailsId: Number(formData.classDetailsId),
        sectionDetailsId: Number(formData.sectionDetailsId),
        rollNumber: String(formData.rollNumber || "").trim(),
        admissionDate: String(formData.admissionDate || "").trim() || null,
        status: formData.status,
        remarks: String(formData.remarks || "").trim(),
        companyId: companyId || null,
        accessToken,
      });
      resetDialog();
      onClose();
      if (redirectAfterSubmit && typeof window !== "undefined") {
        window.location.href = "/school-management/students/";
      }
    } catch (error) {
      setSubmitErrorMessage(
        String(error?.message || error || "Unable to create academic record").trim(),
      );
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

  const dialogContent = (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center overflow-hidden p-2 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={handleClose}
        aria-label="Close create student academic record dialog"
      />

      <div
        ref={dialogRef}
        style={{
          transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
        }}
        className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] will-change-transform max-h-[calc(100svh-0.5rem)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl"
      >
        <div className="border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                {isReviewMode
                  ? "Review Academic Record"
                  : (isEditMode ? "Edit Academic Record" : "Create Academic Record")}
              </h2>
              <p className="text-sm text-slate-500">
                {isReviewMode
                  ? "View the selected academic record in read-only mode."
                  : (isEditMode
                  ? "Update selected academic record details."
                  : (companyName
                    ? (
                      <>
                        {schoolLocationName
                          ? `${companyName}, ${schoolLocationName}, ( `
                          : `${companyName}, ( `}
                        <span className="font-semibold text-sky-600">{schoolCode}</span>
                        {" )."}
                      </>
                    )
                    : "Add student academic details for selected year and class."))}
              </p>
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
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-5"
        >
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Student
                <SingleSelectDropdown
                  value={formData.studentId}
                  onChange={(value) =>
                    handleChange({
                      target: { name: "studentId", value },
                    })
                  }
                  options={normalizedStudentOptions.map((item) => ({
                    id: String(item.id || ""),
                    label: String(item.label || "").trim(),
                  }))}
                  placeholder="Select Student"
                  disabled={isReviewMode || hasResolvedStudentSelection}
                  autoFocus={!isReviewMode}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Academic Year
                <AcademicYearDropdown
                  value={formData.academicYearId}
                  onSelect={(nextValue) => {
                    setSubmitErrorMessage("");
                    setFormData((prev) => ({
                      ...prev,
                      academicYearId: nextValue,
                      rollNumber: "",
                    }));
                  }}
                  academicYears={academicYearOptions}
                  onAddNew={
                    !isReviewMode && typeof onCreateAcademicYear === "function"
                      ? () => setIsAcademicYearDialogOpen(true)
                      : null
                  }
                  disabled={isReviewMode}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Class
                <SingleSelectDropdown
                  value={formData.classDetailsId}
                  onChange={(value) =>
                    handleChange({
                      target: { name: "classDetailsId", value },
                    })
                  }
                  options={classOptions.map((item) => ({
                    id: String(item.id),
                    label: String(item.class_name || "").trim(),
                  }))}
                  placeholder="Select Class"
                  disabled={isReviewMode}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Section
                <SingleSelectDropdown
                  value={formData.sectionDetailsId}
                  onChange={(value) =>
                    handleChange({
                      target: { name: "sectionDetailsId", value },
                    })
                  }
                  options={filteredSectionOptions.map((item) => ({
                    id: String(item.id),
                    label: String(item.section || "").trim(),
                  }))}
                  placeholder="Select Section"
                  disabled={isReviewMode}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Status
                <SingleSelectDropdown
                  value={formData.status}
                  onChange={(value) =>
                    handleChange({
                      target: { name: "status", value },
                    })
                  }
                  options={statusOptions.map((item) => ({
                    id: String(item.value),
                    label: String(item.label || "").trim(),
                  }))}
                  placeholder="Select Status"
                  disabled={isReviewMode}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Roll Number
                <input
                  name="rollNumber"
                  value={formData.rollNumber}
                  onChange={handleChange}
                  readOnly={isReviewMode}
                  disabled={isReviewMode}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 lg:col-span-2">
                Admission Date
                <DatePickerField
                  value={formData.admissionDate}
                  onChange={(value) =>
                    handleChange({
                      target: { name: "admissionDate", value },
                    })
                  }
                  readOnly={isReviewMode}
                  disabled={isReviewMode}
                  ariaLabel="Admission Date"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 lg:col-span-2">
                Remarks
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  readOnly={isReviewMode}
                  disabled={isReviewMode}
                  rows={3}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </label>
            </div>
          </div>

          {!isReviewMode ? (
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
              disabled={isSubmitting}
              className="inline-flex h-11 min-w-[132px] items-center justify-center rounded-xl bg-sky-600 px-6 text-[17px] font-semibold leading-none text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:min-w-[120px] sm:px-5 sm:text-sm"
            >
              {isSubmitting
                ? (isEditMode ? "Updating..." : "Saving...")
                : (isEditMode ? "Update" : "Create")}
            </button>
            </div>
          ) : null}
        </form>
      </div>

      <CreateAcademicYearDialog
        open={isAcademicYearDialogOpen}
        onClose={() => setIsAcademicYearDialogOpen(false)}
        onCreate={handleCreateAcademicYear}
        companyId={companyId}
        academicYears={academicYearOptions}
      />

      {submitErrorMessage ? (
        <div className="fixed inset-0 z-[2400] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/55 backdrop-blur-[1px]"
            onClick={() => setSubmitErrorMessage("")}
            aria-label="Close error dialog"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-rose-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
            <h3 className="text-lg font-semibold text-slate-900">Academic record save failed</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {submitErrorMessage}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSubmitErrorMessage("")}
                className="inline-flex h-10 min-w-[92px] items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(dialogContent, document.body);
}
