"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

function formatMarksValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

function parseMarksNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatRoundedPercentage(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `${Math.round(value)}%`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function extractSubjectMarksEntries(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    if (
      Object.prototype.hasOwnProperty.call(value, "subject") ||
      Object.prototype.hasOwnProperty.call(value, "subject_name") ||
      Object.prototype.hasOwnProperty.call(value, "marks_obtained") ||
      Object.prototype.hasOwnProperty.call(value, "marksObtained")
    ) {
      return [value];
    }

    return Object.entries(value)
      .filter(([key]) => !["entries", "subjects", "items", "marks"].includes(key))
      .map(([subjectName, payload]) => ({
        subject_name: subjectName,
        marks_obtained:
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? payload.marks_obtained ?? payload.marksObtained ?? payload.marks ?? ""
            : payload,
        total_marks:
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? payload.total_marks ?? payload.totalMarks ?? ""
            : "",
      }))
      .filter((entry) => String(entry?.subject_name || "").trim());
  }

  return [];
}

function getSubjectName(entry) {
  return String(entry?.subject_name || entry?.subject || "").trim();
}

function getScheduleLabel(item, examScheduleById) {
  const examSchedule = examScheduleById?.get(String(item?.exam_schedule_id || "").trim());
  return (
    item?.exam_schedule_name ||
    item?.exam_name ||
    examSchedule?.exam_name ||
    examSchedule?.exam?.exam_name ||
    "-"
  );
}

function getScheduleTotalMarks(item, examScheduleById) {
  const examSchedule = examScheduleById?.get(String(item?.exam_schedule_id || "").trim());
  return parseMarksNumber(
    examSchedule?.total_marks ??
      examSchedule?.totalMarks ??
      item?.total_marks ??
      item?.totalMarks ??
      item?.max_marks ??
      item?.maxMarks,
  );
}

function buildScheduleRows(studentMarks, examScheduleById) {
  const groups = new Map();

  for (const item of Array.isArray(studentMarks) ? studentMarks : []) {
    const examScheduleId = String(item?.exam_schedule_id || item?.examScheduleId || "").trim();
    const groupKey = examScheduleId || String(item?.id || "").trim();
    if (!groupKey) {
      continue;
    }

    const subjectEntries = extractSubjectMarksEntries(item?.subject_marks);
    const entries =
      subjectEntries.length > 0
        ? subjectEntries
        : [
            {
              subject_name: item?.subject_name || item?.subject?.subject_name || "",
              marks_obtained: item?.marks_obtained ?? item?.marksObtained ?? item?.marks ?? "",
              total_marks: item?.total_marks ?? item?.totalMarks ?? item?.max_marks ?? item?.maxMarks,
            },
          ];

    const existingGroup = groups.get(groupKey);
    const group =
      existingGroup || {
        id: groupKey,
        exam_schedule_id: examScheduleId,
        exam_schedule_name: getScheduleLabel(item, examScheduleById),
        schedule_total_marks: getScheduleTotalMarks(item, examScheduleById),
        subjectTotals: new Map(),
        latestRecord: item,
        sourceRecords: [],
      };

    if (!existingGroup) {
      groups.set(groupKey, group);
    }

    group.latestRecord = item;
    group.sourceRecords.push(item);

    const resolvedScheduleTotal = getScheduleTotalMarks(item, examScheduleById);
    if (resolvedScheduleTotal !== null) {
      group.schedule_total_marks = resolvedScheduleTotal;
    }

    entries.forEach((entry) => {
      const subjectName = getSubjectName(entry);
      if (!subjectName) {
        return;
      }

      const marksObtained = parseMarksNumber(
        entry?.marks_obtained ?? entry?.marksObtained ?? entry?.marks,
      );
      const totalMarks =
        group.schedule_total_marks ??
        parseMarksNumber(entry?.total_marks ?? entry?.totalMarks) ??
        null;

      const currentValue = group.subjectTotals.get(subjectName) || {
        marksObtained: 0,
        totalMarks: totalMarks ?? 0,
      };

      if (marksObtained !== null) {
        currentValue.marksObtained += marksObtained;
      }
      if (totalMarks !== null) {
        currentValue.totalMarks = totalMarks;
      }

      group.subjectTotals.set(subjectName, currentValue);
    });
  }

  return Array.from(groups.values()).sort((left, right) => {
    const leftId = Number(left?.exam_schedule_id || left?.id || 0);
    const rightId = Number(right?.exam_schedule_id || right?.id || 0);
    if (Number.isFinite(leftId) && Number.isFinite(rightId) && leftId !== rightId) {
      return leftId - rightId;
    }
    return String(left?.exam_schedule_name || "").localeCompare(
      String(right?.exam_schedule_name || ""),
      undefined,
      { numeric: true, sensitivity: "base" },
    );
  });
}

function formatStudentValue(value) {
  const label = String(value || "").trim();
  return label || "-";
}

function formatStudentSummary(studentRecord) {
  const studentName =
    studentRecord?.student_name || studentRecord?.student?.name || "-";
  const rollNo = formatStudentValue(studentRecord?.roll_number || studentRecord?.rollNo);
  const className = formatStudentValue(
    studentRecord?.class_name || studentRecord?.class_details?.class_name,
  );
  const sectionName = formatStudentValue(
    studentRecord?.section_name || studentRecord?.section_details?.section,
  );
  const academicYear = formatStudentValue(studentRecord?.academic_year_name || studentRecord?.academicYearName);

  return {
    studentName,
    rollNo,
    className,
    sectionName,
    academicYear,
  };
}

function getStudentInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "-";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getSubjectPillClass(marksObtained, totalMarks, isAnnual = false) {
  if (marksObtained === null || marksObtained === undefined || totalMarks === null || totalMarks === undefined || totalMarks === 0) {
    return "bg-slate-100 text-slate-500";
  }

  const score = (marksObtained / totalMarks) * 100;
  if (isAnnual && score < 25) {
    return "bg-rose-600 text-white";
  }
  if (score >= 80) {
    return "bg-emerald-500 text-white";
  }
  if (score >= 70) {
    return "bg-lime-500 text-white";
  }
  if (score >= 60) {
    return "bg-amber-500 text-white";
  }
  if (score >= 50) {
    return "bg-orange-400 text-white";
  }
  if (score >= 40) {
    return "bg-amber-500 text-white";
  }
  return "bg-slate-100 text-slate-500";
}

function calculateGradeFromScore(score) {
  if (!Number.isFinite(score)) {
    return "-";
  }
  if (score < 25) return "D";
  if (score <= 40) return "C";
  if (score <= 60) return "B";
  if (score <= 75) return "B+";
  if (score <= 85) return "A";
  if (score <= 90) return "A+";
  return "AA";
}

function isAnnualSchedule(scheduleName) {
  return String(scheduleName || "").toLowerCase().includes("annual");
}

