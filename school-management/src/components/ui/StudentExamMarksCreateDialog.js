"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCurrentSchoolInfo } from "@/lib/apiService";

function getDefaultFormData() {
  return {
    academicYearId: "",
    classDetailsId: "",
    sectionDetailsId: "",
    studentRecordId: "",
    examScheduleId: "",
    subjectId: "",
    maxMarks: "0",
    passingMarks: "33",
    marksObtained: "0",
    practicalMarks: "",
    internalMarks: "",
    grade: "",
    isAbsent: false,
    isPass: true,
    remarks: "",
  };
}

function buildPersistentFormData(formData) {
  return {
    ...getDefaultFormData(),
    academicYearId: String(formData?.academicYearId || "").trim(),
    classDetailsId: String(formData?.classDetailsId || "").trim(),
    sectionDetailsId: String(formData?.sectionDetailsId || "").trim(),
    examScheduleId: String(formData?.examScheduleId || "").trim(),
    subjectId: String(formData?.subjectId || "").trim(),
  };
}

function buildPostSubmitFormData(formData, selectedExamSchedule = null) {
  const scheduleTotalMarks = getExamScheduleTotalMarks(selectedExamSchedule);
  return {
    ...buildPersistentFormData(formData),
    maxMarks: scheduleTotalMarks || String(formData?.maxMarks || "0"),
    passingMarks: "33",
    marksObtained: "0",
  };
}

function calculateGrade(marksObtained, maxMarks) {
  const obtained = Number(marksObtained);
  const maximum = Number(maxMarks);

  if (!Number.isFinite(obtained) || !Number.isFinite(maximum) || maximum <= 0) {
    return "";
  }

  const percentage = (obtained / maximum) * 100;

  if (percentage >= 90) return "AA";
  if (percentage >= 85) return "A+";
  if (percentage >= 75) return "A";
  if (percentage >= 60) return "B+";
  if (percentage >= 40) return "B";
  if (percentage >= 25) return "C";
  return "F";
}

function createSubjectMarkEntry(
  subjectName = "",
  marksObtained = "",
  grade = "",
  subjectId = "",
  examScheduleId = "",
  totalMarks = "",
) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    subjectId: String(subjectId || "").trim(),
    examScheduleId: String(examScheduleId || "").trim(),
    subjectName: String(subjectName || "").trim(),
    marksObtained: String(marksObtained || "").trim(),
    grade: String(grade || "").trim(),
    totalMarks: String(totalMarks || "").trim(),
  };
}

function normalizeSubjectMarksEntries(value) {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeSubjectMarksEntries(parsed);
    } catch (error) {
      return [];
    }
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        const subjectName = String(
          entry?.subject_name || entry?.subject || entry?.name || "",
        ).trim();
        if (!subjectName) {
          return null;
        }
        return createSubjectMarkEntry(
          subjectName,
          entry?.marks_obtained ?? entry?.marksObtained ?? entry?.marks ?? "",
          entry?.grade || "",
          entry?.subject_id || entry?.subjectId || "",
          entry?.exam_schedule_id || entry?.examScheduleId || "",
          entry?.total_marks ?? entry?.totalMarks ?? "",
        );
      })
      .filter(Boolean);
  }

  if (typeof value === "object") {
    if (
      Object.prototype.hasOwnProperty.call(value, "subject") ||
      Object.prototype.hasOwnProperty.call(value, "marks_obtained") ||
      Object.prototype.hasOwnProperty.call(value, "marksObtained")
    ) {
      const subjectName = String(value?.subject_name || value?.subject || "").trim();
      if (!subjectName) {
        return [];
      }
        return [
          createSubjectMarkEntry(
            subjectName,
            value?.marks_obtained ?? value?.marksObtained ?? value?.marks ?? "",
            value?.grade || "",
            value?.subject_id || value?.subjectId || "",
            value?.exam_schedule_id || value?.examScheduleId || "",
            value?.total_marks ?? value?.totalMarks ?? "",
          ),
        ];
      }

    return Object.entries(value)
      .filter(([key]) => !["entries", "subjects", "items", "marks"].includes(key))
      .map(([subjectName, payload]) => {
        const cleanedSubjectName = String(subjectName || "").trim();
        if (!cleanedSubjectName) {
          return null;
        }
        return createSubjectMarkEntry(
          cleanedSubjectName,
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? payload.marks_obtained ?? payload.marksObtained ?? payload.marks ?? ""
            : payload,
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? payload.grade || ""
            : "",
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? payload.subject_id || payload.subjectId || ""
            : "",
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? payload.exam_schedule_id || payload.examScheduleId || ""
            : "",
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? payload.total_marks ?? payload.totalMarks ?? ""
            : "",
        );
      })
      .filter(Boolean);
  }

  return [];
}

function extractSubjectMarksEntries(value) {
  return normalizeSubjectMarksEntries(value);
}

