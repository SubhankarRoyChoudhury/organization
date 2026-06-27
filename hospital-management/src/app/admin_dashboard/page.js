"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, CheckSquare, X } from "lucide-react";
import {
  Users,
  Stethoscope,
  Calendar,
  Home,
  Activity,
  TrendingUp,
  Building2,
  ShieldCheck,
  IndianRupee,
} from "lucide-react";
import {
  get_Hospital_User_Login_Details,
  getCompanyUserDetailsByUsername,
  getAllAdministratorType,
  getAllAdministrations,
  getAllDepartment,
  getAllDoctorType,
  getAllDoctors,
  getOpdTicketBookings,
  getPatients,
  getAllDoctorSchedules,
  getIpdBookings,
  approveDoctor,
  approveAdministration,
  approveStaff,
  getEmergencyVisits,
  getAllStaff,
  updateDoctorSchedule,
  getAppAccessMatrix,
  updateAppAccessControl,
} from "@/app/api/apiService";

const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "/hospital-management";
const normalize = (value) => String(value || "").trim().toLowerCase();
const getHospitalPermission = (permissions) =>
  permissions.find((item) => normalize(item?.name) === "hospital management");
const resolveHospitalAccess = (data) => {
  const directPermissions = Array.isArray(data?.app_permissions)
    ? data.app_permissions
    : [];
  if (directPermissions.length > 0) {
    const hospitalPermission = getHospitalPermission(directPermissions);
    return hospitalPermission ? hospitalPermission.can_access !== false : true;
  }
  if (typeof window === "undefined") {
    return true;
  }
  try {
    const raw = localStorage.getItem("app_permissions");
    const parsed = raw ? JSON.parse(raw) : [];
    const permissions = Array.isArray(parsed) ? parsed : [];
    const hospitalPermission = getHospitalPermission(permissions);
    return hospitalPermission ? hospitalPermission.can_access !== false : true;
  } catch {
    return true;
  }
};

