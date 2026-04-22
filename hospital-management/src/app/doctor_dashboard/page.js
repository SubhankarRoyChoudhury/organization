"use client";

import { useEffect, useMemo, useState } from "react";
import {
  UserPlus,
  Activity,
  Users,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import {
  get_Hospital_User_Login_Details,
  getCompanyUserDetailsByUsername,
  getCurrentUser,
  getIpdBookings,
  getOpdTicketBookings,
  getEmergencyVisits,
} from "@/app/api/apiService";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DoctorDashboard() {
  const router = useRouter();
  const [accessStatus, setAccessStatus] = useState("unknown");
  const [expiryDialog, setExpiryDialog] = useState({
    open: false,
    mode: "",
    remainingDays: null,
  });
  const [companyId, setCompanyId] = useState(null);
  const [doctorId, setDoctorId] = useState(null);
  const [opdPatientsTodayCount, setOpdPatientsTodayCount] = useState("...");
  const [opdPatientsError, setOpdPatientsError] = useState(null);
  const [isOpdPatientsLoading, setIsOpdPatientsLoading] = useState(false);
  const [ipdPatientsCount, setIpdPatientsCount] = useState("...");
  const [ipdPatientsError, setIpdPatientsError] = useState(null);
  const [isIpdPatientsLoading, setIsIpdPatientsLoading] = useState(false);
  const [opdBookings, setOpdBookings] = useState([]);
  const [ipdBookings, setIpdBookings] = useState([]);
  const [emergencyPatientsTodayCount, setEmergencyPatientsTodayCount] =
    useState("...");
  const [emergencyVisits, setEmergencyVisits] = useState([]);
  const [emergencyPatientsError, setEmergencyPatientsError] = useState(null);
  const [isEmergencyPatientsLoading, setIsEmergencyPatientsLoading] =
    useState(false);

  const getLocalDateKey = (dateValue) => {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const extractDatePart = (rawValue) => {
    if (!rawValue) {
      return null;
    }
    if (rawValue instanceof Date) {
      return getLocalDateKey(rawValue);
    }
    if (typeof rawValue === "string") {
      const match = rawValue.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) {
        return match[1];
      }
      const monthMatch = rawValue.match(
        /([A-Za-z]{3,9})\.?\s+(\d{1,2}),\s*(\d{4})/,
      );
      if (monthMatch) {
        const monthName = monthMatch[1].toLowerCase();
        const dayValue = monthMatch[2].padStart(2, "0");
        const yearValue = monthMatch[3];
        const monthMap = {
          jan: "01",
          january: "01",
          feb: "02",
          february: "02",
          mar: "03",
          march: "03",
          apr: "04",
          april: "04",
          may: "05",
          jun: "06",
          june: "06",
          jul: "07",
          july: "07",
          aug: "08",
          august: "08",
          sep: "09",
          sept: "09",
          september: "09",
          oct: "10",
          october: "10",
          nov: "11",
          november: "11",
          dec: "12",
          december: "12",
        };
        const monthValue = monthMap[monthName];
        if (monthValue) {
          return `${yearValue}-${monthValue}-${dayValue}`;
        }
      }
    }
    return getLocalDateKey(rawValue);
  };

  const isMidnightValue = (rawValue) => {
    if (!rawValue || typeof rawValue !== "string") {
      return false;
    }
    const trimmed = rawValue.trim().toLowerCase();
    if (trimmed.includes("midnight")) {
      return true;
    }
    const timePart = trimmed.split("T")[1] || "";
    return timePart.startsWith("00:00:00");
  };

  const resolveAccessStatus = ({ isSuperuser, meta }) => {
    if (isSuperuser) {
      return { status: "approved", mode: "", remainingDays: null };
    }
    const isApproved = meta?.isApproved === true && meta?.delist !== true;
    const activeUptoDate = extractDatePart(meta?.activeUpto);
    if (!activeUptoDate) {
      return {
        status: isApproved ? "approved" : "blocked",
        mode: "",
        remainingDays: null,
      };
    }
    const todayKey = getLocalDateKey(new Date());
    const expiresAtStartOfDay = isMidnightValue(meta?.activeUpto);
    if (
      todayKey &&
      (activeUptoDate < todayKey ||
        (expiresAtStartOfDay && activeUptoDate <= todayKey))
    ) {
      return { status: "expired", mode: "expired", remainingDays: 0 };
    }
    if (!isApproved) {
      return { status: "blocked", mode: "", remainingDays: null };
    }
    const activeUptoDateValue = new Date(`${activeUptoDate}T00:00:00`);
    const todayDateValue = new Date(`${todayKey}T00:00:00`);
    const diffDays = Math.ceil(
      (activeUptoDateValue.getTime() - todayDateValue.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (diffDays <= 30) {
      return { status: "expiring", mode: "reminder", remainingDays: diffDays };
    }
    return { status: "approved", mode: "", remainingDays: null };
  };

  useEffect(() => {
    const loadAccessState = async () => {
      const isSuperuser = localStorage.getItem("is_superuser") === "true";
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) {
        return;
      }
      const dialogAlreadyShown =
        typeof window !== "undefined" &&
        localStorage.getItem("expiry_dialog_shown") === "true";
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          return;
        }
        const companyDetails = currentUser?.company_details || {};
        const meta = {
          isApproved: companyDetails.is_approved === true,
          delist: companyDetails.delist === true,
          activeUpto: companyDetails.active_upto,
        };
        const accessState = resolveAccessStatus({
          isSuperuser,
          meta,
        });
        setAccessStatus(accessState.status);
        if (!isSuperuser && accessState.mode && !dialogAlreadyShown) {
          setExpiryDialog({
            open: true,
            mode: accessState.mode,
            remainingDays: accessState.remainingDays,
          });
          localStorage.setItem("expiry_dialog_shown", "true");
        }
      } catch (error) {
        console.error("Error loading access status:", error);
      }
    };

    loadAccessState();
  }, []);

  useEffect(() => {
    if (accessStatus === "expired") {
      return;
    }
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (!username) {
      setOpdPatientsError("Missing login context.");
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
          setOpdPatientsError("Missing company context.");
          return;
        }
        return getCompanyUserDetailsByUsername(username).then(
          (companyUsers) => {
            const doctorUsers = companyUsers.filter(
              (user) => String(user?.role || "").toLowerCase() === "doctor",
            );
            const matchedDoctor =
              doctorUsers.find(
                (user) =>
                  String(user?.company_id) === String(resolvedCompanyId),
              ) || doctorUsers[0];
            if (!matchedDoctor?.id) {
              setOpdPatientsError("Missing doctor profile context.");
              return;
            }
            setCompanyId(matchedDoctor.company_id || resolvedCompanyId);
            setDoctorId(matchedDoctor.id);
          },
        );
      })
      .catch((error) => {
        console.error("Error fetching user details:", error);
        setOpdPatientsError("Failed to load user details.");
      });
  }, [accessStatus]);

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
    const parsed = new Date(rawValue);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-CA");
    }
    return "";
  };

  const getOpdVisitDateRaw = (entry) =>
    entry?.visitDate ||
    entry?.visit_date ||
    entry?.visit_date_display ||
    entry?.visitDateDisplay ||
    entry?.created_on ||
    entry?.createdOn ||
    "";

  const getDoctorIdFromBooking = (entry) =>
    entry?.doctor || entry?.doctor_id || entry?.doctorId || null;

  const getIpdDoctorIdFromBooking = (entry) =>
    entry?.treatment_doctor ||
    entry?.treatment_doctor_id ||
    entry?.doctor ||
    entry?.doctor_id ||
    entry?.doctorId ||
    null;

  const getIpdAdmissionDateRaw = (entry) =>
    entry?.admission_date ||
    entry?.admissionDate ||
    entry?.admission_date_display ||
    entry?.admissionDateDisplay ||
    entry?.created_on ||
    "";

  const getEmergencyVisitDateRaw = (entry) =>
    entry?.visit_datetime ||
    entry?.visitDateTime ||
    entry?.visit_date ||
    entry?.visitDate ||
    entry?.created_on ||
    entry?.createdOn ||
    "";

  const getEmergencyDoctorId = (entry) =>
    entry?.attending_doctor_id ||
    entry?.attending_doctor ||
    entry?.doctor_id ||
    entry?.doctor ||
    null;

  useEffect(() => {
    if (!companyId || !doctorId) return;
    setIsOpdPatientsLoading(true);
    setOpdPatientsError(null);
    getOpdTicketBookings(companyId)
      .then((data) => {
        const payload =
          data?.results ||
          data?.data?.results ||
          data?.data ||
          data?.items ||
          data;
        const bookings = Array.isArray(payload) ? payload : [];
        setOpdBookings(bookings);
        const todayDateKey = new Date().toLocaleDateString("en-CA");
        const count = bookings.filter((booking) => {
          const bookingDoctorId = getDoctorIdFromBooking(booking);
          if (
            !bookingDoctorId ||
            String(bookingDoctorId) !== String(doctorId)
          ) {
            return false;
          }
          const visitDateKey = toDateKey(getOpdVisitDateRaw(booking));
          return visitDateKey === todayDateKey;
        }).length;
        setOpdPatientsTodayCount(String(count));
      })
      .catch((error) => {
        console.error("Error fetching OPD ticket bookings:", error);
        setOpdPatientsError("Unable to load OPD patients right now.");
      })
      .finally(() => {
        setIsOpdPatientsLoading(false);
      });
  }, [companyId, doctorId]);

  useEffect(() => {
    if (!companyId || !doctorId) return;
    setIsIpdPatientsLoading(true);
    setIpdPatientsError(null);
    getIpdBookings(companyId)
      .then((data) => {
        const payload =
          data?.results ||
          data?.data?.results ||
          data?.data ||
          data?.items ||
          data;
        const bookings = Array.isArray(payload) ? payload : [];
        setIpdBookings(bookings);
        const count = bookings.filter((booking) => {
          const bookingDoctorId = getIpdDoctorIdFromBooking(booking);
          return (
            bookingDoctorId && String(bookingDoctorId) === String(doctorId)
          );
        }).length;
        setIpdPatientsCount(String(count));
      })
      .catch((error) => {
        console.error("Error fetching IPD bookings:", error);
        setIpdPatientsError("Unable to load IPD patients right now.");
      })
      .finally(() => {
        setIsIpdPatientsLoading(false);
      });
  }, [companyId, doctorId]);

  useEffect(() => {
    if (!companyId || !doctorId) return;
    setIsEmergencyPatientsLoading(true);
    setEmergencyPatientsError(null);
    getEmergencyVisits(companyId)
      .then((data) => {
        const payload =
          data?.results ||
          data?.data?.results ||
          data?.data ||
          data?.items ||
          data;
        const visits = Array.isArray(payload) ? payload : [];
        setEmergencyVisits(visits);
        const todayDateKey = new Date().toLocaleDateString("en-CA");
        const count = visits.filter((visit) => {
          const visitDoctorId = getEmergencyDoctorId(visit);
          if (!visitDoctorId || String(visitDoctorId) !== String(doctorId)) {
            return false;
          }
          const visitDateKey = toDateKey(getEmergencyVisitDateRaw(visit));
          return visitDateKey === todayDateKey;
        }).length;
        setEmergencyPatientsTodayCount(String(count));
      })
      .catch((error) => {
        console.error("Error fetching emergency visits:", error);
        setEmergencyPatientsError("Unable to load emergency visits.");
        setEmergencyPatientsTodayCount("-");
      })
      .finally(() => {
        setIsEmergencyPatientsLoading(false);
      });
  }, [companyId, doctorId]);

  const latestOpdPatients = useMemo(() => {
    if (!opdBookings.length || !doctorId) return [];
    const todayDateKey = new Date().toLocaleDateString("en-CA");
    return opdBookings
      .filter((booking) => {
        if (String(getDoctorIdFromBooking(booking)) !== String(doctorId)) {
          return false;
        }
        const visitDateKey = toDateKey(getOpdVisitDateRaw(booking));
        return visitDateKey === todayDateKey;
      })
      .sort((a, b) => {
        const aDate = new Date(getOpdVisitDateRaw(a) || 0).getTime();
        const bDate = new Date(getOpdVisitDateRaw(b) || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, 3);
  }, [opdBookings, doctorId]);

  const latestIpdPatients = useMemo(() => {
    if (!ipdBookings.length || !doctorId) return [];
    return ipdBookings
      .filter(
        (booking) =>
          String(getIpdDoctorIdFromBooking(booking)) === String(doctorId),
      )
      .sort((a, b) => {
        const aDate = new Date(getIpdAdmissionDateRaw(a) || 0).getTime();
        const bDate = new Date(getIpdAdmissionDateRaw(b) || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, 3);
  }, [ipdBookings, doctorId]);

  const latestEmergencyPatients = useMemo(() => {
    if (!emergencyVisits.length || !doctorId) return [];
    const todayDateKey = new Date().toLocaleDateString("en-CA");
    return emergencyVisits
      .filter((visit) => {
        const visitDoctorId = getEmergencyDoctorId(visit);
        if (!visitDoctorId || String(visitDoctorId) !== String(doctorId)) {
          return false;
        }
        const visitDateKey = toDateKey(getEmergencyVisitDateRaw(visit));
        return visitDateKey === todayDateKey;
      })
      .sort((a, b) => {
        const aDate = new Date(getEmergencyVisitDateRaw(a) || 0).getTime();
        const bDate = new Date(getEmergencyVisitDateRaw(b) || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, 3);
  }, [emergencyVisits, doctorId]);

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-700">
          Doctor Dashboard
        </h1>
        <span className="text-sm text-gray-500">Home / Dashboard</span>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-500">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm text-gray-500">
                Total OPD Patients Today For Me
              </h2>
              <p className="text-2xl font-semibold mt-1">
                {isOpdPatientsLoading
                  ? "..."
                  : opdPatientsError
                    ? "-"
                    : opdPatientsTodayCount}
              </p>
            </div>
            <UserPlus className="text-blue-500 w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm text-gray-500">IPD Patients For Me</h2>
              <p className="text-2xl font-semibold mt-1">
                {isIpdPatientsLoading
                  ? "..."
                  : ipdPatientsError
                    ? "-"
                    : ipdPatientsCount}
              </p>
            </div>
            <ClipboardList className="text-green-500 w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-purple-500">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm text-gray-500">Today's Operations</h2>
              <p className="text-2xl font-semibold mt-1">?</p>
            </div>
            <Activity className="text-purple-500 w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-pink-500">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm text-gray-500">
                Emergency Patients Today For Me
              </h2>
              <p className="text-2xl font-semibold mt-1">
                {isEmergencyPatientsLoading
                  ? "..."
                  : emergencyPatientsError
                    ? "-"
                    : emergencyPatientsTodayCount}
              </p>
            </div>
            <Users className="text-pink-500 w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Placeholder */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-gray-700 font-semibold mb-2">
            New Patient Growth
          </h2>
          <div className="h-40 bg-gradient-to-r from-blue-50 to-blue-100 rounded-md flex items-center justify-center text-gray-400 text-sm">
            Chart Placeholder
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-gray-700 font-semibold mb-2">Heart Surgeries</h2>
          <div className="h-40 bg-gradient-to-r from-green-50 to-green-100 rounded-md flex items-center justify-center text-gray-400 text-sm">
            Chart Placeholder
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-gray-700 font-semibold mb-2">
            Medical Treatment
          </h2>
          <div className="h-40 bg-gradient-to-r from-purple-50 to-purple-100 rounded-md flex items-center justify-center text-gray-400 text-sm">
            Chart Placeholder
          </div>
        </div>
      </div> */}
      {/* Table */}
      <div className="bg-white rounded-xl shadow p-5 mb-8">
        <h2 className="mb-4 inline-flex items-center gap-2 whitespace-nowrap text-sm md:text-base font-semibold text-gray-700">
          <span>My OPD Patient List Today</span>
          <span className="text-sm font-medium text-gray-500">
            (
            {new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
            )
          </span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="py-2 px-3">Sl No</th>
                <th className="py-2 px-3">Ticket No</th>
                <th className="py-2 px-3">Patient</th>
                <th className="py-2 px-3">Department</th>
                <th className="py-2 px-3">Schedule</th>
              </tr>
            </thead>
            <tbody>
              {latestOpdPatients.length ? (
                latestOpdPatients.map((p, index) => (
                  <tr
                    key={p.id || p.ticket_no || index}
                    className="border-b last:border-none hover:bg-gray-50 transition"
                  >
                    <td className="py-2 px-3">{index + 1}</td>
                    <td className="py-2 px-3">{p.ticket_no || "-"}</td>
                    <td className="py-2 px-3 font-medium">
                      {p.name || p.patient_name || "Unnamed"}
                    </td>
                    <td className="py-2 px-3">
                      {p.department_name || p.department || "-"}
                    </td>
                    <td className="py-2 px-3">
                      {p.doctor_schedule_display
                        ? Object.entries(p.doctor_schedule_display)
                            .map(([day, slot]) =>
                              day ? `${day}: ${slot}` : slot,
                            )
                            .join(", ")
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="py-6 px-3 text-center text-gray-500"
                    colSpan={5}
                  >
                    {isOpdPatientsLoading
                      ? "Loading OPD patients..."
                      : "No OPD patients found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => router.push("/doctor_dashboard/patient_record")}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            See more
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="font-semibold text-gray-700 mb-4 text-sm md:text-base">
          My IPD Patient List Today
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="py-2 px-3">Sl No</th>
                <th className="py-2 px-3">IPD No</th>
                <th className="py-2 px-3">Patient</th>
                <th className="py-2 px-3">Admission Date</th>
                <th className="py-2 px-3">Department</th>
                <th className="py-2 px-3">Ward</th>
                <th className="py-2 px-3">Room No</th>
              </tr>
            </thead>
            <tbody>
              {latestIpdPatients.length ? (
                latestIpdPatients.map((booking, index) => (
                  <tr
                    key={booking.id || booking.ipd_no || index}
                    className="border-b last:border-none hover:bg-gray-50 transition"
                  >
                    <td className="py-2 px-3">{index + 1}</td>
                    <td className="py-2 px-3">{booking.ipd_no || "-"}</td>
                    <td className="py-2 px-3 font-medium">
                      {booking.patient_name || "Unknown"}
                    </td>
                    <td className="py-2 px-3">
                      {getIpdAdmissionDateRaw(booking) || "-"}
                    </td>
                    <td className="py-2 px-3">
                      {booking.department_name || "-"}
                    </td>
                    <td className="py-2 px-3">{booking.ward_name || "-"}</td>
                    <td className="py-2 px-3">{booking.room_no || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="py-6 px-3 text-center text-gray-500"
                    colSpan={7}
                  >
                    {isIpdPatientsLoading
                      ? "Loading IPD patients..."
                      : "No IPD patients found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() =>
              router.push("/doctor_dashboard/ipd_admit_patient_record")
            }
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            See more
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow p-5 mt-8">
        <h2 className="font-semibold text-gray-700 mb-4 text-sm md:text-base">
          Emergency Patient List Today
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="py-2 px-3">Sl No</th>
                <th className="py-2 px-3">Emergency No</th>
                <th className="py-2 px-3">Patient</th>
                <th className="py-2 px-3">Visit Date</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Triage</th>
              </tr>
            </thead>
            <tbody>
              {latestEmergencyPatients.length ? (
                latestEmergencyPatients.map((visit, index) => (
                  <tr
                    key={visit.id || visit.emer_no || index}
                    className="border-b last:border-none hover:bg-gray-50 transition"
                  >
                    <td className="py-2 px-3">{index + 1}</td>
                    <td className="py-2 px-3">{visit.emer_no || "-"}</td>
                    <td className="py-2 px-3 font-medium">
                      {visit.patient_name || visit.patient?.name || "Unnamed"}
                    </td>
                    <td className="py-2 px-3">
                      {getEmergencyVisitDateRaw(visit) || "-"}
                    </td>
                    <td className="py-2 px-3">{visit.status || "-"}</td>
                    <td className="py-2 px-3">{visit.triage_level || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="py-6 px-3 text-center text-gray-500"
                    colSpan={6}
                  >
                    {isEmergencyPatientsLoading
                      ? "Loading emergency patients..."
                      : emergencyPatientsError ||
                        "No emergency patients found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => router.push("/doctor_dashboard/emergency_list")}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            See more
          </button>
        </div>
      </div>

      <Dialog
        open={expiryDialog.open}
        onOpenChange={(open) => setExpiryDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent
          className="max-w-lg overflow-hidden border border-blue-100 bg-white/95 p-0"
          hideCloseButton
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onKeyDownCapture={(event) => {
            if (event.key === "Enter" && expiryDialog.mode === "reminder") {
              event.preventDefault();
              setExpiryDialog((prev) => ({ ...prev, open: false }));
            }
          }}
        >
          <div className="relative">
            <div className="bg-gradient-to-br from-[#f97316]/15 via-white to-[#ef4444]/15 px-6 pb-4 pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-md">
                  <Sparkles className="h-6 w-6 text-[#f97316]" />
                </div>
                <div className="space-y-2">
                  <DialogTitle className="text-xl text-gray-900">
                    {expiryDialog.mode === "expired"
                      ? "Subscription expired"
                      : "Subscription expiring soon"}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-600">
                    {expiryDialog.mode === "expired"
                      ? "Your hospital subscription has expired. Please contact us to renew access."
                      : `Your hospital subscription will expire in ${expiryDialog.remainingDays} ${
                          expiryDialog.remainingDays === 1 ? "day" : "days"
                        }. Please contact us to renew.`}
                  </DialogDescription>
                </div>
              </div>
            </div>
            <div className="space-y-4 px-6 pb-6">
              <div className="rounded-2xl border border-orange-100 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600/80">
                  Contact
                </p>
                <a
                  href="mailto:info@phenx.io"
                  className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:text-orange-800"
                >
                  info@phenx.io
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  onClick={() => {
                    setExpiryDialog((prev) => ({ ...prev, open: false }));
                    if (expiryDialog.mode === "expired") {
                      window.location.href = "/login";
                    }
                  }}
                >
                  Got it
                </button>
                <button
                  type="button"
                  className="rounded-full border border-orange-200 px-5 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
                  onClick={() => {
                    window.location.href = "mailto:info@phenx.io";
                  }}
                >
                  Email now
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
