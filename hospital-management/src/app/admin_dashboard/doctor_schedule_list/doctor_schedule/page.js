"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  MoreVertical,
} from "lucide-react";
import {
  getAllDoctorSchedules,
  get_Hospital_User_Login_Details,
  getAllDoctors,
  getAllTimeSlots,
  createDoctorSchedule,
  updateDoctorSchedule,
} from "@/app/api/apiService";

const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const startHour = 7;
const endHour = 22;
const BASE_ROW_REM = 3.5;
const BASE_DAY_MIN_WIDTH = 130;
const MIN_EVENT_CARD_WIDTH = 170;
const EVENT_CARD_GAP_PX = 5;
const COLUMN_INNER_PADDING_PX = 5;

export default function DoctorSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState({});
  const [colWidths, setColWidths] = useState(Array(7).fill(1)); // ✅ Safe default (SSR/CSR match)
  const draggingRef = useRef(null);
  const calendarRef = useRef(null);
  const [loggedInDetails, setLoggedInDetails] = useState(null);
  const [companyError, setCompanyError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [associationFilter, setAssociationFilter] = useState("all");
  const [approvedDoctors, setApprovedDoctors] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [isScheduleSubmitting, setIsScheduleSubmitting] = useState(false);
  const [availableDays, setAvailableDays] = useState([]);
  const [dayTimeSlots, setDayTimeSlots] = useState({});
  const [associationType, setAssociationType] = useState("");
  const [modalSchedules, setModalSchedules] = useState([]);
  const [isModalSchedulesLoading, setIsModalSchedulesLoading] = useState(false);
  const [modalSchedulesError, setModalSchedulesError] = useState(null);
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editingDay, setEditingDay] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [dayBodyScrollLeft, setDayBodyScrollLeft] = useState(0);

  const ROW_REM = BASE_ROW_REM;
  const BODY_REM = (endHour - startHour) * ROW_REM;

  const normalizeAssociation = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const sanitizeCompanyId = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const num = Number(value);
    if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
      return null;
    }
    return num;
  };

  const resolveCompanyId = (data) => {
    const direct = sanitizeCompanyId(data);
    if (direct) return direct;
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
    return null;
  };

  /* =============== Load persisted widths after hydration =============== */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("doctor_col_widths");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 7) {
            setColWidths(parsed);
          }
        } catch (err) {
          console.warn("Invalid saved column widths:", err);
        }
      }
    }
  }, []);

  /* =============== Helpers =============== */
  const getMonthName = (date) =>
    date.toLocaleString("default", { month: "long", year: "numeric" });

  const startOfWeek = (date) => {
    const diff = date.getDate() - date.getDay();
    return new Date(date.setDate(diff));
  };

  const getWeekDates = (date) => {
    const start = startOfWeek(new Date(date));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const formatDateKey = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const weekDates = getWeekDates(currentDate);

  /* =============== Fetch & Transform Data =============== */
  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username) {
      setCompanyError("Missing company context. Please login again.");
      return;
    }
    get_Hospital_User_Login_Details(username)
      .then((data) => {
        setLoggedInDetails(data);
        const resolved = resolveCompanyId(data);
        setCompanyId(resolved);
        if (!resolved) {
          setCompanyError("Unable to determine your company.");
        } else {
          setCompanyError(null);
        }
      })
      .catch((err) => {
        console.error("Error fetching user details:", err);
        setCompanyError("Unable to fetch company details.");
      });
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchSchedules(companyId);
      fetchApprovedDoctors(companyId);
      fetchTimeSlots(companyId);
    }
  }, [companyId]);

  const fetchSchedules = async (company_id) => {
    if (!company_id) return;
    setIsLoading(true);
    try {
      const schedules = await getAllDoctorSchedules(company_id);
      const grouped = {};

      schedules
        .filter((schedule) => schedule?.is_available && !schedule?.delist)
        .forEach((s) => {
          const slotSource = s.readable_slots || s.readable_schedule;
          if (!slotSource) return;
          Object.entries(slotSource).forEach(([day, slotValue]) => {
            const labels = Array.isArray(slotValue)
              ? slotValue.filter(Boolean)
              : slotValue
                ? [slotValue]
                : [];
            if (!grouped[day]) grouped[day] = [];
            if (labels.length === 0) {
              grouped[day].push({
                ...s,
                day,
                time_slot_display: "—",
              });
              return;
            }
            labels.forEach((label, idx) => {
              grouped[day].push({
                ...s,
                day,
                time_slot_display: label,
                slotIndex: idx,
              });
            });
          });
        });

      setScheduleData(grouped);
    } catch (err) {
      console.error("❌ Failed to load schedules:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchApprovedDoctors = async (company_id) => {
    try {
      const data = await getAllDoctors(company_id);
      const doctors = Array.isArray(data) ? data : data?.data || [];
      const approved = doctors.filter((doc) => doc?.is_approve);
      setApprovedDoctors(approved);
      if (
        selectedDoctor !== "all" &&
        !approved.find((doc) => String(doc.id) === selectedDoctor)
      ) {
        setSelectedDoctor("all");
      }
    } catch (err) {
      console.error("Failed to load doctors:", err);
    }
  };

  const fetchTimeSlots = async (company_id) => {
    try {
      const slots = await getAllTimeSlots(company_id);
      setTimeSlots(slots || []);
    } catch (err) {
      console.error("Failed to load time slots:", err);
    }
  };

  /* =============== Week Navigation =============== */
  const handlePrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const handleDayBodyScroll = (e) => {
    setDayBodyScrollLeft(e.currentTarget.scrollLeft);
  };

  /* =============== Parse Time Range =============== */
  const parseTimeRange = (range) => {
    if (!range) return [0, 0];
    const [start, end] = range.split(" - ");
    const toNum = (t) => {
      const [hm, p] = t.split(" ");
      let [h, m] = hm.split(":").map(Number);
      if (p === "PM" && h !== 12) h += 12;
      if (p === "AM" && h === 12) h = 0;
      return h + m / 60;
    };
    return [toNum(start), toNum(end)];
  };

  /* =============== Resize Columns =============== */
  const startResize = (index, e) => {
    e.preventDefault();
    draggingRef.current = {
      index,
      startX: e.clientX,
      startWidths: [...colWidths],
    };
    document.addEventListener("mousemove", onResizing);
    document.addEventListener("mouseup", stopResize);
  };

  const onResizing = (e) => {
    const drag = draggingRef.current;
    if (!drag) return;
    const delta = e.clientX - drag.startX;
    const newWidths = [...drag.startWidths];
    const totalWidth = newWidths[drag.index] + (newWidths[drag.index + 1] || 0);
    const change = delta / 150;

    newWidths[drag.index] = Math.max(
      0.5,
      drag.startWidths[drag.index] + change,
    );
    if (drag.index < newWidths.length - 1)
      newWidths[drag.index + 1] = Math.max(
        0.5,
        totalWidth - newWidths[drag.index],
      );
    setColWidths(newWidths);
  };

  const stopResize = () => {
    draggingRef.current = null;
    document.removeEventListener("mousemove", onResizing);
    document.removeEventListener("mouseup", stopResize);

    // ✅ Save to localStorage after user stops resizing
    if (typeof window !== "undefined") {
      localStorage.setItem("doctor_col_widths", JSON.stringify(colWidths));
    }
  };

  const dayColumns = useMemo(
    () =>
      weekDates.map((date, colIdx) => {
        const dayName = daysOfWeek[colIdx];
        const dateKey = formatDateKey(date);
        const schedules = scheduleData[dayName] || [];
        const normalizedFilter = normalizeAssociation(associationFilter);
        const filteredSchedules =
          selectedDoctor === "all"
            ? schedules
            : schedules.filter((s) => String(s.doctor) === selectedDoctor);
        const associationFilteredSchedules =
          associationFilter === "all"
            ? filteredSchedules
            : filteredSchedules.filter(
                (s) =>
                  normalizeAssociation(s.association_type) === normalizedFilter,
              );
        const events = associationFilteredSchedules
          .map((s) => {
            const [start, end] = parseTimeRange(s.time_slot_display);
            if (!start && !end) return null;
            return { ...s, start, end };
          })
          .filter(Boolean)
          .sort((a, b) => a.start - b.start || a.end - b.end);

        const laneEnds = [];
        events.forEach((event) => {
          const laneIndex = laneEnds.findIndex(
            (laneEnd) => laneEnd <= event.start,
          );
          if (laneIndex === -1) {
            event.lane = laneEnds.length;
            laneEnds.push(event.end);
          } else {
            event.lane = laneIndex;
            laneEnds[laneIndex] = event.end;
          }
        });

        events.forEach((event) => {
          let maxLane = event.lane;
          events.forEach((other) => {
            const overlaps = event.start < other.end && event.end > other.start;
            if (overlaps) {
              maxLane = Math.max(maxLane, other.lane);
            }
          });
          event.laneCount = maxLane + 1;
        });

        const maxLaneCount = events.length
          ? events.reduce(
              (max, event) => Math.max(max, event.laneCount || 1),
              1,
            )
          : 0;
        const minWidth = maxLaneCount
          ? Math.max(
              BASE_DAY_MIN_WIDTH,
              maxLaneCount * MIN_EVENT_CARD_WIDTH +
                EVENT_CARD_GAP_PX * Math.max(0, maxLaneCount - 1) +
                COLUMN_INNER_PADDING_PX * 2,
            )
          : BASE_DAY_MIN_WIDTH;
        const columnScale = minWidth / BASE_DAY_MIN_WIDTH;

        return {
          dayName,
          dateKey,
          events,
          columnScale,
          minWidth,
        };
      }),
    [weekDates, scheduleData, selectedDoctor, associationFilter],
  );

  const effectiveColWidths = dayColumns.map(
    (dayColumn, idx) => colWidths[idx] * dayColumn.columnScale,
  );
  const totalFlex =
    effectiveColWidths.reduce((sum, width) => sum + width, 0) || 1;
  const dayGridMinWidth = Math.max(
    920,
    dayColumns.reduce((sum, dayColumn) => sum + dayColumn.minWidth, 0),
  );
  const loadModalSchedules = async () => {
    if (!companyId) return;
    if (selectedDoctor === "all") return;
    setIsModalSchedulesLoading(true);
    setModalSchedulesError(null);
    try {
      const schedules = await getAllDoctorSchedules(companyId, selectedDoctor);
      const list = Array.isArray(schedules) ? schedules : [];
      setModalSchedules(list);
      const mergedSlots = {};
      list.forEach((schedule) => {
        const daySlots = schedule?.available_day_slots || {};
        Object.entries(daySlots).forEach(([day, slots]) => {
          const values = Array.isArray(slots) ? slots : [slots];
          const cleaned = values
            .map((slot) => Number(slot))
            .filter((slot) => Number.isFinite(slot));
          if (!mergedSlots[day]) mergedSlots[day] = [];
          cleaned.forEach((slot) => {
            if (!mergedSlots[day].includes(slot)) {
              mergedSlots[day].push(slot);
            }
          });
        });
      });
      if (!editingSchedule) {
        const days = Object.keys(mergedSlots);
        setAvailableDays(days);
        setDayTimeSlots(mergedSlots);
        if (list.length === 1 && list[0]?.association_type) {
          setAssociationType(list[0].association_type);
        }
      }
    } catch (err) {
      console.error("Failed to load doctor schedules:", err);
      setModalSchedulesError("Unable to load doctor schedules.");
    } finally {
      setIsModalSchedulesLoading(false);
    }
  };

  const resetScheduleForm = () => {
    setScheduleError(null);
    setAssociationType("");
    setAvailableDays([]);
    setDayTimeSlots({});
    setEditingSchedule(null);
    setEditingDay(null);
  };

  const openScheduleModal = () => {
    setScheduleError(null);
    resetScheduleForm();
    if (selectedDoctor !== "all") {
      const doctorSchedules = modalSchedules.filter(
        (schedule) => String(schedule.doctor) === selectedDoctor,
      );
      const assoc =
        doctorSchedules.find((schedule) => schedule.association_type)
          ?.association_type || "";
      setAssociationType(assoc);
    }
    setIsScheduleModalOpen(true);
  };

  const openEditScheduleModal = (schedule, dayName) => {
    if (!schedule) return;
    setScheduleError(null);
    const daySlots = schedule?.available_day_slots || {};
    const rawSlots = daySlots?.[dayName];
    const slots = Array.isArray(rawSlots)
      ? rawSlots
      : rawSlots !== undefined && rawSlots !== null
        ? [rawSlots]
        : [];
    const cleanedSlots = slots
      .map((slot) => Number(slot))
      .filter((slot) => Number.isFinite(slot));
    setEditingSchedule(schedule);
    setEditingDay(dayName || null);
    setAssociationType(schedule.association_type || "");
    setAvailableDays(dayName ? [dayName] : []);
    setDayTimeSlots(dayName ? { [dayName]: cleanedSlots } : {});
    setIsScheduleModalOpen(true);
  };

  const closeScheduleModal = () => {
    setIsScheduleModalOpen(false);
    resetScheduleForm();
  };
  useEffect(() => {
    if (isScheduleModalOpen && selectedDoctor !== "all") {
      loadModalSchedules();
    }
  }, [isScheduleModalOpen, selectedDoctor]);

  const toggleDaySlot = (day, slotId, isChecked) => {
    setDayTimeSlots((prev) => {
      const next = { ...prev };
      const current = Array.isArray(next[day]) ? [...next[day]] : [];
      if (isChecked) {
        if (editingSchedule) {
          next[day] = [slotId];
          return next;
        }
        if (!current.includes(slotId)) current.push(slotId);
      } else {
        const idx = current.indexOf(slotId);
        if (idx > -1) current.splice(idx, 1);
      }
      next[day] = current;
      return next;
    });
  };

  const getDaySlotLabels = (day) => {
    const ids = Array.isArray(dayTimeSlots[day]) ? dayTimeSlots[day] : [];
    if (!ids.length) return [];
    return timeSlots
      .filter((slot) => ids.includes(Number(slot.id)))
      .map(
        (slot) => slot.display_time || `${slot.start_time} - ${slot.end_time}`,
      );
  };

  const handleCreateSchedule = async () => {
    const isEditMode = Boolean(editingSchedule?.id);
    if (!companyId) {
      setScheduleError(
        "Missing company context. Please refresh and try again.",
      );
      return;
    }
    if (!isEditMode && selectedDoctor === "all") {
      setScheduleError("Please select a doctor first.");
      return;
    }
    if (!availableDays.length) {
      setScheduleError("Please select at least one day.");
      return;
    }
    const hasSlotForEveryDay = availableDays.every((day) => {
      const slots = dayTimeSlots[day];
      return Array.isArray(slots) && slots.length > 0;
    });
    if (!hasSlotForEveryDay) {
      setScheduleError("Each selected day must have at least one time slot.");
      return;
    }
    const normalizedDaySlots = availableDays.reduce((acc, day) => {
      const slots = dayTimeSlots[day] || [];
      const cleaned = slots
        .map((slot) => Number(slot))
        .filter((slot) => Number.isFinite(slot));
      if (cleaned.length) acc[day] = cleaned;
      return acc;
    }, {});
    setIsScheduleSubmitting(true);
    try {
      if (isEditMode) {
        const editDay = availableDays[0];
        const editSlots = normalizedDaySlots[editDay] || [];
        if (!editDay || editSlots.length !== 1) {
          setScheduleError("Select exactly one slot for the scheduled day.");
          setIsScheduleSubmitting(false);
          return;
        }
        await updateDoctorSchedule(editingSchedule.id, companyId, {
          association_type: associationType || undefined,
          available_day_slots: { [editDay]: editSlots[0] },
        });
      } else {
        const existingPairs = new Set();
        modalSchedules.forEach((schedule) => {
          const daySlots = schedule?.available_day_slots || {};
          Object.entries(daySlots).forEach(([day, slots]) => {
            const values = Array.isArray(slots) ? slots : [slots];
            values
              .map((slot) => Number(slot))
              .filter((slot) => Number.isFinite(slot))
              .forEach((slotId) => {
                existingPairs.add(`${day}-${slotId}`);
              });
          });
        });

        const daySlotPairs = availableDays.flatMap((day) => {
          const slots = dayTimeSlots[day] || [];
          return slots
            .map((slot) => Number(slot))
            .filter((slot) => Number.isFinite(slot))
            .map((slotId) => ({ day, slotId }))
            .filter(({ slotId }) => !existingPairs.has(`${day}-${slotId}`));
        });
        if (!daySlotPairs.length) {
          setScheduleError("Selected slots already exist for this doctor.");
          setIsScheduleSubmitting(false);
          return;
        }
        await Promise.all(
          daySlotPairs.map(({ day, slotId }) =>
            createDoctorSchedule(companyId, {
              doctor: Number(selectedDoctor),
              association_type: associationType || undefined,
              available_day_slots: { [day]: slotId },
              is_available: true,
            }),
          ),
        );
      }
      closeScheduleModal();
      fetchSchedules(companyId);
    } catch (err) {
      console.error("Failed to create doctor schedule:", err);
      setScheduleError("Unable to create schedule. Please try again.");
    } finally {
      setIsScheduleSubmitting(false);
    }
  };

  const handleToggleAbsent = async (schedule, dateKey) => {
    if (!companyId || !schedule?.id) return;
    const currentDates = Array.isArray(schedule.absent_dates)
      ? schedule.absent_dates
      : [];
    const isAbsent = currentDates.includes(dateKey);
    const nextDates = isAbsent
      ? currentDates.filter((d) => d !== dateKey)
      : [...currentDates, dateKey];
    try {
      await updateDoctorSchedule(schedule.id, companyId, {
        absent_dates: nextDates,
      });
      fetchSchedules(companyId);
    } catch (err) {
      console.error("Failed to toggle absent:", err);
    } finally {
      setOpenMenuKey(null);
    }
  };

  const handleDelistSchedule = async (schedule) => {
    if (!companyId || !schedule?.id) return;
    try {
      await updateDoctorSchedule(schedule.id, companyId, {
        delist: true,
      });
      fetchSchedules(companyId);
    } catch (err) {
      console.error("Failed to delist schedule:", err);
    } finally {
      setOpenMenuKey(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.closest("[data-schedule-menu]")) return;
      setOpenMenuKey(null);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, []);
  const doctorOptions = useMemo(() => {
    const normalizedFilter = normalizeAssociation(associationFilter);
    return [...approvedDoctors]
      .filter((doc) => {
        if (associationFilter === "all") return true;
        return normalizeAssociation(doc.association_type) === normalizedFilter;
      })
      .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [approvedDoctors, associationFilter]);

  useEffect(() => {
    if (selectedDoctor === "all") return;
    if (!doctorOptions.find((doc) => String(doc.id) === selectedDoctor)) {
      setSelectedDoctor("all");
    }
  }, [doctorOptions, selectedDoctor]);
  const selectedDoctorDetails = useMemo(() => {
    if (selectedDoctor === "all") return null;
    return (
      doctorOptions.find((doc) => String(doc.id) === selectedDoctor) || null
    );
  }, [doctorOptions, selectedDoctor]);

  /* =============== Render =============== */
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl shadow-sm mb-6 border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-blue-100">
            <Calendar className="text-blue-600" size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
              Doctor OPD Weekly Schedule
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Approved Doctor List:</span>
              <select
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 shadow-sm focus:border-blue-400 focus:outline-none"
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
              >
                <option value="all">All doctors</option>
                {doctorOptions.map((doctor) => (
                  <option key={doctor.id} value={String(doctor.id)}>
                    {doctor.full_name}
                  </option>
                ))}
              </select>
              <span className="font-medium">Doctor Type:</span>
              <select
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 shadow-sm focus:border-blue-400 focus:outline-none"
                value={associationFilter}
                onChange={(e) => setAssociationFilter(e.target.value)}
              >
                <option value="all">All types</option>
                <option value="Visiting Doctor">Visiting Doctor</option>
                <option value="Regular Doctor">Regular Doctor</option>
              </select>
              <button
                type="button"
                disabled={selectedDoctor === "all"}
                onClick={openScheduleModal}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                  selectedDoctor === "all"
                    ? "cursor-not-allowed bg-gray-200 text-gray-400"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                Add Scheduling
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2 sm:mt-0">
          <button
            onClick={handlePrevWeek}
            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-600">
            {`${getMonthName(
              currentDate,
            )} • ${weekDates[0].getDate()}–${weekDates[6].getDate()}`}
          </span>
          <button
            onClick={handleNextWeek}
            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ===== Calendar Body ===== */}
      <div ref={calendarRef} className="p-2 transition-all duration-300">
        {companyError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {companyError}
          </div>
        )}
        {isLoading && !companyError && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Loading schedules...
          </div>
        )}
        <div
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          style={{
            transformOrigin: "center top",
            transition: "transform 0.2s ease-out",
          }}
        >
          <div className="flex">
            <div className="w-[80px] shrink-0 border-r border-gray-200 bg-white">
              <div className="h-[2.9rem] border-b border-gray-200 bg-gray-50" />
              <div className="relative" style={{ height: `${BODY_REM}rem` }}>
                {Array.from({ length: endHour - startHour + 1 }, (_, i) => {
                  const hour = startHour + i;
                  return (
                    <div
                      key={`time-line-${hour}`}
                      className="absolute left-0 right-0 border-t border-gray-300"
                      style={{ top: `${i * ROW_REM}rem` }}
                    />
                  );
                })}
                {Array.from({ length: endHour - startHour + 1 }, (_, i) => {
                  const hour = startHour + i;
                  return (
                    <div
                      key={hour}
                      className="absolute text-[11px] text-gray-400 right-2 text-right"
                      style={{
                        top: `${i * ROW_REM}rem`,
                        transform: "translateY(-50%)",
                      }}
                    >
                      {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? "PM" : "AM"}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="overflow-hidden border-b border-gray-200 bg-white">
                <div
                  style={{
                    minWidth: `${dayGridMinWidth}px`,
                    transform: `translateX(-${dayBodyScrollLeft}px)`,
                    willChange: "transform",
                  }}
                >
                  <div className="flex">
                    {dayColumns.map((dayColumn, i) => (
                      <div
                        key={i}
                        className="relative px-[5px] text-center font-semibold text-gray-700 text-sm border-l border-gray-200"
                        style={{
                          flex: `${effectiveColWidths[i] / totalFlex}`,
                          minWidth: `${dayColumn.minWidth}px`,
                        }}
                      >
                        {dayColumn.dayName} <br />
                        <span className="font-normal text-gray-500 text-xs">
                          {weekDates[i].getDate()}
                        </span>
                        {i < 6 && (
                          <div
                            onMouseDown={(e) => startResize(i, e)}
                            className="absolute right-0 top-0 h-full w-[5px] cursor-col-resize hover:bg-blue-400 transition"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="overflow-x-auto overflow-y-hidden"
                onScroll={handleDayBodyScroll}
              >
                <div style={{ minWidth: `${dayGridMinWidth}px` }}>
                  <div
                    className="flex relative"
                    style={{ height: `${BODY_REM}rem` }}
                  >
                    {dayColumns.map((dayColumn, colIdx) => {
                      const { dayName, dateKey, events } = dayColumn;
                      return (
                        <div
                          key={dayName}
                          className="relative border-l border-gray-100 bg-white hover:bg-gray-50 transition-colors"
                          style={{
                            flex: `${effectiveColWidths[colIdx] / totalFlex}`,
                            minWidth: `${dayColumn.minWidth}px`,
                          }}
                        >
                          {Array.from(
                            { length: endHour - startHour + 1 },
                            (_, i) => {
                              const hour = startHour + i;
                              return (
                                <div
                                  key={hour}
                                  className="absolute left-0 right-0 border-t border-gray-300"
                                  style={{ top: `${i * ROW_REM}rem` }}
                                />
                              );
                            },
                          )}

                          {events.map((doc, idx) => {
                            const top = (doc.start - startHour) * ROW_REM;
                            const height = (doc.end - doc.start) * ROW_REM;
                            const laneCount = doc.laneCount || 1;
                            const totalGapPx = EVENT_CARD_GAP_PX * (laneCount - 1);
                            const totalColumnPaddingPx =
                              COLUMN_INNER_PADDING_PX * 2;
                            const laneWidthExpr = `((100% - ${
                              totalColumnPaddingPx + totalGapPx
                            }px) / ${laneCount})`;
                            const widthWithGap = `calc(${laneWidthExpr})`;
                            const leftWithGap = `calc(${
                              COLUMN_INNER_PADDING_PX +
                              doc.lane * EVENT_CARD_GAP_PX
                            }px + ${doc.lane} * ${laneWidthExpr})`;
                            const isAbsent = Array.isArray(doc.absent_dates)
                              ? doc.absent_dates.includes(dateKey)
                              : false;
                            const menuKey = `${doc.id}-${dayName}-${doc.start}-${idx}`;

                            return (
                              <div
                                key={menuKey}
                                className={`absolute rounded-lg shadow-sm text-xs p-2 ${
                                  isAbsent
                                    ? "border border-gray-300 bg-gray-300 text-gray-500 opacity-70"
                                    : "bg-blue-100 border-l-4 border-blue-600 text-blue-800"
                                }`}
                                style={{
                                  top: `${top}rem`,
                                  height: `${height}rem`,
                                  left: leftWithGap,
                                  width: widthWithGap,
                                }}
                              >
                                <div className="absolute right-1 top-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuKey((prev) =>
                                        prev === menuKey ? null : menuKey,
                                      );
                                    }}
                                    className={`rounded-full p-1 ${
                                      isAbsent
                                        ? "text-gray-500 hover:bg-gray-200"
                                        : "text-blue-700 hover:bg-blue-200"
                                    }`}
                                    data-schedule-menu
                                  >
                                    <MoreVertical size={14} />
                                  </button>
                                  {openMenuKey === menuKey && (
                                    <div
                                      className="absolute right-0 z-20 mt-1 w-28 rounded-md border border-gray-200 bg-white shadow-lg"
                                      onClick={(e) => e.stopPropagation()}
                                      data-schedule-menu
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleAbsent(doc, dateKey);
                                        }}
                                        className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                                      >
                                        {isAbsent ? "Present" : "Absent"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEditScheduleModal(doc, dayName);
                                          setOpenMenuKey(null);
                                        }}
                                        className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelistSchedule(doc);
                                        }}
                                        className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                                      >
                                        Delist
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <p className="text-[13px] font-semibold text-gray-900">
                                  {doc.time_slot_display}
                                </p>
                                <p className="text-[13px] font-semibold text-blue-700 mt-0.5">
                                  🩺 {doc.doctor_name}
                                </p>
                                <p className="text-[12px] font-medium text-gray-700">
                                  {doc.doctor_department}
                                </p>
                                <p className="text-[12px] italic text-gray-600 mt-0.5">
                                  {doc.association_type}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {editingSchedule
                    ? "Edit Doctor Schedule"
                    : "Create Doctor Schedule"}
                </h2>
                <p className="text-xs text-gray-500">
                  {editingSchedule?.doctor_name
                    ? `Doctor: ${editingSchedule.doctor_name}`
                    : selectedDoctorDetails
                      ? `Doctor: ${selectedDoctorDetails.full_name}`
                      : "Select a doctor to continue."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeScheduleModal}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-200"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
              {scheduleError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {scheduleError}
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Association Type
                  </label>
                  <select
                    value={associationType}
                    onChange={(e) => setAssociationType(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select association type</option>
                    <option value="Visiting Doctor">Visiting Doctor</option>
                    <option value="Regular Doctor">Regular Doctor</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Selected Days
                  </label>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {availableDays.length
                      ? availableDays.join(", ")
                      : "No days selected"}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Available Days & Time Slots
                </label>
                <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/70 p-3">
                  {daysOfWeek.map((day) => (
                    <div
                      key={day}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 transition ${
                        availableDays.includes(day)
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-blue-200"
                      }`}
                    >
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          value={day}
                          checked={availableDays.includes(day)}
                          disabled={Boolean(editingSchedule)}
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
                        <span className="font-medium text-gray-700">{day}</span>
                      </label>

                      {availableDays.includes(day) && (
                        <div className="flex w-full flex-col gap-2 sm:w-96">
                          {timeSlots.length === 0 ? (
                            <div className="text-xs text-gray-500">
                              No time slots available.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                              {timeSlots.map((slot) => {
                                const slotId = Number(slot.id);
                                const isChecked = Array.isArray(
                                  dayTimeSlots[day],
                                )
                                  ? dayTimeSlots[day].includes(slotId)
                                  : false;
                                const isEditLocked =
                                  editingSchedule && editingDay !== day;
                                return (
                                  <label
                                    key={`${day}-${slot.id}`}
                                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs sm:text-sm cursor-pointer ${
                                      isChecked
                                        ? "border-blue-400 bg-blue-50 text-blue-700"
                                        : "border-gray-200 hover:border-blue-200"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="accent-blue-500 h-4 w-4"
                                      checked={isChecked}
                                      disabled={isEditLocked}
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
                          )}
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
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={closeScheduleModal}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateSchedule}
                disabled={
                  isScheduleSubmitting ||
                  selectedDoctor === "all" ||
                  timeSlots.length === 0
                }
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                  isScheduleSubmitting ||
                  selectedDoctor === "all" ||
                  timeSlots.length === 0
                    ? "cursor-not-allowed bg-gray-300"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isScheduleSubmitting
                  ? "Saving..."
                  : editingSchedule
                    ? "Update Schedule"
                    : "Create Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
