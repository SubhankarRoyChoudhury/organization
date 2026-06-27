"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Trash2, Check, X, Eye } from "lucide-react";
import {
  get_Hospital_User_Login_Details,
  getPatients,
  getOpdTicketBookingsPaged,
  updateOpdTicketBooking,
  deleteOpdTicketBooking,
} from "@/app/api/apiService";

const formatDate = (value) => {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch (error) {
    return value;
  }
};

export default function OPDPatientListPage() {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingForm, setEditingForm] = useState({
    name: "",
    mobile: "",
    advance_received_amt: "",
    receipt_transfer_no: "",
    is_cancelled: false,
  });
  const [patientOptions, setPatientOptions] = useState([]);
  const [patientFilterId, setPatientFilterId] = useState("");
  const [isPatientOptionsLoading, setIsPatientOptionsLoading] = useState(false);
  const [patientOptionsError, setPatientOptionsError] = useState(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [rowError, setRowError] = useState(null);
  const [rowLoadingId, setRowLoadingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;
  const router = useRouter();

  useEffect(() => {
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (!username) {
      setError(
        "Missing login context. Please sign in again to view patient bookings.",
      );
      setIsLoading(false);
      return;
    }
    fetchUserDetails(username);
  }, []);

  const fetchUserDetails = async (username) => {
    try {
      const data = await get_Hospital_User_Login_Details(username);
      const resolvedCompanyId =
        data?.company_id || data?.companies?.[0]?.company_id || localStorage.getItem("company_id");
      if (resolvedCompanyId) {
        setCompanyId(resolvedCompanyId);
        fetchPatients(resolvedCompanyId);
      } else {
        setError("Unable to determine your company. Please contact support.");
        setIsLoading(false);
      }
    } catch (fetchError) {
      console.error("Error fetching user details:", fetchError);
      setError("Failed to load user details. Please try again later.");
      setIsLoading(false);
    }
  };

  const fetchPatients = useCallback(
    async (companyIdToUse, search = "", page = 1, selectedPatientId = "") => {
      setIsLoading(true);
      try {
        const data = await getOpdTicketBookingsPaged(companyIdToUse, {
          search: search.trim(),
          patient_id: selectedPatientId || undefined,
          limit: pageSize,
          page,
          includeCount: true,
        });
        if (Array.isArray(data)) {
          setPatients(data);
          setTotalCount(data.length);
        } else {
          const results = Array.isArray(data?.results) ? data.results : [];
          const count = Number(data?.count);
          setPatients(results);
          setTotalCount(
            Number.isFinite(count) && count > 0 ? count : results.length,
          );
        }
        setError(null);
      } catch (listError) {
        console.error("Error fetching OPD ticket bookings:", listError);
        setError("Unable to load patient list right now. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const fetchPatientOptions = useCallback(async (companyIdToUse) => {
    setIsPatientOptionsLoading(true);
    try {
      const data = await getPatients(companyIdToUse, {
        limit: 500,
      });
      if (Array.isArray(data)) {
        setPatientOptions(data);
      } else {
        const results = Array.isArray(data?.results) ? data.results : [];
        setPatientOptions(results);
      }
      setPatientOptionsError(null);
    } catch (optionsError) {
      console.error("Error fetching patients:", optionsError);
      setPatientOptionsError("Unable to load patient filters right now.");
    } finally {
      setIsPatientOptionsLoading(false);
    }
  }, []);

  const startEditing = (patient) => {
    setEditingId(patient.id);
    setEditingForm({
      name: patient.name || "",
      mobile: patient.mobile || "",
      advance_received_amt: patient.advance_received_amt ?? "",
      receipt_transfer_no: patient.receipt_transfer_no || "",
      is_cancelled: Boolean(patient.is_cancelled),
    });
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("opdTicketData", JSON.stringify(patient));
      } catch (storageError) {
        console.warn("Unable to cache patient data:", storageError);
      }
    }
    setRowError(null);
  };

  const handleReview = (patient) => {
    if (!patient?.id) {
      setRowError("Unable to review this ticket. Missing booking identifier.");
      return;
    }
    router.push(`/opd-booking/ticket?id=${patient.id}`);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingForm({
      name: "",
      mobile: "",
      advance_received_amt: "",
      receipt_transfer_no: "",
      is_cancelled: false,
    });
    setRowError(null);
  };

  const handleSave = async (patientId) => {
    if (!editingForm.name.trim()) {
      setRowError("Patient name cannot be empty.");
      return;
    }
    if (!companyId) {
      setRowError("Missing company context. Please refresh and try again.");
      return;
    }

    setRowLoadingId(patientId);
    try {
      await updateOpdTicketBooking(
        patientId,
        {
          name: editingForm.name.trim(),
          mobile: editingForm.mobile || null,
          advance_received_amt: editingForm.advance_received_amt || null,
          receipt_transfer_no: editingForm.receipt_transfer_no || null,
          is_cancelled: Boolean(editingForm.is_cancelled),
        },
        companyId,
      );
      await fetchPatients(
        companyId,
        patientSearch,
        currentPage,
        patientFilterId,
      );
      cancelEditing();
    } catch (updateError) {
      const apiError =
        updateError.response?.data?.errors ||
        updateError.response?.data?.error ||
        "Failed to update patient.";
      setRowError(
        typeof apiError === "string" ? apiError : "Could not update patient.",
      );
    } finally {
      setRowLoadingId(null);
    }
  };

  const handleDelete = async (patientId) => {
    if (!companyId) {
      setRowError("Missing company context. Please refresh and try again.");
      return;
    }
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this patient ticket?",
    );
    if (!confirmDelete) return;

    setRowLoadingId(patientId);
    try {
      await deleteOpdTicketBooking(patientId, companyId);
      setPatients((prev) => prev.filter((item) => item.id !== patientId));
      if (editingId === patientId) {
        cancelEditing();
      }
    } catch (deleteError) {
      const apiError =
        deleteError.response?.data?.error || "Failed to delete patient ticket.";
      setRowError(apiError);
    } finally {
      setRowLoadingId(null);
    }
  };

  useEffect(() => {
    if (!companyId) return;
    const timeoutId = setTimeout(() => {
      fetchPatients(companyId, patientSearch, currentPage, patientFilterId);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [companyId, patientSearch, currentPage, patientFilterId, fetchPatients]);

  useEffect(() => {
    if (!companyId) return;
    fetchPatientOptions(companyId);
  }, [companyId, fetchPatientOptions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [patientSearch, patientFilterId]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startEntry = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endEntry = Math.min(safePage * pageSize, totalCount);
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

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#f9fafc] to-[#eef3f9]">
      <div className="w-full">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              Patient OPD Ticket List
            </h1>
            <p className="text-sm text-gray-500">
              Review existing OPD ticket bookings and manage patient details.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-end">
            <div className="w-full md:w-72">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Filter by Patient
              </label>
              <div className="relative">
                <select
                  value={patientFilterId}
                  onChange={(event) => setPatientFilterId(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 pr-10 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
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
                    className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
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
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(event) => setPatientSearch(event.target.value)}
                  placeholder="Search Here with Name or Pho no. "
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 pr-10 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                {patientSearch && (
                  <button
                    type="button"
                    onClick={() => setPatientSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-3xl border border-gray-100 bg-white shadow">
          {isLoading ? (
            <div className="p-10 text-center text-sm text-gray-500">
              Loading patient tickets...
            </div>
          ) : patients.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">
              No patient tickets available yet.
            </div>
          ) : (
            <>
              <div className="max-h-[calc(100vh-320px)] overflow-x-auto overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="sticky top-0 z-10 bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-gray-500">
                        #
                      </th>
                      <th className="px-4 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-gray-500">
                        Ticket No
                      </th>
                      <th className="px-4 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-gray-500">
                        Patient
                      </th>
                      <th className="px-4 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-gray-500">
                        Visit Date
                      </th>
                      <th className="px-4 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-gray-500">
                        Department
                      </th>
                      <th className="px-4 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-gray-500">
                        Doctor
                      </th>
                      <th className="px-4 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-gray-500">
                        Doctor Schedule
                      </th>
                      <th className="px-4 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-gray-500">
                        Doctor Fees
                      </th>
                      <th className="px-4 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-gray-500">
                        Mobile
                      </th>
                      <th className="px-4 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-gray-500">
                        Advance Received Amt
                      </th>
                      <th className="px-4 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-gray-500">
                        Receipt/Transfer No
                      </th>
                      <th className="px-4 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-gray-500">
                        Status
                      </th>
                      <th className="px-4 py-2 text-right text-[13px] font-bold uppercase tracking-wide text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {patients.map((patient, index) => {
                      const isEditing = editingId === patient.id;
                      return (
                        <tr key={patient.id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-2 text-gray-500">
                            {(safePage - 1) * pageSize + index + 1}
                          </td>
                          <td className="px-4 py-2 font-semibold text-gray-900">
                            {patient.ticket_no || "N/A"}
                          </td>
                          <td className="px-4 py-2 text-gray-900 text-center">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingForm.name}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({
                                    ...prev,
                                    name: event.target.value,
                                  }))
                                }
                                className="w-full text-center rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                              />
                            ) : (
                              patient.name || "Unnamed"
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-600 text-center">
                            {formatDate(patient.visitDate)}
                          </td>
                          <td className="px-4 py-2 text-gray-600 text-center">
                            {patient.department_name || "-"}
                          </td>
                          <td className="px-4 py-2 text-gray-600 text-center">
                            {patient.doctor_name || "-"}
                          </td>
                          <td className="px-4 py-2 text-gray-600 text-sm text-center">
                            {patient.doctor_schedule_display
                              ? Object.entries(patient.doctor_schedule_display)
                                  .map(([day, slot]) =>
                                    day ? `${day}: ${slot}` : slot,
                                  )
                                  .join(", ")
                              : "-"}
                          </td>
                          <td className="px-4 py-2 text-gray-600 text-center">
                            {patient.fees || "-"}
                          </td>
                          <td className="px-4 py-2 text-gray-900 text-center">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingForm.mobile}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({
                                    ...prev,
                                    mobile: event.target.value,
                                  }))
                                }
                                className="w-full text-center rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                              />
                            ) : (
                              patient.mobile || "-"
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-900 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editingForm.advance_received_amt}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({
                                    ...prev,
                                    advance_received_amt: event.target.value,
                                  }))
                                }
                                className="no-number-spin w-full text-center rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                              />
                            ) : (
                              (patient.advance_received_amt ?? "-")
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-900 text-center">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingForm.receipt_transfer_no}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({
                                    ...prev,
                                    receipt_transfer_no: event.target.value,
                                  }))
                                }
                                className="w-full text-center rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                              />
                            ) : (
                              patient.receipt_transfer_no || "-"
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {isEditing ? (
                              <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={editingForm.is_cancelled}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({
                                      ...prev,
                                      is_cancelled: event.target.checked,
                                    }))
                                  }
                                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                Cancelled
                              </label>
                            ) : patient.is_cancelled ? (
                              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                                Cancelled
                              </span>
                            ) : (
                              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600">
                                Booked
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={rowLoadingId === patient.id}
                                  onClick={() => handleSave(patient.id)}
                                  className="rounded-full border border-green-200 bg-green-50 p-2 text-green-600 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  aria-label="Save"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditing}
                                  className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-100"
                                  aria-label="Cancel"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleReview(patient)}
                                  className="rounded-full border border-blue-100 bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100"
                                  aria-label="Review"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startEditing(patient)}
                                  className="rounded-full border border-indigo-100 bg-indigo-50 p-2 text-indigo-600 transition hover:bg-indigo-100"
                                  aria-label="Edit"
                                >
                                  <PenLine size={16} />
                                </button>
                                <button
                                  type="button"
                                  disabled={rowLoadingId === patient.id}
                                  onClick={() => handleDelete(patient.id)}
                                  className="rounded-full border border-red-100 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  aria-label="Delete"
                                >
                                  <Trash2 size={16} />
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

              <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
                <span>
                  Showing {startEntry} to {endEntry} out of {totalCount} entries
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={safePage === 1}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-600 transition disabled:cursor-not-allowed disabled:text-gray-300"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-2">
                    {pageNumbers.map((page) => (
                      <button
                        key={`page-${page}`}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`h-8 w-8 rounded-full text-sm font-semibold transition ${
                          page === safePage
                            ? "bg-indigo-600 text-white"
                            : "text-gray-600 hover:bg-indigo-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={safePage === totalPages}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-600 transition disabled:cursor-not-allowed disabled:text-gray-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {rowError && (
          <div className="mt-4 rounded-xl border border-yellow-100 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
            {rowError}
          </div>
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
  );
}
