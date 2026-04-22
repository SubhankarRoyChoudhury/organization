"use client";

import { createPortal } from "react-dom";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  get_Hospital_User_Login_Details,
  getPatients,
  getWards,
  getRooms,
  getBeds,
  getApprovedDepartments,
  getDoctorsByOpd,
  getAllDoctors,
  getRateCharts,
  getInsuaranceProviders,
  createIpdBooking,
  createIpdBilling,
  getDoctorFees,
  getIpdBooking,
  updateIpdBooking,
  createPatientRecord,
} from "@/app/api/apiService";

const normalizeDoctorOptions = (list) => {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const normalized = [];
  list.forEach((item) => {
    const key =
      item?.doctor ?? item?.doctor_id ?? item?.doctorId ?? item?.id ?? null;
    const keyString =
      key === undefined || key === null ? null : String(key).trim();
    if (!keyString) {
      normalized.push(item);
      return;
    }
    if (seen.has(keyString)) return;
    seen.add(keyString);
    normalized.push(item);
  });
  return normalized;
};

function IPDRegistrationFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const patientIdParam = searchParams?.get("patientId");
  const patientNameParam = searchParams?.get("patientName") || "";
  const bookingIdParam = searchParams?.get("bookingId");
  const todayDate = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    patient: "",
    address: "",
    mobile: "",
    related_person: "",
    treatment_doctor: "",
    recommended_doctor: "",
    department: "",
    rate_chart: "",
    room: "",
    bed: "",
    ward: "",
    admission_reason: "",
    admission_date: todayDate,
    insurance_provider: "",
    policy_amount: "",
    insurance_number: "",
    status: "ADMITTED",
    discharge_date: "",
    discharge_summary: "",
  });

  const [companyId, setCompanyId] = useState(null);
  const [patients, setPatients] = useState([]);
  const [wards, setWards] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rateCharts, setRateCharts] = useState([]);
  const [ipdInsuranceProviders, setIpdInsuranceProviders] = useState([]);
  const [selectedInsuranceProviderLabel, setSelectedInsuranceProviderLabel] =
    useState("");
  const [treatmentDoctorOptions, setTreatmentDoctorOptions] = useState([]);
  const [recommendedDoctorOptions, setRecommendedDoctorOptions] = useState([]);
  const [treatmentDoctorQuery, setTreatmentDoctorQuery] = useState("");
  const [isTreatmentDoctorOpen, setIsTreatmentDoctorOpen] = useState(false);
  const [recommendedDoctorQuery, setRecommendedDoctorQuery] = useState("");
  const [isRecommendedDoctorOpen, setIsRecommendedDoctorOpen] = useState(false);
  const [patientLoadError, setPatientLoadError] = useState(null);
  const [wardLoadError, setWardLoadError] = useState(null);
  const [roomLoadError, setRoomLoadError] = useState(null);
  const [bedLoadError, setBedLoadError] = useState(null);
  const [departmentLoadError, setDepartmentLoadError] = useState(null);
  const [rateChartLoadError, setRateChartLoadError] = useState(null);
  const [ipdInsuranceProviderLoadError, setIpdInsuranceProviderLoadError] =
    useState(null);
  const [treatmentDoctorLoadError, setTreatmentDoctorLoadError] =
    useState(null);
  const [recommendedDoctorLoadError, setRecommendedDoctorLoadError] =
    useState(null);
  const [isPatientsLoading, setIsPatientsLoading] = useState(false);
  const [isWardsLoading, setIsWardsLoading] = useState(false);
  const [isRoomsLoading, setIsRoomsLoading] = useState(false);
  const [isBedsLoading, setIsBedsLoading] = useState(false);
  const [isDepartmentsLoading, setIsDepartmentsLoading] = useState(false);
  const [isRateChartsLoading, setIsRateChartsLoading] = useState(false);
  const [isIpdInsuranceProvidersLoading, setIsIpdInsuranceProvidersLoading] =
    useState(false);
  const [isTreatmentDoctorsLoading, setIsTreatmentDoctorsLoading] =
    useState(false);
  const [isRecommendedDoctorsLoading, setIsRecommendedDoctorsLoading] =
    useState(false);
  const [formError, setFormError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEstimatedBill, setShowEstimatedBill] = useState(false);
  const [lastBookingSummary, setLastBookingSummary] = useState(null);
  const [billingError, setBillingError] = useState(null);
  const [billingSuccess, setBillingSuccess] = useState(null);
  const [isBillingSaving, setIsBillingSaving] = useState(false);
  const recommendedDoctorInputRef = useRef(null);
  const treatmentDoctorInputRef = useRef(null);
  const [doctorFeesByDoctorId, setDoctorFeesByDoctorId] = useState({});
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientDialogPosition, setPatientDialogPosition] = useState({
    x: 0,
    y: 0,
  });
  const [isDraggingPatientDialog, setIsDraggingPatientDialog] = useState(false);
  const patientDialogRef = useRef(null);
  const patientDragStateRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
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
  const [isInsuranceDropdownOpen, setIsInsuranceDropdownOpen] = useState(false);
  const [insuranceHighlightIndex, setInsuranceHighlightIndex] = useState(-1);
  const [insuranceDropdownRect, setInsuranceDropdownRect] = useState(null);
  const insuranceInputWrapperRef = useRef(null);
  const INSURANCE_FETCH_LIMIT = 200;
  const patientDialogBaseRectRef = useRef(null);
  const [billForm, setBillForm] = useState({
    room_rate: "",
    rate_amount: "",
    total_days: "",
    doctor_rate: "",
    doctor_visits: "",
    operation_theater_charges: "",
    other_charges: "",
  });
  const billRoomRateValue = Number(billForm.room_rate) || 0;
  const billTotalDaysValue = Number(billForm.total_days) || 0;
  const billEstimatedRoomCharges =
    billRoomRateValue && billTotalDaysValue
      ? billRoomRateValue * billTotalDaysValue
      : 0;
  const billSurgeryRateValue = Number(billForm.rate_amount) || 0;
  const billDoctorRateValue = Number(billForm.doctor_rate) || 0;
  const billDoctorVisitsValue = Number(billForm.doctor_visits) || 0;
  const billDoctorChargesValue =
    billDoctorRateValue && billDoctorVisitsValue
      ? billDoctorRateValue * billDoctorVisitsValue
      : 0;
  const billOperationChargesValue =
    Number(billForm.operation_theater_charges) || 0;
  const billOtherChargesValue = Number(billForm.other_charges) || 0;
  const billTotalCharges =
    billSurgeryRateValue +
    billEstimatedRoomCharges +
    billDoctorChargesValue +
    billOperationChargesValue +
    billOtherChargesValue;

  useEffect(() => {
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (username) {
      fetchUserDetails(username);
    }
  }, []);

  useEffect(() => {
    if (!patientIdParam || bookingIdParam) return;
    setForm((prev) => {
      if (String(prev.patient) === String(patientIdParam)) {
        return prev;
      }
      const matchedPatient = patients.find(
        (patient) => String(patient.id) === String(patientIdParam),
      );
      return {
        ...prev,
        patient: patientIdParam,
        address: matchedPatient?.address || "",
      };
    });
  }, [patientIdParam, bookingIdParam, patients]);

  useEffect(() => {
    if (!companyId || !bookingIdParam) return;
    let isActive = true;
    setEditingBookingId(bookingIdParam);
    getIpdBooking(bookingIdParam, companyId)
      .then((booking) => {
        if (!isActive || !booking) return;
        setForm({
          patient: booking.patient ? String(booking.patient) : "",
          address: booking.address || "",
          mobile: booking.mobile || "",
          related_person: booking.related_person || "",
          treatment_doctor: booking.treatment_doctor
            ? String(booking.treatment_doctor)
            : "",
          recommended_doctor: booking.recommended_doctor || "",
          department: booking.department ? String(booking.department) : "",
          rate_chart: booking.rate_chart ? String(booking.rate_chart) : "",
          room: booking.room ? String(booking.room) : "",
          bed: booking.bed ? String(booking.bed) : "",
          ward: booking.ward ? String(booking.ward) : "",
          admission_reason: booking.admission_reason || "",
          admission_date: booking.admission_date || todayDate,
          insurance_provider: booking.insurance_provider
            ? String(booking.insurance_provider)
            : "",
          policy_amount:
            booking.policy_amount !== null && booking.policy_amount !== undefined
              ? String(booking.policy_amount)
              : "",
          insurance_number: booking.insurance_number || "",
          status: booking.status || "ADMITTED",
          discharge_date: booking.discharge_date || "",
          discharge_summary: booking.discharge_summary || "",
        });
        setSelectedInsuranceProviderLabel(
          String(booking.insurance_provider_name || "").trim(),
        );
        setRecommendedDoctorQuery(booking.recommended_doctor || "");
        setTreatmentDoctorQuery("");
        setShowEstimatedBill(false);
        setLastBookingSummary(null);
      })
      .catch((error) => {
        console.error("Unable to load IPD booking:", error);
        setFormError("Unable to load IPD booking.");
      });
    return () => {
      isActive = false;
    };
  }, [bookingIdParam, companyId, todayDate]);

  useEffect(() => {
    if (!form.treatment_doctor) return;
    if (treatmentDoctorQuery.trim()) return;
    const match = treatmentDoctorOptions.find(
      (doctor) => String(doctor.doctor) === String(form.treatment_doctor),
    );
    if (match) {
      setTreatmentDoctorQuery(getTreatmentDoctorLabel(match));
    }
  }, [form.treatment_doctor, treatmentDoctorOptions, treatmentDoctorQuery]);

  useEffect(() => {
    if (!companyId) return;
    fetchPatients(companyId);
    fetchWards(companyId);
    fetchDepartments(companyId);
    fetchRateCharts(companyId);
    fetchIpdInsuranceProviders(companyId);
    fetchDoctorFees(companyId);
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
          totalCount > 0 ? Math.ceil(totalCount / INSURANCE_FETCH_LIMIT) : 1;
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
        console.error("Failed to load insurance companies:", insuranceError);
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

  useEffect(() => {
    if (!companyId || !form.department) {
      setTreatmentDoctorOptions([]);
      setTreatmentDoctorLoadError(null);
      setIsTreatmentDoctorsLoading(false);
      return;
    }
    let isActive = true;
    setIsTreatmentDoctorsLoading(true);
    setTreatmentDoctorLoadError(null);
    getDoctorsByOpd(form.department, companyId)
      .then((data) => {
        if (!isActive) return;
        setTreatmentDoctorOptions(normalizeDoctorOptions(data));
      })
      .catch((error) => {
        if (!isActive) return;
        console.error("Unable to load doctors:", error);
        setTreatmentDoctorOptions([]);
        setTreatmentDoctorLoadError(
          "Unable to load doctors for the selected department.",
        );
      })
      .finally(() => {
        if (isActive) setIsTreatmentDoctorsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [companyId, form.department]);

  useEffect(() => {
    if (!companyId) {
      setRecommendedDoctorOptions([]);
      setRecommendedDoctorLoadError(null);
      setIsRecommendedDoctorsLoading(false);
      return;
    }
    let isActive = true;
    setIsRecommendedDoctorsLoading(true);
    setRecommendedDoctorLoadError(null);
    getAllDoctors(companyId)
      .then((data) => {
        if (!isActive) return;
        setRecommendedDoctorOptions(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!isActive) return;
        console.error("Unable to load recommended doctors:", error);
        setRecommendedDoctorOptions([]);
        setRecommendedDoctorLoadError("Unable to load doctor list.");
      })
      .finally(() => {
        if (isActive) {
          setIsRecommendedDoctorsLoading(false);
        }
      });
    return () => {
      isActive = false;
    };
  }, [companyId]);

  useEffect(() => {
    if (!companyId || !form.ward) {
      setRooms([]);
      setRoomLoadError(null);
      setIsRoomsLoading(false);
      return;
    }
    let isActive = true;
    setIsRoomsLoading(true);
    setRoomLoadError(null);
    getRooms(companyId, { wardId: form.ward })
      .then((data) => {
        if (!isActive) return;
        setRooms(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!isActive) return;
        console.error("Unable to load rooms:", error);
        setRooms([]);
        setRoomLoadError("Unable to load rooms for the selected ward.");
      })
      .finally(() => {
        if (isActive) {
          setIsRoomsLoading(false);
        }
      });
    return () => {
      isActive = false;
    };
  }, [companyId, form.ward]);

  useEffect(() => {
    if (!companyId || !form.room) {
      setBeds([]);
      setBedLoadError(null);
      setIsBedsLoading(false);
      return;
    }
    let isActive = true;
    setIsBedsLoading(true);
    setBedLoadError(null);
    getBeds(companyId, { roomId: form.room })
      .then((data) => {
        if (!isActive) return;
        setBeds(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!isActive) return;
        console.error("Unable to load beds:", error);
        setBeds([]);
        setBedLoadError("Unable to load beds for the selected room.");
      })
      .finally(() => {
        if (isActive) setIsBedsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [companyId, form.room]);

  async function fetchUserDetails(username) {
    try {
      const data = await get_Hospital_User_Login_Details(username);
      const resolvedCompanyId =
        data?.company_id || data?.companies?.[0]?.company_id;
      if (resolvedCompanyId) {
        setCompanyId(resolvedCompanyId);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  }

  async function fetchPatients(company_id) {
    if (!company_id) return;
    setIsPatientsLoading(true);
    setPatientLoadError(null);
    try {
      const data = await getPatients(company_id);
      setPatients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Unable to load patients:", error);
      setPatients([]);
      setPatientLoadError("Unable to load patients.");
    } finally {
      setIsPatientsLoading(false);
    }
  }

  async function fetchWards(company_id) {
    if (!company_id) return;
    setIsWardsLoading(true);
    setWardLoadError(null);
    try {
      const data = await getWards(company_id);
      setWards(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Unable to load wards:", error);
      setWards([]);
      setWardLoadError("Unable to load wards.");
    } finally {
      setIsWardsLoading(false);
    }
  }

  async function fetchDepartments(company_id) {
    if (!company_id) return;
    setIsDepartmentsLoading(true);
    setDepartmentLoadError(null);
    try {
      const data = await getApprovedDepartments(company_id);
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Unable to load departments:", error);
      setDepartments([]);
      setDepartmentLoadError("Unable to load departments.");
    } finally {
      setIsDepartmentsLoading(false);
    }
  }

  async function fetchRateCharts(company_id) {
    if (!company_id) return;
    setIsRateChartsLoading(true);
    setRateChartLoadError(null);
    try {
      const data = await getRateCharts(company_id);
      setRateCharts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Unable to load rate charts:", error);
      setRateCharts([]);
      setRateChartLoadError("Unable to load rate charts.");
    } finally {
      setIsRateChartsLoading(false);
    }
  }

  async function fetchIpdInsuranceProviders(company_id) {
    if (!company_id) return;
    setIsIpdInsuranceProvidersLoading(true);
    setIpdInsuranceProviderLoadError(null);
    try {
      const data = await getInsuaranceProviders(company_id);
      setIpdInsuranceProviders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Unable to load insurance providers:", error);
      setIpdInsuranceProviders([]);
      setIpdInsuranceProviderLoadError("Unable to load insurance providers.");
    } finally {
      setIsIpdInsuranceProvidersLoading(false);
    }
  }

  async function fetchDoctorFees(company_id) {
    if (!company_id) return;
    try {
      const data = await getDoctorFees(company_id);
      const feesMap = {};
      (Array.isArray(data) ? data : []).forEach((entry) => {
        if (!entry?.doctor) return;
        feesMap[String(entry.doctor)] = entry.fees ?? "";
      });
      setDoctorFeesByDoctorId(feesMap);
    } catch (error) {
      console.error("Unable to load doctor fees:", error);
      setDoctorFeesByDoctorId({});
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "ward") {
      setRooms([]);
      setBeds([]);
      setForm((prev) => ({
        ...prev,
        ward: value,
        room: "",
        bed: "",
      }));
      return;
    }

    if (name === "room") {
      setBeds([]);
      setForm((prev) => ({
        ...prev,
        room: value,
        bed: "",
      }));
      return;
    }

    if (name === "department") {
      setTreatmentDoctorOptions([]);
      setTreatmentDoctorQuery("");
      setForm((prev) => ({
        ...prev,
        department: value,
        treatment_doctor: "",
        rate_chart: "",
      }));
      setBillForm((prev) => ({
        ...prev,
        rate_amount: "",
        doctor_rate: "",
      }));
      return;
    }

    if (name === "rate_chart") {
      const selectedRateChart =
        rateCharts.find((chart) => String(chart.id) === String(value)) || null;
      setForm((prev) => ({
        ...prev,
        rate_chart: value,
      }));
      setBillForm((prev) => ({
        ...prev,
        rate_amount:
          selectedRateChart?.fixed_amount !== null &&
          selectedRateChart?.fixed_amount !== undefined
            ? String(selectedRateChart.fixed_amount)
            : "",
      }));
      return;
    }

    if (name === "patient") {
      const selectedPatient = patients.find(
        (patient) => String(patient.id) === String(value),
      );
      setForm((prev) => ({
        ...prev,
        patient: value,
        address: selectedPatient?.address || "",
      }));
      return;
    }

    if (name === "insurance_provider") {
      const matchedProvider = ipdInsuranceProviders.find(
        (provider) => String(provider.id) === String(value),
      );
      setSelectedInsuranceProviderLabel(
        String(matchedProvider?.provider_name || "").trim(),
      );
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBillChange = (e) => {
    const { name, value } = e.target;
    setBillForm((prev) => ({
      ...prev,
      [name]: value,
    }));
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
    setPatientDialogPosition({ x: 0, y: 0 });
  };

  const clampPatientDialogPosition = useCallback((position) => {
    const dialog = patientDialogRef.current;
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
      if (patientDialogRef.current) {
        patientDialogBaseRectRef.current =
          patientDialogRef.current.getBoundingClientRect();
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
      if (patientDialogRef.current) {
        patientDialogBaseRectRef.current =
          patientDialogRef.current.getBoundingClientRect();
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
    const modalNode = patientDialogRef.current;
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
      await fetchPatients(companyId);
      setForm((prev) => ({
        ...prev,
        patient: normalizedPatient.id || prev.patient,
        address: normalizedPatient.address || prev.address,
        mobile: normalizedPatient.mobile || prev.mobile,
      }));
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

  const getTreatmentDoctorLabel = (doctor) =>
    doctor.doctor_name ||
    doctor.full_name ||
    doctor.name ||
    `Doctor #${doctor.doctor}`;

  const getDoctorLabel = (doctor) =>
    doctor.full_name ||
    doctor.name ||
    doctor.doctor_name ||
    `Doctor #${doctor.id}`;

  const getWardLabel = (ward) => {
    if (!ward) return "";
    const genderLabel =
      ward.gender_type_display ||
      (ward.gender_type
        ? `${ward.gender_type}`
            .replace(/_/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase())
        : "");
    return genderLabel ? `${ward.name} (${genderLabel})` : ward.name;
  };

  const normalizeBedValue = (value) =>
    value === null || value === undefined ? "" : String(value).trim();

  const getBedSuffix = (roomNo, bedNo) => {
    if (!bedNo) return "";
    if (!roomNo) return bedNo;
    const prefix = `${roomNo}-`;
    if (bedNo.startsWith(prefix)) return bedNo.slice(prefix.length);
    if (bedNo.startsWith(roomNo)) {
      const remainder = bedNo.slice(roomNo.length).replace(/^[-_\s]+/, "");
      return remainder || bedNo;
    }
    return bedNo;
  };

  const compareNumericString = (left, right) => {
    const leftTrim = normalizeBedValue(left);
    const rightTrim = normalizeBedValue(right);
    if (!leftTrim && !rightTrim) return 0;
    if (!leftTrim) return 1;
    if (!rightTrim) return -1;
    const leftIsNumber = /^\d+$/.test(leftTrim);
    const rightIsNumber = /^\d+$/.test(rightTrim);
    if (leftIsNumber && rightIsNumber) {
      return Number(leftTrim) - Number(rightTrim);
    }
    return leftTrim.localeCompare(rightTrim, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  };

  const getBedLabel = (bed) => {
    if (!bed) return "";
    const roomNo = normalizeBedValue(bed.room_no);
    const bedNo = normalizeBedValue(bed.bed_no);
    if (!roomNo) return bedNo;
    const suffix = getBedSuffix(roomNo, bedNo);
    return suffix ? `${roomNo}-${suffix}` : roomNo;
  };

  const sortedBeds = [...beds].sort((a, b) => {
    const aRoom = normalizeBedValue(a?.room_no);
    const bRoom = normalizeBedValue(b?.room_no);
    const roomCompare = compareNumericString(aRoom, bRoom);
    if (roomCompare !== 0) return roomCompare;
    const aSuffix = getBedSuffix(aRoom, normalizeBedValue(a?.bed_no));
    const bSuffix = getBedSuffix(bRoom, normalizeBedValue(b?.bed_no));
    return compareNumericString(aSuffix, bSuffix);
  });
  const selectedBedOption =
    sortedBeds.find((bed) => String(bed.id) === String(form.bed)) || null;
  const selectedBedLabel = selectedBedOption ? getBedLabel(selectedBedOption) : "";

  const handleTreatmentDoctorChange = (e) => {
    const value = e.target.value;
    setTreatmentDoctorQuery(value);
    const normalized = value.trim().toLowerCase();
    const matchedDoctor = treatmentDoctorOptions.find(
      (doctor) => getTreatmentDoctorLabel(doctor).toLowerCase() === normalized,
    );
    setForm((prev) => ({
      ...prev,
      treatment_doctor: matchedDoctor ? String(matchedDoctor.doctor) : "",
    }));
    if (matchedDoctor) {
      const matchedFees =
        doctorFeesByDoctorId[String(matchedDoctor.doctor)] ?? "";
      setBillForm((prev) => ({
        ...prev,
        doctor_rate: matchedFees,
      }));
    }
  };

  const handleTreatmentDoctorSelect = (doctor) => {
    const label = getTreatmentDoctorLabel(doctor);
    setForm((prev) => ({
      ...prev,
      treatment_doctor: String(doctor.doctor),
    }));
    setTreatmentDoctorQuery(label);
    setIsTreatmentDoctorOpen(false);
    const matchedFees = doctorFeesByDoctorId[String(doctor.doctor)] ?? "";
    setBillForm((prev) => ({
      ...prev,
      doctor_rate: matchedFees,
    }));
  };

  const handleRecommendedDoctorChange = (e) => {
    const value = e.target.value;
    const withPrefix = value.toLowerCase().startsWith("dr.")
      ? value.replace(/^dr\.\s*/i, "Dr. ")
      : `Dr. ${value.replace(/^dr\.?\s*/i, "")}`;
    setRecommendedDoctorQuery(withPrefix);
    setForm((prev) => ({
      ...prev,
      recommended_doctor: withPrefix,
    }));
  };

  const handleRecommendedDoctorSelect = (doctor) => {
    const label = `Dr. ${getDoctorLabel(doctor).replace(/^dr\.?\s*/i, "")}`;
    setForm((prev) => ({
      ...prev,
      recommended_doctor: label,
    }));
    setRecommendedDoctorQuery(label);
    setIsRecommendedDoctorOpen(false);
  };

  useEffect(() => {
    if (!form.recommended_doctor) {
      setRecommendedDoctorQuery("");
      return;
    }
    setRecommendedDoctorQuery(form.recommended_doctor);
  }, [form.recommended_doctor, recommendedDoctorOptions]);

  useEffect(() => {
    if (!form.treatment_doctor) {
      setTreatmentDoctorQuery("");
      if (billForm.doctor_rate) {
        setBillForm((prev) => ({ ...prev, doctor_rate: "" }));
      }
      return;
    }
    const matchedDoctor = treatmentDoctorOptions.find(
      (doctor) => String(doctor.doctor) === String(form.treatment_doctor),
    );
    setTreatmentDoctorQuery(
      matchedDoctor ? getTreatmentDoctorLabel(matchedDoctor) : "",
    );
  }, [form.treatment_doctor, treatmentDoctorOptions]);

  useEffect(() => {
    if (!form.treatment_doctor) return;
    const nextFees = doctorFeesByDoctorId[String(form.treatment_doctor)];
    if (nextFees === undefined) return;
    setBillForm((prev) =>
      prev.doctor_rate === nextFees ? prev : { ...prev, doctor_rate: nextFees },
    );
  }, [form.treatment_doctor, doctorFeesByDoctorId]);

  const buildBillingLineItems = () => {
    const roomRate = Number(billForm.room_rate) || 0;
    const totalDays = Number(billForm.total_days) || 0;
    const surgeryRate = Number(billForm.rate_amount) || 0;
    const doctorRate = Number(billForm.doctor_rate) || 0;
    const doctorVisits = Number(billForm.doctor_visits) || 0;
    const operationCharges = Number(billForm.operation_theater_charges) || 0;
    const otherCharges = Number(billForm.other_charges) || 0;
    const reasonChart =
      rateCharts.find(
        (chart) => String(chart.id) === String(form.rate_chart),
      ) || null;
    const reasonLabel = reasonChart?.name
      ? `Reason For IPD Admission - ${reasonChart.name}`
      : "Reason For IPD Admission";

    return [
      {
        item: reasonLabel,
        rate: 0,
        qty: 1,
        amount: surgeryRate,
      },
      // {
      //   item: "Room Rate (per day)",
      //   rate: roomRate,
      //   qty: 1,
      //   amount: roomRate,
      // },
      {
        item: "Total Days",
        rate: 0,
        qty: totalDays,
        amount: 0,
      },
      {
        item: "Surgery Rate",
        rate: surgeryRate,
        qty: 1,
        amount: surgeryRate,
      },
      {
        item: "Room Charges",
        rate: roomRate,
        qty: totalDays,
        amount: roomRate * totalDays,
      },
      {
        item: "Doctor Charges",
        rate: doctorRate,
        qty: doctorVisits,
        amount: doctorRate * doctorVisits,
      },
      {
        item: "Operation Theater Charges",
        rate: 0,
        qty: 1,
        amount: operationCharges,
      },
      {
        item: "Other Charges",
        rate: 0,
        qty: 1,
        amount: otherCharges,
      },
    ];
  };

  const handleBillingSave = async () => {
    if (!companyId) {
      setBillingError("Missing company context. Please login again.");
      return;
    }
    if (!lastBookingSummary?.id) {
      setBillingError("Missing IPD booking reference. Save booking first.");
      return;
    }
    setBillingError(null);
    setBillingSuccess(null);
    setIsBillingSaving(true);
    try {
      const payload = {
        ipd_booking: lastBookingSummary.id,
        line_items: buildBillingLineItems(),
        total_amount: Number(billTotalCharges.toFixed(2)),
        remarks: "",
      };
      await createIpdBilling(payload, companyId);
      setForm({
        patient: "",
        address: "",
        mobile: "",
        related_person: "",
        treatment_doctor: "",
        recommended_doctor: "",
        department: "",
        rate_chart: "",
        room: "",
        bed: "",
        ward: "",
        admission_reason: "",
        admission_date: todayDate,
        insurance_provider: "",
        policy_amount: "",
        insurance_number: "",
        status: "ADMITTED",
        discharge_date: "",
        discharge_summary: "",
      });
      setSelectedInsuranceProviderLabel("");
      setBillForm({
        room_rate: "",
        rate_amount: "",
        total_days: "",
        doctor_rate: "",
        doctor_visits: "",
        operation_theater_charges: "",
        other_charges: "",
      });
      setTreatmentDoctorQuery("");
      setRecommendedDoctorQuery("");
      setShowEstimatedBill(false);
      setLastBookingSummary(null);
      setEditingBookingId(null);
      setSubmitSuccess(null);
      setFormError(null);
      setBillingError(null);
      setBillingSuccess("Billing saved successfully.");
      router.push("/administration_dashboard/billing");
    } catch (error) {
      const apiError =
        error.response?.data?.errors ||
        error.response?.data?.detail ||
        "Unable to save billing.";
      setBillingError(
        typeof apiError === "string" ? apiError : JSON.stringify(apiError),
      );
    } finally {
      setIsBillingSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId) {
      setFormError("Missing company context. Please login again.");
      return;
    }
    if (!form.patient) {
      setFormError("Patient selection is required.");
      return;
    }
    if (!form.department) {
      setFormError("Department selection is required.");
      return;
    }
    // if (!form.rate_chart) {
    //   setFormError("Reason for IPD admission is required.");
    //   return;
    // }
    if (!form.admission_reason?.trim()) {
      setFormError("Admission reason is required.");
      return;
    }
    if (!form.recommended_doctor) {
      setFormError("Recommended doctor selection is required.");
      return;
    }
    if (!form.treatment_doctor) {
      setFormError("Treatment doctor selection is required.");
      return;
    }
    if (!form.ward || !form.room || !form.bed) {
      setFormError("Ward, room, and bed selections are required.");
      return;
    }
    if (!form.admission_date) {
      setFormError("Admission date is required.");
      return;
    }
    setFormError(null);
    setSubmitSuccess(null);
    setIsSubmitting(true);
    const currentRoomId = form.room;
    const parsedPolicyAmount = Number(form.policy_amount);

    const payload = {
      patient: Number(form.patient),
      department: form.department ? Number(form.department) : null,
      rate_chart: form.rate_chart ? Number(form.rate_chart) : null,
      treatment_doctor: form.treatment_doctor
        ? Number(form.treatment_doctor)
        : null,
      recommended_doctor: form.recommended_doctor
        ? form.recommended_doctor.trim()
        : "",
      ward: form.ward ? Number(form.ward) : null,
      room: form.room ? Number(form.room) : null,
      bed: form.bed ? Number(form.bed) : null,
      address: form.address || "",
      mobile: form.mobile || "",
      related_person: form.related_person || "",
      admission_reason: form.admission_reason?.trim() || "",
      admission_date: form.admission_date || todayDate,
      insurance_provider: form.insurance_provider
        ? Number(form.insurance_provider)
        : null,
      policy_amount:
        form.policy_amount !== "" && !Number.isNaN(parsedPolicyAmount)
          ? parsedPolicyAmount
          : null,
      insurance_number: form.insurance_number || "",
      status: form.status || "ADMITTED",
      discharge_date:
        form.status === "DISCHARGED" && form.discharge_date
          ? form.discharge_date
          : null,
      discharge_summary:
        form.status === "DISCHARGED" ? form.discharge_summary || "" : "",
    };

    try {
      if (editingBookingId) {
        await updateIpdBooking(editingBookingId, payload, companyId);
        setSubmitSuccess("IPD booking updated successfully.");
        setFormError(null);
        setShowEstimatedBill(false);
        setLastBookingSummary(null);
      } else {
        const createdBooking = await createIpdBooking(payload, companyId);
        setFormError(null);
        setSubmitSuccess("IPD booking saved successfully.");
        setBillingError(null);
        setBillingSuccess(null);
        const matchedDepartment =
          departments.find(
            (department) => String(department.id) === String(form.department),
          ) || null;
        const matchedWard =
          wards.find((ward) => String(ward.id) === String(form.ward)) || null;
        const matchedRoom =
          rooms.find(
            (roomOption) => String(roomOption.id) === String(form.room),
          ) || null;
        const matchedBed =
          beds.find((bedOption) => String(bedOption.id) === String(form.bed)) ||
          null;
        const matchedRoomRate =
          matchedRoom && matchedRoom.price_per_day !== undefined
            ? String(matchedRoom.price_per_day)
            : "";
        const roomLabel = matchedRoom
          ? `${matchedRoom.room_no}${
              matchedRoom.room_type ? ` • ${matchedRoom.room_type}` : ""
            }`
          : "";
        const bedLabel = matchedBed ? getBedLabel(matchedBed) : "";
        setLastBookingSummary({
          id: createdBooking?.id ?? null,
          departmentName: matchedDepartment?.name || "",
          wardName: matchedWard ? getWardLabel(matchedWard) : "",
          roomName: roomLabel,
          bedName: bedLabel,
        });
        setBillForm((prev) => ({
          ...prev,
          room_rate: matchedRoomRate,
        }));
        setShowEstimatedBill(true);
        if (currentRoomId) {
          try {
            const refreshedBeds = await getBeds(companyId, {
              roomId: currentRoomId,
            });
            setBeds(Array.isArray(refreshedBeds) ? refreshedBeds : []);
          } catch (bedError) {
            console.error("Unable to refresh beds:", bedError);
          }
        }
      }
    } catch (error) {
      setSubmitSuccess(null);
      const apiError =
        error.response?.data?.errors ||
        error.response?.data?.detail ||
        "Unable to save IPD booking.";
      setFormError(
        typeof apiError === "string" ? apiError : JSON.stringify(apiError),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";
  const labelClass = "text-sm font-semibold text-slate-700";
  const disabledClass = "bg-slate-50 text-slate-500";
  const stepCardClass =
    "rounded-2xl border border-slate-100 bg-white p-6 shadow-sm";
  const filteredRateCharts = rateCharts.filter(
    (chart) =>
      !form.department || String(chart.department) === String(form.department),
  );
  const filteredTreatmentDoctors = treatmentDoctorOptions.filter((doctor) =>
    getTreatmentDoctorLabel(doctor)
      .toLowerCase()
      .includes(treatmentDoctorQuery.trim().toLowerCase()),
  );
  const filteredRecommendedDoctors = recommendedDoctorOptions.filter((doctor) =>
    getDoctorLabel(doctor)
      .toLowerCase()
      .includes(recommendedDoctorQuery.trim().toLowerCase()),
  );
  const selectedTreatmentDoctorRate = form.treatment_doctor
    ? doctorFeesByDoctorId[String(form.treatment_doctor)]
    : undefined;
  const hasSelectedTreatmentDoctorRate =
    selectedTreatmentDoctorRate !== undefined &&
    selectedTreatmentDoctorRate !== null &&
    String(selectedTreatmentDoctorRate).trim() !== "";
  const insuranceProviderDropdownOptions = useMemo(() => {
    const options = (Array.isArray(ipdInsuranceProviders)
      ? ipdInsuranceProviders
      : []
    )
      .map((item) => ({
        value: String(item?.id || "").trim(),
        label: String(item?.provider_name || "").trim(),
      }))
      .filter((item) => item.value && item.label);
    const uniqueOptions = Array.from(
      new Map(options.map((item) => [item.value, item])).values(),
    );
    if (
      form.insurance_provider &&
      !uniqueOptions.some(
        (item) => item.value === String(form.insurance_provider),
      )
    ) {
      uniqueOptions.unshift({
        value: String(form.insurance_provider),
        label:
          selectedInsuranceProviderLabel ||
          `Provider #${String(form.insurance_provider)}`,
      });
    }
    return uniqueOptions;
  }, [
    form.insurance_provider,
    ipdInsuranceProviders,
    selectedInsuranceProviderLabel,
  ]);

  const isEditingBooking = Boolean(bookingIdParam || editingBookingId);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="rounded-3xl bg-gradient-to-r from-[#b08968] via-[#9c7552] to-[#b08968] p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-lg font-bold text-white/90 transition hover:border-white/40 hover:text-white"
              aria-label="Back"
            >
              ←
            </button>
            <h1 className="text-2xl font-semibold">
              {isEditingBooking ? "Edit IPD Booking" : "IPD Registration"}
            </h1>
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-200">
          {isEditingBooking
            ? "Update the IPD booking details and save the changes."
            : "Create a new IPD booking with patient, admission, and charge details."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={stepCardClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Patient & Admission Details
            </h2>
            {!isEditingBooking && (
              <button
                type="button"
                onClick={openPatientModal}
                className="self-start rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:self-auto"
              >
                + Add New Patient
              </button>
            )}
          </div>
          {/* <p className="mt-1 text-sm text-slate-500">
            Select the patient and fill admission-related information.
          </p> */}

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <div>
              <label className={labelClass}>
                Patient <span className="text-rose-500">*</span>
              </label>
              <select
                name="patient"
                value={form.patient}
                onChange={handleChange}
                className={fieldClass}
                required
                disabled={isPatientsLoading}
              >
                <option value="">
                  {isPatientsLoading
                    ? "Loading patients..."
                    : patients.length === 0
                      ? "No patients found"
                      : "Select Patient"}
                </option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name || "Unnamed"}
                    {/* {patient.mobile ? ` (${patient.mobile})` : ""} */}
                  </option>
                ))}
              </select>
              {patientLoadError && (
                <p className="mt-1 text-xs text-red-500">{patientLoadError}</p>
              )}
            </div>

            {/* <div className="lg:col-span-3">
              <label className={labelClass}>
                Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={2}
                className={`${fieldClass} ${disabledClass}`}
              />
            </div> */}
            <div>
              <label className={labelClass}>Related Person Contact No.</label>
              <input
                type="text"
                name="mobile"
                value={form.mobile}
                onChange={handleChange}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Related Person</label>
              <input
                type="text"
                name="related_person"
                value={form.related_person}
                onChange={handleChange}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Insurance Number</label>
              <input
                type="text"
                name="insurance_number"
                value={form.insurance_number}
                onChange={handleChange}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Insurance Provider</label>
              <select
                name="insurance_provider"
                value={form.insurance_provider}
                onChange={handleChange}
                className={fieldClass}
                disabled={isIpdInsuranceProvidersLoading}
              >
                <option value="">
                  {isIpdInsuranceProvidersLoading
                    ? "Loading insurance providers..."
                    : insuranceProviderDropdownOptions.length === 0
                      ? "No insurance providers available"
                      : "Select Insurance Provider"}
                </option>
                {insuranceProviderDropdownOptions.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
              {ipdInsuranceProviderLoadError && (
                <p className="mt-1 text-xs text-red-500">
                  {ipdInsuranceProviderLoadError}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>Policy Amount</label>
              <input
                type="number"
                name="policy_amount"
                value={form.policy_amount}
                onChange={handleChange}
                className={fieldClass}
                min="0"
                step="0.01"
                placeholder="Enter policy amount"
              />
            </div>

            <div className="lg:col-span-3">
              <label className={labelClass}>
                Admission Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="admission_reason"
                value={form.admission_reason}
                onChange={handleChange}
                rows={3}
                className={fieldClass}
                placeholder="Enter admission reason"
                required
              />
            </div>

            <div>
              <label className={labelClass}>
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                className={fieldClass}
                required
                disabled={isDepartmentsLoading}
              >
                <option value="">
                  {isDepartmentsLoading
                    ? "Loading departments..."
                    : departments.length === 0
                      ? "No departments available"
                      : "Select Department"}
                </option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              {departmentLoadError && (
                <p className="mt-1 text-xs text-red-500">
                  {departmentLoadError}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                Recommended By Doctor <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="recommended_doctor"
                  ref={recommendedDoctorInputRef}
                  value={recommendedDoctorQuery}
                  onChange={handleRecommendedDoctorChange}
                  onFocus={() => {
                    setIsRecommendedDoctorOpen(true);
                    setRecommendedDoctorQuery((prev) => {
                      if (!prev.trim()) {
                        const prefixed = "Dr. ";
                        setForm((current) => ({
                          ...current,
                          recommended_doctor: prefixed,
                        }));
                        return prefixed;
                      }
                      return prev;
                    });
                  }}
                  onBlur={() => {
                    window.setTimeout(
                      () => setIsRecommendedDoctorOpen(false),
                      120,
                    );
                  }}
                  className={fieldClass}
                  disabled={isRecommendedDoctorsLoading}
                  required
                  autoCorrect="off"
                  autoComplete="off"
                  placeholder={
                    isRecommendedDoctorsLoading
                      ? "Loading doctors..."
                      : recommendedDoctorOptions.length === 0
                        ? "No doctors available"
                        : "Type or select a doctor"
                  }
                />
                {recommendedDoctorQuery && (
                  <button
                    type="button"
                    aria-label="Clear recommended doctor"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setRecommendedDoctorQuery("");
                      setForm((prev) => ({
                        ...prev,
                        recommended_doctor: "",
                      }));
                      setIsRecommendedDoctorOpen(true);
                      recommendedDoctorInputRef.current?.focus();
                    }}
                  >
                    ✕
                  </button>
                )}
                {isRecommendedDoctorOpen &&
                  !isRecommendedDoctorsLoading &&
                  recommendedDoctorOptions.length > 0 && (
                    <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
                      {filteredRecommendedDoctors.length === 0 ? (
                        <div className="px-4 py-2 text-slate-500">
                          No matching doctors
                        </div>
                      ) : (
                        filteredRecommendedDoctors.map((doctor) => {
                          const label = getDoctorLabel(doctor);
                          const isActive =
                            label.toLowerCase() ===
                            form.recommended_doctor.trim().toLowerCase();
                          return (
                            <button
                              type="button"
                              key={doctor.id}
                              className={`flex w-full items-start px-4 py-2 text-left transition ${
                                isActive
                                  ? "bg-slate-100 text-slate-900"
                                  : "hover:bg-slate-50 text-slate-700"
                              }`}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() =>
                                handleRecommendedDoctorSelect(doctor)
                              }
                            >
                              {label}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
              </div>
              {recommendedDoctorLoadError && (
                <p className="mt-1 text-xs text-red-500">
                  {recommendedDoctorLoadError}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                Treatment By Doctor <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="treatment_doctor"
                  ref={treatmentDoctorInputRef}
                  value={treatmentDoctorQuery}
                  onChange={handleTreatmentDoctorChange}
                  onFocus={() => setIsTreatmentDoctorOpen(true)}
                  onBlur={() => {
                    window.setTimeout(
                      () => setIsTreatmentDoctorOpen(false),
                      120,
                    );
                  }}
                  autoCorrect="off"
                  autoComplete="off"
                  className={fieldClass}
                  disabled={!form.department || isTreatmentDoctorsLoading}
                  required
                  placeholder={
                    !form.department
                      ? "Select department first"
                      : isTreatmentDoctorsLoading
                        ? "Loading doctors..."
                        : treatmentDoctorOptions.length === 0
                          ? "No doctors available"
                          : "Type or select a doctor"
                  }
                />
                {treatmentDoctorQuery && (
                  <button
                    type="button"
                    aria-label="Clear treatment doctor"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setTreatmentDoctorQuery("");
                      setForm((prev) => ({
                        ...prev,
                        treatment_doctor: "",
                      }));
                      setIsTreatmentDoctorOpen(true);
                      treatmentDoctorInputRef.current?.focus();
                    }}
                  >
                    ✕
                  </button>
                )}
                {isTreatmentDoctorOpen &&
                  form.department &&
                  !isTreatmentDoctorsLoading &&
                  treatmentDoctorOptions.length > 0 && (
                    <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
                      {filteredTreatmentDoctors.length === 0 ? (
                        <div className="px-4 py-2 text-slate-500">
                          No matching doctors
                        </div>
                      ) : (
                        filteredTreatmentDoctors.map((doctor) => {
                          const label = getTreatmentDoctorLabel(doctor);
                          const isActive =
                            String(form.treatment_doctor) ===
                            String(doctor.doctor);
                          return (
                            <button
                              type="button"
                              key={doctor.doctor}
                              className={`flex w-full items-start px-4 py-2 text-left transition ${
                                isActive
                                  ? "bg-slate-100 text-slate-900"
                                  : "hover:bg-slate-50 text-slate-700"
                              }`}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() =>
                                handleTreatmentDoctorSelect(doctor)
                              }
                            >
                              {label}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
              </div>
              {treatmentDoctorLoadError && (
                <p className="mt-1 text-xs text-red-500">
                  {treatmentDoctorLoadError}
                </p>
              )}
              {form.treatment_doctor && (
                <p className="mt-1 text-xs text-slate-600">
                  Doctor Rate:{" "}
                  <span className="font-semibold text-slate-900">
                    {hasSelectedTreatmentDoctorRate
                      ? selectedTreatmentDoctorRate
                      : "Not configured"}
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                Ward <span className="text-rose-500">*</span>
              </label>
              <select
                name="ward"
                value={form.ward}
                onChange={handleChange}
                className={fieldClass}
                required
                disabled={isWardsLoading}
              >
                <option value="">
                  {isWardsLoading
                    ? "Loading wards..."
                    : wards.length === 0
                      ? "No wards available"
                      : "Select Ward"}
                </option>
                {wards.map((ward) => (
                  <option key={ward.id} value={ward.id}>
                    {getWardLabel(ward)}
                  </option>
                ))}
              </select>
              {wardLoadError && (
                <p className="mt-1 text-xs text-red-500">{wardLoadError}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                Room <span className="text-rose-500">*</span>
              </label>
              <select
                name="room"
                value={form.room}
                onChange={handleChange}
                className={fieldClass}
                required
                disabled={!form.ward || isRoomsLoading}
              >
                <option value="">
                  {!form.ward
                    ? "Select ward first"
                    : isRoomsLoading
                      ? "Loading rooms..."
                      : rooms.length === 0
                        ? "No rooms available"
                        : "Select Room"}
                </option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.room_no}
                    {room.room_type ? ` • ${room.room_type}` : ""}
                  </option>
                ))}
              </select>
              {roomLoadError && (
                <p className="mt-1 text-xs text-red-500">{roomLoadError}</p>
              )}
              {!roomLoadError &&
                form.ward &&
                !isRoomsLoading &&
                rooms.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No rooms linked to the selected ward.
                  </p>
                )}
            </div>

            <div>
              <label className={labelClass}>
                Bed <span className="text-rose-500">*</span>
              </label>
              <select
                name="bed"
                value={form.bed}
                onChange={handleChange}
                className={fieldClass}
                required
                disabled={!form.room || isBedsLoading}
              >
                {form.bed && selectedBedLabel ? (
                  <option value={form.bed} hidden>
                    {selectedBedLabel}
                  </option>
                ) : null}
                <option value="">
                  {!form.room
                    ? "Select room first"
                    : isBedsLoading
                      ? "Loading beds..."
                      : beds.length === 0
                        ? "No beds available"
                        : "Select Bed"}
                </option>
                {sortedBeds.map((bed) => {
                  const isUnavailable = bed.is_available === false;
                  const label = `${getBedLabel(bed)}${
                    isUnavailable ? " • Occupied" : ""
                  }`;
                  return (
                    <option
                      key={bed.id}
                      value={bed.id}
                      disabled={
                        isUnavailable && String(form.bed) !== String(bed.id)
                      }
                    >
                      {label}
                    </option>
                  );
                })}
              </select>
              {bedLoadError && (
                <p className="mt-1 text-xs text-red-500">{bedLoadError}</p>
              )}
              {!bedLoadError &&
                form.room &&
                !isBedsLoading &&
                beds.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No beds available for the selected room.
                  </p>
                )}
              {!bedLoadError &&
                form.room &&
                !isBedsLoading &&
                beds.length > 0 &&
                beds.some((bed) => bed.is_available === false) && (
                  <p className="mt-1 text-xs text-amber-600">
                    Beds marked as Occupied cannot be selected.
                  </p>
                )}
            </div>

            <div>
              <label className={labelClass}>
                Admission Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="admission_date"
                value={form.admission_date}
                onChange={handleChange}
                className={fieldClass}
                required
              />
            </div>

            <div>
              <label className={labelClass}>
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className={fieldClass}
                required
              >
                <option value="ADMITTED">Admitted</option>
                <option value="TRANSFERRED">Transferred</option>
                <option value="DISCHARGED">Discharged</option>
              </select>
            </div>

            {form.status === "DISCHARGED" && (
              <>
                <div>
                  <label className={labelClass}>Discharge Date</label>
                  <input
                    type="datetime-local"
                    name="discharge_date"
                    value={form.discharge_date}
                    onChange={handleChange}
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Discharge Summary</label>
                  <textarea
                    name="discharge_summary"
                    value={form.discharge_summary}
                    onChange={handleChange}
                    className={fieldClass}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {showEstimatedBill && (
          <div className={stepCardClass}>
            <h2 className="text-lg font-semibold text-slate-900">
              Estimated Bill
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Capture estimated charges after saving the booking.
            </p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Invoice
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Estimated charges overview
                </p>
                {lastBookingSummary && (
                  <div className="mt-3 flex items-center gap-3 overflow-x-auto text-xs text-slate-600">
                    <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 shadow-sm">
                      IPD Booking ID:{" "}
                      {lastBookingSummary.id
                        ? `#${lastBookingSummary.id}`
                        : "—"}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                      Department: {lastBookingSummary.departmentName || "—"}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                      Ward: {lastBookingSummary.wardName || "—"}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                      Room: {lastBookingSummary.roomName || "—"}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                      Bed: {lastBookingSummary.bedName || "—"}
                    </span>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">
                        Item
                      </th>
                      <th className="px-6 py-3 text-right font-semibold">
                        Rate
                      </th>
                      <th className="px-6 py-3 text-right font-semibold">
                        Qty/Days
                      </th>
                      <th className="px-6 py-3 text-right font-semibold">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* <tr className="bg-slate-50/60">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                        Room Rate (per day)
                      </td>
                      <td className="px-6 py-4 text-right" colSpan={3}>
                        <input
                          type="number"
                          name="room_rate"
                          value={billForm.room_rate}
                          onChange={handleBillChange}
                          className={`${fieldClass} text-right no-number-spin`}
                          min="0"
                        />
                      </td>
                    </tr> */}
                    {/* <tr className="bg-slate-50/60">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                        Total Days
                      </td>
                      <td className="px-6 py-4 text-right" colSpan={3}>
                        <input
                          type="number"
                          name="total_days"
                          value={billForm.total_days}
                          onChange={handleBillChange}
                          className={`${fieldClass} text-right no-number-spin`}
                          min="1"
                        />
                      </td>
                    </tr> */}
                    <tr>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        <label>Room Charges</label>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <input
                          type="number"
                          name="room_rate"
                          value={billForm.room_rate}
                          onChange={handleBillChange}
                          className={`${fieldClass} text-right no-number-spin`}
                          min="0"
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <input
                          type="number"
                          name="total_days"
                          value={billForm.total_days}
                          onChange={handleBillChange}
                          className={`${fieldClass} text-right no-number-spin`}
                          min="1"
                          placeholder="Total Days"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={
                            billRoomRateValue && billTotalDaysValue
                              ? billEstimatedRoomCharges.toFixed(2)
                              : "Enter room rate and total days"
                          }
                          disabled
                          className={`${fieldClass} ${disabledClass} text-right`}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        <label> Doctor Charges</label>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <input
                          type="number"
                          name="doctor_rate"
                          value={billForm.doctor_rate}
                          onChange={handleBillChange}
                          className={`${fieldClass} text-right no-number-spin`}
                          min="0"
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <input
                          type="number"
                          name="doctor_visits"
                          value={billForm.doctor_visits}
                          onChange={handleBillChange}
                          className={`${fieldClass} text-right no-number-spin`}
                          min="1"
                          placeholder="Total Visits"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={
                            billDoctorRateValue && billDoctorVisitsValue
                              ? billDoctorChargesValue.toFixed(2)
                              : "Enter doctor rate and total visits"
                          }
                          disabled
                          className={`${fieldClass} ${disabledClass} text-right`}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        <label>Operation Theater Charges</label>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500">—</td>
                      <td className="px-6 py-4 text-right text-slate-500">—</td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          name="operation_theater_charges"
                          value={billForm.operation_theater_charges}
                          onChange={handleBillChange}
                          className={`${fieldClass} text-right no-number-spin`}
                          min="0"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        <label>+ Charges</label>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500">—</td>
                      <td className="px-6 py-4 text-right text-slate-500">—</td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          name="other_charges"
                          value={billForm.other_charges}
                          onChange={handleBillChange}
                          className={`${fieldClass} text-right no-number-spin`}
                          min="0"
                        />
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-4 text-right text-sm font-bold text-slate-700"
                      >
                        Total Charges
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={billTotalCharges.toFixed(2)}
                          disabled
                          className={`${fieldClass} ${disabledClass} text-right`}
                        />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
                <div className="text-xs text-slate-500">
                  Save this billing to store the estimated charges.
                </div>
                <button
                  type="button"
                  onClick={handleBillingSave}
                  className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-slate-800 disabled:opacity-60"
                  disabled={isBillingSaving}
                >
                  {isBillingSaving ? "Saving..." : "Save Billing"}
                </button>
              </div>
            </div>
            {billingError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {billingError}
              </div>
            )}
            {billingSuccess && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {billingSuccess}
              </div>
            )}
          </div>
        )}

        {formError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {formError}
          </div>
        )}
        {submitSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {submitSuccess}
          </div>
        )}

        {!showEstimatedBill && (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-full border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 shadow hover:bg-slate-50 disabled:opacity-60"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : isEditingBooking
                  ? "Update IPD Booking"
                  : "Add BIlling Item"}
            </button>
          </div>
        )}
      </form>

      {isPatientModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6 sm:py-10">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={closePatientModal}
            aria-hidden="true"
          />
          <div
            ref={patientDialogRef}
            className="relative z-10 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
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
                  Capture patient information for IPD intake.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onMouseDown={handlePatientDialogDragStart}
                  className="cursor-grab rounded-full border border-slate-200 p-2 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  aria-label="Drag patient modal"
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
                    Mobile : (Optional)
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
                    Age : <span className="text-red-500">*</span>
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
                  <label className="font-medium text-slate-700">State :</label>
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
                        setTimeout(() => setIsInsuranceDropdownOpen(false), 120)
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
                              {filteredInsuranceOptions.map((option, index) => (
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
                              ))}
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
  );
}

export default function IPDRegistrationForm() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-10 text-gray-500">
          Loading booking form...
        </div>
      }
    >
      <IPDRegistrationFormContent />
    </Suspense>
  );
}
