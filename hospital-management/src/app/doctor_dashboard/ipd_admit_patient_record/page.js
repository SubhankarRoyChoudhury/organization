"use client";

import { useEffect, useMemo, useState } from "react";
import {
  get_Hospital_User_Login_Details,
  getCompanyUserDetailsByUsername,
  getIpdBookings,
} from "@/app/api/apiService";

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getIpdDoctorIdFromBooking = (entry) =>
  entry?.treatment_doctor ||
  entry?.treatment_doctor_id ||
  entry?.doctor ||
  entry?.doctor_id ||
  entry?.doctorId ||
  null;

const getIpdAdmissionDateRaw = (entry) =>
  entry?.admission_date ||
  entry?.admissionDate ||
  entry?.admission_date_display ||
  entry?.admissionDateDisplay ||
  entry?.created_on ||
  "";

export default function IpdAdmitPatientRecord() {
  const [companyId, setCompanyId] = useState(null);
  const [doctorId, setDoctorId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ipdBookings, setIpdBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");

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
    const fetchIpdBookings = async () => {
      setIsLoading(true);
      try {
        const data = await getIpdBookings(companyId);
        const payload =
          data?.results ||
          data?.data?.results ||
          data?.data ||
          data?.items ||
          data;
        setIpdBookings(Array.isArray(payload) ? payload : []);
        setError(null);
      } catch (err) {
        console.error("Failed to load IPD bookings:", err);
        setError("Unable to load IPD patients. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchIpdBookings();
  }, [companyId, doctorId]);

  const filteredBookings = useMemo(() => {
    let filtered = ipdBookings.filter(
      (booking) =>
        String(getIpdDoctorIdFromBooking(booking)) === String(doctorId),
    );
    if (selectedDate) {
      filtered = filtered.filter(
        (booking) =>
          formatDate(getIpdAdmissionDateRaw(booking)) === selectedDate,
      );
    }
    return filtered.sort(
      (a, b) =>
        new Date(getIpdAdmissionDateRaw(b) || 0) -
        new Date(getIpdAdmissionDateRaw(a) || 0),
    );
  }, [ipdBookings, doctorId, selectedDate]);

  const dateOptions = useMemo(() => {
    const unique = new Set(
      ipdBookings
        .filter(
          (booking) =>
            String(getIpdDoctorIdFromBooking(booking)) === String(doctorId),
        )
        .map((booking) => formatDate(getIpdAdmissionDateRaw(booking)))
        .filter((value) => value && value !== "-"),
    );
    return Array.from(unique).sort((a, b) => new Date(b) - new Date(a));
  }, [ipdBookings, doctorId]);

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-700">
            IPD Admit Patient Records
          </h1>
          <p className="text-sm text-gray-500">Linked to your profile</p>
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
              Filter by Admission Date
            </p>
            <p className="text-xs text-gray-400">
              Showing {filteredBookings.length} record
              {filteredBookings.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="">All dates</option>
              {dateOptions.map((dateValue) => (
                <option key={dateValue} value={dateValue}>
                  {dateValue}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSelectedDate("")}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="p-6 text-center text-sm text-gray-500">
            Loading IPD patients...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No IPD patients found for your profile.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="py-2 px-3">Sl No</th>
                  <th className="py-2 px-3">IPD No</th>
                  <th className="py-2 px-3">Patient</th>
                  <th className="py-2 px-3">Admission Date</th>
                  <th className="py-2 px-3">Department</th>
                  <th className="py-2 px-3">Treatment Doctor</th>
                  <th className="py-2 px-3">Ward</th>
                  <th className="py-2 px-3">Room</th>
                  <th className="py-2 px-3">Bed</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking, index) => (
                  <tr
                    key={booking.id || booking.ipd_no || index}
                    className="border-b last:border-none hover:bg-gray-50 transition"
                  >
                    <td className="py-2 px-3">{index + 1}</td>
                    <td className="py-2 px-3">{booking.ipd_no || "-"}</td>
                    <td className="py-2 px-3 font-medium">
                      {booking.patient_name || "Unknown"}
                    </td>
                    <td className="py-2 px-3">
                      {formatDate(getIpdAdmissionDateRaw(booking))}
                    </td>
                    <td className="py-2 px-3">
                      {booking.department_name || "-"}
                    </td>
                    <td className="py-2 px-3">
                      {booking.treatment_doctor_name ||
                        booking.recommended_doctor ||
                        "-"}
                    </td>
                    <td className="py-2 px-3">{booking.ward_name || "-"}</td>
                    <td className="py-2 px-3">{booking.room_no || "-"}</td>
                    <td className="py-2 px-3">{booking.bed_no || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
