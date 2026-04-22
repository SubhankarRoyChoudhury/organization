"use client";

import { useEffect, useMemo, useState } from "react";
import {
  get_Hospital_User_Login_Details,
  getCompanyUserDetailsByUsername,
  getOpdTicketBookings,
} from "@/app/api/apiService";

const LoadingState = () => (
  <div className="p-10 text-center text-sm text-gray-500">
    Loading patient records...
  </div>
);

const EmptyState = () => (
  <div className="p-10 text-center text-sm text-gray-500">
    No patient records found for your schedules.
  </div>
);

export default function PatientRecord() {
  const [companyId, setCompanyId] = useState(null);
  const [doctorId, setDoctorId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [records, setRecords] = useState([]);
  const [visitDateFilter, setVisitDateFilter] = useState("");

  useEffect(() => {
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (!username) {
      setError("Missing login context. Please sign in again.");
      setIsLoading(false);
      return;
    }
    get_Hospital_User_Login_Details(username)
      .then((details) => {
        const selectedCompanyId =
          typeof window !== "undefined"
            ? localStorage.getItem("selected_company_id")
            : null;
        const resolvedCompanyId =
          selectedCompanyId ||
          details?.company_id ||
          details?.companies?.[0]?.company_id;
        if (!resolvedCompanyId) {
          setError("Missing company context. Please sign in again.");
          setIsLoading(false);
          return;
        }
        return getCompanyUserDetailsByUsername(username).then((companyUsers) => {
          const doctorUsers = companyUsers.filter(
            (user) => String(user?.role || "").toLowerCase() === "doctor",
          );
          const matchedDoctor =
            doctorUsers.find(
              (user) =>
                String(user?.company_id) === String(resolvedCompanyId),
            ) || doctorUsers[0];
          if (!matchedDoctor?.id) {
            setError("Your account is not linked to a doctor profile.");
            setIsLoading(false);
            return;
          }
          setCompanyId(matchedDoctor.company_id || resolvedCompanyId);
          setDoctorId(matchedDoctor.id);
        });
      })
      .catch((err) => {
        console.error("Failed to load user details:", err);
        setError("Unable to load your profile. Please try again later.");
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!companyId || !doctorId) return;
    const fetchRecords = async () => {
      setIsLoading(true);
      try {
        const bookings = await getOpdTicketBookings(companyId);
        const doctorBookings = (bookings || []).filter(
          (booking) => String(booking.doctor) === String(doctorId),
        );
        setRecords(doctorBookings);
        setError(null);
      } catch (err) {
        console.error("Failed to load patient records:", err);
        setError("Unable to load patient records. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecords();
  }, [companyId, doctorId]);

  const filteredRecords = useMemo(() => {
    let filtered = [...records];
    if (visitDateFilter) {
      filtered = filtered.filter(
        (record) => record.visitDate && record.visitDate === visitDateFilter,
      );
    }
    return filtered.sort(
      (a, b) =>
        new Date(b.visitDate || b.created_on) -
        new Date(a.visitDate || a.created_on),
    );
  }, [records, visitDateFilter]);

  const visitDateOptions = useMemo(() => {
    const unique = new Set(
      records
        .filter((record) => record.visitDate)
        .map((record) => record.visitDate),
    );
    return Array.from(unique).sort((a, b) => new Date(b) - new Date(a));
  }, [records]);

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-700">
            OPD Patient Records
          </h1>
          <p className="text-sm text-gray-500">Linked to your schedules</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-600">
              Filter by Visit Date
            </p>
            <p className="text-xs text-gray-500">
              Only shows tickets linked to your schedules.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={visitDateFilter}
              onChange={(event) => setVisitDateFilter(event.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 min-w-[180px]"
            >
              <option value="">All Visit Dates</option>
              {visitDateOptions.map((date) => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </option>
              ))}
            </select>
            {visitDateFilter && (
              <button
                type="button"
                onClick={() => setVisitDateFilter("")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {isLoading ? (
          <LoadingState />
        ) : filteredRecords.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="py-2 px-3 text-[16px]">ID</th>
                  <th className="py-2 px-3 text-[16px]">Ticket No</th>
                  <th className="py-2 px-3 text-[16px]">Patient</th>
                  <th className="py-2 px-3 text-[16px]">Visit Date</th>
                  <th className="py-2 px-3 text-[16px]">Department</th>
                  <th className="py-2 px-3 text-[16px]">Schedule</th>
                  <th className="py-2 px-3 text-[16px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record, index) => {
                  const schedule = record.doctor_schedule_display || {};
                  const slotText = Object.entries(schedule)
                    .map(([day, slot]) => `${day} ${slot}`)
                    .join(", ");
                  return (
                    <tr
                      key={record.id}
                      className="border-b last:border-none hover:bg-gray-50 transition"
                    >
                      <td className="py-2 px-3 font-semibold text-gray-900 text-[16px]">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3 font-semibold text-gray-900 text-[16px]">
                        {record.ticket_no || "—"}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-medium text-gray-900 text-[16px]">
                          {record.name || "Unnamed"}
                        </div>
                        <div className="text-xs text-gray-600 text-[16px]">
                          {record.mobile || "No contact"}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-[16px] text-gray-700">
                        {record.visitDate
                          ? new Date(record.visitDate).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "—"}
                      </td>
                      <td className="py-2 px-3 text-[16px] text-gray-700">
                        {record.department_name || "—"}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-700 text-[16px]">
                        {slotText || "—"}
                      </td>
                      <td className="py-2 px-3">
                        {record.is_cancelled ? (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 text-[16px]">
                            Cancelled
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600 text-[16px]">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
