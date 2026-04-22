"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCurrentSchoolInfo, getSubjectList } from "@/lib/apiService";

function getDefaultFormData() {
  return {
    className: "",
    subject: [],
  };
}

function buildFormDataFromClass(classItem) {
  return {
    className: String(classItem?.class_name || classItem?.className || ""),
    subject: Array.isArray(classItem?.subject)
      ? classItem.subject.map((value) => Number(value)).filter(Number.isFinite)
      : [],
  };
}

function getInitialFormData(mode, initialData) {
  if (mode === "edit" && initialData) {
    return buildFormDataFromClass(initialData);
  }
  return getDefaultFormData();
}

function normalizeSubjectIds(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => Number(value))
        .filter(Number.isFinite),
    ),
  ).sort((left, right) => left - right);
}

function subjectSelectionsMatch(left, right) {
  const leftValues = normalizeSubjectIds(left);
  const rightValues = normalizeSubjectIds(right);
  return (
    leftValues.length === rightValues.length &&
    leftValues.every((value, index) => value === rightValues[index])
  );
}

function MultiSelectDropdown({
  label,
  name,
  options,
  selectedValues,
  onChange,
  placeholder = "Select options",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

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
      left: Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - menuWidth - viewportPadding)),
      top: openAbove ? Math.max(viewportPadding, rect.top - maxHeight - 6) : rect.bottom + 6,
      width: menuWidth,
      maxHeight,
      placement: openAbove ? "top" : "bottom",
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

  const optionIds = options
    .map((option) => Number(option?.id))
    .filter(Number.isFinite);
  const normalizedSelectedValues = normalizeSubjectIds(selectedValues);
  const allSelected =
    optionIds.length > 0 &&
    optionIds.length === normalizedSelectedValues.length &&
    optionIds.every((value) => normalizedSelectedValues.includes(value));
  const selectedLabels = allSelected
    ? ["All"]
    : options
      .filter((option) => normalizedSelectedValues.includes(Number(option?.id)))
      .map((option) => String(option?.subject_name || ""));

  const toggleSelection = (optionId) => {
    const nextValues = new Set(normalizedSelectedValues);
    if (nextValues.has(optionId)) {
      nextValues.delete(optionId);
    } else {
      nextValues.add(optionId);
    }
    onChange(name, Array.from(nextValues));
  };

  const selectAll = () => {
    onChange(name, optionIds);
  };

  const clearAll = () => {
    onChange(name, []);
  };

  return (
    <div className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
      <span className="text-slate-500 font-semibold">{label}</span>
      <div className="relative" ref={containerRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex min-h-[42px] w-full items-start justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        >
          <span className="flex min-h-[20px] flex-1 flex-wrap gap-1">
            {selectedLabels.length > 0 ? (
              selectedLabels.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700"
                >
                  {item}
                </span>
              ))
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
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
      </div>
      {isOpen && menuStyle && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[2400] overflow-y-auto rounded-lg border border-slate-300 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.28)]"
              style={{
                left: menuStyle.left,
                top: menuStyle.top,
                width: menuStyle.width,
                maxHeight: menuStyle.maxHeight,
              }}
            >
              <button
                type="button"
                onClick={allSelected ? clearAll : selectAll}
                className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm transition hover:bg-sky-50 ${
                  allSelected ? "bg-sky-50 text-sky-700" : "text-slate-700"
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    allSelected
                      ? "border-sky-600 bg-sky-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {allSelected ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      aria-hidden="true"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : null}
                </span>
                <span className="flex-1 font-semibold">All</span>
              </button>
              {options.length > 0 ? (
                options.map((option) => {
                  const optionId = Number(option?.id);
                  const isChecked = normalizedSelectedValues.includes(optionId);
                  return (
                    <button
                      type="button"
                      key={optionId}
                      onClick={() => toggleSelection(optionId)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-sky-50 ${
                        isChecked ? "bg-sky-50 text-sky-700" : "text-slate-700"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          isChecked
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isChecked ? (
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        ) : null}
                      </span>
                      <span className="flex-1">
                        {String(option?.subject_name || `Subject ${optionId}`)}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-2 text-sm text-slate-500">
                  No subjects found.
                </div>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default function ClassesCreateDialog({
  open,
  onClose,
  onCreate,
  companyId,
  initialData = null,
  mode = "create",
}) {
  const [formData, setFormData] = useState(() => getInitialFormData(mode, initialData));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolLocationName, setSchoolLocationName] = useState("");
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dialogRef = useRef(null);
  const dragStateRef = useRef(null);

  const resetDialog = () => {
    setFormData(getDefaultFormData());
    setIsSubmitting(false);
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

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    setFormData(getInitialFormData(mode, initialData));
    return undefined;
  }, [open, mode, initialData]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let mounted = true;
    getSubjectList()
      .then((data) => {
        if (!mounted) {
          return;
        }
        setSubjectOptions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (mounted) {
          setSubjectOptions([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [open]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMultiSelectChange = (name, values) => {
    setFormData((prev) => ({
      ...prev,
      [name]: Array.isArray(values)
        ? values.map((value) => Number(value)).filter(Number.isFinite)
        : [],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    const editBaselineClassName = String(
      initialData?.class_name || initialData?.className || "",
    ).trim();
    const editBaselineSubject = Array.isArray(initialData?.subject)
      ? initialData.subject
      : [];
    const hasEditChanges =
      mode !== "edit" ||
      formData.className.trim() !== editBaselineClassName ||
      !subjectSelectionsMatch(formData.subject, editBaselineSubject);
    if (!hasEditChanges) {
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
      await onCreate({
        id: initialData?.id || null,
        className: formData.className.trim(),
        subject: normalizeSubjectIds(formData.subject),
        companyId: companyId || null,
        created_by: loggedInUsername || null,
        updated_by: loggedInUsername || null,
        accessToken,
      });
      resetDialog();
      onClose();
    } catch (error) {
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

  const isEditMode = mode === "edit";
  const editBaselineClassName = String(
    initialData?.class_name || initialData?.className || "",
  ).trim();
  const editBaselineSubject = Array.isArray(initialData?.subject)
    ? initialData.subject
    : [];
  const hasEditChanges = isEditMode
    ? formData.className.trim() !== editBaselineClassName ||
      !subjectSelectionsMatch(formData.subject, editBaselineSubject)
    : true;

  const dialogContent = (
    <div className="fixed inset-0 z-[2300] flex items-center justify-center overflow-hidden p-2 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={handleClose}
        aria-label="Close class dialog"
      />

      <div
        ref={dialogRef}
        style={{
          transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
        }}
        className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] will-change-transform max-h-[calc(100svh-0.5rem)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              {isEditMode ? "Edit Class" : "Create Class"}
            </h2>
            <p className="text-sm text-slate-500">
              {isEditMode
                ? "Update selected class details."
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
                  : "Fill in details to add a new class record.")}
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

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-5"
        >
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-3 sm:gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Class Name
                <input
                  name="className"
                  value={formData.className}
                  onChange={handleChange}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="e.g. Grade 5"
                  required
                />
              </label>

              <MultiSelectDropdown
                label="Subject"
                name="subject"
                options={subjectOptions}
                selectedValues={formData.subject}
                onChange={handleMultiSelectChange}
                placeholder="Select subjects"
              />
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
              disabled={isSubmitting || (isEditMode && !hasEditChanges)}
              className="inline-flex h-11 min-w-[132px] items-center justify-center rounded-xl bg-sky-600 px-6 text-[17px] font-semibold leading-none text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:min-w-[120px] sm:px-5 sm:text-sm"
            >
              {isSubmitting
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                  ? "Update Class"
                  : "Create Class"}
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
