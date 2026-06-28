"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  get_Hospital_User_Login_Details,
  getPatients,
  getAllDoctors,
  getEmergencyVisits,
  createEmergencyVisit,
  updateEmergencyVisit,
  createPatientRecord,
} from "@/app/api/apiService";

const TRIAGE_OPTIONS = [
  { value: "Critical", label: "Critical" },
  { value: "Urgent", label: "Urgent" },
  { value: "Stable", label: "Stable" },
  { value: "Deceased/Dead on arrival", label: "Deceased/Dead on arrival" },
];

const TRIAGE_OPTION_STYLES = {
  Critical: { backgroundColor: "#dc2626", color: "#fff" },
  Urgent: { backgroundColor: "#facc15", color: "#111827" },
  Stable: { backgroundColor: "#16a34a", color: "#fff" },
  "Deceased/Dead on arrival": { backgroundColor: "#000", color: "#fff" },
};

const STATUS_OPTIONS = [
  { value: "REGISTERED", label: "Registered" },
  { value: "TRIAGED", label: "Triaged" },
  { value: "UNDER_TREATMENT", label: "Under Treatment" },
  { value: "OBSERVATION", label: "Observation" },
  { value: "ADMITTED", label: "Admitted" },
  { value: "DISCHARGED", label: "Discharged" },
  { value: "REFERRED", label: "Referred" },
  { value: "LAMA", label: "LAMA" },
  { value: "DEATH", label: "Death" },
];

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

const TABLE_COLUMNS = [
  { key: "emer_no", label: "Emergency No" },
  { key: "patient_name", label: "Patient" },
  { key: "age", label: "Age" },
  { key: "gender", label: "Gender" },
  { key: "triage_level", label: "Triage" },
  { key: "status", label: "Status" },
  { key: "attending_doctor_name", label: "Doctor" },
  { key: "mobile_no", label: "Mobile" },
  { key: "brought_by_name", label: "Brought By" },
  { key: "referred_from", label: "Referred From" },
  { key: "visit_datetime", label: "Visit Date" },
  { key: "outcome_datetime", label: "Outcome Date" },
  { key: "actions", label: "Action" },
];

const initialFormState = {
  patient: "",
  age: "",
  gender: "",
  mobile_no: "",
  address: "",
  visit_datetime: "",
  brought_by_name: "",
  brought_by_mobile: "",
  referred_from: "",
  referral_note: "",
  triage_level: "",
  attending_doctor_name: "",
  status: "REGISTERED",
  outcome_datetime: "",
  discharge_summary: "",
};

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

const formatLocalISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTimeHHMM = (date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;

const getTimeFromDateTime = (value) => {
  if (!value) return "";
  const timePart = value.split("T")[1];
  if (!timePart) return "";
  return timePart.slice(0, 5);
};

const combineDateAndTime = (isoDate, existingDateTime) => {
  const timePart =
    getTimeFromDateTime(existingDateTime) || formatTimeHHMM(new Date());
  return `${isoDate}T${timePart}`;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
};

const parseDateInput = (value) => {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const match = String(value)
    .trim()
    .match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day);
    }
  }

  const named = new Date(Date.parse(value));
  if (!Number.isNaN(named.getTime())) return named;

  return null;
};

const getAgeFromDateOfBirth = (dobValue) => {
  if (!dobValue) return "";
  const dob = parseDateInput(dobValue);
  if (!dob) return "";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : "";
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
      iso: formatLocalISODate(dayDate),
      label: dayDate.getDate(),
      inCurrentMonth: dayDate.getMonth() === monthDate.getMonth(),
    });
  }
  return days;
};

