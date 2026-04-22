"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCurrentSchoolInfo } from "@/lib/apiService";

function getDefaultFormData() {
  return {
    classDetailsId: "",
    section: "A",
    numOfStud: "",
  };
}

function buildFormDataFromSection(sectionItem) {
  return {
    classDetailsId: String(
      sectionItem?.class_details_id || sectionItem?.classDetailsId || "",
    ),
    section: String(sectionItem?.section || "A"),
    numOfStud:
      sectionItem?.num_of_stud === null || sectionItem?.num_of_stud === undefined
        ? ""
        : String(sectionItem.num_of_stud),
  };
}

function getInitialFormData(mode, initialData) {
  if (mode === "edit" && initialData) {
    return buildFormDataFromSection(initialData);
  }
  return getDefaultFormData();
}

function normalizeFormDataForCompare(data) {
  return {
    classDetailsId: String(data?.classDetailsId || "").trim(),
    section: String(data?.section || "A").trim() || "A",
    numOfStud: String(data?.numOfStud || "").trim(),
  };
}

function areSectionFormsEqual(left, right) {
  const leftNormalized = normalizeFormDataForCompare(left);
  const rightNormalized = normalizeFormDataForCompare(right);
  return (
    leftNormalized.classDetailsId === rightNormalized.classDetailsId &&
    leftNormalized.section === rightNormalized.section &&
    leftNormalized.numOfStud === rightNormalized.numOfStud
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
    <div ref={containerRef} className={`relative ${className}`}>
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

export default function SectionCreateDialog({
  open,
  onClose,
  onCreate,
  companyId,
  classOptions = [],
  initialData = null,
  mode = "create",
}) {
  const [formData, setFormData] = useState(() => getInitialFormData(mode, initialData));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolLocationName, setSchoolLocationName] = useState("");
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dialogRef = useRef(null);
  const dragStateRef = useRef(null);

  const resetDialog = () => {
    setFormData(getDefaultFormData());
    setIsSubmitting(false);
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
    const { name, value } = event.target;
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
    if (
      mode === "edit" &&
      areSectionFormsEqual(formData, buildFormDataFromSection(initialData))
    ) {
      return;
    }

    const classDetailsId = String(formData.classDetailsId || "").trim();
    const numOfStudValue = String(formData.numOfStud || "").trim();
    const parsedNumOfStud =
      numOfStudValue === "" ? null : Number(numOfStudValue);

    if (
      !classDetailsId ||
      (parsedNumOfStud !== null &&
        (Number.isNaN(parsedNumOfStud) || parsedNumOfStud < 1))
    ) {
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
        classDetailsId,
        section: formData.section,
        numOfStud: parsedNumOfStud,
        companyId: companyId || null,
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
  const hasEditChanges = isEditMode
    ? !areSectionFormsEqual(formData, buildFormDataFromSection(initialData))
    : true;

  const dialogContent = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden p-2 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={handleClose}
        aria-label="Close create section dialog"
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
              {isEditMode ? "Edit Section" : "Create Section"}
            </h2>
            <p className="text-sm text-slate-500">
              {isEditMode
                ? "Update selected section details."
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
                  : "Fill in details to add a new section record.")}
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
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Class Name
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
                  autoFocus
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Section
                <SingleSelectDropdown
                  value={formData.section}
                  onChange={(value) =>
                    handleChange({
                      target: { name: "section", value },
                    })
                  }
                  options={[
                    { id: "A", label: "A" },
                    { id: "B", label: "B" },
                    { id: "C", label: "C" },
                    { id: "D", label: "D" },
                  ]}
                  placeholder="Select Section"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 lg:col-span-2">
                Number of Students
                <input
                  name="numOfStud"
                  type="number"
                  min="1"
                  value={formData.numOfStud}
                  onChange={handleChange}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="e.g. 30"
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
              disabled={isSubmitting || (isEditMode && !hasEditChanges)}
              className="inline-flex h-11 min-w-[132px] items-center justify-center rounded-xl bg-sky-600 px-6 text-[17px] font-semibold leading-none text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:min-w-[120px] sm:px-5 sm:text-sm"
            >
              {isSubmitting
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                  ? "Update Section"
                  : "Create Section"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return dialogContent;
  }

  return createPortal(dialogContent, document.body);
}
