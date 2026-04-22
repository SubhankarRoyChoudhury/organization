"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

export default function ActionMenu({
  items = [],
  disabled = false,
  buttonLabel = "Open actions menu",
  menuWidth = 144,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);

  const visibleItems = useMemo(
    () => items.filter((item) => !item?.hidden),
    [items],
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleOutsideClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("[data-row-action-menu]")) {
        setIsOpen(false);
        setMenuPosition(null);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setMenuPosition(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleToggle = (event) => {
    if (disabled || visibleItems.length === 0) return;
    if (isOpen) {
      setIsOpen(false);
      setMenuPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const margin = 8;
    const rowHeight = 38;
    const menuHeight = visibleItems.length * rowHeight + 10;
    let left = rect.right - menuWidth;
    left = Math.max(margin, Math.min(left, window.innerWidth - menuWidth - margin));
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow < menuHeight + 6
        ? Math.max(margin, rect.top - menuHeight - 6)
        : Math.min(rect.bottom + 6, window.innerHeight - menuHeight - margin);

    setMenuPosition({ top, left });
    setIsOpen(true);
  };

  const closeMenu = () => {
    setIsOpen(false);
    setMenuPosition(null);
  };

  return (
    <div className="inline-flex" data-row-action-menu>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || visibleItems.length === 0}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={buttonLabel}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen &&
        menuPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuWidth,
              zIndex: 80,
            }}
            data-row-action-menu
          >
            {visibleItems.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={Boolean(item.disabled)}
                onClick={() => {
                  item.onClick?.();
                  closeMenu();
                }}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-60 ${
                  item.variant === "danger" ? "text-red-600 hover:bg-red-50" : "text-slate-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

