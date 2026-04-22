"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCurrentSchoolInfo } from "@/lib/apiService";

function getDefaultFormData() {
  return {
    examId: "",
    classDetailsId: "",
    sectionDetailsId: "",
    subjectId: "",
    examDate: "",
    startTime: "",
    endTime: "",
    totalMarks: "0",
    passingMarks: "33",
    examRoom: "",
    instructions: "",
  };
}

function normalizeSubjectScheduleEntry(entry) {
  return {
    subjectId: String(
      entry?.subjectId || entry?.subject_id || entry?.subject?.id || "",
    ).trim(),
    subjectName: String(
      entry?.subjectName || entry?.subject_name || entry?.subject?.subject_name || "",
    ).trim(),
    examDate: String(entry?.examDate || entry?.exam_date || "").trim(),
  };
}

function buildSubjectSchedulesFromInitialData(initialData) {
  const subjectSchedules = Array.isArray(initialData?.subjectSchedules)
    ? initialData.subjectSchedules
    : Array.isArray(initialData?.subject_schedules)
      ? initialData.subject_schedules
      : Array.isArray(initialData?.subject_exam_dates)
        ? initialData.subject_exam_dates
        : Array.isArray(initialData?.subject_exam_dates_json)
          ? initialData.subject_exam_dates_json
          : null;

  if (Array.isArray(subjectSchedules) && subjectSchedules.length > 0) {
    return subjectSchedules
      .map((entry) => normalizeSubjectScheduleEntry(entry))
      .filter((entry) => entry.subjectId || entry.examDate);
  }

  const fallbackEntry = normalizeSubjectScheduleEntry(initialData);
  return fallbackEntry.subjectId || fallbackEntry.examDate ? [fallbackEntry] : [];
}

function buildSubjectSchedulesForClass(subjectOptions, previousRows = []) {
  const previousBySubjectId = new Map(
    previousRows.map((entry) => [String(entry.subjectId || ""), entry]),
  );

  return subjectOptions.map((item) => {
    const existingRow = previousBySubjectId.get(String(item.id)) || null;
    return {
      subjectId: String(item.id),
      subjectName: String(item.subject_name || ""),
      examDate: String(existingRow?.examDate || "").trim(),
    };
  });
}

function buildFormDataFromInitialData(initialData) {
  if (!initialData) {
    return getDefaultFormData();
  }

  return {
    examId: String(initialData?.examId || initialData?.exam_id || "").trim(),
    classDetailsId: String(
      initialData?.classDetailsId ||
        initialData?.class_details_id ||
        initialData?.class_details?.id ||
        "",
    ).trim(),
    sectionDetailsId: String(
      initialData?.sectionDetailsId ||
        initialData?.section_details_id ||
        initialData?.section_details?.id ||
        "",
    ).trim(),
    subjectId: String(initialData?.subjectId || initialData?.subject_id || initialData?.subject?.id || "").trim(),
    examDate: String(initialData?.examDate || initialData?.exam_date || "").trim(),
    startTime: String(initialData?.startTime || initialData?.start_time || "").trim(),
    endTime: String(initialData?.endTime || initialData?.end_time || "").trim(),
    totalMarks:
      String(initialData?.totalMarks ?? initialData?.total_marks ?? "100"),
    passingMarks:
      String(initialData?.passingMarks ?? initialData?.passing_marks ?? "33"),
    examRoom: String(initialData?.examRoom || initialData?.exam_room || ""),
    instructions: String(initialData?.instructions || ""),
  };
}

function formatOptionLabel(value) {
  return String(value || "").trim();
}

