"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCurrentSchoolInfo } from "@/lib/apiService";

function getDefaultFormData() {
  return {
    subjectName: "",
    subjectInitial: "",
  };
}

function getInitialFormData(mode, initialData) {
  if (mode === "edit" && initialData) {
    return {
      subjectName: String(initialData?.subject_name || initialData?.subjectName || ""),
      subjectInitial: String(initialData?.subject_initial || initialData?.subjectInitial || ""),
    };
  }

  return getDefaultFormData();
}

export default function SubjectCreateDialog({
  open,
  onClose,
  onCreate,
  onUpdate,
  companyId,
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
  const isEditMode = mode === "edit";

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
    setFormData(getInitialFormData(mode, initialData));

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
  }, [open, mode, initialData]);

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
        subjectName: formData.subjectName.trim(),
        subjectInitial: formData.subjectInitial.trim(),
        companyId: companyId || null,
        created_by: loggedInUsername || null,
        updated_by: loggedInUsername || null,
        accessToken,
      };

      if (isEditMode && typeof onUpdate === "function") {
        await onUpdate(payload);
      } else {
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
    <div className="fixed inset-0 z-[2300] flex items-center justify-center overflow-hidden p-2 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={handleClose}
        aria-label="Close subject dialog"
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
              {isEditMode ? "Edit Subject" : "Create Subject"}
            </h2>
            <p className="text-sm text-slate-500">
              {isEditMode
                ? "Update selected subject details."
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
                : "Fill in details to add a new subject record.")}
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
                Subject Name
                <input
                  name="subjectName"
                  value={formData.subjectName}
                  onChange={handleChange}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="e.g. Mathematics"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Subject Initial
                <input
                  name="subjectInitial"
                  value={formData.subjectInitial}
                  onChange={handleChange}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="e.g. MATH"
                  required
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
                ? (isEditMode ? "Updating..." : "Creating...")
                : (isEditMode ? "Update Subject" : "Create Subject")}
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
