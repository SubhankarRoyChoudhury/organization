"use client";

import Link from "next/link";
import { Suspense, useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, MailCheck, Send } from "lucide-react";
import {
  createNewDoctorWithSchedule,
  createNewAdministration,
  getAllTimeSlots,
  getAllDoctors,
  get_Hospital_User_Login_Details,
  getApprovedDepartments,
  getApprovedDoctorTypes,
  getApprovedAdministratorTypes,
  getApprovedStaffDepartments,
  getApprovedStaffJobTitles,
} from "@/app/api/apiService";

import ErrorDialog from "../ErrorDialog/page"; // Import the error dialog
import SuccessDialog from "../SuccessDialog/page"; // Import the success dialog

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
      <SignUpContent />
    </Suspense>
  );
}

function SignUpContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roleParam = searchParams?.get("role");
  const hideAdministrationRole =
    searchParams?.get("hide_admin_role") === "true";
  const hideDoctorRole = searchParams?.get("hide_doctor_role") === "true";
  const resolvedRoleParam =
    roleParam === "administration" ||
    roleParam === "doctor" ||
    roleParam === "staff"
      ? roleParam
      : "doctor";
  const initialRole = (() => {
    if (resolvedRoleParam === "administration" && hideAdministrationRole) {
      return "doctor";
    }
    if (resolvedRoleParam === "doctor" && hideDoctorRole) {
      return "administration";
    }
    if (
      hideDoctorRole &&
      resolvedRoleParam !== "administration" &&
      resolvedRoleParam !== "staff"
    ) {
      return "administration";
    }
    if (hideAdministrationRole && resolvedRoleParam !== "doctor") {
      return "doctor";
    }
    return resolvedRoleParam;
  })();
  const [role, setRole] = useState(initialRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [doctor_type, setDoctorType] = useState("");
  const [administration_type, setAdministrationType] = useState("");
  const [job_title, setJobTitle] = useState("");
  const [staff_department, setStaffDepartment] = useState("");
  const [staff_job_title, setStaffJobTitle] = useState("");
  const [needsAccess, setNeedsAccess] = useState(false);
  const [accessTouched, setAccessTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isWhatsAppSameAsPhone, setIsWhatsAppSameAsPhone] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const OTP_LENGTH = 6;
  const [otpInput, setOtpInput] = useState(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [allDepartment, setAllDepartment] = useState([]);
  const [allDoctorType, setAllDoctorType] = useState([]);
  const [allAdministratorType, setAllAdministratorType] = useState([]);
  const [allStaffDepartments, setAllStaffDepartments] = useState([]);
  const [allStaffJobTitles, setAllStaffJobTitles] = useState([]);
  const [associationType, setAssociationType] = useState("");
  const [medicalCouncilRegistration, setMedicalCouncilRegistration] =
    useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [availableDays, setAvailableDays] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [dayTimeSlots, setDayTimeSlots] = useState({});
  const [companyId, setCompanyId] = useState(null);
  const [companyError, setCompanyError] = useState(null);

  const [error, setError] = useState(null);

  const [errorMessage, setErrorMessage] = useState(null); // State for the error message
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false); // State for the error dialog
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false); // State for the success dialog
  const [successMessage, setSuccessMessage] = useState(""); // State for the success message
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fullNameInputRef = useRef(null);
  const otpInputRefs = useRef([]);
  const queryCompanyId = searchParams?.get("company_id");

  useEffect(() => {
    if (roleParam === "administration" && hideAdministrationRole) {
      setRole("doctor");
    } else if (roleParam === "doctor" && hideDoctorRole) {
      setRole("administration");
    } else if (
      roleParam === "administration" ||
      roleParam === "doctor" ||
      roleParam === "staff"
    ) {
      setRole(roleParam);
    }
  }, [roleParam, hideAdministrationRole, hideDoctorRole]);

  useEffect(() => {
    if (isWhatsAppSameAsPhone) {
      setWhatsappNumber(phone);
    }
  }, [isWhatsAppSameAsPhone, phone]);

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const jobTitleOptions = [
    { value: "Driver", label: "Driver" },
    { value: "security_guard", label: "Security Guard" },
    { value: "ot_nurse", label: "OT Nurse" },
    { value: "ward_nurse", label: "Ward Nurse" },
    { value: "Accounts Staff", label: "Accounts Staff" },
    { value: "Hospital Manager", label: "Hospital Manager" },
    { value: "Accounts Manager", label: "Accounts Manager" },
    { value: "HR Executive", label: "HR Executive" },
    { value: "Front Desk Executive", label: "Front Desk Executive" },
    { value: "System Administrator", label: "System Administrator" },
    { value: "Billing Executive", label: "Billing Executive" },
    { value: "Operations Head", label: "Operations Head" },
    { value: "Records Officer", label: "Records Officer" },
    { value: "Purchase Manager", label: "Purchase Manager" },
    { value: "Nursing Coordinator", label: "Nursing Coordinator" },
    { value: "Security Supervisor", label: "Security Supervisor" },
    { value: "Housekeeping Incharge", label: "Housekeeping Incharge" },
    { value: "Transport Manager", label: "Transport Manager" },
    { value: "Insurance Desk Officer", label: "Insurance Desk Officer" },
    { value: "Quality Manager", label: "Quality Manager" },
  ];

  const slotLabelMap = useMemo(() => {
    const map = new Map();
    timeSlots.forEach((slot) => {
      const display =
        slot.display_time ||
        `${slot.start_time ?? ""} - ${slot.end_time ?? ""}`.trim();
      map.set(String(slot.id), display || `Slot #${slot.id}`);
    });
    return map;
  }, [timeSlots]);

  const toggleDaySlot = (day, slotId, isChecked) => {
    setDayTimeSlots((prev) => {
      const currentSlots = Array.isArray(prev[day]) ? prev[day] : [];
      let nextSlots;
      if (isChecked) {
        if (currentSlots.includes(slotId)) {
          return prev;
        }
        nextSlots = [...currentSlots, slotId];
      } else {
        nextSlots = currentSlots.filter((slot) => slot !== slotId);
      }
      const updated = { ...prev };
      if (!nextSlots.length) {
        delete updated[day];
      } else {
        updated[day] = nextSlots;
      }
      return updated;
    });
  };

  const getDaySlotLabels = (day) => {
    const slots = dayTimeSlots[day];
    if (!Array.isArray(slots) || slots.length === 0) return [];
    return slots.map((slotId) => {
      const key = String(slotId);
      return slotLabelMap.get(key) || `Slot #${slotId}`;
    });
  };
  // const timeSlots = [
  //   "08:00 AM - 10:00 AM",
  //   "10:00 AM - 12:00 PM",
  //   "12:00 PM - 02:00 PM",
  //   "02:00 PM - 04:00 PM",
  //   "04:00 PM - 06:00 PM",
  //   "06:00 PM - 08:00 PM",
  // ];

  // const handleSubmit = async (event) => {
  //   event.preventDefault();
  //   const formData = {
  //     full_name: fullName,
  //     email,
  //     phone,
  //     role,
  //     ...(role === "doctor" ? { department, doctor_type } : {}),
  //     ...(role === "administration" ? { administrationType } : {}),
  //     password,
  //   };
  //   console.log("Signup form submitted:", formData);
  //   const createResponse = await createNewDoctor(formData);
  //   console.log("New Doctor Created Successfully:", createResponse);
  // };

  const [loggedInDetails, setLoggedInDetails] = useState(null);

  const sanitizeCompanyId = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const num = Number(value);
    if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
      return null;
    }
    return num;
  };

  const resolveCompanyId = (data) => {
    const candidates = [
      data?.company_id,
      data?.user?.company_id,
      data?.companies?.[0]?.company_id,
      data?.companies?.[0]?.id,
      data?.company?.id,
    ];
    for (const candidate of candidates) {
      const parsed = sanitizeCompanyId(candidate);
      if (parsed) return parsed;
    }
    if (Array.isArray(data?.companies)) {
      for (const company of data.companies) {
        const parsed = sanitizeCompanyId(company?.company_id ?? company?.id);
        if (parsed) return parsed;
      }
    }
    const storedCompanyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
    const parsedStored = sanitizeCompanyId(storedCompanyId);
    if (parsedStored) return parsedStored;
    return null;
  };

  const queryCompanyIdNumber = sanitizeCompanyId(queryCompanyId);

  useEffect(() => {
    if (queryCompanyIdNumber) {
      setCompanyId(queryCompanyIdNumber);
      setCompanyError(null);
    } else if (queryCompanyId) {
      setCompanyError("Invalid company_id provided in the URL.");
    }
  }, [queryCompanyId, queryCompanyIdNumber]);

  useEffect(() => {
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (!username) {
      if (!queryCompanyIdNumber) {
        setCompanyError(
          "Missing company context. Please login or use a company-specific link.",
        );
      }
      return;
    }
    fetchUserDetails(username, queryCompanyIdNumber);
  }, [queryCompanyIdNumber]);

  const fetchUserDetails = async (username, hasLockedCompany) => {
    try {
      const data = await get_Hospital_User_Login_Details(username);
      console.log("Company Details", data);

      setLoggedInDetails(data);
      if (!hasLockedCompany) {
        const parsed = resolveCompanyId(data);
        console.log("Company ID", parsed);

        if (parsed) {
          setCompanyId(parsed);
          setCompanyError(null);
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

  const showValidationError = (message) => {
    setErrorMessage(message);
    setIsErrorDialogOpen(true);
  };

  const isDoctorEmailDuplicate = async (company_id, emailAddress) => {
    const normalizedEmail = String(emailAddress || "")
      .trim()
      .toLowerCase();
    if (!normalizedEmail) {
      return false;
    }
    const doctors = await getAllDoctors(company_id);
    return (Array.isArray(doctors) ? doctors : []).some((doctor) => {
      const doctorEmail = String(doctor?.email || "")
        .trim()
        .toLowerCase();
      return doctorEmail && doctorEmail === normalizedEmail;
    });
  };

  const validateRequiredFields = () => {
    if (!fullName.trim()) {
      showValidationError("Full Name is required.");
      return false;
    }
    const requiresEmail = role !== "staff" || needsAccess;
    if (requiresEmail && !email.trim()) {
      showValidationError("Email is required.");
      return false;
    }
    if (!phone.trim()) {
      showValidationError("Phone Number is required.");
      return false;
    }
    if (role === "doctor") {
      if (!associationType) {
        showValidationError("Association Type is required for doctors.");
        return false;
      }
      if (!availableDays.length) {
        showValidationError(
          "Please select at least one Available Day & Time Slot.",
        );
        return false;
      }
      const hasSlotForEveryDay = availableDays.every((day) => {
        const slots = dayTimeSlots[day];
        if (Array.isArray(slots)) {
          return slots.length > 0;
        }
        return slots !== undefined && slots !== "" && slots !== null;
      });
      if (!hasSlotForEveryDay) {
        showValidationError(
          "Every selected day must have a corresponding time slot.",
        );
        return false;
      }
      if (!department) {
        showValidationError("Department is required for doctors.");
        return false;
      }
      if (!doctor_type) {
        showValidationError("Doctor Type is required for doctors.");
        return false;
      }
      if (!medicalCouncilRegistration.trim()) {
        showValidationError(
          "Medical council registration is required for doctors.",
        );
        return false;
      }
    }
    if (role === "staff") {
      if (!staff_department) {
        showValidationError("Staff Department is required for staff.");
        return false;
      }
      if (!staff_job_title) {
        showValidationError("Staff Job Title is required for staff.");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!companyId) {
      setError(
        "Missing company context. Please login or provide a company link.",
      );
      return;
    }

    if (!validateRequiredFields()) {
      return;
    }

    const createdBy =
      loggedInDetails?.user?.name ||
      loggedInDetails?.user?.username ||
      loggedInDetails?.username ||
      "unknown";

    try {
      let createResponse;

      if (role === "doctor") {
        try {
          const hasDuplicate = await isDoctorEmailDuplicate(companyId, email);
          if (hasDuplicate) {
            showValidationError(
              "A doctor with this email already exists for this company.",
            );
            return;
          }
        } catch (lookupError) {
          console.error("Failed to verify doctor email:", lookupError);
          showValidationError(
            "Unable to verify doctor email right now. Please try again.",
          );
          return;
        }
        const normalizedDaySlots = availableDays.reduce((acc, day) => {
          const slots = dayTimeSlots[day];
          const slotArray = Array.isArray(slots)
            ? slots
            : slots !== undefined && slots !== null && slots !== ""
              ? [slots]
              : [];
          const cleaned = slotArray
            .map((slot) => Number(slot))
            .filter((slot) => Number.isFinite(slot));
          if (cleaned.length) {
            acc[day] = cleaned;
          }
          return acc;
        }, {});

        const selectedDaySchedules = Object.entries(normalizedDaySlots).map(
          ([day, slots]) => ({
            day,
            time_slots: slots,
            is_available: false,
          }),
        );
        const formDataDoctor = {
          name: fullName,
          username: email,
          email,
          mobile: phone,
          role,
          department,
          doctor_type,
          password: "abc123",
          whatsapp_number: whatsappNumber,
          association_type: associationType,
          medical_council_registration: medicalCouncilRegistration.trim(),
          available_day_slots: normalizedDaySlots,
          schedule_rows: selectedDaySchedules,
          created_by: createdBy,
        };
        // console.log("Doctor Signup form submitted:", formDataDoctor);

        setIsSubmitting(true);
        createResponse = await createNewDoctorWithSchedule(
          formDataDoctor,
          companyId,
        );
        // console.log("✅ New Doctor Created Successfully:", createResponse);

        // alert("New Doctor Created successfully!");
        setSuccessMessage("New Doctor Created Successfully!");
        setIsSuccessDialogOpen(true);
        // ✅ Reset Doctor form
        setFullName("");
        setEmail("");
        setPhone("");
        setPassword("");
        setDepartment("");
        setDoctorType("");
        setAdministrationType("");
        setAssociationType("");
        setMedicalCouncilRegistration("");
        setWhatsappNumber("");
        setAvailableDays([]); // ✅ clears all checked days
        setDayTimeSlots({});
        setRole("doctor");
        setIsEmailVerified(false);
        setTimeout(() => {
          const createdDoctorId =
            createResponse?.id ||
            createResponse?.doctor?.id ||
            createResponse?.data?.id ||
            createResponse?.data?.doctor?.id;
          const params = new URLSearchParams({ modal: "add" });
          if (createdDoctorId) {
            params.set("doctor", String(createdDoctorId));
          }
          if (formDataDoctor.department) {
            params.set("department", String(formDataDoctor.department));
          }
          if (formDataDoctor.doctor_type) {
            params.set("doctor_type", String(formDataDoctor.doctor_type));
          }
          router.push(`/admin_dashboard/doctor-fees?${params.toString()}`);
        }, 900);
      } else if (role === "administration" || role === "staff") {
        const trimmedEmail = email.trim();
        const shouldIncludeEmail =
          role !== "staff" || (Boolean(trimmedEmail) && needsAccess);
        const safeEmail = shouldIncludeEmail ? trimmedEmail : "";
        const formDataAdministration = {
          name: fullName,
          username: safeEmail,
          email: safeEmail,
          mobile: phone,
          whatsapp_number: whatsappNumber,
          role,
          administration_type,
          job_title: role === "administration" ? job_title : undefined,
          staff_department: role === "staff" ? staff_department : undefined,
          staff_job_title: role === "staff" ? staff_job_title : undefined,
          password: "abc123",
          can_access: role === "staff" ? needsAccess : undefined,
          created_by: createdBy,
        };
        // console.log(
        //   "Administration Signup form submitted:",
        //   formDataAdministration
        // );

        setIsSubmitting(true);
        createResponse = await createNewAdministration(
          formDataAdministration,
          companyId,
        );
        // console.log(
        //   "✅ New Administration Created Successfully:",
        //   createResponse
        // );
        // alert("New Administration Created Successfully!");
        setSuccessMessage(
          role === "staff"
            ? "New Staff Created Successfully!"
            : "New Administration Created Successfully!",
        );
        setIsSuccessDialogOpen(true);

        setFullName("");
        setEmail("");
        setPhone("");
        setPassword("");
        setDepartment("");
        setDoctorType("");
        setAdministrationType("");
        setMedicalCouncilRegistration("");
        setJobTitle("");
        setStaffDepartment("");
        setStaffJobTitle("");
        setWhatsappNumber("");
        setNeedsAccess(false);
        setAccessTouched(false);
        setRole(role);
        setIsEmailVerified(false);
        setTimeout(() => {
          router.push(
            role === "staff"
              ? "/admin_dashboard/staff_list"
              : "/admin_dashboard/administration_list",
          );
        }, 900);
      }

      // optional: show success message or redirect
      // alert("Account created successfully!");
    } catch (error) {
      console.error("❌ Error creating account:", error);
      const responseData = error?.response?.data;
      const extractErrorMessage = (data, fallback) => {
        if (typeof data === "string") return data;
        if (data && typeof data === "object") {
          const preferredKeys = [
            "detail",
            "message",
            "error_description",
            "error",
            "errors",
            "non_field_errors",
          ];
          for (const key of preferredKeys) {
            const value = data[key];
            if (typeof value === "string") return value;
            if (Array.isArray(value) && value.length) return String(value[0]);
          }
          const entries = Object.entries(data);
          if (entries.length) {
            const [field, value] = entries[0];
            if (typeof value === "string") return value;
            if (Array.isArray(value) && value.length) return String(value[0]);
            if (value && typeof value === "object") {
              const nestedValues = Object.values(value);
              if (nestedValues.length) {
                const nested = nestedValues[0];
                if (typeof nested === "string") return nested;
                if (Array.isArray(nested) && nested.length)
                  return String(nested[0]);
              }
            }
            return `${field}: ${JSON.stringify(value)}`;
          }
        }
        return fallback || "Unknown error";
      };
      const resolvedMessage = extractErrorMessage(responseData, error?.message);
      setErrorMessage(resolvedMessage);
      setIsErrorDialogOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeErrorDialog = () => {
    setIsErrorDialogOpen(false); // Close the error dialog
  };

  const closeSuccessDialog = () => {
    setIsSuccessDialogOpen(false); // Close the success dialog
  };

  const roles = useMemo(() => {
    const baseRoles = [
      {
        id: "doctor",
        label: "Doctor",
        icon: "🩺",
        desc: "Manage appointments & patient notes.",
      },
      {
        id: "administration",
        label: "Administration",
        icon: "🛡️",
        desc: "Oversee operations and teams.",
      },
    ];
    return baseRoles.filter((item) => {
      if (hideAdministrationRole && item.id === "administration") return false;
      if (hideDoctorRole && item.id === "doctor") return false;
      return true;
    });
  }, [hideAdministrationRole, hideDoctorRole]);

  const handleSendVerification = () => {
    if (!email) {
      return;
    }
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setOtpInput(Array(OTP_LENGTH).fill(""));
    setOtpError("");
    setIsEmailVerified(false);
    setIsOtpModalOpen(true);
    // console.log("Mock OTP sent:", newOtp);
  };

  const focusOtpInput = (index) => {
    const target = otpInputRefs.current[index];
    if (target) {
      target.focus();
      target.select();
    }
  };

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtpInput((prev) => {
      const updated = [...prev];
      updated[index] = digit;
      return updated;
    });
    if (digit && index < OTP_LENGTH - 1) {
      focusOtpInput(index + 1);
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otpInput[index] && index > 0) {
      event.preventDefault();
      focusOtpInput(index - 1);
    }
  };

  const handleOtpPaste = (event) => {
    const clipboardData = event.clipboardData?.getData("text") || "";
    const digits = clipboardData.replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!digits) return;
    event.preventDefault();
    const updated = Array(OTP_LENGTH)
      .fill("")
      .map((_, idx) => digits[idx] || "");
    setOtpInput(updated);
    const nextIndex = Math.min(digits.length, OTP_LENGTH - 1);
    focusOtpInput(nextIndex);
  };

  const handleVerifyOtp = (event) => {
    event.preventDefault();
    const code = otpInput.join("");
    if (code.length !== 6) {
      setOtpError("Please enter the 6-digit code.");
      return;
    }
    if (code !== generatedOtp) {
      setOtpError("Invalid code. Try again.");
      return;
    }
    setIsEmailVerified(true);
    setIsOtpModalOpen(false);
    setOtpInput(Array(OTP_LENGTH).fill(""));
    setOtpError("");
    setGeneratedOtp("");
  };

  const handleCloseOtpModal = () => {
    setIsOtpModalOpen(false);
    setOtpInput(Array(OTP_LENGTH).fill(""));
    setOtpError("");
    setGeneratedOtp("");
  };

  useEffect(() => {
    if (role === "doctor") {
      setFullName((prev) => {
        const withoutPrefix = prev.replace(/^Dr\.\s*/i, "");
        const nextValue = `Dr. ${withoutPrefix}`; // ✅ keep space after Dr.
        return nextValue === prev ? prev : nextValue;
      });
      // Ensure cursor sits after prefix
      setTimeout(() => {
        if (fullNameInputRef.current) {
          const input = fullNameInputRef.current;
          const value = input.value;
          input.focus();
          input.setSelectionRange(value.length, value.length);
        }
      }, 0);
    } else {
      setFullName((prev) => {
        const nextValue = prev.replace(/^Dr\.\s*/i, "").trimStart();
        return nextValue === prev ? prev : nextValue;
      });
      setMedicalCouncilRegistration("");
    }
  }, [role]);

  useEffect(() => {
    if (!companyId) return;
    fetchAllDepartment(companyId);
    fetchAllDoctorType(companyId);
    fetchAllAdministratorType(companyId);
    fetchAllStaffDepartments(companyId);
    fetchAllStaffJobTitles(companyId);
    fetchAllTimeSlots(companyId);
  }, [companyId]);

  const fetchAllDepartment = async (companyIdToUse) => {
    if (!companyIdToUse) return;
    try {
      const data = await getApprovedDepartments(companyIdToUse);
      // console.log("All Department===>>>", data);
      setAllDepartment(data);
    } catch (error) {
      setError("Failed to fetch schools");
    }
  };
  const fetchAllDoctorType = async (companyIdToUse) => {
    if (!companyIdToUse) return;
    try {
      const data = await getApprovedDoctorTypes(companyIdToUse);
      // console.log("All DoctorType====>>>", data);
      setAllDoctorType(data);
    } catch (error) {
      setError("Failed to fetch schools");
    }
  };
  const fetchAllAdministratorType = async (companyIdToUse) => {
    if (!companyIdToUse) return;
    try {
      const data = await getApprovedAdministratorTypes(companyIdToUse);
      // console.log("All AdministratorType====>>>", data);
      setAllAdministratorType(data);
    } catch (error) {
      setError("Failed to fetch schools");
    }
  };
  const fetchAllStaffDepartments = async (companyIdToUse) => {
    if (!companyIdToUse) return;
    try {
      const data = await getApprovedStaffDepartments(companyIdToUse);
      setAllStaffDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      setError("Failed to fetch staff departments");
    }
  };
  const fetchAllStaffJobTitles = async (companyIdToUse) => {
    if (!companyIdToUse) return;
    try {
      const data = await getApprovedStaffJobTitles(companyIdToUse);
      setAllStaffJobTitles(Array.isArray(data) ? data : []);
    } catch (error) {
      setError("Failed to fetch staff job titles");
    }
  };
  const fetchAllTimeSlots = async (companyIdToUse) => {
    if (!companyIdToUse) return;
    try {
      const data = await getAllTimeSlots(companyIdToUse);
      // console.log("✅ Time Slots fetched:", data);
      setTimeSlots(data);
    } catch (error) {
      console.error("❌ Failed to fetch time slots:", error);
      setError("Failed to fetch time slots");
    }
  };

  const detailGridClassName =
    role === "doctor"
      ? "grid grid-cols-1 sm:grid-cols-3  gap-4"
      : "grid grid-cols-1 sm:grid-cols-2  gap-4";

  const filteredStaffJobTitles = useMemo(() => {
    if (!staff_department) {
      return allStaffJobTitles;
    }
    return allStaffJobTitles.filter((jobTitle) => {
      const departmentId =
        jobTitle.staff_department?.id ??
        jobTitle.staff_department_id ??
        jobTitle.staff_department ??
        "";
      return String(departmentId) === String(staff_department);
    });
  }, [allStaffJobTitles, staff_department]);

  const passwordColumnClassName = "sm:col-span-1";

  const canSendVerification = Boolean(email) && !isEmailVerified;
  const emailRequiresAccess = role !== "staff" || needsAccess;

  useEffect(() => {
    if (role !== "staff") return;
    if (accessTouched) return;
    setNeedsAccess(Boolean(email.trim()));
  }, [email, accessTouched, role]);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#e1f5ff] via-white to-[#d7f1ff] flex items-center justify-center px-4 sm:px-6 lg:px-12 py-6 sm:py-10">
      <div className="relative max-w-3xl lg:max-w-4xl w-full">
        <div className="absolute -top-20 -left-16 w-44 h-44 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-8 w-56 h-56 rounded-full bg-teal-200/40 blur-3xl" />

        <div className="relative bg-gradient-to-br from-blue-100 via-white to-teal-100 p-[1.5px] rounded-[28px] lg:rounded-[36px] shadow-2xl">
          <div className="relative bg-white/92 backdrop-blur-md rounded-[27px] lg:rounded-[35px] overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -right-32 h-56 w-56 rounded-full bg-teal-200/45 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-40 -translate-x-1/2 bg-blue-200/35 blur-3xl" />

            <div className="relative px-6 sm:px-10 lg:px-12 py-8 sm:py-10 flex flex-col justify-center gap-5 sm:gap-7">
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
                  className="w-11 h-11"
                />
                <span className="text-2xl font-semibold text-blue-700">
                  {loggedInDetails?.companies?.[0]?.company_name ||
                    loggedInDetails?.companies?.[0]?.company_name ||
                    ""}
                </span>
              </div>

              {companyError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {companyError}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <h2 className="text-2xl sm:text-2xl font-bold text-gray-900 leading-tight">
                  {role === "staff"
                    ? "Create Staff Account"
                    : hideDoctorRole
                      ? "Create Administration Account"
                      : hideAdministrationRole
                        ? "Create Doctor Account"
                        : "Create Doctor's and Administration Account"}
                </h2>
                <span className="inline-flex w-fit items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {role === "administration"
                    ? "Create Administration Account"
                    : role === "staff"
                      ? "Create Staff Account"
                      : "Create Doctor Account"}
                </span>
              </div>

              {/* <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm text-gray-600">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-3 py-2.5 shadow-sm">
                  <p className="text-blue-500 font-semibold">24/7 Support</p>
                  <p className="mt-1 text-gray-500">Care coordinators ready when you are.</p>
                </div>
                <div className="rounded-2xl border border-teal-100 bg-teal-50/70 px-3 py-2.5 shadow-sm">
                  <p className="text-teal-500 font-semibold">Secure Access</p>
                  <p className="mt-1 text-gray-500">HIPAA-ready workflows for every role.</p>
                </div>
              </div> */}

              {/* <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1  justify-center justify-items-center gap-2.5 sm:gap-3">
                  {roles.map((item) => {
                    const isActive = role === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setRole(item.id);
                          if (item.id !== "doctor") {
                            setDepartment("");
                            setDoctorType("");
                          }
                          if (item.id !== "admin") {
                            setAdministrationType("");
                          }
                        }}
                        className={`rounded-2xl cursor-pointer border px-4 py-3.5 text-left transition shadow-sm hover:shadow-lg focus:outline-none ${
                          isActive
                            ? "border-teal-500 bg-gradient-to-r from-teal-100 via-blue-100 to-teal-50 text-blue-900"
                            : "border-gray-200 bg-white/80 text-gray-600 hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{item.icon}</span>
                          <div>
                            <p className="text-sm font-semibold">
                              {item.label}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div> */}

              <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="name"
                    className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500"
                  >
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                      👤
                    </span>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      placeholder="Full name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      ref={fullNameInputRef}
                      aria-required="true"
                      className="w-full rounded-2xl border border-gray-200 pl-11 pr-4 py-2.5 sm:py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white/70"
                    />
                  </div>
                </div>

                <div
                  className={`grid grid-cols-1 gap-4 ${
                    role === "administration" || role === "staff"
                      ? "sm:grid-cols-3"
                      : "sm:grid-cols-2"
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="email"
                      className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500"
                    >
                      Email{" "}
                      {emailRequiresAccess ? (
                        <span className="text-red-500">*</span>
                      ) : (
                        <span className="text-gray-400">(optional)</span>
                      )}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                        ✉️
                      </span>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder={
                          role === "staff"
                            ? "Email address (optional)"
                            : "Email address"
                        }
                        value={email}
                        onChange={(event) => {
                          const value = event.target.value;
                          setEmail(value);
                          if (isEmailVerified) {
                            setIsEmailVerified(false);
                          }
                        }}
                        readOnly={isEmailVerified}
                        required={emailRequiresAccess}
                        className={`w-full rounded-2xl border border-gray-200 pl-11 pr-16 py-2.5 sm:py-3 text-sm text-gray-900 outline-none transition bg-white/70 ${
                          isEmailVerified
                            ? "cursor-not-allowed bg-gray-100 text-gray-600"
                            : "focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        }`}
                      />
                      {/* {isEmailVerified ? (
                        <span
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
                          aria-label="Email verified"
                          title="Email verified"
                        >
                          <MailCheck size={18} />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendVerification}
                          disabled={!canSendVerification}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-blue-500 text-white p-2 transition hover:bg-blue-600 disabled:bg-gray-300 disabled:text-white disabled:cursor-not-allowed"
                          aria-label="Send verification code"
                          title="Send verification code"
                        >
                          <Send size={16} />
                        </button>
                      )} */}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="phone"
                      className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500"
                    >
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                        📞
                      </span>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        placeholder="Phone number"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        required
                        className="w-full rounded-2xl border border-gray-200 pl-11 pr-4 py-2.5 sm:py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white/70"
                      />
                    </div>
                    <label className="mt-2 inline-flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-green-500"
                        checked={isWhatsAppSameAsPhone}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setIsWhatsAppSameAsPhone(checked);
                          if (checked) {
                            setWhatsappNumber(phone);
                          }
                        }}
                      />
                      Same as WhatsApp Number
                    </label>
                  </div>
                  {role === "staff" && (
                    <div className="flex flex-col gap-2">
                      <span className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500">
                        Need Access
                      </span>
                      <label className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/70 px-4 py-2.5 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-blue-500"
                          checked={needsAccess}
                          onChange={(event) => {
                            setNeedsAccess(event.target.checked);
                            setAccessTouched(true);
                          }}
                        />
                        Provide login access for this staff member
                      </label>
                    </div>
                  )}
                  {(role === "administration" || role === "staff") && (
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="whatsappAdministration"
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500"
                      >
                        WhatsApp Number
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500">
                          💬
                        </span>
                        <input
                          type="tel"
                          id="whatsappAdministration"
                          name="whatsappAdministration"
                          placeholder="Enter WhatsApp number"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          disabled={isWhatsAppSameAsPhone}
                          className={`w-full rounded-2xl border border-gray-200 pl-11 pr-4 py-2.5 sm:py-3 text-sm text-gray-900 outline-none transition ${
                            isWhatsAppSameAsPhone
                              ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                              : "focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white/70"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ✅ Only show if Doctor */}
                {role === "doctor" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:col-span-2">
                    {/* Association Type */}
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="associationType"
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500"
                      >
                        Association Type <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                          🤝
                        </span>
                        <select
                          id="associationType"
                          name="associationType"
                          value={associationType}
                          onChange={(e) => setAssociationType(e.target.value)}
                          required
                          className="w-full appearance-none rounded-2xl border border-gray-200 pl-11 pr-10 py-2.5 sm:py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white/70"
                        >
                          <option value="" disabled>
                            Select Association Type
                          </option>
                          <option value="Visiting Doctor">
                            Visiting Doctor
                          </option>
                          <option value="Regular Doctor">Regular Doctor</option>
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 text-xs">
                          ▼
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="medicalCouncilRegistration"
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500"
                      >
                        Medical Council Registration{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                          🪪
                        </span>
                        <input
                          type="text"
                          id="medicalCouncilRegistration"
                          name="medicalCouncilRegistration"
                          placeholder="Enter registration number"
                          value={medicalCouncilRegistration}
                          onChange={(e) =>
                            setMedicalCouncilRegistration(e.target.value)
                          }
                          required
                          className="w-full rounded-2xl border border-gray-200 pl-11 pr-4 py-2.5 sm:py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white/70"
                        />
                      </div>
                    </div>

                    {/* WhatsApp Number */}
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="whatsapp"
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500"
                      >
                        WhatsApp Number
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500">
                          💬
                        </span>
                        <input
                          type="tel"
                          id="whatsapp"
                          name="whatsapp"
                          placeholder="Enter WhatsApp number"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          disabled={isWhatsAppSameAsPhone}
                          className={`w-full rounded-2xl border border-gray-200 pl-11 pr-4 py-2.5 sm:py-3 text-sm text-gray-900 outline-none transition ${
                            isWhatsAppSameAsPhone
                              ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                              : "focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white/70"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}
                {/* ✅ Available Days (checkbox multiple select) */}
                {role === "doctor" && (
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <label className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Available Days & Time Slots{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <div className="flex flex-col gap-3 bg-white/70 border border-gray-200 rounded-2xl p-3">
                      {daysOfWeek.map((day) => (
                        <div
                          key={day}
                          className={`flex items-center justify-between flex-wrap gap-2 border border-gray-200 rounded-xl px-3 py-2 transition ${
                            availableDays.includes(day)
                              ? "bg-blue-50 border-blue-400"
                              : "bg-white hover:border-blue-200"
                          }`}
                        >
                          {/* ✅ Day Checkbox + Label */}
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              value={day}
                              checked={availableDays.includes(day)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAvailableDays([...availableDays, day]);
                                } else {
                                  setAvailableDays(
                                    availableDays.filter((d) => d !== day),
                                  );
                                  setDayTimeSlots((prev) => {
                                    const copy = { ...prev };
                                    delete copy[day];
                                    return copy;
                                  });
                                }
                              }}
                              className="accent-blue-500 h-4 w-4"
                            />
                            <span className="font-medium text-gray-700">
                              {day}
                            </span>
                          </label>

                          {/* ✅ Inline Time Slot Select (only visible when checked) */}
                          {availableDays.includes(day) && (
                            <div className="flex flex-col gap-2 w-full sm:w-96">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                {timeSlots.map((slot) => {
                                  const slotId = Number(slot.id);
                                  const isChecked = Array.isArray(
                                    dayTimeSlots[day],
                                  )
                                    ? dayTimeSlots[day].includes(slotId)
                                    : false;
                                  return (
                                    <label
                                      key={`${day}-${slot.id}`}
                                      className={`flex items-center gap-2 text-xs sm:text-sm rounded-lg border px-3 py-1.5 cursor-pointer ${
                                        isChecked
                                          ? "border-blue-400 bg-blue-50 text-blue-700"
                                          : "border-gray-200 hover:border-blue-200"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="accent-blue-500 h-4 w-4"
                                        checked={isChecked}
                                        onChange={(e) =>
                                          toggleDaySlot(
                                            day,
                                            slotId,
                                            e.target.checked,
                                          )
                                        }
                                      />
                                      <span>
                                        {slot.display_time ||
                                          `${slot.start_time} - ${slot.end_time}`}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                              {getDaySlotLabels(day).length > 0 && (
                                <p className="text-[12px] text-gray-700">
                                  Selected: {getDaySlotLabels(day).join(", ")}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={detailGridClassName}>
                  {role === "doctor" && (
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="department"
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500"
                      >
                        Department <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                          🏥
                        </span>
                        <select
                          id="department"
                          name="department"
                          value={department}
                          onChange={(event) =>
                            setDepartment(event.target.value)
                          }
                          required
                          className="w-full appearance-none rounded-2xl border border-gray-200 pl-11 pr-10 py-2.5 sm:py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white/70"
                        >
                          <option value="" disabled>
                            Select department
                          </option>
                          {allDepartment.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.name}
                            </option>
                          ))}
                          {/* <option value="Cardiology">Cardiology</option>
                          <option value="Neurology">Neurology</option>
                          <option value="Orthopedics">Orthopedics</option>
                          <option value="Pediatrics">Pediatrics</option>
                          <option value="Dermatology">Dermatology</option>
                          <option value="Gynecology">Gynecology</option>
                          <option value="Oncology">Oncology</option>
                          <option value="Radiology">Radiology</option>
                          <option value="Urology">Urology</option>
                          <option value="ENT">ENT</option> */}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 text-xs">
                          ▼
                        </span>
                      </div>
                    </div>
                  )}
                  {role === "doctor" && (
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="doctorType"
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500"
                      >
                        Doctor Type <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                          🩺
                        </span>
                        <select
                          id="doctorType"
                          name="doctorType"
                          value={doctor_type}
                          onChange={(event) =>
                            setDoctorType(event.target.value)
                          }
                          required
                          className="w-full appearance-none rounded-2xl border border-gray-200 pl-11 pr-10 py-2.5 sm:py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white/70"
                        >
                          <option value="" disabled>
                            Select Doctor Type
                          </option>
                          {allDoctorType.map((doctor_type) => (
                            <option key={doctor_type.id} value={doctor_type.id}>
                              {doctor_type.name}
                            </option>
                          ))}
                          {/* <option value="Physician">Physician</option>
                          <option value="Surgeon">Surgeon</option>
                          <option value="Consultant">Consultant</option>
                          <option value="Resident Doctor">
                            Resident Doctor
                          </option>
                          <option value="General Practitioner">
                            General Practitioner
                          </option>
                          <option value="Dentist">Dentist</option>
                          <option value="Anesthesiologist">
                            Anesthesiologist
                          </option>
                          <option value="Radiologist">Radiologist</option>
                          <option value="Pathologist">Pathologist</option>
                          <option value="Psychiatrist">Psychiatrist</option> */}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 text-xs">
                          ▼
                        </span>
                      </div>
                    </div>
                  )}
                  {role === "administration" && (
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="administrationType"
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500"
                      >
                        Adm. Departments
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                          🛡️
                        </span>
                        <select
                          id="administrationType"
                          name="administrationType"
                          value={administration_type}
                          onChange={(event) =>
                            setAdministrationType(event.target.value)
                          }
                          className="w-full appearance-none rounded-2xl border border-gray-200 pl-11 pr-10 py-2.5 sm:py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white/70"
                        >
                          <option value="" disabled>
                            Select Administration Dept
                          </option>
                          {allAdministratorType.map((administrator_type) => (
                            <option
                              key={administrator_type.id}
                              value={administrator_type.id}
                            >
                              {administrator_type.name}
                            </option>
                          ))}
                          {/* <option value="Hospital Administrator">
                            Hospital Administrator
                          </option>
                          <option value="Operations Manager">
                            Operations Manager
                          </option>
                          <option value="HR Coordinator">HR Coordinator</option>
                          <option value="Finance Officer">
                            Finance Officer
                          </option>
                          <option value="Compliance Lead">
                            Compliance Lead
                          </option>
                          <option value="IT Systems Manager">
                            IT Systems Manager
                          </option> */}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 text-xs">
                          ▼
                        </span>
                      </div>
                    </div>
                  )}
                  {role === "staff" && (
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="staffDepartment"
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500"
                      >
                        Staff Department
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                          🧑‍⚕️
                        </span>
                        <select
                          id="staffDepartment"
                          name="staffDepartment"
                          value={staff_department}
                          onChange={(event) => {
                            const nextDepartment = event.target.value;
                            setStaffDepartment(nextDepartment);
                            setStaffJobTitle("");
                          }}
                          className="w-full appearance-none rounded-2xl border border-gray-200 pl-11 pr-10 py-2.5 sm:py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white/70"
                        >
                          <option value="" disabled>
                            Select Staff Department
                          </option>
                          {allStaffDepartments.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.name}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 text-xs">
                          ▼
                        </span>
                      </div>
                    </div>
                  )}
                  {role === "administration" && (
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="jobTitle"
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500"
                      >
                        Job Title
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                          💼
                        </span>
                        <select
                          id="jobTitle"
                          name="jobTitle"
                          value={job_title}
                          onChange={(event) => setJobTitle(event.target.value)}
                          required
                          className="w-full appearance-none rounded-2xl border border-gray-200 pl-11 pr-10 py-2.5 sm:py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white/70"
                        >
                          <option value="" disabled>
                            Select Job Title
                          </option>
                          {jobTitleOptions.map((jobTitle) => (
                            <option key={jobTitle.value} value={jobTitle.value}>
                              {jobTitle.label}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 text-xs">
                          ▼
                        </span>
                      </div>
                    </div>
                  )}
                  {role === "staff" && (
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="staffJobTitle"
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500"
                      >
                        Staff Job Title
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                          💼
                        </span>
                        <select
                          id="staffJobTitle"
                          name="staffJobTitle"
                          value={staff_job_title}
                          onChange={(event) =>
                            setStaffJobTitle(event.target.value)
                          }
                          required
                          disabled={!staff_department}
                          className="w-full appearance-none rounded-2xl border border-gray-200 pl-11 pr-10 py-2.5 sm:py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white/70"
                        >
                          <option value="" disabled>
                            {staff_department
                              ? "Select Staff Job Title"
                              : "Select Staff Department first"}
                          </option>
                          {filteredStaffJobTitles.map((jobTitle) => (
                            <option key={jobTitle.id} value={jobTitle.id}>
                              {jobTitle.name}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 text-xs">
                          ▼
                        </span>
                      </div>
                    </div>
                  )}

                  {/* <div
                    className={`flex flex-col gap-2 ${passwordColumnClassName}`}
                  >
                    <label
                      htmlFor="password"
                      className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                        🔒
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        placeholder="Create a password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full rounded-2xl border border-gray-200 pl-11 pr-14 py-2.5 sm:py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white/70"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div> */}
                </div>

                {/* <div className="flex items-start gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    id="terms"
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="terms">
                    I agree to the{" "}
                    <Link
                      href="#"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Terms & Conditions
                    </Link>
                  </label>
                </div> */}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-teal-500 via-blue-500 to-teal-400 hover:from-teal-600 hover:via-blue-600 hover:to-teal-500 text-white font-semibold py-2.5 sm:py-3 rounded-full transition shadow-lg hover:shadow-xl"
                >
                  {isSubmitting ? "Submitting..." : "Create Account"}
                </button>
                <p className="text-xs sm:text-sm text-gray-500 text-center">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-blue-600 font-semibold hover:text-blue-700"
                  >
                    Login
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="space-y-5">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Verify Your Email
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Enter the 6-digit code we sent to{" "}
                  <span className="font-medium text-gray-900">
                    {email || "your email"}
                  </span>
                  .
                </p>
              </div>
              <form className="space-y-4" onSubmit={handleVerifyOtp}>
                <div className="flex justify-center gap-2">
                  {otpInput.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) =>
                        handleOtpChange(index, event.target.value)
                      }
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      onPaste={index === 0 ? handleOtpPaste : undefined}
                      className="h-12 w-12 rounded-2xl border border-gray-200 bg-white text-center text-xl font-semibold text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    />
                  ))}
                </div>
                {otpError && (
                  <p className="mt-2 text-sm text-red-500 text-center">
                    {otpError}
                  </p>
                )}
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleCloseOtpModal}
                    className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
                    disabled={otpInput.join("").length !== OTP_LENGTH}
                  >
                    Verify
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <ErrorDialog
        open={isErrorDialogOpen}
        onClose={closeErrorDialog}
        message={errorMessage}
      />
      {/* Success Dialog */}
      <SuccessDialog
        open={isSuccessDialogOpen}
        onClose={closeSuccessDialog}
        message={successMessage}
      />
    </div>
  );
}
