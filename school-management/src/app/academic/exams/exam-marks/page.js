"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import AccessDeniedDialog from "@/components/ui/AccessDeniedDialog";
import OverAllExamMarksDetailsDialog from "@/components/ui/OverAllExamMarksDetailsDialog";
import {
  createStudentAcademicRecordList,
  createStudentExamMarksList,
  createStudentFeesCollection,
  delistStudentFeesCollection,
  delistStudentExamMarksList,
  getAttachmentsWithIDs,
  getClassFeeStructureList,
  getAllActiveCompanyUser,
  getAcademicYearList,
  getClassList,
  getCurrentSchoolInfo,
  getExamTypeList,
  getExamScheduleList,
  getStudentAcademicRecordList,
  getStudentFeesCollectionHistory,
  getStudentExamMarksList,
  getStudentList,
  getSectionList,
  getSubjectList,
  updateStudentAcademicRecordList,
  updateStudentExamMarksList,
} from "@/lib/apiService";
import DelistConfirmDialog from "@/components/ui/DelistConfirmDialog";

const StudentExamMarksCreateDialog = dynamic(
  () => import("@/components/ui/StudentExamMarksCreateDialog"),
  {
    ssr: false,
  },
);

const StudentAcademicRecordCreateDialog = dynamic(
  () => import("@/components/ui/StudentAcademicRecordCreateDialog"),
  {
    ssr: false,
  },
);

const DialogStudentFeesCollection = dynamic(
  () => import("@/components/ui/DialogStudentFeesCollection"),
  {
    ssr: false,
  },
);

function formatMarksValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

function getStudentInitials(name) {
  const firstLetter = String(name || "").trim().charAt(0).toUpperCase();
  return firstLetter || "S";
}

const isAbsoluteUrl = (value) =>
  /^https?:\/\//i.test(value || "") || /^data:/i.test(value || "");

function buildAttachmentPreviewUrl(attachment) {
  const rawValue =
    attachment?.base_64_image ||
    attachment?.url ||
    attachment?.image_url ||
    "";

  if (!rawValue) {
    return "";
  }
  if (isAbsoluteUrl(rawValue)) {
    return rawValue;
  }

  const normalized = String(rawValue).replace(/^\/+/, "");
  if (!normalized) {
    return "";
  }
  if (normalized.startsWith("media/")) {
    return `/${normalized}`;
  }
  return `/media/${normalized}`;
}

function formatCreatedByDisplay(value) {
  const label = String(value || "").trim();
  if (!label) {
    return "-";
  }
  return label.split(".")[0] || label;
}

function getStudentCompanyUserId(record) {
  const candidate =
    record?.student_company_user_id ??
    record?.studentCompanyUserId ??
    record?.student_record?.student_company_user_id ??
    record?.student_record?.studentCompanyUserId ??
    record?.student?.student_company_user_id ??
    record?.student?.studentCompanyUserId ??
    "";

  const normalized = Number(candidate);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

function getStudentAttachmentId(record, companyUserById = new Map()) {
  const companyUserId = getStudentCompanyUserId(record);
  const linkedUser = companyUserById.get(String(companyUserId)) || null;
  const candidate = linkedUser?.attachment_id ?? linkedUser?.attachmentId ?? 0;
  const normalized = Number(candidate);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

function extractSubjectMarksEntries(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "subject") ||
        Object.prototype.hasOwnProperty.call(value, "marks_obtained")) {
      return [value];
    }
    const mappedEntries = Object.entries(value)
      .filter(([key]) => !["entries", "subjects", "items", "marks"].includes(key))
      .map(([subject, payload]) => ({
        subject,
        marks_obtained:
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? payload.marks_obtained
            : payload,
        grade:
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? payload.grade || ""
            : "",
      }));
    if (mappedEntries.length) {
      return mappedEntries;
    }
    for (const key of ["entries", "subjects", "items", "marks"]) {
      if (Array.isArray(value[key])) {
        return value[key];
      }
    }
  }
  return [];
}

function getSubjectMarksDisplayName(entry) {
  return String(entry?.subject_name || entry?.subject || "").trim();
}

function parseMarksNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getExamScheduleDisplayName(item, examSchedule) {
  return (
    item?.exam_name ||
    examSchedule?.exam_name ||
    examSchedule?.exam?.exam_name ||
    examSchedule?.exam_type ||
    examSchedule?.exam?.exam_type ||
    ""
  );
}

function formatPercentage(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `${Math.round(value)}%`;
}

function getSubjectPercentage(marksObtained, totalMarks) {
  const obtained = parseMarksNumber(marksObtained);
  const total = parseMarksNumber(totalMarks);
  if (obtained === null || total === null || total === 0) {
    return null;
  }
  return (obtained / total) * 100;
}

function getOverallRowPercentageFromSubjectTotals(subjectTotals, subjectColumns = []) {
  if (!(subjectTotals instanceof Map) || subjectTotals.size === 0) {
    return null;
  }

  const subjectsToEvaluate =
    Array.isArray(subjectColumns) && subjectColumns.length > 0
      ? subjectColumns
      : Array.from(subjectTotals.keys());

  let obtainedSum = 0;
  let totalSum = 0;

  subjectsToEvaluate.forEach((subjectName) => {
    const entry = subjectTotals.get(subjectName);
    const marksObtained = parseMarksNumber(entry?.marksObtained);
    const totalMarks = parseMarksNumber(entry?.totalMarks);
    if (marksObtained === null || totalMarks === null || totalMarks <= 0) {
      return;
    }
    obtainedSum += marksObtained;
    totalSum += totalMarks;
  });

  if (totalSum <= 0) {
    return null;
  }
  return (obtainedSum / totalSum) * 100;
}

function getResultStatusFromOverallPercentage(item, subjectColumns = []) {
  const annualSubjectTotals = item?.annualSubjectTotals;
  if (!(annualSubjectTotals instanceof Map) || annualSubjectTotals.size === 0) {
    return "⚠️";
  }

  const normalizedColumns = Array.isArray(subjectColumns)
    ? subjectColumns
        .map((name) => String(name || "").trim())
        .filter(Boolean)
    : [];
  const subjectsToEvaluate =
    normalizedColumns.length > 0
      ? normalizedColumns
      : Array.from(annualSubjectTotals.keys());

  const hasMissingAnnualSubjectMarks = subjectsToEvaluate.some((subjectName) => {
    const subjectEntry = annualSubjectTotals.get(subjectName) || null;
    const marksObtained = parseMarksNumber(subjectEntry?.marksObtained);
    const totalMarks = parseMarksNumber(subjectEntry?.totalMarks);
    return !subjectEntry || marksObtained === null || totalMarks === null || totalMarks <= 0;
  });

  if (hasMissingAnnualSubjectMarks) {
    return "⚠️";
  }

  const percentage = Number(item?.percentage);
  if (!Number.isFinite(percentage)) {
    return "⚠️";
  }

  return percentage < 35 ? "Fail" : "Pass";
}

function formatSubjectTooltip(subjectName, marksObtained, totalMarks) {
  const name = String(subjectName || "Subject").trim() || "Subject";
  const obtained = formatMarksValue(marksObtained);
  const total = formatMarksValue(totalMarks);
  if (total === "-") {
    return `${name}: ${obtained}`;
  }
  return `${name}: ${obtained}/${total}`;
}

