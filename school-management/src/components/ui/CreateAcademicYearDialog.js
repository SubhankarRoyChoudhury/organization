"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCurrentSchoolInfo } from "@/lib/apiService";

function getDefaultFormData() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const academicYearStart = now.getMonth() >= 3 ? currentYear : currentYear - 1;
  return {
    yearName: `${academicYearStart}-${academicYearStart + 1}`,
    startDate: "",
    endDate: "",
    isActive: false,
  };
}

function buildFormDataFromAcademicYear(academicYear) {
  return {
    yearName: String(academicYear?.year_name || academicYear?.yearName || "").trim(),
    startDate: String(academicYear?.start_date || academicYear?.startDate || "").trim(),
    endDate: String(academicYear?.end_date || academicYear?.endDate || "").trim(),
    isActive: Boolean(academicYear?.is_active ?? academicYear?.isActive ?? false),
  };
}

function normalizeYearName(value) {
  return String(value || "").trim().toLowerCase();
}

function getInitialFormData(mode, initialData) {
  if (mode === "edit" && initialData) {
    return buildFormDataFromAcademicYear(initialData);
  }
  return getDefaultFormData();
}

function formatAcademicYearSuggestion(academicYear) {
  return String(academicYear?.year_name || academicYear?.yearName || "").trim();
}

function getAcademicYearSuggestions(academicYears) {
  const suggestions = new Set();

  for (const academicYear of Array.isArray(academicYears) ? academicYears : []) {
    const suggestion = formatAcademicYearSuggestion(academicYear);
    if (suggestion) {
      suggestions.add(suggestion);
    }
  }

  return Array.from(suggestions);
}

