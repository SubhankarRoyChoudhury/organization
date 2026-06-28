"use client";
import { createPortal } from "react-dom";
import { Suspense, useCallback, useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  get_Hospital_User_Login_Details,
  getApprovedDepartments,
  getDoctorsByOpd,
  getDoctorFees,
  createOpdTicketBooking,
  createPatientRecord,
  getPatients,
  deleteOpdTicketBooking,
} from "@/app/api/apiService";
import SuccessDialog from "../SuccessDialog/page";

const DAY_NAME_TO_INDEX = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const DAY_INDEX_TO_NAME = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const generateAllowedDates = (dayNames, rangeDays = 45) => {
  if (!dayNames?.length) return [];
  const allowed = dayNames
    .map((day) => DAY_NAME_TO_INDEX[day])
    .filter((idx) => typeof idx === "number");
  if (!allowed.length) return [];

  const today = new Date();
  const slots = [];
  for (let i = 0; i < rangeDays; i += 1) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + i);
    if (allowed.includes(candidate.getDay())) {
      slots.push(candidate.toISOString().split("T")[0]);
    }
  }
  return slots;
};

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

function OPDBookingPageContent() {
  const buildInitialFormState = useMemo(
    () => () => ({
      company: "",
      visitDate: "",
      name: "",
      gender: "",
      mobile: "",
      dateOfBirth: "",
      country: "",
      state: "",
      district: "",
      ps: "",
      address: "",
      pin: "",
      health_insurance_company: "",
      policy_no: "",
      policy_amount: "",
      department: "",
      doctor: "",
      doctorSchedule: "",
      doctorScheduleSelection: "",
      fees: "",
      advance_received_amt: "",
      receipt_transfer_no: "",
    }),
    [],
  );
  const [form, setForm] = useState(() => buildInitialFormState());
  const router = useRouter();
  const searchParams = useSearchParams();
  //  const queryCompanyId = searchParams?.get("company_id");
  // const [queryCompanyId, setQueryCompanyId] = useState(null);

  const formatDateDisplay = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const [companyId, setCompanyId] = useState(null);
  const [allDepartment, setAllDepartment] = useState([]);
  const [error, setError] = useState(null);
  const [companyError, setCompanyError] = useState(null);
  const [doctorOptions, setDoctorOptions] = useState([]);
  const [doctorFeesByDoctorId, setDoctorFeesByDoctorId] = useState({});
  const [doctorScheduleMap, setDoctorScheduleMap] = useState({});
  const [isDoctorLoading, setIsDoctorLoading] = useState(false);
  const [doctorFetchError, setDoctorFetchError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false); // State for the success dialog
  const [successMessage, setSuccessMessage] = useState(""); // State for the success message
  const [visitDateError, setVisitDateError] = useState(null);
  const [patientRecords, setPatientRecords] = useState([]);
  const [isPatientLookupLoading, setIsPatientLookupLoading] = useState(false);
  const [patientLookupError, setPatientLookupError] = useState(null);
  const [patientSearchText, setPatientSearchText] = useState("");
  const [patientSuggestions, setPatientSuggestions] = useState([]);
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [pendingSlotSelection, setPendingSlotSelection] = useState(null);
  const [isPatientFetched, setIsPatientFetched] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isVisitCalendarVisible, setIsVisitCalendarVisible] = useState(false);
  const [visitCalendarMode, setVisitCalendarMode] = useState("day");
  const [visitYearGridStart, setVisitYearGridStart] = useState(
    () => new Date().getFullYear() - 6,
  );
  const [isDobCalendarVisible, setIsDobCalendarVisible] = useState(false);
  const [dobCalendarMode, setDobCalendarMode] = useState("day");
  const [dobYearGridStart, setDobYearGridStart] = useState(
    () => new Date().getFullYear() - 11,
  );
  const [dobCalendarMonth, setDobCalendarMonth] = useState(() => {
    const now = new Date();
    now.setDate(1);
    return now;
  });
  const prefillDepartmentId = searchParams?.get("department_id") || "";
  const prefillDoctorId = searchParams?.get("doctor_id") || "";
  const buildPatientFormState = useMemo(
    () => () => ({
      name: "",
      gender: "",
      mobile: "",
      dateOfBirth: "",
      country: "",
      state: "",
      district: "",
      ps: "",
      address: "",
      pin: "",
      health_insurance_company: "",
      policy_no: "",
      policy_amount: "",
    }),
    [],
  );
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientForm, setPatientForm] = useState(() => buildPatientFormState());
  const [patientSubmitError, setPatientSubmitError] = useState(null);
  const [patientSubmitSuccess, setPatientSubmitSuccess] = useState(null);
  const [isPatientSubmitting, setIsPatientSubmitting] = useState(false);
  const [insuranceOptions, setInsuranceOptions] = useState([]);
  const [isInsuranceOptionsLoading, setIsInsuranceOptionsLoading] =
    useState(false);
  const [insuranceOptionsError, setInsuranceOptionsError] = useState(null);
  const [isInsuranceDropdownOpen, setIsInsuranceDropdownOpen] =
    useState(false);
  const [insuranceHighlightIndex, setInsuranceHighlightIndex] = useState(-1);
  const [insuranceDropdownRect, setInsuranceDropdownRect] = useState(null);
  const [patientDialogPosition, setPatientDialogPosition] = useState({
    x: 0,
    y: 0,
  });
  const [isDraggingPatientDialog, setIsDraggingPatientDialog] =
    useState(false);
  const modalScrollRef = useRef(null);
  const insuranceInputWrapperRef = useRef(null);
  const patientDragStateRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const patientDialogBaseRectRef = useRef(null);
  const dobInputRef = useRef(null);
  const visitDateInputRef = useRef(null);
  const bookingSearchRef = useRef(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    now.setDate(1);
    return now;
  });

  const fieldClassNames =
    "w-full border border-gray-300 rounded-md px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-200 outline-none bg-white text-gray-900 placeholder-gray-500";

  const INSURANCE_FETCH_LIMIT = 200;

  const todayDateObj = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return base;
  }, []);
  const today = useMemo(
    () => todayDateObj.toISOString().split("T")[0],
    [todayDateObj],
  );
  const todayDateValue = todayDateObj.getTime();
  const currentYearValue = todayDateObj.getFullYear();
  const currentMonthIndex = todayDateObj.getMonth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "department") {
      setForm((prev) => ({
        ...prev,
        department: value,
        doctor: "",
        doctorSchedule: "",
        doctorScheduleSelection: "",
        visitDate: "",
        fees: "",
      }));
      setDoctorScheduleMap({});
      setVisitDateError(null);
      return;
    }
    if (name === "doctor") {
      const selectedFees = doctorFeesByDoctorId[String(value)] ?? "";
      setForm((prev) => ({
        ...prev,
        doctor: value,
        doctorSchedule: "",
        doctorScheduleSelection: "",
        visitDate: "",
        fees: selectedFees,
      }));
      setVisitDateError(null);
      return;
    }
    if (name === "doctorSchedule") {
      const slots = doctorScheduleMap[String(form.doctor)] || [];
      const selectedSlot = slots.find((slot) => slot.value === value);
      setForm((prev) => ({
        ...prev,
        doctorScheduleSelection: value,
        doctorSchedule: selectedSlot?.slotId ? String(selectedSlot.slotId) : "",
      }));
      return;
    }
    if (name === "visitDate") {
      if (allowedVisitDatesSet.size > 0) {
        if (!allowedVisitDatesSet.has(value)) {
          setVisitDateError(
            "Select a date that matches the doctor's schedule.",
          );
          setForm((prev) => ({ ...prev, visitDate: "" }));
          return;
        }
      }
      setVisitDateError(null);
      setForm((prev) => ({
        ...prev,
        visitDate: value,
        doctorSchedule: "",
        doctorScheduleSelection: "",
      }));
      setIsVisitCalendarVisible(false);
      setVisitCalendarMode("day");
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePatientSearchInput = (event) => {
    const { value } = event.target;
    setPatientSearchText(value);
    const trimmed = value.trim();
    if (!trimmed) {
      setPatientSuggestions([]);
      setIsPatientDropdownOpen(false);
      setActiveSuggestionIndex(-1);
      return;
    }
    const digitsOnly = trimmed.replace(/\D/g, "");
    const lowered = trimmed.toLowerCase();
    const matches = patientRecords.filter((patient) => {
      const patientDigits = String(patient.mobile || "").replace(/\D/g, "");
      const patientName = String(patient.name || "").toLowerCase();
      const patientMobile = String(patient.mobile || "").toLowerCase();
      if (digitsOnly) {
        return (
          patientDigits.includes(digitsOnly) ||
          patientName.includes(lowered) ||
          patientMobile.includes(lowered)
        );
      }
      return (
        patientName.includes(lowered) || patientMobile.includes(lowered)
      );
    });
    const nextSuggestions = matches.slice(0, 8);
    setPatientSuggestions(nextSuggestions);
    setActiveSuggestionIndex(-1);
    setIsPatientDropdownOpen(nextSuggestions.length > 0);
  };
  const handlePatientSearchKeyDown = (event) => {
    if (!patientSuggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsPatientDropdownOpen(true);
      setActiveSuggestionIndex((prev) => {
        const nextIndex = prev + 1;
        return nextIndex >= patientSuggestions.length ? 0 : nextIndex;
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsPatientDropdownOpen(true);
      setActiveSuggestionIndex((prev) => {
        const nextIndex = prev - 1;
        return nextIndex < 0 ? patientSuggestions.length - 1 : nextIndex;
      });
      return;
    }
    if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      const suggestion = patientSuggestions[activeSuggestionIndex];
      if (suggestion) {
        handlePatientSuggestionSelect(suggestion);
      }
      return;
    }
    if (event.key === "Escape") {
      setIsPatientDropdownOpen(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const applyPatientSelectionToForm = (patient) => {
    if (!patient) return;
    setForm((prev) => ({
      ...prev,
      name: patient.name || "",
      gender: patient.gender || "",
      mobile: patient.mobile || "",
      dateOfBirth: patient.dateOfBirth || "",
      country: patient.country || "",
      state: patient.state || "",
      district: patient.district || "",
      ps: patient.ps || "",
      address: patient.address || "",
      pin: patient.pin || "",
      health_insurance_company: patient.health_insurance_company || "",
      policy_no: patient.policy_no || "",
      policy_amount: patient.policy_amount || "",
    }));
    setVisitDateError(null);
    setPendingSlotSelection(null);
    setSelectedPatient(patient);
    setIsPatientFetched(Boolean(patient?.id));
  };

  const handlePatientSuggestionSelect = (patient) => {
    if (!patient) return;
    setPatientSearchText("");
    setPatientSuggestions([]);
    setIsPatientDropdownOpen(false);
    setActiveSuggestionIndex(-1);
    applyPatientSelectionToForm(patient);
  };

  const handleIpdTransfer = () => {
    if (!selectedPatient?.id) {
      alert(
        "Please select a patient record before initiating an IPD transfer.",
      );
      return;
    }
    const params = new URLSearchParams({
      patientId: selectedPatient.id,
    });
    if (selectedPatient.name) {
      params.append("patientName", selectedPatient.name);
    }
    router.push(`/administration_dashboard/ipd-booking?${params.toString()}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId) {
      setSubmitError(
        "Missing company context. Please login again or refresh the page.",
      );
      return;
    }
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!selectedPatient?.id) {
      setSubmitError(
        "Please select a patient from the search list before saving.",
      );
      return;
    }

    const selectedDepartment = allDepartment.find(
      (department) => String(department.id) === String(form.department),
    );
    const selectedDoctorSchedule = doctorOptions.find(
      (schedule) => String(schedule.doctor) === String(form.doctor),
    );
    const doctorSlotOptions = doctorScheduleMap[String(form.doctor)] || [];
    const selectedDoctorSlot = doctorSlotOptions.find(
      (slot) => slot.value === form.doctorScheduleSelection,
    );
    const sessionPayload = {
      ...form,
      departmentName: selectedDepartment?.name || "",
      doctorName: selectedDoctorSchedule?.doctor_name || "",
      doctorTypeName: selectedDoctorSchedule?.doctor_type_name || "",
      doctorTimeSlot: selectedDoctorSlot?.label || "",
      submittedAt: new Date().toISOString(),
    };

    const apiPayload = {
      visitDate: form.visitDate,
      name: form.name,
      patient: selectedPatient.id,
      gender: form.gender || null,
      mobile: form.mobile || null,
      dateOfBirth: form.dateOfBirth || null,
      country: form.country || null,
      state: form.state || null,
      district: form.district || null,
      ps: form.ps || null,
      address: form.address || null,
      pin: form.pin || null,
      health_insurance_company: form.health_insurance_company || null,
      policy_no: form.policy_no || null,
      policy_amount: form.policy_amount || null,
      department: form.department || null,
      doctor: form.doctor || null,
      doctorSchedule: form.doctorSchedule || null,
      fees: form.fees || null,
      advance_received_amt: form.advance_received_amt || null,
      receipt_transfer_no: form.receipt_transfer_no || null,
    };

    if (!apiPayload.name?.trim()) {
      setSubmitError("Patient name is required.");
      return;
    }
    if (!form.gender) {
      setSubmitError("Gender is required.");
      return;
    }
    if (!form.mobile?.trim()) {
      setSubmitError("Mobile number is required.");
      return;
    }
    if (!form.dateOfBirth) {
      setSubmitError("Date of birth is required.");
      return;
    }
    if (!form.address?.trim()) {
      setSubmitError("Address is required.");
      return;
    }
    if (!form.department) {
      setSubmitError("Department is required.");
      return;
    }
    if (!form.doctor) {
      setSubmitError("Doctor selection is required.");
      return;
    }
    if (!apiPayload.visitDate) {
      setSubmitError("Visit date is required.");
      return;
    }
    if (form.doctor && doctorSlotOptions.length > 0 && !form.doctorSchedule) {
      setSubmitError("Please select an available day and time slot.");
      return;
    }

    let createdBookingId = null;
    setIsSubmitting(true);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("opdTicketData", JSON.stringify(sessionPayload));
      }
      console.log(apiPayload);

      const createdBooking = await createOpdTicketBooking(
        apiPayload,
        companyId,
      );
      createdBookingId = createdBooking?.id ?? null;
      setSubmitSuccess("OPD ticket saved successfully.");

      setSuccessMessage("OPD ticket saved successfully");
      setIsSuccessDialogOpen(true);
      setTimeout(() => {
        router.push("/opd-booking/ticket");
      }, 900);
    } catch (error) {
      if (createdBookingId) {
        try {
          await deleteOpdTicketBooking(createdBookingId, companyId);
        } catch (cleanupError) {
          console.error("Failed to rollback OPD booking:", cleanupError);
        }
      }
      const apiError =
        error.response?.data?.errors ||
        error.response?.data?.error ||
        "Failed to save OPD ticket.";
      setSubmitError(
        typeof apiError === "string" ? apiError : JSON.stringify(apiError),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const [loggedInDetails, setLoggedInDetails] = useState(null);

  const sanitizeCompanyId = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const num = Number(value);
    if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
      return null;
    }
    return num;
  };

  // const queryCompanyIdNumber = sanitizeCompanyId(queryCompanyId);
  useEffect(() => {
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (!username) {
      setCompanyError(
        "Missing company context. Please login or use a company-specific link.",
      );
      return;
    }
    fetchUserDetails(username, companyId);
  }, []);

  const fetchUserDetails = async (username, hasLockedCompany) => {
    try {
      const data = await get_Hospital_User_Login_Details(username);
      setLoggedInDetails(data);
      if (!hasLockedCompany) {
        // const parsed = sanitizeCompanyId(data?.company_id);
        const resolvedCompanyId =
          data?.company_id || data?.companies?.[0]?.company_id;
        if (resolvedCompanyId) {
          setCompanyId(resolvedCompanyId);
          setCompanyError(null);
          setForm((prev) => ({
            ...prev,
            company: data?.company_name || data?.name || prev.company,
          }));
        } else {
          setCompanyError(
            "Unable to determine your company. Please contact support.",
          );
        }
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching user:", err);
      setError("Failed to fetch user details.");
      if (!hasLockedCompany) {
        setCompanyError(
          "Unable to fetch your company details. Please login again.",
        );
      }
    }
  };
  useEffect(() => {
    if (!companyId) return;
    fetchAllDepartment(companyId);
    fetchDoctorFees(companyId);
    // fetchAllDoctorType(companyId);
    // fetchAllAdministratorType(companyId);
    // fetchAllTimeSlots(companyId);
  }, [companyId]);

  const fetchPatientList = async (companyIdToUse) => {
    if (!companyIdToUse) return;
    setIsPatientLookupLoading(true);
    setPatientLookupError(null);
    try {
      const data = await getPatients(companyIdToUse);
      console.log(data);
      setPatientRecords(Array.isArray(data) ? data : []);
    } catch (patientError) {
      console.error("Failed to load patients:", patientError);
      setPatientRecords([]);
      setPatientLookupError("Unable to load patients.");
    } finally {
      setIsPatientLookupLoading(false);
    }
  };

  useEffect(() => {
    if (!companyId) return;
    fetchPatientList(companyId);
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    const fetchInsuranceCompanies = async () => {
      setIsInsuranceOptionsLoading(true);
      setInsuranceOptionsError(null);
      try {
        const firstPage = await getPatients(companyId, {
          limit: INSURANCE_FETCH_LIMIT,
          page: 1,
          includeCount: true,
        });
        const firstResults = Array.isArray(firstPage)
          ? firstPage
          : Array.isArray(firstPage?.results)
            ? firstPage.results
            : [];
        let allPatients = [...firstResults];
        const totalCount = Number(firstPage?.count) || 0;
        const totalPages =
          totalCount > 0
            ? Math.ceil(totalCount / INSURANCE_FETCH_LIMIT)
            : 1;
        if (!Array.isArray(firstPage) && totalPages > 1) {
          const pageRequests = [];
          for (let page = 2; page <= totalPages; page += 1) {
            pageRequests.push(
              getPatients(companyId, {
                limit: INSURANCE_FETCH_LIMIT,
                page,
              }),
            );
          }
          const pages = await Promise.all(pageRequests);
          pages.forEach((pageData) => {
            const pageResults = Array.isArray(pageData)
              ? pageData
              : Array.isArray(pageData?.results)
                ? pageData.results
                : [];
            if (pageResults.length) {
              allPatients = allPatients.concat(pageResults);
            }
          });
        }
        const uniqueCompanies = Array.from(
          new Set(
            allPatients
              .map((patient) => patient?.health_insurance_company?.trim())
              .filter(Boolean),
          ),
        ).sort((a, b) => a.localeCompare(b));
        setInsuranceOptions(uniqueCompanies);
      } catch (insuranceError) {
        console.error(
          "Failed to load insurance companies:",
          insuranceError,
        );
        setInsuranceOptions([]);
        setInsuranceOptionsError(
          "Unable to load insurance companies right now.",
        );
      } finally {
        setIsInsuranceOptionsLoading(false);
      }
    };
    fetchInsuranceCompanies();
  }, [companyId]);

  const clampPatientDialogPosition = useCallback((position) => {
    const dialog = modalScrollRef.current;
    if (!dialog || typeof window === "undefined") return position;
    const baseRect = patientDialogBaseRectRef.current;
    if (!baseRect) return position;
    const padding = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const minX = padding - baseRect.left;
    const maxX = viewportWidth - padding - baseRect.right;
    const minY = padding - baseRect.top;
    const maxY = viewportHeight - padding - baseRect.bottom;
    return {
      x: Math.min(maxX, Math.max(minX, position.x)),
      y: Math.min(maxY, Math.max(minY, position.y)),
    };
  }, []);

  useEffect(() => {
    if (!isPatientModalOpen) return;
    requestAnimationFrame(() => {
      if (modalScrollRef.current) {
        patientDialogBaseRectRef.current =
          modalScrollRef.current.getBoundingClientRect();
      }
      setPatientDialogPosition({ x: 0, y: 0 });
    });
  }, [isPatientModalOpen]);

  useEffect(() => {
    if (!isDraggingPatientDialog) return;
    const handleMouseMove = (event) => {
      const deltaX = event.clientX - patientDragStateRef.current.startX;
      const deltaY = event.clientY - patientDragStateRef.current.startY;
      setPatientDialogPosition(
        clampPatientDialogPosition({
          x: patientDragStateRef.current.originX + deltaX,
          y: patientDragStateRef.current.originY + deltaY,
        }),
      );
    };
    const handleMouseUp = () => {
      setIsDraggingPatientDialog(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [clampPatientDialogPosition, isDraggingPatientDialog]);

  useEffect(() => {
    if (!isPatientModalOpen) return;
    const handleResize = () => {
      if (modalScrollRef.current) {
        patientDialogBaseRectRef.current =
          modalScrollRef.current.getBoundingClientRect();
      }
      setPatientDialogPosition((prev) => clampPatientDialogPosition(prev));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPatientDialogPosition, isPatientModalOpen]);

  const handlePatientDialogDragStart = (event) => {
    event.preventDefault();
    patientDragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: patientDialogPosition.x,
      originY: patientDialogPosition.y,
    };
    setIsDraggingPatientDialog(true);
  };

  useEffect(() => {
    if (!prefillDepartmentId) return;
    if (!allDepartment.length) return;
    setForm((prev) => {
      if (String(prev.department) === String(prefillDepartmentId)) {
        return prev;
      }
      if (prev.department) return prev;
      return {
        ...prev,
        department: String(prefillDepartmentId),
        doctor: "",
        doctorSchedule: "",
        doctorScheduleSelection: "",
      };
    });
  }, [prefillDepartmentId, allDepartment]);

  const fetchAllDepartment = async (companyIdToUse) => {
    if (!companyIdToUse) return;
    try {
      const data = await getApprovedDepartments(companyIdToUse);
      console.log("All Department===>>>", data);
      setAllDepartment(data);
    } catch (error) {
      setError("Failed to fetch schools");
    }
  };

  const fetchDoctorFees = async (companyIdToUse) => {
    if (!companyIdToUse) return;
    try {
      const data = await getDoctorFees(companyIdToUse);
      const feesMap = {};
      (Array.isArray(data) ? data : []).forEach((entry) => {
        if (!entry?.doctor) return;
        feesMap[String(entry.doctor)] = entry.fees ?? "";
      });
      setDoctorFeesByDoctorId(feesMap);
    } catch (feesError) {
      console.error("Failed to load doctor fees:", feesError);
      setDoctorFeesByDoctorId({});
    }
  };

  const buildDoctorScheduleStructures = (schedules) => {
    const doctorMap = new Map();
    const scheduleLookup = {};
    const seen = new Set();

    const normalizeSlotIds = (value) => {
      if (Array.isArray(value)) {
        return value
          .map((slot) => Number(slot))
          .filter((slot) => Number.isFinite(slot));
      }
      if (value === undefined || value === null || value === "") {
        return [];
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? [parsed] : [];
    };

    const normalizeLabels = (value) => {
      if (Array.isArray(value)) {
        return value.filter(Boolean);
      }
      if (value === undefined || value === null) {
        return [];
      }
      return [value];
    };

    (schedules || []).forEach((item) => {
      if (!item?.doctor) return;
      const doctorKey = String(item.doctor);

      if (!doctorMap.has(doctorKey)) {
        doctorMap.set(doctorKey, {
          doctor: doctorKey,
          doctor_name: item.doctor_name || `Doctor #${doctorKey}`,
          doctor_type_name: item.doctor_type_name,
          association_type: item.association_type,
        });
      }

      if (item?.is_available === false) {
        return;
      }

      const absentDates = Array.isArray(item?.absent_dates)
        ? item.absent_dates
        : [];
      const daySlots = item?.available_day_slots || {};
      const readable = item?.readable_schedule || item?.readable_slots || {};
      const associationPrefix = item?.association_type
        ? `${item.association_type} • `
        : "";
      const buckets = Object.keys(daySlots).length
        ? Object.keys(daySlots)
        : Object.keys(readable);

      if (!scheduleLookup[doctorKey]) {
        scheduleLookup[doctorKey] = [];
      }

      if (buckets.length === 0) {
        const key = `${doctorKey}-${item.id}`;
        if (!seen.has(key)) {
          scheduleLookup[doctorKey].push({
            value: key,
            label:
              item.association_type ||
              readable?.default ||
              `Schedule #${item.id}`,
            scheduleId: item.id,
            slotId: null,
            day: "",
            absentDates,
          });
          seen.add(key);
        }
        return;
      }

      buckets.forEach((day) => {
        const slotIds = normalizeSlotIds(daySlots[day]);
        const labels = normalizeLabels(readable?.[day]);
        const iterations = Math.max(slotIds.length, labels.length, 1);

        for (let idx = 0; idx < iterations; idx += 1) {
          const slotId = slotIds[idx] ?? slotIds[0] ?? null;
          const labelText =
            labels[idx] ??
            labels[0] ??
            (slotId ? `Slot #${slotId}` : "Time slot unavailable");
          const entryKey = `${doctorKey}-${item.id}-${day}-${
            slotId ?? "slot"
          }-${idx}`;
          if (seen.has(entryKey)) continue;
          seen.add(entryKey);
          scheduleLookup[doctorKey].push({
            value: entryKey,
            label: `${associationPrefix}${day}: ${labelText}`,
            scheduleId: item.id,
            slotId,
            day,
            absentDates,
          });
        }
      });
    });

    return {
      doctors: Array.from(doctorMap.values()),
      scheduleLookup,
    };
  };

  const fetchDoctorsForOpd = async (departmentId, companyIdToUse) => {
    if (!departmentId || !companyIdToUse) {
      setDoctorOptions([]);
      setDoctorScheduleMap({});
      setDoctorFetchError(null);
      return;
    }
    setIsDoctorLoading(true);
    setDoctorFetchError(null);
    try {
      const data = await getDoctorsByOpd(departmentId, companyIdToUse);
      console.log(data);

      const { doctors, scheduleLookup } = buildDoctorScheduleStructures(
        Array.isArray(data) ? data : [],
      );
      setDoctorOptions(doctors);
      setDoctorScheduleMap(scheduleLookup);
    } catch (doctorError) {
      console.error("Failed to load doctors:", doctorError);
      setDoctorOptions([]);
      setDoctorScheduleMap({});
      setDoctorFetchError("Unable to load doctors for the selected OPD.");
    } finally {
      setIsDoctorLoading(false);
    }
  };

  useEffect(() => {
    if (!form.department) {
      setDoctorOptions([]);
      setDoctorScheduleMap({});
      setDoctorFetchError(null);
      return;
    }
    fetchDoctorsForOpd(form.department, companyId);
  }, [form.department, companyId]);

  useEffect(() => {
    if (!prefillDoctorId) return;
    if (!doctorOptions.length) return;
    setForm((prev) => {
      if (String(prev.doctor) === String(prefillDoctorId)) {
        return prev;
      }
      if (prev.doctor) return prev;
      const exists = doctorOptions.some(
        (doc) => String(doc.doctor) === String(prefillDoctorId),
      );
      if (!exists) return prev;
      return {
        ...prev,
        doctor: String(prefillDoctorId),
        doctorSchedule: "",
        doctorScheduleSelection: "",
      };
    });
  }, [prefillDoctorId, doctorOptions]);

  useEffect(() => {
    if (!prefillDoctorId) return;
    setForm((prev) => {
      if (prev.visitDate) return prev;
      const today = new Date().toISOString().split("T")[0];
      return { ...prev, visitDate: today };
    });
  }, [prefillDoctorId]);

  useEffect(() => {
    if (!form.doctor) {
      if (form.fees) {
        setForm((prev) => ({ ...prev, fees: "" }));
      }
      return;
    }
    const nextFees = doctorFeesByDoctorId[String(form.doctor)];
    if (nextFees === undefined) return;
    setForm((prev) =>
      prev.fees === nextFees ? prev : { ...prev, fees: nextFees },
    );
  }, [form.doctor, form.fees, doctorFeesByDoctorId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        bookingSearchRef.current &&
        !bookingSearchRef.current.contains(event.target)
      ) {
        setIsPatientDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeSuccessDialog = () => {
    setIsSuccessDialogOpen(false); // Close the success dialog
  };

  const selectedDoctorSlots = doctorScheduleMap[String(form.doctor)] || [];

  const allowedDayNames = useMemo(() => {
    const unique = new Set();
    selectedDoctorSlots.forEach((slot) => {
      if (slot?.day) {
        unique.add(slot.day);
      }
    });
    return Array.from(unique);
  }, [selectedDoctorSlots]);
  const allowedDayNamesDisplay = useMemo(
    () => [...allowedDayNames].reverse(),
    [allowedDayNames],
  );

  const availableVisitDates = useMemo(
    () => generateAllowedDates(allowedDayNames),
    [allowedDayNames],
  );
  const allowedVisitDatesSet = useMemo(
    () => new Set(availableVisitDates),
    [availableVisitDates],
  );

  const selectedVisitDayName = useMemo(() => {
    if (!form.visitDate) return null;
    const parsed = new Date(form.visitDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return DAY_INDEX_TO_NAME[parsed.getDay()];
  }, [form.visitDate]);

  useEffect(() => {
    setForm((prev) => {
      const slots = doctorScheduleMap[String(prev.doctor)] || [];
      if (!selectedVisitDayName) {
        if (!prev.doctorSchedule && !prev.doctorScheduleSelection) return prev;
        return { ...prev, doctorSchedule: "", doctorScheduleSelection: "" };
      }
      const matchingSlot = slots.find(
        (slot) =>
          slot.day === selectedVisitDayName &&
          slot.value === prev.doctorScheduleSelection,
      );
      if (matchingSlot) {
        const slotIdString = matchingSlot.slotId
          ? String(matchingSlot.slotId)
          : "";
        if (slotIdString === prev.doctorSchedule) {
          return prev;
        }
        return {
          ...prev,
          doctorSchedule: slotIdString,
        };
      }
      const hasSlotsForDay = slots.some(
        (slot) => slot.day === selectedVisitDayName,
      );
      if (!hasSlotsForDay) {
        if (!prev.doctorSchedule && !prev.doctorScheduleSelection) return prev;
        return { ...prev, doctorSchedule: "", doctorScheduleSelection: "" };
      }
      if (!prev.doctorSchedule && !prev.doctorScheduleSelection) return prev;
      return { ...prev, doctorSchedule: "", doctorScheduleSelection: "" };
    });
  }, [selectedVisitDayName, doctorScheduleMap]);

  useEffect(() => {
    if (!availableVisitDates.length) {
      setVisitDateError(null);
      setCalendarMonth((prev) => {
        const now = new Date();
        now.setDate(1);
        return prev.getMonth() === now.getMonth() &&
          prev.getFullYear() === now.getFullYear()
          ? prev
          : now;
      });
      return;
    }
    setCalendarMonth(() => {
      const first = new Date(availableVisitDates[0]);
      first.setDate(1);
      return first;
    });
    setForm((prev) => {
      if (prev.visitDate && allowedVisitDatesSet.has(prev.visitDate)) {
        return prev;
      }
      if (!prev.visitDate) return prev;
      return { ...prev, visitDate: "" };
    });
  }, [availableVisitDates, allowedVisitDatesSet]);

  useEffect(() => {
    if (!form.dateOfBirth) return;
    const parsed = new Date(form.dateOfBirth);
    if (Number.isNaN(parsed.getTime())) return;
    const first = new Date(parsed);
    first.setDate(1);
    const maxMonth = new Date(todayDateObj);
    maxMonth.setDate(1);
    setDobCalendarMonth(first > maxMonth ? maxMonth : first);
  }, [form.dateOfBirth]);

  useEffect(() => {
    if (!pendingSlotSelection) return;
    if (
      !pendingSlotSelection.slotId ||
      !pendingSlotSelection.doctorId ||
      pendingSlotSelection.doctorId !== form.doctor
    ) {
      if (
        pendingSlotSelection &&
        pendingSlotSelection.doctorId !== form.doctor
      ) {
        setPendingSlotSelection(null);
      }
      return;
    }
    const slots =
      doctorScheduleMap[String(pendingSlotSelection.doctorId)] || [];
    if (!slots.length) {
      return;
    }
    const matchingSlot = slots.find(
      (slot) =>
        slot.slotId &&
        String(slot.slotId) === String(pendingSlotSelection.slotId),
    );
    if (!matchingSlot) {
      setPendingSlotSelection(null);
      return;
    }
    setForm((prev) => ({
      ...prev,
      doctorSchedule: String(pendingSlotSelection.slotId),
      doctorScheduleSelection: matchingSlot.value,
    }));
    setPendingSlotSelection(null);
  }, [pendingSlotSelection, doctorScheduleMap, form.doctor]);

  const visitDateMin =
    availableVisitDates.length > 0 ? availableVisitDates[0] : today;
  const visitDateMax =
    availableVisitDates.length > 0
      ? availableVisitDates[availableVisitDates.length - 1]
      : undefined;

  const calendarDays = useMemo(() => {
    const monthStart = new Date(calendarMonth);
    const startOfMonth = new Date(monthStart);
    startOfMonth.setDate(1);
    const startDay = startOfMonth.getDay();
    const calendarStart = new Date(startOfMonth);
    calendarStart.setDate(startOfMonth.getDate() - startDay);
    const cells = [];
    for (let i = 0; i < 42; i += 1) {
      const dayDate = new Date(calendarStart);
      dayDate.setDate(calendarStart.getDate() + i);
      const iso = dayDate.toISOString().split("T")[0];
      cells.push({
        iso,
        label: dayDate.getDate(),
        isAllowed: allowedVisitDatesSet.has(iso),
        inCurrentMonth: dayDate.getMonth() === monthStart.getMonth(),
      });
    }
    return cells;
  }, [calendarMonth, allowedVisitDatesSet]);

  const dobCalendarDays = useMemo(() => {
    const monthStart = new Date(dobCalendarMonth);
    const startOfMonth = new Date(monthStart);
    startOfMonth.setDate(1);
    const startDay = startOfMonth.getDay();
    const calendarStart = new Date(startOfMonth);
    calendarStart.setDate(startOfMonth.getDate() - startDay);
    const cells = [];
    for (let i = 0; i < 42; i += 1) {
      const dayDate = new Date(calendarStart);
      dayDate.setDate(calendarStart.getDate() + i);
      const iso = dayDate.toISOString().split("T")[0];
      cells.push({
        iso,
        label: dayDate.getDate(),
        inCurrentMonth: dayDate.getMonth() === monthStart.getMonth(),
        isFuture: dayDate.getTime() > todayDateValue,
      });
    }
    return cells;
  }, [dobCalendarMonth, todayDateValue]);
  const visitYearOptions = useMemo(
    () => Array.from({ length: 12 }, (_, idx) => visitYearGridStart + idx),
    [visitYearGridStart],
  );
  const dobYearOptions = useMemo(() => {
    const options = Array.from(
      { length: 12 },
      (_, idx) => dobYearGridStart + idx,
    );
    return options.filter((year) => year <= currentYearValue);
  }, [dobYearGridStart, currentYearValue]);

  const handleCalendarSelect = (iso) => {
    if (!allowedVisitDatesSet.has(iso)) return;
    setVisitDateError(null);
    setForm((prev) => ({
      ...prev,
      visitDate: iso,
      doctorSchedule: "",
      doctorScheduleSelection: "",
    }));
    setIsVisitCalendarVisible(false);
    setVisitCalendarMode("day");
  };
  const handleDobCalendarSelect = (iso) => {
    const selectedDate = new Date(iso);
    if (selectedDate.getTime() > todayDateValue) return;
    setForm((prev) => ({
      ...prev,
      dateOfBirth: iso,
    }));
    setIsDobCalendarVisible(false);
    setDobCalendarMode("day");
  };

  const goToAdjacentMonth = (direction) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
  };
  const handleVisitCalendarNavigate = (direction) => {
    if (visitCalendarMode === "day") {
      goToAdjacentMonth(direction);
      return;
    }
    if (visitCalendarMode === "month") {
      setCalendarMonth((prev) => {
        const next = new Date(prev);
        next.setFullYear(prev.getFullYear() + direction);
        return next;
      });
      return;
    }
    setVisitYearGridStart((prev) => prev + direction * 12);
  };
  const handleVisitModeSwitch = (targetMode) => {
    setVisitCalendarMode((prev) => {
      const next = prev === targetMode ? "day" : targetMode;
      if (next === "year") {
        setVisitYearGridStart(calendarMonth.getFullYear() - 6);
      }
      return next;
    });
  };
  const handleVisitMonthSelect = (monthIndex) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(monthIndex);
      return next;
    });
    setVisitCalendarMode("day");
  };
  const handleVisitYearSelect = (year) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setFullYear(year);
      return next;
    });
    setVisitCalendarMode("month");
  };
  const alignDobYearStart = (year) => {
    const tentativeStart = year - 6;
    const maxStart = currentYearValue - 11;
    if (Number.isFinite(maxStart)) {
      setDobYearGridStart(Math.min(tentativeStart, maxStart));
    } else {
      setDobYearGridStart(tentativeStart);
    }
  };
  const handleDobModeSwitch = (targetMode) => {
    setDobCalendarMode((prev) => {
      const next = prev === targetMode ? "day" : targetMode;
      if (next === "year") {
        alignDobYearStart(dobCalendarMonth.getFullYear());
      }
      return next;
    });
  };
  const handleDobCalendarNavigate = (direction) => {
    if (dobCalendarMode === "day") {
      setDobCalendarMonth((prev) => {
        const next = new Date(prev);
        next.setMonth(prev.getMonth() + direction);
        const maxMonth = new Date(todayDateObj);
        maxMonth.setDate(1);
        return next > maxMonth ? maxMonth : next;
      });
      return;
    }
    if (dobCalendarMode === "month") {
      setDobCalendarMonth((prev) => {
        const next = new Date(prev);
        next.setFullYear(prev.getFullYear() + direction);
        const maxMonth = new Date(todayDateObj);
        maxMonth.setDate(1);
        return next > maxMonth ? maxMonth : next;
      });
      return;
    }
    const maxStart = currentYearValue - 11;
    setDobYearGridStart((prev) => {
      const proposed = prev + direction * 12;
      if (direction > 0) {
        return Math.min(proposed, maxStart);
      }
      return proposed;
    });
  };
  const handleDobMonthSelect = (monthIndex) => {
    setDobCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(monthIndex);
      const maxMonth = new Date(todayDateObj);
      maxMonth.setDate(1);
      return next > maxMonth ? maxMonth : next;
    });
    setDobCalendarMode("day");
  };
  const handleDobYearSelect = (year) => {
    if (year > currentYearValue) return;
    setDobCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setFullYear(year);
      return next;
    });
    setDobCalendarMode("month");
  };

  const filteredDoctorSlots = useMemo(() => {
    if (!selectedVisitDayName) return [];
    if (!form.visitDate) {
      return selectedDoctorSlots.filter(
        (slot) => slot.day === selectedVisitDayName,
      );
    }
    const visitDateKey = String(form.visitDate);
    return selectedDoctorSlots.filter((slot) => {
      if (slot.day !== selectedVisitDayName) return false;
      const absentDates = Array.isArray(slot.absentDates)
        ? slot.absentDates
        : [];
      return !absentDates.includes(visitDateKey);
    });
  }, [selectedDoctorSlots, selectedVisitDayName, form.visitDate]);

  useEffect(() => {
    if (!prefillDoctorId) return;
    if (!form.doctor || !form.visitDate) return;
    if (form.doctorSchedule || form.doctorScheduleSelection) return;
    if (!filteredDoctorSlots.length) return;
    const firstSlot = filteredDoctorSlots[0];
    setForm((prev) => ({
      ...prev,
      doctorScheduleSelection: firstSlot.value || "",
      doctorSchedule: firstSlot.slotId ? String(firstSlot.slotId) : "",
    }));
  }, [
    prefillDoctorId,
    form.doctor,
    form.visitDate,
    form.doctorSchedule,
    form.doctorScheduleSelection,
    filteredDoctorSlots,
  ]);
  const companyDisplayName =
    loggedInDetails?.company_name || loggedInDetails?.name || "MedCare";

  const openPatientModal = () => {
    setPatientForm(() => {
      const defaults = buildPatientFormState();
      return {
        ...defaults,
        name: form.name || "",
        gender: form.gender || "",
        mobile: form.mobile || "",
        dateOfBirth: form.dateOfBirth || "",
        country: form.country || "",
        state: form.state || "",
        district: form.district || "",
        ps: form.ps || "",
        address: form.address || "",
        pin: form.pin || "",
        health_insurance_company: form.health_insurance_company || "",
        policy_no: form.policy_no || "",
        policy_amount: form.policy_amount || "",
      };
    });
    setPatientSubmitError(null);
    setPatientSubmitSuccess(null);
    setIsPatientModalOpen(true);
  };

  const closePatientModal = () => {
    if (isPatientSubmitting) return;
    setIsPatientModalOpen(false);
    setPatientForm(buildPatientFormState());
    setPatientSubmitError(null);
    setPatientSubmitSuccess(null);
  };

  const handlePatientFieldChange = (event) => {
    const { name, value } = event.target;
    setPatientForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const filteredInsuranceOptions = useMemo(() => {
    const query = patientForm.health_insurance_company?.trim().toLowerCase();
    return insuranceOptions
      .filter((option) => {
        if (!query) return true;
        return option.toLowerCase().includes(query);
      })
      .slice(0, 8);
  }, [insuranceOptions, patientForm.health_insurance_company]);

  const updateInsuranceDropdownRect = () => {
    const wrapper = insuranceInputWrapperRef.current;
    if (!wrapper) return;
    const input = wrapper.querySelector("input");
    if (!input) return;
    const rect = input.getBoundingClientRect();
    setInsuranceDropdownRect({
      left: rect.left,
      top: rect.bottom + 8,
      width: rect.width,
    });
  };

  const handleInsuranceInputChange = (event) => {
    const { value } = event.target;
    setPatientForm((prev) => ({
      ...prev,
      health_insurance_company: value,
    }));
    setInsuranceHighlightIndex(-1);
    setIsInsuranceDropdownOpen(true);
    updateInsuranceDropdownRect();
  };

  const handleInsuranceSelect = (value) => {
    setPatientForm((prev) => ({
      ...prev,
      health_insurance_company: value,
    }));
    setIsInsuranceDropdownOpen(false);
    setInsuranceHighlightIndex(-1);
  };

  const handleInsuranceKeyDown = (event) => {
    if (!isInsuranceDropdownOpen) return;
    if (!filteredInsuranceOptions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setInsuranceHighlightIndex((prev) =>
        prev < filteredInsuranceOptions.length - 1 ? prev + 1 : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setInsuranceHighlightIndex((prev) =>
        prev > 0 ? prev - 1 : filteredInsuranceOptions.length - 1,
      );
    } else if (event.key === "Enter") {
      if (insuranceHighlightIndex >= 0) {
        event.preventDefault();
        handleInsuranceSelect(
          filteredInsuranceOptions[insuranceHighlightIndex],
        );
      }
    } else if (event.key === "Escape") {
      setIsInsuranceDropdownOpen(false);
      setInsuranceHighlightIndex(-1);
    }
  };

  useEffect(() => {
    if (!isInsuranceDropdownOpen) return;
    updateInsuranceDropdownRect();
    const handleScroll = () => updateInsuranceDropdownRect();
    const handleResize = () => updateInsuranceDropdownRect();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    const modalNode = modalScrollRef.current;
    if (modalNode) {
      modalNode.addEventListener("scroll", handleScroll, { passive: true });
    }
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
      if (modalNode) {
        modalNode.removeEventListener("scroll", handleScroll);
      }
    };
  }, [isInsuranceDropdownOpen]);

  const handlePatientModalSubmit = async (event) => {
    event.preventDefault();
    const resolvedCompanyId =
      companyId ||
      loggedInDetails?.company_id ||
      loggedInDetails?.companies?.[0]?.company_id;
    if (!resolvedCompanyId) {
      setPatientSubmitError(
        "Missing company context. Please login again or refresh the page.",
      );
      return;
    }
    if (!companyId) {
      setCompanyId(resolvedCompanyId);
    }
    if (!patientForm.name?.trim()) {
      setPatientSubmitError("Patient name is required.");
      return;
    }
    if (!patientForm.gender) {
      setPatientSubmitError("Gender is required.");
      return;
    }
    setPatientSubmitError(null);
    setPatientSubmitSuccess(null);
    setIsPatientSubmitting(true);
    try {
      const response = await createPatientRecord(
        patientForm,
        resolvedCompanyId,
      );
      const createdPatient = response?.data || response?.patient || response;
      const normalizedPatient = {
        id: createdPatient?.id,
        name: createdPatient?.name || patientForm.name,
        gender: createdPatient?.gender || patientForm.gender,
        mobile: createdPatient?.mobile || patientForm.mobile,
        dateOfBirth:
          createdPatient?.dateOfBirth ||
          createdPatient?.date_of_birth ||
          patientForm.dateOfBirth,
        country: createdPatient?.country || patientForm.country,
        state: createdPatient?.state || patientForm.state,
        district: createdPatient?.district || patientForm.district,
        ps: createdPatient?.ps || patientForm.ps,
        address: createdPatient?.address || patientForm.address,
        pin: createdPatient?.pin || patientForm.pin,
        health_insurance_company:
          createdPatient?.health_insurance_company ||
          patientForm.health_insurance_company,
        policy_no: createdPatient?.policy_no || patientForm.policy_no,
        policy_amount:
          createdPatient?.policy_amount || patientForm.policy_amount,
      };
      await fetchPatientList(resolvedCompanyId);
      setPatientSearchText(normalizedPatient.mobile || "");
      applyPatientSelectionToForm(normalizedPatient);
      setPatientSubmitSuccess("Patient saved successfully.");
      setTimeout(() => {
        closePatientModal();
      }, 800);
    } catch (patientError) {
      const apiError =
        patientError.response?.data?.errors ||
        patientError.response?.data?.error ||
        "Failed to save patient.";
      setPatientSubmitError(
        typeof apiError === "string" ? apiError : JSON.stringify(apiError),
      );
    } finally {
      setIsPatientSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-gradient-to-br from-blue-50 to-blue-100 flex justify-center px-3 py-6 sm:px-6 sm:py-10 lg:py-10">
      <div className="w-full max-w-6xl bg-white shadow-md rounded-2xl border border-blue-100 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:border-blue-300 hover:text-blue-600"
            >
              <span className="text-lg">←</span>
              <span>Back</span>
            </button>
            <img
              src="https://cdn-icons-png.flaticon.com/512/2966/2966484.png"
              alt="MedCare logo"
              className="w-12 h-12 rounded-full shadow-sm"
            />
            <span className="text-base font-semibold text-blue-700 sm:hidden truncate max-w-[160px]">
              {companyDisplayName}
            </span>
          </div>
          <span className="hidden sm:block text-2xl font-semibold text-blue-700">
            {companyDisplayName}
          </span>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3">
            <h1 className="order-1 text-2xl font-semibold text-blue-700 text-center sm:text-left">
              Hospital OPD Ticket Booking
            </h1>
            <div className="order-3 sm:order-2 w-full sm:w-auto sm:ml-auto">
              <div className="flex flex-col gap-2 w-full sm:w-80">
                <button
                  type="button"
                  onClick={openPatientModal}
                  className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition"
                >
                  + Add New Patient
                </button>
                <div ref={bookingSearchRef} className="relative w-full">
                  <label htmlFor="patient-search" className="sr-only">
                    Search patient by name or mobile number
                  </label>
                  <input
                    id="patient-search"
                    type="text"
                    value={patientSearchText}
                    onChange={handlePatientSearchInput}
                    onKeyDown={handlePatientSearchKeyDown}
                    onFocus={() => {
                      if (
                        patientSearchText.trim() &&
                        patientSuggestions.length > 0
                      ) {
                        setIsPatientDropdownOpen(true);
                      }
                    }}
                    placeholder="Search by name or mobile..."
                    className={`${fieldClassNames} pr-10`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    🔍
                  </span>
                  {isPatientLookupLoading && (
                    <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-gray-500 animate-pulse">
                      Loading...
                    </span>
                  )}
                  {patientLookupError && (
                    <p className="mt-1 text-xs text-red-500">
                      {patientLookupError}
                    </p>
                  )}
                  {isPatientDropdownOpen && (
                    <div className="absolute top-full z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {patientSuggestions.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-500">
                          {patientSearchText.trim()
                            ? "No matching records."
                            : "Type a mobile number to search."}
                        </p>
                      ) : (
                        patientSuggestions.map((patient, suggestionIdx) => {
                          const isActive =
                            suggestionIdx === activeSuggestionIndex;
                          return (
                            <button
                              type="button"
                              key={`${patient.id}-${patient.mobile}`}
                              className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition ${
                                isActive
                                  ? "bg-blue-100 text-blue-900"
                                  : "hover:bg-blue-50 focus:bg-blue-50"
                              }`}
                              onClick={() =>
                                handlePatientSuggestionSelect(patient)
                              }
                            >
                              <span className="font-semibold text-gray-800">
                                {patient.name || "Unknown"}
                              </span>
                              <span className="text-xs text-gray-500">
                                Mobile: {patient.mobile || "N/A"}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <p className="order-2 sm:order-3 text-center sm:text-right text-sm text-red-600">
            * marked fields are mandatory
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm"
        >
          {/* Hospital Name hidden */}
          <input type="hidden" name="hospital" value={form.company} readOnly />

          {/* Name */}
          <div>
            <label className="font-medium text-gray-700">
              Name: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className={fieldClassNames}
            />
          </div>

          {/* Gender */}
          <div>
            <label className="font-medium text-gray-700">
              Gender: <span className="text-red-500">*</span>
            </label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              required
              className={fieldClassNames}
            >
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>

          {/* Mobile */}
          <div>
            <label className="font-medium text-gray-700">
              Mobile No: <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="mobile"
              value={form.mobile}
              onChange={handleChange}
              pattern="[0-9]{10}"
              required
              className={fieldClassNames}
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="font-medium text-gray-700">
              Age : <span className="text-red-500">*</span>
            </label>

            <input
              type="number"
              name="dateOfBirth"
              value={form.dateOfBirth}
              onChange={handleChange}
              className={`${fieldClassNames} no-number-spin`}
              placeholder="Enter Your Age"
              required
            />
            {/* <input
              ref={dobInputRef}
              type="date"
              name="dateOfBirth"
              value={form.dateOfBirth}
              onChange={handleChange}
              max={today}
              required
              className="absolute w-0 h-0 -z-10 opacity-0 pointer-events-none"
            />

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsDobCalendarVisible((prev) => {
                    const next = !prev;
                    setDobCalendarMode("day");
                    if (next) {
                      const base = form.dateOfBirth
                        ? new Date(form.dateOfBirth)
                        : new Date(todayDateObj);
                      base.setDate(1);
                      const maxMonth = new Date(todayDateObj);
                      maxMonth.setDate(1);
                      setDobCalendarMonth(base > maxMonth ? maxMonth : base);
                    }
                    return next;
                  });
                  if (!isDobCalendarVisible) {
                    dobInputRef.current?.focus();
                  }
                }}
                className={`${fieldClassNames} font-semibold bg-gray-50 flex items-center justify-between`}
              >
                <span>{formatDateDisplay(form.dateOfBirth)}</span>
                <span className="text-gray-500">📅</span>
              </button>
              {isDobCalendarVisible && (
                <div className="absolute left-0 right-0 z-30 mt-2 max-h-[440px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl sm:max-w-md">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
                    <button
                      type="button"
                      className="text-sm text-gray-500 hover:text-blue-600"
                      onClick={() => handleDobCalendarNavigate(-1)}
                    >
                      ← Prev
                    </button>
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <button
                        type="button"
                        className={`rounded-md px-2 py-1 transition ${
                          dobCalendarMode === "month"
                            ? "text-blue-600"
                            : "hover:text-blue-600"
                        }`}
                        onClick={() => handleDobModeSwitch("month")}
                      >
                        {MONTH_LABELS[dobCalendarMonth.getMonth()]}
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        className={`rounded-md px-2 py-1 transition ${
                          dobCalendarMode === "year"
                            ? "text-blue-600"
                            : "hover:text-blue-600"
                        }`}
                        onClick={() => handleDobModeSwitch("year")}
                      >
                        {dobCalendarMonth.getFullYear()}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-gray-500 hover:text-blue-600"
                      onClick={() => handleDobCalendarNavigate(1)}
                    >
                      Next →
                    </button>
                  </div>
                  {dobCalendarMode === "day" && (
                    <>
                      <div className="px-4 pb-3 pt-2 text-xs uppercase text-gray-500 grid grid-cols-7 gap-2">
                        {CALENDAR_DAY_LABELS.map((label) => (
                          <span
                            key={`dob-${label}`}
                            className="text-center font-semibold"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                      <div className="px-3 pb-3 grid grid-cols-7 gap-x-2 gap-y-3 text-sm">
                        {dobCalendarDays.map((day) => {
                          const isSelected = form.dateOfBirth === day.iso;
                          const isDisabled = day.isFuture;
                          const baseClasses = [
                            "flex h-9 w-9 items-center justify-center rounded-full mx-auto text-xs font-medium transition",
                            day.inCurrentMonth
                              ? "text-gray-700"
                              : "text-gray-400",
                            isDisabled
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer",
                            isSelected
                              ? "ring-2 ring-green-500 ring-offset-1"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ");
                          return (
                            <button
                              type="button"
                              key={`dob-${day.iso}`}
                              disabled={isDisabled}
                              className={baseClasses}
                              onClick={() => handleDobCalendarSelect(day.iso)}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="px-4 pb-3 text-xs text-gray-500">
                        Future dates are disabled for date of birth.
                      </p>
                    </>
                  )}
                  {dobCalendarMode === "month" && (
                    <div className="px-4 py-4 grid grid-cols-3 gap-3 text-sm">
                      {MONTH_LABELS.map((label, idx) => {
                        const isActive = dobCalendarMonth.getMonth() === idx;
                        const targetYear = dobCalendarMonth.getFullYear();
                        const isDisabled =
                          targetYear > currentYearValue ||
                          (targetYear === currentYearValue &&
                            idx > currentMonthIndex);
                        return (
                          <button
                            type="button"
                            key={`dob-month-${label}`}
                            disabled={isDisabled}
                            className={`rounded-lg border px-3 py-2 text-center transition ${
                              isDisabled
                                ? "cursor-not-allowed border-gray-200 text-gray-300"
                                : isActive
                                ? "border-green-400 bg-green-50 text-green-700"
                                : "border-gray-200 text-gray-700 hover:border-blue-200 hover:text-blue-600"
                            }`}
                            onClick={() => handleDobMonthSelect(idx)}
                          >
                            {label.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {dobCalendarMode === "year" && (
                    <div className="px-4 py-4 grid grid-cols-3 gap-3 text-sm">
                      {dobYearOptions.map((year) => {
                        const isActive =
                          dobCalendarMonth.getFullYear() === year;
                        const isDisabled = year > currentYearValue;
                        return (
                          <button
                            type="button"
                            key={`dob-year-${year}`}
                            disabled={isDisabled}
                            className={`rounded-lg border px-3 py-2 text-center transition ${
                              isDisabled
                                ? "cursor-not-allowed border-gray-200 text-gray-300"
                                : isActive
                                ? "border-green-400 bg-green-50 text-green-700"
                                : "border-gray-200 text-gray-700 hover:border-blue-200 hover:text-blue-600"
                            }`}
                            onClick={() => handleDobYearSelect(year)}
                          >
                            {year}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div> */}
          </div>

          {/* Country */}
          {/* <div>
            <label className="font-medium text-gray-700">Country:*</label>
            <select
              name="country"
              value={form.country}
              onChange={handleChange}
              required
              className={fieldClassNames}
            >
              <option value="">Select</option>
              <option>India</option>
              <option>Bangladesh</option>
              <option>Nepal</option>
            </select>
          </div> */}

          {/* State */}
          {/* <div>
            <label className="font-medium text-gray-700">State:</label>
            <input
              type="text"
              name="state"
              value={form.state}
              onChange={handleChange}
              className={fieldClassNames}
            />
          </div> */}

          {/* District */}
          {/* <div>
            <label className="font-medium text-gray-700">District:</label>
            <input
              type="text"
              name="district"
              value={form.district}
              onChange={handleChange}
              className={fieldClassNames}
            />
          </div> */}

          {/* P.S */}
          {/* <div>
            <label className="font-medium text-gray-700">P.S:</label>
            <input
              type="text"
              name="ps"
              value={form.ps}
              onChange={handleChange}
              className={fieldClassNames}
            />
          </div> */}

          {/* Address */}
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="font-medium text-gray-700">
              Address: <span className="text-red-500">*</span>
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              rows="2"
              required
              className={`${fieldClassNames} resize-none`}
            ></textarea>
          </div>

          {/* Pin */}
          {/* <div>
            <label className="font-medium text-gray-700">Pin:*</label>
            <input
              type="text"
              name="pin"
              value={form.pin}
              onChange={handleChange}
              required
              className={fieldClassNames}
            />
          </div> */}

          {/* Aadhaar */}
          {/* <div>
            <label className="font-medium text-gray-700">
              Aadhaar No:{" "}
              <span className="text-red-500">(For UHID Creation)</span>
            </label>
            <input
              type="text"
              name="aadhaar"
              value={form.aadhaar}
              onChange={handleChange}
              inputMode="numeric"
              maxLength={14}
              pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}"
              placeholder="XXXX-XXXX-XXXX"
              title="Enter 12-digit Aadhaar number"
              className={fieldClassNames}
            />
          </div> */}

          {/* Health Id */}
          {/* <div>
            <label className="font-medium text-gray-700">Health Id:</label>
            <input
              type="text"
              name="healthId"
              value={form.healthId}
              onChange={handleChange}
              className={fieldClassNames}
            />
          </div> */}

          {/* Health Id Number */}
          {/* <div>
            <label className="font-medium text-gray-700">
              Health Id Number:
            </label>
            <input
              type="text"
              name="healthIdNumber"
              value={form.healthIdNumber}
              onChange={handleChange}
              className={fieldClassNames}
            />
          </div> */}

          {/* OPD */}
          <div>
            <label className="font-medium text-gray-700">
              Department: <span className="text-red-500">*</span>
            </label>
            <select
              name="department"
              value={form.department}
              onChange={handleChange}
              required
              className={fieldClassNames}
            >
              <option value="">Select</option>
              {allDepartment.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          {/* Doctor */}
          <div>
            <label className="font-medium text-gray-700">
              Doctor: <span className="text-red-500">*</span>
            </label>
            <select
              name="doctor"
              value={form.doctor}
              onChange={handleChange}
              required
              className={fieldClassNames}
              disabled={
                !form.department ||
                isDoctorLoading ||
                doctorOptions.length === 0
              }
            >
              <option value="">
                {isDoctorLoading
                  ? "Loading doctors..."
                  : !form.department
                    ? "Select OPD first"
                    : doctorOptions.length === 0
                      ? "No doctors available"
                      : "Select Doctor"}
              </option>
              {doctorOptions.map((schedule) => {
                const labelParts = [
                  schedule.doctor_name || `Doctor #${schedule.doctor}`,
                ];
                if (schedule.doctor_type_name) {
                  labelParts.push(`(${schedule.doctor_type_name})`);
                }
                return (
                  <option key={schedule.doctor} value={schedule.doctor}>
                    {labelParts.join(" ")}
                  </option>
                );
              })}
            </select>
            {doctorFetchError && (
              <p className="text-xs text-red-500 mt-1">{doctorFetchError}</p>
            )}
          </div>
          {/* Visit Date */}
          <div>
            <label className="font-medium text-gray-700">
              Visit Date: <span className="text-red-500">*</span>
            </label>
            <input
              ref={visitDateInputRef}
              type="date"
              name="visitDate"
              value={form.visitDate}
              onChange={handleChange}
              min={visitDateMin}
              max={visitDateMax}
              disabled={availableVisitDates.length > 0 && !form.doctor}
              required
              className="absolute w-0 h-0 -z-10 opacity-0 pointer-events-none"
            />
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsVisitCalendarVisible((prev) => {
                    const next = !prev;
                    setVisitCalendarMode("day");
                    return next;
                  });
                  if (!isVisitCalendarVisible) {
                    visitDateInputRef.current?.focus();
                  }
                }}
                className={`${fieldClassNames} font-semibold bg-gray-50 flex items-center justify-between`}
                disabled={availableVisitDates.length > 0 && !form.doctor}
              >
                <span>{formatDateDisplay(form.visitDate)}</span>
                <span className="text-gray-500">📅</span>
              </button>
              {form.doctor && isVisitCalendarVisible && (
                <div className="absolute left-0 right-0 z-30 mt-2 max-h-[440px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl sm:max-w-md">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
                    <button
                      type="button"
                      className="text-sm text-gray-500 hover:text-blue-600 disabled:opacity-40"
                      onClick={() => handleVisitCalendarNavigate(-1)}
                      disabled={!availableVisitDates.length}
                    >
                      ← Prev
                    </button>
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <button
                        type="button"
                        className={`rounded-md px-2 py-1 transition ${
                          visitCalendarMode === "month"
                            ? "text-blue-600"
                            : "hover:text-blue-600"
                        }`}
                        onClick={() => handleVisitModeSwitch("month")}
                      >
                        {MONTH_LABELS[calendarMonth.getMonth()]}
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        className={`rounded-md px-2 py-1 transition ${
                          visitCalendarMode === "year"
                            ? "text-blue-600"
                            : "hover:text-blue-600"
                        }`}
                        onClick={() => handleVisitModeSwitch("year")}
                      >
                        {calendarMonth.getFullYear()}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-gray-500 hover:text-blue-600 disabled:opacity-40"
                      onClick={() => handleVisitCalendarNavigate(1)}
                      disabled={!availableVisitDates.length}
                    >
                      Next →
                    </button>
                  </div>
                  {visitCalendarMode === "day" && (
                    <>
                      <div className="px-4 pb-3 pt-2 text-xs uppercase text-gray-500 grid grid-cols-7 gap-2">
                        {CALENDAR_DAY_LABELS.map((label) => (
                          <span
                            key={label}
                            className="text-center font-semibold"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                      <div className="px-3 pb-3 grid grid-cols-7 gap-x-2 gap-y-3 text-sm">
                        {calendarDays.map((day) => {
                          const isSelected = form.visitDate === day.iso;
                          const baseClasses = [
                            "flex h-9 w-9 items-center justify-center rounded-full mx-auto text-xs font-medium transition",
                            day.inCurrentMonth
                              ? "text-gray-700"
                              : "text-gray-400",
                            day.isAllowed
                              ? "bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed",
                            isSelected
                              ? "ring-2 ring-green-500 ring-offset-1"
                              : "",
                            !day.isAllowed ? "opacity-60" : "",
                          ]
                            .filter(Boolean)
                            .join(" ");
                          return (
                            <button
                              type="button"
                              key={day.iso}
                              disabled={!day.isAllowed}
                              className={baseClasses}
                              onClick={() => handleCalendarSelect(day.iso)}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="px-4 pb-3 text-xs text-gray-500">
                        Green dates match the selected doctor's available days.
                      </p>
                    </>
                  )}
                  {visitCalendarMode === "month" && (
                    <div className="px-4 py-4 grid grid-cols-3 gap-3 text-sm">
                      {MONTH_LABELS.map((label, idx) => {
                        const isActive = calendarMonth.getMonth() === idx;
                        return (
                          <button
                            type="button"
                            key={label}
                            className={`rounded-lg border px-3 py-2 text-center transition ${
                              isActive
                                ? "border-green-400 bg-green-50 text-green-700"
                                : "border-gray-200 text-gray-700 hover:border-blue-200 hover:text-blue-600"
                            }`}
                            onClick={() => handleVisitMonthSelect(idx)}
                          >
                            {label.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {visitCalendarMode === "year" && (
                    <div className="px-4 py-4 grid grid-cols-3 gap-3 text-sm">
                      {visitYearOptions.map((year) => {
                        const isActive = calendarMonth.getFullYear() === year;
                        return (
                          <button
                            type="button"
                            key={`visit-year-${year}`}
                            className={`rounded-lg border px-3 py-2 text-center transition ${
                              isActive
                                ? "border-green-400 bg-green-50 text-green-700"
                                : "border-gray-200 text-gray-700 hover:border-blue-200 hover:text-blue-600"
                            }`}
                            onClick={() => handleVisitYearSelect(year)}
                          >
                            {year}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            {allowedDayNamesDisplay.length > 0 && (
              <p className="text-[13px] text-gray-800 mt-1">
                Available days: {allowedDayNamesDisplay.join(", ")}.
              </p>
            )}
            {visitDateError && (
              <p className="text-[12px] text-red-500 mt-1">{visitDateError}</p>
            )}
          </div>

          {/* Fees */}
          <div>
            <label className="font-medium text-gray-700">Fees:</label>
            <input
              type="text"
              name="fees"
              value={form.fees}
              readOnly
              placeholder={form.doctor ? "Auto-filled" : "Select a doctor"}
              className={fieldClassNames}
            />
          </div>

          {form.doctor && (
            <div className="sm:col-span-2">
              <label className="font-medium text-gray-700">
                Available Day → Time Slot:{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                name="doctorSchedule"
                value={form.doctorScheduleSelection}
                onChange={handleChange}
                className={fieldClassNames}
                required
                disabled={
                  !selectedVisitDayName || filteredDoctorSlots.length === 0
                }
              >
                <option value="">
                  {!selectedVisitDayName
                    ? "Select a visit date to view slots"
                    : filteredDoctorSlots.length === 0
                      ? "No slots available for the selected date"
                      : "Choose a time slot"}
                </option>
                {filteredDoctorSlots.map((slot, idx) => {
                  const optionKey =
                    slot.value ||
                    `${slot.scheduleId || "schedule"}-${slot.day || "day"}-${
                      slot.slotId || "slot"
                    }-${idx}`;
                  return (
                    <option key={optionKey} value={slot.value}>
                      {slot.label}
                    </option>
                  );
                })}
              </select>
              {selectedDoctorSlots.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No published schedule found for the selected doctor.
                </p>
              )}
              {selectedVisitDayName && filteredDoctorSlots.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                  No slots available for {selectedVisitDayName}. Please pick a
                  different date.
                </p>
              )}
              {selectedVisitDayName && filteredDoctorSlots.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  Select any available slot for {selectedVisitDayName}.
                </p>
              )}
              {!selectedVisitDayName && (
                <p className="text-xs text-blue-600 mt-1">
                  Choose a highlighted visit date to view matching slots.
                </p>
              )}
            </div>
          )}

          {form.doctor && (
            <>
              <div>
                <label className="font-medium text-gray-700">
                  Advance Received Amt:
                </label>
                <input
                  type="number"
                  name="advance_received_amt"
                  value={form.advance_received_amt}
                  onChange={handleChange}
                  className={`${fieldClassNames} no-number-spin`}
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="font-medium text-gray-700">
                  Receipt/Transfer No:
                </label>
                <input
                  type="text"
                  name="receipt_transfer_no"
                  value={form.receipt_transfer_no}
                  onChange={handleChange}
                  className={fieldClassNames}
                />
              </div>
            </>
          )}

          {submitError && (
            <div className="sm:col-span-2 lg:col-span-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}
          {submitSuccess && (
            <div className="sm:col-span-2 lg:col-span-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
              {submitSuccess}
            </div>
          )}

          {/* Buttons */}
          <div className="sm:col-span-2 lg:col-span-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
            <button
              type="reset"
              className="w-full sm:w-auto bg-red-500 text-white px-6 py-2 rounded-md font-medium hover:bg-red-600 transition"
              onClick={() => {
                setForm((prev) => ({
                  ...buildInitialFormState(),
                  company: companyId ? prev.company : "",
                  visitDate: "",
                }));
                setDoctorOptions([]);
                setDoctorScheduleMap({});
                setDoctorFetchError(null);
                setIsPatientFetched(false);
                setSelectedPatient(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="w-full sm:w-auto bg-yellow-500 text-white px-6 py-2 rounded-md font-medium hover:bg-yellow-600 transition"
              onClick={() => alert("Returning Home")}
            >
              Home
            </button>
            {isPatientFetched && (
              <button
                type="button"
                className="w-full sm:w-auto bg-gray-800 text-white px-6 py-2 rounded-md font-medium hover:bg-gray-900 transition"
                onClick={handleIpdTransfer}
              >
                IPD Transfer
                <span className="text-lg">↗</span>
              </button>
            )}
          </div>
        </form>
      </div>
      {isPatientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:py-10 overflow-y-auto">
          <div
            className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
            onClick={closePatientModal}
            aria-hidden="true"
          />
          <div
            ref={modalScrollRef}
            className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
            style={{
              transform: `translate(${patientDialogPosition.x}px, ${patientDialogPosition.y}px)`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Add New Patient
                </h2>
                <p className="text-sm text-gray-500">
                  Capture patient information for future OPD bookings.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onMouseDown={handlePatientDialogDragStart}
                  className="cursor-grab rounded-full border border-gray-200 p-2 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  aria-label="Drag dialog"
                >
                  ⠿
                </button>
                <button
                  type="button"
                  onClick={closePatientModal}
                  className="rounded-full border border-gray-200 p-2 text-gray-500 hover:text-gray-700 hover:border-gray-300 disabled:opacity-50"
                  disabled={isPatientSubmitting}
                  aria-label="Close patient modal"
                >
                  ✕
                </button>
              </div>
            </div>
            <form onSubmit={handlePatientModalSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-medium text-gray-700">
                    Patient Name :<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={patientForm.name}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-gray-700">
                    Gender :<span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={patientForm.gender}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                    required
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Mobile :</label>
                  <input
                    type="tel"
                    name="mobile"
                    value={patientForm.mobile}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                    placeholder="10 digit mobile no"
                  />
                </div>
                <div>
                  <label className="font-medium text-gray-700">
                    Age :<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="dateOfBirth"
                    value={patientForm.dateOfBirth}
                    onChange={handlePatientFieldChange}
                    className={`${fieldClassNames} no-number-spin`}
                    placeholder="Enter Your Age"
                    required
                  />
                  {/* <input
                    type="date"
                    name="dateOfBirth"
                    value={patientForm.dateOfBirth}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                    max={today}
                  /> */}
                </div>
                <div>
                  <label className="font-medium text-gray-700">Country :</label>
                  <input
                    type="text"
                    name="country"
                    value={patientForm.country || "India"}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                  />
                </div>
                <div>
                  <label className="font-medium text-gray-700">State :</label>
                  <input
                    type="text"
                    name="state"
                    value={patientForm.state}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                  />
                </div>
                <div>
                  <label className="font-medium text-gray-700">
                    District :
                  </label>
                  <input
                    type="text"
                    name="district"
                    value={patientForm.district}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                  />
                </div>
                <div>
                  <label className="font-medium text-gray-700">
                    Police Station :
                  </label>
                  <input
                    type="text"
                    name="ps"
                    value={patientForm.ps}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                  />
                </div>
                <div>
                  <label className="font-medium text-gray-700">PIN :</label>
                  <input
                    type="text"
                    name="pin"
                    value={patientForm.pin}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="font-medium text-gray-700">Address :</label>
                  <textarea
                    name="address"
                    value={patientForm.address}
                    onChange={handlePatientFieldChange}
                    className={`${fieldClassNames} min-h-[80px]`}
                  />
                </div>
                <div ref={insuranceInputWrapperRef}>
                  <label className="font-medium text-gray-700">
                    Health Insurance Company :
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="health_insurance_company"
                      value={patientForm.health_insurance_company}
                      onChange={handleInsuranceInputChange}
                      onFocus={() => {
                        setIsInsuranceDropdownOpen(true);
                        updateInsuranceDropdownRect();
                      }}
                      onBlur={() =>
                        setTimeout(
                          () => setIsInsuranceDropdownOpen(false),
                          120,
                        )
                      }
                      onKeyDown={handleInsuranceKeyDown}
                      className={`${fieldClassNames} pr-10`}
                      placeholder={
                        isInsuranceOptionsLoading
                          ? "Loading insurance companies..."
                          : "Type or choose"
                      }
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      ▾
                    </span>
                    {isInsuranceDropdownOpen &&
                      insuranceDropdownRect &&
                      typeof document !== "undefined" &&
                      createPortal(
                        <div
                          className="rounded-xl border border-gray-200 bg-white shadow-2xl"
                          style={{
                            position: "fixed",
                            left: insuranceDropdownRect.left,
                            top: insuranceDropdownRect.top,
                            width: insuranceDropdownRect.width,
                            zIndex: 70,
                          }}
                        >
                          {filteredInsuranceOptions.length ? (
                            <ul className="max-h-48 overflow-auto py-1 text-sm text-gray-700">
                              {filteredInsuranceOptions.map(
                                (option, index) => (
                                  <li key={option} role="option">
                                    <div
                                      role="button"
                                      tabIndex={-1}
                                      title=""
                                      aria-label={option}
                                      onMouseDown={(event) =>
                                        event.preventDefault()
                                      }
                                      onClick={() =>
                                        handleInsuranceSelect(option)
                                      }
                                      className={`w-full cursor-pointer px-3 py-2 text-left transition ${
                                        index === insuranceHighlightIndex
                                          ? "bg-blue-50 text-blue-700"
                                          : "hover:bg-gray-50"
                                      }`}
                                    >
                                      {option}
                                    </div>
                                  </li>
                                ),
                              )}
                            </ul>
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              {isInsuranceOptionsLoading
                                ? "Loading..."
                                : "No matches found"}
                            </div>
                          )}
                        </div>,
                        document.body,
                      )}
                  </div>
                  {insuranceOptionsError && (
                    <p className="mt-1 text-xs text-red-500">
                      {insuranceOptionsError}
                    </p>
                  )}
                </div>
                <div>
                  <label className="font-medium text-gray-700">
                    Policy No :
                  </label>
                  <input
                    type="text"
                    name="policy_no"
                    value={patientForm.policy_no}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                  />
                </div>
                <div>
                  <label className="font-medium text-gray-700">
                    Policy Amount :
                  </label>
                  <input
                    type="number"
                    name="policy_amount"
                    value={patientForm.policy_amount}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              {patientSubmitError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                  {patientSubmitError}
                </div>
              )}
              {patientSubmitSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                  {patientSubmitSuccess}
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closePatientModal}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800 disabled:opacity-50"
                  disabled={isPatientSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={isPatientSubmitting}
                >
                  {isPatientSubmitting ? "Saving..." : "Save Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <SuccessDialog
        open={isSuccessDialogOpen}
        onClose={closeSuccessDialog}
        message={successMessage}
      />
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

export default function OPDBookingPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
      <OPDBookingPageContent />
    </Suspense>
  );
}