function buildGroupedMarksRows(records, studentRecordById, examScheduleById) {
  const groups = new Map();

  for (const item of Array.isArray(records) ? records : []) {
    const studentRecordId = String(item?.student_record_id || item?.studentRecordId || "").trim();
    const groupKey = studentRecordId || String(item?.id || "").trim();
    if (!groupKey) {
      continue;
    }

    const studentRecord = studentRecordById.get(studentRecordId) || null;
    const examSchedule = examScheduleById.get(String(item?.exam_schedule_id || "") || "") || null;
    const subjectEntries = extractSubjectMarksEntries(item?.subject_marks);
    const effectiveEntries =
      subjectEntries.length > 0
        ? subjectEntries
        : [
            {
              subject_name: item?.subject_name || item?.subject?.subject_name || "",
              marks_obtained: item?.marks_obtained ?? item?.marksObtained ?? item?.marks,
              total_marks: item?.total_marks ?? item?.totalMarks ?? item?.max_marks ?? item?.maxMarks,
              grade: item?.grade || "",
              remarks: item?.remarks || "",
            },
          ];

    const existingGroup = groups.get(groupKey);
    const group = existingGroup || {
      id: groupKey,
      student_record_id: item?.student_record_id,
      studentRecord,
      student_name:
        item?.student_name || studentRecord?.student_name || studentRecord?.student?.name || "",
      student_roll_number:
        item?.student_roll_number || studentRecord?.roll_number || studentRecord?.rollNo || "",
      academic_year_name:
        item?.academic_year_name ||
        item?.academicYearName ||
        examSchedule?.academic_year_name ||
        examSchedule?.exam?.academic_year_name ||
        "-",
      class_name:
        getMarkClassName(item, studentRecord) ||
        examSchedule?.class_name ||
        examSchedule?.class_details?.class_name ||
        "-",
      section_name:
        item?.section_name ||
        studentRecord?.section_name ||
        studentRecord?.section_details?.section ||
        "-",
      examScheduleNames: new Set(),
      examScheduleIds: new Set(),
      subjectTotals: new Map(),
      annualSubjectTotals: new Map(),
      totalObtained: 0,
      totalPossible: 0,
      overallExamScheduleTotalMarks: 0,
      recordIds: new Set(),
      latestRecord: item,
      remarks: [],
      updated_by: item?.updated_by || item?.created_by || "",
      isAbsentValues: new Set(),
      isPassValues: new Set(),
    };
    const isAnnualSchedule = shouldShowGradeForExamSchedule({
      exam_name: item?.exam_name || examSchedule?.exam_name || examSchedule?.exam?.exam_name,
      exam_type: examSchedule?.exam_type || examSchedule?.exam?.exam_type,
      exam: examSchedule?.exam,
    });

    effectiveEntries.forEach((entry) => {
      const subjectName = getSubjectMarksDisplayName(entry);
      if (!subjectName) {
        return;
      }

      const marksObtained = parseMarksNumber(
        entry?.marks_obtained ?? entry?.marksObtained ?? entry?.marks,
      );
      const totalMarks = parseMarksNumber(
        entry?.total_marks ??
          entry?.totalMarks ??
          item?.max_marks ??
          item?.maxMarks ??
          examSchedule?.total_marks ??
          examSchedule?.totalMarks,
      );

      const nextSubjectValue = group.subjectTotals.get(subjectName) || {
        marksObtained: 0,
        totalMarks: 0,
      };

      if (marksObtained !== null) {
        nextSubjectValue.marksObtained += marksObtained;
        group.totalObtained += marksObtained;
      }
      if (totalMarks !== null) {
        nextSubjectValue.totalMarks += totalMarks;
        group.totalPossible += totalMarks;
      }

      group.subjectTotals.set(subjectName, nextSubjectValue);

      if (isAnnualSchedule) {
        const annualSubjectValue = group.annualSubjectTotals.get(subjectName) || {
          marksObtained: 0,
          totalMarks: 0,
        };
        if (marksObtained !== null) {
          annualSubjectValue.marksObtained += marksObtained;
        }
        if (totalMarks !== null) {
          annualSubjectValue.totalMarks += totalMarks;
        }
        group.annualSubjectTotals.set(subjectName, annualSubjectValue);
      }
    });

    const examScheduleName = String(getExamScheduleDisplayName(item, examSchedule) || "").trim();
    if (examScheduleName) {
      group.examScheduleNames.add(examScheduleName);
    }

    const examScheduleId = String(item?.exam_schedule_id || item?.examScheduleId || "").trim();
    if (examScheduleId && !group.examScheduleIds.has(examScheduleId)) {
      group.examScheduleIds.add(examScheduleId);
      const scheduleTotalMarks = parseMarksNumber(
        examSchedule?.total_marks ?? examSchedule?.totalMarks,
      );
      if (scheduleTotalMarks !== null) {
        group.overallExamScheduleTotalMarks += scheduleTotalMarks;
      }
    }

    const remark = String(item?.remarks || "").trim();
    if (remark) {
      group.remarks.push(remark);
    }

    const updatedBy = String(item?.updated_by || item?.created_by || "").trim();
    if (updatedBy) {
      group.updated_by = updatedBy;
    }

    group.isAbsentValues.add(Boolean(item?.is_absent));
    group.isPassValues.add(Boolean(item?.is_pass));
    group.recordIds.add(String(item?.id || ""));
    group.latestRecord = item;

    if (!existingGroup) {
      groups.set(groupKey, group);
    }
  }

  return Array.from(groups.values()).map((group) => {
    const absentValues = Array.from(group.isAbsentValues);
    const passValues = Array.from(group.isPassValues);

    return {
      ...group,
      exam_schedule_name: Array.from(group.examScheduleNames).join(", ") || "-",
      subjectTotals: group.subjectTotals,
      annualSubjectTotals: group.annualSubjectTotals,
      percentage:
        group.totalPossible > 0 ? (group.totalObtained / group.totalPossible) * 100 : null,
      overall_exam_schedule_total_marks: group.overallExamScheduleTotalMarks,
      remarks: Array.from(new Set(group.remarks)).join(" | ") || "-",
      is_absent:
        absentValues.length === 1 ? (absentValues[0] ? "Yes" : "No") : absentValues.length ? "Mixed" : "-",
      is_pass:
        passValues.length === 1 ? (passValues[0] ? "Yes" : "No") : passValues.length ? "Mixed" : "-",
    };
  });
}

function getAcademicYearSortKey(item) {
  const yearName = String(item?.year_name || item?.yearName || "").trim();
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

    const leftName = String(left?.year_name || left?.yearName || "");
    const rightName = String(right?.year_name || right?.yearName || "");
    return leftName.localeCompare(rightName);
  });
}

function shouldShowGradeForExamSchedule(examSchedule) {
  const candidates = [
    examSchedule?.exam_name,
    examSchedule?.exam?.exam_name,
    examSchedule?.exam_type,
    examSchedule?.exam?.exam_type,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

  return candidates.some(
    (value) =>
      value === "annual" ||
      /^annual\b/.test(value) ||
      value === "annual exam" ||
      value === "final" ||
      value === "final exam",
  );
}

function getUniqueSubjectNamesFromMarks(marksList) {
  const seen = new Set();
  const subjectNames = [];

  marksList.forEach((item) => {
    extractSubjectMarksEntries(item?.subject_marks).forEach((entry) => {
      const subjectName = getSubjectMarksDisplayName(entry);
      if (!subjectName || seen.has(subjectName)) {
        return;
      }
      seen.add(subjectName);
      subjectNames.push(subjectName);
    });
  });

  return subjectNames;
}

const ROMAN_CLASS_ORDER = new Map([
  ["I", 1],
  ["II", 2],
  ["III", 3],
  ["IV", 4],
  ["V", 5],
  ["VI", 6],
  ["VII", 7],
  ["VIII", 8],
  ["IX", 9],
  ["X", 10],
  ["XI", 11],
  ["XII", 12],
]);

function getClassSortRank(value) {
  const className = String(value || "").trim().toUpperCase();
  if (!className) {
    return Number.POSITIVE_INFINITY;
  }

  if (ROMAN_CLASS_ORDER.has(className)) {
    return ROMAN_CLASS_ORDER.get(className);
  }

  const numericValue = Number(className);
  if (Number.isFinite(numericValue)) {
    return numericValue;
  }

  return Number.POSITIVE_INFINITY;
}

function getNextAcademicYearOption(currentYearName, academicYearOptions = []) {
  const normalizedCurrent = String(currentYearName || "").trim();
  const [startText, endText] = normalizedCurrent.split("-");
  const startYear = Number.parseInt(startText, 10);
  const endYear = Number.parseInt(endText, 10);

  if (Number.isFinite(startYear) && Number.isFinite(endYear)) {
    const expectedName = `${startYear + 1}-${endYear + 1}`;
    const exactMatch = (Array.isArray(academicYearOptions) ? academicYearOptions : []).find(
      (item) => String(item?.year_name || item?.yearName || "").trim() === expectedName,
    );
    if (exactMatch) {
      return exactMatch;
    }
  }

  const sorted = sortAcademicYearsBySequence(academicYearOptions);
  const currentIndex = sorted.findIndex(
    (item) => String(item?.year_name || item?.yearName || "").trim() === normalizedCurrent,
  );
  if (currentIndex >= 0 && currentIndex < sorted.length - 1) {
    return sorted[currentIndex + 1];
  }

  return null;
}

function resolveDefaultAcademicYearId(academicYearOptions = []) {
  const options = Array.isArray(academicYearOptions) ? academicYearOptions : [];
  if (!options.length) {
    return "";
  }

  const currentYear = new Date().getFullYear();
  const parsedYears = options
    .map((item) => {
      const yearName = String(item?.year_name || item?.yearName || "").trim();
      const [startText, endText] = yearName.split("-");
      const startYear = Number.parseInt(startText, 10);
      const endYear = Number.parseInt(endText, 10);
      if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) {
        return null;
      }
      return { item, startYear, endYear };
    })
    .filter(Boolean);

  const exactCurrentStartYear = parsedYears.find(
    (entry) => entry.startYear === currentYear,
  );
  if (exactCurrentStartYear?.item?.id) {
    return String(exactCurrentStartYear.item.id);
  }

  const matchingRangeYear = parsedYears.find((entry) => {
    return currentYear >= entry.startYear && currentYear <= entry.endYear;
  });
  if (matchingRangeYear?.item?.id) {
    return String(matchingRangeYear.item.id);
  }

  const activeYear = options.find(
    (item) => Boolean(item?.is_active) || Boolean(item?.isActive),
  );
  if (activeYear?.id) {
    return String(activeYear.id);
  }

  const sorted = sortAcademicYearsBySequence(options);
  const fallback = sorted[sorted.length - 1];
  return fallback?.id ? String(fallback.id) : "";
}

