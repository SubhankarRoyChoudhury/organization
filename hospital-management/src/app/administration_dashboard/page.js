"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import {
  Users,
  Stethoscope,
  Calendar,
  Home,
  Activity,
  TrendingUp,
  BedDouble,
  Bed,
  Building2,
  ShieldCheck,
  IndianRupee,
} from "lucide-react";
import {
  get_Hospital_User_Login_Details,
  getOpdTicketBookings,
  getPatients,
  getIpdBookings,
  getAllDoctorSchedules,
  getDoctorFees,
  getEmergencyVisits,
} from "@/app/api/apiService";

const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "/hospital-management";
const normalize = (value) => String(value || "").trim().toLowerCase();
const getPermissionByName = (permissions, name) =>
  permissions.find((item) => normalize(item?.name) === normalize(name));
const resolveAppAccess = (data, appName, defaultAccess = true) => {
  const directPermissions = Array.isArray(data?.app_permissions)
    ? data.app_permissions
    : [];
  if (directPermissions.length > 0) {
    const appPermission = getPermissionByName(directPermissions, appName);
    return appPermission ? appPermission.can_access !== false : defaultAccess;
  }
  if (typeof window === "undefined") {
    return defaultAccess;
  }
  try {
    const raw = localStorage.getItem("app_permissions");
    const parsed = raw ? JSON.parse(raw) : [];
    const permissions = Array.isArray(parsed) ? parsed : [];
    const appPermission = getPermissionByName(permissions, appName);
    return appPermission ? appPermission.can_access !== false : defaultAccess;
  } catch {
    return defaultAccess;
  }
};
const resolveHospitalAccess = (data) =>
  resolveAppAccess(data, "Hospital Management", true);

