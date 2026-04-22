"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCurrentSchoolInfo, getStudentFeesCollectionHistory } from "@/lib/apiService";

function formatAmount(value) {
  const parsed = Number.parseFloat(String(value ?? "0"));
  if (!Number.isFinite(parsed)) {
    return "0.00";
  }
  return parsed.toFixed(2);
}

function formatValue(value) {
  const label = String(value ?? "").trim();
  return label || "-";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export default function DialogStudentFessCollectionHistory({
  open,
  onClose,
  studentAcademicRecordId,
  studentName = "",
}) {
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentSchoolName, setCurrentSchoolName] = useState("");
  const dialogRef = useRef(null);
  const dragStateRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const normalizedId = Number.parseInt(String(studentAcademicRecordId ?? ""), 10);
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
      setHistoryItems([]);
      setErrorMessage("Invalid student academic record id.");
      return;
    }

    let mounted = true;
    setIsLoading(true);
    setErrorMessage("");

    getStudentFeesCollectionHistory(normalizedId)
      .then((data) => {
        if (!mounted) {
          return;
        }
        setHistoryItems(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }
        setHistoryItems([]);
        setErrorMessage(error?.message || "Unable to load payment history.");
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [open, studentAcademicRecordId]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let mounted = true;
    getCurrentSchoolInfo()
      .then((data) => {
        if (!mounted) {
          return;
        }
        setCurrentSchoolName(
          String(data?.school?.name || data?.company?.name || "").trim(),
        );
      })
      .catch(() => {
        if (mounted) {
          setCurrentSchoolName("");
        }
      });

    return () => {
      mounted = false;
    };
  }, [open]);

  const title = useMemo(() => {
    const trimmedName = String(studentName || "").trim();
    if (trimmedName) {
      return `Payment History - ${trimmedName}`;
    }
    return "Payment History";
  }, [studentName]);

  const studentMeta = useMemo(() => {
    const firstItem = Array.isArray(historyItems) && historyItems.length > 0 ? historyItems[0] : null;
    return {
      academicYear: formatValue(firstItem?.academic_year_name),
      className: formatValue(firstItem?.class_name),
      sectionName: formatValue(firstItem?.section_name),
      rollNumber: formatValue(firstItem?.roll_number ?? firstItem?.roll_no),
    };
  }, [historyItems]);

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
  };

  const handlePrintHistory = () => {
    const schoolName = String(currentSchoolName || "School Management").trim();
    const safeStudentName = String(studentName || "-").trim() || "-";
    const { academicYear, className, sectionName, rollNumber } = studentMeta;
    const rowsHtml = (Array.isArray(historyItems) ? historyItems : [])
      .map((item, index) => {
        const installment = formatValue(item?.installment_name_display || item?.installment_name);
        const dueDate = formatValue(item?.due_date);
        const total = formatAmount(item?.total_amount);
        const paid = formatAmount(item?.paid_amount);
        const due = formatAmount(item?.due_amount);
        const paymentDate = formatValue(item?.payment_date);
        const paymentMode = formatValue(item?.payment_mode_display || item?.payment_mode);
        const transactionId = formatValue(item?.transaction_id);
        const status = formatValue(item?.status_display || item?.status);
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(installment)}</td>
            <td>${escapeHtml(dueDate)}</td>
            <td class="amount">${escapeHtml(total)}</td>
            <td>${escapeHtml(paid)}</td>
            <td>${escapeHtml(due)}</td>
            <td>${escapeHtml(paymentDate)}</td>
            <td>${escapeHtml(paymentMode)}</td>
            <td>${escapeHtml(transactionId)}</td>
            <td>${escapeHtml(status)}</td>
          </tr>
        `;
      })
      .join("");

    const summaryRowsHtml = (Array.isArray(historyItems) ? historyItems : [])
      .map((item, index) => {
        const installment = formatValue(item?.installment_name_display || item?.installment_name);
        const dueDate = formatValue(item?.due_date);
        const total = formatAmount(item?.total_amount);
        const paid = formatAmount(item?.paid_amount);
        const due = formatAmount(item?.due_amount);
        const paymentDate = formatValue(item?.payment_date);

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(installment)}</td>
            <td>${escapeHtml(dueDate)}</td>
            <td>${escapeHtml(total)}</td>
            <td>${escapeHtml(paid)}</td>
            <td>${escapeHtml(due)}</td>
            <td>${escapeHtml(paymentDate)}</td>
          </tr>
        `;
      })
      .join("");

    const emptyRowHtml = `
      <tr>
        <td colspan="10" class="empty">No payment history found.</td>
      </tr>
    `;

    const emptySummaryRowHtml = `
      <tr>
        <td colspan="7" class="empty">No summary data found.</td>
      </tr>
    `;

    const printHtml = `
      <!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Student Fees Payment History</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: "Georgia", "Times New Roman", serif;
      background: #ececf1;
      color: #2f3b4a;
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    .sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #f8f8fb;
      position: relative;
      padding: 18mm 12mm 16mm;
    }

    @media screen {
      .sheet {
        box-shadow: 0 0 18px rgba(0, 0, 0, 0.15);
      }
    }

    .frame {
      position: relative;
      min-height: 261mm;
      border: 1.5px solid #caa567;
      padding: 14px 14px 18px;
      background:
        linear-gradient(rgba(255,255,255,0.86), rgba(255,255,255,0.86)),
        radial-gradient(circle at top left, #f5f2ea 0%, #f8f8fb 55%, #f1f2f8 100%);
    }

    .frame::before,
    .frame::after {
      content: "";
      position: absolute;
      width: 18px;
      height: 18px;
      border-color: #caa567;
      border-style: solid;
    }

    .frame::before {
      top: 8px;
      left: 8px;
      border-width: 2px 0 0 2px;
      border-top-left-radius: 8px;
    }

    .frame::after {
      bottom: 8px;
      right: 8px;
      border-width: 0 2px 2px 0;
      border-bottom-right-radius: 8px;
    }

    .corner-top-right,
    .corner-bottom-left {
      position: absolute;
      width: 18px;
      height: 18px;
      border-color: #caa567;
      border-style: solid;
    }

    .corner-top-right {
      top: 8px;
      right: 8px;
      border-width: 2px 2px 0 0;
      border-top-right-radius: 8px;
    }

    .corner-bottom-left {
      bottom: 8px;
      left: 8px;
      border-width: 0 0 2px 2px;
      border-bottom-left-radius: 8px;
    }

    .header-wrap {
      margin-top: 14px;
      margin-bottom: 12px;
    }

    .header {
      position: relative;
      background: linear-gradient(180deg, #234a8e 0%, #19396f 100%);
      border: 1px solid #caa567;
      border-bottom: none;
      border-radius: 30px 30px 10px 10px;
      padding: 12px 18px 10px;
      overflow: hidden;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.25);
    }

    .header::before,
    .header::after {
      content: "";
      position: absolute;
      bottom: -16px;
      width: 48px;
      height: 38px;
      background: #234a8e;
      border: 1px solid #caa567;
      border-top: none;
      z-index: 0;
    }

    .header::before {
      left: 0;
      border-right: none;
      border-bottom-left-radius: 24px;
    }

    .header::after {
      right: 0;
      border-left: none;
      border-bottom-right-radius: 24px;
    }

    .header-content {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .school-logo {
      width: 58px;
      height: 58px;
      object-fit: contain;
      flex: 0 0 58px;
      filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));
    }

    .title-box {
      color: #fff;
      line-height: 1.2;
    }

    .title-box h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.2px;
      text-shadow: 0 1px 1px rgba(0,0,0,0.35);
    }

    .title-box p {
      margin: 3px 0 0;
      font-size: 14px;
      font-family: Arial, sans-serif;
      font-weight: 600;
      color: #f7f2de;
    }

    .meta {
      margin: 10px 0 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px 16px;
      font-size: 11px;
      font-family: Arial, sans-serif;
      color: #49576a;
    }

    .meta strong {
      color: #2d3b4d;
      font-weight: 700;
    }

    .table-card,
    .summary-card {
      width: 100%;
      overflow: hidden;
    }

    .table-card {
      margin-top: 8px;
      border: 1px solid #cfb07a;
      border-radius: 8px;
      background: rgba(255,255,255,0.72);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
    }

    .summary-card {
      margin-top: 12px;
      border: 1px solid #d6d8e0;
      border-radius: 4px;
      background: rgba(245,246,250,0.7);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    thead th {
      background: linear-gradient(180deg, #234a8e 0%, #17396c 100%);
      color: #f8f6ef;
      font-family: Arial, sans-serif;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 8px 4px;
      text-align: center;
      line-height: 1.15;
      border-right: 1px solid rgba(255,255,255,0.18);
      white-space: nowrap;
      vertical-align: middle;
    }

    thead th.w-payment-date,
    thead th.w-payment-mode,
    thead th.w-transaction {
      white-space: normal;
      word-break: break-word;
      line-height: 1.05;
    }

    thead th:last-child {
      border-right: none;
    }

    tbody td {
      font-family: Arial, sans-serif;
      font-size: 10px;
      color: #46556a;
      padding: 7px 4px;
      text-align: center;
      border-top: 1px solid #dddfe7;
      border-right: 1px solid #ececf2;
      background: rgba(255,255,255,0.35);
      vertical-align: middle;
      word-break: break-word;
    }

    tbody td:last-child {
      border-right: none;
    }

    tbody tr:nth-child(even) td {
      background: rgba(240,242,248,0.8);
    }

    .summary-card thead th {
      background: #eef1f7;
      color: #506177;
      font-size: 10px;
      border-right: 1px solid #dde3ec;
      padding: 6px 5px;
    }

    .summary-card tbody td {
      background: rgba(250,251,254,0.75);
      color: #56657c;
      font-size: 10px;
      padding: 6px 5px;
      border-top: 1px solid #e3e7ef;
    }

    .amount-total {
      font-weight: 700;
      color: #2f3e55;
    }

    .status-text {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 700;
      line-height: 1.2;
    }

    .status-paid {
      color: #3d8b43;
    }

    .status-partial {
      color: #d0841e;
    }

    .status-unpaid {
      color: #c0392b;
    }

    .footer {
      margin-top: 10px;
      text-align: right;
      font-family: Arial, sans-serif;
      font-size: 10px;
      color: #617189;
    }

    /* Main table widths */
    .w-sl { width: 6%; }
    .w-installment { width: 13%; }
    .w-date { width: 10%; }
    .w-total { width: 9%; }
    .w-paid { width: 9%; }
    .w-due { width: 9%; }
    .w-payment-date { width: 13%; }
    .w-payment-mode { width: 10%; }
    .w-transaction { width: 10%; }
    .w-status { width: 8%; }

    /* Summary table widths */
    .summary .w-sl { width: 8%; }
    .summary .w-installment { width: 18%; }
    .summary .w-date { width: 14%; }
    .summary .w-total { width: 14%; }
    .summary .w-paid { width: 14%; }
    .summary .w-due { width: 14%; }
    .summary .w-payment-date { width: 18%; }

    @media print {
      body {
        background: #fff;
      }

      .sheet {
        box-shadow: none;
      }
    }
  </style>
</head>

<body>
  <div class="sheet">
    <div class="frame">
      <span class="corner-top-right"></span>
      <span class="corner-bottom-left"></span>

      <div class="header-wrap">
        <div class="header">
          <div class="header-content">
            <img
              class="school-logo"
              src="https://cdn-icons-png.flaticon.com/512/3135/3135755.png"
              alt="School Logo"
            />
            <div class="title-box">
              <h1>${escapeHtml(schoolName)}</h1>
              <p>Payment History - ${escapeHtml(safeStudentName)}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="meta">
        <div>Academic Year: <strong>${escapeHtml(academicYear)}</strong></div>
        <div>Class: <strong>${escapeHtml(className)}</strong></div>
        <div>Section: <strong>${escapeHtml(sectionName)}</strong></div>
        <div>Roll: <strong>${escapeHtml(rollNumber)}</strong></div>
        <div>Printed On: ${escapeHtml(new Date().toLocaleString())}</div>
      </div>

      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th class="w-sl">SL.NO.</th>
              <th class="w-installment">INSTALLMENT</th>
              <th class="w-date">DUE DATE</th>
              <th class="w-total">TOTAL</th>
              <th class="w-paid">PAID</th>
              <th class="w-due">DUE</th>
              <th class="w-payment-date">PAYMENT DATE</th>
              <th class="w-payment-mode">PAYMENT MODE</th>
              <th class="w-transaction">TRANSACTION ID</th>
              <th class="w-status">STATUS</th>
                  </tr>
                </thead>
          <tbody>
            ${rowsHtml || emptyRowHtml}
          </tbody>
        </table>
      </div>
      <div class="footer">
        Printed On: ${escapeHtml(new Date().toLocaleString())}
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const printFrame = document.createElement("iframe");
    const originalDocumentTitle = document.title;
    document.title = "StudentFeesPaymentHistory";
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
      setErrorMessage("Unable to print payment history. Please try again.");
      return;
    }

    frameDocument.open();
    frameDocument.write(printHtml);
    frameDocument.close();
    frameDocument.title = "";

    window.setTimeout(() => {
      const frameWindow = printFrame.contentWindow;
      if (!frameWindow) {
        cleanup();
        setErrorMessage("Unable to print payment history. Please try again.");
        return;
      }
      frameWindow.focus();
      frameWindow.onafterprint = cleanup;
      frameWindow.print();
    }, 250);
  };

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[2100] flex items-center justify-center overflow-hidden p-2 sm:p-6">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        aria-label="Close payment history dialog"
      />

      <div
        ref={dialogRef}
        style={{
          transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
        }}
        className="relative z-10 flex w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] will-change-transform max-h-[calc(100svh-0.5rem)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">{title}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintHistory}
              title="Print payment history"
              aria-label="Print payment history"
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
              onClick={onClose}
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

        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
          <div className="mb-3 grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              Academic Year: <strong className="text-slate-900">{studentMeta.academicYear}</strong>
            </div>
            <div>
              Class: <strong className="text-slate-900">{studentMeta.className}</strong>
            </div>
            <div>
              Section: <strong className="text-slate-900">{studentMeta.sectionName}</strong>
            </div>
            <div>
              Roll: <strong className="text-slate-900">{studentMeta.rollNumber}</strong>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3 font-semibold">SL.No.</th>
                  <th className="px-2 py-3 font-semibold">Installment</th>
                  <th className="px-2 py-3 font-semibold">Due Date</th>
                  <th className="px-2 py-3 font-semibold">Total</th>
                  <th className="px-2 py-3 font-semibold">Paid</th>
                  <th className="px-2 py-3 font-semibold">Due</th>
                  <th className="px-2 py-3 font-semibold">Payment Date</th>
                  <th className="px-2 py-3 font-semibold">Payment Mode</th>
                  <th className="px-2 py-3 font-semibold">Transaction ID</th>
                  <th className="px-2 py-3 font-semibold">Status</th>
                  <th className="px-2 py-3 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3" colSpan={11}>
                      Loading payment history...
                    </td>
                  </tr>
                ) : null}

                {!isLoading && errorMessage ? (
                  <tr className="border-b border-slate-100 text-sm text-red-600">
                    <td className="px-2 py-3" colSpan={11}>
                      {errorMessage}
                    </td>
                  </tr>
                ) : null}

                {!isLoading && !errorMessage && historyItems.length === 0 ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3" colSpan={11}>
                      No payment history found.
                    </td>
                  </tr>
                ) : null}

                {!isLoading && !errorMessage
                  ? historyItems.map((item, index) => (
                      <tr key={item?.id || `history-${index}`} className="border-b border-slate-100 text-sm text-slate-700">
                        <td className="px-2 py-3 font-medium text-slate-800">{index + 1}</td>
                        <td className="px-2 py-3">
                          {formatValue(item?.installment_name_display || item?.installment_name)}
                        </td>
                        <td className="px-2 py-3">{formatValue(item?.due_date)}</td>
                        <td className="px-2 py-3 font-semibold text-slate-900">
                          {formatAmount(item?.total_amount)}
                        </td>
                        <td className="px-2 py-3">{formatAmount(item?.paid_amount)}</td>
                        <td className="px-2 py-3">{formatAmount(item?.due_amount)}</td>
                        <td className="px-2 py-3">{formatValue(item?.payment_date)}</td>
                        <td className="px-2 py-3">
                          {formatValue(item?.payment_mode_display || item?.payment_mode)}
                        </td>
                        <td className="px-2 py-3">{formatValue(item?.transaction_id)}</td>
                        <td className="px-2 py-3">
                          {formatValue(item?.status_display || item?.status)}
                        </td>
                        <td className="px-2 py-3">{formatValue(item?.remarks)}</td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
