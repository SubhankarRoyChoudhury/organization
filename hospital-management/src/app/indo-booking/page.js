"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  get_Hospital_User_Login_Details,
  getApprovedDepartments,
  getDoctorsByOpd,
  createOpdTicketBooking,
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

export default function INDOBookingPage() {
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
    }),
    []
  );
  const [form, setForm] = useState(() => buildInitialFormState());
  const router = useRouter();
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
  const [doctorScheduleMap, setDoctorScheduleMap] = useState({});
  const [isDoctorLoading, setIsDoctorLoading] = useState(false);
  const [doctorFetchError, setDoctorFetchError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false); // State for the success dialog
  const [successMessage, setSuccessMessage] = useState(""); // State for the success message
  const [visitDateError, setVisitDateError] = useState(null);
  const dobInputRef = useRef(null);
  const visitDateInputRef = useRef(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    now.setDate(1);
    return now;
  });

  const fieldClassNames =
    "w-full border border-gray-300 rounded-md px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-200 outline-none bg-white text-gray-900 placeholder-gray-500";
  const HEALTH_INSURANCE_OPTIONS = [
    "Select company",
    "Ayushman Bharat",
    "Star Health",
    "HDFC Ergo",
    "ICICI Lombard",
    "Care Health",
    "Other",
  ];

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

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
      }));
      setDoctorScheduleMap({});
      setVisitDateError(null);
      return;
    }
    if (name === "doctor") {
      setForm((prev) => ({
        ...prev,
        doctor: value,
        doctorSchedule: "",
        doctorScheduleSelection: "",
        visitDate: "",
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
            "Select a date that matches the doctor's schedule."
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
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId) {
      setSubmitError(
        "Missing company context. Please login again or refresh the page."
      );
      return;
    }
    setSubmitError(null);
    setSubmitSuccess(null);

    const selectedDepartment = allDepartment.find(
      (department) => String(department.id) === String(form.department)
    );
    const selectedDoctorSchedule = doctorOptions.find(
      (schedule) => String(schedule.doctor) === String(form.doctor)
    );
    const doctorSlotOptions = doctorScheduleMap[String(form.doctor)] || [];
    const selectedDoctorSlot = doctorSlotOptions.find(
      (slot) => slot.value === form.doctorScheduleSelection
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
    };

    if (!apiPayload.visitDate || !apiPayload.name) {
      setSubmitError("Visit date and patient name are required.");
      return;
    }
    if (form.doctor && doctorSlotOptions.length > 0 && !form.doctorSchedule) {
      setSubmitError("Please select an available day and time slot.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("opdTicketData", JSON.stringify(sessionPayload));
      }
      await createOpdTicketBooking(apiPayload, companyId);
      setSubmitSuccess("OPD ticket saved successfully.");

      setSuccessMessage("OPD ticket saved successfully");
      setIsSuccessDialogOpen(true);
      setTimeout(() => {
        router.push("/opd-booking/ticket");
      }, 900);
    } catch (error) {
      const apiError =
        error.response?.data?.errors ||
        error.response?.data?.error ||
        "Failed to save OPD ticket.";
      setSubmitError(
        typeof apiError === "string" ? apiError : JSON.stringify(apiError)
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
        "Missing company context. Please login or use a company-specific link."
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
        const parsed = sanitizeCompanyId(data?.company_id);
        if (parsed) {
          setCompanyId(data?.company_id);
          setCompanyError(null);
          setForm((prev) => ({
            ...prev,
            company: data?.company_name || data?.name || prev.company,
          }));
        } else {
          setCompanyError(
            "Unable to determine your company. Please contact support."
          );
        }
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching user:", err);
      setError("Failed to fetch user details.");
      if (!hasLockedCompany) {
        setCompanyError(
          "Unable to fetch your company details. Please login again."
        );
      }
    }
  };
  useEffect(() => {
    if (!companyId) return;
    fetchAllDepartment(companyId);
    // fetchAllDoctorType(companyId);
    // fetchAllAdministratorType(companyId);
    // fetchAllTimeSlots(companyId);
  }, [companyId]);

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
        Array.isArray(data) ? data : []
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

  const availableVisitDates = useMemo(
    () => generateAllowedDates(allowedDayNames),
    [allowedDayNames]
  );
  const allowedVisitDatesSet = useMemo(
    () => new Set(availableVisitDates),
    [availableVisitDates]
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
          slot.value === prev.doctorScheduleSelection
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
        (slot) => slot.day === selectedVisitDayName
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

  const handleCalendarSelect = (iso) => {
    if (!allowedVisitDatesSet.has(iso)) return;
    setVisitDateError(null);
    setForm((prev) => ({
      ...prev,
      visitDate: iso,
      doctorSchedule: "",
      doctorScheduleSelection: "",
    }));
  };

  const goToAdjacentMonth = (direction) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
  };

  const filteredDoctorSlots = useMemo(() => {
    if (!selectedVisitDayName) return [];
    return selectedDoctorSlots.filter(
      (slot) => slot.day === selectedVisitDayName
    );
  }, [selectedDoctorSlots, selectedVisitDayName]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-6xl bg-white shadow-md rounded-2xl border border-blue-100 p-6">
        <div className="flex items-center justify-start mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-blue-300 hover:text-blue-600"
            >
              ← Back
            </button>
            <img
              src="https://cdn-icons-png.flaticon.com/512/2966/2966484.png"
              alt="MedCare logo"
              className="w-12 h-12 rounded-full shadow-sm"
            />
            <span className="hidden sm:block text-lg font-semibold text-blue-700">
              <span className="text-2xl font-semibold text-blue-700">
                {loggedInDetails?.company_name ||
                  loggedInDetails?.name ||
                  "MedCare"}
              </span>
            </span>
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-blue-700 mb-4 text-center">
          Hospital OPD Ticket Booking
        </h1>
        <p className="text-right text-sm text-red-600 mb-3">
          * marked fields are mandatory
        </p>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm"
        >
          {/* Hospital Name hidden */}
          <input type="hidden" name="hospital" value={form.company} readOnly />

          {/* Name */}
          <div>
            <label className="font-medium text-gray-700">Name:*</label>
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
            <label className="font-medium text-gray-700">Gender:</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
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
            <label className="font-medium text-gray-700">Mobile No:</label>
            <input
              type="tel"
              name="mobile"
              value={form.mobile}
              onChange={handleChange}
              pattern="[0-9]{10}"
              className={fieldClassNames}
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="font-medium text-gray-700">Date of Birth:*</label>
            <input
              ref={dobInputRef}
              type="date"
              name="dateOfBirth"
              value={form.dateOfBirth}
              onChange={handleChange}
              max={today}
              required
              className="absolute w-0 h-0 -z-10 opacity-0 pointer-events-none"
            />
            <button
              type="button"
              onClick={() =>
                dobInputRef.current?.showPicker
                  ? dobInputRef.current.showPicker()
                  : dobInputRef.current?.focus()
              }
              className={`${fieldClassNames} font-semibold bg-gray-50 flex items-center justify-between`}
            >
              <span>{formatDateDisplay(form.dateOfBirth)}</span>
              <span className="text-gray-500">📅</span>
            </button>
          </div>

          {/* Country */}
          <div>
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
          </div>

          {/* State */}
          <div>
            <label className="font-medium text-gray-700">State:</label>
            <input
              type="text"
              name="state"
              value={form.state}
              onChange={handleChange}
              className={fieldClassNames}
            />
          </div>

          {/* District */}
          <div>
            <label className="font-medium text-gray-700">District:</label>
            <input
              type="text"
              name="district"
              value={form.district}
              onChange={handleChange}
              className={fieldClassNames}
            />
          </div>

          {/* P.S */}
          <div>
            <label className="font-medium text-gray-700">P.S:</label>
            <input
              type="text"
              name="ps"
              value={form.ps}
              onChange={handleChange}
              className={fieldClassNames}
            />
          </div>

          {/* Address */}
          <div className="col-span-4">
            <label className="font-medium text-gray-700">Address:*</label>
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
          <div>
            <label className="font-medium text-gray-700">Pin:*</label>
            <input
              type="text"
              name="pin"
              value={form.pin}
              onChange={handleChange}
              required
              className={fieldClassNames}
            />
          </div>

          <div>
            <label className="font-medium text-gray-700">
              Health Insurance Company:
            </label>
            <select
              name="health_insurance_company"
              value={form.health_insurance_company}
              onChange={handleChange}
              className={fieldClassNames}
            >
              {HEALTH_INSURANCE_OPTIONS.map((option) => (
                <option
                  key={option}
                  value={option === "Select company" ? "" : option}
                >
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-medium text-gray-700">Policy No:</label>
            <input
              type="text"
              name="policy_no"
              value={form.policy_no}
              onChange={handleChange}
              className={fieldClassNames}
            />
          </div>

          <div>
            <label className="font-medium text-gray-700">Policy Amount:</label>
            <input
              type="number"
              name="policy_amount"
              value={form.policy_amount}
              onChange={handleChange}
              className={fieldClassNames}
              min="0"
              step="0.01"
            />
          </div>

          {/* OPD */}
          <div>
            <label className="font-medium text-gray-700">Department:*</label>
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
            <label className="font-medium text-gray-700">Doctor:</label>
            <select
              name="doctor"
              value={form.doctor}
              onChange={handleChange}
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
            <label className="font-medium text-gray-700">Visit Date:</label>
            <input
              ref={visitDateInputRef}
              type="date"
              name="visitDate"
              value={form.visitDate}
              onChange={handleChange}
              min={visitDateMin}
              max={visitDateMax}
              disabled={availableVisitDates.length > 0 && !form.doctor}
              className="absolute w-0 h-0 -z-10 opacity-0 pointer-events-none"
            />
            <button
              type="button"
              onClick={() =>
                visitDateInputRef.current?.showPicker
                  ? visitDateInputRef.current.showPicker()
                  : visitDateInputRef.current?.focus()
              }
              className={`${fieldClassNames} font-semibold bg-gray-50 flex items-center justify-between`}
              disabled={availableVisitDates.length > 0 && !form.doctor}
            >
              <span>{formatDateDisplay(form.visitDate)}</span>
              <span className="text-gray-500">📅</span>
            </button>
            {allowedDayNames.length > 0 && (
              <p className="text-[13px] text-gray-800 mt-1">
                Available days: {allowedDayNames.join(", ")}.
              </p>
            )}
            {visitDateError && (
              <p className="text-[12px] text-red-500 mt-1">{visitDateError}</p>
            )}
          </div>

          {form.doctor && (
            <div className="col-span-2">
              <label className="font-medium text-gray-700">
                Available Day → Time Slot:
              </label>
              <select
                name="doctorSchedule"
                value={form.doctorScheduleSelection}
                onChange={handleChange}
                className={fieldClassNames}
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

          {submitError && (
            <div className="col-span-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}
          {submitSuccess && (
            <div className="col-span-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
              {submitSuccess}
            </div>
          )}

          {/* Buttons */}
          <div className="col-span-4 flex justify-center gap-4 mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
            <button
              type="reset"
              className="bg-red-500 text-white px-6 py-2 rounded-md font-medium hover:bg-red-600 transition"
              onClick={() => {
                setForm((prev) => ({
                  ...buildInitialFormState(),
                  company: companyId ? prev.company : "",
                  visitDate: "",
                }));
                setDoctorOptions([]);
                setDoctorScheduleMap({});
                setDoctorFetchError(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bg-yellow-500 text-white px-6 py-2 rounded-md font-medium hover:bg-yellow-600 transition"
              onClick={() => alert("Returning Home")}
            >
              Home
            </button>
          </div>
        </form>
      </div>
      <SuccessDialog
        open={isSuccessDialogOpen}
        onClose={closeSuccessDialog}
        message={successMessage}
      />
    </div>
  );
}