export default function AdminDashboardPage() {
  const [monthDays, setMonthDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState("");
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const sliderRef = useRef(null);
  const [companyId, setCompanyId] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [appointmentsData, setAppointmentsData] = useState([]);
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(null);
  const [patientsData, setPatientsData] = useState([]);
  const [isPatientsLoading, setIsPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState(null);
  const [ipdBookings, setIpdBookings] = useState([]);
  const [isIpdLoading, setIsIpdLoading] = useState(false);
  const [ipdError, setIpdError] = useState(null);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [pendingDepartments, setPendingDepartments] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [pendingDoctorTypes, setPendingDoctorTypes] = useState([]);
  const [pendingAdministrations, setPendingAdministrations] = useState([]);
  const [pendingAdministrationTypes, setPendingAdministrationTypes] = useState(
    [],
  );
  const [allAdministrationTypes, setAllAdministrationTypes] = useState([]);
  const [pendingStaff, setPendingStaff] = useState([]);
  const [allStaffDepartments, setAllStaffDepartments] = useState([]);
  const [pendingError, setPendingError] = useState(null);
  const [expandedPendingKey, setExpandedPendingKey] = useState(null);
  const [doctorSchedules, setDoctorSchedules] = useState([]);
  const [isSchedulesLoading, setIsSchedulesLoading] = useState(false);
  const [schedulesError, setSchedulesError] = useState(null);
  const [emergencyVisits, setEmergencyVisits] = useState([]);
  const [isEmergencyLoading, setIsEmergencyLoading] = useState(false);
  const [emergencyError, setEmergencyError] = useState(null);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [permissionTarget, setPermissionTarget] = useState(null);
  const [permissionTargetType, setPermissionTargetType] = useState("");
  const [permissionTargetId, setPermissionTargetId] = useState("");
  const [permissionApps, setPermissionApps] = useState([]);
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState(null);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [isStaffApprovalModalOpen, setIsStaffApprovalModalOpen] =
    useState(false);
  const [staffApprovalTarget, setStaffApprovalTarget] = useState(null);
  const [staffApprovalError, setStaffApprovalError] = useState(null);
  const [isApprovingStaffDirectly, setIsApprovingStaffDirectly] =
    useState(false);
  const [hasHospitalManagementAccess, setHasHospitalManagementAccess] =
    useState(true);

  // 🧩 Generate all days for a given month
  const generateMonthDays = (year, month) => {
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: totalDays }, (_, i) => {
      const date = new Date(year, month, i + 1);
      return {
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        date: date.getDate(),
        fullDate: date.toLocaleDateString("en-CA"), // YYYY-MM-DD (local-safe)
      };
    });
    setMonthDays(days);
    setCurrentMonth(
      new Date(year, month).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    );
  };

  // 🧠 Initial load
  useEffect(() => {
    generateMonthDays(year, monthIndex);
    const today = new Date();
    setSelectedDate(today.toLocaleDateString("en-CA"));
    setTimeout(() => {
      if (sliderRef.current) {
        sliderRef.current.scrollTo({
          left: today.getDate() * 60 - 150,
          behavior: "smooth",
        });
      }
    }, 200);
  }, []);

  useEffect(() => {
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (!username) {
      setAppointmentsError(
        "Missing login context. Please sign in again to view appointments.",
      );
      return;
    }
    get_Hospital_User_Login_Details(username)
      .then((data) => {
        setHasHospitalManagementAccess(resolveHospitalAccess(data));
        const resolvedCompanyId =
          data?.company_id || data?.companies?.[0]?.company_id || localStorage.getItem("company_id");
        if (resolvedCompanyId) {
          setCompanyId(resolvedCompanyId);
        } else {
          setAppointmentsError(
            "Unable to determine company context. Please contact support.",
          );
        }
        const roleValue =
          data?.user?.role || data?.role || localStorage.getItem("role") || "";
        setUserRole(String(roleValue).toLowerCase());
      })
      .catch((error) => {
        console.error("Error fetching user details:", error);
        setAppointmentsError("Failed to load user details.");
      });
  }, []);

  useEffect(() => {
    if (!companyId) return;
    setIsAppointmentsLoading(true);
    setAppointmentsError(null);
    getOpdTicketBookings(companyId)
      .then((data) => {
        const payload =
          data?.results ||
          data?.data?.results ||
          data?.data ||
          data?.items ||
          data;
        setAppointmentsData(Array.isArray(payload) ? payload : []);
      })
      .catch((error) => {
        console.error("Error fetching OPD ticket bookings:", error);
        setAppointmentsError(
          "Unable to load appointments right now. Please try again.",
        );
      })
      .finally(() => {
        setIsAppointmentsLoading(false);
      });
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    setIsPatientsLoading(true);
    setPatientsError(null);
    getPatients(companyId)
      .then((data) => {
        const payload =
          data?.results ||
          data?.data?.results ||
          data?.data ||
          data?.items ||
          data;
        setPatientsData(Array.isArray(payload) ? payload : []);
      })
      .catch((error) => {
        console.error("Error fetching patients:", error);
        setPatientsError(
          "Unable to load patients right now. Please try again.",
        );
      })
      .finally(() => {
        setIsPatientsLoading(false);
      });
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    setIsIpdLoading(true);
    setIpdError(null);
    getIpdBookings(companyId)
      .then((data) => {
        const payload =
          data?.results ||
          data?.data?.results ||
          data?.data ||
          data?.items ||
          data;
        setIpdBookings(Array.isArray(payload) ? payload : []);
      })
      .catch((error) => {
        console.error("Error fetching IPD bookings:", error);
        setIpdError("Unable to load IPD bookings right now.");
      })
      .finally(() => {
        setIsIpdLoading(false);
      });
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    setPendingError(null);
    Promise.all([
      getAllDoctors(companyId),
      getAllDepartment(companyId),
      getAllDoctorType(companyId),
      getAllAdministrations(companyId, "administration"),
      getAllAdministratorType(companyId),
      getAllStaff(companyId, "staff"),
    ])
      .then(
        ([
          doctorsPayload,
          departmentsPayload,
          doctorTypesPayload,
          administrationsPayload,
          administrationTypesPayload,
          staffPayload,
        ]) => {
          const doctors = Array.isArray(doctorsPayload) ? doctorsPayload : [];
          const departments = Array.isArray(departmentsPayload)
            ? departmentsPayload
            : [];
          const doctorTypes = Array.isArray(doctorTypesPayload)
            ? doctorTypesPayload
            : [];
          const administrations = Array.isArray(administrationsPayload)
            ? administrationsPayload
            : [];
          const administrationTypes = Array.isArray(administrationTypesPayload)
            ? administrationTypesPayload
            : [];
          const staffList = Array.isArray(staffPayload) ? staffPayload : [];
          setPendingDoctors(
            doctors.filter((doctor) => doctor?.is_approve === false),
          );
          setAllDepartments(departments);
          setAllStaffDepartments(departments);
          setPendingDepartments(
            departments.filter((dept) => dept?.is_approve === false),
          );
          setPendingDoctorTypes(
            doctorTypes.filter((type) => type?.is_approve === false),
          );
          setPendingAdministrations(
            administrations.filter((admin) => admin?.is_approve === false),
          );
          setAllAdministrationTypes(administrationTypes);
          setPendingAdministrationTypes(
            administrationTypes.filter((type) => type?.is_approve === false),
          );
          setPendingStaff(
            staffList.filter((staff) => staff?.is_approve === false),
          );
        },
      )
      .catch((error) => {
        console.error("Error fetching pending approvals:", error);
        setPendingError("Unable to load pending approvals right now.");
      });
  }, [companyId]);

  const normalizeDateInput = (value) => {
    if (!value) return "";
    return String(value)
      .replace(/\u00a0/g, " ")
      .replace(/\./g, " ")
      .replace(/,/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const toDateKey = (value) => {
    const rawValue = normalizeDateInput(value);
    if (!rawValue) return "";
    const isoMatch = rawValue.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const month = String(isoMatch[2]).padStart(2, "0");
      const day = String(isoMatch[3]).padStart(2, "0");
      return `${isoMatch[1]}-${month}-${day}`;
    }
    const numericMatch = rawValue.match(
      /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s|$)/,
    );
    if (numericMatch) {
      const first = Number(numericMatch[1]);
      const second = Number(numericMatch[2]);
      const yearValue = Number(numericMatch[3]);
      const tryDayMonth = new Date(yearValue, second - 1, first);
      if (!Number.isNaN(tryDayMonth.getTime()) && first > 12) {
        return tryDayMonth.toLocaleDateString("en-CA");
      }
      const tryMonthDay = new Date(yearValue, first - 1, second);
      if (!Number.isNaN(tryMonthDay.getTime())) {
        return tryMonthDay.toLocaleDateString("en-CA");
      }
    }
    const match = rawValue.match(
      /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(\d{4})/,
    );
    if (match) {
      const monthKey = match[1].slice(0, 3).toLowerCase();
      const monthMap = {
        jan: 0,
        feb: 1,
        mar: 2,
        apr: 3,
        may: 4,
        jun: 5,
        jul: 6,
        aug: 7,
        sep: 8,
        oct: 9,
        nov: 10,
        dec: 11,
      };
      if (monthMap[monthKey] !== undefined) {
        const manualDate = new Date(
          Number(match[3]),
          monthMap[monthKey],
          Number(match[2]),
        );
        if (!Number.isNaN(manualDate.getTime())) {
          return manualDate.toLocaleDateString("en-CA");
        }
      }
    }
    const parsed = new Date(rawValue);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-CA");
    }
    return "";
  };

  const getDayNameFromDateKey = (dateKey) => {
    if (!dateKey) return "";
    const parsed = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString("en-US", { weekday: "long" });
  };

  const getAppointmentVisitDateRaw = (entry) =>
    entry?.visitDate ||
    entry?.visit_date ||
    entry?.visitdate ||
    entry?.visit_date_display ||
    entry?.visitDateDisplay ||
    "";

  const getIpdAdmissionDateRaw = (entry) =>
    entry?.admission_date ||
    entry?.admissionDate ||
    entry?.admission_date_display ||
    entry?.admissionDateDisplay ||
    entry?.created_on ||
    "";

  const getPatientCreatedDateRaw = (entry) =>
    entry?.created_on ||
    entry?.createdOn ||
    entry?.created_on_display ||
    entry?.createdOnDisplay ||
    "";

  const getScheduleLabel = (scheduleDisplay) => {
    if (!scheduleDisplay) return "-";
    if (typeof scheduleDisplay === "string") return scheduleDisplay;
    if (Array.isArray(scheduleDisplay)) {
      return scheduleDisplay.filter(Boolean).join(", ") || "-";
    }
    if (typeof scheduleDisplay === "object") {
      return (
        Object.entries(scheduleDisplay)
          .map(([day, slot]) => (day ? `${day}: ${slot}` : slot))
          .join(", ") || "-"
      );
    }
    return "-";
  };

  const getReadableScheduleLabel = (readableSchedule) => {
    if (!readableSchedule) return "No schedule";
    if (typeof readableSchedule === "string") return readableSchedule;
    if (Array.isArray(readableSchedule)) {
      return readableSchedule.filter(Boolean).join(", ") || "No schedule";
    }
    if (typeof readableSchedule === "object") {
      const entries = Object.entries(readableSchedule)
        .map(([day, slot]) => {
          if (Array.isArray(slot)) {
            return `${day}: ${slot.join(", ")}`;
          }
          return day ? `${day}: ${slot}` : slot;
        })
        .filter(Boolean);
      return entries.join(" | ") || "No schedule";
    }
    return "No schedule";
  };

  const permissionActions = ["access", "add", "edit", "delete", "print"];
  const actionFieldMap = {
    access: "can_access",
    add: "can_add",
    edit: "can_edit",
    delete: "can_delete",
    print: "can_print",
  };

  const normalizePermissionApps = (list) =>
    (Array.isArray(list) ? list : []).map((app) => ({
      ...app,
      can_access: Boolean(app?.can_access),
      can_add: Boolean(app?.can_add),
      can_edit: Boolean(app?.can_edit),
      can_delete: Boolean(app?.can_delete),
      can_print: Boolean(app?.can_print),
    }));

  const getDoctorId = (doctor) => doctor?.id ?? doctor?.doctor_id ?? null;

  const getUserHandle = (target) =>
    target?.username ||
    target?.email ||
    target?.admin_user_name ||
    target?.user_name ||
    "";

  const getAdministrationId = (admin) =>
    admin?.id ?? admin?.administration_id ?? null;

  const getStaffId = (staff) =>
    staff?.id ??
    staff?.staff_id ??
    staff?.company_user_id ??
    staff?.user_id ??
    null;

  const hasStaffEmailOrUsername = (staff) =>
    Boolean(
      String(staff?.email || "").trim() ||
      String(staff?.username || staff?.user_name || "").trim(),
    );

  const getTargetLabel = (target, fallback) =>
    target?.full_name ||
    target?.name ||
    target?.admin_user_name ||
    target?.username ||
    target?.email ||
    fallback;

  const resolvePermissionTargetId = async (type, target) => {
    if (!target) return null;
    const directId =
      target?.company_user_id ??
      target?.user_id ??
      target?.company_user?.id ??
      null;
    if (directId) return directId;
    const handle = getUserHandle(target);
    if (!handle) return null;
    try {
      const details = await getCompanyUserDetailsByUsername(handle);
      if (!Array.isArray(details) || details.length === 0) {
        return null;
      }
      const roleKey = String(type || "").toLowerCase();
      const roleMatches =
        roleKey &&
        details.filter(
          (entry) => String(entry?.role || "").toLowerCase() === roleKey,
        );
      const candidates =
        roleMatches && roleMatches.length > 0 ? roleMatches : details;
      if (companyId) {
        const sameCompany = candidates.find(
          (entry) => String(entry?.company_id) === String(companyId),
        );
        if (sameCompany?.id) return sameCompany.id;
      }
      return candidates[0]?.id || null;
    } catch (error) {
      console.error("Failed to resolve permission target:", error);
      return null;
    }
  };

  const handleOpenPermissionModal = (type, target) => {
    if (!target) return;
    setPermissionTargetType(type);
    setPermissionTarget(target);
    setPermissionTargetId("");
    setPermissionApps([]);
    setPermissionsError(null);
    setIsPermissionModalOpen(true);
  };

  const handleClosePermissionModal = () => {
    if (isSavingPermissions || isPermissionsLoading) return;
    setIsPermissionModalOpen(false);
    setPermissionTarget(null);
    setPermissionTargetType("");
    setPermissionTargetId("");
    setPermissionApps([]);
    setPermissionsError(null);
    setIsPermissionsLoading(false);
    setIsSavingPermissions(false);
  };

  const resetStaffApprovalModal = () => {
    setIsStaffApprovalModalOpen(false);
    setStaffApprovalTarget(null);
    setStaffApprovalError(null);
  };

  const handleCloseStaffApprovalModal = () => {
    if (isApprovingStaffDirectly) return;
    resetStaffApprovalModal();
  };

  const approveDoctorTarget = async (doctor) => {
    if (!doctor || !companyId) {
      throw new Error("Missing doctor context.");
    }
    const doctorId = getDoctorId(doctor);
    if (!doctorId) {
      throw new Error("Unable to identify this doctor.");
    }
    await approveDoctor(doctorId, companyId);
    try {
      const schedules = await getAllDoctorSchedules(companyId, doctorId);
      await Promise.all(
        (schedules || [])
          .filter((schedule) => schedule?.id)
          .map((schedule) =>
            updateDoctorSchedule(schedule.id, companyId, {
              is_available: true,
              delist: false,
            }).catch(() => null),
          ),
      );
    } catch (scheduleError) {
      console.error(
        "Failed to update doctor schedule availability:",
        scheduleError,
      );
    }
    setPendingDoctors((prev) =>
      prev.filter((entry) => getDoctorId(entry) !== doctorId),
    );
  };

  const approveAdministrationTarget = async (admin) => {
    if (!admin || !companyId) {
      throw new Error("Missing administration context.");
    }
    const adminId = getAdministrationId(admin);
    if (!adminId) {
      throw new Error("Unable to identify this administration.");
    }
    await approveAdministration(adminId, companyId);
    setPendingAdministrations((prev) =>
      prev.filter((entry) => getAdministrationId(entry) !== adminId),
    );
  };

  const approveStaffTarget = async (staff) => {
    if (!staff || !companyId) {
      throw new Error("Missing staff context.");
    }
    const staffId = getStaffId(staff);
    if (!staffId) {
      throw new Error("Unable to identify this staff member.");
    }
    await approveStaff(staffId, companyId);
    setPendingStaff((prev) =>
      prev.filter((entry) => getStaffId(entry) !== staffId),
    );
  };

  const handleStaffPendingClick = (staff) => {
    if (!staff) return;
    if (!hasStaffEmailOrUsername(staff)) {
      setStaffApprovalTarget(staff);
      setStaffApprovalError(null);
      setIsStaffApprovalModalOpen(true);
      return;
    }
    handleOpenPermissionModal("staff", staff);
  };

  const handleApproveStaffDirectly = async () => {
    if (!staffApprovalTarget) {
      setStaffApprovalError("Select a staff member to approve.");
      return;
    }
    setIsApprovingStaffDirectly(true);
    setStaffApprovalError(null);
    try {
      await approveStaffTarget(staffApprovalTarget);
      resetStaffApprovalModal();
    } catch (error) {
      console.error("Failed to approve staff directly:", error);
      setStaffApprovalError("Unable to approve this staff member right now.");
    } finally {
      setIsApprovingStaffDirectly(false);
    }
  };

  const handleTogglePermission = (appId, action) => {
    const field = actionFieldMap[action];
    setPermissionApps((prev) =>
      prev.map((app) =>
        String(app?.app_id) === String(appId)
          ? { ...app, [field]: !app?.[field] }
          : app,
      ),
    );
  };

  const setRowPermissions = (appId, value) => {
    setPermissionApps((prev) =>
      prev.map((app) =>
        String(app?.app_id) === String(appId)
          ? {
              ...app,
              can_access: value,
              can_add: value,
              can_edit: value,
              can_delete: false,
              can_print: value,
            }
          : app,
      ),
    );
  };

  const setAllPermissions = (value) => {
    setPermissionApps((prev) =>
      prev.map((app) => ({
        ...app,
        can_access: value,
        can_add: value,
        can_edit: value,
        can_delete: false,
        can_print: value,
      })),
    );
  };

  const allSelected =
    permissionApps.length > 0 &&
    permissionApps.every(
      (app) =>
        Boolean(app?.can_access) &&
        Boolean(app?.can_add) &&
        Boolean(app?.can_edit) &&
        Boolean(app?.can_print) &&
        !app?.can_delete,
    );

  const rowSelected = (app) =>
    Boolean(app?.can_access) &&
    Boolean(app?.can_add) &&
    Boolean(app?.can_edit) &&
    Boolean(app?.can_print) &&
    !app?.can_delete;

  useEffect(() => {
    let isActive = true;
    const loadPermissions = async () => {
      if (!isPermissionModalOpen || !permissionTarget) {
        return;
      }
      setIsPermissionsLoading(true);
      setPermissionsError(null);
      try {
        const resolvedId = await resolvePermissionTargetId(
          permissionTargetType,
          permissionTarget,
        );
        if (!isActive) return;
        if (!resolvedId) {
          setPermissionTargetId("");
          setPermissionApps([]);
          setPermissionsError(
            "Unable to resolve this user for permissions. Please verify the account email/username.",
          );
          return;
        }
        setPermissionTargetId(String(resolvedId));
        const apps = await getAppAccessMatrix("user", resolvedId);
        if (!isActive) return;
        setPermissionApps(normalizePermissionApps(apps));
      } catch (error) {
        if (!isActive) return;
        console.error("Error loading permission matrix:", error);
        setPermissionsError("Unable to load permissions right now.");
      } finally {
        if (isActive) {
          setIsPermissionsLoading(false);
        }
      }
    };
    loadPermissions();
    return () => {
      isActive = false;
    };
  }, [
    isPermissionModalOpen,
    permissionTarget,
    permissionTargetType,
    companyId,
  ]);

  const handleSavePermissionsAndApprove = async () => {
    if (!permissionTarget || !permissionTargetId) {
      setPermissionsError("Select a user to assign permissions.");
      return;
    }
    setIsSavingPermissions(true);
    setPermissionsError(null);
    try {
      await updateAppAccessControl({
        access_for: "user",
        id: permissionTargetId,
        permissions: permissionApps.map((app) => ({
          application_id: app?.app_id,
          can_access: Boolean(app?.can_access),
          can_add: Boolean(app?.can_add),
          can_edit: Boolean(app?.can_edit),
          can_delete: Boolean(app?.can_delete),
          can_print: Boolean(app?.can_print),
        })),
      });

      if (permissionTargetType === "doctor") {
        await approveDoctorTarget(permissionTarget);
      } else if (permissionTargetType === "administration") {
        await approveAdministrationTarget(permissionTarget);
      } else if (permissionTargetType === "staff") {
        await approveStaffTarget(permissionTarget);
      }

      handleClosePermissionModal();
    } catch (error) {
      console.error("Failed to save permissions or approve user:", error);
      setPermissionsError("Unable to save permissions or approve this user.");
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const selectedDateKey = toDateKey(selectedDate);
  const normalizeDateLabel = (value) => normalizeDateInput(value).toLowerCase();
  const selectedDateLabel = selectedDateKey
    ? new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const formatSelectedDateWithDots = (dateKey) => {
    if (!dateKey) return "";
    const parts = dateKey.split("-");
    if (parts.length !== 3) return "";
    const monthIndex = Number(parts[1]) - 1;
    const dayValue = Number(parts[2]);
    const yearValue = parts[0];
    const monthNames = [
      "Jan.",
      "Feb.",
      "Mar.",
      "Apr.",
      "May",
      "Jun.",
      "Jul.",
      "Aug.",
      "Sep.",
      "Oct.",
      "Nov.",
      "Dec.",
    ];
    if (!Number.isFinite(monthIndex) || !monthNames[monthIndex]) return "";
    if (!Number.isFinite(dayValue)) return "";
    return `${monthNames[monthIndex]} ${dayValue}, ${yearValue}`;
  };
  const selectedDateLabelKey = normalizeDateLabel(selectedDateLabel);
  const selectedDateRawKey = normalizeDateLabel(selectedDate);
  const selectedDateWithDotsKey = normalizeDateLabel(
    formatSelectedDateWithDots(selectedDateKey),
  );
  const formatScheduleDate = (dateKey) => {
    if (!dateKey) return "";
    const parsed = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(",", "");
  };
  const shiftSelectedDate = (days) => {
    const baseKey = selectedDateKey || new Date().toLocaleDateString("en-CA");
    const baseDate = new Date(`${baseKey}T00:00:00`);
    if (Number.isNaN(baseDate.getTime())) return;
    baseDate.setDate(baseDate.getDate() + days);
    setSelectedDate(baseDate.toLocaleDateString("en-CA"));
  };
  const selectedDayName =
    getDayNameFromDateKey(selectedDateKey) ||
    new Date().toLocaleDateString("en-US", { weekday: "long" });
  const selectedDayNameLower = selectedDayName.toLowerCase();
  const normalizeScheduleValues = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (value === undefined || value === null || value === "") return [];
    return [value];
  };
  const formatDoctorSlotLabel = (dayLabel, slotLabel) => {
    const normalizedDay = String(dayLabel || selectedDayName || "Day").trim();
    const normalizedSlot = String(slotLabel || "").trim();
    if (!normalizedSlot) return `${normalizedDay}: —`;
    const hasDayPrefix =
      /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*:/i.test(
        normalizedSlot,
      );
    if (hasDayPrefix) return normalizedSlot;
    return `${normalizedDay}: ${normalizedSlot}`;
  };
  const groupedDoctorSchedules = Object.values(
    doctorSchedules
      .filter((schedule) => {
        const absentDates = Array.isArray(schedule?.absent_dates)
          ? schedule.absent_dates
          : [];
        if (selectedDateKey && absentDates.includes(selectedDateKey)) {
          return false;
        }
        const readable = schedule?.readable_slots || schedule?.readable_schedule;
        if (!readable) return false;
        if (typeof readable === "object" && !Array.isArray(readable)) {
          return Object.keys(readable).some(
            (day) => String(day).toLowerCase() === selectedDayNameLower,
          );
        }
        return true;
      })
      .reduce((acc, schedule) => {
        const doctorKey = schedule?.doctor || schedule?.doctor_id;
        const key = doctorKey ?? schedule?.doctor_name ?? `unknown-${schedule.id}`;
        if (!acc[key]) {
          acc[key] = {
            doctorName: schedule?.doctor_name || "Unknown Doctor",
            doctorType: schedule?.doctor_type_name || "",
            doctorDepartment:
              schedule?.doctor_department || schedule?.department_name || "",
            slots: [],
          };
        }
        if (!acc[key].doctorType && schedule?.doctor_type_name) {
          acc[key].doctorType = schedule.doctor_type_name;
        }
        if (
          !acc[key].doctorDepartment &&
          (schedule?.doctor_department || schedule?.department_name)
        ) {
          acc[key].doctorDepartment =
            schedule.doctor_department || schedule.department_name;
        }

        const readable = schedule?.readable_slots || schedule?.readable_schedule;
        let dayLabel = selectedDayName;
        let labels = [];
        if (typeof readable === "object" && !Array.isArray(readable)) {
          const selectedDayEntry = Object.entries(readable).find(
            ([day]) => String(day).toLowerCase() === selectedDayNameLower,
          );
          if (selectedDayEntry) {
            dayLabel = selectedDayEntry[0];
            labels = normalizeScheduleValues(selectedDayEntry[1]);
          }
        } else {
          labels = normalizeScheduleValues(readable);
        }

        if (!labels.length) {
          const fallback = getReadableScheduleLabel(readable);
          if (fallback && fallback !== "No schedule") {
            labels = [fallback];
          }
        }

        labels.forEach((slotLabel, index) => {
          acc[key].slots.push({
            id: `${schedule.id || key}-${dayLabel}-${index}`,
            label: formatDoctorSlotLabel(dayLabel, slotLabel),
            isAvailable: Boolean(schedule?.is_available),
          });
        });
        return acc;
      }, {}),
  )
    .map((group) => ({
      ...group,
      slots: group.slots.length
        ? group.slots
        : [
            {
              id: `${group.doctorName}-no-slot`,
              label: `${selectedDayName}: No slots`,
              isAvailable: false,
            },
          ],
    }))
    .sort((a, b) => a.doctorName.localeCompare(b.doctorName));
  const appointments = selectedDateKey
    ? appointmentsData.filter((entry) => {
        const rawVisitDate = getAppointmentVisitDateRaw(entry);
        const visitDateKey = toDateKey(rawVisitDate);
        if (visitDateKey && visitDateKey === selectedDateKey) return true;
        if (!selectedDateLabelKey) return false;
        const normalizedVisit = normalizeDateLabel(rawVisitDate);
        return (
          normalizedVisit === selectedDateLabelKey ||
          normalizedVisit === selectedDateRawKey ||
          normalizedVisit === selectedDateWithDotsKey ||
          normalizedVisit.includes(selectedDateLabelKey) ||
          normalizedVisit.includes(selectedDateRawKey) ||
          normalizedVisit.includes(selectedDateWithDotsKey)
        );
      })
    : [];

  useEffect(() => {
    if (!companyId) return;
    setIsSchedulesLoading(true);
    setSchedulesError(null);
    getAllDoctorSchedules(companyId, null, selectedDayName)
      .then((data) => {
        setDoctorSchedules(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Error fetching doctor schedules:", error);
        setSchedulesError("Unable to load doctor schedules right now.");
      })
      .finally(() => {
        setIsSchedulesLoading(false);
      });
  }, [companyId, selectedDayName]);

  useEffect(() => {
    if (!companyId) return;
    setIsEmergencyLoading(true);
    setEmergencyError(null);
    getEmergencyVisits(companyId)
      .then((data) => {
        const payload =
          data?.results ||
          data?.data?.results ||
          data?.data ||
          data?.items ||
          data;
        setEmergencyVisits(Array.isArray(payload) ? payload : []);
      })
      .catch((error) => {
        console.error("Error fetching emergency visits:", error);
        setEmergencyError(
          "Unable to load emergency visits right now. Please try again.",
        );
      })
      .finally(() => {
        setIsEmergencyLoading(false);
      });
  }, [companyId]);

  // ⬅️➡️ Scroll inside slider
  const scrollLeft = () => {
    if (sliderRef.current)
      sliderRef.current.scrollBy({ left: -250, behavior: "smooth" });
  };
  const scrollRight = () => {
    if (sliderRef.current)
      sliderRef.current.scrollBy({ left: 250, behavior: "smooth" });
  };

  // 🔄 Change Month
  const handleMonthChange = (direction) => {
    let newMonth = monthIndex + direction;
    let newYear = year;

    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }

    setMonthIndex(newMonth);
    setYear(newYear);
    generateMonthDays(newYear, newMonth);

    const firstDay = new Date(newYear, newMonth, 1).toLocaleDateString("en-CA");
    setSelectedDate(firstDay);
    if (sliderRef.current)
      sliderRef.current.scrollTo({ left: 0, behavior: "smooth" });
  };
  const todayDateKey = new Date().toLocaleDateString("en-CA");
  const ipdAppointmentsTodayCount = isIpdLoading
    ? "..."
    : ipdError
      ? "—"
      : String(
          ipdBookings.filter((booking) => {
            const admissionDateKey = toDateKey(getIpdAdmissionDateRaw(booking));
            return admissionDateKey === todayDateKey;
          }).length,
        );
  const opdPatientsTodayCount = isAppointmentsLoading
    ? "..."
    : appointmentsError
      ? "—"
      : String(
          appointmentsData.filter((appointment) => {
            const visitDateKey = toDateKey(
              getAppointmentVisitDateRaw(appointment),
            );
            return visitDateKey === todayDateKey;
          }).length,
        );
  const emergencyVisitsCount = isEmergencyLoading
    ? "..."
    : emergencyError
      ? "—"
      : String(emergencyVisits.length);

  const statCards = [
    {
      title: "IPD Appointments Today",
      value: ipdAppointmentsTodayCount,
      change: "-1.28%",
      color: "text-red-500",
      bg: "bg-green-50",
      img: `${basePath}/administrator_dashboard/appointments.png`, // calendar check
    },
    {
      title: "OPD Patients Today",
      value: opdPatientsTodayCount,
      change: "+2.14%",
      color: "text-emerald-600",
      bg: "bg-blue-50",
      img: `${basePath}/administrator_dashboard/patient.png`, // wheelchair patient icon
    },
    {
      title: "Emergency",
      value: emergencyVisitsCount,
      change: "+1.85%",
      color: "text-emerald-600",
      bg: "bg-pink-50",
      img: `${basePath}/administrator_dashboard/consultation.png`, // doctors consulting
    },
    {
      title: "Staff",
      value: "?",
      change: "+1.14%",
      color: "text-emerald-600",
      bg: "bg-amber-50",
      img: `${basePath}/administrator_dashboard/staff.png`, // doctor & nurse
    },
  ];

  const pendingItems = [
    {
      key: "doctors",
      title: "Doctor Approval Pending",
      count: pendingDoctors.length,
      names: pendingDoctors.map(
        (doctor) => doctor?.full_name || doctor?.name || "Unnamed Doctor",
      ),
    },
    {
      key: "administrations",
      title: "Administration Approval Pending",
      count: pendingAdministrations.length,
      names: pendingAdministrations.map(
        (admin) => admin?.full_name || admin?.name || "Unnamed User",
      ),
    },
    {
      key: "staff",
      title: "Staff Approval Pending",
      count: pendingStaff.length,
      names: pendingStaff.map(
        (staff) => staff?.full_name || staff?.name || "Unnamed Staff",
      ),
    },
    {
      key: "departments",
      title: "Department Approval Pending",
      count: pendingDepartments.length,
      names: pendingDepartments.map(
        (dept) => dept?.name || "Unnamed Department",
      ),
    },
    {
      key: "doctorTypes",
      title: "Doctor Type Approval Pending",
      count: pendingDoctorTypes.length,
      names: pendingDoctorTypes.map(
        (type) => type?.name || "Unnamed Doctor Type",
      ),
    },
  ];

  const togglePendingExpanded = (key) => {
    setExpandedPendingKey((prev) => (prev === key ? null : key));
  };

  const getDoctorDepartmentName = (doctor) => {
    const directName = doctor?.department_name || doctor?.department?.name;
    if (directName) return directName;
    const departmentId = doctor?.department_id ?? doctor?.department;
    if (!departmentId) return "--";
    const match = allDepartments.find(
      (dept) => String(dept.id) === String(departmentId),
    );
    return match?.name || "--";
  };

  const getAdministrationTypeName = (admin) => {
    const directName =
      admin?.administration_type_name || admin?.administration_type?.name;
    if (directName) return directName;
    const typeId = admin?.administration_type_id ?? admin?.administration_type;
    if (!typeId) return "--";
    const match = allAdministrationTypes.find(
      (type) => String(type.id) === String(typeId),
    );
    return match?.name || "--";
  };

  const getStaffDepartmentName = (staff) => {
    const directName = staff?.staff_department_name || staff?.department?.name;
    if (directName) return directName;
    const departmentId = staff?.staff_department ?? staff?.department;
    if (!departmentId) return "--";
    const match = allStaffDepartments.find(
      (dept) => String(dept.id) === String(departmentId),
    );
    return match?.name || "--";
  };

  const permissionTargetTitle =
    permissionTargetType === "doctor"
      ? "Doctor"
      : permissionTargetType === "administration"
        ? "Administration"
        : permissionTargetType === "staff"
          ? "Staff"
          : "User";
  const permissionTargetName = getTargetLabel(permissionTarget, "User");
  const isHospitalAccessDenied = !hasHospitalManagementAccess;
  const restrictedSectionClass = isHospitalAccessDenied
    ? "pointer-events-none select-none blur-[2px] opacity-45"
    : "";

  return (
    <div className="min-h-screen h-screen overflow-y-auto bg-[#f3f6fb] p-6 space-y-6 text-gray-800">
      {/* Top Metrics */}
      <div
        className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 ${restrictedSectionClass}`}
      >
        {statCards.map((card, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  {card.title}
                </p>
                <h2 className="text-2xl font-bold text-gray-900 mt-1">
                  {card.value}
                </h2>
                {/* <p className={`text-xs mt-1 font-medium ${card.color}`}>
                  {card.change} since yesterday
                </p> */}
              </div>
              <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                <img
                  src={card.img}
                  alt={card.title}
                  className="w-10 h-10 object-contain"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Management Shortcuts</h3>
            <p className="text-sm text-gray-500">
              Open linked finance, access control, and payroll workspaces.
            </p>
            {isHospitalAccessDenied ? (
              <p className="mt-2 text-sm font-medium text-amber-700">
                You don&apos;t have access to Hospital Management. Use these
                shortcuts instead.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                window.location.replace(
                  "/accounts-management/?from=hospital-management",
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
            >
              <Building2 className="h-4 w-4" />
              Accounts Management
            </button>
            <button
              type="button"
              onClick={() =>
                window.location.replace(
                  "/access-control/?from=hospital-management",
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
            >
              <ShieldCheck className="h-4 w-4" />
              Access Control
            </button>
            <button
              type="button"
              onClick={() =>
                window.location.replace("/swasthya-payroll-management/")
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
            >
              <IndianRupee className="h-4 w-4" />
              Payroll
            </button>
          </div>
        </div>
      </div>

      {/* Patient Appointments Table */}
      {/* <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">OPD Appointments</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleMonthChange(-1)}
              className="p-1.5 border border-gray-200 rounded-full hover:bg-gray-100 text-gray-600"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-gray-700 w-32 text-center">
              {currentMonth}
            </span>
            <button
              onClick={() => handleMonthChange(1)}
              className="p-1.5 border border-gray-200 rounded-full hover:bg-gray-100 text-gray-600"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="relative mb-5 bg-blue-50/60 rounded-xl py-3">
          <button
            onClick={scrollLeft}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-sm rounded-full p-1.5 text-gray-600 hover:bg-gray-100 z-10"
          >
            <ChevronLeft size={18} />
          </button>

          <div
            ref={sliderRef}
            className="flex overflow-x-auto no-scrollbar scroll-smooth px-10"
          >
            <div className="flex space-x-2 min-w-max">
              {monthDays.map(({ day, date, fullDate }) => (
                <button
                  key={fullDate}
                  onClick={() => setSelectedDate(fullDate)}
                  className={`flex flex-col items-center justify-center w-12 py-2 rounded-xl border text-sm font-medium transition-all duration-200
                  ${
                    selectedDate === fullDate
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-600 shadow-md scale-105"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-blue-100"
                  }`}
                >
                  <span>{day}</span>
                  <span className="text-base font-semibold">{date}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={scrollRight}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-sm rounded-full p-1.5 text-gray-600 hover:bg-gray-100 z-10"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {appointmentsError && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {appointmentsError}
          </div>
        )}
        {isAppointmentsLoading ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            Loading appointments...
          </div>
        ) : appointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="text-gray-600 border-b bg-gray-50">
                  <th className="py-3 px-2">Name</th>
                  <th className="py-3 px-2">Time</th>
                  <th className="py-3 px-2">Doctor</th>
                  <th className="py-3 px-2">Treatment</th>
                  <th className="py-3 px-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="text-gray-800">
                {appointments.map((apt) => {
                  const statusLabel = apt.is_cancelled ? "Cancelled" : "Booked";
                  return (
                    <tr
                      key={apt.id || `${apt.name}-${apt.visitDate}`}
                      className="border-b last:border-none hover:bg-gray-50 transition"
                    >
                      <td className="py-3 px-2 font-medium">
                        {apt.name || "Unnamed"}
                      </td>
                      <td className="px-2">
                        {getScheduleLabel(apt.doctor_schedule_display)}
                      </td>
                      <td className="px-2">{apt.doctor_name || "-"}</td>
                      <td className="px-2">
                        {apt.department_name || apt.doctor_type_name || "-"}
                      </td>
                      <td className="text-center px-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            statusLabel === "Booked"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 text-sm">
            No appointments found for this date.
          </div>
        )}
      </div> */}

      {/* Mid Panels */}
      <div
        className={`mb-15 grid grid-cols-1 gap-6 lg:grid-cols-3 ${restrictedSectionClass}`}
      >
        {/* Total Pending List */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">
            Total Pending List
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Latest pending approvals & tasks
          </p>

          {pendingError ? (
            <p className="text-sm text-red-600">{pendingError}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pendingItems.map((item) => {
                const isExpanded = expandedPendingKey === item.key;
                return (
                  <li
                    key={item.key}
                    className="py-3 px-2 rounded-lg transition-all hover:bg-gray-50"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => togglePendingExpanded(item.key)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          togglePendingExpanded(item.key);
                        }
                      }}
                    >
                      <p className="text-sm font-medium text-gray-800">
                        {item.title}
                      </p>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePendingExpanded(item.key);
                        }}
                        className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        {item.count}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                        {item.count === 0 ? (
                          <p>No pending items.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {item.key === "doctors"
                              ? pendingDoctors.map((doctor, index) => {
                                  const name =
                                    doctor?.full_name ||
                                    doctor?.name ||
                                    "Unnamed Doctor";
                                  const departmentName =
                                    getDoctorDepartmentName(doctor);
                                  return (
                                    <button
                                      type="button"
                                      key={`${item.key}-${index}`}
                                      onClick={() =>
                                        handleOpenPermissionModal(
                                          "doctor",
                                          doctor,
                                        )
                                      }
                                      className="rounded-lg bg-white px-3 py-2 text-left text-xs text-gray-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-700"
                                    >
                                      <span className="block font-semibold text-gray-800">
                                        {name}
                                      </span>
                                      <span className="block text-[11px] text-gray-500">
                                        {departmentName}
                                      </span>
                                    </button>
                                  );
                                })
                              : item.key === "staff"
                                ? pendingStaff.map((staff, index) => {
                                    const name =
                                      staff?.full_name ||
                                      staff?.name ||
                                      "Unnamed Staff";
                                    const departmentName =
                                      getStaffDepartmentName(staff);
                                    return (
                                      <button
                                        type="button"
                                        key={`${item.key}-${index}`}
                                        onClick={() =>
                                          handleStaffPendingClick(staff)
                                        }
                                        className="rounded-lg bg-white px-3 py-2 text-left text-xs text-gray-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-700"
                                      >
                                        <span className="block font-semibold text-gray-800">
                                          {name}
                                        </span>
                                        <span className="block text-[11px] text-gray-500">
                                          {departmentName}
                                        </span>
                                      </button>
                                    );
                                  })
                                : item.key === "administrations"
                                  ? pendingAdministrations.map(
                                      (admin, index) => {
                                        const name =
                                          admin?.full_name ||
                                          admin?.name ||
                                          "Unnamed User";
                                        const adminTypeName =
                                          getAdministrationTypeName(admin);
                                        return (
                                          <button
                                            type="button"
                                            key={`${item.key}-${index}`}
                                            onClick={() =>
                                              handleOpenPermissionModal(
                                                "administration",
                                                admin,
                                              )
                                            }
                                            className="rounded-lg bg-white px-3 py-2 text-left text-xs text-gray-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-700"
                                          >
                                            <span className="block font-semibold text-gray-800">
                                              {name}
                                            </span>
                                            <span className="block text-[11px] text-gray-500">
                                              {adminTypeName}
                                            </span>
                                          </button>
                                        );
                                      },
                                    )
                                  : item.names.map((name, index) => (
                                      <span
                                        key={`${item.key}-${index}`}
                                        className="rounded-full bg-white px-2 py-1 text-xs text-gray-700 shadow-sm"
                                      >
                                        {name}
                                      </span>
                                    ))}
                          </div>
                        )}
                        {item.key === "doctors" && item.count > 0 && (
                          <p className="mt-2 text-[11px] text-gray-500">
                            Click a doctor to approve.
                          </p>
                        )}
                        {item.key === "administrations" && item.count > 0 && (
                          <p className="mt-2 text-[11px] text-gray-500">
                            Click an administration user to approve.
                          </p>
                        )}
                        {item.key === "staff" && item.count > 0 && (
                          <p className="mt-2 text-[11px] text-gray-500">
                            Click a staff member to approve.
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Doctors Schedule */}
        <div className="rounded-2xl border border-[#e6ebf2] bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="min-w-0 flex-1 truncate text-[1.15rem] font-semibold text-[#1f2f46]">
              Doctors’ Schedule
            </h3>
            <div className="flex shrink-0 items-center gap-1.5 text-sm text-[#475569]">
              <button
                type="button"
                onClick={() => shiftSelectedDate(-1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d7dde8] bg-white text-[#60708a] hover:bg-[#f3f6fb]"
                aria-label="Previous day"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-1 text-right font-semibold text-[#334155]">
                {formatScheduleDate(
                  selectedDateKey || new Date().toLocaleDateString("en-CA"),
                )}
              </span>
              <button
                type="button"
                onClick={() => shiftSelectedDate(1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d7dde8] bg-white text-[#60708a] hover:bg-[#f3f6fb]"
                aria-label="Next day"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <ul className="divide-y divide-[#ebeff4] rounded-xl border border-[#ebeff4] bg-[#fcfdff] px-4">
            {isSchedulesLoading ? (
              <li className="py-5 text-center text-sm text-gray-500">
                Loading schedules...
              </li>
            ) : schedulesError ? (
              <li className="py-5 text-center text-sm text-red-600">
                {schedulesError}
              </li>
            ) : groupedDoctorSchedules.length === 0 ? (
              <li className="py-5 text-center text-sm text-gray-500">
                No schedules available.
              </li>
            ) : (
              groupedDoctorSchedules.map((group) => (
                <li key={group.doctorName} className="py-4">
                  <p className="text-[1.02rem] font-semibold text-[#1f2f46]">
                    {group.doctorName}
                    {[group.doctorType, group.doctorDepartment].filter(Boolean)
                      .length > 0 ? (
                      <span className="ml-1 font-medium text-[#6b7a90]">
                        {`(${[group.doctorType, group.doctorDepartment]
                          .filter(Boolean)
                          .join(" - ")})`}
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                    {group.slots.map((slot) => {
                      const [dayPart, ...timeParts] = slot.label.split(":");
                      const timeLabel = timeParts.join(":").trim();
                      return (
                        <div key={slot.id} className="flex flex-col items-start">
                          <span className="text-sm font-semibold text-[#475569]">
                            <span>{dayPart.trim()}:</span>{" "}
                            <span className="font-medium text-[#5f6f86]">
                              {timeLabel || "—"}
                            </span>
                          </span>
                          <span
                            className={`mt-1 inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              slot.isAvailable
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {slot.isAvailable ? "Available" : "Unavailable"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Report Summary */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">Reports</h3>
          <ul className="space-y-3">
            {[
              "Room Cleaning Needed",
              "Equipment Maintenance",
              "Medication Restock",
              "HVAC Issue",
              "Patient Transport Required",
            ].map((task, i) => (
              <li
                key={i}
                className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 p-3 rounded-lg transition"
              >
                <span>{task}</span>
                <Activity size={16} className="text-blue-500" />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {isPermissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 sm:px-4">
          <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl max-h-[92vh]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <CheckSquare size={18} className="text-emerald-600" />
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    Approve {permissionTargetTitle}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {permissionTargetName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClosePermissionModal}
                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close approval modal"
                disabled={isSavingPermissions || isPermissionsLoading}
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-4 py-4 text-sm text-gray-600 sm:px-6">
              Assign permissions for this user before approval.
            </div>

            {permissionsError && (
              <div className="px-4 pb-3 sm:px-6">
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {permissionsError}
                </p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-900/90 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
                      Permissions
                    </p>
                    <h3 className="text-lg font-semibold text-white">
                      Access Matrix
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllPermissions(!allSelected)}
                    disabled={isPermissionsLoading}
                    className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
                  >
                    {allSelected ? "Clear All" : "Select All"}
                  </button>
                </div>

                <div className="mt-4 sm:hidden">
                  {isPermissionsLoading ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-4 text-slate-400">
                      Loading permissions...
                    </div>
                  ) : permissionApps.length ? (
                    <div className="space-y-3">
                      {permissionApps.map((app) => (
                        <div
                          key={String(app?.app_id)}
                          className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white">
                              {app?.name || "App"}
                            </p>
                            <label className="flex items-center gap-2 text-xs text-slate-300 me-2">
                              <span>All</span>
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-emerald-400"
                                aria-label={`${app?.name || "App"} select all`}
                                checked={rowSelected(app)}
                                onChange={() =>
                                  setRowPermissions(
                                    app?.app_id,
                                    !rowSelected(app),
                                  )
                                }
                              />
                            </label>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                            {permissionActions.map((action) => (
                              <label
                                key={action}
                                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-2 py-2"
                              >
                                <span className="capitalize">{action}</span>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-emerald-400"
                                  aria-label={`${app?.name || "App"} ${action}`}
                                  checked={Boolean(
                                    app?.[actionFieldMap[action]],
                                  )}
                                  onChange={() =>
                                    handleTogglePermission(app?.app_id, action)
                                  }
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-4 text-slate-400">
                      No permissions available for this user.
                    </div>
                  )}
                </div>

                <div className="mt-4 hidden overflow-x-auto sm:block">
                  <table className="w-full text-left text-sm text-slate-200">
                    <thead className="text-xs uppercase text-slate-400">
                      <tr>
                        <th className="py-2">App</th>
                        <th className="py-2 text-center">All</th>
                        {permissionActions.map((action) => (
                          <th key={action} className="py-2 text-center">
                            {action}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {isPermissionsLoading ? (
                        <tr>
                          <td
                            className="py-4 text-slate-400"
                            colSpan={permissionActions.length + 2}
                          >
                            Loading permissions...
                          </td>
                        </tr>
                      ) : permissionApps.length ? (
                        permissionApps.map((app) => (
                          <tr
                            key={String(app?.app_id)}
                            className="border-t border-slate-800"
                          >
                            <td className="py-3 font-medium text-white">
                              {app?.name || "App"}
                            </td>
                            <td className="py-3 text-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-emerald-400"
                                aria-label={`${app?.name || "App"} select all`}
                                checked={rowSelected(app)}
                                onChange={() =>
                                  setRowPermissions(
                                    app?.app_id,
                                    !rowSelected(app),
                                  )
                                }
                              />
                            </td>
                            {permissionActions.map((action) => (
                              <td key={action} className="py-3 text-center">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-emerald-400"
                                  aria-label={`${app?.name || "App"} ${action}`}
                                  checked={Boolean(
                                    app?.[actionFieldMap[action]],
                                  )}
                                  onChange={() =>
                                    handleTogglePermission(app?.app_id, action)
                                  }
                                />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            className="py-4 text-slate-400"
                            colSpan={permissionActions.length + 2}
                          >
                            No permissions available for this user.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={handleClosePermissionModal}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                disabled={isSavingPermissions || isPermissionsLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePermissionsAndApprove}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={
                  isSavingPermissions ||
                  isPermissionsLoading ||
                  !permissionTargetId
                }
              >
                {isSavingPermissions ? "Saving..." : "Approve & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isStaffApprovalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 sm:px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <CheckSquare size={18} className="text-emerald-600" />
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    Approve Staff
                  </h4>
                  <p className="text-xs text-gray-500">
                    {getTargetLabel(staffApprovalTarget, "Unnamed Staff")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseStaffApprovalModal}
                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close staff approval modal"
                disabled={isApprovingStaffDirectly}
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 text-sm text-gray-600">
              This staff member has no email/username. Approve directly without
              permission setup.
            </div>

            {staffApprovalError && (
              <div className="px-5 pb-2">
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {staffApprovalError}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={handleCloseStaffApprovalModal}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                disabled={isApprovingStaffDirectly}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveStaffDirectly}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isApprovingStaffDirectly || !staffApprovalTarget}
              >
                {isApprovingStaffDirectly ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