function collectSubjectMarksIdentifiers(value) {
  const ids = new Set();
  const names = new Set();

  const visitEntry = (entry, fallbackName = "") => {
    if (!entry || typeof entry !== "object") {
      return;
    }

    const subjectName = String(
      entry.subject_name || entry.subjectName || entry.subject || entry.name || fallbackName,
    )
      .trim()
      .toLowerCase();
    const subjectId = String(
      entry.subject_id || entry.subjectId || entry.subject?.id || "",
    ).trim();

    if (subjectName) {
      names.add(subjectName);
    }
    if (subjectId) {
      ids.add(subjectId);
    }
  };

  const visit = (node) => {
    if (!node) {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    if (typeof node !== "object") {
      return;
    }

    if (
      Object.prototype.hasOwnProperty.call(node, "subject") ||
      Object.prototype.hasOwnProperty.call(node, "subject_name") ||
      Object.prototype.hasOwnProperty.call(node, "subjectName") ||
      Object.prototype.hasOwnProperty.call(node, "marks_obtained") ||
      Object.prototype.hasOwnProperty.call(node, "marksObtained") ||
      Object.prototype.hasOwnProperty.call(node, "subject_id") ||
      Object.prototype.hasOwnProperty.call(node, "subjectId")
    ) {
      visitEntry(node);
      return;
    }

    Object.entries(node).forEach(([key, value]) => {
      if (["entries", "subjects", "items", "marks"].includes(key)) {
        visit(value);
        return;
      }

      if (value && typeof value === "object" && !Array.isArray(value)) {
        visitEntry(value, key);
      }
    });
  };

  visit(value);
  return { ids, names };
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

function getExamScheduleTotalMarks(scheduleItem) {
  return String(
    scheduleItem?.total_marks ??
      scheduleItem?.totalMarks ??
      scheduleItem?.exam?.total_marks ??
      scheduleItem?.exam?.totalMarks ??
      "",
  ).trim();
}

function compareScheduleText(leftValue, rightValue) {
  return String(leftValue || "").trim().localeCompare(String(rightValue || "").trim(), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function buildSubjectMarksObject(entries) {
    const output = {};

    entries.forEach((entry) => {
      const subjectName = String(entry?.subjectName || entry?.subject || "").trim();
      if (!subjectName) {
        return;
      }

      const marksRaw = String(entry?.marksObtained ?? entry?.marks_obtained ?? "").trim();
      const parsedMarks = Number(marksRaw);
      const gradeValue = String(entry?.grade || "").trim();
      output[subjectName] = {
        marks_obtained: Number.isFinite(parsedMarks) ? parsedMarks : marksRaw,
        total_marks: String(entry?.totalMarks ?? entry?.total_marks ?? "").trim() || undefined,
        exam_schedule_id: String(entry?.examScheduleId || entry?.exam_schedule_id || "").trim() || undefined,
        subject_id: String(entry?.subjectId || entry?.subject_id || "").trim() || undefined,
      };
      if (gradeValue) {
        output[subjectName].grade = gradeValue;
      }
      if (!output[subjectName].exam_schedule_id) {
        delete output[subjectName].exam_schedule_id;
      }
      if (!output[subjectName].subject_id) {
        delete output[subjectName].subject_id;
      }
      if (!output[subjectName].total_marks) {
        delete output[subjectName].total_marks;
      }
    });

    return output;
  }

function formatOptionLabel(value) {
  return String(value || "").trim();
}

function isStudentRecordActive(record) {
  const statusValue = String(record?.status || record?.status_display || "")
    .trim()
    .toLowerCase();
  if (statusValue) {
    return statusValue === "active";
  }
  return Boolean(record?.is_active ?? record?.isActive);
}

function shouldShowGradeForExamSchedule(scheduleItem) {
  const candidates = [
    scheduleItem?.exam_type,
    scheduleItem?.examType,
    scheduleItem?.exam_type_display,
    scheduleItem?.examTypeDisplay,
    scheduleItem?.exam_name,
    scheduleItem?.exam?.exam_type,
    scheduleItem?.exam?.exam_type_display,
    scheduleItem?.exam?.exam_name,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

  return candidates.some(
    (value) =>
      value === "half_yearly" ||
      /^half\s*yearly\b/.test(value) ||
      value === "half yearly" ||
      value === "annual" ||
      /^annual\b/.test(value),
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
  registerTrigger = null,
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
    const buttonElement = buttonRef.current;
    if (!buttonElement) {
      setMenuStyle(null);
      return;
    }

    const rect = buttonElement.getBoundingClientRect();
    const viewportPadding = 2;
    const menuWidth = rect.width;
    const menuMaxHeight = 5;
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
      return undefined;
    }

    const frameId = window.requestAnimationFrame(updateMenuPosition);

    const handleOutsideClick = (event) => {
      if (!(event.target instanceof Node)) {
        setMenuStyle(null);
        setIsOpen(false);
        return;
      }
      if (
        !containerRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setMenuStyle(null);
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuStyle(null);
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
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!autoFocus || disabled) {
      return;
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
    setMenuStyle(null);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        ref={(node) => {
          const previousNode = buttonRef.current;
          if (previousNode && previousNode !== node) {
            delete previousNode.__openDropdownMenu;
          }
          buttonRef.current = node;
          if (node) {
            node.__openDropdownMenu = () => {
              if (disabled) {
                return;
              }
              setIsOpen(true);
            };
          }
          if (typeof registerTrigger !== "function") {
            return;
          }
          registerTrigger(node);
        }}
        type="button"
        disabled={disabled}
        onClick={() =>
          setIsOpen((prev) => {
            const nextOpen = !prev;
            if (!nextOpen) {
              setMenuStyle(null);
            }
            return nextOpen;
          })
        }
        className="flex min-h-[42px] w-full items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-left text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        <span className="line-clamp-1">
          {selectedLabel || placeholder}
        </span>
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
              {options.length > 0 ? (
                options.map((option) => {
                  const optionId = String(option?.id ?? "");
                  const isActive = String(value || "") === optionId;
                  const isDisabled = Boolean(option?.disabled);
                  return (
                    <button
                      key={optionId}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        if (!isDisabled) {
                          chooseOption(optionId);
                        }
                      }}
                      className={`flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-sky-100 ${
                        isDisabled
                          ? "cursor-not-allowed bg-slate-100 text-slate-400"
                          : isActive
                            ? "bg-sky-50 text-sky-700"
                            : "text-slate-700"
                      }`}
                    >
                      <span className="flex-1">{String(option?.label || "")}</span>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-2 text-sm text-slate-500">No subjects found.</div>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default function StudentExamMarksCreateDialog({
  open,
  onClose,
  onCreate,
  onUpdate,
  companyId,
  academicYears = [],
  classOptions = [],
  sectionOptions = [],
  studentRecordOptions = [],
  examScheduleOptions = [],
  subjectOptions = [],
  existingMarksList = [],
  initialData = null,
  createInitialData = null,
  mode = "create",
}) {
  const isEditMode = mode === "edit" || mode === "review";
  const isReviewMode = mode === "review";
  const effectiveInitialData = isEditMode ? initialData : createInitialData;
  const sortedAcademicYears = useMemo(
    () => sortAcademicYearsBySequence(academicYears),
    [academicYears],
  );

  const defaultAcademicYearId = useMemo(() => {
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
  }, [sortedAcademicYears]);

  function buildFormDataFromInitialData(data, defaultAcademicYearId = "") {
    if (!data) {
      return getDefaultFormData();
    }

    const normalizedSubjectMarks = normalizeSubjectMarksEntries(
      data.subject_marks || data.subjectMarks || data.subject_marks_json,
    );
    const firstSubjectMark = normalizedSubjectMarks[0] || null;
    const fallbackSubjectId = String(
      data.subjectId || data.subject_id || firstSubjectMark?.subjectId || "",
    ).trim();
    const fallbackExamScheduleId = String(
      data.examScheduleId || data.exam_schedule_id || firstSubjectMark?.examScheduleId || "",
    ).trim();
    const fallbackTotalMarks = String(
      firstSubjectMark?.totalMarks ||
        firstSubjectMark?.total_marks ||
        data.totalMarks ||
        data.total_marks ||
        data.exam_schedule?.total_marks ||
        data.exam_schedule?.totalMarks ||
        data.exam_schedule?.exam?.total_marks ||
        data.exam_schedule?.exam?.totalMarks ||
        data.maxMarks ||
        data.max_marks ||
        "0",
    ).trim();

    return {
      academicYearId: String(
        data.academicYearId ||
          data.academic_year_id ||
          data.exam_schedule?.exam?.academic_year_id ||
          defaultAcademicYearId ||
          "",
      ).trim(),
      classDetailsId: String(
        data.classDetailsId ||
          data.class_details_id ||
          data.class_id ||
          data.class_details?.id ||
          "",
      ).trim(),
      sectionDetailsId: String(
        data.sectionDetailsId ||
          data.section_details_id ||
          data.section_id ||
          data.section_details?.id ||
          "",
      ).trim(),
      studentRecordId: String(
        data.studentRecordId ||
          data.student_record_id ||
          data.student_record?.id ||
          "",
      ).trim(),
      examScheduleId: String(
        data.examScheduleId ||
          data.exam_schedule_id ||
          data.exam_schedule?.id ||
          fallbackExamScheduleId ||
          "",
      ).trim(),
      subjectId: String(
        data.subjectId || data.subject_id || data.subject?.id || fallbackSubjectId || "",
      ).trim(),
      maxMarks: fallbackTotalMarks || String(data.maxMarks || data.max_marks || "0"),
      passingMarks: String(data.passingMarks || data.passing_marks || "33"),
      marksObtained: String(
        data.marksObtained || data.marks_obtained || firstSubjectMark?.marksObtained || "0",
      ),
      practicalMarks:
        data.practicalMarks === null || data.practicalMarks === undefined
          ? String(data.practical_marks || "")
          : String(data.practicalMarks),
      internalMarks:
        data.internalMarks === null || data.internalMarks === undefined
          ? String(data.internal_marks || "")
          : String(data.internalMarks),
      grade: String(data.grade || firstSubjectMark?.grade || ""),
      isAbsent: Boolean(data.isAbsent ?? data.is_absent),
      isPass: Boolean(data.isPass ?? data.is_pass ?? true),
      remarks: String(data.remarks || ""),
    };
  }

  const [formData, setFormData] = useState(() =>
    buildFormDataFromInitialData(effectiveInitialData, defaultAcademicYearId),
  );
  const [subjectMarksEntries, setSubjectMarksEntries] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolLocationName, setSchoolLocationName] = useState("");
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dialogRef = useRef(null);
  const dragStateRef = useRef(null);
  const sectionDropdownRef = useRef(null);
  const academicYearDropdownRef = useRef(null);
  const examScheduleDropdownRef = useRef(null);
  const subjectDropdownRef = useRef(null);
  const studentRecordSelectRef = useRef(null);
  const marksObtainedInputRef = useRef(null);
  const studentRecordById = useMemo(() => {
    const map = new Map();
    studentRecordOptions.forEach((item) => {
      map.set(String(item.id), item);
    });
    return map;
  }, [studentRecordOptions]);

  const classById = useMemo(() => {
    const map = new Map();
    classOptions.forEach((item) => {
      map.set(String(item.id), item);
    });
    return map;
  }, [classOptions]);

  const academicYearAvailable = sortedAcademicYears.length > 0;
  const academicYearSelectOptions = useMemo(
    () =>
      sortedAcademicYears.map((item) => ({
        id: String(item.id),
        label: formatAcademicYearOption(item) || `Academic Year ${item.id}`,
      })),
    [sortedAcademicYears],
  );

  const selectedClassId = String(formData.classDetailsId || "").trim();
  const selectedSectionId = String(formData.sectionDetailsId || "").trim();
  const selectedStudentRecordId = String(formData.studentRecordId || "").trim();
  const selectedExamScheduleId = String(formData.examScheduleId || "").trim();
  const hasPrefilledPrimaryFilters = Boolean(
    selectedClassId && selectedSectionId && String(formData.academicYearId || "").trim(),
  );

  const classFilteredSubjectOptions = useMemo(() => {
    if (!selectedClassId) {
      return [];
    }

    const selectedClass = classById.get(String(selectedClassId)) || null;
    const classSubjectIds = Array.isArray(selectedClass?.subject)
      ? selectedClass.subject.map((value) => Number(value)).filter(Number.isFinite)
      : [];

    if (classSubjectIds.length === 0) {
      return [];
    }

    return subjectOptions
      .filter((item) => classSubjectIds.includes(Number(item?.id)))
      .map((item) => ({
        id: String(item.id),
        label: String(item.subject_name || "").trim(),
      }));
  }, [classById, selectedClassId, subjectOptions]);

  const subjectOptionList = useMemo(
    () =>
      subjectOptions.map((item) => ({
        id: String(item.id),
        label: String(item.subject_name || "").trim(),
      })),
    [subjectOptions],
  );

  const getSubjectLabelById = (subjectId) =>
    subjectOptionList.find((item) => item.id === String(subjectId || ""))?.label || "";

  const getSubjectIdByLabel = (subjectLabel) =>
    subjectOptionList.find((item) => item.label === String(subjectLabel || "").trim())?.id || "";

  const selectedStudentRecordMarks = useMemo(() => {
    if (!selectedStudentRecordId) {
      return [];
    }

    return existingMarksList.filter(
      (item) => String(item?.student_record_id || "").trim() === selectedStudentRecordId,
    );
  }, [existingMarksList, selectedStudentRecordId]);

  const existingMarkForSelectedRecordAndSchedule = useMemo(() => {
    if (!selectedStudentRecordId || !selectedExamScheduleId) {
      return null;
    }

    return (
      selectedStudentRecordMarks.find(
        (item) =>
          String(item?.exam_schedule_id || item?.examScheduleId || item?.exam_schedule?.id || "")
            .trim() === selectedExamScheduleId,
      ) || null
    );
  }, [selectedExamScheduleId, selectedStudentRecordMarks, selectedStudentRecordId]);

  const existingSubjectIdSetForSelectedRecordAndSchedule = useMemo(() => {
    const ids = new Set();
    if (!selectedStudentRecordId || !selectedExamScheduleId) {
      return ids;
    }

    selectedStudentRecordMarks.forEach((markItem) => {
      const markExamScheduleId = String(
        markItem?.exam_schedule_id || markItem?.examScheduleId || markItem?.exam_schedule?.id || "",
      ).trim();
      if (markExamScheduleId !== selectedExamScheduleId) {
        return;
      }

      const identifiers = collectSubjectMarksIdentifiers(markItem?.subject_marks);
      identifiers.ids.forEach((subjectId) => ids.add(subjectId));

      const topLevelSubjectId = String(
        markItem?.subject_id || markItem?.subject?.id || "",
      ).trim();
      if (topLevelSubjectId) {
        ids.add(topLevelSubjectId);
      }
    });

    return ids;
  }, [
    selectedExamScheduleId,
    selectedStudentRecordId,
    selectedStudentRecordMarks,
  ]);

  const existingSubjectNameSetForSelectedRecordAndSchedule = useMemo(() => {
    const names = new Set();
    if (!selectedStudentRecordId || !selectedExamScheduleId) {
      return names;
    }

    selectedStudentRecordMarks.forEach((markItem) => {
      const markExamScheduleId = String(
        markItem?.exam_schedule_id || markItem?.examScheduleId || markItem?.exam_schedule?.id || "",
      ).trim();
      if (markExamScheduleId !== selectedExamScheduleId) {
        return;
      }

      const identifiers = collectSubjectMarksIdentifiers(markItem?.subject_marks);
      identifiers.names.forEach((subjectName) => names.add(subjectName));

      const topLevelSubjectName = String(
        markItem?.subject_name || markItem?.subject?.subject_name || "",
      )
        .trim()
        .toLowerCase();
      if (topLevelSubjectName) {
        names.add(topLevelSubjectName);
      }
    });

    return names;
  }, [
    selectedExamScheduleId,
    selectedStudentRecordId,
    selectedStudentRecordMarks,
  ]);

  const getExamScheduleSubjectIds = (scheduleItem) => {
    const subjectSchedules = Array.isArray(scheduleItem?.subject_schedules)
      ? scheduleItem.subject_schedules
      : [];
    const ids = subjectSchedules
      .map((entry) =>
        String(entry?.subject_id || entry?.subjectId || entry?.subject?.id || "").trim(),
      )
      .filter(Boolean);

    if (ids.length > 0) {
      return ids;
    }

    const fallbackSubjectId = String(scheduleItem?.subject_id || "").trim();
    return fallbackSubjectId ? [fallbackSubjectId] : [];
  };

  const getExamScheduleSubjects = (scheduleItem) => {
    const subjectSchedules = Array.isArray(scheduleItem?.subject_schedules)
      ? scheduleItem.subject_schedules
      : [];
    const normalized = subjectSchedules
      .map((entry) => ({
        id: String(entry?.subject_id || entry?.subjectId || entry?.subject?.id || "").trim(),
        label: String(
          entry?.subject_name || entry?.subjectName || entry?.subject?.subject_name || "",
        ).trim(),
      }))
      .filter((entry) => entry.id);

    if (normalized.length > 0) {
      return normalized;
    }

    const fallbackId = String(scheduleItem?.subject_id || "").trim();
    const fallbackLabel = String(
      scheduleItem?.subject_name || scheduleItem?.subject?.subject_name || "",
    ).trim();
    return fallbackId ? [{ id: fallbackId, label: fallbackLabel || fallbackId }] : [];
  };

  const getExamScheduleDefaultSubjectId = (scheduleItem, currentSubjectId = "") => {
    const availableSubjectIds = getExamScheduleSubjectIds(scheduleItem);
    const normalizedCurrentSubjectId = String(currentSubjectId || "").trim();
    if (
      normalizedCurrentSubjectId &&
      availableSubjectIds.includes(normalizedCurrentSubjectId)
    ) {
      return normalizedCurrentSubjectId;
    }
    return String(availableSubjectIds[0] || scheduleItem?.subject_id || "").trim();
  };

  const getExamScheduleIdBySubject = (subjectId) => {
    const normalizedSubjectId = String(subjectId || "").trim();
    if (!normalizedSubjectId) {
      return "";
    }

    const matchedSchedule = filteredExamScheduleOptions.find(
      (item) => getExamScheduleSubjectIds(item).includes(normalizedSubjectId),
    );
    return String(matchedSchedule?.id || "").trim();
  };

  const filteredSectionOptions = useMemo(() => {
    if (!selectedClassId) {
      return sectionOptions;
    }
    return sectionOptions.filter(
      (item) => String(item?.class_details_id || "") === selectedClassId,
    );
  }, [sectionOptions, selectedClassId]);

  const examScheduleById = useMemo(() => {
    const map = new Map();
    examScheduleOptions.forEach((item) => {
      map.set(String(item.id), item);
    });
    return map;
  }, [examScheduleOptions]);

  const selectedStudentRecord = useMemo(() => {
    if (!formData.studentRecordId) {
      return null;
    }
    return studentRecordById.get(String(formData.studentRecordId)) || null;
  }, [formData.studentRecordId, studentRecordById]);

  const filteredStudentRecordOptions = useMemo(() => {
    if (!selectedClassId || !selectedSectionId) {
      return [];
    }
    return studentRecordOptions.filter((item) => {
      const matchesClass = String(item?.class_details_id || "") === selectedClassId;
      const matchesSection = String(item?.section_details_id || "") === selectedSectionId;
      const isCurrentSelected =
        String(item?.id || "").trim() === String(formData.studentRecordId || "").trim();
      return matchesClass && matchesSection && (isStudentRecordActive(item) || isCurrentSelected);
    });
  }, [formData.studentRecordId, selectedClassId, selectedSectionId, studentRecordOptions]);

  const filteredExamScheduleOptions = useMemo(() => {
    const classId = String(selectedClassId || "").trim();
    const filteredItems = !classId
      ? examScheduleOptions
      : examScheduleOptions.filter((item) => {
      const matchesClass = String(item?.class_details_id || "") === classId;
      return matchesClass;
    });

    return [...filteredItems].sort((left, right) => {
      const leftClassName = left?.class_name || left?.class_details?.class_name || "";
      const rightClassName = right?.class_name || right?.class_details?.class_name || "";
      const classComparison = compareScheduleText(leftClassName, rightClassName);
      if (classComparison !== 0) {
        return classComparison;
      }

      const leftExamName = left?.exam_name || left?.exam?.exam_name || "";
      const rightExamName = right?.exam_name || right?.exam?.exam_name || "";
      const examComparison = compareScheduleText(leftExamName, rightExamName);
      if (examComparison !== 0) {
        return examComparison;
      }

      const leftSectionName = left?.section_name || left?.section_details?.section || "";
      const rightSectionName = right?.section_name || right?.section_details?.section || "";
      const sectionComparison = compareScheduleText(leftSectionName, rightSectionName);
      if (sectionComparison !== 0) {
        return sectionComparison;
      }

      const leftSubjectName = left?.subject_name || left?.subject?.subject_name || "";
      const rightSubjectName = right?.subject_name || right?.subject?.subject_name || "";
      return compareScheduleText(leftSubjectName, rightSubjectName);
    });
  }, [examScheduleOptions, selectedClassId]);

  const selectedExamSchedule = useMemo(() => {
    if (!formData.examScheduleId) {
      return null;
    }
    return examScheduleById.get(String(formData.examScheduleId)) || null;
  }, [examScheduleById, formData.examScheduleId]);

  const shouldShowGrade = useMemo(
    () => shouldShowGradeForExamSchedule(selectedExamSchedule),
    [selectedExamSchedule],
  );

  const selectedExamScheduleSubjectOptions = useMemo(
    () => getExamScheduleSubjects(selectedExamSchedule),
    [selectedExamSchedule],
  );

  const buildSubjectOptions = useCallback(
    (currentSubjectId = "", { allowCurrentSubject = false } = {}) => {
      const normalizedCurrentSubjectId = String(currentSubjectId || "").trim();
      const baseOptions =
        selectedExamScheduleSubjectOptions.length > 0
          ? selectedExamScheduleSubjectOptions
          : selectedClassId
            ? classFilteredSubjectOptions
            : subjectOptionList;

      return baseOptions.map((option) => ({
        ...option,
        disabled:
          Boolean(option?.disabled) ||
          (existingSubjectIdSetForSelectedRecordAndSchedule.has(String(option.id)) &&
            (allowCurrentSubject ? String(option.id) !== normalizedCurrentSubjectId : true)) ||
          existingSubjectNameSetForSelectedRecordAndSchedule.has(
            String(option?.label || "").trim().toLowerCase(),
          ),
      }));
    },
    [
      classFilteredSubjectOptions,
      existingSubjectIdSetForSelectedRecordAndSchedule,
      existingSubjectNameSetForSelectedRecordAndSchedule,
      selectedClassId,
      selectedExamScheduleSubjectOptions,
      subjectOptionList,
    ],
  );

  const selectedSubjectName = useMemo(() => {
    const subjectId = String(formData.subjectId || "").trim();
    const selectedScheduleSubject = Array.isArray(selectedExamSchedule?.subject_schedules)
      ? selectedExamSchedule.subject_schedules.find(
          (entry) =>
            String(entry?.subject_id || entry?.subjectId || entry?.subject?.id || "").trim() ===
            subjectId,
        )
      : null;
    return String(
      getSubjectLabelById(subjectId) ||
        selectedScheduleSubject?.subject_name ||
        selectedScheduleSubject?.subjectName ||
        selectedExamSchedule?.subject_name ||
        selectedExamSchedule?.subject?.subject_name ||
        "",
    ).trim();
  }, [formData.subjectId, selectedExamSchedule, subjectOptionList]);

  const resetDialog = useCallback(() => {
    setFormData(getDefaultFormData());
    setIsSubmitting(false);
    setSubmitErrorMessage("");
  }, []);

  const handleClose = useCallback(() => {
    resetDialog();
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    dragStateRef.current = null;
    onClose();
  }, [onClose, resetDialog]);

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

  const handleDragStop = (event) => {
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
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [open]);

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
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const selectedSchedule = selectedExamSchedule;
    const scheduleSubjectId = getExamScheduleDefaultSubjectId(
      selectedSchedule,
      formData.subjectId,
    );
    const scheduleTotalMarks = getExamScheduleTotalMarks(selectedSchedule);
    const scheduleAcademicYearId = String(
      selectedSchedule?.academic_year_id ||
        selectedSchedule?.academicYearId ||
        selectedSchedule?.exam?.academic_year_id ||
        selectedSchedule?.exam?.academicYearId ||
        "",
    ).trim();
    if (!scheduleSubjectId) {
      return;
    }

    setFormData((prev) => {
      if (
        String(prev.subjectId || "") === scheduleSubjectId &&
        (!scheduleAcademicYearId ||
          String(prev.academicYearId || "") === scheduleAcademicYearId) &&
        String(prev.maxMarks || "").trim() === String(scheduleTotalMarks || prev.maxMarks || "").trim()
      ) {
        return prev;
      }
      return {
        ...prev,
        subjectId: scheduleSubjectId,
        academicYearId: scheduleAcademicYearId || prev.academicYearId,
        maxMarks: scheduleTotalMarks || prev.maxMarks,
      };
    });
  }, [open, selectedExamSchedule, formData.subjectId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isEditMode && initialData) {
      setFormData(buildFormDataFromInitialData(initialData, defaultAcademicYearId));
      return;
    }

    if (!isEditMode && createInitialData) {
      setFormData(buildFormDataFromInitialData(createInitialData, defaultAcademicYearId));
      return;
    }

    setFormData((prev) => ({
      ...getDefaultFormData(),
      academicYearId: String(prev.academicYearId || defaultAcademicYearId || "").trim(),
      classDetailsId: String(prev.classDetailsId || "").trim(),
      sectionDetailsId: String(prev.sectionDetailsId || "").trim(),
      examScheduleId: String(prev.examScheduleId || "").trim(),
      subjectId: String(prev.subjectId || "").trim(),
    }));
  }, [defaultAcademicYearId, open, initialData, createInitialData, isEditMode]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!isEditMode) {
      setSubjectMarksEntries([]);
      return;
    }

    const normalizedEntries = normalizeSubjectMarksEntries(
      initialData?.subject_marks || initialData?.subjectMarks || initialData?.subject_marks_json,
    ).map((entry) => ({
      ...entry,
      subjectId: entry.subjectId || getSubjectIdByLabel(entry.subjectName),
      examScheduleId:
        entry.examScheduleId ||
        getExamScheduleIdBySubject(entry.subjectId || getSubjectIdByLabel(entry.subjectName)) ||
        String(initialData?.examScheduleId || initialData?.exam_schedule_id || "").trim(),
      totalMarks:
        getExamScheduleTotalMarks(
          examScheduleById.get(
            String(
              entry.examScheduleId ||
                getExamScheduleIdBySubject(entry.subjectId || getSubjectIdByLabel(entry.subjectName)) ||
                initialData?.examScheduleId ||
                initialData?.exam_schedule_id ||
                "",
            ).trim(),
          ),
        ) ||
        entry.totalMarks ||
        formData.maxMarks,
    }));

    if (normalizedEntries.length > 0) {
      setSubjectMarksEntries(normalizedEntries);
      return;
    }

    const fallbackSubjectName =
      String(initialData?.subject_name || initialData?.subject?.subject_name || "").trim() ||
      String(getSubjectLabelById(initialData?.subjectId || initialData?.subject_id || "") || "").trim() ||
      String(
        examScheduleById.get(
          String(initialData?.examScheduleId || initialData?.exam_schedule_id || ""),
        )?.subject_name || "",
      ).trim();

    if (!fallbackSubjectName) {
      setSubjectMarksEntries([]);
      return;
    }

    setSubjectMarksEntries([
      createSubjectMarkEntry(
        fallbackSubjectName,
        initialData?.marksObtained ?? initialData?.marks_obtained ?? "",
        initialData?.grade || initialData?.subject_marks?.grade || "",
        getSubjectIdByLabel(fallbackSubjectName),
        getExamScheduleIdBySubject(getSubjectIdByLabel(fallbackSubjectName)) ||
          String(initialData?.examScheduleId || initialData?.exam_schedule_id || "").trim(),
        getExamScheduleTotalMarks(
          examScheduleById.get(
            String(
              getExamScheduleIdBySubject(getSubjectIdByLabel(fallbackSubjectName)) ||
                initialData?.examScheduleId ||
                initialData?.exam_schedule_id ||
                "",
            ).trim(),
          ),
        ) || formData.maxMarks,
      ),
    ]);
  }, [
    open,
    initialData,
    isEditMode,
    examScheduleById,
    filteredExamScheduleOptions,
    formData.maxMarks,
    subjectOptionList,
  ]);

  const updateSubjectMarkEntry = (entryId, field, value) => {
    setSubjectMarksEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }

        const nextEntry = {
          ...entry,
          [field]: value,
        };

        if (field === "marksObtained") {
          nextEntry.grade = calculateGrade(value, entry.totalMarks || formData.maxMarks);
        }

        return nextEntry;
      }),
    );
  };

  const addSubjectMarkEntry = () => {
    setSubjectMarksEntries((prev) => [
      ...prev,
      createSubjectMarkEntry("", "", "", "", formData.examScheduleId, formData.maxMarks),
    ]);
  };

  const removeSubjectMarkEntry = (entryId) => {
    setSubjectMarksEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  const handleSubjectMarkSubjectChange = (entryId, value) => {
    const selectedLabel = getSubjectLabelById(value);

    setSubjectMarksEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }
        return {
          ...entry,
          subjectId: String(value || "").trim(),
          examScheduleId: entry.examScheduleId || formData.examScheduleId,
          subjectName: selectedLabel,
        };
      }),
    );
  };

  const handleSubjectMarkExamScheduleChange = (entryId, value) => {
    const selectedSchedule = examScheduleById.get(String(value || "").trim()) || null;
    const nextScheduleSubjects = getExamScheduleSubjects(selectedSchedule);
    const nextSubjectId = getExamScheduleDefaultSubjectId(selectedSchedule);
    const nextTotalMarks = getExamScheduleTotalMarks(selectedSchedule);
    const nextSubjectName = String(
      nextScheduleSubjects[0]?.label ||
        selectedSchedule?.subject_name ||
        selectedSchedule?.subject?.subject_name ||
        "",
    ).trim();

    setSubjectMarksEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }

        return {
          ...entry,
          examScheduleId: String(value || "").trim(),
          subjectId: nextSubjectId || entry.subjectId,
          subjectName: nextSubjectName || entry.subjectName,
          totalMarks: nextTotalMarks || entry.totalMarks || formData.maxMarks,
        };
      }),
    );
  };

  useEffect(() => {
    const nextGrade = shouldShowGrade
      ? calculateGrade(formData.marksObtained, formData.maxMarks)
      : "";

    setFormData((prev) => {
      if (String(prev.grade || "") === nextGrade) {
        return prev;
      }

      return {
        ...prev,
        grade: nextGrade,
      };
    });
  }, [formData.marksObtained, formData.maxMarks, shouldShowGrade]);

  useEffect(() => {
    if (!subjectMarksEntries.length) {
      return;
    }

    setSubjectMarksEntries((prev) =>
      {
        const nextEntries = prev.map((entry) => ({
          ...entry,
          grade: shouldShowGrade
            ? calculateGrade(entry.marksObtained, entry.totalMarks || formData.maxMarks)
            : "",
        }));

        const hasChanges = nextEntries.some(
          (entry, index) =>
            String(entry.grade || "") !== String(prev[index]?.grade || "") ||
            String(entry.totalMarks || "") !== String(prev[index]?.totalMarks || ""),
        );

        return hasChanges ? nextEntries : prev;
      },
    );
  }, [formData.maxMarks, subjectMarksEntries, shouldShowGrade]);

  useEffect(() => {
    if (!open || !subjectMarksEntries.length) {
      return;
    }

    const primaryEntry = subjectMarksEntries[0];
    const primarySchedule = examScheduleById.get(String(primaryEntry?.examScheduleId || "")) || selectedExamSchedule;
    const primaryScheduleTotalMarks = getExamScheduleTotalMarks(primarySchedule);
    const nextMarksObtained = String(primaryEntry?.marksObtained || "").trim();
    const nextGrade = String(primaryEntry?.grade || "").trim();
    const nextSubjectId = String(primaryEntry?.subjectId || "").trim();
    const nextExamScheduleId = String(primaryEntry?.examScheduleId || "").trim();

    setFormData((prev) => {
      if (
        String(prev.marksObtained || "").trim() === nextMarksObtained &&
        String(prev.grade || "").trim() === nextGrade &&
        String(prev.subjectId || "").trim() === nextSubjectId &&
        String(prev.examScheduleId || "").trim() === nextExamScheduleId &&
        String(prev.maxMarks || "").trim() ===
          String(primaryScheduleTotalMarks || primaryEntry?.totalMarks || prev.maxMarks || "").trim()
      ) {
        return prev;
      }

      return {
        ...prev,
        marksObtained: nextMarksObtained,
        grade: nextGrade,
        subjectId: nextSubjectId || prev.subjectId,
        examScheduleId: nextExamScheduleId || prev.examScheduleId,
        maxMarks: String(primaryScheduleTotalMarks || primaryEntry?.totalMarks || prev.maxMarks || "").trim(),
      };
    });
  }, [examScheduleById, open, selectedExamSchedule, subjectMarksEntries]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (name === "studentRecordId") {
      setFormData((prev) => ({
        ...prev,
        studentRecordId: value,
      }));
      return;
    }

    if (name === "classDetailsId") {
      setFormData((prev) => ({
        ...prev,
        classDetailsId: value,
        sectionDetailsId: "",
        studentRecordId: "",
        examScheduleId: "",
        subjectId: "",
      }));
      setSubjectMarksEntries([]);
      return;
    }

    if (name === "sectionDetailsId") {
      setFormData((prev) => ({
        ...prev,
        sectionDetailsId: value,
      }));
      return;
    }

    if (name === "examScheduleId") {
      const selectedSchedule = examScheduleById.get(String(value)) || null;
      const nextTotalMarks = getExamScheduleTotalMarks(selectedSchedule);
      const nextAcademicYearId = String(
        selectedSchedule?.academic_year_id ||
          selectedSchedule?.academicYearId ||
          selectedSchedule?.exam?.academic_year_id ||
          selectedSchedule?.exam?.academicYearId ||
          "",
      ).trim();
      setFormData((prev) => ({
        ...prev,
        examScheduleId: value,
        subjectId: getExamScheduleDefaultSubjectId(selectedSchedule, prev.subjectId),
        academicYearId: nextAcademicYearId || prev.academicYearId,
        maxMarks: nextTotalMarks || prev.maxMarks,
      }));
      return;
    }

    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const focusNextAvailableField = useCallback((refs = [], delayMs = 0) => {
    if (typeof window === "undefined") {
      return;
    }

    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        refs.some((ref) => {
          const element = ref?.current || null;
          if (!element || element.disabled) {
            return false;
          }
          element.focus({ preventScroll: true });
          if (typeof element.__openDropdownMenu === "function") {
            element.__openDropdownMenu();
          }
          return true;
        });
      });
    }, Math.max(0, Number(delayMs) || 0));
  }, []);

  const handleClassChange = (value) => {
    handleChange({
      target: {
        name: "classDetailsId",
        value,
      },
    });
    focusNextAvailableField([sectionDropdownRef, academicYearDropdownRef]);
  };

  const handleSectionChange = (value) => {
    handleChange({
      target: {
        name: "sectionDetailsId",
        value,
      },
    });
    focusNextAvailableField([examScheduleDropdownRef]);
  };

  const handleAcademicYearChange = (value) => {
    handleChange({
      target: {
        name: "academicYearId",
        value,
      },
    });
    focusNextAvailableField([examScheduleDropdownRef]);
  };

  const handleExamScheduleChange = (value) => {
    handleChange({
      target: {
        name: "examScheduleId",
        value,
      },
    });
    focusNextAvailableField([studentRecordSelectRef]);
  };

  const handleSubjectChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      subjectId: value,
    }));
    focusNextAvailableField([marksObtainedInputRef], 60);
  };

  const handleStudentRecordChange = (value) => {
    handleChange({
      target: {
        name: "studentRecordId",
        value,
      },
    });
    focusNextAvailableField([subjectDropdownRef]);
  };

  useEffect(() => {
    if (!open || isEditMode || !hasPrefilledPrimaryFilters) {
      return;
    }
    focusNextAvailableField([examScheduleDropdownRef], 80);
  }, [open, isEditMode, hasPrefilledPrimaryFilters, focusNextAvailableField]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const studentRecordId = String(formData.studentRecordId || "").trim();
    const academicYearId = String(formData.academicYearId || "").trim();
    const classDetailsId = String(formData.classDetailsId || "").trim();
    const sectionDetailsId = String(formData.sectionDetailsId || "").trim();
    const examScheduleId = String(formData.examScheduleId || "").trim();
    const subjectId = String(formData.subjectId || "").trim();
    const marksObtained = String(formData.marksObtained || "").trim();
    const subjectMarksSource =
      subjectMarksEntries.length > 0
        ? subjectMarksEntries
        : selectedSubjectName
          ? [
              createSubjectMarkEntry(
                selectedSubjectName,
                marksObtained,
                shouldShowGrade ? calculateGrade(marksObtained, formData.maxMarks) : "",
                subjectId,
                examScheduleId,
                formData.maxMarks,
              ),
            ]
          : [];
    const subjectMarks = buildSubjectMarksObject(subjectMarksSource);
    const primarySubjectEntry = subjectMarksSource[0] || null;
    const primaryMarksObtained = String(
      primarySubjectEntry?.marksObtained ?? marksObtained,
    ).trim();
    const primaryGrade = shouldShowGrade
      ? String(
          primarySubjectEntry?.grade || calculateGrade(primaryMarksObtained, formData.maxMarks),
        ).trim()
      : "";
    const primarySubjectId = String(
      primarySubjectEntry?.subjectId || subjectId || "",
    ).trim();
    const primaryExamScheduleId = String(
      primarySubjectEntry?.examScheduleId || examScheduleId || "",
    ).trim();

    const existingMarkIdForSelection = String(
      existingMarkForSelectedRecordAndSchedule?.id || initialData?.id || "",
    ).trim();

    const primarySubjectAlreadyExists =
      !isEditMode &&
      selectedStudentRecordId &&
      selectedExamScheduleId &&
      existingSubjectIdSetForSelectedRecordAndSchedule.has(primarySubjectId);

    if (
      !academicYearId ||
      !classDetailsId ||
      !sectionDetailsId ||
      !studentRecordId ||
      !examScheduleId ||
      !subjectId ||
      !marksObtained
    ) {
      return;
    }

    if (primarySubjectAlreadyExists) {
      setSubmitErrorMessage(
        "This subject already exists for the selected student record and exam schedule.",
      );
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
    setSubmitErrorMessage("");
    try {
      const payload = {
        markId: existingMarkIdForSelection || null,
        academicYearId,
        studentRecordId,
        classDetailsId,
        sectionDetailsId,
        examScheduleId: primaryExamScheduleId,
        subjectId: primarySubjectId,
        maxMarks: formData.maxMarks,
        passingMarks: formData.passingMarks,
        marksObtained: primaryMarksObtained,
        practicalMarks: formData.practicalMarks,
        internalMarks: formData.internalMarks,
        grade: String(primaryGrade || "").trim() || undefined,
        isAbsent: formData.isAbsent,
        isPass: formData.isPass,
        remarks: String(formData.remarks || "").trim(),
        subjectMarks,
        companyId: companyId || null,
        created_by: loggedInUsername || null,
        updated_by: loggedInUsername || null,
        accessToken,
      };

      if (isEditMode && existingMarkIdForSelection) {
        await (onUpdate || onCreate)(payload);
        resetDialog();
        onClose();
      } else if (isEditMode) {
        await onCreate(payload);
        resetDialog();
        onClose();
      } else {
        await onCreate(payload);
        setFormData((prev) => buildPostSubmitFormData(prev, selectedExamSchedule));
        setIsSubmitting(false);
        setSubmitErrorMessage("");
        focusNextAvailableField([studentRecordSelectRef], 100);
      }
    } catch (error) {
      setSubmitErrorMessage(
        String(error?.message || error || "Unable to save student exam marks").trim(),
      );
      setIsSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  const dialogContent = (
    <div className="fixed inset-0 z-[2300] flex items-center justify-center overflow-hidden p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={handleClose}
        aria-label="Close student exam marks dialog"
      />

      <div
        ref={dialogRef}
        style={{
          transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
        }}
        className={`relative z-10 flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] will-change-transform max-h-[calc(100svh-0.5rem)] sm:max-h-[calc(100dvh-3rem)] ${
          isDragging ? "cursor-grabbing" : ""
        }`}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="pr-4">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              {isReviewMode ? "Review Exam Marks" : isEditMode ? "Edit Exam Marks" : "Create Exam Marks"}
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
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                Select a student record and the matching exam schedule to merge marks into the JSON field.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-drag-handle="true"
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragStop}
              onPointerCancel={handleDragStop}
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
          <fieldset disabled={isReviewMode} className="contents">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-0 rounded-xl bg-slate-200 p-4">
              <div className="grid gap-2 p-2 sm:grid-cols-3">
              <label className="space-y-2">
                <span className="block text-sm font-semibold text-slate-700">Class</span>
                <SingleSelectDropdown
                  value={formData.classDetailsId}
                  onChange={handleClassChange}
                  options={classOptions.map((item) => ({
                    id: String(item.id),
                    label: formatOptionLabel(item.class_name),
                  }))}
                  placeholder="Select class"
                  autoFocus={!isEditMode && !hasPrefilledPrimaryFilters}
                />
              </label>

              <label className="space-y-2">
                <span className="block text-sm font-semibold text-slate-700">Section</span>
                <SingleSelectDropdown
                  registerTrigger={(node) => {
                    sectionDropdownRef.current = node;
                  }}
                  value={formData.sectionDetailsId}
                  onChange={handleSectionChange}
                  disabled={!formData.classDetailsId}
                  placeholder="Select section"
                  options={filteredSectionOptions.map((item) => ({
                    id: String(item.id),
                    label: formatOptionLabel(item.section),
                  }))}
                />
              </label>

              <label className="space-y-2">
                <span className="block text-sm font-semibold text-slate-700">
                  Academic Year
                </span>
                <SingleSelectDropdown
                  registerTrigger={(node) => {
                    academicYearDropdownRef.current = node;
                  }}
                  value={formData.academicYearId}
                  onChange={handleAcademicYearChange}
                  options={academicYearSelectOptions}
                  placeholder={
                    academicYearAvailable
                      ? "Select academic year"
                      : "No academic year available"
                  }
                  disabled={
                    !academicYearAvailable ||
                    (!isEditMode && Boolean(String(formData.sectionDetailsId || "").trim()))
                  }
                />
                {!academicYearAvailable ? (
                  <p className="text-xs text-amber-600">
                    Create an academic year before adding exam marks.
                  </p>
                ) : null}
              </label>

            </div>
            <div className="grid gap-2 p-2 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-sm font-semibold text-slate-700">
                  Exam Schedule
                </span>
                <SingleSelectDropdown
                  registerTrigger={(node) => {
                    examScheduleDropdownRef.current = node;
                  }}
                  value={formData.examScheduleId}
                  onChange={handleExamScheduleChange}
                  disabled={!selectedClassId}
                  placeholder={selectedClassId ? "Select exam schedule" : "Select class first"}
                  options={filteredExamScheduleOptions.map((item) => ({
                    id: String(item.id),
                    label: `${formatOptionLabel(item.exam_name || item.exam?.exam_name)} - ${formatOptionLabel(item.class_name || item.class_details?.class_name)}`,
                  }))}
                />
              </label>

              <label className="space-y-2 ">
                <span className="block text-sm font-semibold text-slate-700">
                  Student Record
                </span>
                <SingleSelectDropdown
                  registerTrigger={(node) => {
                    studentRecordSelectRef.current = node;
                  }}
                  value={formData.studentRecordId}
                  onChange={handleStudentRecordChange}
                  disabled={!formData.classDetailsId || !formData.sectionDetailsId}
                  placeholder={
                    !formData.classDetailsId || !formData.sectionDetailsId
                      ? "Select class and section first"
                      : "Select student record"
                  }
                  options={filteredStudentRecordOptions.map((item) => ({
                    id: String(item.id),
                    label: `${formatOptionLabel(item.student_name || item.student?.name)}${
                      item.roll_number ? ` (Roll No. ${item.roll_number})` : ""
                    }${
                      item.class_name || item.class_details?.class_name
                        ? ` - ${formatOptionLabel(item.class_name || item.class_details?.class_name)}`
                        : ""
                    }${
                      item.section_name || item.section_details?.section
                        ? ` (${formatOptionLabel(item.section_name || item.section_details?.section)})`
                        : ""
                    }`,
                  }))}
                />
                {selectedStudentRecord ? (
                  <p className="text-xs text-slate-500">
                    {selectedStudentRecord.class_name ||
                    selectedStudentRecord.class_details?.class_name
                      ? `Class: ${selectedStudentRecord.class_name || selectedStudentRecord.class_details?.class_name}`
                      : classById.get(String(formData.classDetailsId || ""))?.class_name
                        ? `Class: ${
                            classById.get(String(formData.classDetailsId || ""))?.class_name
                          }`
                        : ""}
                    {selectedStudentRecord.section_name ||
                    selectedStudentRecord.section_details?.section
                      ? ` ${
                          selectedStudentRecord.class_name ||
                          selectedStudentRecord.class_details?.class_name ||
                          classById.get(String(formData.classDetailsId || ""))?.class_name
                            ? "• "
                            : ""
                        }Section: ${
                          selectedStudentRecord.section_name ||
                          selectedStudentRecord.section_details?.section
                        }`
                      : ""}
                  </p>
                ) : null}
              </label>
            </div>

            </div>

            <div className={`grid gap-4 mt-3 ${isEditMode ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
              {!isEditMode ? (
                <label className="space-y-2 ">
                  <span className="block text-sm font-semibold text-slate-700">Subject</span>
                  <SingleSelectDropdown
                    registerTrigger={(node) => {
                      subjectDropdownRef.current = node;
                    }}
                    value={formData.subjectId}
                    onChange={handleSubjectChange}
                    disabled={!selectedClassId}
                    placeholder={selectedClassId ? "Select subject" : "Select class first"}
                    options={buildSubjectOptions(formData.subjectId)}
                  />
                  {/* {selectedExamScheduleSubjectOptions.length > 0 ? (
                    <p className="text-xs text-slate-500">
                      Exam schedule subjects:{" "}
                      {selectedExamScheduleSubjectOptions.map((item) => item.label).join(", ")}
                    </p>
                  ) : selectedClassId && classFilteredSubjectOptions.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No subjects are mapped to the selected class.
                    </p>
                  ) : null} */}
                  {/* {selectedExamSchedule ? (
                    <p className="text-xs text-slate-500">
                      Exam schedule subject:{" "}
                      {selectedExamSchedule.subject_name ||
                        selectedExamSchedule.subject?.subject_name ||
                        "-"}
                    </p>
                  ) : null} */}
                </label>
              ) : null}

              {isEditMode ? (
                <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">Subject Marks</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Edit each subject entry stored in the marks JSON.
                      </p>
                    </div>
                  </div>

                  {!isReviewMode ? (
                    <div className="mt-4 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={addSubjectMarkEntry}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 px-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                      >
                        + Add Subject
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    {subjectMarksEntries.length > 0 ? (
                      subjectMarksEntries.map((entry) => {
                        const scheduleItem = examScheduleById.get(String(entry.examScheduleId || ""));
                        const rowTotalMarks =
                          getExamScheduleTotalMarks(scheduleItem) ||
                          entry.totalMarks ||
                          formData.maxMarks ||
                          "-";
                        const rowGrade = shouldShowGradeForExamSchedule(scheduleItem)
                          ? calculateGrade(entry.marksObtained, rowTotalMarks) || "-"
                          : "-";

                        return (
                        <div
                          key={entry.id}
                          className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.65fr)_auto]"
                        >
                          <label className="space-y-1">
                            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Exam Schedule
                            </span>
                            <select
                              value={
                                entry.examScheduleId ||
                                getExamScheduleIdBySubject(
                                  entry.subjectId || getSubjectIdByLabel(entry.subjectName),
                                ) ||
                                formData.examScheduleId ||
                                ""
                              }
                              onChange={(event) =>
                                handleSubjectMarkExamScheduleChange(entry.id, event.target.value)
                              }
                              className="h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                              required
                            >
                              <option value="">Select exam schedule</option>
                              {filteredExamScheduleOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {formatOptionLabel(option.exam_name || option.exam?.exam_name)} -{" "}
                                  {formatOptionLabel(option.class_name || option.class_details?.class_name)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-1">
                            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Subject
                            </span>
                            <SingleSelectDropdown
                              value={entry.subjectId || getSubjectIdByLabel(entry.subjectName) || ""}
                              onChange={(value) =>
                                handleSubjectMarkSubjectChange(entry.id, value)
                              }
                              disabled={!selectedClassId}
                              placeholder={selectedClassId ? "Select subject" : "Select class first"}
                              options={buildSubjectOptions(
                                entry.subjectId || getSubjectIdByLabel(entry.subjectName) || "",
                                { allowCurrentSubject: true },
                              )}
                              className="h-[42px]"
                            />
                          </label>

                          <label className="space-y-1">
                            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Marks Obtained
                            </span>
                            <div className="flex flex-wrap items-center gap-3">
                              
                              <input
                                type="number"
                                min=""
                                step="0.01"
                                value={entry.marksObtained}
                                onChange={(event) =>
                                  updateSubjectMarkEntry(
                                    entry.id,
                                    "marksObtained",
                                    event.target.value,
                                  )
                                }
                                className="h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                              />
                            </div>
                          </label>
                          <label className="space-y-1">
                             <p className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Total Marks:&nbsp;
                                
                              </p>
                              <div className="flex flex-wrap items-center gap-3">
                              <input
                                type="text"
                                readOnly
                                value={rowTotalMarks}
                                className="h-[42px] w-24 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 outline-none sm:w-28"
                              />
                            </div>
                          </label>
                          <label className="space-y-1">
                            <p className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Grade:
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                              <input
                                type="text"
                                readOnly
                                value={rowGrade}
                                className="h-[42px] w-16 rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-600 outline-none sm:w-20"
                              />
                            </div>
                          </label>

                          {null}

                          <div className="flex items-end justify-end">
                            <button
                              type="button"
                              onClick={() => removeSubjectMarkEntry(entry.id)}
                              disabled={subjectMarksEntries.length === 1}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label="Remove subject row"
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

                          {/* {index === 0 ? (
                            <p className="sm:col-span-5 text-xs text-slate-500">
                              Primary subject entry is used for the top-level marks fields.
                            </p>
                          ) : null} */}
                        </div>
                      );
                    })
                    ) : (
                      <p className="text-sm text-slate-500">
                        No subject entries loaded. Click Add Subject to create one.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              {!isEditMode ? (
                <>
                  {/* <label className="space-y-2">
                    <span className="block text-sm font-semibold text-slate-700">
                      Max Marks
                    </span>
                    <input
                      type="number"
                      name="maxMarks"
                      value={formData.maxMarks}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="block text-sm font-semibold text-slate-700">
                      Passing Marks
                    </span>
                    <input
                      type="number"
                      name="passingMarks"
                      value={formData.passingMarks}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                  </label> */}

                  <label className="space-y-2">
                    <span className="block text-sm font-semibold text-slate-700">
                      Marks Obtainedsss
                    </span>
                    <div className="space-y-2">
                      <input
                        ref={marksObtainedInputRef}
                        type="number"
                        name="marksObtained"
                        value={formData.marksObtained}
                        onChange={handleChange}
                        onFocus={(event) => {
                          try {
                            event.target.focus({ preventScroll: true });
                            event.target.select();
                          } catch (_error) {
                          }
                        }}
                        min=""
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 caret-sky-600 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        required
                      />
                      <p className="text-[13px] font-medium text-slate-600">
                        Total Marks&nbsp;:&nbsp;<span className="text-[15px] font-semibold text-slate-600">{formData.maxMarks || "-"}</span>
                        <span className="mx-1">|</span>
                        Grade&nbsp;:&nbsp;
                        <span className="text-[15px] font-semibold text-slate-600">
                          {shouldShowGrade
                            ? calculateGrade(formData.marksObtained, formData.maxMarks) || "-"
                            : "-"}
                        </span>
                      </p>
                    </div>
                  </label>
                </>
              ) : null}

              {/* <label className="space-y-2">
                <span className="block text-sm font-semibold text-slate-700">
                  Practical Marks
                </span>
                <input
                  type="number"
                  name="practicalMarks"
                  value={formData.practicalMarks}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </label> */}

              {/* <label className="space-y-2">
                <span className="block text-sm font-semibold text-slate-700">
                  Internal Marks
                </span>
                <input
                  type="number"
                  name="internalMarks"
                  value={formData.internalMarks}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </label> */}

              {null}

              <label className="space-y-2 sm:col-span-2">
                <span className="block text-sm font-semibold text-slate-700">Remarks</span>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </label>
            </div>

              {submitErrorMessage ? (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitErrorMessage}
                </p>
              ) : null}
            </div>
          </fieldset>

          {!isReviewMode ? (
            <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-400"
              >
                {isSubmitting
                  ? "Saving..."
                  : isEditMode
                    ? "Update Exam Marks"
                    : "Save Exam Marks"}
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
