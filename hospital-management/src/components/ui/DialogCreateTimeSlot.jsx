"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Clock3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DialogCreateTimeSlot({
  isOpen,
  isSaving,
  formData,
  formError,
  mode = "create",
  onClose,
  onSubmit,
  onChange,
}) {
  const isEditMode = mode === "edit";
  const [openPicker, setOpenPicker] = useState(null);
  const [draftSelection, setDraftSelection] = useState({
    hour: "07",
    minute: "00",
    period: "AM",
  });
  const draftSelectionRef = useRef({
    hour: "07",
    minute: "00",
    period: "AM",
  });
  const pickerRef = useRef(null);
  const hourInputRef = useRef(null);
  const minuteInputRef = useRef(null);
  const amButtonRef = useRef(null);
  const pmButtonRef = useRef(null);
  const okButtonRef = useRef(null);
  const submitButtonRef = useRef(null);
  const startTimeButtonRef = useRef(null);
  const endTimeButtonRef = useRef(null);

  const to12HourParts = (time24) => {
    const value = String(time24 || "");
    if (!value.includes(":")) return null;
    const [hourRaw = "", minuteRaw = ""] = value.split(":");
    const hour24 = Number(hourRaw);
    const minute = Number(minuteRaw);
    if (!Number.isInteger(hour24) || !Number.isInteger(minute)) return null;
    const period = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return {
      hour: String(hour12).padStart(2, "0"),
      minute: String(minute).padStart(2, "0"),
      period,
    };
  };

  const setDraftSelectionSafe = (updater) => {
    const base = draftSelectionRef.current;
    const next = typeof updater === "function" ? updater(base) : updater;
    draftSelectionRef.current = next;
    setDraftSelection(next);
  };

  const to24Hour = ({ hour, minute, period }) => {
    const hourNum = Number(hour);
    const minuteNum = Number(minute);
    if (!Number.isInteger(hourNum) || !Number.isInteger(minuteNum)) return "";
    let hour24 = hourNum % 12;
    if (period === "PM") hour24 += 12;
    return `${String(hour24).padStart(2, "0")}:${String(minuteNum).padStart(2, "0")}`;
  };

  const formatDisplayTime = (time24) => {
    const parts = to12HourParts(time24);
    if (!parts) return "";
    return `${parts.hour}:${parts.minute} ${parts.period}`;
  };

  const formatDraftDisplayTime = ({ hour, minute, period }) => {
    const safeHour = clampAndPad(hour, 1, 12, "07");
    const safeMinute = clampAndPad(minute, 0, 59, "00");
    const safePeriod = period === "PM" ? "PM" : "AM";
    return `${safeHour}:${safeMinute} ${safePeriod}`;
  };

  const openTimePicker = (fieldName) => {
    const parts = to12HourParts(formData?.[fieldName]) || {
      hour: "07",
      minute: "00",
      period: "AM",
    };
    setDraftSelectionSafe(parts);
    setOpenPicker(fieldName);
  };

  const updateDraftByStep = (key, step, min, max) => {
    setDraftSelectionSafe((prev) => {
      const current = Number(prev[key]);
      const next = Number.isInteger(current) ? current + step : min;
      const range = max - min + 1;
      const normalized = ((next - min) % range + range) % range + min;
      return { ...prev, [key]: String(normalized).padStart(2, "0") };
    });
  };

  const clampAndPad = (value, min, max, fallback) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) return fallback;
    return String(Math.min(max, Math.max(min, parsed))).padStart(2, "0");
  };

  const handleDraftInputChange = (key, rawValue) => {
    const onlyDigits = String(rawValue || "")
      .replace(/\D/g, "")
      .slice(0, 2);
    setDraftSelectionSafe((prev) => ({ ...prev, [key]: onlyDigits }));
  };

  const handleDraftInputBlur = (key) => {
    setDraftSelectionSafe((prev) => {
      if (key === "hour") {
        return { ...prev, hour: clampAndPad(prev.hour, 1, 12, "07") };
      }
      return { ...prev, minute: clampAndPad(prev.minute, 0, 59, "00") };
    });
  };

  const handlePickerOk = (pickerName = openPicker) => {
    if (!pickerName) return;
    const latestDraft = draftSelectionRef.current;
    const normalizedSelection = {
      ...latestDraft,
      hour: clampAndPad(latestDraft.hour, 1, 12, "07"),
      minute: clampAndPad(latestDraft.minute, 0, 59, "00"),
    };
    onChange?.({
      target: {
        name: pickerName,
        value: to24Hour(normalizedSelection),
      },
    });
    setDraftSelectionSafe(normalizedSelection);
    setOpenPicker(null);
    if (pickerName === "start_time") {
      setTimeout(() => {
        endTimeButtonRef.current?.focus();
        openTimePicker("end_time");
      }, 0);
      return;
    }
    focusSubmitButton();
  };

  const handlePickerClear = () => {
    if (!openPicker) return;
    onChange?.({
      target: {
        name: openPicker,
        value: "",
      },
    });
    setOpenPicker(null);
  };

  const focusSubmitButton = () => {
    setTimeout(() => {
      submitButtonRef.current?.focus();
    }, 0);
  };

  const handleHourInputKeyDown = (event) => {
    if (event.key === "Tab" || event.key === "Enter") {
      event.preventDefault();
      minuteInputRef.current?.focus();
      minuteInputRef.current?.select();
    }
  };

  const handleMinuteInputKeyDown = (event) => {
    if (event.key === "Tab" || event.key === "Enter") {
      event.preventDefault();
      const periodTarget = draftSelection.period === "PM" ? pmButtonRef : amButtonRef;
      periodTarget.current?.focus();
    }
  };

  const handleAmKeyDown = (event) => {
    if (event.key === "Tab" || event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) {
        minuteInputRef.current?.focus();
        minuteInputRef.current?.select();
        return;
      }
      pmButtonRef.current?.focus();
    }
  };

  const handlePmKeyDown = (event) => {
    if (event.key === "Tab" || event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) {
        amButtonRef.current?.focus();
        return;
      }
      okButtonRef.current?.focus();
    }
  };

  const handleOkKeyDown = (event) => {
    if (event.key === "Tab" || event.key === "Enter") {
      event.preventDefault();
      handlePickerOk();
    }
  };

  const selectPeriod = (period) => {
    setDraftSelectionSafe((prev) => ({ ...prev, period }));
  };

  useEffect(() => {
    if (!openPicker) return undefined;
    const handleOutsideClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-time-picker-panel]")) return;
      if (!pickerRef.current?.contains(target)) {
        setOpenPicker(null);
      }
    };
    setTimeout(() => {
      hourInputRef.current?.focus();
      hourInputRef.current?.select();
    }, 0);
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [openPicker]);

  const handleDialogOpenChange = (open) => {
    if (!open) {
      setOpenPicker(null);
      onClose?.();
    }
  };

  const handleDialogOpenAutoFocus = (event) => {
    event.preventDefault();
    startTimeButtonRef.current?.focus();
    openTimePicker("start_time");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-w-lg"
        onOpenAutoFocus={handleDialogOpenAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Time Slot" : "Create Time Slot"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update start and end time for this slot."
              : "Enter a start and end time to create a reusable slot."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="relative block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Start Time
              </span>
              <button
                ref={startTimeButtonRef}
                type="button"
                onClick={() => openTimePicker("start_time")}
                className="flex w-full items-center justify-between rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
              >
                <span>{formatDisplayTime(formData.start_time) || "Select time"}</span>
                <Clock3 size={14} className="text-slate-500" />
              </button>
              {openPicker === "start_time" ? (
                <div
                  ref={pickerRef}
                  data-time-picker-panel
                  className="absolute z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
                >
                  <p className="mb-2 text-xs font-medium text-slate-600">Enter time</p>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateDraftByStep("hour", 1, 1, 12)}
                        className="rounded p-1 hover:bg-slate-200"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <input
                        ref={hourInputRef}
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={draftSelection.hour}
                        onChange={(event) =>
                          handleDraftInputChange("hour", event.target.value)
                        }
                        onBlur={() => handleDraftInputBlur("hour")}
                        onKeyDown={handleHourInputKeyDown}
                        className="w-14 rounded border border-blue-500 bg-blue-50 py-2 text-center text-2xl text-blue-600 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateDraftByStep("hour", -1, 1, 12)}
                        className="rounded p-1 hover:bg-slate-200"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <span className="px-2 text-3xl text-slate-600">:</span>
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateDraftByStep("minute", 1, 0, 59)}
                        className="rounded p-1 hover:bg-slate-200"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <input
                        ref={minuteInputRef}
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={draftSelection.minute}
                        onChange={(event) =>
                          handleDraftInputChange("minute", event.target.value)
                        }
                        onBlur={() => handleDraftInputBlur("minute")}
                        onKeyDown={handleMinuteInputKeyDown}
                        className="w-14 rounded border border-slate-300 bg-white py-2 text-center text-2xl text-slate-800 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateDraftByStep("minute", -1, 0, 59)}
                        className="rounded p-1 hover:bg-slate-200"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <div className="ml-2 grid gap-1">
                      <button
                        ref={amButtonRef}
                        type="button"
                        onMouseDown={() => selectPeriod("AM")}
                        onClick={() => selectPeriod("AM")}
                        onKeyDown={handleAmKeyDown}
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          draftSelection.period === "AM"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        AM
                      </button>
                      <button
                        ref={pmButtonRef}
                        type="button"
                        onMouseDown={() => selectPeriod("PM")}
                        onClick={() => selectPeriod("PM")}
                        onKeyDown={handlePmKeyDown}
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          draftSelection.period === "PM"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {formatDraftDisplayTime(draftSelection)}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2">
                    <button
                      type="button"
                      onClick={handlePickerClear}
                      className="text-sm font-medium text-blue-600"
                    >
                      Clear
                    </button>
                    <button
                      ref={okButtonRef}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handlePickerOk();
                      }}
                      onClick={handlePickerOk}
                      onKeyDown={handleOkKeyDown}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      OK
                    </button>
                  </div>
                </div>
              ) : null}
            </label>
            <label className="relative block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                End Time
              </span>
              <button
                ref={endTimeButtonRef}
                type="button"
                onClick={() => openTimePicker("end_time")}
                className="flex w-full items-center justify-between rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
              >
                <span>{formatDisplayTime(formData.end_time) || "Select time"}</span>
                <Clock3 size={14} className="text-slate-500" />
              </button>
              {openPicker === "end_time" ? (
                <div
                  ref={pickerRef}
                  data-time-picker-panel
                  className="absolute z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
                >
                  <p className="mb-2 text-xs font-medium text-slate-600">Enter time</p>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateDraftByStep("hour", 1, 1, 12)}
                        className="rounded p-1 hover:bg-slate-200"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <input
                        ref={hourInputRef}
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={draftSelection.hour}
                        onChange={(event) =>
                          handleDraftInputChange("hour", event.target.value)
                        }
                        onBlur={() => handleDraftInputBlur("hour")}
                        onKeyDown={handleHourInputKeyDown}
                        className="w-14 rounded border border-blue-500 bg-blue-50 py-2 text-center text-2xl text-blue-600 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateDraftByStep("hour", -1, 1, 12)}
                        className="rounded p-1 hover:bg-slate-200"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <span className="px-2 text-3xl text-slate-600">:</span>
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateDraftByStep("minute", 1, 0, 59)}
                        className="rounded p-1 hover:bg-slate-200"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <input
                        ref={minuteInputRef}
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={draftSelection.minute}
                        onChange={(event) =>
                          handleDraftInputChange("minute", event.target.value)
                        }
                        onBlur={() => handleDraftInputBlur("minute")}
                        onKeyDown={handleMinuteInputKeyDown}
                        className="w-14 rounded border border-slate-300 bg-white py-2 text-center text-2xl text-slate-800 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateDraftByStep("minute", -1, 0, 59)}
                        className="rounded p-1 hover:bg-slate-200"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <div className="ml-2 grid gap-1">
                      <button
                        ref={amButtonRef}
                        type="button"
                        onMouseDown={() => selectPeriod("AM")}
                        onClick={() => selectPeriod("AM")}
                        onKeyDown={handleAmKeyDown}
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          draftSelection.period === "AM"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        AM
                      </button>
                      <button
                        ref={pmButtonRef}
                        type="button"
                        onMouseDown={() => selectPeriod("PM")}
                        onClick={() => selectPeriod("PM")}
                        onKeyDown={handlePmKeyDown}
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          draftSelection.period === "PM"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {formatDraftDisplayTime(draftSelection)}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2">
                    <button
                      type="button"
                      onClick={handlePickerClear}
                      className="text-sm font-medium text-blue-600"
                    >
                      Clear
                    </button>
                    <button
                      ref={okButtonRef}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handlePickerOk();
                      }}
                      onClick={handlePickerOk}
                      onKeyDown={handleOkKeyDown}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      OK
                    </button>
                  </div>
                </div>
              ) : null}
            </label>
          </div>

          {formError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          ) : null}

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              ref={submitButtonRef}
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : isEditMode ? "Update Time Slot" : "Create Time Slot"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