function getNextClassOption(currentClassName, classOptions = []) {
  const currentRank = getClassSortRank(currentClassName);
  if (!Number.isFinite(currentRank)) {
    return null;
  }

  const sortedClasses = [...(Array.isArray(classOptions) ? classOptions : [])]
    .map((item) => ({
      item,
      rank: getClassSortRank(item?.class_name),
    }))
    .filter((entry) => Number.isFinite(entry.rank))
    .sort((left, right) => left.rank - right.rank);

  const nextEntry = sortedClasses.find((entry) => entry.rank > currentRank);
  return nextEntry?.item || null;
}

function getStudentAcademicRecordPayload(recordData, overrideStatus) {
  return {
    student_id:
      Number(recordData?.student_id || recordData?.studentId || recordData?.student_company_user_id || 0) ||
      undefined,
    academic_year_id:
      Number(recordData?.academic_year_id || recordData?.academicYearId || 0) || undefined,
    class_details_id:
      Number(recordData?.class_details_id || recordData?.classDetailsId || 0) || undefined,
    section_details_id:
      Number(recordData?.section_details_id || recordData?.sectionDetailsId || 0) || undefined,
    roll_number: String(recordData?.roll_number || recordData?.rollNumber || "").trim(),
    admission_date: recordData?.admission_date || recordData?.admissionDate || null,
    status: String(overrideStatus || recordData?.status || "active").trim().toLowerCase(),
    remarks: String(recordData?.remarks || "").trim(),
    company_id: Number(recordData?.company_id || recordData?.companyId || 0) || undefined,
  };
}

function resolveStudentIdFromOptions(rawStudentId, studentOptions = []) {
  const normalized = String(rawStudentId || "").trim();
  if (!normalized) {
    return "";
  }

  const options = Array.isArray(studentOptions) ? studentOptions : [];
  const directMatch = options.find(
    (item) => String(item?.id || "").trim() === normalized,
  );
  if (directMatch) {
    return String(directMatch.id);
  }

  const linkedMatch = options.find((item) => {
    const linkedCandidates = [
      item?.student_id,
      item?.studentId,
      item?.student?.id,
      item?.student_company_user_id,
      item?.studentCompanyUserId,
      item?.company_user_id,
      item?.companyUserId,
      item?.user_id,
      item?.userId,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    return linkedCandidates.includes(normalized);
  });
  if (linkedMatch) {
    return String(linkedMatch.id || "");
  }

  return normalized;
}

function resolveStudentIdByNameFromOptions(studentName, guardianName, studentOptions = []) {
  const normalizedStudentName = String(studentName || "").trim().toLowerCase();
  const normalizedGuardianName = String(guardianName || "").trim().toLowerCase();
  if (!normalizedStudentName) {
    return "";
  }

  const options = Array.isArray(studentOptions) ? studentOptions : [];
  const normalizedOptions = options
    .map((item) => ({
      id: String(item?.id || "").trim(),
      studentName: String(item?.name || item?.student_name || "").trim().toLowerCase(),
      guardianName: String(item?.guardian_name || item?.guardianName || "").trim().toLowerCase(),
    }))
    .filter((item) => item.id && item.studentName);

  const exactMatch = normalizedOptions.find(
    (item) =>
      item.studentName === normalizedStudentName &&
      (!normalizedGuardianName || item.guardianName === normalizedGuardianName),
  );
  if (exactMatch) {
    return exactMatch.id;
  }

  const sameNameMatches = normalizedOptions.filter(
    (item) => item.studentName === normalizedStudentName,
  );
  if (sameNameMatches.length === 1) {
    return sameNameMatches[0].id;
  }

  return "";
}

function normalizeStudentListResponse(studentsResponse) {
  if (Array.isArray(studentsResponse)) {
    return studentsResponse;
  }
  if (Array.isArray(studentsResponse?.results)) {
    return studentsResponse.results;
  }
  if (Array.isArray(studentsResponse?.response)) {
    return studentsResponse.response;
  }
  if (Array.isArray(studentsResponse?.data)) {
    return studentsResponse.data;
  }
  return [];
}

function getMarkClassName(item, studentRecord) {
  return (
    item?.class_name ||
    studentRecord?.class_name ||
    studentRecord?.class_details?.class_name ||
    ""
  );
}

function getUniqueOptions(records, idKey, labelKey) {
  const options = new Map();

  for (const record of Array.isArray(records) ? records : []) {
    const id = String(record?.[idKey] || "").trim();
    const label = String(record?.[labelKey] || "").trim();
    if (!id || !label || options.has(id)) {
      continue;
    }
    options.set(id, { id, label });
  }

  return Array.from(options.values()).sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  showLabel = false,
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

  return (
    <label className="flex min-w-0 w-full flex-col gap-0.5 text-[11px] font-medium text-slate-700 sm:w-[150px] lg:w-[140px]">
      {showLabel ? (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
      ) : null}
      <div ref={containerRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setIsOpen((prev) => !prev);
            }
          }}
          className="flex h-8 w-full items-center justify-between rounded-md border border-sky-300 bg-white px-3 text-[11px] text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 sm:text-xs"
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
                          className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-[11px] transition sm:text-xs ${
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
    </label>
  );
}

