"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  getApprovedDepartments,
  get_Hospital_User_Login_Details,
  getIpdBillings,
  getIpdPayments,
  getRateCharts,
  updateIpdBilling,
  updateIpdBooking,
  updateBedRecord,
} from "@/app/api/apiService";

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const billingIdParam = searchParams?.get("billingId");
  const [billingRows, setBillingRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [expandedBillingId, setExpandedBillingId] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [rateChartOptions, setRateChartOptions] = useState([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [editingBilling, setEditingBilling] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [actionMenuId, setActionMenuId] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [isPaymentsModalOpen, setIsPaymentsModalOpen] = useState(false);
  const [openedFromParam, setOpenedFromParam] = useState(false);
  const tableScrollRef = useRef(null);

  const formatAmount = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "0.00";
    return num.toFixed(2);
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const formatWithCommas = (value) =>
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(toNumber(value));

  const getDueAmountTone = (value) => {
    const amount = toNumber(value);
    if (amount < 0) return "positive";
    if (amount > 0) return "negative";
    return "neutral";
  };

  const numberToWords = (value) => {
    const num = Math.floor(toNumber(value));
    if (num === 0) return "Zero";
    const belowTwenty = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
    const thousands = ["", "Thousand", "Million", "Billion"];

    const chunkToWords = (chunk) => {
      let words = "";
      const hundred = Math.floor(chunk / 100);
      const remainder = chunk % 100;
      if (hundred) {
        words += `${belowTwenty[hundred]} Hundred `;
      }
      if (remainder < 20) {
        words += belowTwenty[remainder];
      } else {
        words += `${tens[Math.floor(remainder / 10)]} ${
          belowTwenty[remainder % 10]
        }`.trim();
      }
      return words.trim();
    };

    let words = "";
    let chunkIndex = 0;
    let remainder = num;
    while (remainder > 0) {
      const chunk = remainder % 1000;
      if (chunk) {
        const chunkWords = chunkToWords(chunk);
        const suffix = thousands[chunkIndex];
        words = `${chunkWords} ${suffix} ${words}`.trim();
      }
      remainder = Math.floor(remainder / 1000);
      chunkIndex += 1;
    }
    return words.trim();
  };

  const getItem = (items, name) =>
    items.find((entry) => entry?.item === name) || {};

  const buildEditForm = (billing) => {
    const items = Array.isArray(billing?.rawItems) ? billing.rawItems : [];
    const totalDaysItem = getItem(items, "Total Days");
    const surgeryItem = getItem(items, "Surgery Rate");
    const roomItem = getItem(items, "Room Charges");
    const doctorItem = getItem(items, "Doctor Charges");
    const otItem = getItem(items, "Operation Theater Charges");
    const otherItem = getItem(items, "Other Charges");
    return {
      surgeryAmount: surgeryItem.amount ?? "",
      surgeryDescription: surgeryItem.description ?? "",
      roomRate: roomItem.rate ?? "",
      roomDescription: roomItem.description ?? "",
      roomQty:
        totalDaysItem.qty ?? roomItem.qty ?? billing?.totalDaysValue ?? "",
      roomAmount: roomItem.amount ?? "",
      doctorRate: doctorItem.rate ?? "",
      doctorQty: doctorItem.qty ?? "",
      doctorAmount: doctorItem.amount ?? "",
      doctorDescription: doctorItem.description ?? "",
      otAmount: otItem.amount ?? "",
      otDescription: otItem.description ?? "",
      otherAmount: otherItem.amount ?? "",
      otherDescription: otherItem.description ?? "",
      remarks: billing?.remarks ?? "",
      additionalAdmissions: Array.isArray(billing?.additionalAdmissions)
        ? billing.additionalAdmissions.map((entry, index) => ({
            id: `${billing.billingId}-extra-${index}`,
            department_id: entry?.department_id ?? "",
            rate_chart_id: entry?.rate_chart_id ?? "",
            surgery_rate: entry?.surgery_rate ?? "",
            description: entry?.description ?? "",
          }))
        : [],
      isFinalBilling: Boolean(billing?.isFinalBilling),
    };
  };

  const buildLineItemsPayload = (form) => {
    const roomQty = form.roomQty !== "" ? form.roomQty : 0;
    return [
      {
        item: "Surgery Rate",
        rate: toNumber(form.surgeryAmount),
        qty: 1,
        amount: toNumber(form.surgeryAmount),
        description: form.surgeryDescription || "",
      },
      {
        item: "Room Charges",
        rate: toNumber(form.roomRate),
        qty: toNumber(roomQty),
        amount: toNumber(form.roomAmount),
        description: form.roomDescription || "",
      },
      {
        item: "Doctor Charges",
        rate: toNumber(form.doctorRate),
        qty: toNumber(form.doctorQty),
        amount: toNumber(form.doctorAmount),
        description: form.doctorDescription || "",
      },
      {
        item: "Operation Theater Charges",
        rate: 0,
        qty: 1,
        amount: toNumber(form.otAmount),
        description: form.otDescription || "",
      },
      {
        item: "Other Charges",
        rate: 0,
        qty: 1,
        amount: toNumber(form.otherAmount),
        description: form.otherDescription || "",
      },
      {
        item: "Total Days",
        rate: 0,
        qty: toNumber(roomQty),
        amount: 0,
      },
    ];
  };

  const calculateTotalAmount = (form) => {
    const baseTotal =
      toNumber(form.surgeryAmount) +
      toNumber(form.roomAmount) +
      toNumber(form.doctorAmount) +
      toNumber(form.otAmount) +
      toNumber(form.otherAmount);
    const additionalTotal = (form.additionalAdmissions || []).reduce(
      (sum, entry) => sum + toNumber(entry.surgery_rate),
      0,
    );
    return baseTotal + additionalTotal;
  };

  useEffect(() => {
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;

    if (!username) {
      setLoadError("Missing login context. Please sign in again.");
      setIsLoading(false);
      return;
    }

    const fetchBillings = async () => {
      try {
        setIsLoading(true);

        const user = await get_Hospital_User_Login_Details(username);
        const resolvedCompanyId =
          user?.company_id || user?.companies?.[0]?.company_id;
        if (!resolvedCompanyId) {
          setLoadError("Missing company context. Please login again.");
          setIsLoading(false);
          return;
        }
        setCompanyId(resolvedCompanyId);

        const [billings, departments, rateCharts, payments] = await Promise.all(
          [
            getIpdBillings(resolvedCompanyId),
            getApprovedDepartments(resolvedCompanyId),
            getRateCharts(resolvedCompanyId),
            getIpdPayments(resolvedCompanyId),
          ],
        );

        const safePayments = Array.isArray(payments) ? payments : [];
        setPaymentRecords(safePayments);
        const paymentTotals = safePayments.reduce(
          (acc, payment) => {
            if (payment?.is_cancelled) return acc;
            const amount = Number(payment?.amount ?? 0);
            if (!Number.isFinite(amount)) return acc;
            const billingId = payment?.ipd_billing ?? null;
            const bookingId = payment?.ipd_booking ?? null;
            if (billingId) {
              acc.byBilling[billingId] =
                (acc.byBilling[billingId] || 0) + amount;
              return acc;
            }
            if (bookingId) {
              acc.byBooking[bookingId] =
                (acc.byBooking[bookingId] || 0) + amount;
            }
            return acc;
          },
          { byBilling: {}, byBooking: {} },
        );

        const rows = (Array.isArray(billings) ? billings : []).map(
          (billing) => {
            console.log(billing);

            const items = Array.isArray(billing?.line_items)
              ? billing.line_items
              : [];
            const totalDaysItem = items.find(
              (item) => item?.item === "Total Days",
            );
            const totalDaysValue =
              totalDaysItem?.qty !== undefined && totalDaysItem?.qty !== null
                ? totalDaysItem.qty
                : "—";
            const visibleItems = items.filter((item) => {
              const label = String(item?.item || "")
                .trim()
                .toLowerCase();
              if (!label) return true;
              if (label === "total days") return false;
              return !label.includes("reason for ipd admission");
            });
            const totalAmountValue = Number(billing?.total_amount);
            const totalAmount = Number.isFinite(totalAmountValue)
              ? totalAmountValue
              : 0;
            const billingNo =
              billing?.ipd_billing_no ??
              billing?.ipdBillingNo ??
              billing?.billing_no ??
              billing?.billingNo ??
              (billing?.id ? `#${billing.id}` : "-");
            const ipdBookingId =
              billing?.ipd_booking ??
              billing?.ipd_booking_id ??
              billing?.ipdBookingId ??
              billing?.ipd_booking?.id ??
              null;
            const bedId =
              billing?.bed ??
              billing?.bed_id ??
              billing?.bedId ??
              billing?.bed?.id ??
              null;
            const paymentReceivedValue =
              (paymentTotals.byBilling[billing.id] || 0) +
              (paymentTotals.byBooking[ipdBookingId] || 0);
            const netTotalAmount = totalAmount - paymentReceivedValue;
            const isPaymentSettled =
              billing.status === "PAID" || netTotalAmount <= 0;

            return {
              billingId: billing.id,
              billingNo,
              ipdBookingId,
              bedId,

              patientName: billing.patient_name || "—",
              insuranceProviderName: billing.insurance_provider_name || "—",
              mobile: billing.patient_mobile || "—",
              department: billing.department_name || "—",
              admissionReason: billing.rate_chart_name || "—",
              admissionDate: formatDate(billing.admission_date),
              ipdBookingCode: billing.ipd_booking_code || "—",
              wardName: billing.ward_name || "—",
              roomNo: billing.room_no || "—",
              bedNo: billing.bed_no || "—",
              totalAmount: formatAmount(totalAmount),
              totalAmountValue: totalAmount,
              totalCharges: formatAmount(netTotalAmount),
              totalChargesValue: netTotalAmount,
              paymentReceived: formatAmount(paymentReceivedValue),
              paymentReceivedValue,
              isPaymentSettled,
              totalDaysValue,
              items: visibleItems,
              rawItems: items,
              remarks: billing.remarks || "",
              additionalAdmissions: Array.isArray(billing.additional_admissions)
                ? billing.additional_admissions
                : [],
              isFinalBilling: Boolean(billing.is_final_billing),
            };
          },
        );

        setBillingRows(rows);
        setDepartmentOptions(Array.isArray(departments) ? departments : []);
        setRateChartOptions(Array.isArray(rateCharts) ? rateCharts : []);
        setLoadError(null);
      } catch (error) {
        console.error("Failed to load billings:", error);
        setLoadError("Unable to load billing data right now.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillings();
  }, []);

  const openEditModal = (billing, viewOnly = false) => {
    setEditingBilling(billing);
    setEditForm(buildEditForm(billing));
    setEditError(null);
    setIsViewOnly(viewOnly);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    if (isSaving) return;
    setIsEditOpen(false);
    setEditingBilling(null);
    setEditForm(null);
    setEditError(null);
    setIsViewOnly(false);
    setIsPaymentsModalOpen(false);
  };

  const handleEditFieldChange = (field, value) => {
    setEditForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "roomRate" || field === "roomQty") {
        const rate = toNumber(field === "roomRate" ? value : next.roomRate);
        const qty = toNumber(field === "roomQty" ? value : next.roomQty);
        next.roomAmount = rate * qty;
      }
      if (field === "doctorRate" || field === "doctorQty") {
        const rate = toNumber(field === "doctorRate" ? value : next.doctorRate);
        const qty = toNumber(field === "doctorQty" ? value : next.doctorQty);
        next.doctorAmount = rate * qty;
      }
      return next;
    });
  };

  const handleAddAdmissionRow = () => {
    setEditForm((prev) => ({
      ...prev,
      additionalAdmissions: [
        ...(prev.additionalAdmissions || []),
        {
          id: `extra-${Date.now()}`,
          department_id: "",
          rate_chart_id: "",
          surgery_rate: "",
          description: "",
        },
      ],
    }));
  };

  const handleRemoveAdmissionRow = (entryId) => {
    setEditForm((prev) => ({
      ...prev,
      additionalAdmissions: (prev.additionalAdmissions || []).filter(
        (entry) => entry.id !== entryId,
      ),
    }));
  };

  const handleAdmissionFieldChange = (entryId, field, value) => {
    setEditForm((prev) => ({
      ...prev,
      additionalAdmissions: (prev.additionalAdmissions || []).map((entry) => {
        if (entry.id !== entryId) return entry;
        if (field === "department_id") {
          return {
            ...entry,
            department_id: value,
            rate_chart_id: "",
            surgery_rate: "",
          };
        }
        if (field === "rate_chart_id") {
          const chart = rateChartOptions.find(
            (option) => String(option.id) === String(value),
          );
          return {
            ...entry,
            rate_chart_id: value,
            surgery_rate: chart?.fixed_amount ?? "",
          };
        }
        return {
          ...entry,
          [field]: value,
        };
      }),
    }));
  };

  const handleSaveBilling = async () => {
    if (!editingBilling || !editForm || !companyId) return;
    try {
      setIsSaving(true);
      setEditError(null);
      const lineItems = buildLineItemsPayload(editForm);
      const totalAmount = calculateTotalAmount(editForm);
      const payload = {
        line_items: lineItems,
        total_amount: totalAmount,
        remarks: editForm.remarks || "",
        is_final_billing: Boolean(editForm.isFinalBilling),
        additional_admissions: (editForm.additionalAdmissions || []).map(
          (entry) => ({
            department_id: entry.department_id,
            rate_chart_id: entry.rate_chart_id,
            surgery_rate: toNumber(entry.surgery_rate),
            description: entry.description || "",
          }),
        ),
      };
      const updated = await updateIpdBilling(
        editingBilling.billingId,
        payload,
        companyId,
      );
      if (payload.is_final_billing) {
        const finalUpdates = [];
        if (editingBilling.ipdBookingId) {
          finalUpdates.push(
            updateIpdBooking(
              editingBilling.ipdBookingId,
              { status: "DISCHARGED" },
              companyId,
            ),
          );
        }
        if (editingBilling.bedId) {
          finalUpdates.push(
            updateBedRecord(
              editingBilling.bedId,
              { status: "AVAILABLE", is_available: true },
              companyId,
            ),
          );
        }
        if (finalUpdates.length > 0) {
          await Promise.all(finalUpdates);
        }
      }
      setBillingRows((prev) =>
        prev.map((row) =>
          row.billingId === editingBilling.billingId
            ? {
                ...row,
                rawItems: Array.isArray(updated.line_items)
                  ? updated.line_items
                  : row.rawItems,
                items: Array.isArray(updated.line_items)
                  ? updated.line_items.filter((item) => {
                      const label = String(item?.item || "")
                        .trim()
                        .toLowerCase();
                      if (!label) return true;
                      if (label === "total days") return false;
                      return !label.includes("reason for ipd admission");
                    })
                  : row.items,
                totalAmount: formatAmount(updated.total_amount),
                totalAmountValue: toNumber(updated.total_amount),
                totalCharges: formatAmount(
                  toNumber(updated.total_amount) -
                    toNumber(row.paymentReceivedValue),
                ),
                totalChargesValue:
                  toNumber(updated.total_amount) -
                  toNumber(row.paymentReceivedValue),
                isPaymentSettled:
                  updated.status === "PAID" ||
                  toNumber(updated.total_amount) -
                    toNumber(row.paymentReceivedValue) <=
                    0,
                remarks: updated.remarks || "",
                isFinalBilling: Boolean(updated.is_final_billing),
                additionalAdmissions: Array.isArray(
                  updated.additional_admissions,
                )
                  ? updated.additional_admissions
                  : [],
              }
            : row,
        ),
      );
      closeEditModal();
    } catch (error) {
      console.error("Failed to update billing:", error);
      setEditError("Unable to save billing right now.");
    } finally {
      setIsSaving(false);
    }
  };

  const isLocked = Boolean(isViewOnly || editingBilling?.isFinalBilling);

  const filteredBillingRows = billingRows.filter((row) => {
    const query = patientSearch.trim().toLowerCase();
    if (!query) return true;
    return [row.patientName, row.mobile, row.billingNo]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
  const totalPages = Math.max(
    1,
    Math.ceil(filteredBillingRows.length / pageSize),
  );
  const pagedBillingRows = filteredBillingRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    if (actionMenuId === null) return;
    const handleClose = () => setActionMenuId(null);
    document.addEventListener("click", handleClose);
    return () => document.removeEventListener("click", handleClose);
  }, [actionMenuId]);

  useEffect(() => {
    if (actionMenuId === null) return;
    const handleClose = () => setActionMenuId(null);
    window.addEventListener("resize", handleClose);
    const scrollEl = tableScrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener("scroll", handleClose, { passive: true });
    }
    return () => {
      window.removeEventListener("resize", handleClose);
      if (scrollEl) {
        scrollEl.removeEventListener("scroll", handleClose);
      }
    };
  }, [actionMenuId]);

  const activeActionRow = useMemo(
    () => billingRows.find((row) => row.billingId === actionMenuId),
    [billingRows, actionMenuId],
  );

  const openActionMenu = (event, rowId, openUp) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const right = Math.max(12, window.innerWidth - rect.right);
    if (openUp) {
      setActionMenuPosition({
        right,
        bottom: Math.max(12, window.innerHeight - rect.top + 8),
        placement: "top",
      });
    } else {
      setActionMenuPosition({
        right,
        top: rect.bottom + 8,
        placement: "bottom",
      });
    }
    setActionMenuId((prev) => (prev === rowId ? null : rowId));
  };

  const billingPayments = paymentRecords.filter(
    (payment) =>
      payment?.ipd_billing_no_display === editingBilling?.billingNo &&
      !payment?.is_cancelled,
  );

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const originalBodyOverflow = body.style.overflow;
    const originalHtmlOverflow = html.style.overflow;
    const originalBodyHeight = body.style.height;
    const originalHtmlHeight = html.style.height;
    const main = document.querySelector("main");
    const originalMainOverflow = main?.style.overflowY;
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches;
    if (!isMobile) {
      body.style.overflow = "hidden";
      html.style.overflow = "hidden";
      body.style.height = "100%";
      html.style.height = "100%";
      if (main) {
        main.style.overflowY = "hidden";
      }
    }
    return () => {
      body.style.overflow = originalBodyOverflow;
      html.style.overflow = originalHtmlOverflow;
      body.style.height = originalBodyHeight;
      html.style.height = originalHtmlHeight;
      if (main) {
        main.style.overflowY = originalMainOverflow || "";
      }
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setExpandedBillingId(null);
  }, [patientSearch, billingRows.length]);

  useEffect(() => {
    if (!billingIdParam || openedFromParam || billingRows.length === 0) return;
    const match = billingRows.find(
      (row) => String(row.billingId) === String(billingIdParam),
    );
    if (match) {
      openEditModal(match, true);
      setOpenedFromParam(true);
    }
  }, [billingIdParam, billingRows, openedFromParam]);

  const handlePaymentReceipt = (row) => {
    if (!row.ipdBookingId) return;
    const numericDueCharges = Number.isFinite(row.totalChargesValue)
      ? row.totalChargesValue
      : Number(String(row.totalCharges || "").replace(/[^0-9.-]+/g, ""));
    const query = new URLSearchParams({
      ipdBookingId: String(row.ipdBookingId),
      ipdBillingNo: row.billingNo || "",
      openModal: "1",
    });
    if (Number.isFinite(numericDueCharges)) {
      query.set("dueCharges", String(numericDueCharges));
    } else if (row.totalCharges) {
      query.set("dueChargesLabel", String(row.totalCharges));
    }
    router.push(`/administration_dashboard/ipd-payment-list?${query}`);
  };

  return (
    <div className="h-full min-h-0 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 py-6">
      <div className="mx-auto w-full max-w-full space-y-6 px-2 md:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-xl">
          {/* <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-indigo-400/10 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </div> */}
          <div className="relative flex flex-col gap-0 md:flex-row md:items-center md:justify-between">
            <div>
              {/* <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">
                Administration
              </div> */}
              <h1 className="mt-2 text-xl font-semibold md:text-2xl">
                Billing Overview
              </h1>
              {/* <p className="mt-1 text-xs text-slate-200">
                Review billing items, track dues, and reconcile payments.
              </p> */}
            </div>
            <div className="w-full md:w-80">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-1">
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(event) => setPatientSearch(event.target.value)}
                  placeholder="Search by patient or mobile..."
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-1.5 text-sm text-white placeholder:text-slate-200/70 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
            </div>
          </div>
        </div>

        {loadError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {loadError}
          </div>
        )}

        <div className="w-full overflow-visible rounded-3xl border border-slate-100 bg-white shadow">
          <div
            ref={tableScrollRef}
            className="w-full max-h-[65vh] overflow-x-auto overflow-y-auto"
          >
            <table className="w-full min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="w-10 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    SL No.
                  </th>
                  <th className="w-10 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    IPD Billing No.
                  </th>
                  <th className="w-64 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Patient Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Mobile No.
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Department
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reason For IPD Admission
                  </th>
                  {/* ✅ NEW COLUMN */}
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Admission Date
                  </th>
                  <th className="min-w-[220px] px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    &nbsp;
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    &nbsp;
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    &nbsp;
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total Charges
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total Payment Received
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Due Amount
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={15}
                      className="px-4 py-6 text-center text-sm text-slate-500"
                    >
                      Loading billing data...
                    </td>
                  </tr>
                ) : filteredBillingRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={15}
                      className="px-4 py-6 text-center text-sm text-slate-500"
                    >
                      No billing records found.
                    </td>
                  </tr>
                ) : (
                  pagedBillingRows.flatMap((row, index) => {
                    const isExpanded = expandedBillingId === row.billingId;
                    const openMenuUp = index >= pagedBillingRows.length - 2;
                    const toggleRow = (
                      <tr
                        key={`billing-${row.billingId}`}
                        className="bg-white hover:bg-slate-50"
                        onDoubleClick={() => {
                          setExpandedBillingId((prev) =>
                            prev === row.billingId ? null : row.billingId,
                          );
                        }}
                      >
                        <td className="w-64 px-4 py-2 text-sm font-medium text-slate-900">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td className="w-64 px-4 py-2 text-sm font-medium text-slate-900">
                          {row.billingNo}
                        </td>
                        <td className="w-64 px-4 py-2 text-sm font-medium text-slate-900">
                          {row.patientName}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-700">
                          {row.mobile}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-slate-900">
                          {row.department}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-700">
                          {row.admissionReason}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-700">
                          {row.admissionDate}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-400">—</td>
                        <td className="px-4 py-2 text-right text-sm text-slate-400">
                          —
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-slate-400">
                          —
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-semibold text-slate-800">
                          {row.totalAmount}
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-slate-700">
                          {row.paymentReceived}
                        </td>
                        <td
                          className={`px-4 py-2 text-right text-sm font-semibold ${
                            getDueAmountTone(row.totalChargesValue) ===
                            "positive"
                              ? "text-emerald-600"
                              : getDueAmountTone(row.totalChargesValue) ===
                                  "negative"
                                ? "text-red-600"
                                : "text-slate-600"
                          }`}
                        >
                          {row.totalCharges}
                        </td>
                        <td className="px-4 py-2 text-center text-sm">
                          {row.isPaymentSettled ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 p-2 text-emerald-600">
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-4 w-4"
                              >
                                <path d="M6 12.5l3.5 3.5L18 7.5" />
                                <path d="M4 12.5l3.5 3.5L16 7.5" />
                              </svg>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center rounded-full bg-amber-100 p-2 text-amber-600">
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-4 w-4"
                              >
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v5l3 2" />
                              </svg>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                          <div className="relative flex items-center justify-end">
                            <button
                              type="button"
                              aria-label="More actions"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                              onClick={(event) =>
                                openActionMenu(event, row.billingId, openMenuUp)
                              }
                            >
                              ...
                            </button>
                          </div>
                        </td>
                      </tr>
                    );

                    const lineRows = isExpanded
                      ? [
                          <tr
                            key={`billing-${row.billingId}-line-header`}
                            className="bg-slate-200/80 text-xs font-semibold uppercase tracking-wide text-slate-600"
                          >
                            <td colSpan={15} className="px-0">
                              <div className="grid grid-cols-4 gap-4 px-6 py-2">
                                <div>Item</div>
                                <div className="text-right">Rate</div>
                                <div className="text-right">Qty/Days</div>
                                <div className="text-right">Amount</div>
                              </div>
                            </td>
                          </tr>,
                          ...(() => {
                            const baseItems = row.items.length
                              ? row.items
                              : [null];
                            const additionalRows = (
                              row.additionalAdmissions || []
                            ).map((entry) => {
                              const chart = rateChartOptions.find(
                                (option) =>
                                  String(option.id) ===
                                  String(entry.rate_chart_id),
                              );
                              const label = chart?.name
                                ? `Reason For IPD Admission - ${chart.name}`
                                : "Reason For IPD Admission";
                              return {
                                item: label,
                                rate: 0,
                                qty: 1,
                                amount: entry.surgery_rate ?? 0,
                                _extraKey: `${row.billingId}-${entry.rate_chart_id}`,
                              };
                            });
                            const otherIndex = baseItems.findIndex(
                              (item) => item?.item === "Other Charges",
                            );
                            if (additionalRows.length && otherIndex !== -1) {
                              const before = baseItems.slice(0, otherIndex + 1);
                              const after = baseItems.slice(otherIndex + 1);
                              return [...before, ...additionalRows, ...after];
                            }
                            return [...baseItems, ...additionalRows];
                          })().map((item, index) => {
                            const lineItem = item?.item || "—";
                            const lineDescription = item?.description || "";
                            const lineRate = formatAmount(item?.rate ?? 0);
                            const lineQty =
                              item?.item === "Room Charges"
                                ? row.totalDaysValue
                                : item?.qty !== undefined && item?.qty !== null
                                  ? item.qty
                                  : "—";
                            const lineAmount = formatAmount(item?.amount ?? 0);
                            return (
                              <tr
                                key={
                                  item?._extraKey
                                    ? `billing-${row.billingId}-line-extra-${item._extraKey}`
                                    : `billing-${row.billingId}-line-${index}`
                                }
                                className="bg-slate-100/90"
                              >
                                <td colSpan={15} className="px-0">
                                  <div className="grid grid-cols-4 gap-4 px-6 py-3 text-sm text-slate-800">
                                    <div>
                                      <div>{lineItem}</div>
                                      {lineDescription && (
                                        <div className="mt-1 text-xs text-slate-500">
                                          {lineDescription}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-right">{lineRate}</div>
                                    <div className="text-right">{lineQty}</div>
                                    <div className="text-right">
                                      {lineAmount}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          }),
                          <tr
                            key={`billing-${row.billingId}-line-total`}
                            className="bg-slate-50/70"
                          >
                            <td colSpan={15} className="px-0">
                              <div className="grid grid-cols-4 gap-4 px-6 py-3 text-sm font-semibold text-slate-800">
                                <div className="col-span-3 text-right">
                                  Total Charges
                                </div>
                                <div className="text-right border-t border-b border-slate-600 pt-1">
                                  {row.totalCharges}
                                </div>
                              </div>
                            </td>
                          </tr>,
                        ]
                      : [];

                    return [toggleRow, ...lineRows];
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {actionMenuId !== null &&
          actionMenuPosition &&
          activeActionRow &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed z-50 w-44 rounded-lg border border-slate-200 bg-white py-1 text-left text-sm shadow-lg"
              style={{
                right: actionMenuPosition.right,
                top: actionMenuPosition.top,
                bottom: actionMenuPosition.bottom,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setActionMenuId(null);
                  openEditModal(activeActionRow, true);
                }}
              >
                Review
              </button>
              <button
                type="button"
                className={`w-full px-4 py-2 text-left ${
                  activeActionRow.isFinalBilling
                    ? "cursor-not-allowed text-slate-300"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => {
                  if (activeActionRow.isFinalBilling) return;
                  setActionMenuId(null);
                  openEditModal(activeActionRow);
                }}
                disabled={activeActionRow.isFinalBilling}
              >
                Edit
              </button>
              <button
                type="button"
                className={`w-full px-4 py-2 text-left ${
                  activeActionRow.ipdBookingId &&
                  !activeActionRow.isPaymentSettled
                    ? "text-slate-700 hover:bg-slate-50"
                    : "cursor-not-allowed text-slate-300"
                }`}
                onClick={() => {
                  if (
                    !activeActionRow.ipdBookingId ||
                    activeActionRow.isPaymentSettled
                  ) {
                    return;
                  }
                  setActionMenuId(null);
                  handlePaymentReceipt(activeActionRow);
                }}
                disabled={
                  !activeActionRow.ipdBookingId ||
                  activeActionRow.isPaymentSettled
                }
              >
                Payment Receipt
              </button>
            </div>,
            document.body,
          )}
        {filteredBillingRows.length > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs text-slate-600 shadow sm:flex-row sm:items-center sm:justify-between sm:text-sm">
            <span className="text-center sm:text-left">
              Showing{" "}
              {Math.min(
                (currentPage - 1) * pageSize + 1,
                filteredBillingRows.length,
              )}{" "}
              to {Math.min(currentPage * pageSize, filteredBillingRows.length)}{" "}
              of {filteredBillingRows.length} entries
            </span>
            <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-end">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition sm:text-sm ${
                  currentPage === 1
                    ? "cursor-not-allowed border-slate-200 text-slate-300"
                    : "border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNumber = idx + 1;
                return (
                  <button
                    key={`page-${pageNumber}`}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`h-8 w-8 rounded-full text-xs font-semibold transition sm:h-9 sm:w-9 sm:text-sm ${
                      pageNumber === currentPage
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition sm:text-sm ${
                  currentPage === totalPages
                    ? "cursor-not-allowed border-slate-200 text-slate-300"
                    : "border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {isEditOpen && editForm && editingBilling && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 sm:items-center">
            <div className="flex w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl sm:max-h-[92vh] sm:overflow-hidden">
              <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Invoice
                  </p>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Estimated charges overview
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>
                      Patient:{" "}
                      <span className="font-semibold text-slate-700">
                        {editingBilling.patientName || "—"}
                      </span>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span>
                      Billing ID:{" "}
                      <span className="font-semibold text-slate-700">
                        {editingBilling.billingNo || "—"}
                      </span>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span>
                      Insurance Provider:{" "}
                      <span className="font-semibold text-slate-700">
                        {editingBilling.insuranceProviderName || "—"}
                      </span>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-full cursor-pointer p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  disabled={isSaving}
                >
                  <span className="text-lg">&times;</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-6 py-4 text-xs text-slate-600">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                  IPD Booking ID: {editingBilling.ipdBookingCode || "—"}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                  Department: {editingBilling.department || "—"}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                  Ward: {editingBilling.wardName || "—"}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                  Room: {editingBilling.roomNo || "—"}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                  Bed: {editingBilling.bedNo || "—"}
                </span>
                <label className="ml-auto flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.isFinalBilling}
                    onChange={(event) =>
                      handleEditFieldChange(
                        "isFinalBilling",
                        event.target.checked,
                      )
                    }
                    disabled={isLocked}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  />
                  Final Billing
                </label>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                  <div className="grid grid-cols-4 gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <div>Item</div>
                    <div className="text-right">Rate</div>
                    <div className="text-right">Qty/Days</div>
                    <div className="text-right">Amount</div>
                  </div>

                  <div className="divide-y divide-slate-100 text-sm text-slate-800">
                    <div className="grid grid-cols-4 items-center gap-4 px-5 py-4">
                      <div className="font-medium">Surgery Rate</div>
                      <div className="text-right text-slate-400">—</div>
                      <div className="text-right text-slate-600">1</div>
                      <div className="text-right">
                        <input
                          type="number"
                          value={editForm.surgeryAmount}
                          onChange={(event) =>
                            handleEditFieldChange(
                              "surgeryAmount",
                              event.target.value,
                            )
                          }
                          className="no-number-spin w-full max-w-[160px] rounded-full border border-slate-200 px-4 py-2 text-right text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          disabled={isLocked}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4 px-5 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Description
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={editForm.surgeryDescription}
                          onChange={(event) =>
                            handleEditFieldChange(
                              "surgeryDescription",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                          placeholder="Description"
                          disabled={isLocked}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4 px-5 py-4">
                      <div className="font-medium">Room Charges</div>
                      <div className="text-right">
                        <input
                          type="number"
                          value={editForm.roomRate}
                          onChange={(event) =>
                            handleEditFieldChange(
                              "roomRate",
                              event.target.value,
                            )
                          }
                          className="no-number-spin w-full max-w-[160px] rounded-full border border-slate-200 px-4 py-2 text-right text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          disabled={isLocked}
                        />
                      </div>
                      <div className="text-right">
                        <input
                          type="number"
                          value={editForm.roomQty}
                          onChange={(event) =>
                            handleEditFieldChange("roomQty", event.target.value)
                          }
                          className="no-number-spin w-full max-w-[160px] rounded-full border border-slate-200 px-4 py-2 text-right text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                          placeholder="Total Days"
                          min="0"
                          step="1"
                          disabled={isLocked}
                        />
                      </div>
                      <div className="text-right">
                        <input
                          type="number"
                          value={editForm.roomAmount}
                          readOnly
                          className="no-number-spin w-full max-w-[160px] rounded-full border border-slate-200 px-4 py-2 text-right text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          disabled={isLocked}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4 px-5 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Description
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={editForm.roomDescription}
                          onChange={(event) =>
                            handleEditFieldChange(
                              "roomDescription",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                          placeholder="Description"
                          disabled={isLocked}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4 px-5 py-4">
                      <div className="font-medium">Doctor Charges</div>
                      <div className="text-right">
                        <input
                          type="number"
                          value={editForm.doctorRate}
                          onChange={(event) =>
                            handleEditFieldChange(
                              "doctorRate",
                              event.target.value,
                            )
                          }
                          className="no-number-spin w-full max-w-[160px] rounded-full border border-slate-200 px-4 py-2 text-right text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          disabled={isLocked}
                        />
                      </div>
                      <div className="text-right">
                        <input
                          type="number"
                          value={editForm.doctorQty}
                          onChange={(event) =>
                            handleEditFieldChange(
                              "doctorQty",
                              event.target.value,
                            )
                          }
                          className="no-number-spin w-full max-w-[160px] rounded-full border border-slate-200 px-4 py-2 text-right text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                          placeholder="Total Visits"
                          min="0"
                          step="1"
                          disabled={isLocked}
                        />
                      </div>
                      <div className="text-right">
                        <input
                          type="number"
                          value={editForm.doctorAmount}
                          readOnly
                          className="no-number-spin w-full max-w-[160px] rounded-full border border-slate-200 px-4 py-2 text-right text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          disabled={isLocked}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4 px-5 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Description
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={editForm.doctorDescription}
                          onChange={(event) =>
                            handleEditFieldChange(
                              "doctorDescription",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                          placeholder="Description"
                          disabled={isLocked}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4 px-5 py-4">
                      <div className="font-medium">
                        Operation Theater Charges
                      </div>
                      <div className="text-right text-slate-400">—</div>
                      <div className="text-right text-slate-400">—</div>
                      <div className="text-right">
                        <input
                          type="number"
                          value={editForm.otAmount}
                          onChange={(event) =>
                            handleEditFieldChange(
                              "otAmount",
                              event.target.value,
                            )
                          }
                          className="no-number-spin w-full max-w-[160px] rounded-full border border-slate-200 px-4 py-2 text-right text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          disabled={isLocked}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4 px-5 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Description
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={editForm.otDescription}
                          onChange={(event) =>
                            handleEditFieldChange(
                              "otDescription",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                          placeholder="Description"
                          disabled={isLocked}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4 px-5 py-4">
                      <div className="font-medium">Other Charges</div>
                      <div className="text-right text-slate-400">—</div>
                      <div className="text-right text-slate-400">—</div>
                      <div className="text-right">
                        <input
                          type="number"
                          value={editForm.otherAmount}
                          onChange={(event) =>
                            handleEditFieldChange(
                              "otherAmount",
                              event.target.value,
                            )
                          }
                          className="w-full max-w-[160px] rounded-full border border-slate-200 px-4 py-2 text-right text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          disabled={isLocked}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4 px-5 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Description
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={editForm.otherDescription}
                          onChange={(event) =>
                            handleEditFieldChange(
                              "otherDescription",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                          placeholder="Description"
                          disabled={isLocked}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Add Further Charges
                          </p>
                          <p className="text-xs text-slate-500">
                            Add more surgery entries below.
                          </p>
                        </div>
                        {!isLocked && (
                          <button
                            type="button"
                            onClick={handleAddAdmissionRow}
                            className="rounded-full cursor-pointer border border-slate-200 px-4 py-2 text-xs font-semibold  tracking-wide text-slate-700 transition hover:border-slate-300"
                          >
                            Add New
                          </button>
                        )}
                      </div>
                      <div className="mt-4 space-y-3">
                        <div className="hidden text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[1.2fr_1.4fr_0.8fr_auto] md:gap-3">
                          <div>Department</div>
                          <div>Reason For IPD Admission</div>
                          <div className="text-right">Surgery Rate</div>
                          <div className="text-right">Action</div>
                        </div>
                        {(editForm.additionalAdmissions || []).length === 0 && (
                          <p className="text-xs text-slate-400">
                            No additional admissions added.
                          </p>
                        )}
                        {(editForm.additionalAdmissions || []).map((entry) => {
                          const departmentId = entry.department_id;
                          const filteredCharts = rateChartOptions.filter(
                            (chart) =>
                              String(chart?.department) ===
                              String(departmentId),
                          );
                          return (
                            <div key={entry.id} className="grid gap-3">
                              <div className="grid gap-3 md:grid-cols-[1.2fr_1.4fr_0.8fr_auto]">
                                <select
                                  value={entry.department_id}
                                  onChange={(event) =>
                                    handleAdmissionFieldChange(
                                      entry.id,
                                      "department_id",
                                      event.target.value,
                                    )
                                  }
                                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-300 focus:outline-none"
                                  disabled={isLocked}
                                >
                                  <option value="">Select department</option>
                                  {departmentOptions.map((department) => (
                                    <option
                                      key={department.id}
                                      value={department.id}
                                    >
                                      {department.name}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={entry.rate_chart_id}
                                  onChange={(event) =>
                                    handleAdmissionFieldChange(
                                      entry.id,
                                      "rate_chart_id",
                                      event.target.value,
                                    )
                                  }
                                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-300 focus:outline-none"
                                  disabled={isLocked || !entry.department_id}
                                >
                                  <option value="">
                                    {entry.department_id
                                      ? "Select reason for IPD admission"
                                      : "Select department first"}
                                  </option>
                                  {filteredCharts.map((chart) => (
                                    <option key={chart.id} value={chart.id}>
                                      {chart.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  value={entry.surgery_rate}
                                  readOnly
                                  className="no-number-spin rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm text-slate-700"
                                  placeholder="Surgery rate"
                                />
                                {!isLocked && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveAdmissionRow(entry.id)
                                    }
                                    className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                                    aria-label="Remove admission"
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    >
                                      <path d="M18 6L6 18" />
                                      <path d="M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Description
                                </div>
                                <input
                                  type="text"
                                  value={entry.description}
                                  onChange={(event) =>
                                    handleAdmissionFieldChange(
                                      entry.id,
                                      "description",
                                      event.target.value,
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-300 focus:outline-none"
                                  placeholder="Description"
                                  disabled={isLocked}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-800">
                      <div className="col-span-2 text-left">
                        {`${numberToWords(
                          calculateTotalAmount(editForm),
                        )} Only`}
                      </div>
                      <div className="col-span-2 flex flex-col items-end gap-2 text-xs font-semibold text-slate-500">
                        <div className="flex items-center justify-end gap-3">
                          <span className="uppercase tracking-wide">
                            Total Charges
                          </span>
                          <input
                            type="text"
                            readOnly
                            value={formatWithCommas(
                              calculateTotalAmount(editForm),
                            )}
                            className="w-full max-w-[160px] rounded-full border border-slate-200 bg-white px-4 py-2 text-right text-slate-900 shadow-sm"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-3">
                          <span className="uppercase tracking-wide">
                            Total Payment Received
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsPaymentsModalOpen(true)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700"
                            aria-label="View payment details"
                          >
                            👁
                          </button>
                          <input
                            type="text"
                            readOnly
                            value={formatWithCommas(
                              toNumber(editingBilling?.paymentReceivedValue),
                            )}
                            className="w-full max-w-[160px] rounded-full border border-slate-200 bg-white px-4 py-2 text-right text-slate-900 shadow-sm"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-3">
                          <span className="uppercase tracking-wide">
                            Due Amount
                          </span>
                          {(() => {
                            const dueAmount =
                              calculateTotalAmount(editForm) -
                              toNumber(editingBilling?.paymentReceivedValue);
                            const dueTone = getDueAmountTone(dueAmount);
                            return (
                              <input
                                type="text"
                                readOnly
                                value={formatWithCommas(dueAmount)}
                                className={`w-full max-w-[160px] rounded-full border px-4 py-2 text-right shadow-sm ${
                                  dueTone === "positive"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : dueTone === "negative"
                                      ? "border-red-200 bg-red-50 text-red-700"
                                      : "border-slate-200 bg-white text-slate-600"
                                }`}
                              />
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>Save this billing to store the estimated charges.</span>
                  {editError && (
                    <span className="text-red-600">{editError}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-full cursor-pointer border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                {!isLocked && (
                  <button
                    type="button"
                    onClick={handleSaveBilling}
                    className="rounded-full bg-slate-900 cursor-pointer px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800"
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Billing"}
                  </button>
                )}
              </div>
              <style jsx global>{`
                .no-number-spin::-webkit-inner-spin-button,
                .no-number-spin::-webkit-outer-spin-button {
                  -webkit-appearance: none;
                  margin: 0;
                }
                .no-number-spin {
                  -moz-appearance: textfield;
                  appearance: textfield;
                }
              `}</style>
            </div>
          </div>
        )}
        {isPaymentsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 sm:items-center">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Payment Received
                  </h3>
                  <p className="text-xs text-slate-500">
                    IPD Billing No: {editingBilling?.billingNo || "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPaymentsModalOpen(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <span className="text-lg">&times;</span>
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                {billingPayments.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No payments recorded for this billing yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {billingPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                      >
                        <div className="min-w-[140px]">
                          <div className="text-xs uppercase text-slate-400">
                            Receipt
                          </div>
                          <div className="font-semibold text-slate-800">
                            {payment.receipt_no || "—"}
                          </div>
                        </div>
                        <div className="min-w-[120px]">
                          <div className="text-xs uppercase text-slate-400">
                            Date
                          </div>
                          <div className="font-medium text-slate-700">
                            {formatDate(payment.payment_date)}
                          </div>
                        </div>
                        <div className="min-w-[120px]">
                          <div className="text-xs uppercase text-slate-400">
                            Mode
                          </div>
                          <div className="font-medium text-slate-700">
                            {payment.payment_mode || "—"}
                          </div>
                        </div>
                        <div className="min-w-[140px] text-right">
                          <div className="text-xs uppercase text-slate-400">
                            Amount
                          </div>
                          <div className="font-semibold text-emerald-600">
                            {formatWithCommas(payment.amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
      <BillingContent />
    </Suspense>
  );
}
