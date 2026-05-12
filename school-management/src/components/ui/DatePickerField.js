"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function parseYmd(value) {
  const normalized = String(value || "").trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return { year, month, day };
}

function formatYmd(year, month, day) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDateForDisplay(value) {
  const selected = parseYmd(value);
  if (!selected) {
    return "";
  }
  const dateValue = new Date(Date.UTC(selected.year, selected.month - 1, selected.day));
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateValue);
}

function getDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function shiftMonth(year, month, delta) {
  const base = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: base.getUTCFullYear(), month: base.getUTCMonth() + 1 };
}

function compareYmd(left, right) {
  if (!left || !right) {
    return 0;
  }
  return left.localeCompare(right);
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function DatePickerField({
  value = "",
  onChange,
  min = "",
  max = "",
  placeholder = "Select date",
  disabled = false,
  readOnly = false,
  className = "",
  ariaLabel = "Date picker",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const [panelView, setPanelView] = useState("day");
  const [viewMonth, setViewMonth] = useState(() => {
    const selected = parseYmd(value);
    if (selected) {
      return { year: selected.year, month: selected.month };
    }
    const today = new Date();
    return { year: today.getUTCFullYear(), month: today.getUTCMonth() + 1 };
  });
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const selected = parseYmd(value);
  const selectedYmd = selected ? formatYmd(selected.year, selected.month, selected.day) : "";
  const minYmd = String(min || "").trim();
  const maxYmd = String(max || "").trim();
  const isInteractive = !disabled && !readOnly;

  useEffect(() => {
    if (!isOpen) {
      setMenuStyle(null);
      setPanelView("day");
      return undefined;
    }

    const updateMenuPosition = () => {
      const buttonElement = buttonRef.current;
      if (!buttonElement) {
        return;
      }
      const rect = buttonElement.getBoundingClientRect();
      const viewportPadding = 8;
      const menuWidth = Math.max(300, rect.width);
      const menuHeightEstimate = 330;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const openAbove = spaceBelow < menuHeightEstimate && spaceAbove > spaceBelow;

      setMenuStyle({
        left: Math.max(
          viewportPadding,
          Math.min(rect.left, window.innerWidth - menuWidth - viewportPadding),
        ),
        top: openAbove
          ? Math.max(viewportPadding, rect.top - menuHeightEstimate - 6)
          : rect.bottom + 6,
        width: menuWidth,
      });
    };

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

    const handleResizeOrScroll = () => updateMenuPosition();

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
    if (!isOpen) {
      return;
    }
    const nextBase = parseYmd(selectedYmd) || parseYmd(minYmd);
    if (nextBase) {
      setViewMonth((prev) => {
        if (prev.year === nextBase.year && prev.month === nextBase.month) {
          return prev;
        }
        return { year: nextBase.year, month: nextBase.month };
      });
    }
  }, [isOpen, minYmd, selectedYmd]);

  const prevMonth = shiftMonth(viewMonth.year, viewMonth.month, -1);
  const nextMonth = shiftMonth(viewMonth.year, viewMonth.month, 1);
  const prevMonthEnd = formatYmd(
    prevMonth.year,
    prevMonth.month,
    getDaysInMonth(prevMonth.year, prevMonth.month),
  );
  const nextMonthStart = formatYmd(nextMonth.year, nextMonth.month, 1);
  const prevDisabled = Boolean(minYmd) && compareYmd(prevMonthEnd, minYmd) < 0;
  const nextDisabled = Boolean(maxYmd) && compareYmd(nextMonthStart, maxYmd) > 0;
  const minDateParts = parseYmd(minYmd);
  const maxDateParts = parseYmd(maxYmd);
  const minYear = minDateParts?.year ?? viewMonth.year - 100;
  const maxYear = maxDateParts?.year ?? viewMonth.year + 20;
  const yearOptions = [];
  for (let year = minYear; year <= maxYear; year += 1) {
    yearOptions.push(year);
  }

  const monthNameLong = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(viewMonth.year, viewMonth.month - 1, 1)));

  const monthIsDisabled = (year, month) => {
    const monthStart = formatYmd(year, month, 1);
    const monthEnd = formatYmd(year, month, getDaysInMonth(year, month));
    if (minYmd && compareYmd(monthEnd, minYmd) < 0) {
      return true;
    }
    if (maxYmd && compareYmd(monthStart, maxYmd) > 0) {
      return true;
    }
    return false;
  };

  const yearIsDisabled = (year) => {
    const yearStart = formatYmd(year, 1, 1);
    const yearEnd = formatYmd(year, 12, 31);
    if (minYmd && compareYmd(yearEnd, minYmd) < 0) {
      return true;
    }
    if (maxYmd && compareYmd(yearStart, maxYmd) > 0) {
      return true;
    }
    return false;
  };

  const firstDayWeekIndex = new Date(
    Date.UTC(viewMonth.year, viewMonth.month - 1, 1),
  ).getUTCDay();
  const days = [];
  for (let i = 0; i < firstDayWeekIndex; i += 1) {
    days.push(null);
  }
  const monthDaysCount = getDaysInMonth(viewMonth.year, viewMonth.month);
  for (let day = 1; day <= monthDaysCount; day += 1) {
    days.push(day);
  }

  return (
    <div ref={containerRef} className={className}>
      <button
        ref={buttonRef}
        type="button"
        disabled={!isInteractive}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={ariaLabel}
        className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
          selectedYmd
            ? "border-sky-500 bg-sky-50 text-sky-800"
            : "border-slate-300 bg-white text-slate-500"
        }`}
      >
        <span>{formatDateForDisplay(selectedYmd) || placeholder}</span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M8 3v3M16 3v3M4 9h16M6 5h12a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
          </svg>
        </span>
      </button>

      {isOpen && isInteractive && menuStyle && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[2400] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.22)]"
              style={{ left: menuStyle.left, top: menuStyle.top, width: menuStyle.width }}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => !prevDisabled && setViewMonth(prevMonth)}
                  disabled={prevDisabled}
                  className="text-sm font-semibold text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  ← Prev
                </button>
                <div className="flex items-center gap-2 text-base font-semibold text-slate-800">
                  <button
                    type="button"
                    onClick={() => setPanelView("month")}
                    className="rounded-md px-1.5 py-0.5 transition hover:bg-slate-100"
                  >
                    {monthNameLong}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelView("year")}
                    className="rounded-md px-1.5 py-0.5 transition hover:bg-slate-100"
                  >
                    {viewMonth.year}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => !nextDisabled && setViewMonth(nextMonth)}
                  disabled={nextDisabled}
                  className="text-sm font-semibold text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  Next →
                </button>
              </div>

              {panelView === "day" ? (
                <div className="grid grid-cols-7 gap-1 px-1 pb-1">
                  {WEEKDAYS.map((day) => (
                    <div key={day} className="py-1 text-center text-[11px] font-semibold tracking-wide text-slate-400">
                      {day}
                    </div>
                  ))}
                  {days.map((day, index) => {
                    if (!day) {
                      return <div key={`blank-${index}`} className="h-9" />;
                    }
                    const dayYmd = formatYmd(viewMonth.year, viewMonth.month, day);
                    const isDayDisabled =
                      (minYmd && compareYmd(dayYmd, minYmd) < 0) ||
                      (maxYmd && compareYmd(dayYmd, maxYmd) > 0);
                    const isSelected = selectedYmd === dayYmd;

                    return (
                      <button
                        key={dayYmd}
                        type="button"
                        disabled={isDayDisabled}
                        onClick={() => {
                          if (isDayDisabled) {
                            return;
                          }
                          onChange(dayYmd);
                          setIsOpen(false);
                        }}
                        className={`h-9 rounded-full text-sm font-medium transition ${
                          isSelected
                            ? "bg-sky-500 text-white"
                            : isDayDisabled
                              ? "cursor-not-allowed text-slate-300"
                              : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {panelView === "month" ? (
                <div className="grid grid-cols-3 gap-2 px-1 pb-1">
                  {MONTHS.map((label, index) => {
                    const month = index + 1;
                    const isDisabled = monthIsDisabled(viewMonth.year, month);
                    const isSelected = viewMonth.month === month;
                    return (
                      <button
                        key={`${viewMonth.year}-${month}`}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) {
                            return;
                          }
                          setViewMonth((prev) => ({ ...prev, month }));
                          setPanelView("day");
                        }}
                        className={`h-9 rounded-lg text-sm font-medium transition ${
                          isSelected
                            ? "bg-sky-500 text-white"
                            : isDisabled
                              ? "cursor-not-allowed text-slate-300"
                              : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {panelView === "year" ? (
                <div className="max-h-56 overflow-y-auto px-1 pb-1">
                  <div className="grid grid-cols-4 gap-2">
                    {yearOptions.map((year) => {
                      const isDisabled = yearIsDisabled(year);
                      const isSelected = viewMonth.year === year;
                      return (
                        <button
                          key={year}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            if (isDisabled) {
                              return;
                            }
                            setViewMonth((prev) => ({ ...prev, year }));
                            setPanelView("month");
                          }}
                          className={`h-9 rounded-lg text-sm font-medium transition ${
                            isSelected
                              ? "bg-sky-500 text-white"
                              : isDisabled
                                ? "cursor-not-allowed text-slate-300"
                                : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
