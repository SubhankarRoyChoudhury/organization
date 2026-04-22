"use client";

import { useEffect, useMemo, useState } from "react";
import {
  get_Hospital_User_Login_Details,
  getCompanyUserDetailsByUsername,
  getEmergencyVisits,
} from "@/app/api/apiService";

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const matchesDoctor = (visit, doctorId) => {
  const raw =
    visit?.attending_doctor_id ??
    visit?.attending_doctor ??
    visit?.doctor_id ??
    visit?.doctor;
  const candidate =
    raw && typeof raw === "object" && raw.id != null ? raw.id : raw;
  if (!candidate || doctorId == null) return false;
  return String(candidate) === String(doctorId);
};

export default function DoctorEmergencyList() {
  const [companyId, setCompanyId] = useState(null);
  const [doctorId, setDoctorId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emergencyVisits, setEmergencyVisits] = useState([]);

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
    const fetchVisits = async () => {
      setIsLoading(true);
      try {
        const visits = await getEmergencyVisits(companyId);
        const filtered = (visits || []).filter((visit) =>
          matchesDoctor(visit, doctorId),
        );
        setEmergencyVisits(filtered);
        setError(null);
      } catch (err) {
        console.error("Failed to load emergency visits:", err);
        setError("Unable to load emergency visits. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchVisits();
  }, [companyId, doctorId]);

  const sortedVisits = useMemo(
    () =>
      [...emergencyVisits].sort(
        (a, b) =>
          new Date(b.visit_datetime || b.created_on) -
          new Date(a.visit_datetime || a.created_on),
      ),
    [emergencyVisits],
  );

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-700">
            Emergency Visits
          </h1>
          <p className="text-sm text-gray-500">
            Only visits assigned to your profile.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl bg-white p-5 shadow">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Loading emergency visits...
          </div>
        ) : sortedVisits.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No emergency visits found for your profile.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-[15px]">Emergency No</th>
                  <th className="px-3 py-2 text-[15px]">Patient</th>
                  <th className="px-3 py-2 text-[15px]">Age</th>
                  <th className="px-3 py-2 text-[15px]">Triage</th>
                  <th className="px-3 py-2 text-[15px]">Status</th>
                  <th className="px-3 py-2 text-[15px]">Visit Date</th>
                  <th className="px-3 py-2 text-[15px]">Outcome Date</th>
                  <th className="px-3 py-2 text-[15px]">Mobile</th>
                </tr>
              </thead>
              <tbody>
                {sortedVisits.map((visit) => (
                  <tr
                    key={visit.id}
                    className="border-b last:border-none hover:bg-gray-50 transition"
                  >
                    <td className="px-3 py-2 font-semibold text-gray-900 text-[15px]">
                      {visit.emer_no || "—"}
                    </td>
                    <td className="px-3 py-2 text-[15px]">
                      <div className="font-medium text-gray-900">
                        {visit.patient_name || visit.patient?.name || "—"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {visit.gender || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[15px]">
                      {visit.age || "—"}
                    </td>
                    <td className="px-3 py-2 text-[15px]">
                      {visit.triage_level || "—"}
                    </td>
                    <td className="px-3 py-2 text-[15px]">
                      {visit.status || "—"}
                    </td>
                    <td className="px-3 py-2 text-[15px]">
                      {formatDateTime(visit.visit_datetime)}
                    </td>
                    <td className="px-3 py-2 text-[15px]">
                      {formatDateTime(visit.outcome_datetime)}
                    </td>
                    <td className="px-3 py-2 text-[15px]">
                      {visit.mobile_no || "—"}
                    </td>
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
