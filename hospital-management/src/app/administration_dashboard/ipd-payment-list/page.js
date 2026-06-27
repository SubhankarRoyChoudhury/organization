"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  get_Hospital_User_Login_Details,
  getIpdBookings,
  getIpdPayments,
  createIpdPayment,
  updateIpdPayment,
  getReceiptVoucherDebitAccounts,
  getReceiptVoucherCreditAccounts,
  generateReceiptVoucherId,
  createReceiptVoucher,
  getReceiptVoucherDetailsWithTransaction,
} from "@/app/api/apiService";

const TABLE_HEADERS = [
  { key: "id", label: "ID" },
  { key: "ipd_id", label: "IPD ID" },
  { key: "patient_name", label: "Patient Name" },
  { key: "ipd_billing_no", label: "IPD Billing No." },
  { key: "receipt_no", label: "Receipt No." },
  { key: "payment_stage", label: "Payment Stage" },
  { key: "payment_mode", label: "Payment Mode" },
  { key: "amount", label: "Amount" },
  { key: "due_amount", label: "Current Balance Payable" },
  { key: "reference_no", label: "Reference No." },
  { key: "remarks", label: "Remarks" },
  { key: "is_cancelled", label: "Is Cancelled" },
  { key: "payment_date", label: "Payment Date" },
  { key: "actions", label: "Action" },
  // { key: "created_by", label: "Created By" },
  // { key: "created_on", label: "Created On" },
];

const PAYMENT_STAGE_OPTIONS = ["ADVANCE", "INTERIM", "FINAL", "REFUND"];
const PAYMENT_MODE_OPTIONS = ["CASH", "CARD", "UPI", "BANK"];
const CALENDAR_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatAmount = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const parseAmount = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const parsed = Number(String(value).replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};
const mapPaymentModeToReceiptMethod = (paymentMode) => {
  const normalized = String(paymentMode || "").toUpperCase();
  if (normalized === "CASH") return "CASH";
  if (normalized === "CARD") return "CARD";
  if (normalized === "UPI" || normalized === "BANK") {
    return "ONLINE";
  }
  return "ONLINE";
};

const parseLocalISODate = (value) => {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day);
};

const toLocalISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (value) => {
  if (!value) return "";
  const date = parseLocalISODate(value) || new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDateInputValue = (value) => {
  if (!value) return "";
  const direct = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (direct) {
    return `${direct[1]}-${direct[2]}-${direct[3]}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toLocalISODate(date);
};

const getDefaultFormData = () => ({
  ipd_booking: "",
  payment_date: "",
  payment_stage: PAYMENT_STAGE_OPTIONS[0],
  payment_mode: PAYMENT_MODE_OPTIONS[0],
  amount: "",
  reference_no: "",
  remarks: "",
  room_rate: "",
  initial_deposit: "",
  due_payment: "",
});

const getDefaultReceiptVoucherForm = () => ({
  drAccount: "",
  crAccount: "",
  voucherDate: "",
  amount: "",
  method: "ONLINE",
  docNumber: "",
  description: "",
});

const TXN_ID_PREFIX = "Txn ID:";

const formatTxnIdDisplay = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.toLowerCase().startsWith("txn id:")
    ? text
    : `${TXN_ID_PREFIX} ${text}`;
};

const parseTxnIdInput = (value) => {
  const text = String(value || "");
  if (text.toLowerCase().startsWith("txn id:")) {
    return text.slice(TXN_ID_PREFIX.length).trimStart();
  }
  return text;
};

const numberToWords = (amount) => {
  if (!Number.isFinite(amount) || amount < 0) {
    return "Amount unavailable";
  }

  const ones = [
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

  const convertBelowHundred = (num) => {
    if (num < 20) return ones[num];
    const ten = Math.floor(num / 10);
    const unit = num % 10;
    return `${tens[ten]}${unit ? ` ${ones[unit]}` : ""}`.trim();
  };

  const convertBelowThousand = (num) => {
    if (num < 100) return convertBelowHundred(num);
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    return `${ones[hundred]} Hundred${rest ? ` ${convertBelowHundred(rest)}` : ""}`.trim();
  };

  const convert = (num) => {
    if (num === 0) return "Zero";

    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const hundred = num;

    const parts = [];
    if (crore) parts.push(`${convertBelowThousand(crore)} Crore`);
    if (lakh) parts.push(`${convertBelowThousand(lakh)} Lakh`);
    if (thousand) parts.push(`${convertBelowThousand(thousand)} Thousand`);
    if (hundred) parts.push(convertBelowThousand(hundred));

    return parts.join(" ").trim();
  };

  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  const rupeeWords = `${convert(rupees)} Rupees`;
  const paiseWords = paise ? ` and ${convert(paise)} Paise` : "";

  return `${rupeeWords}${paiseWords} Only`;
};

const buildReceiptVoucherDescription = (payment) => {
  if (!payment) return "";
  const patientName = payment.patient_name || "";
  const receiptNo = payment.receipt_no || "";
  return [
    patientName ? `Patient Name: ${patientName}` : "",
    receiptNo ? `Receipt No.: ${receiptNo}` : "",
  ]
    .filter(Boolean)
    .join(", ");
};

const resolveLinkedReceiptVoucherMeta = (paymentPayload) => {
  if (
    !paymentPayload ||
    typeof paymentPayload !== "object" ||
    Array.isArray(paymentPayload)
  ) {
    return null;
  }

  if (paymentPayload.receipt_voucher_table_id) {
    return paymentPayload;
  }

  for (const value of Object.values(paymentPayload)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      value.receipt_voucher_table_id
    ) {
      return value;
    }
  }
  return null;
};

const getLinkedReceiptVoucherTableId = (payment) => {
  const meta = resolveLinkedReceiptVoucherMeta(payment?.payment_payload);
  const raw = meta?.receipt_voucher_table_id;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const mergeReceiptVoucherIntoPaymentPayload = (payment, receiptMeta) => {
  const sourcePayload =
    payment?.payment_payload &&
    typeof payment.payment_payload === "object" &&
    !Array.isArray(payment.payment_payload)
      ? { ...payment.payment_payload }
      : {};

  const keyCandidates = [
    payment?.ipd_billing_no_display,
    payment?.ipd_billing_no,
    ...Object.keys(sourcePayload || {}),
  ].filter(Boolean);
  const payloadKey = keyCandidates[0] || "IPD_BILLING";

  const existingEntry =
    sourcePayload[payloadKey] &&
    typeof sourcePayload[payloadKey] === "object" &&
    !Array.isArray(sourcePayload[payloadKey])
      ? sourcePayload[payloadKey]
      : {};

  const baseEntry =
    Object.keys(existingEntry).length > 0
      ? existingEntry
      : {
          receipt_no: payment?.receipt_no || "",
          payment_date: getDateInputValue(payment?.payment_date),
          payment_stage: payment?.payment_stage || "",
          payment_mode: payment?.payment_mode || "",
          amount: Number(payment?.amount || 0),
          due_amount: Number(payment?.due_amount || 0),
          room_rate: Number(payment?.room_rate || 0),
          reference_no: payment?.reference_no || "",
          remarks: payment?.remarks || "",
          is_cancelled: Boolean(payment?.is_cancelled),
        };

  return {
    ...sourcePayload,
    [payloadKey]: {
      ...baseEntry,
      ...receiptMeta,
    },
  };
};

const buildYearOptions = (centerYear, span = 6) => {
  const years = [];
  for (let i = centerYear - span; i <= centerYear + span; i += 1) {
    years.push(i);
  }
  return years;
};

const buildCalendarDays = (monthDate) => {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startDay = monthStart.getDay();
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(monthStart.getDate() - startDay);

  const days = [];
  for (let i = 0; i < 42; i += 1) {
    const dayDate = new Date(calendarStart);
    dayDate.setDate(calendarStart.getDate() + i);
    days.push({
      iso: toLocalISODate(dayDate),
      label: dayDate.getDate(),
      inCurrentMonth: dayDate.getMonth() === monthDate.getMonth(),
    });
  }
  return days;
};

function IPDPaymentListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ipdBookingIdParam = searchParams?.get("ipdBookingId");
  const ipdBillingNoParam = searchParams?.get("ipdBillingNo");
  const openModalParam = searchParams?.get("openModal");
  const dueChargesParam = searchParams?.get("dueCharges");
  const dueChargesLabelParam = searchParams?.get("dueChargesLabel");
  const [companyId, setCompanyId] = useState(null);
  const [ipdBookings, setIpdBookings] = useState([]);
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [payments, setPayments] = useState([]);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [isPaymentCalendarVisible, setIsPaymentCalendarVisible] =
    useState(false);
  const [formData, setFormData] = useState(getDefaultFormData);
  const [paymentCalendarMonth, setPaymentCalendarMonth] = useState(() => {
    const seed = formData.payment_date
      ? new Date(formData.payment_date)
      : new Date();
    if (Number.isNaN(seed.getTime())) {
      return new Date();
    }
    return new Date(seed.getFullYear(), seed.getMonth(), 1);
  });
  const [paymentYearOptions] = useState(() =>
    buildYearOptions(new Date().getFullYear()),
  );
  const [formError, setFormError] = useState("");
  const [isReceiptVoucherOpen, setIsReceiptVoucherOpen] = useState(false);
  const [isReceiptVoucherEditMode, setIsReceiptVoucherEditMode] =
    useState(false);
  const [receiptSourcePayment, setReceiptSourcePayment] = useState(null);
  const [receiptVoucherTransactionId, setReceiptVoucherTransactionId] =
    useState(null);
  const [receiptVoucherForm, setReceiptVoucherForm] = useState(
    getDefaultReceiptVoucherForm,
  );
  const [receiptVoucherId, setReceiptVoucherId] = useState("");
  const [receiptDebitAccounts, setReceiptDebitAccounts] = useState([]);
  const [receiptCreditAccounts, setReceiptCreditAccounts] = useState([]);
  const [isReceiptBootstrapping, setIsReceiptBootstrapping] = useState(false);
  const [isReceiptSaving, setIsReceiptSaving] = useState(false);
  const [receiptFormError, setReceiptFormError] = useState("");
  const selectedBooking = ipdBookings.find(
    (booking) => String(booking.id) === String(formData.ipd_booking),
  );
  const rawRoomRate =
    selectedBooking && selectedBooking.room_rate !== undefined
      ? selectedBooking.room_rate
      : null;
  const parsedRoomRate =
    rawRoomRate !== null && rawRoomRate !== "" ? Number(rawRoomRate) : null;
  const formattedRoomRate =
    parsedRoomRate !== null && !Number.isNaN(parsedRoomRate)
      ? formatAmount(parsedRoomRate)
      : null;
  const bookingInitialDeposit =
    selectedBooking && selectedBooking.initial_deposit !== undefined
      ? Number(selectedBooking.initial_deposit)
      : null;
  const bookingDuePayment =
    selectedBooking && selectedBooking.due_payment !== undefined
      ? Number(selectedBooking.due_payment)
      : null;
  const formattedInitialDeposit =
    bookingInitialDeposit !== null && !Number.isNaN(bookingInitialDeposit)
      ? formatAmount(bookingInitialDeposit)
      : null;
  const formattedDuePayment =
    bookingDuePayment !== null && !Number.isNaN(bookingDuePayment)
      ? formatAmount(bookingDuePayment)
      : null;
  const dueChargesValue = dueChargesParam ? Number(dueChargesParam) : null;
  const formattedDueChargesParam =
    dueChargesValue !== null && Number.isFinite(dueChargesValue)
      ? formatAmount(dueChargesValue)
      : null;
  const isEditingPayment = Boolean(editingPayment?.id);
  const editingAmountValue = parseAmount(editingPayment?.amount);
  const editingDueValue = parseAmount(editingPayment?.due_amount);
  const editingBaseDueAmount =
    editingDueValue !== null
      ? editingDueValue + (editingAmountValue !== null ? editingAmountValue : 0)
      : null;
  const paymentDateDisplay = formatDateDisplay(formData.payment_date);
  const paymentCalendarDays = useMemo(
    () => buildCalendarDays(paymentCalendarMonth),
    [paymentCalendarMonth],
  );
  const paymentCalendarVisible = useMemo(() => {
    const firstIndex = paymentCalendarDays.findIndex(
      (day) => day.inCurrentMonth,
    );
    const currentMonthDays = paymentCalendarDays.filter(
      (day) => day.inCurrentMonth,
    );
    const leadingBlanks =
      firstIndex > 0 ? Array.from({ length: firstIndex }) : [];
    return { leadingBlanks, currentMonthDays };
  }, [paymentCalendarDays]);
  const handlePaymentCalendarNavigate = (direction) => {
    setPaymentCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
  };
  const handlePaymentCalendarMonthChange = (event) => {
    const nextMonth = Number(event.target.value);
    setPaymentCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(nextMonth);
      return next;
    });
  };
  const handlePaymentCalendarYearChange = (event) => {
    const nextYear = Number(event.target.value);
    setPaymentCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setFullYear(nextYear);
      return next;
    });
  };
  const handlePaymentCalendarSelect = (isoDate) => {
    setFormData((prev) => ({
      ...prev,
      payment_date: isoDate,
    }));
    setIsPaymentCalendarVisible(false);
  };
  const createBaseDueAmount = Number.isFinite(dueChargesValue)
    ? dueChargesValue
    : bookingDuePayment !== null && !Number.isNaN(bookingDuePayment)
      ? bookingDuePayment
      : parseAmount(dueChargesLabelParam);
  const baseDueAmount =
    isEditingPayment && editingBaseDueAmount !== null
      ? editingBaseDueAmount
      : createBaseDueAmount;
  const enteredAmount = parseAmount(formData.amount) ?? 0;
  const remainingDueAmount = Number.isFinite(baseDueAmount)
    ? Math.max(0, baseDueAmount - enteredAmount)
    : null;
  const dueAmountPayload =
    remainingDueAmount !== null
      ? remainingDueAmount
      : (parseAmount(dueChargesLabelParam) ??
        parseAmount(formattedDueChargesParam) ??
        editingDueValue);
  const dueChargesDisplay =
    remainingDueAmount !== null
      ? formatAmount(remainingDueAmount)
      : isEditingPayment && editingDueValue !== null
        ? formatAmount(editingDueValue)
        : formattedDueChargesParam ||
          dueChargesLabelParam ||
          formattedDuePayment;
  const modalBillingNo = isEditingPayment
    ? editingPayment?.ipd_billing_no_display ||
      editingPayment?.ipd_billing_no ||
      ipdBillingNoParam
    : ipdBillingNoParam;
  const modalDueChargesDisplay = dueChargesDisplay;
  const filteredPayments = ipdBookingIdParam
    ? payments.filter(
        (payment) => String(payment.ipd_booking) === String(ipdBookingIdParam),
      )
    : payments;
  const searchValue = paymentSearch.trim().toLowerCase();
  const visiblePayments = searchValue
    ? filteredPayments.filter((payment) => {
        const ipdCode =
          payment.ipd_booking_code ||
          (payment.ipd_booking ? `IPD-${payment.ipd_booking}` : "");
        return [ipdCode, payment.patient_name, payment.ipd_billing_no_display]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchValue));
      })
    : filteredPayments;
  const activeActionPayment = openActionMenu
    ? payments.find((payment) => payment.id === openActionMenu.id)
    : null;
  const activeActionLinkedReceiptVoucherTableId =
    getLinkedReceiptVoucherTableId(activeActionPayment);
  const receiptAmountInWords = useMemo(
    () => numberToWords(Number(receiptVoucherForm.amount) || 0),
    [receiptVoucherForm.amount],
  );

  useEffect(() => {
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (username) {
      fetchUserDetails(username);
    } else {
      setBookingError("Please login to load IPD bookings.");
    }
  }, []);

  const handleOpenReceiptVoucher = (payment) => {
    if (!payment) return;
    setOpenActionMenu(null);
    setReceiptSourcePayment(payment);
    const linkedVoucherTableId = getLinkedReceiptVoucherTableId(payment);

    if (linkedVoucherTableId) {
      setIsReceiptVoucherEditMode(true);
      setReceiptVoucherTransactionId(null);
      setReceiptVoucherForm(getDefaultReceiptVoucherForm());
      setReceiptVoucherId("");
      setReceiptFormError("");
      setIsReceiptVoucherOpen(true);
      return;
    }

    const paymentDate = getDateInputValue(payment.payment_date);
    const amount = parseAmount(payment.amount);
    setIsReceiptVoucherEditMode(false);
    setReceiptVoucherTransactionId(null);
    setReceiptVoucherForm({
      drAccount: "",
      crAccount: "",
      voucherDate: paymentDate || new Date().toISOString().split("T")[0],
      amount: amount !== null && Number.isFinite(amount) ? String(amount) : "",
      method: mapPaymentModeToReceiptMethod(payment.payment_mode),
      docNumber: payment.reference_no || "",
      description: buildReceiptVoucherDescription(payment),
    });
    setReceiptVoucherId("");
    setReceiptFormError("");
    setIsReceiptVoucherOpen(true);
  };

  const handleCloseReceiptVoucherModal = () => {
    if (isReceiptSaving) return;
    setIsReceiptVoucherOpen(false);
    setIsReceiptVoucherEditMode(false);
    setReceiptSourcePayment(null);
    setReceiptVoucherTransactionId(null);
    setReceiptVoucherForm(getDefaultReceiptVoucherForm());
    setReceiptVoucherId("");
    setReceiptDebitAccounts([]);
    setReceiptCreditAccounts([]);
    setReceiptFormError("");
  };

  const handleReceiptVoucherFieldChange = (name, value) => {
    setReceiptVoucherForm((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (!companyId) return;
    fetchIpdBookings(companyId);
    fetchPayments(companyId);
  }, [companyId]);

  useEffect(() => {
    if (!isReceiptVoucherOpen || !companyId) return;

    let isMounted = true;
    const bootstrapReceiptVoucher = async () => {
      setIsReceiptBootstrapping(true);
      setReceiptFormError("");
      try {
        const [debitAccounts, creditAccounts] = await Promise.all([
          getReceiptVoucherDebitAccounts(),
          getReceiptVoucherCreditAccounts(),
        ]);
        if (!isMounted) return;
        setReceiptDebitAccounts(
          Array.isArray(debitAccounts) ? debitAccounts : [],
        );
        setReceiptCreditAccounts(
          Array.isArray(creditAccounts) ? creditAccounts : [],
        );

        if (isReceiptVoucherEditMode) {
          const linkedVoucherTableId =
            getLinkedReceiptVoucherTableId(receiptSourcePayment);
          if (!linkedVoucherTableId) {
            throw new Error("Linked receipt voucher not found.");
          }
          const details =
            await getReceiptVoucherDetailsWithTransaction(linkedVoucherTableId);
          if (!isMounted) return;

          const voucher = details?.voucher || null;
          const firstTransaction = Array.isArray(details?.transactions)
            ? details.transactions[0]
            : null;
          if (!voucher) {
            throw new Error("Receipt voucher details are unavailable.");
          }

          setReceiptVoucherId(voucher.voucher_id || "");
          setReceiptVoucherTransactionId(firstTransaction?.id || null);
          const sourceMethod = mapPaymentModeToReceiptMethod(
            receiptSourcePayment?.payment_mode,
          );
          const voucherMethod = mapPaymentModeToReceiptMethod(
            voucher?.payment_mode,
          );
          setReceiptVoucherForm({
            drAccount: firstTransaction?.dr_account_name_id
              ? String(firstTransaction.dr_account_name_id)
              : "",
            crAccount: firstTransaction?.cr_account_name_id
              ? String(firstTransaction.cr_account_name_id)
              : "",
            voucherDate:
              getDateInputValue(voucher.voucher_date) ||
              getDateInputValue(receiptSourcePayment?.payment_date) ||
              new Date().toISOString().split("T")[0],
            amount:
              firstTransaction?.dr_amount !== undefined &&
              firstTransaction?.dr_amount !== null
                ? String(firstTransaction.dr_amount)
                : voucher?.total_amount !== undefined &&
                    voucher?.total_amount !== null
                  ? String(voucher.total_amount)
                  : "",
            method:
              sourceMethod === "CARD" ||
              sourceMethod === "CASH" ||
              sourceMethod === "ONLINE"
                ? sourceMethod
                : voucherMethod,
            docNumber:
              voucher?.reference_no ||
              voucher?.bill_no ||
              receiptSourcePayment?.reference_no ||
              "",
            description:
              firstTransaction?.description ||
              voucher?.note ||
              buildReceiptVoucherDescription(receiptSourcePayment),
          });
          return;
        }

        const generatedVoucherId = await generateReceiptVoucherId(companyId);
        if (!isMounted) return;
        setReceiptVoucherId(generatedVoucherId || "");
        setReceiptVoucherTransactionId(null);
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to prepare receipt voucher:", error);
        setReceiptFormError("Unable to load receipt voucher accounts.");
      } finally {
        if (isMounted) {
          setIsReceiptBootstrapping(false);
        }
      }
    };

    bootstrapReceiptVoucher();

    return () => {
      isMounted = false;
    };
  }, [
    isReceiptVoucherOpen,
    companyId,
    isReceiptVoucherEditMode,
    receiptSourcePayment,
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.closest("[data-payment-action-menu]")) return;
      setOpenActionMenu(null);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!openActionMenu) return;
    const handleClose = () => setOpenActionMenu(null);
    window.addEventListener("resize", handleClose);
    window.addEventListener("scroll", handleClose, true);
    return () => {
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("scroll", handleClose, true);
    };
  }, [openActionMenu]);

  const fetchUserDetails = async (username) => {
    try {
      const data = await get_Hospital_User_Login_Details(username);
      const resolvedCompanyId =
        data?.company_id || data?.companies?.[0]?.company_id || localStorage.getItem("company_id");
      if (resolvedCompanyId) {
        setCompanyId(resolvedCompanyId);
        setBookingError(null);
      } else {
        setBookingError("Unable to resolve company for the logged-in user.");
      }
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      setBookingError("Unable to load user details. Please re-login.");
    }
  };

  const fetchIpdBookings = async (company_id) => {
    setIsBookingLoading(true);
    setBookingError(null);
    try {
      const data = await getIpdBookings(company_id);
      setIpdBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch IPD bookings:", error);
      setIpdBookings([]);
      setBookingError("Unable to load IPD bookings.");
    } finally {
      setIsBookingLoading(false);
    }
  };

  const fetchPayments = async (company_id) => {
    setIsPaymentsLoading(true);
    setPaymentsError(null);
    try {
      const data = await getIpdPayments(company_id);
      setPayments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch IPD payments:", error);
      setPayments([]);
      setPaymentsError("Unable to load IPD payments.");
    } finally {
      setIsPaymentsLoading(false);
    }
  };

  const applyBookingSelection = (bookingId, preserveFields = true) => {
    const bookingMatch = ipdBookings.find(
      (booking) => String(booking.id) === String(bookingId),
    );
    setFormData((prev) => ({
      ...(preserveFields ? prev : {}),
      ipd_booking: bookingId || "",
      room_rate:
        bookingMatch && bookingMatch.room_rate !== undefined
          ? bookingMatch.room_rate
          : "",
      initial_deposit:
        bookingMatch && bookingMatch.initial_deposit !== undefined
          ? bookingMatch.initial_deposit
          : "",
      due_payment:
        bookingMatch && bookingMatch.due_payment !== undefined
          ? bookingMatch.due_payment
          : "",
    }));
  };

  const handleOpenModal = () => {
    const today = new Date().toISOString().split("T")[0];
    setEditingPayment(null);
    setFormData((prev) => ({
      ...prev,
      payment_date: prev.payment_date || today,
    }));
    setIsModalOpen(true);
  };

  const handleEditPayment = (payment) => {
    if (!payment) return;
    setOpenActionMenu(null);
    setEditingPayment(payment);
    setFormData({
      ipd_booking: payment.ipd_booking ? String(payment.ipd_booking) : "",
      payment_date: getDateInputValue(payment.payment_date),
      payment_stage: payment.payment_stage || PAYMENT_STAGE_OPTIONS[0],
      payment_mode: payment.payment_mode || PAYMENT_MODE_OPTIONS[0],
      amount:
        payment.amount !== null && payment.amount !== undefined
          ? String(payment.amount)
          : "",
      reference_no: payment.reference_no || "",
      remarks: payment.remarks || "",
      room_rate:
        payment.room_rate !== null && payment.room_rate !== undefined
          ? String(payment.room_rate)
          : "",
      initial_deposit:
        payment.initial_deposit !== null &&
        payment.initial_deposit !== undefined
          ? String(payment.initial_deposit)
          : "",
      due_payment:
        payment.due_payment !== null && payment.due_payment !== undefined
          ? String(payment.due_payment)
          : payment.due_amount !== null && payment.due_amount !== undefined
            ? String(payment.due_amount)
            : "",
    });
    setIsPaymentCalendarVisible(false);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleToggleActionMenu = (paymentId, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuHeight = 44;
    const shouldOpenUp =
      typeof window !== "undefined" &&
      rect.bottom + menuHeight + 8 > window.innerHeight;
    setOpenActionMenu((prev) =>
      prev?.id === paymentId
        ? null
        : {
            id: paymentId,
            x: rect.right,
            y: shouldOpenUp ? rect.top : rect.bottom,
            openUp: shouldOpenUp,
          },
    );
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
    setFormData(getDefaultFormData());
    setIsPaymentCalendarVisible(false);
    setFormError("");
    if (openModalParam) {
      router.push("/administration_dashboard/billing");
    }
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    if (name === "ipd_booking") {
      applyBookingSelection(value);
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (!isPaymentCalendarVisible) return;
    if (!formData.payment_date) return;
    const selected = new Date(formData.payment_date);
    if (Number.isNaN(selected.getTime())) return;
    setPaymentCalendarMonth(
      new Date(selected.getFullYear(), selected.getMonth(), 1),
    );
  }, [formData.payment_date, isPaymentCalendarVisible]);

  useEffect(() => {
    if (isPaymentCalendarVisible && formData.payment_date) {
      setIsPaymentCalendarVisible(false);
    }
  }, [formData.payment_date, isPaymentCalendarVisible]);

  useEffect(() => {
    if (!openModalParam) return;
    const today = new Date().toISOString().split("T")[0];
    setEditingPayment(null);
    setFormData((prev) => ({
      ...prev,
      payment_date: prev.payment_date || today,
    }));
    setIsModalOpen(true);
  }, [openModalParam]);

  useEffect(() => {
    if (!ipdBookingIdParam) return;
    applyBookingSelection(ipdBookingIdParam);
  }, [ipdBookingIdParam, ipdBookings]);

  useEffect(() => {
    if (!isModalOpen || !ipdBookingIdParam) return;
    applyBookingSelection(ipdBookingIdParam);
  }, [isModalOpen, ipdBookingIdParam, ipdBookings]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!companyId) {
      setFormError("Missing company context. Please login again.");
      return;
    }
    if (!formData.ipd_booking) {
      setFormError("Select an IPD patient to record payment details.");
      return;
    }
    if (!formData.payment_date) {
      setFormError("Payment date is required.");
      return;
    }
    if (!formData.amount) {
      setFormError("Amount is required.");
      return;
    }
    setFormError("");

    const resolvedDueAmount =
      dueAmountPayload !== null && Number.isFinite(Number(dueAmountPayload))
        ? Number(dueAmountPayload)
        : formData.due_payment !== "" && formData.due_payment !== null
          ? Number(formData.due_payment)
          : isEditingPayment
            ? parseAmount(editingPayment?.due_amount)
            : null;

    const payload = {
      ipd_booking: Number(formData.ipd_booking),
      ...(isEditingPayment
        ? editingPayment?.ipd_billing_no
          ? { ipd_billing_no: editingPayment.ipd_billing_no }
          : {}
        : ipdBillingNoParam
          ? { ipd_billing_no: ipdBillingNoParam }
          : {}),
      payment_date: formData.payment_date,
      payment_stage: formData.payment_stage,
      payment_mode: formData.payment_mode,
      amount: Number(formData.amount) || 0,
      ...(resolvedDueAmount !== null &&
      Number.isFinite(Number(resolvedDueAmount))
        ? { due_amount: Number(resolvedDueAmount) }
        : {}),
      reference_no: formData.reference_no || "",
      remarks: formData.remarks || "",
      room_rate:
        formData.room_rate !== "" && formData.room_rate !== null
          ? Number(formData.room_rate)
          : undefined,
      initial_deposit:
        formData.initial_deposit !== "" && formData.initial_deposit !== null
          ? Number(formData.initial_deposit)
          : undefined,
      due_payment:
        formData.due_payment !== "" && formData.due_payment !== null
          ? Number(formData.due_payment)
          : undefined,
    };

    setIsSavingPayment(true);
    try {
      if (isEditingPayment) {
        await updateIpdPayment(editingPayment.id, payload, companyId);
      } else {
        await createIpdPayment(payload, companyId);
      }
      await fetchPayments(companyId);
      handleCloseModal();
    } catch (error) {
      setFormError(
        error.response?.data?.errors ||
          error.response?.data?.detail ||
          "Unable to save payment.",
      );
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleReceiptVoucherSubmit = async (event) => {
    event.preventDefault();
    if (!companyId) {
      setReceiptFormError("Company context missing.");
      return;
    }
    if (!receiptVoucherForm.drAccount) {
      setReceiptFormError("Select Receipt In A/c (Dr.).");
      return;
    }
    if (!receiptVoucherForm.crAccount) {
      setReceiptFormError("Select Paid By (Cr.).");
      return;
    }
    if (!receiptVoucherForm.amount || Number(receiptVoucherForm.amount) <= 0) {
      setReceiptFormError("Enter valid receipt amount.");
      return;
    }
    if (!receiptVoucherForm.voucherDate) {
      setReceiptFormError("Transaction date is required.");
      return;
    }

    const username =
      (typeof window !== "undefined" &&
        (localStorage.getItem("user_display_name") ||
          localStorage.getItem("user_name") ||
          localStorage.getItem("username") ||
          localStorage.getItem("user"))) ||
      "Web User";

    const linkedVoucherTableId =
      isReceiptVoucherEditMode &&
      receiptSourcePayment &&
      getLinkedReceiptVoucherTableId(receiptSourcePayment)
        ? getLinkedReceiptVoucherTableId(receiptSourcePayment)
        : null;

    setIsReceiptSaving(true);
    setReceiptFormError("");
    try {
      const result = await createReceiptVoucher({
        company_id: companyId,
        voucher_id: receiptVoucherId || null,
        voucher_table_id: linkedVoucherTableId || null,
        transaction_id:
          isReceiptVoucherEditMode && receiptVoucherTransactionId
            ? Number(receiptVoucherTransactionId)
            : null,
        voucher_date: receiptVoucherForm.voucherDate,
        amount: Number(receiptVoucherForm.amount) || 0,
        dr_account_name_id: Number(receiptVoucherForm.drAccount),
        cr_account_name_id: Number(receiptVoucherForm.crAccount),
        description: receiptVoucherForm.description || "",
        payment_mode: receiptVoucherForm.method || "ONLINE",
        reference_no: parseTxnIdInput(receiptVoucherForm.docNumber) || "",
        created_by: username,
      });

      const createdVoucherTableIdRaw =
        result?.voucher_id || linkedVoucherTableId || null;
      const createdVoucherTableId = Number(createdVoucherTableIdRaw);
      if (
        receiptSourcePayment?.id &&
        Number.isFinite(createdVoucherTableId) &&
        createdVoucherTableId > 0
      ) {
        const nextPaymentPayload = mergeReceiptVoucherIntoPaymentPayload(
          receiptSourcePayment,
          {
            receipt_voucher_table_id: createdVoucherTableId,
            receipt_voucher_id: receiptVoucherId || "",
            receipt_voucher_no: result?.voucher_no || "",
            receipt_voucher_updated_on: new Date().toISOString(),
          },
        );
        await updateIpdPayment(
          receiptSourcePayment.id,
          { payment_payload: nextPaymentPayload },
          companyId,
        );
      }

      await fetchPayments(companyId);
      handleCloseReceiptVoucherModal();
    } catch (error) {
      setReceiptFormError(
        error.response?.data?.msg ||
          error.response?.data?.response ||
          "Unable to save receipt voucher.",
      );
    } finally {
      setIsReceiptSaving(false);
    }
  };

  return (
    <section className="min-h-screen bg-slate-50 p-6">
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              IPD Payment List
            </h1>
            <p className="text-sm text-slate-500">
              Track all recorded payments against IPD bookings.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <input
              type="search"
              value={paymentSearch}
              onChange={(event) => setPaymentSearch(event.target.value)}
              placeholder="Search by IPD ID, patient, billing no..."
              className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none sm:w-72"
            />
            {/* <button
              type="button"
              onClick={handleOpenModal}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
            >
              Add Payment
            </button> */}
          </div>
        </header>

        <div className="rounded-2xl bg-white shadow-sm">
          {isPaymentsLoading ? (
            <p className="p-6 text-sm text-slate-500">Loading payments…</p>
          ) : paymentsError ? (
            <p className="p-6 text-sm text-red-600">{paymentsError}</p>
          ) : visiblePayments.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">
              {ipdBookingIdParam
                ? "No payments found for the selected IPD booking."
                : "No IPD payments have been recorded yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
                <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    {TABLE_HEADERS.map((column) => (
                      <th
                        key={column.key}
                        className="whitespace-nowrap px-4 py-3 text-left"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visiblePayments.map((payment, index) => {
                    const ipdCode =
                      payment.ipd_booking_code ||
                      (payment.ipd_booking
                        ? `IPD-${payment.ipd_booking}`
                        : "—");
                    const amountValue = Number(payment.amount) || 0;
                    return (
                      <tr key={payment.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {ipdCode}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {payment.patient_name || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {payment.ipd_billing_no_display || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {payment.receipt_no || "—"}
                        </td>

                        <td className="px-4 py-3">
                          {payment.payment_stage || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {payment.payment_mode || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {formatAmount(amountValue)}
                        </td>
                        <td className="px-4 py-3">
                          {formatAmount(Number(payment.due_amount) || 0)}
                        </td>
                        <td className="px-4 py-3">
                          {payment.reference_no || "—"}
                        </td>
                        <td className="px-4 py-3">{payment.remarks || "—"}</td>
                        <td className="px-4 py-3">
                          {payment.is_cancelled ? (
                            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-600">
                              Yes
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-600">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {/* {payment.payment_date || "—"} */}
                          {formatDateTime(payment.payment_date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="inline-flex">
                            <button
                              type="button"
                              onClick={(event) =>
                                handleToggleActionMenu(payment.id, event)
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                              aria-haspopup="menu"
                              aria-expanded={openActionMenu?.id === payment.id}
                              aria-label="Open actions"
                              data-payment-action-menu
                            >
                              <svg
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="h-4 w-4"
                              >
                                <circle cx="10" cy="4" r="1.5" />
                                <circle cx="10" cy="10" r="1.5" />
                                <circle cx="10" cy="16" r="1.5" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        {/* <td className="px-4 py-3">
                          {payment.created_by || "—"}
                        </td> */}
                        {/* <td className="px-4 py-3 whitespace-nowrap">
                          {formatDateTime(payment.created_on)}
                        </td> */}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {openActionMenu && activeActionPayment && (
          <div
            className="fixed z-50 w-40 rounded-md border border-slate-200 bg-white py-1 shadow-lg"
            style={{
              top: openActionMenu.openUp
                ? openActionMenu.y - 8
                : openActionMenu.y + 8,
              left: openActionMenu.x,
              transform: openActionMenu.openUp
                ? "translate(-100%, -100%)"
                : "translateX(-100%)",
            }}
            role="menu"
            data-payment-action-menu
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => handleEditPayment(activeActionPayment)}
              className="block w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
              role="menuitem"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleOpenReceiptVoucher(activeActionPayment)}
              className="block w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
              role="menuitem"
            >
              {activeActionLinkedReceiptVoucherTableId
                ? "Edit Receipt Voucher"
                : "Receipt Voucher"}
            </button>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl overflow-visible">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {isEditingPayment ? "Edit Payment" : "Add Payment"}
                  </h2>
                  {modalBillingNo && (
                    <p className="text-sm font-medium text-slate-700">
                      IPD Billing No: {modalBillingNo}
                    </p>
                  )}
                  {modalDueChargesDisplay && (
                    <p className="text-sm font-medium text-slate-700">
                      Due Charges: {modalDueChargesDisplay}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <span className="text-lg">&times;</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-slate-600 ">
                    IPD Patient
                    <select
                      name="ipd_booking"
                      value={formData.ipd_booking}
                      onChange={handleFormChange}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                      required
                      disabled={isBookingLoading || ipdBookings.length === 0}
                    >
                      <option value="">
                        {isBookingLoading
                          ? "Loading patients…"
                          : "Select IPD patient"}
                      </option>
                      {ipdBookings.map((booking) => (
                        <option key={booking.id} value={booking.id}>
                          {booking.patient_name ||
                            booking.patient?.name ||
                            `Booking #${booking.id}`}
                        </option>
                      ))}
                    </select>
                    {bookingError && (
                      <span className="text-xs text-red-500">
                        {bookingError}
                      </span>
                    )}
                  </label>
                  {/* {selectedBooking && (
                    <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
                      <label className="flex flex-col gap-1 text-slate-600">
                        Room Rate
                        <input
                          type="text"
                          value={
                            formattedRoomRate ||
                            (parsedRoomRate !== null
                              ? parsedRoomRate.toFixed(2)
                              : "N/A")
                          }
                          disabled
                          className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-900"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-slate-600">
                        Initial Deposit
                        <input
                          type="text"
                          value={
                            formattedInitialDeposit ||
                            (bookingInitialDeposit !== null
                              ? bookingInitialDeposit.toFixed(2)
                              : "N/A")
                          }
                          disabled
                          className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-900"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-slate-600">
                        Due Payment
                        <input
                          type="text"
                          value={
                            formattedDuePayment ||
                            (bookingDuePayment !== null
                              ? bookingDuePayment.toFixed(2)
                              : "N/A")
                          }
                          disabled
                          className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-900"
                        />
                      </label>
                    </div>
                  )} */}
                  <label className="flex flex-col gap-1 text-slate-600">
                    Payment Date
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setIsPaymentCalendarVisible((prev) => !prev)
                        }
                        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-slate-900 focus:border-slate-400 focus:outline-none"
                      >
                        <span>
                          {paymentDateDisplay || "Select payment date"}
                        </span>
                        <span className="text-rose-500">📅</span>
                      </button>
                      {isPaymentCalendarVisible && (
                        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl sm:max-w-md">
                          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                            <button
                              type="button"
                              className="text-sm text-slate-500 hover:text-blue-600"
                              onClick={() => handlePaymentCalendarNavigate(-1)}
                            >
                              ← Prev
                            </button>
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <select
                                aria-label="Select month"
                                value={paymentCalendarMonth.getMonth()}
                                onChange={handlePaymentCalendarMonthChange}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700"
                              >
                                {MONTH_LABELS.map((label, idx) => (
                                  <option key={label} value={idx}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                              <select
                                aria-label="Select year"
                                value={paymentCalendarMonth.getFullYear()}
                                onChange={handlePaymentCalendarYearChange}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700"
                              >
                                {paymentYearOptions.map((year) => (
                                  <option key={year} value={year}>
                                    {year}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              className="text-sm text-slate-500 hover:text-blue-600"
                              onClick={() => handlePaymentCalendarNavigate(1)}
                            >
                              Next →
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-2 px-4 pb-3 pt-2 text-xs uppercase text-slate-500">
                            {CALENDAR_DAY_LABELS.map((label) => (
                              <span
                                key={label}
                                className="text-center font-semibold"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-x-2 gap-y-3 px-3 pb-3 text-sm">
                            {paymentCalendarVisible.leadingBlanks.map(
                              (_, index) => (
                                <span
                                  key={`payment-blank-${index}`}
                                  className="mx-auto h-9 w-9"
                                  aria-hidden="true"
                                />
                              ),
                            )}
                            {paymentCalendarVisible.currentMonthDays.map(
                              (day) => {
                                const isSelected =
                                  formData.payment_date?.startsWith(day.iso);
                                const baseClasses = [
                                  "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition",
                                  "text-slate-700",
                                  "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                                  isSelected
                                    ? "ring-2 ring-emerald-500 ring-offset-1"
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ");
                                return (
                                  <button
                                    type="button"
                                    key={day.iso}
                                    className={baseClasses}
                                    onClick={() =>
                                      handlePaymentCalendarSelect(day.iso)
                                    }
                                  >
                                    {day.label}
                                  </button>
                                );
                              },
                            )}
                          </div>
                          <p className="px-4 pb-3 text-xs text-slate-500">
                            Select a date to record the payment.
                          </p>
                        </div>
                      )}
                    </div>
                  </label>
                  <label className="flex flex-col gap-1 text-slate-600">
                    Payment Stage
                    <select
                      name="payment_stage"
                      value={formData.payment_stage}
                      onChange={handleFormChange}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                      required
                    >
                      {PAYMENT_STAGE_OPTIONS.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-slate-600">
                    Payment Mode
                    <select
                      name="payment_mode"
                      value={formData.payment_mode}
                      onChange={handleFormChange}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                      required
                    >
                      {PAYMENT_MODE_OPTIONS.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-slate-600">
                    Amount
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleFormChange}
                      min="0"
                      step="0.01"
                      className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                      required
                    />
                    {formattedRoomRate && (
                      <span className="text-xs text-slate-500">
                        Room rate: {formattedRoomRate} / day
                      </span>
                    )}
                  </label>
                  <label className="flex flex-col gap-1 text-slate-600">
                    Reference No.
                    <input
                      type="text"
                      name="reference_no"
                      value={formData.reference_no}
                      onChange={handleFormChange}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                      placeholder="Transaction reference"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-slate-600 md:col-span-2">
                    Remarks
                    <textarea
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleFormChange}
                      rows={3}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                      placeholder="Additional information"
                    />
                  </label>
                </div>

                {formError && (
                  <p className="text-sm font-medium text-red-500">
                    {formError}
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    disabled={isSavingPayment}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    disabled={isSavingPayment}
                  >
                    {isSavingPayment
                      ? "Saving..."
                      : isEditingPayment
                        ? "Update Payment"
                        : "Save Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isReceiptVoucherOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto p-2 sm:items-center sm:overflow-hidden sm:p-4">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={handleCloseReceiptVoucherModal}
            />
            <div className="relative z-10 flex h-[calc(100dvh-1rem)] w-full max-w-6xl min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-auto sm:max-h-[calc(100vh-1.5rem)] sm:rounded-3xl">
              <div className="flex items-center justify-between rounded-t-3xl bg-blue-800 px-4 py-4 text-white sm:px-6 lg:items-start">
                <div>
                  {/* <p className="hidden text-xs font-semibold uppercase tracking-[0.35em] text-white/70 lg:block">
                    Receipt Voucher
                  </p> */}
                  <h3 className="text-xl font-semibold sm:text-2xl">
                    {isReceiptVoucherEditMode
                      ? "Edit Receipt Voucher"
                      : "Add Receipt Voucher"}
                  </h3>
                  <p className="hidden text-xs text-white/80 lg:block lg:text-sm">
                    Record incoming receipts against your accounts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseReceiptVoucherModal}
                  className="rounded-full border border-white/30 p-2 hover:bg-white/10"
                  disabled={isReceiptSaving}
                >
                  <span className="text-lg">&times;</span>
                </button>
              </div>

              <form
                onSubmit={handleReceiptVoucherSubmit}
                className="flex min-h-0 min-w-0 flex-1 flex-col space-y-4 overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-6 sm:py-6"
              >
                {receiptFormError && (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {receiptFormError}
                  </div>
                )}

                <div className="grid grid-cols-1 rounded-xl border border-slate-200 bg-white md:grid-cols-2">
                  <div className="flex flex-col border-b border-slate-200 p-3 sm:p-4 md:border-b-0 md:border-r">
                    <label className="text-sm font-semibold text-slate-700">
                      Receipt In A/c (Dr.){" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={receiptVoucherForm.drAccount}
                      onChange={(event) =>
                        handleReceiptVoucherFieldChange(
                          "drAccount",
                          event.target.value,
                        )
                      }
                      className="mt-1 w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-[16px] leading-5 text-slate-800 outline-none sm:text-sm"
                      required
                      disabled={isReceiptBootstrapping || isReceiptSaving}
                    >
                      <option value="">Select Account</option>
                      {receiptDebitAccounts.map((account) => (
                        <option
                          key={`receipt-dr-${account.id}`}
                          value={account.id}
                        >
                          {account.account_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col p-3 sm:p-4">
                    <label className="text-sm font-semibold text-slate-700">
                      Paid By (Cr.) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={receiptVoucherForm.crAccount}
                      onChange={(event) =>
                        handleReceiptVoucherFieldChange(
                          "crAccount",
                          event.target.value,
                        )
                      }
                      className="mt-1 w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-[16px] leading-5 text-slate-800 outline-none sm:text-sm"
                      required
                      disabled={isReceiptBootstrapping || isReceiptSaving}
                    >
                      <option value="">Select Account</option>
                      {receiptCreditAccounts.map((account) => (
                        <option
                          key={`receipt-cr-${account.id}`}
                          value={account.id}
                        >
                          {account.account_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 rounded-xl border border-slate-200 bg-white md:grid-cols-2">
                  <div className="flex flex-col border-b border-slate-200 p-3 sm:p-4 md:border-b-0 md:border-r">
                    <label className="text-sm font-semibold text-slate-700">
                      Transaction Date :
                    </label>
                    <input
                      type="date"
                      value={receiptVoucherForm.voucherDate}
                      onChange={(event) =>
                        handleReceiptVoucherFieldChange(
                          "voucherDate",
                          event.target.value,
                        )
                      }
                      className="mt-1 w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-[16px] leading-5 text-slate-800 outline-none sm:text-sm"
                      required
                      disabled={isReceiptSaving}
                    />
                  </div>
                  <div className="flex flex-col p-3 sm:p-4">
                    <label className="text-sm font-semibold text-slate-700">
                      Receipt Amount (₹){" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={receiptVoucherForm.amount}
                      onChange={(event) =>
                        handleReceiptVoucherFieldChange(
                          "amount",
                          event.target.value,
                        )
                      }
                      className="mt-1 w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-right text-[16px] leading-5 outline-none "
                      required
                      disabled={isReceiptSaving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 rounded-xl border border-slate-200 bg-white md:grid-cols-2">
                  <div className="flex flex-col border-b border-slate-200 p-3 sm:p-4 md:border-b-0 md:border-r">
                    <label className="mb-1 text-sm font-semibold text-slate-700">
                      Payment Method <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                      {["CASH", "ONLINE", "CARD", "CHECK"].map((method) => (
                        <label
                          key={method}
                          className="flex items-center gap-1 text-sm text-slate-700"
                        >
                          <input
                            type="radio"
                            name="receipt-method"
                            value={method}
                            checked={receiptVoucherForm.method === method}
                            onChange={() =>
                              handleReceiptVoucherFieldChange("method", method)
                            }
                            disabled={isReceiptSaving}
                          />
                          {method}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col p-3 sm:p-4">
                    <label className="text-sm font-semibold text-slate-700">
                      Document Number
                    </label>
                    <input
                      type="text"
                      value={formatTxnIdDisplay(receiptVoucherForm.docNumber)}
                      onChange={(event) =>
                        handleReceiptVoucherFieldChange(
                          "docNumber",
                          parseTxnIdInput(event.target.value),
                        )
                      }
                      placeholder="Optional"
                      className="mt-1 w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-[16px] leading-5 outline-none sm:text-sm"
                      disabled={isReceiptSaving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 rounded-xl border border-slate-200 bg-white md:grid-cols-2">
                  <div className="flex flex-col border-b border-slate-200 p-3 sm:p-4 md:border-b-0 md:border-r">
                    <label className="text-sm font-semibold text-slate-700">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={receiptVoucherForm.description}
                      onChange={(event) =>
                        handleReceiptVoucherFieldChange(
                          "description",
                          event.target.value,
                        )
                      }
                      className="mt-1 w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-[16px] leading-5 outline-none sm:text-sm"
                      disabled={isReceiptSaving}
                    />
                  </div>
                  <div className="flex flex-col p-3 sm:p-4">
                    <label className="text-sm font-semibold text-slate-700">
                      Amount in Words :
                    </label>
                    <p className="mt-1 break-words text-sm text-slate-800">
                      {receiptAmountInWords}
                    </p>
                    {!!receiptVoucherId && (
                      <p className="mt-2 text-xs text-slate-500">
                        Voucher ID: {receiptVoucherId}
                      </p>
                    )}
                    {receiptSourcePayment?.id ? (
                      <p className="text-xs text-slate-500">
                        IPD Payment ID: {receiptSourcePayment.id}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="font-semibold text-slate-700">Attachments</p>
                  <p className="text-sm text-slate-500">
                    Upload and review bills, approvals, or images linked to this
                    voucher.
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    No files attached yet.
                  </p>
                </div>

                <div className="sticky bottom-0 z-10 -mx-3 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white px-3 pb-4 pt-3 sm:static sm:mx-0 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-4">
                  <button
                    type="button"
                    onClick={handleCloseReceiptVoucherModal}
                    className="w-full whitespace-nowrap rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto sm:px-5"
                    disabled={isReceiptSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isReceiptSaving || isReceiptBootstrapping}
                    className="w-full whitespace-nowrap rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-blue-400 sm:w-auto sm:px-6"
                  >
                    {isReceiptSaving
                      ? "Saving..."
                      : isReceiptVoucherEditMode
                        ? "Update & Close"
                        : "Save & Close"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function IPDPaymentListPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-10 text-slate-500">
          Loading payments...
        </div>
      }
    >
      <IPDPaymentListContent />
    </Suspense>
  );
}