export default function EmergencyBooking() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 0 });
  const [isDraggingDialog, setIsDraggingDialog] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [emergencyVisits, setEmergencyVisits] = useState([]);
  const [submitError, setSubmitError] = useState("");
  const [isEmergencyLoading, setIsEmergencyLoading] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState(null);
  const [isVisitCalendarVisible, setIsVisitCalendarVisible] = useState(false);
  const [isOutcomeCalendarVisible, setIsOutcomeCalendarVisible] =
    useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const seed = formData.visit_datetime
      ? new Date(formData.visit_datetime)
      : new Date();
    if (Number.isNaN(seed.getTime())) {
      return new Date();
    }
    return new Date(seed.getFullYear(), seed.getMonth(), 1);
  });
  const [yearOptions, setYearOptions] = useState(() =>
    buildYearOptions(new Date().getFullYear()),
  );
  const [outcomeCalendarMonth, setOutcomeCalendarMonth] = useState(() => {
    const seed = formData.outcome_datetime
      ? new Date(formData.outcome_datetime)
      : new Date();
    if (Number.isNaN(seed.getTime())) {
      return new Date();
    }
    return new Date(seed.getFullYear(), seed.getMonth(), 1);
  });
  const [outcomeYearOptions, setOutcomeYearOptions] = useState(() =>
    buildYearOptions(new Date().getFullYear()),
  );
  const dialogRef = useRef(null);
  const dialogDragStateRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const dialogBaseRectRef = useRef(null);

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isAddPatientButtonDisabled, setIsAddPatientButtonDisabled] =
    useState(false);
  const [patientForm, setPatientForm] = useState({
    name: "",
    gender: "",
    mobile: "",
    dateOfBirth: "",
    country: "India",
    state: "",
    district: "",
    ps: "",
    address: "",
    pin: "",
    health_insurance_company: "",
    policy_no: "",
    policy_amount: "",
  });
  const [isPatientSubmitting, setIsPatientSubmitting] = useState(false);
  const [patientSubmitError, setPatientSubmitError] = useState("");
  const [patientSubmitSuccess, setPatientSubmitSuccess] = useState("");
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
  const INSURANCE_FETCH_LIMIT = 200;

  const [isPatientsLoading, setIsPatientsLoading] = useState(false);
  const [isDoctorsLoading, setIsDoctorsLoading] = useState(false);

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username) return;
    get_Hospital_User_Login_Details(username)
      .then((data) => {
        const resolvedCompanyId =
          data?.company_id || data?.companies?.[0]?.company_id;
        if (resolvedCompanyId) {
          setCompanyId(resolvedCompanyId);
        }
      })
      .catch((error) => {
        console.error("Error fetching user:", error);
      });
  }, []);

  const fetchPatientsList = async (company_id) => {
    if (!company_id) return;
    setIsPatientsLoading(true);
    try {
      const data = await getPatients(company_id);
      setPatients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Unable to load patients:", error);
      setPatients([]);
    } finally {
      setIsPatientsLoading(false);
    }
  };

  useEffect(() => {
    if (!companyId) return;
    fetchPatientsList(companyId);
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
    if (!companyId) return;
    setIsDoctorsLoading(true);
    getAllDoctors(companyId)
      .then((data) => setDoctors(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error("Unable to load doctors:", error);
        setDoctors([]);
      })
      .finally(() => setIsDoctorsLoading(false));
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    setIsEmergencyLoading(true);
    getEmergencyVisits(companyId)
      .then((data) => setEmergencyVisits(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error("Unable to load emergency visits:", error);
        setEmergencyVisits([]);
      })
      .finally(() => setIsEmergencyLoading(false));
  }, [companyId]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSubmitError("");
    setIsAddPatientButtonDisabled(false);
    const now = new Date();
    const datetime = now.toISOString().slice(0, 16);
    setFormData((prev) => ({ ...prev, visit_datetime: datetime }));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSubmitError("");
    setIsAddPatientButtonDisabled(false);
    setFormData(initialFormState);
    setIsVisitCalendarVisible(false);
    setIsOutcomeCalendarVisible(false);
    setEditingVisitId(null);
  };

  const clampDialogPosition = useCallback((position) => {
    const dialog = dialogRef.current;
    if (!dialog || typeof window === "undefined") return position;
    const baseRect = dialogBaseRectRef.current;
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
    if (!isModalOpen) return;
    requestAnimationFrame(() => {
      if (dialogRef.current) {
        dialogBaseRectRef.current = dialogRef.current.getBoundingClientRect();
      }
      setDialogPosition({ x: 0, y: 0 });
    });
  }, [isModalOpen]);

  useEffect(() => {
    if (!isDraggingDialog) return;
    const handleMouseMove = (event) => {
      const deltaX = event.clientX - dialogDragStateRef.current.startX;
      const deltaY = event.clientY - dialogDragStateRef.current.startY;
      setDialogPosition(
        clampDialogPosition({
          x: dialogDragStateRef.current.originX + deltaX,
          y: dialogDragStateRef.current.originY + deltaY,
        }),
      );
    };
    const handleMouseUp = () => {
      setIsDraggingDialog(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [clampDialogPosition, isDraggingDialog]);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleResize = () => {
      if (dialogRef.current) {
        dialogBaseRectRef.current = dialogRef.current.getBoundingClientRect();
      }
      setDialogPosition((prev) => clampDialogPosition(prev));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampDialogPosition, isModalOpen]);

  const handleDialogDragStart = (event) => {
    event.preventDefault();
    dialogDragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: dialogPosition.x,
      originY: dialogPosition.y,
    };
    setIsDraggingDialog(true);
  };

  const openPatientModal = () => {
    setPatientForm({
      name: "",
      gender: "",
      mobile: "",
      dateOfBirth: "",
      country: "India",
      state: "",
      district: "",
      ps: "",
      address: "",
      pin: "",
      health_insurance_company: "",
      policy_no: "",
      policy_amount: "",
    });
    setPatientSubmitError("");
    setPatientSubmitSuccess("");
    setIsPatientModalOpen(true);
  };

  const closePatientModal = () => {
    if (isPatientSubmitting) return;
    setIsPatientModalOpen(false);
    setPatientSubmitError("");
    setPatientSubmitSuccess("");
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
    if (!companyId) {
      setPatientSubmitError(
        "Missing company context. Please login again or refresh the page.",
      );
      return;
    }
    if (!patientForm.name?.trim()) {
      setPatientSubmitError("Patient name is required.");
      return;
    }
    if (!patientForm.gender) {
      setPatientSubmitError("Gender is required.");
      return;
    }
    setPatientSubmitError("");
    setPatientSubmitSuccess("");
    setIsPatientSubmitting(true);
    try {
      const response = await createPatientRecord(patientForm, companyId);
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
        address: createdPatient?.address || patientForm.address,
      };
      await fetchPatientsList(companyId);
      setFormData((prev) => ({
        ...prev,
        patient: normalizedPatient.id || prev.patient,
        age: normalizedPatient.dateOfBirth || prev.age,
        gender: normalizedPatient.gender || prev.gender,
        mobile_no: normalizedPatient.mobile || prev.mobile_no,
        address: normalizedPatient.address || prev.address,
      }));
      setIsAddPatientButtonDisabled(true);
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

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name === "patient") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (!formData.patient) return;
    const selected = patients.find(
      (patient) => String(patient.id) === String(formData.patient),
    );
    if (!selected) return;

    setFormData((prev) => ({
      ...prev,
      age: selected.dateOfBirth,
      gender: selected?.gender || "",
      mobile_no: selected?.mobile || selected?.mobile_no || prev.mobile_no,
      address: selected?.address || prev.address,
    }));
  }, [formData.patient, patients]);

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth),
    [calendarMonth],
  );
  const outcomeCalendarDays = useMemo(
    () => buildCalendarDays(outcomeCalendarMonth),
    [outcomeCalendarMonth],
  );

  const handleCalendarNavigate = (direction) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
  };

  const handleCalendarMonthChange = (event) => {
    const nextMonth = Number(event.target.value);
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(nextMonth);
      return next;
    });
  };

  const handleCalendarYearChange = (event) => {
    const nextYear = Number(event.target.value);
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setFullYear(nextYear);
      return next;
    });
  };

  const handleOutcomeCalendarNavigate = (direction) => {
    setOutcomeCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
  };

  const handleOutcomeCalendarMonthChange = (event) => {
    const nextMonth = Number(event.target.value);
    setOutcomeCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(nextMonth);
      return next;
    });
  };

  const handleOutcomeCalendarYearChange = (event) => {
    const nextYear = Number(event.target.value);
    setOutcomeCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setFullYear(nextYear);
      return next;
    });
  };

  const handleCalendarSelect = (isoDate) => {
    setFormData((prev) => ({
      ...prev,
      visit_datetime: combineDateAndTime(isoDate, prev.visit_datetime),
    }));
    setIsVisitCalendarVisible(false);
  };

  const handleOutcomeCalendarSelect = (isoDate) => {
    setFormData((prev) => ({
      ...prev,
      outcome_datetime: combineDateAndTime(isoDate, prev.outcome_datetime),
    }));
    setIsOutcomeCalendarVisible(false);
  };

  useEffect(() => {
    if (!isVisitCalendarVisible) return;
    if (!formData.visit_datetime) return;
    const selected = new Date(formData.visit_datetime);
    if (Number.isNaN(selected.getTime())) return;
    setCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [formData.visit_datetime, isVisitCalendarVisible]);

  useEffect(() => {
    if (!isOutcomeCalendarVisible) return;
    if (!formData.outcome_datetime) return;
    const selected = new Date(formData.outcome_datetime);
    if (Number.isNaN(selected.getTime())) return;
    setOutcomeCalendarMonth(
      new Date(selected.getFullYear(), selected.getMonth(), 1),
    );
  }, [formData.outcome_datetime, isOutcomeCalendarVisible]);

  useEffect(() => {
    setYearOptions(buildYearOptions(calendarMonth.getFullYear()));
  }, [calendarMonth]);

  useEffect(() => {
    setOutcomeYearOptions(buildYearOptions(outcomeCalendarMonth.getFullYear()));
  }, [outcomeCalendarMonth]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    if (!formData.patient || !formData.triage_level || !formData.status) {
      setSubmitError("Please complete required fields.");
      return;
    }
    if (!companyId) {
      setSubmitError("Company details are missing.");
      return;
    }

    const payload = {
      patient: formData.patient,
      age: formData.age || null,
      gender: formData.gender || null,
      mobile_no: formData.mobile_no || null,
      address: formData.address || null,
      visit_datetime: formData.visit_datetime || null,
      brought_by_name: formData.brought_by_name || null,
      brought_by_mobile: formData.brought_by_mobile || null,
      referred_from: formData.referred_from || null,
      referral_note: formData.referral_note || null,
      triage_level: formData.triage_level,
      attending_doctor_name: formData.attending_doctor_name || null,
      status: formData.status,
      outcome_datetime: formData.outcome_datetime || null,
      discharge_summary: formData.discharge_summary || null,
    };

    try {
      if (editingVisitId) {
        const record = await updateEmergencyVisit(
          editingVisitId,
          payload,
          companyId,
        );
        setEmergencyVisits((prev) =>
          prev.map((visit) => (visit.id === record.id ? record : visit)),
        );
      } else {
        const record = await createEmergencyVisit(payload, companyId);
        setEmergencyVisits((prev) => [record, ...prev]);
      }
      handleCloseModal();
    } catch (error) {
      console.error("Unable to save emergency visit:", error);
      setSubmitError("Unable to save emergency visit. Please try again.");
    }
  };

  const handleEditVisit = (visit) => {
    setEditingVisitId(visit.id);
    setIsAddPatientButtonDisabled(false);
    setFormData({
      patient: visit.patient_id || visit.patient || "",
      age: visit.age || "",
      gender: visit.gender || "",
      mobile_no: visit.mobile_no || "",
      address: visit.address || "",
      visit_datetime: visit.visit_datetime
        ? new Date(visit.visit_datetime).toISOString().slice(0, 16)
        : "",
      brought_by_name: visit.brought_by_name || "",
      brought_by_mobile: visit.brought_by_mobile || "",
      referred_from: visit.referred_from || "",
      referral_note: visit.referral_note || "",
      triage_level: visit.triage_level || "",
      attending_doctor_name:
        visit.attending_doctor_id || visit.attending_doctor_name || "",
      status: visit.status || "REGISTERED",
      outcome_datetime: visit.outcome_datetime
        ? new Date(visit.outcome_datetime).toISOString().slice(0, 16)
        : "",
      discharge_summary: visit.discharge_summary || "",
    });
    setIsModalOpen(true);
    setSubmitError("");
  };

  const handleViewVisit = (visit) => {
    if (!visit?.id) return;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("emergencyTicketData", JSON.stringify(visit));
    }
    const query = new URLSearchParams({
      id: String(visit.id),
      ...(visit?.emer_no ? { emerNo: String(visit.emer_no) } : {}),
    });
    router.push(`/emergency-ticket/ticket?${query.toString()}`);
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 p-6">
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Emergency Patient List
            </h1>
            <p className="text-sm text-slate-500">
              Track emergency visits and capture triage details in real time.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
          >
            <span className="text-lg">+</span>
            Add Emergency Patient
          </button>
        </header>

        <div className="rounded-2xl bg-white shadow-sm">
          {isEmergencyLoading ? (
            <p className="p-6 text-sm text-slate-500">
              Loading emergency visits...
            </p>
          ) : emergencyVisits.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">
              No emergency visits recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
                <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    {TABLE_COLUMNS.map((column) => (
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
                  {emergencyVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {visit.emer_no}
                      </td>
                      <td className="px-4 py-3">
                        {visit.patient_name || visit.patient?.name || "Patient"}
                      </td>
                      <td className="px-4 py-3">{visit.age || "-"}</td>
                      <td className="px-4 py-3">{visit.gender || "-"}</td>
                      <td className="px-4 py-3">{visit.triage_level || "-"}</td>
                      <td className="px-4 py-3">{visit.status || "-"}</td>
                      <td className="px-4 py-3">
                        {visit.attending_doctor_display ||
                          visit.attending_doctor_name ||
                          "-"}
                      </td>
                      <td className="px-4 py-3">{visit.mobile_no || "-"}</td>
                      <td className="px-4 py-3">
                        {visit.brought_by_name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {visit.referred_from || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDateTime(visit.visit_datetime)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDateTime(visit.outcome_datetime)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditVisit(visit)}
                            className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                            aria-label="Edit emergency visit"
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => handleViewVisit(visit)}
                            className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                            aria-label="View emergency ticket"
                            title="View Ticket"
                          >
                            👁
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
            <div
              ref={dialogRef}
              className="flex w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl max-h-[90vh]"
              style={{
                transform: `translate(${dialogPosition.x}px, ${dialogPosition.y}px)`,
              }}
            >
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 pb-4 pt-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Emergency Booking Form
                  </h2>
                  <p className="text-sm text-slate-500">
                    Capture the patient intake, triage, and location details.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onMouseDown={handleDialogDragStart}
                    className="cursor-grab rounded-full border border-slate-200 p-2 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    aria-label="Drag emergency form"
                  >
                    ⠿
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Close emergency form"
                  >
                    <span className="text-lg">&times;</span>
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex min-h-0 flex-1 flex-col text-sm"
              >
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                  <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-[1px]">
                    <div className="grid gap-4 rounded-2xl bg-white p-4 md:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-slate-600">Patient</label>
                          <button
                            type="button"
                            onClick={openPatientModal}
                            disabled={isAddPatientButtonDisabled}
                            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            + Add New Patient
                          </button>
                        </div>
                        <select
                          name="patient"
                          value={formData.patient}
                          onChange={handleInputChange}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                          required
                          disabled={isPatientsLoading || !patients.length}
                        >
                          <option value="">
                            {isPatientsLoading
                              ? "Loading patients..."
                              : "Select patient"}
                          </option>
                          {patients.map((patient) => (
                            <option key={patient.id} value={patient.id}>
                              {patient.name ||
                                patient.patient_name ||
                                `Patient #${patient.id}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1 text-slate-600">
                        <span>Admission Date</span>
                        <div className="relative mt-2">
                          <button
                            type="button"
                            onClick={() =>
                              setIsVisitCalendarVisible((prev) => !prev)
                            }
                            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-slate-900 focus:border-slate-400 focus:outline-none"
                          >
                            <span>
                              {formatDateDisplay(formData.visit_datetime) ||
                                "Select visit date"}
                            </span>
                            <span className="text-slate-500">📅</span>
                          </button>
                          {isVisitCalendarVisible && (
                            <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl sm:max-w-md">
                              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                                <button
                                  type="button"
                                  className="text-sm text-slate-500 hover:text-blue-600"
                                  onClick={() => handleCalendarNavigate(-1)}
                                >
                                  ← Prev
                                </button>
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                  <select
                                    aria-label="Select month"
                                    value={calendarMonth.getMonth()}
                                    onChange={handleCalendarMonthChange}
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
                                    value={calendarMonth.getFullYear()}
                                    onChange={handleCalendarYearChange}
                                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700"
                                  >
                                    {yearOptions.map((year) => (
                                      <option key={year} value={year}>
                                        {year}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <button
                                  type="button"
                                  className="text-sm text-slate-500 hover:text-blue-600"
                                  onClick={() => handleCalendarNavigate(1)}
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
                                {calendarDays.map((day) => {
                                  const isSelected =
                                    formData.visit_datetime?.startsWith(
                                      day.iso,
                                    );
                                  const baseClasses = [
                                    "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition",
                                    day.inCurrentMonth
                                      ? "text-slate-700"
                                      : "text-slate-400",
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
                                        handleCalendarSelect(day.iso)
                                      }
                                    >
                                      {day.label}
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="px-4 pb-3 text-xs text-slate-500">
                                Select a date to schedule the visit.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 md:col-span-2 md:grid-cols-3">
                        <label className="flex flex-col gap-1 text-slate-600">
                          Age
                          <input
                            type="number"
                            name="age"
                            value={formData.age}
                            onChange={handleInputChange}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                            min="0"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-slate-600">
                          Gender
                          <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleInputChange}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                          >
                            <option value="">Select gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </label>

                        <label className="flex flex-col gap-1 text-slate-600">
                          Mobile No
                          <input
                            type="text"
                            name="mobile_no"
                            value={formData.mobile_no}
                            onChange={handleInputChange}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                          />
                        </label>
                      </div>

                      <label className="flex flex-col gap-1 text-slate-600 md:col-span-2">
                        Address
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-slate-600">
                      Brought By (Name)
                      <input
                        type="text"
                        name="brought_by_name"
                        value={formData.brought_by_name}
                        onChange={handleInputChange}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-slate-600">
                      Brought By (Mobile)
                      <input
                        type="text"
                        name="brought_by_mobile"
                        value={formData.brought_by_mobile}
                        onChange={handleInputChange}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-slate-600">
                      Referred From
                      <input
                        type="text"
                        name="referred_from"
                        value={formData.referred_from}
                        onChange={handleInputChange}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-slate-600">
                      Referral Note
                      <input
                        type="text"
                        name="referral_note"
                        value={formData.referral_note}
                        onChange={handleInputChange}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-slate-600">
                      Triage Level
                      <select
                        name="triage_level"
                        value={formData.triage_level}
                        onChange={handleInputChange}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                        required
                      >
                        <option value="">Select triage level</option>
                        {TRIAGE_OPTIONS.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                            style={TRIAGE_OPTION_STYLES[option.value]}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 text-slate-600">
                      Status
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                        required
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-slate-600">
                      Attending Doctor
                      <select
                        name="attending_doctor_name"
                        value={formData.attending_doctor_name}
                        onChange={handleInputChange}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                        disabled={isDoctorsLoading || !doctors.length}
                      >
                        <option value="">
                          {isDoctorsLoading
                            ? "Loading doctors..."
                            : "Select doctor"}
                        </option>
                        {doctors.map((doctor) => (
                          <option key={doctor.id} value={doctor.id}>
                            {doctor.full_name ||
                              doctor.name ||
                              doctor.doctor_name ||
                              `Doctor #${doctor.id}`}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 text-slate-600">
                      Outcome Date
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setIsOutcomeCalendarVisible((prev) => !prev)
                          }
                          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-slate-900 focus:border-slate-400 focus:outline-none"
                        >
                          <span>
                            {formatDateDisplay(formData.outcome_datetime) ||
                              "Select outcome date"}
                          </span>
                          <span className="text-slate-500">📅</span>
                        </button>
                        {isOutcomeCalendarVisible && (
                          <div className="absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl sm:max-w-md">
                            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                              <button
                                type="button"
                                className="text-sm text-slate-500 hover:text-blue-600"
                                onClick={() =>
                                  handleOutcomeCalendarNavigate(-1)
                                }
                              >
                                ← Prev
                              </button>
                              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <select
                                  aria-label="Select month"
                                  value={outcomeCalendarMonth.getMonth()}
                                  onChange={handleOutcomeCalendarMonthChange}
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
                                  value={outcomeCalendarMonth.getFullYear()}
                                  onChange={handleOutcomeCalendarYearChange}
                                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700"
                                >
                                  {outcomeYearOptions.map((year) => (
                                    <option key={year} value={year}>
                                      {year}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                className="text-sm text-slate-500 hover:text-blue-600"
                                onClick={() => handleOutcomeCalendarNavigate(1)}
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
                              {outcomeCalendarDays.map((day) => {
                                const isSelected =
                                  formData.outcome_datetime?.startsWith(
                                    day.iso,
                                  );
                                const baseClasses = [
                                  "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition",
                                  day.inCurrentMonth
                                    ? "text-slate-700"
                                    : "text-slate-400",
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
                                      handleOutcomeCalendarSelect(day.iso)
                                    }
                                  >
                                    {day.label}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="px-4 pb-3 text-xs text-slate-500">
                              Select an outcome date.
                            </p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  <label className="flex flex-col gap-1 text-slate-600">
                    Discharge Summary
                    <textarea
                      name="discharge_summary"
                      value={formData.discharge_summary}
                      onChange={handleInputChange}
                      className="min-h-[90px] rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                    />
                  </label>
                </div>

                <div className="border-t border-slate-100 bg-white px-6 py-4">
                  {submitError && (
                    <p className="mb-3 text-sm font-medium text-red-600">
                      {submitError}
                    </p>
                  )}
                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
                    >
                      {editingVisitId
                        ? "Update Emergency Visit"
                        : "Save Emergency Visit"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {isPatientModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6 sm:py-10 overflow-y-auto">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
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
                  <h2 className="text-xl font-semibold text-slate-800">
                    Add New Patient
                  </h2>
                  <p className="text-sm text-slate-500">
                    Capture patient information for emergency intake.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onMouseDown={handlePatientDialogDragStart}
                    className="cursor-grab rounded-full border border-slate-200 p-2 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    aria-label="Drag dialog"
                  >
                    ⠿
                  </button>
                  <button
                    type="button"
                    onClick={closePatientModal}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-700 hover:border-slate-300 disabled:opacity-50"
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
                    <label className="font-medium text-slate-700">
                      Patient Name :<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={patientForm.name}
                      onChange={handlePatientFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring focus:ring-amber-200/40"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700">
                      Gender :<span className="text-red-500">*</span>
                    </label>
                    <select
                      name="gender"
                      value={patientForm.gender}
                      onChange={handlePatientFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring focus:ring-amber-200/40"
                      required
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-medium text-slate-700">
                      Mobile :
                    </label>
                    <input
                      type="tel"
                      name="mobile"
                      value={patientForm.mobile}
                      onChange={handlePatientFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring focus:ring-amber-200/40"
                      placeholder="10 digit mobile no"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700">
                      Age :<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="dateOfBirth"
                      value={patientForm.dateOfBirth}
                      onChange={handlePatientFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring focus:ring-amber-200/40 no-number-spin"
                      placeholder="Enter Your Age"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700">
                      Country :
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={patientForm.country || "India"}
                      onChange={handlePatientFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring focus:ring-amber-200/40"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700">
                      State :
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={patientForm.state}
                      onChange={handlePatientFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring focus:ring-amber-200/40"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700">
                      District :
                    </label>
                    <input
                      type="text"
                      name="district"
                      value={patientForm.district}
                      onChange={handlePatientFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring focus:ring-amber-200/40"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700">
                      Police Station :
                    </label>
                    <input
                      type="text"
                      name="ps"
                      value={patientForm.ps}
                      onChange={handlePatientFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring focus:ring-amber-200/40"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700">PIN :</label>
                    <input
                      type="text"
                      name="pin"
                      value={patientForm.pin}
                      onChange={handlePatientFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring focus:ring-amber-200/40"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="font-medium text-slate-700">
                      Address :
                    </label>
                    <textarea
                      name="address"
                      value={patientForm.address}
                      onChange={handlePatientFieldChange}
                      className="mt-1 w-full min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring focus:ring-amber-200/40"
                    />
                  </div>
                  <div ref={insuranceInputWrapperRef}>
                    <label className="font-medium text-slate-700">
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
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring focus:ring-amber-200/40"
                        placeholder={
                          isInsuranceOptionsLoading
                            ? "Loading insurance companies..."
                            : "Type or choose"
                        }
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        ▾
                      </span>
                      {isInsuranceDropdownOpen &&
                        insuranceDropdownRect &&
                        typeof document !== "undefined" &&
                        createPortal(
                          <div
                            className="rounded-xl border border-slate-200 bg-white shadow-2xl"
                            style={{
                              position: "fixed",
                              left: insuranceDropdownRect.left,
                              top: insuranceDropdownRect.top,
                              width: insuranceDropdownRect.width,
                              zIndex: 70,
                            }}
                          >
                            {filteredInsuranceOptions.length ? (
                              <ul className="max-h-48 overflow-auto py-1 text-sm text-slate-700">
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
                                            ? "bg-amber-50 text-amber-700"
                                            : "hover:bg-slate-50"
                                        }`}
                                      >
                                        {option}
                                      </div>
                                    </li>
                                  ),
                                )}
                              </ul>
                            ) : (
                              <div className="px-3 py-2 text-sm text-slate-500">
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
                    <label className="font-medium text-slate-700">
                      Policy No :
                    </label>
                    <input
                      type="text"
                      name="policy_no"
                      value={patientForm.policy_no}
                      onChange={handlePatientFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring focus:ring-amber-200/40"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700">
                      Policy Amount :
                    </label>
                    <input
                      type="number"
                      name="policy_amount"
                      value={patientForm.policy_amount}
                      onChange={handlePatientFieldChange}
                      min="0"
                      step="0.01"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring focus:ring-amber-200/40"
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
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800 disabled:opacity-50"
                    disabled={isPatientSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                    disabled={isPatientSubmitting}
                  >
                    {isPatientSubmitting ? "Saving..." : "Save Patient"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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
    </section>
  );
}