export default function AdministratorDashboardPage() {
  const router = useRouter();
  const [monthDays, setMonthDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState("");
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const sliderRef = useRef(null);
  const [companyId, setCompanyId] = useState(null);
  const [appointmentsData, setAppointmentsData] = useState([]);
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(null);
  const [patientsData, setPatientsData] = useState([]);
  const [isPatientsLoading, setIsPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState(null);
  const [ipdBookings, setIpdBookings] = useState([]);
  const [isIpdLoading, setIsIpdLoading] = useState(false);
  const [ipdError, setIpdError] = useState(null);
  const [doctorSchedules, setDoctorSchedules] = useState([]);
  const [isSchedulesLoading, setIsSchedulesLoading] = useState(false);
  const [schedulesError, setSchedulesError] = useState(null);
  const [emergencyVisits, setEmergencyVisits] = useState([]);
  const [isEmergencyLoading, setIsEmergencyLoading] = useState(false);
  const [emergencyError, setEmergencyError] = useState(null);
  const [openDoctorMenuKey, setOpenDoctorMenuKey] = useState(null);
  const [doctorFeesByDoctorId, setDoctorFeesByDoctorId] = useState({});
  const [selectedFeeKey, setSelectedFeeKey] = useState(null);
  const [isDoctorScheduleModalOpen, setIsDoctorScheduleModalOpen] =
    useState(false);
  const [doctorScheduleModalData, setDoctorScheduleModalData] = useState([]);
  const [isDoctorScheduleModalLoading, setIsDoctorScheduleModalLoading] =
    useState(false);
  const [doctorScheduleModalError, setDoctorScheduleModalError] =
    useState(null);
  const [scheduleModalDoctorName, setScheduleModalDoctorName] = useState("");
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
        const resolvedUser = data?.user ?? data ?? {};
        const roleSources = [
          resolvedUser?.role,
          data?.role,
          resolvedUser?.user_type,
          data?.user_type,
        ]
          .map((value) => String(value || "").toLowerCase().trim())
          .filter(Boolean);
        const roleAssignments = [
          ...(Array.isArray(resolvedUser?.roles) ? resolvedUser.roles : []),
          ...(Array.isArray(data?.roles) ? data.roles : []),
        ]
          .map((entry) => String(entry?.name ?? entry ?? "").toLowerCase().trim())
          .filter(Boolean);
        const groupSources =
          typeof window !== "undefined"
            ? [localStorage.getItem("group_name"), localStorage.getItem("group")]
                .map((value) => String(value || "").toLowerCase().trim())
                .filter(Boolean)
            : [];
        const isSuperuser =
          localStorage.getItem("is_superuser") === "true" ||
          Boolean(resolvedUser?.is_superuser ?? data?.is_superuser);
        const hasAdminFlags =
          resolvedUser?.is_admin === true ||
          resolvedUser?.is_owner === true ||
          data?.is_admin === true ||
          data?.is_owner === true;
        const hasCompanyAdminFlags = Array.isArray(data?.companies)
          ? data.companies.some(
              (company) =>
                company?.is_admin === true || company?.is_owner === true,
            )
          : data?.companies?.is_admin === true || data?.companies?.is_owner === true;
        const inCompanyAdminGroup = [...roleAssignments, ...groupSources].some(
          (groupName) =>
            groupName.includes("company admin group") ||
            groupName.includes("company_admin_group"),
        );
        const inAdminGroup = [...roleAssignments, ...groupSources].some(
          (groupName) => groupName === "admin group",
        );
        const hasCompanyAdminRole = roleSources.some(
          (roleName) =>
            roleName === "company_admin" || roleName === "company admin",
        );
        const hasExplicitAdminRole = roleSources.some(
          (roleName) =>
            roleName === "admin" ||
            roleName === "super_admin" ||
            roleName === "superuser",
        );
        const hasAdminAccess =
          isSuperuser ||
          hasAdminFlags ||
          hasCompanyAdminFlags ||
          inCompanyAdminGroup ||
          inAdminGroup ||
          hasCompanyAdminRole ||
          hasExplicitAdminRole;

        if (hasAdminAccess) {
          router.replace("/admin_dashboard");
          return;
        }

        setHasHospitalManagementAccess(resolveHospitalAccess(data));

        const resolvedCompanyId =
          data?.company_id || data?.companies?.[0]?.company_id;
        if (resolvedCompanyId) {
          setCompanyId(resolvedCompanyId);
        } else {
          setAppointmentsError(
            "Unable to determine company context. Please contact support.",
          );
        }
      })
      .catch((error) => {
        console.error("Error fetching user details:", error);
        setAppointmentsError("Failed to load user details.");
      });
  }, [router]);

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

  const selectedDateKey = toDateKey(selectedDate);
  const selectedDayName =
    getDayNameFromDateKey(selectedDateKey) ||
    new Date().toLocaleDateString("en-US", { weekday: "long" });
  const normalizeDateLabel = (value) => normalizeDateInput(value).toLowerCase();
  const selectedDateLabel = selectedDateKey
    ? new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const selectedDateLabelKey = normalizeDateLabel(selectedDateLabel);
  const selectedDateRawKey = normalizeDateLabel(selectedDate);
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
          normalizedVisit.includes(selectedDateLabelKey) ||
          normalizedVisit.includes(selectedDateRawKey)
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
    getDoctorFees(companyId)
      .then((data) => {
        const feesMap = {};
        (Array.isArray(data) ? data : data?.data || []).forEach((entry) => {
          if (!entry?.doctor) return;
          feesMap[String(entry.doctor)] = entry.fees ?? "";
        });
        setDoctorFeesByDoctorId(feesMap);
      })
      .catch((error) => {
        console.error("Error fetching doctor fees:", error);
        setDoctorFeesByDoctorId({});
      });
  }, [companyId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.closest("[data-doctor-menu]")) return;
      setOpenDoctorMenuKey(null);
      setSelectedFeeKey(null);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const openDoctorScheduleModal = async (doctorId, doctorName) => {
    if (!companyId || !doctorId) return;
    setDoctorScheduleModalError(null);
    setDoctorScheduleModalData([]);
    setScheduleModalDoctorName(doctorName || "Doctor");
    setIsDoctorScheduleModalOpen(true);
    setIsDoctorScheduleModalLoading(true);
    try {
      const data = await getAllDoctorSchedules(companyId, doctorId);
      setDoctorScheduleModalData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching doctor schedules:", error);
      setDoctorScheduleModalError("Unable to load schedules right now.");
    } finally {
      setIsDoctorScheduleModalLoading(false);
    }
  };

  const closeDoctorScheduleModal = () => {
    setIsDoctorScheduleModalOpen(false);
    setDoctorScheduleModalData([]);
    setDoctorScheduleModalError(null);
    setScheduleModalDoctorName("");
  };

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
  const appointmentCountValue = isAppointmentsLoading
    ? "..."
    : appointmentsError
      ? "—"
      : String(appointmentsData.length);
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
  const opdPatientsTodayCount = isPatientsLoading
    ? "..."
    : patientsError
      ? "—"
      : String(
          patientsData.filter((patient) => {
            const createdDateKey = toDateKey(getPatientCreatedDateRaw(patient));
            return createdDateKey === todayDateKey;
          }).length,
        );
  const emergencyPatientsCount = isEmergencyLoading
    ? "..."
    : emergencyError
      ? "—"
      : String(emergencyVisits.length);

  const statCards = [
    {
      title: "IPD Status Today",
      value: ipdAppointmentsTodayCount,
      change: "-1.28%",
      color: "text-red-500",
      bg: "bg-green-50",
      img: `${basePath}/administrator_dashboard/appointments.png`, // calendar check
    },
    {
      title: "OPD Status Today",
      value: opdPatientsTodayCount,
      change: "+2.14%",
      color: "text-emerald-600",
      bg: "bg-blue-50",
      img: `${basePath}/administrator_dashboard/patient.png`, // wheelchair patient icon
    },
    {
      title: "Emergency Status",
      value: emergencyPatientsCount,
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
  const isHospitalAccessDenied = !hasHospitalManagementAccess;
  const restrictedSectionClass = isHospitalAccessDenied
    ? "pointer-events-none select-none blur-[2px] opacity-45"
    : "";

  return (
    <div className="min-h-screen bg-[#f3f6fb] p-6 space-y-6 text-gray-800">
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
      <div
        className={`bg-white rounded-2xl border border-gray-200 p-6 shadow-sm ${restrictedSectionClass}`}
      >
        {/* Header with Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">ODP Appointments</h3>
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

        {/* 🎨 Date Slider (with soft background + highlight) */}
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

        {/* Appointment Table */}
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
      </div>

      {/* Mid Panels */}
      <div className={`grid grid-cols-1 gap-6 lg:grid-cols-3 ${restrictedSectionClass}`}>
        {/* IPD Section */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">IPD Section</h3>
          <p className="text-xs text-gray-500 mb-4">
            Quick access to IPD setup.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Rate",
                href: "/admin_dashboard/ipd-admin/rate-chart",
                Icon: IndianRupee,
              },
              {
                label: "Room",
                href: "/admin_dashboard/ipd-admin/room",
                Icon: BedDouble,
              },
              {
                label: "Bed",
                href: "/admin_dashboard/ipd-admin/bed",
                Icon: Bed,
              },
              {
                label: "Ward",
                href: "/admin_dashboard/ipd-admin/ward",
                Icon: Building2,
              },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => router.push(item.href)}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-5 text-sm font-semibold text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                <item.Icon className="h-5 w-5 text-blue-600" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Doctor List */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">Doctor List</h3>
          <ul className="divide-y divide-gray-100">
            {isSchedulesLoading ? (
              <li className="py-4 text-sm text-gray-500 text-center">
                Loading doctors...
              </li>
            ) : schedulesError ? (
              <li className="py-4 text-sm text-red-600 text-center">
                {schedulesError}
              </li>
            ) : doctorSchedules.length === 0 ? (
              <li className="py-4 text-sm text-gray-500 text-center">
                No doctors available.
              </li>
            ) : (
              Object.values(
                doctorSchedules
                  .filter((schedule) => schedule?.is_available)
                  .filter((schedule) => {
                    const absentDates = Array.isArray(schedule?.absent_dates)
                      ? schedule.absent_dates
                      : [];
                    return (
                      !selectedDateKey || !absentDates.includes(selectedDateKey)
                    );
                  })
                  .filter((schedule) => {
                    const readable = schedule?.readable_schedule;
                    if (!readable || typeof readable !== "object") return true;
                    return Object.keys(readable).some(
                      (day) =>
                        day.toLowerCase() === selectedDayName.toLowerCase(),
                    );
                  })
                  .reduce((acc, schedule) => {
                    const doctorKey = schedule?.doctor || schedule?.doctor_id;
                    const key =
                      doctorKey ??
                      schedule?.doctor_name ??
                      `unknown-${schedule.id}`;
                    if (!acc[key]) {
                      acc[key] = {
                        doctorName: schedule?.doctor_name || "Unknown Doctor",
                        doctorDepartment: schedule?.doctor_department || "—",
                        doctorType: schedule?.doctor_type_name || "—",
                        timeSlots: [],
                        doctorId:
                          schedule?.doctor || schedule?.doctor_id || null,
                        departmentId: schedule?.doctor_department_id || null,
                      };
                    }
                    const readable = schedule?.readable_schedule || {};
                    const slotsForDay = readable?.[selectedDayName];
                    const labels = Array.isArray(slotsForDay)
                      ? slotsForDay.filter(Boolean)
                      : slotsForDay
                        ? [slotsForDay]
                        : [];
                    labels.forEach((label) => {
                      acc[key].timeSlots.push(label);
                    });
                    return acc;
                  }, {}),
              )
                .sort((a, b) =>
                  (a.doctorName || "").localeCompare(b.doctorName || ""),
                )
                .map((doctor) => (
                  <li
                    key={`${doctor.doctorName}-${doctor.doctorDepartment}`}
                    className="py-3 px-2 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {doctor.doctorName} - {doctor.doctorDepartment}
                        </p>
                        <p className="text-sm text-gray-800 mt-0.5">
                          {doctor.doctorType}
                        </p>
                        {/* {doctor.timeSlots.length > 0 && (
                          <p className="text-sm text-gray-700 mt-1">
                            {doctor.timeSlots.join(", ")}
                          </p>
                        )} */}
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
                          aria-label="Doctor options"
                          onClick={(event) => {
                            event.stopPropagation();
                            const key = `${doctor.doctorName}-${doctor.doctorDepartment}`;
                            setOpenDoctorMenuKey((prev) =>
                              prev === key ? null : key,
                            );
                          }}
                          data-doctor-menu
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openDoctorMenuKey ===
                          `${doctor.doctorName}-${doctor.doctorDepartment}` && (
                          <div
                            className="absolute right-0 z-10 mt-2 w-32 rounded-md border border-gray-200 bg-white shadow-lg"
                            data-doctor-menu
                          >
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => {
                                setOpenDoctorMenuKey(null);
                                setSelectedFeeKey(null);
                                openDoctorScheduleModal(
                                  doctor.doctorId,
                                  doctor.doctorName,
                                );
                              }}
                            >
                              Schedule
                            </button>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => {
                                if (!doctor.departmentId || !doctor.doctorId) {
                                  setOpenDoctorMenuKey(null);
                                  return;
                                }
                                const params = new URLSearchParams({
                                  department_id: String(doctor.departmentId),
                                  doctor_id: String(doctor.doctorId),
                                });
                                router.push(
                                  `/opd-booking?${params.toString()}`,
                                );
                                setOpenDoctorMenuKey(null);
                              }}
                            >
                              Booking OPD
                            </button>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                              disabled={
                                !doctor.departmentId || !doctor.doctorId
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                const key = `${doctor.doctorName}-${doctor.doctorDepartment}`;
                                setSelectedFeeKey((prev) =>
                                  prev === key ? null : key,
                                );
                              }}
                            >
                              Fees
                            </button>
                            {selectedFeeKey ===
                              `${doctor.doctorName}-${doctor.doctorDepartment}` && (
                              <div className="px-3 pb-2 text-[13px] text-gray-800">
                                Fees:{" "}
                                {doctorFeesByDoctorId[
                                  String(doctor.doctorId)
                                ] !== undefined
                                  ? `INR ${
                                      doctorFeesByDoctorId[
                                        String(doctor.doctorId)
                                      ] || 0
                                    }`
                                  : "N/A"}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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

      {isDoctorScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Doctor Schedule
                </h2>
                <p className="text-xs text-gray-500">
                  {scheduleModalDoctorName}
                  {selectedDateLabel ? ` • ${selectedDateLabel}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDoctorScheduleModal}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
              {isDoctorScheduleModalLoading && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
                  Loading schedules...
                </div>
              )}
              {doctorScheduleModalError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {doctorScheduleModalError}
                </div>
              )}
              {!isDoctorScheduleModalLoading && !doctorScheduleModalError && (
                <div className="space-y-3">
                  {(() => {
                    const filtered = doctorScheduleModalData
                      .map((schedule) => {
                        const slotSource =
                          schedule.readable_slots ||
                          schedule.readable_schedule ||
                          {};
                        const entries = Object.entries(slotSource).filter(
                          ([day]) =>
                            day.toLowerCase() === selectedDayName.toLowerCase(),
                        );
                        const absentDates = Array.isArray(
                          schedule?.absent_dates,
                        )
                          ? schedule.absent_dates
                          : [];
                        if (
                          selectedDateKey &&
                          absentDates.includes(selectedDateKey)
                        ) {
                          return null;
                        }
                        if (!entries.length) return null;
                        return { schedule, entries };
                      })
                      .filter(Boolean);
                    if (!filtered.length) {
                      return (
                        <div className="text-sm text-gray-500">
                          No schedules for {selectedDayName}.
                        </div>
                      );
                    }
                    return filtered.map(({ schedule, entries }) => (
                      <div
                        key={schedule.id}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                      >
                        {/* <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                          <span>Schedule ID: {schedule.id}</span>
                          {schedule.association_type && (
                            <span>• {schedule.association_type}</span>
                          )}
                          <span>
                            •{" "}
                            {schedule.is_available
                              ? "Available"
                              : "Unavailable"}
                          </span>
                        </div> */}
                        <div className="mt-2 flex flex-col gap-1 text-sm text-gray-700">
                          {entries.map(([day, slots]) => {
                            const labels = Array.isArray(slots)
                              ? slots.filter(Boolean)
                              : slots
                                ? [slots]
                                : [];
                            return (
                              <div
                                key={`${schedule.id}-${day}`}
                                className="flex flex-wrap items-center gap-2"
                              >
                                <span className="font-semibold">{day}:</span>
                                <span>
                                  {labels.length ? labels.join(", ") : "—"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
