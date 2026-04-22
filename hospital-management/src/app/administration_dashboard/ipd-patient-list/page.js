"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  get_Hospital_User_Login_Details,
  getCurrentUser,
  getIpdBookings,
  getIpdBillings,
  getIpdPayments,
  getPatients,
  updateIpdBooking,
  createIpdPayment,
} from "@/app/api/apiService";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const TABLE_HEADERS = [
  { key: "SL_no", label: "SL No." },
  { key: "ipd_no", label: "IPD No." },
  { key: "patient_name", label: "Patient" },
  { key: "admission_date", label: "Admission Date" },
  { key: "department_name", label: "Department" },
  { key: "recommended_doctor", label: "Recommended Doctor" },
  { key: "treatment_doctor_name", label: "Treatment Doctor" },
  { key: "ward_name", label: "Ward" },
  { key: "room_no", label: "Room" },
  { key: "bed_no", label: "Bed" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
];

const STATUS_UPDATE_OPTIONS = [
  { value: "ADMITTED", label: "Admitted" },
  { value: "TRANSFERRED", label: "Transfer" },
  { value: "DISCHARGED", label: "Discharge" },
];

const ITEMS_PER_PAGE = 10;

const formatAmount = (value) => {
  const amount = Number(value) || 0;
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const numberToWords = (value) => {
  const num = Math.floor(Number(value) || 0);
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

export default function IPDPatientListPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(null);
  const [loggedInDetails, setLoggedInDetails] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingStatus, setEditingStatus] = useState("");
  const [rowSavingId, setRowSavingId] = useState(null);
  const [patientOptions, setPatientOptions] = useState([]);
  const [patientFilterId, setPatientFilterId] = useState("");
  const [isPatientOptionsLoading, setIsPatientOptionsLoading] = useState(false);
  const [patientOptionsError, setPatientOptionsError] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenu, setOpenMenu] = useState(null);
  const [billingModalBooking, setBillingModalBooking] = useState(null);
  const [billingRecords, setBillingRecords] = useState([]);
  const [billingPayments, setBillingPayments] = useState([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [billingActionSaving, setBillingActionSaving] = useState(false);
  const [billingPaymentsError, setBillingPaymentsError] = useState("");
  const [invoiceModalBilling, setInvoiceModalBilling] = useState(null);
  const [paymentModalBooking, setPaymentModalBooking] = useState(null);
  const [isPaymentSaving, setIsPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    ipd_booking: "",
    payment_date: "",
    payment_stage: "FINAL",
    payment_mode: "CASH",
    amount: "",
    reference_no: "",
    remarks: "",
    room_rate: "",
    initial_deposit: "",
    due_payment: "",
  });
  const [paymentError, setPaymentError] = useState("");

  const [companyLogoUrl, setCompanyLogoUrl] = useState("");

  useEffect(() => {
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (!username) {
      setError("Please login to view IPD bookings.");
      return;
    }
    fetchUserDetails(username);
  }, []);

  useEffect(() => {
    if (!companyId) return;
    fetchBookings(companyId, patientFilterId);
  }, [companyId, patientFilterId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [patientSearch, patientFilterId]);

  const company_logo = companyLogoUrl;
  useEffect(() => {
    if (!openMenu) return;
    const handleClose = () => setOpenMenu(null);
    window.addEventListener("resize", handleClose);
    window.addEventListener("scroll", handleClose, true);
    return () => {
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("scroll", handleClose, true);
    };
  }, [openMenu]);

  const fetchUserDetails = async (username) => {
    try {
      // const data = await get_Hospital_User_Login_Details(username);

      const [data, currentUser] = await Promise.all([
        get_Hospital_User_Login_Details(username),
        getCurrentUser(),
      ]);

      console.log("currentUser Details ===>>>", currentUser);
      setLoggedInDetails(data || null);

      setCurrentUser(currentUser);
      setCompanyLogoUrl(
        currentUser?.companyInfo?.company_thumbnail_image_url || "",
      );

      const resolvedCompanyId =
        data?.company_id || data?.companies?.[0]?.company_id;
      if (resolvedCompanyId) {
        setCompanyId(resolvedCompanyId);
        setError(null);
      } else {
        setError("Unable to determine company. Please login again.");
      }
    } catch (err) {
      console.error("Error fetching user:", err);
      setError("Failed to load user details.");
    }
  };

  const handlePaymentFieldChange = (event) => {
    const { name, value } = event.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSavePayment = async (event) => {
    event.preventDefault();
    if (!companyId || !paymentModalBooking) {
      setPaymentError("Missing booking context.");
      return;
    }
    if (!paymentForm.payment_date) {
      setPaymentError("Payment date is required.");
      return;
    }
    if (!paymentForm.amount) {
      setPaymentError("Amount is required.");
      return;
    }
    setPaymentError("");
    const payload = {
      ipd_booking: Number(paymentForm.ipd_booking),
      payment_date: paymentForm.payment_date,
      payment_stage: paymentForm.payment_stage,
      payment_mode: paymentForm.payment_mode,
      amount: Number(paymentForm.amount) || 0,
      reference_no: paymentForm.reference_no || "",
      remarks: paymentForm.remarks || "",
      room_rate:
        paymentForm.room_rate !== "" && paymentForm.room_rate !== null
          ? Number(paymentForm.room_rate)
          : undefined,
      initial_deposit:
        paymentForm.initial_deposit !== "" &&
        paymentForm.initial_deposit !== null
          ? Number(paymentForm.initial_deposit)
          : undefined,
      due_payment:
        paymentForm.due_payment !== "" && paymentForm.due_payment !== null
          ? Number(paymentForm.due_payment)
          : undefined,
    };
    setIsPaymentSaving(true);
    try {
      await createIpdPayment(payload, companyId);
      await updateBookingStatus(paymentModalBooking.id, "DISCHARGED");
      setPaymentModalBooking(null);
    } catch (error) {
      setPaymentError(
        error.response?.data?.errors ||
          error.response?.data?.detail ||
          "Unable to save payment.",
      );
    } finally {
      setIsPaymentSaving(false);
    }
  };

  const closePaymentModal = () => {
    if (isPaymentSaving) return;
    setPaymentModalBooking(null);
    setPaymentError("");
  };

  const openPaymentModalForBooking = (booking) => {
    if (!booking) return;
    setPaymentModalBooking(booking);
    setPaymentForm({
      ipd_booking: booking.id,
      payment_date: new Date().toISOString().split("T")[0],
      payment_stage: "FINAL",
      payment_mode: "CASH",
      amount: booking.due_payment || booking.room_rate || 0,
      reference_no: "",
      remarks: "",
      room_rate: booking.room_rate || "",
      initial_deposit: booking.initial_deposit || "",
      due_payment: booking.due_payment || "",
    });
    setPaymentError("");
  };

  const fetchBookings = async (company_id, selectedPatientId = "") => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getIpdBookings(company_id, {
        patient_id: selectedPatientId || undefined,
      });
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load IPD bookings:", err);
      setBookings([]);
      setError("Unable to fetch IPD bookings.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatientOptions = useCallback(async (company_id) => {
    setIsPatientOptionsLoading(true);
    setPatientOptionsError("");
    try {
      const data = await getPatients(company_id, { limit: 500 });
      if (Array.isArray(data)) {
        setPatientOptions(data);
      } else {
        setPatientOptions(Array.isArray(data?.results) ? data.results : []);
      }
    } catch (optionsError) {
      console.error("Failed to load patients:", optionsError);
      setPatientOptions([]);
      setPatientOptionsError("Unable to load patient filters.");
    } finally {
      setIsPatientOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!companyId) return;
    fetchPatientOptions(companyId);
  }, [companyId, fetchPatientOptions]);

  const fetchBillingRecords = async (bookingId) => {
    if (!companyId || !bookingId) return;
    setBillingLoading(true);
    setBillingError("");
    setBillingPaymentsError("");
    try {
      const data = await getIpdBillings(companyId, { ipd_booking: bookingId });
      setBillingRecords(Array.isArray(data) ? data : data?.results || []);
    } catch (billingFetchError) {
      console.error("Failed to load IPD billings:", billingFetchError);
      setBillingError("Unable to load billing details.");
      setBillingRecords([]);
      setBillingPayments([]);
    } finally {
      try {
        const payments = await getIpdPayments(companyId, {
          ipd_booking: bookingId,
        });
        setBillingPayments(Array.isArray(payments) ? payments : []);
      } catch (paymentsError) {
        console.error("Failed to load IPD payments:", paymentsError);
        setBillingPayments([]);
        setBillingPaymentsError("Payment totals unavailable.");
      }
      setBillingLoading(false);
    }
  };

  const handleBillingClose = () => {
    if (billingLoading || billingActionSaving) return;
    setBillingModalBooking(null);
    setBillingRecords([]);
    setBillingPayments([]);
    setBillingError("");
    setBillingPaymentsError("");
  };

  const handleProceedToPayment = () => {
    if (!billingModalBooking) return;
    const primaryBilling = billingRecords[0];
    const billingIds = billingRecords.map((billing) => billing.id);
    const totalCharges = billingRecords.reduce(
      (sum, billing) => sum + (Number(billing.total_amount) || 0),
      0,
    );
    const totalReceived = billingPayments
      .filter(
        (payment) =>
          !payment.is_cancelled &&
          (billingIds.length === 0 || billingIds.includes(payment.ipd_billing)),
      )
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    const dueAmount = Math.max(totalCharges - totalReceived, 0);
    const params = new URLSearchParams();
    params.set("openModal", "1");
    params.set("ipdBookingId", String(billingModalBooking.id));
    if (primaryBilling?.ipd_billing_no) {
      params.set("ipdBillingNo", primaryBilling.ipd_billing_no);
    }
    if (Number.isFinite(dueAmount)) {
      params.set("dueCharges", String(dueAmount));
    }
    handleBillingClose();
    router.push(
      `/administration_dashboard/ipd-payment-list?${params.toString()}`,
    );
  };

  const handleConfirmDischarge = async () => {
    if (!billingModalBooking) return;
    setBillingActionSaving(true);
    try {
      await updateBookingStatus(billingModalBooking.id, "DISCHARGED");
      handleBillingClose();
    } finally {
      setBillingActionSaving(false);
    }
  };

  const handleViewInvoice = () => {
    const primaryBilling = billingRecords[0];
    if (!primaryBilling) return;
    setInvoiceModalBilling(primaryBilling);
  };

  const handleCloseInvoice = () => {
    setInvoiceModalBilling(null);
  };

  const handlePrintInvoice = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  const handleEditClick = (booking) => {
    if (rowSavingId) return;
    setEditingId(booking.id);
    setEditingStatus(booking.status || "TRANSFERRED");
    setOpenMenu(null);
  };

  const handleEditDetails = (booking) => {
    router.push(
      `/administration_dashboard/ipd-booking?bookingId=${booking.id}`,
    );
    setOpenMenu(null);
  };

  const handleViewTicket = (booking) => {
    const resolvedIpdNo = booking?.ipd_no || booking?.ipdNo || "";
    if (typeof window !== "undefined") {
      const ticketPayload = {
        ...booking,
        ipdNo: resolvedIpdNo,
        name: booking.patient_name || booking.patient?.name || "",
        dateOfBirth:
          booking.date_of_birth || booking.dateOfBirth || booking.dob || "",
        gender: booking.gender || booking.patient_gender || "",
        mobile:
          booking.mobile || booking.patient_mobile || booking.mobile_no || "",
        departmentName: booking.department_name || booking.departmentName || "",
        visitDate: booking.admission_date || booking.visitDate || "",
        doctorName:
          booking.treatment_doctor_name ||
          booking.recommended_doctor ||
          booking.doctor_name ||
          "",
        doctorTypeName:
          booking.treatment_doctor_type_name ||
          booking.doctor_type_name ||
          booking.doctorTypeName ||
          "",
        fees: booking.fees ?? booking.rate_chart_amount ?? "",
        address: booking.address || booking.patient_address || "",
        hospital: booking.company_name || booking.hospital || "",
        hospitalAddress:
          booking.company_address || booking.hospitalAddress || "",
        opd: booking.department_name || booking.departmentName || "",
      };
      sessionStorage.setItem("ipdTicketData", JSON.stringify(ticketPayload));
    }
    const query = new URLSearchParams({
      id: String(booking.id),
      ...(resolvedIpdNo ? { ipdNo: resolvedIpdNo } : {}),
    });
    router.push(`/ipd_ticket/ticket?${query.toString()}`);
    setOpenMenu(null);
  };

  const handleMenuToggle = (bookingId, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuHeight = 140;
    const shouldOpenUp =
      typeof window !== "undefined" &&
      rect.bottom + menuHeight > window.innerHeight;
    setOpenMenu((prev) =>
      prev?.id === bookingId
        ? null
        : {
            id: bookingId,
            x: rect.right,
            y: shouldOpenUp ? rect.top : rect.bottom,
            openUp: shouldOpenUp,
          },
    );
  };

  const handleCancelEdit = () => {
    if (rowSavingId) return;
    setEditingId(null);
    setEditingStatus("");
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    if (!companyId || !newStatus) return;

    const booking = bookings.find((item) => item.id === bookingId);
    if (newStatus === "DISCHARGED" && booking) {
      setBillingModalBooking(booking);
      fetchBillingRecords(booking.id);
      return;
    }

    await updateBookingStatus(bookingId, newStatus);
  };

  const updateBookingStatus = async (bookingId, status) => {
    setRowSavingId(bookingId);
    setEditingStatus(status);
    try {
      const updated = await updateIpdBooking(bookingId, { status }, companyId);
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? { ...booking, ...updated } : booking,
        ),
      );
      setEditingId(null);
      setEditingStatus("");
    } catch (updateError) {
      console.error("Failed to update IPD booking:", updateError);
      setError(
        updateError.response?.data?.errors ||
          updateError.response?.data?.detail ||
          "Unable to update booking.",
      );
    } finally {
      setRowSavingId(null);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const query = patientSearch.trim().toLowerCase();
    if (!query) return true;
    return String(booking.patient_name || "")
      .toLowerCase()
      .includes(query);
  });

  const totalEntries = filteredBookings.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalEntries);
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);
  const pageNumbers =
    totalPages <= 5
      ? Array.from({ length: totalPages }, (_, index) => index + 1)
      : Array.from({ length: 5 }, (_, index) => {
          const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
          return start + index;
        });

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const activeMenuBooking = openMenu
    ? bookings.find((booking) => booking.id === openMenu.id)
    : null;

  return (
    <section className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto w-full max-w-none space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                IPD Patient List
              </h1>
              {/* <p className="text-sm text-slate-500">
                Overview of all in-patient admissions.
              </p> */}
            </div>
            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-end">
              <div className="w-full md:w-72">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Filter by Patient
                </label>
                <div className="relative">
                  <select
                    value={patientFilterId}
                    onChange={(event) => setPatientFilterId(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">
                      {isPatientOptionsLoading
                        ? "Loading patients..."
                        : "All patients"}
                    </option>
                    {patientOptions.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name || "Unnamed"}{" "}
                        {patient.patient_id ? `(${patient.patient_id})` : ""}
                      </option>
                    ))}
                  </select>
                  {patientFilterId && (
                    <button
                      type="button"
                      onClick={() => setPatientFilterId("")}
                      className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Clear patient filter"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {patientOptionsError && (
                  <p className="mt-1 text-xs text-red-500">
                    {patientOptionsError}
                  </p>
                )}
              </div>
              <div className="w-full md:w-72">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Search
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(event) => setPatientSearch(event.target.value)}
                    placeholder="Search Here.."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 pr-10 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                  {patientSearch && (
                    <button
                      type="button"
                      onClick={() => setPatientSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="rounded-2xl bg-white shadow-sm">
          {isLoading ? (
            <p className="p-6 text-sm text-slate-500">Loading IPD patients…</p>
          ) : error ? (
            <p className="p-6 text-sm text-red-600">{error}</p>
          ) : filteredBookings.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">
              No IPD bookings have been recorded yet.
            </p>
          ) : (
            <>
              <div className="relative max-h-[calc(100vh-260px)] overflow-x-auto overflow-y-auto">
                <table className="w-full divide-y divide-slate-200 text-sm text-slate-700">
                  <thead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      {TABLE_HEADERS.map((column) => (
                        <th
                          key={column.key}
                          className="sticky top-0 z-10 bg-slate-100 px-4 py-3 text-left whitespace-nowrap"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedBookings.map((booking, index) => {
                      const isEditing = editingId === booking.id;
                      return (
                        <tr key={booking.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            {startIndex + index + 1}
                          </td>
                          <td className="px-4 py-3">{booking.ipd_no || "—"}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {booking.patient_name || "Unknown"}
                          </td>
                          <td className="px-4 py-3">
                            {formatDate(booking.admission_date)}
                          </td>
                          <td className="px-4 py-3">
                            {booking.department_name || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {booking.recommended_doctor || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {booking.treatment_doctor_name || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {booking.ward_name || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {booking.room_no || "—"}
                          </td>
                          <td className="px-4 py-3">{booking.bed_no || "—"}</td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <select
                                value={editingStatus}
                                onChange={(event) =>
                                  handleStatusChange(
                                    booking.id,
                                    event.target.value,
                                  )
                                }
                                className="rounded border border-slate-300 px-2 py-1 text-sm"
                                disabled={Boolean(rowSavingId)}
                              >
                                <option value="">Select status</option>
                                {STATUS_UPDATE_OPTIONS.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                  booking.status === "DISCHARGED"
                                    ? "bg-green-100 text-green-700"
                                    : booking.status === "TRANSFERRED"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {booking.status || "N/A"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600"
                                  onClick={handleCancelEdit}
                                  disabled={Boolean(rowSavingId)}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="relative flex justify-end">
                                <button
                                  type="button"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                                  onClick={(event) =>
                                    handleMenuToggle(booking.id, event)
                                  }
                                  aria-haspopup="menu"
                                  aria-expanded={openMenu?.id === booking.id}
                                  aria-label="Open actions menu"
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
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                <p>
                  Showing {totalEntries === 0 ? 0 : startIndex + 1} to{" "}
                  {endIndex} out of {totalEntries} entries
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={safePage === 1}
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-2">
                    {pageNumbers.map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                          page === safePage
                            ? "bg-blue-600 text-white shadow"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={safePage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {openMenu && activeMenuBooking && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenMenu(null)}
          />
          <div
            className="fixed z-50 w-40 rounded-lg border border-slate-200 bg-white py-1 text-xs font-semibold text-slate-700 shadow-lg"
            style={{
              top: openMenu.openUp ? openMenu.y - 8 : openMenu.y + 8,
              left: openMenu.x,
              transform: openMenu.openUp
                ? "translate(-100%, -100%)"
                : "translateX(-100%)",
            }}
            role="menu"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="flex w-full items-center px-3 py-2 text-left hover:bg-slate-50"
              onClick={() => handleEditClick(activeMenuBooking)}
              role="menuitem"
            >
              Update Status
            </button>
            <button
              type="button"
              className="flex w-full items-center px-3 py-2 text-left hover:bg-slate-50"
              onClick={() => handleEditDetails(activeMenuBooking)}
              role="menuitem"
            >
              Edit Details
            </button>
            <button
              type="button"
              className="flex w-full items-center px-3 py-2 text-left hover:bg-slate-50"
              onClick={() => handleViewTicket(activeMenuBooking)}
              role="menuitem"
            >
              View Ticket
            </button>
          </div>
        </>
      )}

      {paymentModalBooking && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl sm:max-h-[90vh] sm:overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Finalize Payment for{" "}
                  {paymentModalBooking.patient_name || "IPD"}
                </h2>
                <p className="text-sm text-slate-500">
                  Record final payment to discharge the patient.
                </p>
              </div>
              <button
                type="button"
                onClick={closePaymentModal}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                disabled={isPaymentSaving}
              >
                <span className="text-lg">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-4 text-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-slate-600">
                  Payment Date
                  <input
                    type="date"
                    name="payment_date"
                    value={paymentForm.payment_date}
                    onChange={handlePaymentFieldChange}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-600">
                  Payment Stage
                  <select
                    name="payment_stage"
                    value={paymentForm.payment_stage}
                    onChange={handlePaymentFieldChange}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                    required
                  >
                    <option value="ADVANCE">Advance</option>
                    <option value="INTERIM">Interim</option>
                    <option value="FINAL">Final</option>
                    <option value="REFUND">Refund</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-slate-600">
                  Payment Mode
                  <select
                    name="payment_mode"
                    value={paymentForm.payment_mode}
                    onChange={handlePaymentFieldChange}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                    required
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK">Bank</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-slate-600">
                  Amount
                  <input
                    type="number"
                    name="amount"
                    value={paymentForm.amount}
                    onChange={handlePaymentFieldChange}
                    min="0"
                    step="0.01"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-600">
                  Reference No.
                  <input
                    type="text"
                    name="reference_no"
                    value={paymentForm.reference_no}
                    onChange={handlePaymentFieldChange}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                    placeholder="Transaction reference"
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-600 md:col-span-2">
                  Remarks
                  <textarea
                    name="remarks"
                    value={paymentForm.remarks}
                    onChange={handlePaymentFieldChange}
                    rows={3}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                    placeholder="Additional notes"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">Room Rate</p>
                  <p className="text-base font-semibold text-slate-900">
                    {paymentModalBooking.room_rate ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Initial Deposit</p>
                  <p className="text-base font-semibold text-slate-900">
                    {paymentModalBooking.initial_deposit ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Due Payment</p>
                  <p className="text-base font-semibold text-slate-900">
                    {paymentModalBooking.due_payment ?? "—"}
                  </p>
                </div>
              </div>

              {paymentError && (
                <p className="text-sm font-medium text-red-500">
                  {paymentError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  disabled={isPaymentSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  disabled={isPaymentSaving}
                >
                  {isPaymentSaving ? "Saving…" : "Save & Discharge"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {billingModalBooking && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl sm:max-h-[90vh] sm:overflow-y-auto">
            {(() => {
              const primaryBilling = billingRecords[0];
              const billingStatus = primaryBilling?.status || "—";
              const billingIds = billingRecords.map((billing) => billing.id);
              const totalCharges = billingRecords.reduce(
                (sum, billing) => sum + (Number(billing.total_amount) || 0),
                0,
              );
              const totalReceived = billingPayments
                .filter(
                  (payment) =>
                    !payment.is_cancelled &&
                    (billingIds.length === 0 ||
                      billingIds.includes(payment.ipd_billing)),
                )
                .reduce(
                  (sum, payment) => sum + (Number(payment.amount) || 0),
                  0,
                );
              const dueAmount = Math.max(totalCharges - totalReceived, 0);
              const isPaid = billingStatus === "PAID" && dueAmount <= 0;
              const canDischarge = isPaid;
              const statusLabel =
                billingStatus === "PAID" && dueAmount > 0
                  ? "PENDING"
                  : billingStatus;

              return (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        Billing Summary for{" "}
                        {billingModalBooking.patient_name || "IPD"}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <span>Review total charges before discharge.</span>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            statusLabel === "PAID"
                              ? "bg-green-100 text-green-700"
                              : statusLabel === "PENDING"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          Status: {statusLabel}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleBillingClose}
                      className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      disabled={billingLoading || billingActionSaving}
                    >
                      <span className="text-lg">&times;</span>
                    </button>
                  </div>

                  {billingLoading ? (
                    <p className="py-6 text-sm text-slate-500">
                      Loading billing details…
                    </p>
                  ) : billingError ? (
                    <p className="py-6 text-sm text-red-600">{billingError}</p>
                  ) : billingRecords.length === 0 ? (
                    <p className="py-6 text-sm text-slate-500">
                      No billing records found for this patient.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {billingRecords.map((billing) => (
                        <div
                          key={billing.id}
                          className="rounded-xl border border-slate-200"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                            <span>
                              Billing No: {billing.ipd_billing_no || "—"}
                            </span>
                            <span>
                              Total: {formatAmount(billing.total_amount)}
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-slate-700">
                              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                                <tr>
                                  <th className="px-3 py-2 text-left">Item</th>
                                  <th className="px-3 py-2 text-right">Rate</th>
                                  <th className="px-3 py-2 text-right">Qty</th>
                                  <th className="px-3 py-2 text-right">
                                    Amount
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {(billing.line_items || []).map(
                                  (item, index) => (
                                    <tr key={`${billing.id}-${index}`}>
                                      <td className="px-3 py-2">
                                        {item.item || "—"}
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        {formatAmount(item.rate)}
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        {item.qty ?? "—"}
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        {formatAmount(item.amount)}
                                      </td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                              <tfoot>
                                <tr className="bg-slate-50 font-semibold text-slate-700">
                                  <td
                                    className="px-3 py-2 text-left"
                                    colSpan={3}
                                  >
                                    Total Charges
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {formatAmount(billing.total_amount)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!billingLoading &&
                    !billingError &&
                    billingRecords.length > 0 && (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-md text-slate-700">
                            Total Payment Received:{" "}
                            <span className="text-md font-semibold">
                              {formatAmount(totalReceived)}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-700">
                            Due Amount: {formatAmount(dueAmount)}
                          </div>
                        </div>
                        {billingPaymentsError && (
                          <p className="mt-2 text-xs text-amber-600">
                            {billingPaymentsError}
                          </p>
                        )}
                      </div>
                    )}

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleBillingClose}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                      disabled={billingLoading || billingActionSaving}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={handleViewInvoice}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      disabled={
                        billingLoading ||
                        billingActionSaving ||
                        billingRecords.length === 0
                      }
                    >
                      Invoice
                    </button>
                    {canDischarge ? (
                      <button
                        type="button"
                        onClick={handleConfirmDischarge}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        disabled={billingLoading || billingActionSaving}
                      >
                        {billingActionSaving
                          ? "Discharging…"
                          : "Discharge Confirm"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleProceedToPayment}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                        disabled={billingLoading || billingActionSaving}
                      >
                        Proceed to Payment
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {invoiceModalBilling && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-2 sm:items-center sm:p-4">
          <div className="no-print flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_25px_80px_rgba(15,23,42,0.35)] sm:rounded-[28px]">
            <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 px-4 py-3 text-white sm:px-6 sm:py-4">
              <div className="absolute -right-16 -top-12 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />
              <div className="relative flex flex-wrap items-start justify-between gap-3 sm:gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-200">
                    Medical Invoice
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold sm:text-xl">
                    In-Patient Billing Summary
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-200">
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      Invoice No: {invoiceModalBilling.ipd_billing_no || "—"}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      Admission Date:{" "}
                      {formatDate(invoiceModalBilling.admission_date)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-white/20 sm:px-4 sm:text-xs"
                  >
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseInvoice}
                    className="rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white"
                  >
                    <span className="text-lg">&times;</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:gap-6 sm:px-6 sm:py-6">
              <div className="grid gap-3 md:grid-cols-[1.1fr_1fr]">
                <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Patient Details
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {invoiceModalBilling.patient_name || "—"}
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    <p>Mobile: {invoiceModalBilling.patient_mobile || "—"}</p>
                    <p>
                      Department: {invoiceModalBilling.department_name || "—"}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Admission Details
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    <p>
                      IPD Booking: {invoiceModalBilling.ipd_booking_code || "—"}
                    </p>
                    <p>Ward: {invoiceModalBilling.ward_name || "—"}</p>
                    <p>
                      Room/Bed: {invoiceModalBilling.room_no || "—"} /{" "}
                      {invoiceModalBilling.bed_no || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl bg-slate-50 px-4 py-3 sm:px-6 sm:py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                      Charges Breakdown
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Itemized hospital charges
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white sm:text-sm">
                    Total: {formatAmount(invoiceModalBilling.total_amount)}
                  </div>
                </div>
                <div className="relative max-h-[320px] overflow-x-auto overflow-y-auto">
                  <table className="min-w-[560px] w-full text-xs text-slate-700 sm:text-sm">
                    <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold sm:px-4 sm:py-3">
                          Item
                        </th>
                        <th className="px-3 py-2 text-right font-semibold sm:px-4 sm:py-3">
                          Rate
                        </th>
                        <th className="px-3 py-2 text-right font-semibold sm:px-4 sm:py-3">
                          Qty/Days
                        </th>
                        <th className="px-3 py-2 text-right font-semibold sm:px-4 sm:py-3">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(invoiceModalBilling.line_items || []).map(
                        (item, index) => (
                          <tr key={`${invoiceModalBilling.id}-${index}`}>
                            <td className="px-3 py-2 sm:px-4 sm:py-3">
                              <div className="font-medium text-slate-900">
                                {item.item || "—"}
                              </div>
                              {item.description && (
                                <div className="text-xs text-slate-400">
                                  {item.description}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right sm:px-4 sm:py-3">
                              {formatAmount(item.rate)}
                            </td>
                            <td className="px-3 py-2 text-right sm:px-4 sm:py-3">
                              {item.qty ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-right sm:px-4 sm:py-3">
                              {formatAmount(item.amount)}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="sticky bottom-0 z-10 bg-slate-50 font-semibold text-slate-700 shadow-[0_-1px_0_0_rgba(226,232,240,1)]">
                        <td
                          className="px-3 py-2 text-left sm:px-4 sm:py-3"
                          colSpan={3}
                        >
                          Total Charges
                        </td>
                        <td className="px-3 py-2 text-right sm:px-4 sm:py-3">
                          {formatAmount(invoiceModalBilling.total_amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                >
                  Print Invoice
                </button>
              </div> */}

              {(() => {
                const billingIds = billingRecords.map((billing) => billing.id);
                const totalReceived = billingPayments
                  .filter(
                    (payment) =>
                      !payment.is_cancelled &&
                      (billingIds.length === 0 ||
                        billingIds.includes(payment.ipd_billing)),
                  )
                  .reduce(
                    (sum, payment) => sum + (Number(payment.amount) || 0),
                    0,
                  );
                const dueAmount = Math.max(
                  (Number(invoiceModalBilling.total_amount) || 0) -
                    totalReceived,
                  0,
                );
                return (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-xs text-slate-500">
                      Amount in words
                      <p className="mt-2 text-sm font-semibold text-slate-700">
                        {`${numberToWords(
                          invoiceModalBilling.total_amount || 0,
                        )} only`}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 text-sm text-slate-700 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span>Total Charges</span>
                        <span className="font-semibold text-slate-900">
                          {formatAmount(invoiceModalBilling.total_amount)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span>Total Payment Received</span>
                        <span className="font-semibold text-emerald-600">
                          {formatAmount(totalReceived)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                        <span>Due Amount</span>
                        <span className="font-semibold text-rose-600">
                          {formatAmount(dueAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="printable-invoice-sheet hidden">
            {(() => {
              const lineItems = Array.isArray(invoiceModalBilling.line_items)
                ? invoiceModalBilling.line_items
                : [];
              const rowCount = Math.max(8, lineItems.length);
              const printableRows = Array.from(
                { length: rowCount },
                (_, index) => lineItems[index] || null,
              );
              const billingIds = billingRecords.map((billing) => billing.id);
              const totalReceived = billingPayments
                .filter(
                  (payment) =>
                    !payment.is_cancelled &&
                    (billingIds.length === 0 ||
                      billingIds.includes(payment.ipd_billing)),
                )
                .reduce(
                  (sum, payment) => sum + (Number(payment.amount) || 0),
                  0,
                );
              const subtotal = Number(invoiceModalBilling.total_amount) || 0;
              const salesTax = 0;
              const totalAmount = subtotal + salesTax;
              const dueAmount = Math.max(totalAmount - totalReceived, 0);
              const printCompanyName =
                invoiceModalBilling.company_name ||
                loggedInDetails?.companies?.[0]?.company_name ||
                "HealthCare Providers, LLC";
              const printCompanyAddress =
                invoiceModalBilling.company_address || "12 Street, City, State";
              const printCompanyPhone =
                invoiceModalBilling.company_phone || "+1 (555) 555-1214";
              const printCompanyEmail =
                invoiceModalBilling.company_email || "info@hospital.com";
              const printCompanyLogo =
                company_logo ||
                invoiceModalBilling.company_thumbnail_image_url ||
                loggedInDetails?.companies?.[0]?.company_thumbnail_image_url ||
                "";
              const printCompanyInitial = (printCompanyName || "H")
                .trim()
                .charAt(0)
                .toUpperCase();

              return (
                <div className="mx-auto max-w-[820px] bg-white ps-6 p-4 text-[11px] text-slate-900">
                  <div className="mb-4 grid grid-cols-[48px_1fr_48px] items-center gap-3 border-b border-slate-400 pb-3">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-sm ms-5">
                      {printCompanyLogo ? (
                        <img
                          src={printCompanyLogo}
                          alt="Company logo"
                          className="h-16 w-16 rounded-full border object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-blue-100 text-sm font-semibold uppercase text-blue-700">
                          {printCompanyInitial}
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5 text-center text-[10px] leading-4 text-slate-700">
                      <p className="text-3xl font-bold leading-none text-slate-700">
                        {printCompanyName}
                      </p>
                      <p>{printCompanyAddress}</p>
                      <p>
                        {printCompanyPhone}, {printCompanyEmail}
                      </p>
                    </div>
                    <div className="h-12 w-12" aria-hidden="true" />
                  </div>

                  <table className="w-full border-collapse border border-slate-400 text-[10px]">
                    <tbody>
                      <tr>
                        <td className="border border-slate-400 px-2 py-1 font-semibold">
                          Bill To:
                        </td>
                        <td className="border border-slate-400 px-2 py-1">
                          {invoiceModalBilling.patient_name || "—"}
                        </td>
                        <td className="border border-slate-400 px-2 py-1 font-semibold">
                          Invoice Number:
                        </td>
                        <td className="border border-slate-400 px-2 py-1">
                          {invoiceModalBilling.ipd_billing_no || "—"}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 px-2 py-1 font-semibold">
                          Patient Address:
                        </td>
                        <td className="border border-slate-400 px-2 py-1">
                          {invoiceModalBilling.address ||
                            invoiceModalBilling.patient_address ||
                            "—"}
                        </td>
                        <td className="border border-slate-400 px-2 py-1 font-semibold">
                          Admit Date:
                        </td>
                        <td className="border border-slate-400 px-2 py-1">
                          {formatDate(invoiceModalBilling.admission_date)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 px-2 py-1 font-semibold">
                          Phone:
                        </td>
                        <td className="border border-slate-400 px-2 py-1">
                          {invoiceModalBilling.patient_mobile || "—"}
                        </td>
                        <td className="border border-slate-400 px-2 py-1 font-semibold">
                          Payment Due By:
                        </td>
                        <td className="border border-slate-400 px-2 py-1">
                          {formatDate(
                            invoiceModalBilling.discharge_date ||
                              invoiceModalBilling.updated_at ||
                              invoiceModalBilling.created_at,
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 px-2 py-1 font-semibold">
                          Physician:
                        </td>
                        <td className="border border-slate-400 px-2 py-1">
                          {invoiceModalBilling.treatment_doctor_name || "—"}
                        </td>
                        <td className="border border-slate-400 px-2 py-1 font-semibold">
                          Department:
                        </td>
                        <td className="border border-slate-400 px-2 py-1">
                          {invoiceModalBilling.department_name || "—"}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <table className="mt-4 w-full border-collapse border border-slate-400 text-[10px]">
                    <thead className="bg-slate-200">
                      <tr>
                        <th className="border border-slate-400 px-2 py-1 text-left font-semibold">
                          SERVICE DATE
                        </th>
                        <th className="border border-slate-400 px-2 py-1 text-left font-semibold">
                          SERVICES PERFORMED
                        </th>
                        {/* <th className="border border-slate-400 px-2 py-1 text-left font-semibold">
                          MEDICATION
                        </th> */}
                        <th className="border border-slate-400 px-2 py-1 text-right font-semibold">
                          FEE
                        </th>
                        <th className="border border-slate-400 px-2 py-1 text-right font-semibold">
                          ADJ
                        </th>
                        <th className="border border-slate-400 px-2 py-1 text-right font-semibold">
                          AMOUNT
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {printableRows.map((item, index) => (
                        <tr
                          key={`print-row-${index}`}
                          className="h-9 align-top"
                        >
                          <td className="border border-slate-400 px-2 py-1">
                            {item
                              ? formatDate(invoiceModalBilling.admission_date)
                              : ""}
                          </td>
                          <td className="border border-slate-400 px-2 py-1">
                            {item?.item || ""}
                          </td>
                          {/* <td className="border border-slate-400 px-2 py-1">
                            {item?.description || ""}
                          </td> */}
                          <td className="border border-slate-400 px-2 py-1 text-right">
                            {item ? formatAmount(item.rate) : ""}
                          </td>
                          <td className="border border-slate-400 px-2 py-1 text-right">
                            {item?.qty ?? ""}
                          </td>
                          <td className="border border-slate-400 px-2 py-1 text-right">
                            {item ? formatAmount(item.amount) : ""}
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td
                          className="border border-slate-400 px-2 py-1"
                          colSpan={3}
                        >
                          Comments, Notes, and Special Instructions:
                        </td>
                        <td className="border border-slate-400 px-2 py-1 font-semibold">
                          SUBTOTAL
                        </td>
                        <td className="border border-slate-400 px-2 py-1 text-right">
                          {formatAmount(subtotal)}
                        </td>
                      </tr>
                      <tr>
                        <td
                          className="border border-slate-400 px-2 py-1"
                          colSpan={3}
                        >
                          Amount in words: {numberToWords(totalAmount)} only
                        </td>
                        <td className="border border-slate-400 px-2 py-1 font-semibold">
                          SALES TAX
                        </td>
                        <td className="border border-slate-400 px-2 py-1 text-right">
                          {formatAmount(salesTax)}
                        </td>
                      </tr>
                      <tr>
                        <td
                          className="border border-slate-400 px-2 py-1"
                          colSpan={3}
                        >
                          Balance Due: {formatAmount(dueAmount)}
                        </td>
                        <td className="border border-slate-400 px-2 py-1 font-semibold">
                          TOTAL
                        </td>
                        <td className="border border-slate-400 px-2 py-1 text-right font-semibold">
                          {formatAmount(totalAmount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          .printable-invoice-sheet,
          .printable-invoice-sheet * {
            visibility: visible !important;
          }

          .printable-invoice-sheet {
            display: block !important;
            position: fixed;
            inset: 0;
            z-index: 99999;
            margin: 0;
            background: #ffffff;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}
