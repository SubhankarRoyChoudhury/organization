"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import Barcode from "react-barcode";
import {
  get_Hospital_User_Login_Details,
  getCurrentUser,
  getIpdBooking,
  getPatient,
} from "@/app/api/apiService";

function OPDPatientCardContent() {
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [companyMeta, setCompanyMeta] = useState({
    name: "",
    address: "",
  });
  const searchParams = useSearchParams();
  const bookingId = useMemo(
    () => searchParams?.get("id") || null,
    [searchParams],
  );
  const bookingIpdNo = useMemo(
    () => searchParams?.get("ipdNo") || "",
    [searchParams],
  );
  const [currentUser, setCurrentUser] = useState(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");

  useEffect(() => {
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (!username) {
      setError("Missing login context. Please login and try again.");
      setIsLoading(false);
      return;
    }
    fetchUserDetails(username);
  }, []);

  const fetchUserDetails = async (username) => {
    try {
      // const data = await get_Hospital_User_Login_Details(username);
      const [data, currentUser] = await Promise.all([
        get_Hospital_User_Login_Details(username),
        getCurrentUser(),
      ]);
      console.log(data);
      console.log("currentUser Details ===>>>", currentUser);

      setCompanyLogoUrl(
        currentUser?.companyInfo?.company_thumbnail_image_url || "",
      );
      const primaryCompany = data?.companies?.[0] || {};
      const resolvedCompanyId = data?.company_id || primaryCompany?.company_id || localStorage.getItem("company_id");
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

  useEffect(() => {
    if (!companyId) return;
    if (bookingId) {
      fetchBooking(bookingId, companyId);
    } else if (typeof window !== "undefined") {
      const data = sessionStorage.getItem("ipdTicketData");
      if (data) {
        try {
          const parsed = JSON.parse(data);
          console.log("dataaaaa ===>>>", parsed);

          setPatient(normalizePatient(parsed));
        } catch (sessionError) {
          console.error("Failed to parse stored IPD data:", sessionError);
          setError("Unable to display booking details. Please try again.");
        }
        setIsLoading(false);
      } else {
        setError("No booking selected. Please choose a patient to review.");
        setIsLoading(false);
      }
    }
  }, [companyId, bookingId]);

  const normalizePatient = (data) => {
    const patientDetails =
      data.patient_detail ||
      data.patientDetail ||
      data.patient_info ||
      data.patient ||
      {};
    const patientCompanyName =
      patientDetails.company_name ||
      patientDetails?.companyInfo?.company_name ||
      patientDetails?.company?.company_name ||
      patientDetails?.company?.name ||
      "";
    const patientCompanyAddress =
      patientDetails.company_address ||
      patientDetails?.companyInfo?.company_address ||
      patientDetails?.company?.company_address ||
      patientDetails?.company?.address ||
      patientDetails?.company_address_1 ||
      "";
    return {
      ...data,
      name:
        patientDetails.name ||
        data.patient_name ||
        data.name ||
        data.patient?.name ||
        "",
      ipdNo: data.ipd_no || data.ipdNo || bookingIpdNo || "",
      dateOfBirth:
        patientDetails.dateOfBirth ||
        data.date_of_birth ||
        data.dateOfBirth ||
        data.dob ||
        data.patient_dob ||
        "",
      gender: patientDetails.gender || data.gender || data.patient_gender || "",
      mobile:
        patientDetails.mobile ||
        data.mobile ||
        data.patient_mobile ||
        data.mobile_no ||
        "",
      departmentName:
        data.department_name ||
        data.departmentName ||
        data.department?.name ||
        "",
      visitDate: data.admission_date || data.visitDate || data.visit_date || "",
      visitTime: data.visitTime || data.visit_time || "",
      start_time: data.start_time || data.startTime || "",
      end_time: data.end_time || data.endTime || "",
      fees: data.fees ?? data.rate_chart_amount ?? "",
      address:
        patientDetails.address || data.address || data.patient_address || "",
      doctorName:
        data.treatment_doctor_name ||
        data.doctor_name ||
        data.doctorName ||
        data.recommended_doctor ||
        "",
      doctorTypeName:
        data.treatment_doctor_type_name ||
        data.doctor_type_name ||
        data.doctorTypeName ||
        "",
      hospital:
        data.company_name ||
        patientCompanyName ||
        data.hospital ||
        companyMeta.name ||
        "",
      hospitalAddress:
        data.company_address ||
        data.hospitalAddress ||
        patientCompanyAddress ||
        companyMeta.address ||
        "",
      opd: data.department_name || data.departmentName || data.opd || "",
      doctorSlotDisplay:
        data.doctorSlotDisplay ||
        data.doctorTimeSlot ||
        data.doctor_slot_display ||
        "",
      healthInsuranceCompany:
        patientDetails.health_insurance_company ||
        data.health_insurance_company ||
        data.insurance_company ||
        "",
      policyNo:
        patientDetails.policy_no || data.policy_no || data.policyNo || "",
      policyAmount:
        patientDetails.policy_amount ||
        data.policy_amount ||
        data.policyAmount ||
        "",
    };
  };

  const fetchBooking = async (id, company) => {
    setIsLoading(true);
    try {
      const data = await getIpdBooking(id, company);
      let patientDetails = null;
      if (data?.patient) {
        try {
          patientDetails = await getPatient(data.patient, company);
          console.log("patientDetails===>>>", patientDetails);
          console.log(
            "patientDetails company_address ===>>>",
            patientDetails?.company_address ||
              patientDetails?.companyInfo?.company_address ||
              patientDetails?.company?.company_address ||
              patientDetails?.company?.address ||
              "",
          );
        } catch (patientError) {
          console.error("Error fetching IPD patient details:", patientError);
        }
      }
      const normalized = normalizePatient({
        ...data,
        patient_detail: patientDetails,
        doctorSlotDisplay:
          data?.doctor_schedule_display &&
          Object.keys(data.doctor_schedule_display).length > 0
            ? Object.entries(data.doctor_schedule_display)
                .map(([day, slot]) => (day ? `${day}: ${slot}` : slot))
                .join(" • ")
            : data?.start_time && data?.end_time
              ? `${formatTime(data.start_time)} - ${formatTime(data.end_time)}`
              : "",
        submittedAt: data.created_on,
      });
      setPatient(normalized);
      setError(null);
    } catch (bookingError) {
      console.error("Error fetching IPD ticket:", bookingError);
      if (typeof window !== "undefined") {
        const fallback = sessionStorage.getItem("ipdTicketData");
        if (fallback) {
          try {
            setPatient(normalizePatient(JSON.parse(fallback)));
            setError(null);
            return;
          } catch (sessionError) {
            console.error("Failed to parse stored IPD data:", sessionError);
          }
        }
      }
      setError("Failed to load the selected booking. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
          No booking data found. Please select a patient ticket again.
        </p>
      </div>
    );
  }

  const calculateAge = (dob) => {
    if (!dob) return "";
    const birth = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();
    if (days < 0) {
      months--;
      days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    return `${years} Yrs ${months} Months ${days} Days`;
  };

  // const age = calculateAge(patient.dateOfBirth);
  const formatTime = (timeString) => {
    if (!timeString) return "";
    try {
      const [hourStr, minuteStr] = timeString.split(":");
      let hours = Number(hourStr);
      const minutes = minuteStr;
      const suffix = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${suffix}`;
    } catch (err) {
      return timeString;
    }
  };

  const visitTimeDisplay =
    patient.doctorSlotDisplay ||
    patient.visitTime ||
    (patient.start_time && patient.end_time
      ? `${formatTime(patient.start_time)} - ${formatTime(patient.end_time)}`
      : "");

  const company_logo = companyLogoUrl;
  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-0 relative print:bg-white">
      {/* Print Button */}
      <button
        onClick={handlePrint}
        className="absolute right-10 top-10 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm shadow-md print:hidden"
      >
        🖨️ Print Card
      </button>

      {/* IPD Card Layout (border removed) */}
      <div
        className="bg-white shadow-md flex flex-col justify-between text-black"
        style={{
          width: "210mm",
          height: "297mm",
          padding: "10mm ",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {/* HEADER + PATIENT INFO */}
        <div>
          <div className="flex justify-between items-start mb-2">
            {/* Left QR */}
            {/* <div>
              <QRCodeCanvas value={patient.mobile || "N/A"} size={80} />
            </div> */}

            {/* Title */}
            {/* Center Hospital Logo and Name (replaced section) */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-3">
                {company_logo ? (
                  <img
                    src={company_logo}
                    alt="Admin"
                    className="w-12 h-12 rounded-full border object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full border bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold uppercase">
                    {buildInitialsAvatar(
                      loggedInDetails?.full_name ||
                        loggedInDetails?.admin_user_name ||
                        "A",
                    )}
                  </div>
                )}
                {/* <img
                  src="https://cdn-icons-png.flaticon.com/512/2966/2966484.png"
                  alt="MedCare logo"
                  className="w-12 h-12 rounded-full shadow-sm"
                /> */}
                <span className="text-lg font-semibold text-blue-700">
                  {patient.hospital || "Hospital Name"}
                </span>
              </div>
              {/* <p className="text-xs text-gray-700 mt-1">
                {patient.hospitalAddress || "Hospital Address"}
              </p> */}
            </div>

            {/* Right Barcode */}
            <div className="flex flex-col align-items-center text-black">
              <div className="text-xs font-semibold mb-1">IPD Patient Card</div>
              <div className="text-xs mb-1">IPD No: {patient.ipdNo || "-"}</div>
              {/* <div className="text-xs mb-1">
                {patient.opd?.toUpperCase() || "DEPARTMENT"}
              </div> */}
              {/* <Barcode
                value={patient.mobile || "0000000000"}
                height={40}
                width={1.3}
                fontSize={10}
              /> */}
            </div>
          </div>

          <hr className="border-gray-500 my-2" />

          {/* Patient Info */}
          <div className="grid grid-cols-3 text-sm gap-y-2 text-black mt-3 mb-3">
            <p>
              <strong>Name:</strong> {patient.name || "-"}
            </p>
            <p>
              <strong>Age:</strong> {patient.dateOfBirth || "-"}
            </p>
            <p>
              <strong>Gender:</strong> {patient.gender || "-"}
            </p>
            <p>
              <strong>Mobile No:</strong> {patient.mobile || "-"}
            </p>
            {/* <p>
              <strong>Hospital:</strong> {patient.hospital || "-"}
            </p> */}
            <p>
              <strong>Department:</strong> {patient.departmentName || "-"}
            </p>
            {/* <p>
              <strong>Room No:</strong> {patient.roomNo || "-"}
            </p> */}
            <p>
              <strong>Admit Date:</strong> {patient.visitDate || "-"}
            </p>
            {/* <p>
              <strong>Visit Time:</strong> {visitTimeDisplay || "-"}
            </p> */}
            {/* <p>
              <strong>Fees:</strong> {patient.fees || "-"}
            </p> */}
            <p>
              <strong>Address:</strong> {patient.address || "-"}
            </p>
            <p className="col-span-2">
              <strong>Doctor:</strong> {patient.doctorName || "-"},{" "}
              {patient.doctorTypeName}
            </p>
          </div>
          {/* <hr className="border-gray-500 my-3" /> */}
          {/* Additional Info */}
          {/* <div className="grid grid-cols-2 gap-4 text-sm mb-4 text-black">
            <div>
              <p>
                <strong>Insurance:</strong>{" "}
                {patient.healthInsuranceCompany || "N/A"}
              </p>
            </div>
            <div>
              <p>
                <strong>Policy No:</strong> {patient.policyNo || "N/A"}
              </p>
              <p>
                <strong>Policy Amount:</strong> {patient.policyAmount || "N/A"}
              </p>
            </div>
          </div> */}

          {/* VISITS Row */}
          {/* <div
            className="grid text-sm text-black border border-gray-500"
            style={{ gridTemplateColumns: "33.33% 33.33% 33.33%" }}
          >
            {[2, 3, 4].map((visit, index) => (
              <div
                key={visit}
                className={`p-2 ${index < 2 ? "border-r border-gray-500" : ""}`}
              >
                <p>
                  <strong>Visit No:</strong> {visit}
                </p>
                <p>Visit Date: </p>
                <p>Department: </p>
                <p>Doctor: </p>
              </div>
            ))}
          </div> */}
        </div>

        {/* CLINICAL NOTES + ADVICE */}
        <div
          className="grid border border-gray-500 mt-4 text-sm flex-grow min-h-[500px] text-black"
          style={{ gridTemplateColumns: "33.33% 66.67%" }}
        >
          {/* Left column */}
          <div className="border-r border-gray-500 flex flex-col">
            <div className="flex justify-center items-center border-b border-gray-500 h-10">
              <p className="font-semibold text-center">Clinical Notes</p>
            </div>
            <div className="flex-grow p-2"></div>
          </div>

          {/* Right column */}
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

export default function OPDPatientCard() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-600">
          Loading ticket...
        </div>
      }
    >
      <OPDPatientCardContent />
    </Suspense>
  );
}