function getExamTypeTotalMarks(examType) {
  return String(examType?.total_marks ?? examType?.totalMarks ?? "").trim();
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
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex min-h-[42px] w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        <span className="line-clamp-1">{selectedLabel || placeholder}</span>
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
                  return (
                    <button
                      key={optionId}
                      type="button"
                      onClick={() => chooseOption(optionId)}
                      className={`flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-sky-100 ${
                        isActive ? "bg-sky-50 text-sky-700" : "text-slate-700"
                      }`}
                    >
                      <span className="flex-1">{String(option?.label || "")}</span>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-2 text-sm text-slate-500">No options found.</div>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default function ExamScheduleCreateDialog({
  open,
  onClose,
  onCreate,
  companyId,
  examTypeOptions = [],
  classOptions = [],
  sectionOptions = [],
  subjectOptions = [],
  initialData = null,
  mode = "create",
  onUpdate,
}) {
  const isEditMode = mode === "edit";
  const [formData, setFormData] = useState(() =>
    isEditMode ? buildFormDataFromInitialData(initialData) : getDefaultFormData(),
  );
  const [subjectSchedules, setSubjectSchedules] = useState(() =>
    isEditMode ? buildSubjectSchedulesFromInitialData(initialData) : [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolLocationName, setSchoolLocationName] = useState("");
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dialogRef = useRef(null);
  const dragStateRef = useRef(null);

  const selectedExamType = useMemo(() => {
    if (!formData.examId) {
      return null;
    }
    return (
      examTypeOptions.find((item) => String(item.id) === String(formData.examId)) ||
      null
    );
  }, [examTypeOptions, formData.examId]);

  const selectedExamStartDate = String(selectedExamType?.start_date || "").trim();
  const selectedExamEndDate = String(selectedExamType?.end_date || "").trim();
  const selectedExamTotalMarks = getExamTypeTotalMarks(selectedExamType);

  const filteredSectionOptions = useMemo(() => {
    if (!formData.classDetailsId) {
      return sectionOptions;
    }
    return sectionOptions.filter(
      (item) => String(item.class_details_id) === String(formData.classDetailsId),
    );
  }, [formData.classDetailsId, sectionOptions]);

  const filteredSubjectOptions = useMemo(() => {
    if (!formData.classDetailsId) {
      return [];
    }

    const selectedClass = classOptions.find(
      (item) => String(item.id) === String(formData.classDetailsId),
    );
    const classSubjectIds = Array.isArray(selectedClass?.subject)
      ? selectedClass.subject.map((value) => Number(value)).filter(Number.isFinite)
      : [];

    if (classSubjectIds.length === 0) {
      return [];
    }

    return subjectOptions.filter((item) =>
      classSubjectIds.includes(Number(item?.id)),
    );
  }, [classOptions, formData.classDetailsId, subjectOptions]);

  const subjectScheduleRows = useMemo(() => {
    if (isEditMode) {
      return subjectSchedules;
    }

    if (!formData.classDetailsId) {
      return [];
    }

    const selectedClass = classOptions.find(
      (item) => String(item.id) === String(formData.classDetailsId),
    );
    const classSubjectIds = Array.isArray(selectedClass?.subject)
      ? selectedClass.subject.map((value) => Number(value)).filter(Number.isFinite)
      : [];
    if (classSubjectIds.length === 0) {
      return [];
    }

    const draftBySubjectId = new Map(
      subjectSchedules.map((entry) => [String(entry.subjectId || ""), entry]),
    );

    return subjectOptions
      .filter((item) => classSubjectIds.includes(Number(item?.id)))
      .map((item) => {
        const existingRow = draftBySubjectId.get(String(item.id)) || null;
        return {
          subjectId: String(item.id),
          subjectName: String(item.subject_name || ""),
          examDate: String(existingRow?.examDate || "").trim(),
        };
      });
  }, [
    classOptions,
    formData.classDetailsId,
    isEditMode,
    subjectOptions,
    subjectSchedules,
  ]);

  const resetDialog = useCallback(() => {
    setFormData(getDefaultFormData());
    setSubjectSchedules([]);
    setIsSubmitting(false);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    dragStateRef.current = null;
  }, []);

  const handleSubjectScheduleDateChange = useCallback((subjectId, value) => {
    setSubjectSchedules((prev) =>
      prev.map((entry) =>
        String(entry.subjectId) === String(subjectId)
          ? { ...entry, examDate: value }
          : entry,
      ),
    );
  }, []);

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

    if (!isEditMode || !formData.classDetailsId) {
      return;
    }

    const selectedClass = classOptions.find(
      (item) => String(item.id) === String(formData.classDetailsId),
    );
    const classSubjectIds = Array.isArray(selectedClass?.subject)
      ? selectedClass.subject.map((value) => Number(value)).filter(Number.isFinite)
      : [];
    if (classSubjectIds.length === 0) {
      return;
    }

    const nextSubjectOptions = subjectOptions.filter((item) =>
      classSubjectIds.includes(Number(item?.id)),
    );
    if (nextSubjectOptions.length === 0) {
      return;
    }

    setSubjectSchedules((prev) => {
      const sourceRows =
        prev.length > 0 ? prev : buildSubjectSchedulesFromInitialData(initialData);
      const nextRows = buildSubjectSchedulesForClass(nextSubjectOptions, sourceRows);
      const sameLength = nextRows.length === sourceRows.length;
      const sameContent =
        sameLength &&
        nextRows.every(
          (row, index) =>
            String(row.subjectId || "") === String(sourceRows[index]?.subjectId || "") &&
            String(row.subjectName || "") === String(sourceRows[index]?.subjectName || "") &&
            String(row.examDate || "") === String(sourceRows[index]?.examDate || ""),
        );
      return sameContent ? prev : nextRows;
    });
  }, [
    classOptions,
    formData.classDetailsId,
    initialData,
    isEditMode,
    open,
    subjectOptions,
  ]);

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

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "classDetailsId") {
      setFormData((prev) => ({
        ...prev,
        classDetailsId: value,
        sectionDetailsId: "",
        subjectId: "",
        examDate: "",
      }));
      const selectedClass = classOptions.find(
        (item) => String(item.id) === String(value),
      );
      const classSubjectIds = Array.isArray(selectedClass?.subject)
        ? selectedClass.subject.map((subjectId) => Number(subjectId)).filter(Number.isFinite)
        : [];
      const nextSubjectOptions = classSubjectIds.length
        ? subjectOptions.filter((item) => classSubjectIds.includes(Number(item?.id)))
        : [];
      setSubjectSchedules((prev) =>
        buildSubjectSchedulesForClass(nextSubjectOptions, prev),
      );
      return;
    }
    if (name === "examId") {
      const selectedExam =
        examTypeOptions.find((item) => String(item.id) === String(value)) || null;
      const nextTotalMarks = getExamTypeTotalMarks(selectedExam);
      setFormData((prev) => ({
        ...prev,
        examId: value,
        totalMarks: nextTotalMarks || prev.totalMarks,
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const examId = String(formData.examId || "").trim();
    const classDetailsId = String(formData.classDetailsId || "").trim();
    const sectionDetailsId = String(formData.sectionDetailsId || "").trim();
    const startTime = String(formData.startTime || "").trim();
    const endTime = String(formData.endTime || "").trim();
    const totalMarks = String(selectedExamTotalMarks || formData.totalMarks || "").trim();
    const passingMarks = String(formData.passingMarks || "").trim();

    const selectedSubjectSchedules = subjectScheduleRows
      .map((entry) => normalizeSubjectScheduleEntry(entry))
      .filter((entry) => entry.subjectId && entry.examDate);

    if (
      !examId ||
      !classDetailsId ||
      selectedSubjectSchedules.length === 0
    ) {
      return;
    }
    if (
      selectedSubjectSchedules.some(
        (entry) =>
          (selectedExamStartDate && entry.examDate < selectedExamStartDate) ||
          (selectedExamEndDate && entry.examDate > selectedExamEndDate),
      )
    ) {
      return;
    }
    if (startTime && endTime && endTime <= startTime) {
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
        id: initialData?.id || null,
        examId,
        classDetailsId,
        sectionDetailsId: sectionDetailsId || undefined,
        subjectId: selectedSubjectSchedules[0]?.subjectId || undefined,
        examDate: selectedSubjectSchedules[0]?.examDate || undefined,
        subjectSchedules: selectedSubjectSchedules,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        totalMarks: totalMarks || undefined,
        passingMarks: passingMarks || undefined,
        examRoom: formData.examRoom,
        instructions: formData.instructions,
        companyId: companyId || null,
        created_by: loggedInUsername || null,
        updated_by: loggedInUsername || null,
        accessToken,
      };
      if (isEditMode && typeof onUpdate === "function") {
        await onUpdate(payload);
      } else if (typeof onCreate === "function") {
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

  const dialogContent = (
    <div className="fixed inset-0 z-[2300] flex items-center justify-center overflow-hidden p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={handleClose}
        aria-label="Close exam schedule dialog"
      />

      <div
        ref={dialogRef}
        style={{
          transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
        }}
        className={`relative z-10 flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] will-change-transform max-h-[calc(100svh-0.5rem)] sm:max-h-[calc(100dvh-3rem)] ${
          isDragging ? "cursor-grabbing" : ""
        }`}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="pr-4">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              {isEditMode ? "Update Exam Schedule" : "Create Exam Schedule"}
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
              <label className="space-y-2 sm:col-span-2">
                <span className="block text-sm font-medium text-slate-700">Exam Name</span>
                <SingleSelectDropdown
                  value={formData.examId}
                  onChange={(value) =>
                    handleChange({
                      target: { name: "examId", value },
                    })
                  }
                  options={examTypeOptions.map((item) => ({
                    id: String(item.id),
                    label: formatOptionLabel(item.exam_name),
                  }))}
                  placeholder="Select exam type"
                  autoFocus={!isEditMode}
                />
              </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">Class</span>
              <SingleSelectDropdown
                value={formData.classDetailsId}
                onChange={(value) =>
                  handleChange({
                    target: { name: "classDetailsId", value },
                  })
                }
                options={classOptions.map((item) => ({
                  id: String(item.id),
                  label: formatOptionLabel(item.class_name),
                }))}
                placeholder="Select class"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">
                Section <span className="text-slate-400">(optional)</span>
              </span>
              <SingleSelectDropdown
                value={formData.sectionDetailsId}
                onChange={(value) =>
                  handleChange({
                    target: { name: "sectionDetailsId", value },
                  })
                }
                disabled={!formData.classDetailsId}
                placeholder={formData.classDetailsId ? "Select section" : "Select class first"}
                options={filteredSectionOptions.map((item) => ({
                  id: String(item.id),
                  label: formatOptionLabel(item.section),
                }))}
              />
              {formData.classDetailsId && filteredSectionOptions.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No sections are mapped to the selected class.
                </p>
              ) : null}
            </label>

            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="block text-sm font-medium text-slate-700">
                    Subject Schedule Rows
                  </span>
                  <p className="mt-1 text-xs text-slate-500">
                    Add an exam date for each subject mapped to the selected class.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Total Marks
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {selectedExamTotalMarks || formData.totalMarks || "-"}
                  </div>
                </div>
              </div>

              {!formData.classDetailsId ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Select a class to load its subjects.
                </div>
              ) : subjectScheduleRows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  No subjects are mapped to the selected class.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="max-h-72 overflow-auto">
                    <table className="w-full border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50">
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-2 font-semibold">#</th>
                          <th className="px-3 py-2 font-semibold">Subject Name</th>
                          <th className="px-3 py-2 font-semibold">Exam Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectScheduleRows.map((entry, index) => {
                          return (
                            <tr key={entry.subjectId} className="border-b border-slate-100">
                              <td className="px-3 py-3 text-sm font-medium text-slate-800">
                                {index + 1}
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-700">
                                {formatOptionLabel(entry.subjectName || "-")}
                              </td>
                              <td className="px-3 py-3">
                                <input
                                  type="date"
                                  value={entry.examDate}
                                  onChange={(event) =>
                                    handleSubjectScheduleDateChange(
                                      entry.subjectId,
                                      event.target.value,
                                    )
                                  }
                                  min={selectedExamStartDate || undefined}
                                  max={selectedExamEndDate || undefined}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedExamStartDate || selectedExamEndDate ? (
                <p className="text-xs text-slate-500">
                  {selectedExamStartDate ? `Start: ${selectedExamStartDate}` : ""}
                  {selectedExamStartDate && selectedExamEndDate ? " • " : ""}
                  {selectedExamEndDate ? `End: ${selectedExamEndDate}` : ""}
                </p>
              ) : null}
            </div>

            {/* <label className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">Start Time</span>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">End Time</span>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                min={formData.startTime || undefined}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label> */}

            {/* <label className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">Total Marks</span>
              <input
                type="number"
                name="totalMarks"
                value={formData.totalMarks}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">Passing Marks</span>
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

            <label className="space-y-2 ">
              <span className="block text-sm font-medium text-slate-700">Exam Room  <span className="text-slate-400">(optional)</span></span>
              <input
                type="text"
                name="examRoom"
                value={formData.examRoom}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="block text-sm font-medium text-slate-700">Instructions</span>
              <textarea
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
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
              disabled={isSubmitting}
              className="inline-flex h-11 min-w-[132px] items-center justify-center rounded-xl bg-sky-600 px-6 text-[17px] font-semibold leading-none text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:min-w-[120px] sm:px-5 sm:text-sm"
            >
              {isSubmitting
                ? isEditMode
                  ? "Updating..."
                  : "Saving..."
                : isEditMode
                  ? "Update Exam Schedule"
                  : "Save Exam Schedule"}
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