function AcademicYearNameDropdown({
  value,
  onChange,
  academicYears,
  placeholder = "Enter academic year manually",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  const suggestions = getAcademicYearSuggestions(academicYears);
  const filteredSuggestions = suggestions;

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

  return (
    <div ref={containerRef} className="relative">
      <div className="flex min-h-11 items-stretch overflow-hidden rounded-lg border border-slate-300 bg-white transition focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
        <input
          ref={inputRef}
          type="text"
          name="yearName"
          value={value}
          onChange={(event) => {
            onChange(event);
            if (!disabled) {
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
            }
          }}
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && !disabled) {
              event.preventDefault();
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="academic-year-suggestions-list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        />
        <button
          type="button"
          onClick={() => {
            if (!disabled) {
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }
          }}
          className="flex w-11 shrink-0 items-center justify-center border-l border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          disabled={disabled}
          aria-label="Toggle academic year suggestions"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
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
              id="academic-year-suggestions-list"
              className="fixed z-[2400] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.22)]"
              style={{
                left: menuStyle.left,
                top: menuStyle.top,
                width: menuStyle.width,
                maxHeight: menuStyle.maxHeight,
              }}
              role="listbox"
            >
              <div className="max-h-full overflow-y-auto p-1">
                {filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map((suggestion, index) => {
                    const normalizedSuggestion = String(suggestion || "");
                    const isSelected = String(value || "").trim() === normalizedSuggestion;
                    const query = String(value || "").trim().toLowerCase();
                    const matchIndex = query
                      ? normalizedSuggestion.toLowerCase().indexOf(query)
                      : -1;
                    const beforeMatch =
                      matchIndex >= 0 ? normalizedSuggestion.slice(0, matchIndex) : "";
                    const matchText =
                      matchIndex >= 0
                        ? normalizedSuggestion.slice(matchIndex, matchIndex + query.length)
                        : normalizedSuggestion;
                    const afterMatch =
                      matchIndex >= 0
                        ? normalizedSuggestion.slice(matchIndex + query.length)
                        : "";

                    return (
                      <button
                        key={`${normalizedSuggestion}-${index}`}
                        type="button"
                        onClick={() => {
                          onChange({
                            target: { name: "yearName", value: normalizedSuggestion },
                          });
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
                        <span className="flex-1 truncate">
                          {beforeMatch}
                          <span className="font-semibold text-slate-900">{matchText}</span>
                          {afterMatch}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-3 text-sm text-slate-500">
                    No matching academic years found
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

function areAcademicYearFormsEqual(left, right) {
  return (
    String(left?.yearName || "").trim() === String(right?.yearName || "").trim() &&
    String(left?.startDate || "").trim() === String(right?.startDate || "").trim() &&
    String(left?.endDate || "").trim() === String(right?.endDate || "").trim() &&
    Boolean(left?.isActive) === Boolean(right?.isActive)
  );
}

export default function CreateAcademicYearDialog({
  open,
  onClose,
  onCreate,
  companyId,
  initialData = null,
  mode = "create",
  academicYears = [],
}) {
  const [formData, setFormData] = useState(() => getInitialFormData(mode, initialData));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolLocationName, setSchoolLocationName] = useState("");
  const [submitErrorMessage, setSubmitErrorMessage] = useState("");
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dialogRef = useRef(null);
  const dragStateRef = useRef(null);

  const resetDialog = () => {
    setFormData(getDefaultFormData());
    setIsSubmitting(false);
    setSubmitErrorMessage("");
    setCompanyName("");
    setSchoolCode("");
    setSchoolLocationName("");
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
    const { name, value, type, checked } = event.target;
    if (name === "yearName") {
      setSubmitErrorMessage("");
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const currentAcademicYearId = String(initialData?.id || "").trim();
  const normalizedYearName = normalizeYearName(formData.yearName);
  const isDuplicateYearName = useMemo(() => {
    if (!normalizedYearName) {
      return false;
    }

    return (Array.isArray(academicYears) ? academicYears : []).some((item) => {
      const itemId = String(item?.id || "").trim();
      if (mode === "edit" && currentAcademicYearId && itemId === currentAcademicYearId) {
        return false;
      }
      return normalizeYearName(item?.year_name || item?.yearName || "") === normalizedYearName;
    });
  }, [academicYears, currentAcademicYearId, mode, normalizedYearName]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    if (
      mode === "edit" &&
      areAcademicYearFormsEqual(formData, buildFormDataFromAcademicYear(initialData))
    ) {
      return;
    }

    const yearName = String(formData.yearName || "").trim();
    const startDate = String(formData.startDate || "").trim();
    const endDate = String(formData.endDate || "").trim();
    if (!yearName) {
      return;
    }
    if (mode === "create" && isDuplicateYearName) {
      setSubmitErrorMessage("Academic Year already exists.");
      return;
    }
    if (mode === "edit" && isDuplicateYearName) {
      setSubmitErrorMessage("Academic Year already exists.");
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      return;
    }

    const accessToken =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token") || ""
        : "";

    setIsSubmitting(true);
    try {
      await onCreate({
        id: initialData?.id || null,
        yearName,
        startDate: startDate || null,
        endDate: endDate || null,
        isActive: Boolean(formData.isActive),
        companyId: companyId || null,
        accessToken,
      });
      resetDialog();
      onClose();
    } catch (error) {
      const message = String(error?.message || error || "").trim();
      if (message) {
        setSubmitErrorMessage(message);
      } else {
        setSubmitErrorMessage("Unable to save academic year.");
      }
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
  const hasEditChanges = isEditMode
    ? !areAcademicYearFormsEqual(formData, buildFormDataFromAcademicYear(initialData))
    : true;
  const dialogContent = (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center overflow-hidden p-2 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={handleClose}
        aria-label="Close create academic year dialog"
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
              {isEditMode ? "Edit Academic Year" : "Create Academic Year"}
            </h2>
            <p className="text-sm text-slate-500">
              {isEditMode
                ? "Update selected academic year details."
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
                  : "Fill in details to add a new academic year record.")}
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
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 lg:col-span-2">
                Academic Year Name
                <AcademicYearNameDropdown
                  value={formData.yearName}
                  onChange={handleChange}
                  academicYears={academicYears}
                  placeholder="Enter academic year manually, e.g. 2025-2026"
                />
                {isDuplicateYearName ? (
                  <p className="text-xs font-medium text-rose-600">
                    Academic Year already exists.
                  </p>
                ) : null}
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Start Date
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                End Date
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  min={formData.startDate || undefined}
                  onChange={handleChange}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                Set as active academic year
              </label>
            </div>
          </div>

          {submitErrorMessage ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {submitErrorMessage}
            </div>
          ) : null}

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
                ? (isEditMode ? "Updating..." : "Creating...")
                : (isEditMode ? "Update Academic Year" : "Create")}
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