function getRowPercentage(row, subjectColumns = []) {
  const subjectTotals = row?.subjectTotals;
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

function buildPerformanceStats(groupedRows) {
  const subjectEntries = [];

  groupedRows.forEach((row) => {
    row.subjectTotals.forEach((value, subjectName) => {
      subjectEntries.push({
        subjectName,
        marksObtained: value?.marksObtained ?? 0,
        totalMarks: value?.totalMarks ?? 0,
      });
    });
  });

  const testsCompleted = groupedRows.length;
  const totalSubjectMarks = subjectEntries.reduce((sum, entry) => sum + (entry.marksObtained || 0), 0);
  const averageScore = subjectEntries.length > 0 ? totalSubjectMarks / subjectEntries.length : 0;
  const totalMarksAcrossSubjects = subjectEntries.reduce((sum, entry) => sum + (entry.totalMarks || 0), 0);

  const topSubject = subjectEntries.reduce(
    (best, entry) => {
      const percentage =
        entry.totalMarks > 0 ? (entry.marksObtained / entry.totalMarks) * 100 : 0;
      if (!best || percentage > best.percentage) {
        return {
          ...entry,
          percentage,
        };
      }
      return best;
    },
    null,
  );

  return {
    averageScoreLabel:
      subjectEntries.length > 0
        ? `${averageScore.toFixed(1)} / ${Math.max(1, Math.round(totalMarksAcrossSubjects / subjectEntries.length))}`
        : "-",
    testsCompletedLabel: `${testsCompleted} / ${Math.max(1, testsCompleted) || 1}`,
    highestSubjectLabel:
      topSubject && topSubject.totalMarks > 0
        ? `${formatMarksValue(topSubject.marksObtained)} / ${formatMarksValue(topSubject.totalMarks)}`
        : "-",
    topSubjectName: topSubject?.subjectName || "-",
  };
}

function buildInitialDataForRow(row) {
  if (!row || typeof row !== "object") {
    return row;
  }

  const baseRecord = row.latestRecord || row.sourceRecords?.[0] || row;
  const scheduleId = String(
    baseRecord?.exam_schedule_id || baseRecord?.examScheduleId || row.exam_schedule_id || "",
  ).trim();
  const totalMarksFallback =
    baseRecord?.total_marks ??
    baseRecord?.totalMarks ??
    baseRecord?.max_marks ??
    baseRecord?.maxMarks ??
    row.schedule_total_marks;

  const sourceRecords = Array.isArray(row.sourceRecords) ? row.sourceRecords : [];
  const subjectMarksFromRecords = sourceRecords.length
    ? sourceRecords
        .map((record) => {
          const subjectName = String(
            record?.subject_name || record?.subject?.subject_name || record?.subject || "",
          ).trim();
          if (!subjectName) {
            return null;
          }

          return {
            subject_name: subjectName,
            subject_id: record?.subject_id || record?.subject?.id || "",
            exam_schedule_id:
              record?.exam_schedule_id || record?.examScheduleId || scheduleId || "",
            marks_obtained:
              record?.marks_obtained ?? record?.marksObtained ?? record?.marks ?? "",
            grade: record?.grade || record?.subject_marks?.grade || "",
            total_marks:
              record?.total_marks ??
              record?.totalMarks ??
              record?.max_marks ??
              record?.maxMarks ??
              totalMarksFallback ??
              "",
          };
        })
        .filter(Boolean)
    : [];

  const subjectMarksFromTotals = row.subjectTotals
    ? Array.from(row.subjectTotals.entries()).map(([subjectName, totals]) => ({
        subject_name: subjectName,
        subject_id: "",
        exam_schedule_id: scheduleId || "",
        marks_obtained: totals?.marksObtained ?? "",
        grade: "",
        total_marks: totals?.totalMarks ?? totalMarksFallback ?? "",
      }))
    : [];

  const baseSubjectMarks =
    baseRecord?.subject_marks || baseRecord?.subjectMarks || baseRecord?.subject_marks_json;
  const subjectMarks =
    baseSubjectMarks ||
    (subjectMarksFromRecords.length > 0
      ? subjectMarksFromRecords
      : subjectMarksFromTotals.length > 0
        ? subjectMarksFromTotals
        : baseSubjectMarks);

  return {
    ...baseRecord,
    exam_schedule_id: scheduleId || baseRecord?.exam_schedule_id || baseRecord?.examScheduleId,
    subject_marks: subjectMarks,
  };
}

export default function OverAllExamMarksDetailsDialog({
  open,
  onClose,
  readOnly = false,
  studentRecord = null,
  schoolName = "",
  studentPhotoUrl = "",
  studentMarks = [],
  subjectColumns = [],
  examScheduleById = new Map(),
  onEditRow,
  onReviewRow,
  onDelistRow,
}) {
  const [activeMenu, setActiveMenu] = useState(null);
  const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const dialogRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const groupedRows = useMemo(
    () => buildScheduleRows(studentMarks, examScheduleById),
    [studentMarks, examScheduleById],
  );

  const overallSubjectTotals = useMemo(() => {
    const totalsMap = new Map();

    groupedRows.forEach((row) => {
      row.subjectTotals.forEach((subjectValue, subjectName) => {
        const current = totalsMap.get(subjectName) || {
          marksObtained: 0,
          totalMarks: 0,
        };
        current.marksObtained += Number(subjectValue?.marksObtained || 0);
        current.totalMarks += Number(subjectValue?.totalMarks || 0);
        totalsMap.set(subjectName, current);
      });
    });

    return totalsMap;
  }, [groupedRows]);

  const overallRowPercentage = useMemo(() => {
    const subjectsToEvaluate =
      Array.isArray(subjectColumns) && subjectColumns.length > 0
        ? subjectColumns
        : Array.from(overallSubjectTotals.keys());
    let obtainedSum = 0;
    let totalSum = 0;

    subjectsToEvaluate.forEach((subjectName) => {
      const entry = overallSubjectTotals.get(subjectName);
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
  }, [overallSubjectTotals, subjectColumns]);

  const annualSubjectTotals = useMemo(() => {
    const totalsMap = new Map();

    groupedRows
      .filter((row) => isAnnualSchedule(row?.exam_schedule_name))
      .forEach((row) => {
        row.subjectTotals.forEach((subjectValue, subjectName) => {
          const current = totalsMap.get(subjectName) || {
            marksObtained: 0,
            totalMarks: 0,
          };
          current.marksObtained += Number(subjectValue?.marksObtained || 0);
          current.totalMarks += Number(subjectValue?.totalMarks || 0);
          totalsMap.set(subjectName, current);
        });
      });

    return totalsMap;
  }, [groupedRows]);

  useEffect(() => {
    if (!open) {
      setActiveMenu(null);
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    const handleOutsideClick = (event) => {
      if (!(event.target instanceof Element)) {
        setActiveMenu(null);
        return;
      }

      if (
        event.target.closest("[data-overall-menu-trigger='true']") ||
        event.target.closest("[data-overall-menu='true']")
      ) {
        return;
      }

      setActiveMenu(null);
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const syncViewportMode = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    syncViewportMode();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewportMode);
      return () => mediaQuery.removeEventListener("change", syncViewportMode);
    }

    mediaQuery.addListener(syncViewportMode);
    return () => mediaQuery.removeListener(syncViewportMode);
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const syncDialogPosition = () => {
      const dialogElement = dialogRef.current;
      if (!dialogElement) {
        return;
      }

      const rect = dialogElement.getBoundingClientRect();
      const centeredX = Math.max(12, Math.round((window.innerWidth - rect.width) / 2));
      const centeredY = Math.max(12, Math.round((window.innerHeight - rect.height) / 2));
      setDialogPosition({ x: centeredX, y: centeredY });
    };

    const rafId = window.requestAnimationFrame(syncDialogPosition);

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(rafId);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [dialogRef, open, isMobileViewport]);

  useEffect(() => {
    if (!open || !isDragging || isMobileViewport) {
      return undefined;
    }

    const handlePointerMove = (event) => {
      const dialogElement = dialogRef.current;
      if (!dialogElement) {
        return;
      }

      const rect = dialogElement.getBoundingClientRect();
      const maxX = Math.max(12, window.innerWidth - rect.width - 12);
      const maxY = Math.max(12, window.innerHeight - rect.height - 12);
      const nextX = Math.min(maxX, Math.max(12, event.clientX - dragOffsetRef.current.x));
      const nextY = Math.min(maxY, Math.max(12, event.clientY - dragOffsetRef.current.y));
      setDialogPosition({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dialogRef, dragOffsetRef, isDragging, open, isMobileViewport]);

  const openRowMenu = (event, row) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 144;
    const menuHeight = 88;
    const gap = 6;
    const viewportPadding = 8;

    const left = Math.min(
      Math.max(viewportPadding, rect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );

    const canOpenBelow =
      window.innerHeight - rect.bottom >= menuHeight + gap + viewportPadding;
    const top = canOpenBelow
      ? rect.bottom + gap
      : Math.max(viewportPadding, rect.top - menuHeight - gap);

    setActiveMenu((prev) => (prev?.id === row.id ? null : { id: row.id, top, left, row }));
  };

  const studentSummary = formatStudentSummary(studentRecord);
  const performanceStats = buildPerformanceStats(groupedRows);

  const handlePrintResult = () => {
    const resolvedSchoolName = String(
      schoolName || studentRecord?.school_name || "School Management",
    ).trim();
    const subjectHeaderHtml = subjectColumns
      .map((subjectName) => `<th>${escapeHtml(subjectName)}</th>`)
      .join("");

    const getPrintPillClass = (score, isAnnual) => {
      if (!Number.isFinite(score)) return "pill-empty";
      if (isAnnual && score < 25) return "pill-red";
      if (score >= 80) return "pill-teal";
      if (score >= 70) return "pill-green";
      if (score >= 60) return "pill-amber";
      if (score >= 50) return "pill-orange";
      if (score >= 40) return "pill-amber";
      return "pill-empty";
    };

    const rowHtml = groupedRows
      .map((row) => {
        const annualRow = isAnnualSchedule(row.exam_schedule_name);
        const subjectCells = subjectColumns
          .map((subjectName) => {
            const entry = row.subjectTotals.get(subjectName);
            if (!entry) {
              return "<td>-</td>";
            }
            const marksValue = parseMarksNumber(entry.marksObtained);
            const totalValue = parseMarksNumber(entry.totalMarks);
            const score =
              Number.isFinite(marksValue) && Number.isFinite(totalValue) && totalValue > 0
                ? (marksValue / totalValue) * 100
                : null;
            return `<td><span class="pill ${getPrintPillClass(score, annualRow)}">${escapeHtml(
              `${formatMarksValue(entry.marksObtained)} / ${formatMarksValue(entry.totalMarks)}`,
            )}</span></td>`;
          })
          .join("");

        const percentage = getRowPercentage(row, subjectColumns);
        const avgLabel = Number.isFinite(percentage)
          ? annualRow
            ? `${formatRoundedPercentage(percentage)} / ${calculateGradeFromScore(percentage)}`
            : formatRoundedPercentage(percentage)
          : "-";

        return `
          <tr>
            <td class="schedule">${escapeHtml(row.exam_schedule_name || "-")}</td>
            ${subjectCells}
            <td class="avg">${escapeHtml(avgLabel)}</td>
            <td class="act"><span class="act-dot">•</span></td>
          </tr>
        `;
      })
      .join("");

    const totalSubjectCells = subjectColumns
      .map((subjectName) => {
        const totalEntry = overallSubjectTotals.get(subjectName) || null;
        const annualEntry = annualSubjectTotals.get(subjectName) || null;
        const totalMarks = Number(totalEntry?.totalMarks || 0);
        const marksObtained = Number(totalEntry?.marksObtained || 0);
        const hasValue = totalEntry && totalMarks > 0;
        const percentage = hasValue ? (marksObtained / totalMarks) * 100 : null;
        const annualTotalMarks = Number(annualEntry?.totalMarks || 0);
        const annualMarksObtained = Number(annualEntry?.marksObtained || 0);
        const annualPercentage =
          annualEntry && annualTotalMarks > 0
            ? (annualMarksObtained / annualTotalMarks) * 100
            : null;
        const grade = calculateGradeFromScore(annualPercentage);
        return `<td>${
          hasValue
            ? `${escapeHtml(
                `${formatMarksValue(marksObtained)} / ${formatMarksValue(totalMarks)}`,
              )}<br><span class="sub">${escapeHtml(
                `${formatRoundedPercentage(percentage)} / ${grade}`,
              )}</span>`
            : "-"
        }</td>`;
      })
      .join("");

    const overallLabel = Number.isFinite(overallRowPercentage)
      ? `${formatRoundedPercentage(overallRowPercentage)} / ${calculateGradeFromScore(overallRowPercentage)}`
      : "-";

    const subjectsToEvaluate =
      Array.isArray(subjectColumns) && subjectColumns.length > 0
        ? subjectColumns
        : Array.from(overallSubjectTotals.keys());
    const overallObtained = subjectsToEvaluate.reduce((sum, subjectName) => {
      const entry = overallSubjectTotals.get(subjectName);
      return sum + Number(entry?.marksObtained || 0);
    }, 0);
    const overallTotal = subjectsToEvaluate.reduce((sum, subjectName) => {
      const entry = overallSubjectTotals.get(subjectName);
      return sum + Number(entry?.totalMarks || 0);
    }, 0);

    const receiptHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>OverallExamResult</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #1e293b; background: #f8fbff; }
            .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 6mm 4mm; background: #f8fbff; }
            .card {
              position: relative;
              border: 2px solid #61bee9;
              border-radius: 16px;
              padding: 10px;
              background:
                linear-gradient(180deg, #e5f4ff 0%, #f9fdff 18%, #ffffff 40%, #f8fcff 100%);
            }
            .card::before {
              content: "";
              position: absolute;
              inset: 5px;
              border: 1px dashed #c8d7ef;
              border-radius: 12px;
              pointer-events: none;
            }
            .brand-wrap {
              border: 1px solid #d2ddee;
              border-radius: 12px;
              padding: 8px 8px 7px;
              background: linear-gradient(180deg, #f4f9ff 0%, #ffffff 100%);
              text-align: center;
            }
            .brand-logo {
              width: 38px;
              height: 38px;
              margin: -29px auto 4px;
              border-radius: 999px;
              border: 2px solid #b7dff6;
              display: flex;
              align-items: center;
              justify-content: center;
              background: radial-gradient(circle at 30% 30%, #fff 0%, #ecf8ff 68%, #d6eeff 100%);
              color: #117bc4;
              font-weight: 800;
              font-size: 12px;
            }
            .brand-title { margin: 0; font-size: 13px; color: #243b63; font-weight: 800; }
            .brand-sub { margin: 2px 0 0; font-size: 10px; color: #6b7280; font-weight: 600; }
            .title {
              text-align: center; margin: 10px 0 8px; font-size: 24px;
              color: #1f3556; font-weight: 800; font-family: Georgia, "Times New Roman", serif;
            }
            .student-card {
              border: 1px solid #d8e3f3;
              border-radius: 10px;
              background: #ffffff;
              display: grid;
              grid-template-columns: 78px repeat(3, minmax(0, 1fr));
              gap: 0;
              overflow: hidden;
            }
            .student-photo {
              padding: 8px;
              grid-row: 1 / span 2;
              border-right: 1px solid #e8edf6;
              display:flex;
              align-items:center;
              justify-content:center;
              background:#ecf7ff;
            }
            .student-photo img { width: 58px; height: 72px; object-fit: cover; border-radius: 6px; border: 1px solid #b9d8ee; }
            .student-photo-fallback {
              width: 58px;
              height: 72px;
              border: 1px solid #b9c8da;
              border-radius: 6px;
              background: #dbe4ef;
              position: relative;
              overflow: hidden;
            }
            .student-photo-fallback::before {
              content: "";
              position: absolute;
              top: 9px;
              left: 50%;
              width: 23px;
              height: 23px;
              transform: translateX(-50%);
              border-radius: 999px;
              background: #5e6774;
            }
            .student-photo-fallback::after {
              content: "";
              position: absolute;
              bottom: 8px;
              left: 50%;
              width: 43px;
              height: 24px;
              transform: translateX(-50%);
              border-radius: 22px 22px 10px 10px;
              background: #5e6774;
            }
            .meta { display: contents; }
            .meta-item { border-bottom: 1px solid #e8edf6; border-right: 1px solid #e8edf6; padding: 6px 8px; background: #fff; min-height: 36px; }
            .meta-item:nth-child(3n) { border-right: none; }
            .meta-item:nth-child(n+4) { border-bottom: none; }
            .meta-label { font-size: 8px; color: #313f52; text-transform: uppercase; font-weight: 700; }
            .meta-value { margin-top: 1px; font-size: 12px; font-weight: 800; color: #17253d; line-height: 1.2; }
            .stats { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; margin: 9px 0; }
            .stat { border: 1px solid #dbe5f3; border-radius: 8px; background: #fdfefe; padding: 7px; display:flex; align-items:center; gap:7px; }
            .ic { width: 18px; height: 18px; border-radius: 999px; background:#d9ecff; color:#1e5daa; font-size: 9px; font-weight:700; display:flex; align-items:center; justify-content:center; }
            .stat .k { font-size: 9px; color: #1a1f25; font-weight: 700; }
            .stat .v { margin-top: 1px; font-size: 13px; font-weight: 800; color: #162743; }
            table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              background: #fff;
              border: 1px solid #d5e2f2;
              border-radius: 10px;
              overflow: hidden;
            }
            th, td { border-bottom: 1px solid #e5edf8; padding: 8px 5px; text-align: center; font-size: 10px; }
            th {
              background: #eef5ff;
              color: #556d8c;
              text-transform: uppercase;
              font-weight: 700;
              font-size: 9px;
              letter-spacing: 0.02em;
            }
            td.schedule {
              font-weight: 700;
              text-align: left;
              padding-left: 9px;
              white-space: nowrap;
              color: #203659;
              font-size: 12px;
            }
            td.avg {
              font-weight: 700;
              white-space: nowrap;
              color: #1f3659;
              font-size: 13px;
            }
            td.act { width: 24px; }
            .act-dot {
              width: 15px; height: 15px; display: inline-flex; align-items: center; justify-content: center;
              border-radius: 999px; background: #e6effa; color: #577399; font-size: 10px; line-height: 1;
            }
            tr.total-row td { background: #f7fbff; font-weight: 700; }
            .sub {
              display: block;
              margin-top: 4px;
              color: #5a718f;
              font-size: 11px;
              font-weight: 700;
            }
            .pill {
              display: inline-flex; min-width: 52px; justify-content: center; align-items: center;
              border-radius: 999px;
              padding: 3px 9px;
              color: #fff;
              font-weight: 700;
              font-size: 10px;
              line-height: 1.25;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .pill-teal { background: #10b981; }
            .pill-green { background: #84cc16; }
            .pill-orange { background: #fb923c; }
            .pill-amber { background: #f59e0b; }
            .pill-red { background: #e11d48; }
            .pill-empty { background: #e2e8f0; color: #64748b; }
            .footer {
              margin-top: 10px;
              border-top: 1px solid #d8e6f6;
              padding-top: 9px;
              display: grid;
              grid-template-columns: 1fr auto;
              gap: 12px;
              align-items: start;
            }
            .overall {
              font-size: 16px;
              font-weight: 700;
              color: #2a6293;
              line-height: 1.2;
              font-family: Georgia, "Times New Roman", serif;
            }
            .overall small {
              font-size: 14px;
              color: #1f2d45;
              font-family: "Segoe UI", Arial, sans-serif;
              font-weight: 800;
            }
            .qr-wrap {
              width: 92px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 2px;
            }
            .qr {
              width: 84px;
              height: 84px;
              border: 1px solid #c6d4e6;
              border-radius: 4px;
              background:
                linear-gradient(90deg, #0f172a 8px, transparent 8px) 0 0/16px 16px,
                linear-gradient(#0f172a 8px, transparent 8px) 0 0/16px 16px,
                linear-gradient(90deg, transparent 8px, #0f172a 8px) 0 0/16px 16px,
                linear-gradient(transparent 8px, #0f172a 8px) 0 0/16px 16px;
              opacity: .35;
            }
            .qr-caption {
              text-align: center;
              font-size: 7px;
              color: #667892;
              line-height: 1.1;
              letter-spacing: 0.01em;
              width: 100%;
            }
            .signs { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; margin-top: 8px; }
            .sign {
              border-top: 1px solid #c7d5e7;
              padding-top: 5px;
              text-align: left;
              font-size: 18px;
              color: #6b7f98;
              font-family: "Brush Script MT", "Segoe Script", cursive;
              line-height: 1;
            }
            .sign small {
              display: block;
              margin-top: 2px;
              font-size: 13px;
              color: #243b5a;
              font-family: "Segoe UI", Arial, sans-serif;
              font-weight: 600;
            }
            @page { size: A4; margin: 7mm; }
            @media print {
              body { background: #fff; }
              * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="card">
              <div class="brand-wrap">
                <div class="brand-logo">SM</div>
                <h1 class="brand-title">${escapeHtml(resolvedSchoolName)}</h1>
                <p class="brand-sub">Privately in Certified Students!</p>
              </div>

              <div class="title">OverAll Exam Result</div>

              <div class="student-card">
                <div class="student-photo">${
                  studentPhotoUrl
                    ? `<img src="${escapeHtml(studentPhotoUrl)}" alt="Student photo" />`
                    : `<div class="student-photo-fallback" aria-hidden="true"></div>`
                }</div>
                <div class="meta">
                  <div class="meta-item"><div class="meta-label">Student Name</div><div class="meta-value">${escapeHtml(studentSummary.studentName)}</div></div>
                  <div class="meta-item"><div class="meta-label">Roll No</div><div class="meta-value">${escapeHtml(studentSummary.rollNo)}</div></div>
                  <div class="meta-item"><div class="meta-label">Academic Year</div><div class="meta-value">${escapeHtml(studentSummary.academicYear)}</div></div>
                  <div class="meta-item"><div class="meta-label">Class</div><div class="meta-value">${escapeHtml(studentSummary.className)}</div></div>
                  <div class="meta-item"><div class="meta-label">Section</div><div class="meta-value">${escapeHtml(studentSummary.sectionName)}</div></div>
                  
                </div>
              </div>

              <div class="stats">
                <div class="stat"><span class="ic">i</span><div><div class="k">Average Score</div><div class="v">${escapeHtml(performanceStats.averageScoreLabel)}</div></div></div>
                <div class="stat"><span class="ic">✓</span><div><div class="k">Tests Completed</div><div class="v">${escapeHtml(performanceStats.testsCompletedLabel)}</div></div></div>
                <div class="stat"><span class="ic">🏆</span><div><div class="k">Highest Subject</div><div class="v">${escapeHtml(performanceStats.highestSubjectLabel)}</div></div></div>
                <div class="stat"><span class="ic">★</span><div><div class="k">Highest</div><div class="v">${escapeHtml(performanceStats.topSubjectName)}</div></div></div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Exam Schedule</th>
                    ${subjectHeaderHtml}
                    <th>Avg Percentage</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${rowHtml}
                  <tr class="total-row">
                    <td class="schedule">Total</td>
                    ${totalSubjectCells}
                    <td class="avg">${escapeHtml(overallLabel)}</td>
                    <td class="act">-</td>
                  </tr>
                </tbody>
              </table>

              <div class="footer">
                <div class="overall">Overall Percentage: <small>${escapeHtml(
                  ` ${overallLabel}`,
                )}</small></div>
                <div class="qr-wrap">
                  <div class="qr" aria-hidden="true"></div>
                  <div class="qr-caption">ANNUAL EXAM RESULT<br/>MAKE WISE</div>
                </div>
              </div>
              <div class="signs">
                <div class="sign">Signal By<small>Class Teacher</small></div>
                <div class="sign">Signal By<small>Principal</small></div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printFrame = document.createElement("iframe");
    const originalDocumentTitle = document.title;
    document.title = "OverallExamResult";
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
      return;
    }

    frameDocument.open();
    frameDocument.write(receiptHtml);
    frameDocument.close();

    window.setTimeout(() => {
      const frameWindow = printFrame.contentWindow;
      if (!frameWindow) {
        cleanup();
        return;
      }
      frameWindow.focus();
      frameWindow.onafterprint = cleanup;
      frameWindow.print();
    }, 250);
  };

  const handleDialogPointerDown = (event) => {
    if (isMobileViewport) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

      const dialogElement = dialogRef.current;
    if (!dialogElement) {
      return;
    }

    const rect = dialogElement.getBoundingClientRect();
    dragOffsetRef.current.x = event.clientX - rect.left;
    dragOffsetRef.current.y = event.clientY - rect.top;
    setIsDragging(true);
    event.preventDefault();
  };

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[1200] overflow-hidden">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Close overall exam marks details"
      />

      <div
        ref={dialogRef}
        className={`fixed z-10 flex w-full flex-col overflow-hidden border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] ${
          isMobileViewport
            ? "inset-x-2 bottom-2 top-2 rounded-2xl"
            : "max-h-[92vh] max-w-[92vw] rounded-[22px] sm:max-w-[90vw] lg:max-w-[1200px]"
        } ${
          isDragging ? "cursor-grabbing" : ""
        }`}
        style={
          isMobileViewport
            ? undefined
            : {
                left: `${dialogPosition.x}px`,
                top: `${dialogPosition.y}px`,
              }
        }
      >
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 text-slate-900 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 pr-4">
              <h3 className="text-xl font-semibold tracking-tight sm:text-[28px]">
                Exam Performance
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintResult}
                title="Print result"
                aria-label="Print result"
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
                title="Drag"
                onPointerDown={handleDialogPointerDown}
                aria-label="Drag dialog"
                className="hidden h-8 w-8 touch-none cursor-grab items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 active:cursor-grabbing sm:inline-flex"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
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
                onClick={onClose}
                title="Close"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="Close details dialog"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-sky-50 text-sm font-semibold text-slate-700">
                  {studentPhotoUrl ? (
                    <img
                      src={studentPhotoUrl}
                      alt={`${studentSummary.studentName} profile`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{getStudentInitials(studentSummary.studentName)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {studentSummary.studentName}
                  </div>
                  {/* <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span>
                      Roll No. <span className="font-semibold text-slate-900">{studentSummary.rollNo}</span>
                    </span>
                    <span>
                      Class <span className="font-semibold text-slate-900">{studentSummary.className}</span>
                    </span>
                  </div> */}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Roll No.
              </div>
              <div className="mt-1 text-[22px] font-semibold leading-none text-slate-900">
                {studentSummary.rollNo}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Class
              </div>
              <div className="mt-1 text-[22px] font-semibold leading-none text-slate-900">
                {studentSummary.className}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Section
              </div>
              <div className="mt-1 text-[22px] font-semibold leading-none text-slate-900">
                {studentSummary.sectionName}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Academic Year
              </div>
              <div className="mt-1 text-[22px] font-semibold leading-none text-slate-900">
                {studentSummary.academicYear}
              </div>
            </div>
          </div>

          {/* <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Academic Year
            </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {studentSummary.academicYear}
              </div>
            </div>
          </div> */}

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 sm:px-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 14.5h-2v-6h2Zm0-7.8h-2v-2h2Z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-700">Average Score</div>
                  <div className="mt-0.5 text-[15px] font-semibold text-slate-900">
                    {performanceStats.averageScoreLabel}
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm-1 14.2-3.6-3.6 1.4-1.4 2.2 2.2 4.8-4.8 1.4 1.4Z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-700">Tests Completed</div>
                  <div className="mt-0.5 text-[15px] font-semibold text-slate-900">
                    {performanceStats.testsCompletedLabel}
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                    <path d="M6 2h12v4a6 6 0 0 1-4.5 5.8V14H15v2H9v-2h1.5V11.8A6 6 0 0 1 6 6V2Zm2 2v2a4 4 0 0 0 8 0V4H8Z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-700">Highest Subject</div>
                  <div className="mt-0.5 text-[15px] font-semibold text-slate-900">
                    {performanceStats.highestSubjectLabel}
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                    <path d="M12 2 9.5 7.6 4 8.1l4.2 3.6-1.3 5.5L12 14.3l5.1 2.9-1.3-5.5 4.2-3.6-5.5-.5Z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-700">Highest Subject</div>
                  <div className="mt-0.5 text-[15px] font-semibold text-slate-900">
                    {performanceStats.topSubjectName}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-auto">
              <table className="w-full min-w-[760px] border-collapse text-left sm:min-w-[900px] lg:min-w-[960px]">
                <thead>
                  <tr className="border-b border-slate-200 text-center text-xs uppercase tracking-wide text-slate-500">
                    <th className="sticky top-0 z-10 bg-slate-50 px-3 py-3 font-semibold">
                      Exam Schedule
                    </th>
                    {subjectColumns.map((subjectName) => (
                      <th key={subjectName} className="sticky top-0 z-10 bg-slate-50 px-3 py-3 font-semibold">
                        {subjectName}
                      </th>
                    ))}
                    <th className="sticky top-0 z-10 bg-slate-50 px-3 py-3 font-semibold">
                      Avg Percentage
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-3 py-3 font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRows.length === 0 ? (
                    <tr className="border-b border-slate-100 text-sm text-slate-700">
                      <td className="px-3 py-4" colSpan={subjectColumns.length + 3}>
                        No exam schedule details found.
                      </td>
                    </tr>
                  ) : null}

                  {groupedRows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 text-center text-sm text-slate-700">
                      <td className="px-3 py-4 font-semibold text-slate-900">
                        {row.exam_schedule_name || "-"}
                      </td>
                      {subjectColumns.map((subjectName) => {
                        const subjectEntry = row.subjectTotals.get(subjectName);
                        const marksObtained = subjectEntry ? subjectEntry.marksObtained : "-";
                        const totalMarks = subjectEntry ? subjectEntry.totalMarks : "-";
                        const pillClass = getSubjectPillClass(
                          subjectEntry ? subjectEntry.marksObtained : null,
                          subjectEntry ? subjectEntry.totalMarks : null,
                          isAnnualSchedule(row.exam_schedule_name),
                        );
                        return (
                          <td key={`${row.id}-${subjectName}`} className="px-3 py-4 align-top">
                            <div className="flex justify-center">
                              {marksObtained === "-" ? (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-500">
                                  Not available
                                </span>
                              ) : (
                                <span
                                  className={`inline-flex min-w-[72px] items-center justify-center rounded-full px-3 py-1 text-sm font-semibold shadow-sm ${pillClass}`}
                                >
                                  {formatMarksValue(marksObtained)} / {formatMarksValue(totalMarks)}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-3 py-4 align-center">
                        <span className="inline-flex min-w-[96px] justify-center text-center text-[14px] font-semibold tabular-nums text-slate-800">
                          {(() => {
                            const percentage = getRowPercentage(row, subjectColumns);
                            if (!Number.isFinite(percentage)) {
                              return "-";
                            }
                            if (isAnnualSchedule(row.exam_schedule_name)) {
                              return `${formatRoundedPercentage(percentage)} / ${calculateGradeFromScore(percentage)}`;
                            }
                            return formatRoundedPercentage(percentage);
                          })()}
                        </span>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <button
                          type="button"
                          data-overall-menu-trigger="true"
                          onClick={(event) => {
                            if (!readOnly) {
                              openRowMenu(event, row);
                            }
                          }}
                          disabled={readOnly}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition ${
                            readOnly
                              ? "cursor-not-allowed opacity-40"
                              : "hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                          }`}
                          aria-label="Schedule row actions"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                            <path d="M19.14 12.94a7.43 7.43 0 0 0 .05-.94 7.43 7.43 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.22-1.12.52-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.43 7.43 0 0 0-.05.94c0 .32.02.63.05.94L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.41 1.05.75 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.19 1.12-.53 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {groupedRows.length > 0 ? (
                    <tr className="border-t border-slate-200 bg-slate-50/70 text-center text-sm text-slate-700">
                      <td className="px-3 py-4 font-semibold text-slate-900">
                        Total
                      </td>
                      {subjectColumns.map((subjectName) => {
                        const totalEntry = overallSubjectTotals.get(subjectName) || null;
                        const annualEntry = annualSubjectTotals.get(subjectName) || null;
                        const totalMarks = Number(totalEntry?.totalMarks || 0);
                        const marksObtained = Number(totalEntry?.marksObtained || 0);
                        const hasValue = totalEntry && totalMarks > 0;
                        const percentage = hasValue ? (marksObtained / totalMarks) * 100 : null;
                        const annualTotalMarks = Number(annualEntry?.totalMarks || 0);
                        const annualMarksObtained = Number(annualEntry?.marksObtained || 0);
                        const annualPercentage =
                          annualEntry && annualTotalMarks > 0
                            ? (annualMarksObtained / annualTotalMarks) * 100
                            : null;
                        const grade = calculateGradeFromScore(annualPercentage);

                        return (
                          <td key={`overall-total-${subjectName}`} className="px-3 py-4 align-top">
                            <div className="flex flex-col items-center gap-1.5">
                              {hasValue ? (
                                <span
                                  className={`inline-flex min-w-[86px] items-center justify-center rounded-full px-3 py-1 text-sm font-semibold`}
                                >
                                  {formatMarksValue(marksObtained)} / {formatMarksValue(totalMarks)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-500">
                                  Not available
                                </span>
                              )}
                              
                              <span className="text-xs text-slate-600">
                                  {hasValue ? (
                                    <>
                                      <span className="text-[14px] font-medium text-slate-700">{`${formatRoundedPercentage(percentage)} / `}</span>
                                      <span className="text-[14px] font-semibold text-slate-800">{grade}</span>
                                    </>
                                  ) : (
                                    "- / -"
                                  )}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-3 py-4 align-center text-slate-900">
                        <div className="flex min-w-[170px] flex-col items-center gap-1 text-center">
                          <span className="text-[14px] font-semibold">Overall Percentage :</span>
                          <span className="inline-flex min-w-[96px] justify-center align-center tabular-nums text-[16px]  mt-2">
                            {Number.isFinite(overallRowPercentage) ? (
                              `${formatRoundedPercentage(overallRowPercentage)} / ${calculateGradeFromScore(overallRowPercentage)}`
                            ) : (
                              "-"
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-4 font-semibold text-slate-400">-</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {activeMenu && !readOnly && typeof document !== "undefined"
        ? createPortal(
            <div
              data-overall-menu="true"
              className="fixed z-[2000] w-36 overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.28)]"
              style={{ top: activeMenu.top, left: activeMenu.left }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveMenu(null);
                  const target =
                    activeMenu.row.latestRecord ||
                    activeMenu.row.sourceRecords?.[0] ||
                    activeMenu.row;
                  onReviewRow?.(target);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Review
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMenu(null);
                  onEditRow?.(activeMenu.row.latestRecord || activeMenu.row.sourceRecords?.[0] || activeMenu.row);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMenu(null);
                  onDelistRow?.(activeMenu.row.latestRecord || activeMenu.row.sourceRecords?.[0] || activeMenu.row);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
              >
                Delist
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>,
    document.body,
  );
}