export default function ExamMarksPage() {
  const [marksList, setMarksList] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [studentRecordOptions, setStudentRecordOptions] = useState([]);
  const [examScheduleOptions, setExamScheduleOptions] = useState([]);
  const [examTypeOptions, setExamTypeOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [feeStructureOptions, setFeeStructureOptions] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [schoolDisplayName, setSchoolDisplayName] = useState("");
  const [companyUsers, setCompanyUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedMark, setSelectedMark] = useState(null);
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [promoteDialogInitialData, setPromoteDialogInitialData] = useState(null);
  const [promoteInitialStudentId, setPromoteInitialStudentId] = useState("");
  const [promotionSourceRecord, setPromotionSourceRecord] = useState(null);
  const [promotedCreatedRecord, setPromotedCreatedRecord] = useState(null);
  const [isPromotedFeesDialogOpen, setIsPromotedFeesDialogOpen] = useState(false);
  const [promotedFeesCreateInitialData, setPromotedFeesCreateInitialData] = useState(null);
  const [isPromotionFeeErrorDialogOpen, setIsPromotionFeeErrorDialogOpen] = useState(false);
  const [promotionFeeErrorMessage, setPromotionFeeErrorMessage] = useState("");
  const [isPromotionDueFeesDialogOpen, setIsPromotionDueFeesDialogOpen] = useState(false);
  const [promotionDueFeesInitialData, setPromotionDueFeesInitialData] = useState(null);
  const [pendingPromotionMarkItem, setPendingPromotionMarkItem] = useState(null);
  const [isOverallDetailsDialogOpen, setIsOverallDetailsDialogOpen] = useState(false);
  const [isOverallDetailsReview, setIsOverallDetailsReview] = useState(false);
  const [selectedOverallDetailsGroup, setSelectedOverallDetailsGroup] = useState(null);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [hasUserSelectedAcademicYear, setHasUserSelectedAcademicYear] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedExamScheduleId, setSelectedExamScheduleId] = useState("");
  const [activeMenu, setActiveMenu] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [isCurrentUserHeadMaster, setIsCurrentUserHeadMaster] = useState(false);
  const [isAccessDeniedDialogOpen, setIsAccessDeniedDialogOpen] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");
  const [recentlyAddedMarkId, setRecentlyAddedMarkId] = useState("");
  const [studentAttachmentPreviews, setStudentAttachmentPreviews] = useState({});
  const recentlyAddedMarkTimerRef = useRef(null);

  const studentRecordById = useMemo(() => {
    const map = new Map();
    studentRecordOptions.forEach((item) => {
      map.set(String(item.id), item);
    });
    return map;
  }, [studentRecordOptions]);

  const companyUserById = useMemo(() => {
    const map = new Map();
    companyUsers.forEach((item) => {
      map.set(String(item.id), item);
    });
    return map;
  }, [companyUsers]);

  const examScheduleById = useMemo(() => {
    const map = new Map();
    examScheduleOptions.forEach((item) => {
      map.set(String(item.id), item);
    });
    return map;
  }, [examScheduleOptions]);

  const examTypeFilterOptions = useMemo(() => {
    const sourceRecords = Array.isArray(examTypeOptions) ? examTypeOptions : [];
    return sourceRecords
      .map((item) => ({
        id: String(item?.id || ""),
        label: String(item?.exam_name || "").trim() || `Exam ${item?.id || ""}`,
      }))
      .filter((item) => item.id)
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [examTypeOptions]);

  const academicYearFilterOptions = useMemo(
    () =>
      sortAcademicYearsBySequence(academicYearOptions).map((item) => ({
        id: String(item.id),
        label: String(item.year_name || item.yearName || ""),
      })),
    [academicYearOptions],
  );

  const classFilterOptions = useMemo(() => {
    const sourceRecords = selectedAcademicYearId
      ? marksList.filter(
          (record) => String(record?.academic_year_id || "") === selectedAcademicYearId,
        )
      : marksList;
    return getUniqueOptions(sourceRecords, "class_details_id", "class_name");
  }, [marksList, selectedAcademicYearId]);

  const sectionFilterOptions = useMemo(() => {
    const sourceRecords = marksList.filter((record) => {
      if (
        selectedAcademicYearId &&
        String(record?.academic_year_id || "") !== selectedAcademicYearId
      ) {
        return false;
      }
      if (selectedClassId && String(record?.class_details_id || "") !== selectedClassId) {
        return false;
      }
      return true;
    });
    return getUniqueOptions(sourceRecords, "section_details_id", "section_name");
  }, [marksList, selectedAcademicYearId, selectedClassId]);

  const filteredMarksList = useMemo(() => {
    return marksList.filter((record) => {
      if (selectedExamScheduleId) {
        const examSchedule = examScheduleById.get(String(record?.exam_schedule_id || ""));
        const examTypeId = String(
          examSchedule?.exam_id || examSchedule?.exam?.id || record?.exam_id || "",
        );
        if (examTypeId !== selectedExamScheduleId) {
          return false;
        }
      }
      if (
        selectedAcademicYearId &&
        String(record?.academic_year_id || "") !== selectedAcademicYearId
      ) {
        return false;
      }
      if (selectedClassId && String(record?.class_details_id || "") !== selectedClassId) {
        return false;
      }
      if (selectedSectionId && String(record?.section_details_id || "") !== selectedSectionId) {
        return false;
      }
      return true;
    });
  }, [
    marksList,
    selectedExamScheduleId,
    selectedAcademicYearId,
    selectedClassId,
    selectedSectionId,
    examScheduleById,
  ]);

  const createDialogInitialData = useMemo(() => {
    const academicYearId = String(selectedAcademicYearId || "").trim();
    const classDetailsId = String(selectedClassId || "").trim();
    const sectionDetailsId = String(selectedSectionId || "").trim();
    const examTypeId = String(selectedExamScheduleId || "").trim();

    const matchedExamSchedule =
      examScheduleOptions.find((item) => {
        const scheduleAcademicYearId = String(
          item?.academic_year_id ||
            item?.academicYearId ||
            item?.exam?.academic_year_id ||
            item?.exam?.academicYearId ||
            "",
        ).trim();
        const scheduleClassId = String(
          item?.class_details_id || item?.classDetailsId || item?.class_details?.id || "",
        ).trim();
        const scheduleSectionId = String(
          item?.section_details_id || item?.sectionDetailsId || item?.section_details?.id || "",
        ).trim();
        const scheduleExamTypeId = String(item?.exam_id || item?.exam?.id || "").trim();

        if (academicYearId && scheduleAcademicYearId !== academicYearId) {
          return false;
        }
        if (classDetailsId && scheduleClassId !== classDetailsId) {
          return false;
        }
        if (sectionDetailsId && scheduleSectionId !== sectionDetailsId) {
          return false;
        }
        if (examTypeId && scheduleExamTypeId !== examTypeId) {
          return false;
        }
        return true;
      }) || null;

    return {
      academic_year_id: academicYearId,
      class_details_id: classDetailsId,
      section_details_id: sectionDetailsId,
      exam_schedule_id: String(matchedExamSchedule?.id || "").trim(),
    };
  }, [
    examScheduleOptions,
    selectedAcademicYearId,
    selectedClassId,
    selectedSectionId,
    selectedExamScheduleId,
  ]);

  const subjectMarkColumns = useMemo(
    () => getUniqueSubjectNamesFromMarks(filteredMarksList),
    [filteredMarksList],
  );

  const groupedMarksList = useMemo(
    () => buildGroupedMarksRows(filteredMarksList, studentRecordById, examScheduleById),
    [filteredMarksList, studentRecordById, examScheduleById],
  );

  const sortedMarksList = useMemo(() => {
    return [...groupedMarksList].sort((left, right) => {
      const leftStudentRecord = left.studentRecord || studentRecordById.get(String(left.student_record_id));
      const rightStudentRecord = right.studentRecord || studentRecordById.get(String(right.student_record_id));
      const leftClassRank = getClassSortRank(getMarkClassName(left, leftStudentRecord));
      const rightClassRank = getClassSortRank(getMarkClassName(right, rightStudentRecord));
      if (leftClassRank !== rightClassRank) {
        return leftClassRank - rightClassRank;
      }

      const leftName = String(
        left.student_name ||
          leftStudentRecord?.student_name ||
          leftStudentRecord?.student?.name ||
          "",
      ).trim();
      const rightName = String(
        right.student_name ||
          rightStudentRecord?.student_name ||
          rightStudentRecord?.student?.name ||
          "",
      ).trim();

      const nameComparison = leftName.localeCompare(rightName, undefined, {
        sensitivity: "base",
      });
      if (nameComparison !== 0) {
        return nameComparison;
      }

      return Number(left.id) - Number(right.id);
    });
  }, [groupedMarksList, studentRecordById]);
  const tableMinWidth = 1220 + subjectMarkColumns.length * 140;

  useEffect(() => {
    if (!studentRecordOptions.length) {
      setStudentAttachmentPreviews({});
      return undefined;
    }

    const attachmentIds = Array.from(
      new Set(
        studentRecordOptions
          .map((student) => getStudentAttachmentId(student, companyUserById))
          .filter((attachmentId) => Number.isFinite(attachmentId) && attachmentId > 0),
      ),
    );

    if (!attachmentIds.length) {
      setStudentAttachmentPreviews({});
      return undefined;
    }

    let mounted = true;
    getAttachmentsWithIDs(attachmentIds)
      .then((data) => {
        if (!mounted) {
          return;
        }

        const attachments = Array.isArray(data?.response) ? data.response : [];
        const nextPreviews = {};
        attachments.forEach((attachment) => {
          const preview = buildAttachmentPreviewUrl(attachment);
          if (preview) {
            nextPreviews[String(attachment.id)] = preview;
          }
        });
        setStudentAttachmentPreviews(nextPreviews);
      })
      .catch(() => {
        if (mounted) {
          setStudentAttachmentPreviews({});
        }
      });

    return () => {
      mounted = false;
    };
  }, [studentRecordOptions, companyUserById]);

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

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, []);

  const buildStudentExamMarksRequestPayload = useCallback(
    (payload) => ({
      company_id: payload.companyId || companyId || undefined,
      academic_year_id: Number(payload.academicYearId) || undefined,
      student_record_id: Number(payload.studentRecordId) || undefined,
      class_details_id: Number(payload.classDetailsId) || undefined,
      section_details_id: Number(payload.sectionDetailsId) || undefined,
      exam_schedule_id: Number(payload.examScheduleId) || undefined,
      subject_id: Number(payload.subjectId) || undefined,
      max_marks: payload.maxMarks,
      passing_marks: payload.passingMarks,
      marks_obtained: payload.marksObtained,
      practical_marks:
        payload.practicalMarks === "" || payload.practicalMarks === null
          ? null
          : payload.practicalMarks,
      internal_marks:
        payload.internalMarks === "" || payload.internalMarks === null
          ? null
          : payload.internalMarks,
      grade: payload.grade,
      is_absent: payload.isAbsent,
      is_pass: payload.isPass,
      remarks: payload.remarks,
      subject_marks: payload.subjectMarks || undefined,
      created_by: payload.created_by || undefined,
      updated_by: payload.updated_by || undefined,
    }),
    [companyId],
  );

  const fetchMarks = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getStudentExamMarksList();
      setMarksList(Array.isArray(data) ? data : []);
    } catch (_error) {
      setErrorMessage("Unable to load student exam marks.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarks();
  }, [fetchMarks]);

  useEffect(() => {
    if (recentlyAddedMarkTimerRef.current) {
      window.clearTimeout(recentlyAddedMarkTimerRef.current);
      recentlyAddedMarkTimerRef.current = null;
    }

    if (!recentlyAddedMarkId) {
      return undefined;
    }

    recentlyAddedMarkTimerRef.current = window.setTimeout(() => {
      setRecentlyAddedMarkId("");
      recentlyAddedMarkTimerRef.current = null;
    }, 6000);

    return () => {
      if (recentlyAddedMarkTimerRef.current) {
        window.clearTimeout(recentlyAddedMarkTimerRef.current);
        recentlyAddedMarkTimerRef.current = null;
      }
    };
  }, [recentlyAddedMarkId]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const data = await getCurrentSchoolInfo();
        if (data?.company?.id) {
          setCompanyId(data.company.id);
        }
        setSchoolDisplayName(
          String(data?.school?.name || data?.company?.name || "").trim(),
        );
        setCurrentUserRole(String(data?.role || "").trim().toLowerCase());
        setIsCurrentUserHeadMaster(Boolean(data?.is_head_master));
      } catch (_error) {
        setCompanyId(null);
        setSchoolDisplayName("");
        setCurrentUserRole("");
        setIsCurrentUserHeadMaster(false);
      }

      try {
        const [academicYears, classes, sections, studentRecords, examSchedules, subjects, examTypes, students, feeStructures] = await Promise.all([
          getAcademicYearList(),
          getClassList(),
          getSectionList(),
          getStudentAcademicRecordList(),
          getExamScheduleList(),
          getSubjectList(),
          getExamTypeList(),
          getStudentList(),
          getClassFeeStructureList(),
        ]);
        setAcademicYearOptions(Array.isArray(academicYears) ? academicYears : []);
        setClassOptions(Array.isArray(classes) ? classes : []);
        setSectionOptions(Array.isArray(sections) ? sections : []);
        setStudentRecordOptions(Array.isArray(studentRecords) ? studentRecords : []);
        setExamScheduleOptions(Array.isArray(examSchedules) ? examSchedules : []);
        setSubjectOptions(Array.isArray(subjects) ? subjects : []);
        setExamTypeOptions(Array.isArray(examTypes) ? examTypes : []);
        setStudentOptions(normalizeStudentListResponse(students));
        setFeeStructureOptions(Array.isArray(feeStructures) ? feeStructures : []);
      } catch (_error) {
        setClassOptions([]);
        setSectionOptions([]);
        setStudentRecordOptions([]);
        setExamScheduleOptions([]);
        setSubjectOptions([]);
        setAcademicYearOptions([]);
        setExamTypeOptions([]);
        setStudentOptions([]);
        setFeeStructureOptions([]);
      }

      try {
        const companyUsersResponse = await getAllActiveCompanyUser();
        setCompanyUsers(Array.isArray(companyUsersResponse?.response) ? companyUsersResponse.response : []);
      } catch (_error) {
        setCompanyUsers([]);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!academicYearOptions.length) {
      return;
    }

    if (hasUserSelectedAcademicYear) {
      return;
    }

    setSelectedAcademicYearId(resolveDefaultAcademicYearId(academicYearOptions));
  }, [academicYearOptions, hasUserSelectedAcademicYear]);

  const handleCreateStudentExamMarks = async (payload) => {
    const requestPayload = buildStudentExamMarksRequestPayload(payload);
    const createdMark = await createStudentExamMarksList(requestPayload, payload.accessToken);
    const createdMarkId = String(
      createdMark?.id ||
        createdMark?.markId ||
        createdMark?.data?.id ||
        createdMark?.response?.id ||
        "",
    ).trim();

    if (createdMarkId) {
      setRecentlyAddedMarkId(createdMarkId);
    }
    await fetchMarks();
    return createdMark;
  };

  const handleUpdateStudentExamMarks = async (payload) => {
    const markId = payload?.markId || selectedMark?.id;
    if (!markId) {
      throw new Error("Unable to update student exam marks");
    }

    const requestPayload = buildStudentExamMarksRequestPayload(payload);
    await updateStudentExamMarksList(markId, requestPayload, payload.accessToken);
    await fetchMarks();
    setIsCreateDialogOpen(false);
    setSelectedMark(null);
    setDialogMode("create");
  };

  const handleOpenCreate = () => {
    setActiveMenu(null);
    setDialogMode("create");
    setSelectedMark(null);
    setIsCreateDialogOpen(true);
  };

  const handleEditMark = (markItem) => {
    setActiveMenu(null);
    if (currentUserRole === "teacher" && !isCurrentUserHeadMaster) {
      setAccessDeniedMessage("Teacher cannot edit");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
    setIsOverallDetailsReview(false);
    setSelectedOverallDetailsGroup(markItem);
    setIsOverallDetailsDialogOpen(true);
  };

  const handleReviewMark = (markItem) => {
    setActiveMenu(null);
    setIsOverallDetailsReview(true);
    setSelectedOverallDetailsGroup(markItem);
    setIsOverallDetailsDialogOpen(true);
  };

  const handleDeleteMark = (markItem) => {
    setActiveMenu(null);
    setDeleteTarget(markItem);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseOverallDetailsDialog = (options = {}) => {
    setIsOverallDetailsDialogOpen(false);
    setIsOverallDetailsReview(false);
    setSelectedOverallDetailsGroup(null);
    if (options?.refresh !== false) {
      void fetchMarks();
    }
  };

  const handleEditOverallMarkRow = (markItem) => {
    if (currentUserRole === "teacher" && !isCurrentUserHeadMaster) {
      setAccessDeniedMessage("Teacher cannot edit");
      setIsAccessDeniedDialogOpen(true);
      return;
    }

    setDialogMode("edit");
    setSelectedMark(markItem);
    setIsCreateDialogOpen(true);
  };

  const handleReviewOverallMarkRow = (markItem) => {
    setDialogMode("review");
    setSelectedMark(markItem);
    setIsCreateDialogOpen(true);
  };

  const handleDelistOverallMarkRow = (markItem) => {
    handleCloseOverallDetailsDialog({ refresh: false });
    setDeleteTarget(markItem);
    setIsDeleteDialogOpen(true);
  };

  const openPromoteDialogWithPreparedData = (markItem) => {
    const sourceRecord =
      studentRecordById.get(String(markItem?.student_record_id || "")) ||
      markItem?.studentRecord ||
      null;

    if (!sourceRecord) {
      setErrorMessage("Unable to find student academic record for promotion.");
      return;
    }

    const currentAcademicYearName = String(
      sourceRecord?.academic_year_name || markItem?.academic_year_name || "",
    ).trim();
    const nextAcademicYear = getNextAcademicYearOption(currentAcademicYearName, academicYearOptions);
    const nextClass = getNextClassOption(getMarkClassName(markItem, sourceRecord), classOptions);

    if (!nextAcademicYear) {
      setErrorMessage("Next academic year was not found. Please create next academic year first.");
      return;
    }
    if (!nextClass) {
      setErrorMessage("Next class was not found. Please configure class progression first.");
      return;
    }

    const currentSectionName = String(
      sourceRecord?.section_name || sourceRecord?.section_details?.section || "",
    ).trim();
    const nextSection = sectionOptions.find(
      (item) =>
        String(item?.class_details_id || "") === String(nextClass?.id || "") &&
        String(item?.section || "").trim().toLowerCase() === currentSectionName.toLowerCase(),
    );

    // Prefer IDs coming from the selected student academic record row.
    const studentIdCandidates = [
      sourceRecord?.student_id,
      sourceRecord?.student?.id,
      sourceRecord?.student_company_user_id,
      sourceRecord?.studentCompanyUserId,
      markItem?.student_id,
      markItem?.student?.id,
      markItem?.student_company_user_id,
      markItem?.studentCompanyUserId,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const sourceStudentName = String(
      sourceRecord?.student_name ||
        sourceRecord?.student?.name ||
        markItem?.student_name ||
        markItem?.student?.name ||
        "",
    ).trim();
    const sourceGuardianName = String(
      sourceRecord?.guardian_name ||
        sourceRecord?.guardianName ||
        sourceRecord?.student?.guardian_name ||
        sourceRecord?.student?.guardianName ||
        markItem?.guardian_name ||
        markItem?.guardianName ||
        markItem?.student?.guardian_name ||
        markItem?.student?.guardianName ||
        "",
    ).trim();

    const resolvedFromCandidates =
      resolveStudentIdFromOptions(studentIdCandidates[0], studentOptions) ||
      resolveStudentIdFromOptions(studentIdCandidates[1], studentOptions) ||
      resolveStudentIdFromOptions(studentIdCandidates[2], studentOptions) ||
      resolveStudentIdFromOptions(studentIdCandidates[3], studentOptions) ||
      resolveStudentIdFromOptions(studentIdCandidates[4], studentOptions) ||
      resolveStudentIdFromOptions(studentIdCandidates[5], studentOptions) ||
      resolveStudentIdFromOptions(studentIdCandidates[6], studentOptions) ||
      resolveStudentIdFromOptions(studentIdCandidates[7], studentOptions);
    const resolvedFromName = resolveStudentIdByNameFromOptions(
      sourceStudentName,
      sourceGuardianName,
      studentOptions,
    );
    const resolvedStudentId = resolvedFromCandidates || resolvedFromName || "";

    if (!resolvedStudentId) {
      setErrorMessage("Unable to identify student for promotion.");
      return;
    }

    const studentIdFromSelectedRecord = String(
      sourceRecord?.student_id || sourceRecord?.student?.id || resolvedStudentId || "",
    ).trim();
    const studentIdForPrefill = studentIdFromSelectedRecord || resolvedStudentId;

    setPromoteInitialStudentId(studentIdForPrefill);
    setPromotionSourceRecord(sourceRecord);
    setPromoteDialogInitialData({
      studentId: studentIdForPrefill,
      student_id: studentIdForPrefill,
      academicYearId: String(nextAcademicYear?.id || ""),
      classDetailsId: String(nextClass?.id || ""),
      sectionDetailsId: String(nextSection?.id || ""),
      rollNumber: String(sourceRecord?.roll_number || "").trim(),
      status: "pending",
      remarks: "Promoted from exam result",
      studentName: sourceStudentName,
      guardianName: sourceGuardianName,
    });
    setIsPromoteDialogOpen(true);
  };

  const isFeesCollectionFullyPaid = (collectionItem) => {
    if (!collectionItem || typeof collectionItem !== "object") {
      return false;
    }
    const normalizedStatus = String(
      collectionItem?.status || collectionItem?.status_display || "",
    )
      .trim()
      .toLowerCase();
    const dueAmount = Number.parseFloat(String(collectionItem?.due_amount ?? "0"));
    const hasNoDue = Number.isFinite(dueAmount) ? dueAmount <= 0 : false;
    const statusIsPaid =
      normalizedStatus === "fully_paid" ||
      normalizedStatus === "paid" ||
      normalizedStatus.includes("fully paid");
    return hasNoDue && statusIsPaid;
  };

  const handleOpenPromoteDialog = async (markItem) => {
    const sourceRecord =
      studentRecordById.get(String(markItem?.student_record_id || "")) ||
      markItem?.studentRecord ||
      null;

    if (!sourceRecord?.id) {
      setErrorMessage("Unable to find student academic record for promotion.");
      return;
    }

    const sourceRecordId = Number(sourceRecord.id);
    if (!Number.isFinite(sourceRecordId) || sourceRecordId <= 0) {
      setErrorMessage("Invalid student academic record for promotion.");
      return;
    }

    try {
      const feeHistory = await getStudentFeesCollectionHistory(sourceRecordId);
      const latestFeeCollection =
        Array.isArray(feeHistory) && feeHistory.length > 0 ? feeHistory[0] : null;

      if (latestFeeCollection && isFeesCollectionFullyPaid(latestFeeCollection)) {
        openPromoteDialogWithPreparedData(markItem);
        return;
      }

      const payableCollection = (Array.isArray(feeHistory) ? feeHistory : []).find((item) => {
        const dueAmount = Number.parseFloat(String(item?.due_amount ?? "0"));
        return Number.isFinite(dueAmount) && dueAmount > 0;
      }) || latestFeeCollection;

      if (!payableCollection) {
        setErrorMessage("Student fees record not found for promotion check.");
        return;
      }

      const dueAmount = Number.parseFloat(String(payableCollection?.due_amount ?? "0"));
      const effectiveTotalAmount = Number.isFinite(dueAmount) && dueAmount > 0
        ? dueAmount
        : Number.parseFloat(String(payableCollection?.total_amount ?? "0"));

      setPendingPromotionMarkItem(markItem);
      setPromotionDueFeesInitialData({
        ...payableCollection,
        student_academic_rcord_id:
          payableCollection?.student_academic_rcord_id || sourceRecordId,
        total_amount: formatMarksValue(
          Number.isFinite(effectiveTotalAmount) ? effectiveTotalAmount.toFixed(2) : "0.00",
        ),
        paid_amount: "0.00",
      });

      const studentName = String(
        sourceRecord?.student_name || sourceRecord?.student?.name || markItem?.student_name || "-",
      ).trim() || "-";
      const academicYearName = String(
        sourceRecord?.academic_year_name || markItem?.academic_year_name || "-",
      ).trim() || "-";
      const className = String(
        sourceRecord?.class_name || sourceRecord?.class_details?.class_name || markItem?.class_name || "-",
      ).trim() || "-";
      setPromotionFeeErrorMessage(
        `${studentName} | ${academicYearName} | ${className}\nStudent Fees is not fully Paid. Before promoted kindly paid the due amount.`,
      );
      setIsPromotionFeeErrorDialogOpen(true);
    } catch (_error) {
      setErrorMessage("Unable to validate student fees before promotion.");
    }
  };

  const handleCreatePromotedAcademicRecord = async (recordData) => {
    const sourceRecord = promotionSourceRecord;
    const accessToken = String(recordData?.accessToken || "").trim();
    if (!sourceRecord?.id) {
      throw new Error("Existing student academic record was not found for promotion.");
    }

    const deactivatePayload = getStudentAcademicRecordPayload(
      {
        ...sourceRecord,
        company_id: sourceRecord?.company_id || companyId,
      },
      "promoted",
    );

    await updateStudentAcademicRecordList(sourceRecord.id, deactivatePayload, accessToken);

    const normalizedStudentId = Number(
      resolveStudentIdFromOptions(recordData?.studentId, studentOptions),
    );
    if (!Number.isFinite(normalizedStudentId) || normalizedStudentId <= 0) {
      throw new Error("Unable to map selected student for new academic record.");
    }

    const normalizedAcademicYearId = Number(recordData?.academicYearId || 0);
    if (!Number.isFinite(normalizedAcademicYearId) || normalizedAcademicYearId <= 0) {
      throw new Error("Academic year is missing for promoted academic record.");
    }

    const duplicateRecord = (Array.isArray(studentRecordOptions) ? studentRecordOptions : []).find(
      (item) =>
        Number(item?.student_id || item?.student?.id || 0) === normalizedStudentId &&
        Number(item?.academic_year_id || item?.academicYearId || 0) === normalizedAcademicYearId &&
        Number(item?.id || 0) !== Number(sourceRecord?.id || 0),
    );
    if (duplicateRecord) {
      throw new Error("Student already has an academic record for the selected academic year.");
    }

    const createPayload = {
      company_id: recordData.companyId || companyId || undefined,
      student_id: normalizedStudentId,
      academic_year_id: normalizedAcademicYearId,
      class_details_id: recordData.classDetailsId,
      section_details_id: recordData.sectionDetailsId,
      roll_number: recordData.rollNumber || "",
      admission_date: recordData.admissionDate,
      status: "pending",
      remarks: recordData.remarks || "",
    };

    const createdRecord = await createStudentAcademicRecordList(createPayload, accessToken);
    const createdRecordId = Number(
      createdRecord?.id || createdRecord?.response?.id || createdRecord?.data?.id || 0,
    );

    const latestStudentRecords = await getStudentAcademicRecordList();
    const normalizedStudentRecords = Array.isArray(latestStudentRecords) ? latestStudentRecords : [];
    setStudentRecordOptions(normalizedStudentRecords);
    const resolvedCreatedRecord =
      normalizedStudentRecords.find((item) => Number(item?.id) === createdRecordId) || null;

    setPromotedCreatedRecord(
      resolvedCreatedRecord || {
        id: createdRecordId,
        company_id: createPayload.company_id || companyId,
        student_id: createPayload.student_id,
        academic_year_id: createPayload.academic_year_id,
        class_details_id: createPayload.class_details_id,
        section_details_id: createPayload.section_details_id,
        roll_number: createPayload.roll_number,
        admission_date: createPayload.admission_date,
        status: "pending",
        remarks: createPayload.remarks,
      },
    );

    setIsPromoteDialogOpen(false);
    setPromoteDialogInitialData(null);
    setPromoteInitialStudentId("");
    setPromotionSourceRecord(null);

    setPromotedFeesCreateInitialData({
      studentAcademicRecordId: String(createdRecordId || ""),
    });
    setIsPromotedFeesDialogOpen(true);
  };

  const handleCreatePromotedFeesCollection = async (payload) => {
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

    const paidAmount = Number(payload?.paidAmount || 0);
    if (Number.isFinite(paidAmount) && paidAmount > 0 && promotedCreatedRecord?.id) {
      const activationPayload = getStudentAcademicRecordPayload(
        {
          ...promotedCreatedRecord,
          company_id: promotedCreatedRecord?.company_id || companyId,
        },
        "active",
      );
      await updateStudentAcademicRecordList(
        promotedCreatedRecord.id,
        activationPayload,
        payload.accessToken,
      );
    }

    const latestStudentRecords = await getStudentAcademicRecordList();
    setStudentRecordOptions(Array.isArray(latestStudentRecords) ? latestStudentRecords : []);
    setIsPromotedFeesDialogOpen(false);
    setPromotedFeesCreateInitialData(null);
    setPromotedCreatedRecord(null);
  };

  const handleCreatePromotionDueFeesCollection = async (payload) => {
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
      total_amount: safeCurrentDueAmount.toFixed(2),
      paid_amount: safeRepayAmount.toFixed(2),
      payment_date: payload.paymentDate,
      payment_mode: payload.paymentMode,
      transaction_id: payload.transactionId,
      remarks: payload.remarks,
      company_id: payload.companyId || companyId || undefined,
    };

    const createdCollection = await createStudentFeesCollection(requestPayload, payload.accessToken);
    await delistStudentFeesCollection(payload.sourceCollectionId, payload.accessToken);

    setIsPromotionDueFeesDialogOpen(false);
    setPromotionDueFeesInitialData(null);

    if (isFeesCollectionFullyPaid(createdCollection) && pendingPromotionMarkItem) {
      const markItem = pendingPromotionMarkItem;
      setPendingPromotionMarkItem(null);
      openPromoteDialogWithPreparedData(markItem);
      return;
    }
    setPendingPromotionMarkItem(null);
    setErrorMessage("Student fees repayment saved, but promotion is still blocked until fees are fully paid.");
  };

  const handleAcademicYearFilterChange = (value) => {
    setHasUserSelectedAcademicYear(true);
    setSelectedExamScheduleId("");
    setSelectedAcademicYearId(value);
    setSelectedClassId("");
    setSelectedSectionId("");
  };

  const handleClassFilterChange = (value) => {
    setSelectedClassId(value);
    setSelectedExamScheduleId("");
    setSelectedSectionId("");
  };

  const handleSectionFilterChange = (value) => {
    setSelectedSectionId(value);
    setSelectedExamScheduleId("");
  };

  const handleExamScheduleFilterChange = (value) => {
    setSelectedExamScheduleId(value);
  };

  const handleExamTypeFilterChange = (value) => {
    setSelectedExamScheduleId(value);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) {
      return;
    }

    const accessToken =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token") || ""
        : "";

    setIsDeleting(true);
    try {
      await delistStudentExamMarksList(deleteTarget.id, accessToken);
      await fetchMarks();
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleActionMenu = (event, markItem) => {
    event.stopPropagation();
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 144;
    const menuHeight = 88;
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
      id: markItem.latestRecord?.id || markItem.id,
      markItem: markItem.latestRecord || markItem,
      top,
      left,
    };

    setActiveMenu((prev) => (prev?.id === markItem.id ? null : nextMenu));
  };

  const selectedStudentMarksForDetails = useMemo(() => {
    if (!selectedOverallDetailsGroup?.student_record_id) {
      return [];
    }

    return filteredMarksList.filter(
      (item) =>
        String(item?.student_record_id || "").trim() ===
        String(selectedOverallDetailsGroup.student_record_id || "").trim(),
    );
  }, [filteredMarksList, selectedOverallDetailsGroup]);

  const selectedStudentRecordForDetails = useMemo(() => {
    if (!selectedOverallDetailsGroup?.student_record_id) {
      return selectedOverallDetailsGroup?.studentRecord || null;
    }

    return (
      studentRecordById.get(String(selectedOverallDetailsGroup.student_record_id)) ||
      selectedOverallDetailsGroup?.studentRecord ||
      null
    );
  }, [selectedOverallDetailsGroup, studentRecordById]);

  return (
    <main className="dashboard-shell h-full min-h-0 overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full min-h-0 w-full flex-col px-3 pb-4 pt-16 sm:px-6 lg:px-8 lg:pt-8">
        <section className="shrink-0 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-700 via-cyan-700 to-teal-700 px-4 py-4 text-white shadow-[0_16px_34px_rgba(14,116,144,0.25)] sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-xl font-semibold tracking-wide sm:text-2xl">
                  Exam Marks
                </h1>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-sky-700 shadow-sm transition hover:bg-sky-50 sm:hidden"
                  aria-label="Add Exam Marks"
                  title="Add Exam Marks"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end sm:gap-3">
                <FilterSelect
                  label="Exam Schedule"
                  value={selectedExamScheduleId}
                  onChange={handleExamTypeFilterChange}
                  options={examTypeFilterOptions}
                  placeholder="All exam schedules"
                  disabled={examTypeFilterOptions.length === 0}
                />
                <FilterSelect
                  label="Academic Year"
                  value={selectedAcademicYearId}
                  onChange={handleAcademicYearFilterChange}
                  options={academicYearFilterOptions}
                  placeholder="All academic years"
                />
                <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 sm:col-span-1 sm:flex sm:items-end sm:gap-3">
                  <FilterSelect
                    label="Class"
                    value={selectedClassId}
                    onChange={handleClassFilterChange}
                    options={classFilterOptions}
                    placeholder="All classes"
                    disabled={academicYearFilterOptions.length === 0}
                  />
                  <FilterSelect
                    label="Section"
                    value={selectedSectionId}
                    onChange={handleSectionFilterChange}
                    options={sectionFilterOptions}
                    placeholder="All sections"
                    disabled={classFilterOptions.length === 0}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedExamScheduleId("");
                      setSelectedAcademicYearId("");
                      setSelectedClassId("");
                      setSelectedSectionId("");
                    }}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
                    aria-label="Clear filters"
                    title="Clear filters"
                  >
                    <span className="text-sm leading-none">×</span>
                  </button>
                </div>
              </div>
              <div className="hidden justify-start lg:flex lg:justify-end">
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-sky-700 shadow-sm transition hover:bg-sky-50 sm:h-9 sm:w-auto sm:gap-2 sm:rounded-lg sm:px-4 sm:py-2 sm:text-sm sm:font-semibold"
                  aria-label="Add Exam Marks"
                  title="Add Exam Marks"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 sm:h-4 sm:w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                  <span className="hidden sm:inline">Add Exam Marks</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="h-full overflow-auto">
            <table
              className="w-full border-collapse text-left"
              style={{ minWidth: `${tableMinWidth}px` }}
            >
              <thead>
                <tr className="border-b border-slate-200 text-[14px] uppercase tracking-wide text-center text-slate-500">
                  {/* <th className="sticky top-0 z-10 bg-white px-2 py-3 font-semibold">SL.No.</th> */}
                  <th className="sticky top-0 z-10 bg-white px-2 py-3 font-semibold">Photo</th>
                  <th className="sticky top-0 z-10 bg-white px-2 py-3 font-semibold">Student</th>
                  <th className="sticky top-0 z-10 bg-white px-2 py-3 font-semibold">Roll No.</th>
                  <th className="sticky top-0 z-10 bg-white px-2 py-3 font-semibold">Academic Year</th>
                  <th className="sticky top-0 z-10 bg-white px-2 py-3 font-semibold">Class</th>
                  <th className="sticky top-0 z-10 bg-white px-2 py-3 font-semibold">Section</th>
                  <th className="sticky top-0 z-10 bg-white px-2 py-3 font-semibold">Exam Schedule</th>
                  {/* <th className="px-2 py-3 font-semibold">Subject</th> */}
                  {/* <th className="px-2 py-3 font-semibold">Subject Marks</th>
                  <th className="px-2 py-3 font-semibold">Marks Obtained</th>
                  <th className="px-2 py-3 font-semibold">Practical</th> */}
                  {/* <th className="px-2 py-3 font-semibold">Subject, Marks & Grade</th> */}
                  {subjectMarkColumns.map((subjectName) => (
                    <th key={subjectName} className="sticky top-0 z-10 bg-white px-2 py-3 font-semibold">
                      {subjectName}
                    </th>
                  ))}
                  <th className="sticky top-0 z-10 bg-white px-2 py-3 font-semibold">Overall %</th>
                  <th className="sticky top-0 z-10 bg-white px-2 py-3 font-semibold">Absent</th>
                  <th className="sticky top-0 z-10 bg-white px-2 py-3 font-semibold">Result</th>
                  <th className="sticky top-0 z-10 bg-white px-2 py-3 font-semibold">Remarks</th>
                  <th className="sticky top-0 z-10 bg-white px-2 py-3 font-semibold">Created By</th>
                  <th className="sticky top-0 z-10 bg-white px-2 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3" colSpan={14 + subjectMarkColumns.length}>
                      Loading...
                    </td>
                  </tr>
                ) : null}

                {!isLoading && errorMessage ? (
                  <tr className="border-b border-slate-100 text-sm text-red-600">
                    <td className="px-2 py-3" colSpan={14 + subjectMarkColumns.length}>
                      {errorMessage}
                    </td>
                  </tr>
                ) : null}

                {!isLoading && !errorMessage && marksList.length === 0 ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3" colSpan={14 + subjectMarkColumns.length}>
                      No student exam marks found.
                    </td>
                  </tr>
                ) : null}

                {sortedMarksList.map((item, index) => {
                  const studentRecord = item.studentRecord || studentRecordById.get(String(item.student_record_id));
                  const examSchedule = examScheduleById.get(String(item.latestRecord?.exam_schedule_id || ""));
                  const showGrade = shouldShowGradeForExamSchedule(examSchedule);
                  const passStatus = getResultStatusFromOverallPercentage(item, subjectMarkColumns);
                  const isAlreadyPromoted =
                    String(studentRecord?.status || "").trim().toLowerCase() === "promoted";
                  const academicYearName =
                    item.academic_year_name ||
                    item.academicYearName ||
                    examSchedule?.academic_year_name ||
                    examSchedule?.exam?.academic_year_name ||
                    "-";
                  const latestEntry = item.latestRecord || null;
                  const overallRowPercentage = getOverallRowPercentageFromSubjectTotals(
                    item.subjectTotals,
                    subjectMarkColumns,
                  );
                  const isRecentlyAddedRow =
                    recentlyAddedMarkId &&
                    (String(item.id) === recentlyAddedMarkId ||
                      (item.recordIds instanceof Set && item.recordIds.has(recentlyAddedMarkId)));

                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-100 text-sm text-center text-slate-700 transition-colors ${
                        isRecentlyAddedRow ? "bg-amber-50" : ""
                      }`}
                    >
                      {/* <td className="px-2 py-3 font-medium text-slate-800">
                        {index + 1}
                      </td> */}
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-center">
                          {(() => {
                            const attachmentId = getStudentAttachmentId(
                              studentRecord,
                              companyUserById,
                            );
                            const photoUrl = attachmentId
                              ? studentAttachmentPreviews[String(attachmentId)]
                              : "";

                            return (
                          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-sky-50">
                              {attachmentId && photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={`${item.student_name || studentRecord?.student_name || "Student"} profile`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-sky-100 text-sm font-semibold text-sky-700">
                                {getStudentInitials(
                                  item.student_name ||
                                    studentRecord?.student_name ||
                                    studentRecord?.student?.name,
                                )}
                              </div>
                            )}
                          </div>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        {item.student_name ||
                          studentRecord?.student_name ||
                          studentRecord?.student?.name ||
                          "-"}
                      </td>
                      <td className="px-2 py-3">
                        {item.student_roll_number ||
                          studentRecord?.roll_number ||
                          "-"}
                      </td>
                      <td className="px-2 py-3">{academicYearName}</td>
                      <td className="px-2 py-3">
                        {getMarkClassName(item, studentRecord) || "-"}
                      </td>
                      <td className="px-2 py-3">
                        {item.section_name ||
                          studentRecord?.section_name ||
                          studentRecord?.section_details?.section ||
                          "-"}
                      </td>
                      <td className="px-2 py-3">
                        <div className="max-w-[180px] whitespace-normal">
                          {item.exam_schedule_name ||
                            item.exam_name ||
                            examSchedule?.exam_name ||
                            examSchedule?.exam?.exam_name ||
                            "-"}
                        </div>
                      </td>
                      {/* <td className="px-2 py-3">
                        {subjectLabel ||
                          item.subject_marks?.subject ||
                          item.subject_name ||
                          subject?.subject_name ||
                          examSchedule?.subject_name ||
                          "-"}
                      </td> */}
                      {/* <td className="px-2 py-3">
                        <div className="max-w-[340px] whitespace-normal text-slate-600">
                          {marksSummary}
                        </div>
                        {marksEntries.length > 1 ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {marksEntries.length} subject entries
                          </p>
                        ) : null}
                      </td> */}
                      {subjectMarkColumns.map((subjectName) => {
                        const matchingEntry = item.subjectTotals?.get(subjectName);
                        const marksObtained = matchingEntry ? matchingEntry.marksObtained : "-";
                        const scheduleTotalMarks = parseMarksNumber(
                          item.overall_exam_schedule_total_marks,
                        );
                        const percentage = getSubjectPercentage(
                          marksObtained,
                          scheduleTotalMarks,
                        );
                        const subjectTooltip = formatSubjectTooltip(
                          subjectName,
                          marksObtained,
                          scheduleTotalMarks,
                        );

                        return (
                          <td key={`${item.id}-${subjectName}`} className="px-2 py-3">
                            <div className="min-w-[120px] rounded-lg px-3 py-2" title={subjectTooltip}>
                              <div className="text-[15px] font-semibold text-slate-700">
                                {formatPercentage(percentage)}
                              </div>
                              {showGrade ? (
                                <div className="text-md text-slate-600">
                                  <span className="font-semibold text-slate-500">Grade:</span>{" "}
                                  -
                                </div>
                              ) : null}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-2 py-3 font-semibold">
                        {formatPercentage(overallRowPercentage)}
                      </td>
                      {/* <td className="px-2 py-3">
                        {formatMarksValue(
                          item.subject_marks?.marks_obtained ?? item.marks_obtained,
                        )}
                      </td> */}
                      {/* <td className="px-2 py-3">{formatMarksValue(item.practical_marks)}</td>
                      <td className="px-2 py-3">{formatMarksValue(item.internal_marks)}</td>
                      <td className="px-2 py-3">
                        {item.subject_marks?.grade || item.grade || "-"}
                      </td> */}
                      <td className="px-2 py-3">{item.is_absent}</td>
                      <td className="px-2 py-3 font-semibold">{passStatus}</td>
                      <td className="px-2 py-3">
                        <div className="max-w-[260px] whitespace-normal text-slate-600">
                          {item.remarks || latestEntry?.remarks || "-"}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        {formatCreatedByDisplay(item.updated_by || item.created_by || "-")}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {isAlreadyPromoted ? (
                            <button
                              type="button"
                              disabled
                              className="inline-flex h-8 cursor-not-allowed items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-2.5 text-xs font-semibold text-slate-500"
                            >
                              Promoted
                            </button>
                          ) : passStatus === "Pass" ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPromoteDialog(item)}
                              className="inline-flex h-8 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              Promote
                            </button>
                          ) : null}
                          <button
                            type="button"
                            data-action-menu-trigger="true"
                            onClick={(event) => toggleActionMenu(event, item)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                            aria-label="Open actions menu"
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <StudentExamMarksCreateDialog
        key={`${dialogMode}-${selectedMark?.id || "new"}-${isCreateDialogOpen ? "open" : "closed"}`}
        open={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setSelectedMark(null);
          setDialogMode("create");
        }}
        onCreate={handleCreateStudentExamMarks}
        onUpdate={handleUpdateStudentExamMarks}
        companyId={companyId}
        academicYears={academicYearOptions}
        classOptions={classOptions}
        sectionOptions={sectionOptions}
        studentRecordOptions={studentRecordOptions}
        examScheduleOptions={examScheduleOptions}
        subjectOptions={subjectOptions}
        existingMarksList={marksList}
        initialData={selectedMark}
        createInitialData={createDialogInitialData}
        mode={dialogMode}
      />

      <StudentAcademicRecordCreateDialog
        key={`promote-${isPromoteDialogOpen ? "open" : "closed"}-${promoteInitialStudentId || "none"}-${promotionSourceRecord?.id || "none"}`}
        open={isPromoteDialogOpen}
        onClose={() => {
          setIsPromoteDialogOpen(false);
          setPromoteDialogInitialData(null);
          setPromoteInitialStudentId("");
          setPromotionSourceRecord(null);
        }}
        onCreate={handleCreatePromotedAcademicRecord}
        companyId={companyId}
        existingRecords={studentRecordOptions}
        studentOptions={studentOptions}
        academicYearOptions={academicYearOptions}
        classOptions={classOptions}
        sectionOptions={sectionOptions}
        mode="create"
        initialStudentId={promoteInitialStudentId}
        createInitialData={promoteDialogInitialData}
        redirectAfterSubmit={false}
      />

      <DialogStudentFeesCollection
        key={`promoted-fees-${isPromotedFeesDialogOpen ? "open" : "closed"}-${promotedCreatedRecord?.id || "new"}`}
        open={isPromotedFeesDialogOpen}
        onClose={() => {
          setIsPromotedFeesDialogOpen(false);
          setPromotedFeesCreateInitialData(null);
          setPromotedCreatedRecord(null);
        }}
        onCreate={handleCreatePromotedFeesCollection}
        onUpdate={null}
        companyId={companyId}
        studentAcademicOptions={studentRecordOptions}
        feeStructureOptions={feeStructureOptions}
        mode="create"
        createInitialData={promotedFeesCreateInitialData}
      />

      <DialogStudentFeesCollection
        key={`promote-due-fees-${isPromotionDueFeesDialogOpen ? "open" : "closed"}-${promotionDueFeesInitialData?.id || "new"}`}
        open={isPromotionDueFeesDialogOpen}
        onClose={() => {
          setIsPromotionDueFeesDialogOpen(false);
          setPromotionDueFeesInitialData(null);
          setPendingPromotionMarkItem(null);
        }}
        onCreate={null}
        onUpdate={null}
        onRepay={handleCreatePromotionDueFeesCollection}
        companyId={companyId}
        studentAcademicOptions={studentRecordOptions}
        feeStructureOptions={feeStructureOptions}
        mode="repay"
        initialData={promotionDueFeesInitialData}
      />

      <AccessDeniedDialog
        open={isPromotionFeeErrorDialogOpen}
        onClose={() => {
          setIsPromotionFeeErrorDialogOpen(false);
          if (promotionDueFeesInitialData) {
            setIsPromotionDueFeesDialogOpen(true);
          } else {
            setPendingPromotionMarkItem(null);
          }
        }}
        title="Student Fees Pending"
        message={promotionFeeErrorMessage}
        confirmLabel="OK"
      />

      {activeMenu && typeof document !== "undefined"
        ? createPortal(
            <div
              data-action-menu="true"
              className="fixed z-[1000] w-36 overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.28)]"
              style={{ top: activeMenu.top, left: activeMenu.left }}
            >
              <button
                type="button"
                onClick={() => handleEditMark(activeMenu.markItem)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Detail View
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMark(activeMenu.markItem)}
                className="block w-full px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
              >
                Delete
              </button>
            </div>,
            document.body,
          )
        : null}

      <DelistConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => {
          if (isDeleting) {
            return;
          }
          setIsDeleteDialogOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        itemLabel={
          deleteTarget
            ? `${deleteTarget.student_name || deleteTarget.student?.name || "this record"}`
            : "this record"
        }
        isSubmitting={isDeleting}
      />

      <AccessDeniedDialog
        open={isAccessDeniedDialogOpen}
        message={accessDeniedMessage || "Teacher cannot edit"}
        onClose={() => {
          setIsAccessDeniedDialogOpen(false);
          setAccessDeniedMessage("");
        }}
      />

      <OverAllExamMarksDetailsDialog
        open={isOverallDetailsDialogOpen}
        onClose={handleCloseOverallDetailsDialog}
        studentRecord={selectedStudentRecordForDetails}
        schoolName={schoolDisplayName}
        studentPhotoUrl={
          studentAttachmentPreviews[
            String(getStudentAttachmentId(selectedStudentRecordForDetails, companyUserById))
          ] || ""
        }
        studentMarks={selectedStudentMarksForDetails}
        subjectColumns={subjectMarkColumns}
        examScheduleById={examScheduleById}
        onEditRow={handleEditOverallMarkRow}
        onReviewRow={handleReviewOverallMarkRow}
        onDelistRow={handleDelistOverallMarkRow}
      />
    </main>
  );
}
