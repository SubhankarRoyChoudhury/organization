"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  get_Hospital_User_Login_Details,
  getCurrentUser,
  getEmergencyVisit,
  getPatient,
} from "@/app/api/apiService";

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildInitialsAvatar = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "H";

const calculateAgeFromDob = (dobValue) => {
  if (!dobValue) return "";
  const birth = new Date(dobValue);
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    years -= 1;
  }
  return years >= 0 ? String(years) : "";
};

function EmergencyPatientCardContent() {
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [companyMeta, setCompanyMeta] = useState({
    name: "",
    address: "",
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");

  const searchParams = useSearchParams();
  const emergencyVisitId = useMemo(
    () => searchParams?.get("id") || null,
    [searchParams],
  );
  const emergencyNoFromQuery = useMemo(
    () => searchParams?.get("emerNo") || "",
    [searchParams],
  );

  useEffect(() => {
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (!username) {
      setError("Missing login context. Please login and try again.");
      setIsLoading(false);
      return;
    }
    const fetchUserDetails = async () => {
      try {
        const [data, currentUserData] = await Promise.all([
          get_Hospital_User_Login_Details(username),
          getCurrentUser(),
        ]);
        setCurrentUser(currentUserData || null);
        setCompanyLogoUrl(
          currentUserData?.companyInfo?.company_thumbnail_image_url || "",
        );
        const primaryCompany = data?.companies?.[0] || {};
        const resolvedCompanyId =
          data?.company_id || primaryCompany?.company_id;
        setCompanyMeta({
          name:
            data?.company_name ||
            data?.companyInfo?.company_name ||
            primaryCompany?.company_name ||
            "",
          address:
            data?.company_address ||
            data?.companyInfo?.company_address ||
            primaryCompany?.company_address ||
            primaryCompany?.address ||
            "",
        });
        if (resolvedCompanyId) {
          setCompanyId(resolvedCompanyId);
        } else {
          setError("Unable to determine your company. Please contact support.");
          setIsLoading(false);
        }
      } catch (userError) {
        console.error("Error fetching user details:", userError);
        setError("Failed to load user context. Please try again later.");
        setIsLoading(false);
      }
    };
    fetchUserDetails();
  }, []);

  const normalizePatient = useCallback(
    (data) => {
      const patientDetails =
        data?.patient_detail ||
        data?.patientDetail ||
        data?.patient_info ||
        data?.patient ||
        {};
      const patientCompanyName =
        patientDetails?.company_name ||
        patientDetails?.companyInfo?.company_name ||
        patientDetails?.company?.company_name ||
        patientDetails?.company?.name ||
        "";
      const patientCompanyAddress =
        patientDetails?.company_address ||
        patientDetails?.companyInfo?.company_address ||
        patientDetails?.company?.company_address ||
        patientDetails?.company?.address ||
        patientDetails?.company_address_1 ||
        "";

      return {
        ...data,
        name:
          patientDetails?.name ||
          data?.patient_name ||
          data?.name ||
          data?.patient?.name ||
          "",
        emerNo: data?.emer_no || data?.emerNo || emergencyNoFromQuery || "",
        age:
          data?.age ??
          patientDetails?.age ??
          calculateAgeFromDob(
            patientDetails?.dateOfBirth || patientDetails?.date_of_birth,
          ) ??
          "",
        gender: data?.gender || patientDetails?.gender || "",
        mobile:
          data?.mobile_no ||
          data?.mobile ||
          patientDetails?.mobile ||
          patientDetails?.mobile_no ||
          "",
        triageLevel: data?.triage_level || data?.triageLevel || "",
        status: data?.status || "",
        visitDateTime:
          data?.visit_datetime || data?.visitDateTime || data?.visit_date || "",
        outcomeDateTime:
          data?.outcome_datetime ||
          data?.outcomeDateTime ||
          data?.outcome_date ||
          "",
        address: data?.address || patientDetails?.address || "",
        doctorName:
          data?.attending_doctor_display ||
          data?.attending_doctor_name ||
          data?.doctor_name ||
          "",
        broughtByName: data?.brought_by_name || data?.broughtByName || "",
        broughtByMobile: data?.brought_by_mobile || data?.broughtByMobile || "",
        referredFrom: data?.referred_from || data?.referredFrom || "",
        dischargeSummary:
          data?.discharge_summary || data?.dischargeSummary || "",
        hospital:
          data?.company_name ||
          patientCompanyName ||
          data?.hospital ||
          companyMeta.name ||
          "",
        hospitalAddress:
          data?.company_address ||
          data?.hospitalAddress ||
          patientCompanyAddress ||
          companyMeta.address ||
          "",
      };
    },
    [companyMeta.address, companyMeta.name, emergencyNoFromQuery],
  );

  useEffect(() => {
    if (!companyId) return;
    const fetchVisit = async (id, company) => {
      setIsLoading(true);
      try {
        const data = await getEmergencyVisit(id, company);
        let patientDetails = null;
        const resolvedPatientId = data?.patient_id || data?.patient;
        if (resolvedPatientId) {
          try {
            patientDetails = await getPatient(resolvedPatientId, company);
          } catch (patientError) {
            console.error(
              "Error fetching emergency patient details:",
              patientError,
            );
          }
        }
        setPatient(
          normalizePatient({
            ...data,
            patient_detail: patientDetails,
          }),
        );
        setError(null);
      } catch (visitError) {
        console.error("Error fetching emergency visit ticket:", visitError);
        if (typeof window !== "undefined") {
          const fallback = sessionStorage.getItem("emergencyTicketData");
          if (fallback) {
            try {
              setPatient(normalizePatient(JSON.parse(fallback)));
              setError(null);
              return;
            } catch (sessionError) {
              console.error(
                "Failed to parse stored emergency ticket data:",
                sessionError,
              );
            }
          }
        }
        setError("Failed to load the selected emergency visit.");
      } finally {
        setIsLoading(false);
      }
    };

    if (emergencyVisitId) {
      fetchVisit(emergencyVisitId, companyId);
      return;
    }

    if (typeof window !== "undefined") {
      const data = sessionStorage.getItem("emergencyTicketData");
      if (data) {
        try {
          setPatient(normalizePatient(JSON.parse(data)));
          setError(null);
        } catch (sessionError) {
          console.error(
            "Failed to parse stored emergency ticket data:",
            sessionError,
          );
          setError("Unable to display emergency visit details.");
        }
      } else {
        setError("No emergency visit selected. Please open a visit from list.");
      }
    }
    setIsLoading(false);
  }, [companyId, emergencyVisitId, normalizePatient]);

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-600 text-lg font-medium">Loading ticket...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4 text-center">
        <p className="text-gray-600 text-lg font-medium">{error}</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-600 text-lg font-medium">
          No emergency visit data found.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-0 relative print:bg-white">
      <button
        onClick={handlePrint}
        className="absolute right-10 top-10 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm shadow-md print:hidden"
      >
        🖨️ Print Card
      </button>

      <div
        className="bg-white shadow-md flex flex-col justify-between text-black"
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "10mm",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        <div>
          <div className="flex justify-between items-start mb-2">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-3">
                {companyLogoUrl ? (
                  <img
                    src={companyLogoUrl}
                    alt="Company Logo"
                    className="w-12 h-12 rounded-full border object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full border bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold uppercase">
                    {buildInitialsAvatar(
                      currentUser?.full_name ||
                        currentUser?.admin_user_name ||
                        patient?.hospital,
                    )}
                  </div>
                )}
                <span className="text-lg font-semibold text-blue-700">
                  {patient.hospital || "Hospital Name"}
                </span>
              </div>
            </div>

            <div className="flex flex-col align-items-center text-black">
              <div className="text-xs font-semibold mb-1">
                Emergency Patient Card
              </div>
              <div className="text-xs mb-1">
                Emergency No: {patient.emerNo || "-"}
              </div>
            </div>
          </div>

          <hr className="border-gray-500 my-2" />

          <div className="grid grid-cols-3 text-sm gap-y-2 gap-x-4 text-black mt-3 mb-3">
            <p>
              <strong>Name:</strong> {patient.name || "-"}
            </p>
            <p>
              <strong>Age:</strong> {patient.age || "-"}
            </p>
            <p>
              <strong>Gender:</strong> {patient.gender || "-"}
            </p>
            <p>
              <strong>Mobile No:</strong> {patient.mobile || "-"}
            </p>
            <p>
              <strong>Triage Level:</strong> {patient.triageLevel || "-"}
            </p>
            <p>
              <strong>Status:</strong> {patient.status || "-"}
            </p>
            <p>
              <strong>Visit Date:</strong>{" "}
              {formatDateTime(patient.visitDateTime)}
            </p>
            {/* <p>
              <strong>Outcome Date:</strong>{" "}
              {formatDateTime(patient.outcomeDateTime)}
            </p>
            <p>
              <strong>Referred From:</strong> {patient.referredFrom || "-"}
            </p>
            <p>
              <strong>Brought By:</strong>{" "}
              {patient.broughtByName || "-"}
              {patient.broughtByMobile ? ` (${patient.broughtByMobile})` : ""}
            </p> */}
            <p>
              <strong>Doctor:</strong> {patient.doctorName || "-"}
            </p>
            <p>
              <strong>Address:</strong> {patient.address || "-"}
            </p>
            <p className="col-span-3">
              <strong>Discharge Summary:</strong>{" "}
              {patient.dischargeSummary || "-"}
            </p>
          </div>
        </div>

        <div
          className="grid border border-gray-500 mt-4 text-sm flex-grow min-h-[450px] text-black"
          style={{ gridTemplateColumns: "33.33% 66.67%" }}
        >
          <div className="border-r border-gray-500 flex flex-col">
            <div className="flex justify-center items-center border-b border-gray-500 h-10">
              <p className="font-semibold text-center">Clinical Notes</p>
            </div>
            <div className="flex-grow p-2"></div>
          </div>

          <div className="flex flex-col">
            <div className="flex justify-center items-center border-b border-gray-500 h-10">
              <p className="font-semibold text-center">Advice</p>
            </div>
            <div className="flex-grow p-2"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmergencyPatientCard() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-600">
          Loading ticket...
        </div>
      }
    >
      <EmergencyPatientCardContent />
    </Suspense>
  );
}
