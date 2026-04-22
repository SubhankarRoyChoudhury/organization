"use client";

import { useEffect } from "react";

export default function DelistConfirmDialog({
  open,
  onClose,
  onConfirm,
  itemLabel = "this item",
  isSubmitting = false,
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open, onClose, isSubmitting]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={isSubmitting ? undefined : onClose}
        aria-label="Close delist confirmation"
      />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
        <h3 className="text-lg font-semibold text-slate-900">Confirm Delist</h3>
        <p className="mt-2 text-sm text-slate-600">
          Are you sure you want to delist <span className="font-medium text-slate-800">{itemLabel}</span>?
        </p>

        <div className="mt-5 flex flex-row flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-11 min-w-[96px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-[17px] font-semibold leading-none text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:min-w-[92px] sm:px-4 sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex h-11 min-w-[132px] items-center justify-center rounded-xl bg-red-600 px-6 text-[17px] font-semibold leading-none text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:min-w-[120px] sm:px-5 sm:text-sm"
          >
            {isSubmitting ? "Delisting..." : "Delist"}
          </button>
        </div>
      </div>
    </div>
  );
}
