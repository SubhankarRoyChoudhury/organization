"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  get_Hospital_User_Login_Details,
  getAllActiveCompanyUser,
  getCompanyUserDetailsByUsername,
  getApprovedDepartments,
  getApprovedDoctorTypes,
  getApprovedAdministratorTypes,
  getApprovedStaffDepartments,
  getApprovedStaffJobTitles,
  getDutyRoasters,
  createDutyRoaster,
  updateDutyRoaster,
} from "@/app/api/apiService";

/**
 * Shift codes:
 * M = Morning, E = Evening, N = Night, O = Off, C = On-call
 */
const SHIFT_META = {
  M: {
    label: "Morning",
    className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  G: {
    label: "General",
    className: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    dot: "bg-sky-500",
  },
  E: {
    label: "Evening",
    className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-500",
  },
  N: {
    label: "Night",
    className: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    dot: "bg-indigo-500",
  },
  O: {
    label: "Off",
    className: "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
    dot: "bg-slate-500",
  },
  C: {
    label: "On-call",
    className: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    dot: "bg-rose-500",
  },
};

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // Monday as start
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d, days) {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

function toISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatRange(start, end) {
  const fmt = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function weekdayLabel(d) {
  const wd = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d);
  const day = String(d.getDate()).padStart(2, "0");
  return `${wd} ${day}`;
}

function makeWeekDays(anchor) {
  const s = startOfWeek(anchor);
  return Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(s, i);
    return { dateISO: toISODate(date), label: weekdayLabel(date) };
  });
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatPickerDate(value) {
  if (!value) {
    return "";
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatTimeValue(value) {
  if (!value) return "";
  const raw = typeof value === "string" ? value.trim() : value;
  let date;
  if (raw instanceof Date) {
    date = raw;
  } else if (typeof raw === "string") {
    const withSeconds = raw.length === 5 ? `${raw}:00` : raw;
    date = new Date(`1970-01-01T${withSeconds}`);
  }
  if (!date || Number.isNaN(date.getTime())) {
    return typeof raw === "string" ? raw : "";
  }
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeInputValue(value) {
  if (!value) return "";
  if (typeof value === "string") {
    return value.slice(0, 5);
  }
  try {
    return value.toTimeString().slice(0, 5);
  } catch {
    return "";
  }
}

function addDaysToISODate(value, offsetDays) {
  if (!value) return "";
  const base = new Date(value);
  if (Number.isNaN(base.getTime())) return "";
  base.setDate(base.getDate() + offsetDays);
  return toISODate(base);
}

function normalizeRoleValue(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw) return "";
  if (raw.includes("admin")) return "administrator";
  if (raw.includes("doctor")) return "doctor";
  if (raw.includes("staff")) return "staff";
  return raw;
}

export default function DutyRosterPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const disableAddDuty = searchParams?.get("from") === "staff";
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [department, setDepartment] = useState("All");
  const [role, setRole] = useState("All");
  const [query, setQuery] = useState("");
  const [showLegend, setShowLegend] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const calendarRef = useRef(null);
  const [companyId, setCompanyId] = useState(null);
  const [isCompanyContextLoading, setIsCompanyContextLoading] = useState(true);
  const [companyContextError, setCompanyContextError] = useState("");
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [loggedInUsername, setLoggedInUsername] = useState("");
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [usersLoadError, setUsersLoadError] = useState("");
  const [isUserDetailsLoading, setIsUserDetailsLoading] = useState(false);
  const [userDetailsError, setUserDetailsError] = useState("");
  const [departments, setDepartments] = useState([]);
  const [doctorTypes, setDoctorTypes] = useState([]);
  const [adminTypes, setAdminTypes] = useState([]);
  const [staffDepartments, setStaffDepartments] = useState([]);
  const [staffJobTitles, setStaffJobTitles] = useState([]);
  const [isReferenceDataLoading, setIsReferenceDataLoading] = useState(false);
  const [referenceDataError, setReferenceDataError] = useState("");
  const [dutyRoasters, setDutyRoasters] = useState([]);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const [isInitialPageReady, setIsInitialPageReady] = useState(false);
  const [editingDutyId, setEditingDutyId] = useState(null);
  const [selectedShiftKeys, setSelectedShiftKeys] = useState([]);
  const [formData, setFormData] = useState({
    staffId: "",
    role: "",
    department: "",
    doctor_type: "",
    administration_type: "",
    job_title: "",
    staff_department: "",
    staff_job_title: "",
    date: "",
    shift: "M",
    time_slot: "",
    on_call_time: "",
    extra_days: "",
    notes: "",
  });

  const days = useMemo(() => makeWeekDays(anchorDate), [anchorDate]);

  const normalizeUsername = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase();

  const normalizeText = (value) => String(value ?? "").trim();

  const getUserOptionLabel = (user) => {
    const baseName =
      user?.name || user?.username || `User #${user?.id ?? ""}`;
    const userRoleRaw = user?.role?.name ?? user?.role ?? user?.user_type ?? "";
    let userRoleKey = normalizeRoleValue(userRoleRaw);
    if (
      !userRoleKey &&
      (user?.doctor_type_id ||
        user?.doctor_type ||
        user?.doctor_type_name ||
        user?.department_id ||
        user?.department ||
        user?.department_name)
    ) {
      userRoleKey = "doctor";
    }
    const doctorDepartment =
      userRoleKey === "doctor"
        ? normalizeText(user?.department_name ?? user?.department?.name ?? "")
        : "";
    const jobTitle = normalizeText(user?.job_title);
    const staffJobTitle = normalizeText(
      user?.staff_job_title_name ??
        user?.staff_job_title?.name ??
        user?.staff_job_title?.title ??
        user?.staff_job_title,
    );
    const titleParts = Array.from(
      new Set([doctorDepartment, jobTitle, staffJobTitle].filter(Boolean)),
    );
    if (!titleParts.length) {
      return baseName;
    }
    return `${baseName} (${titleParts.join(" / ")})`;
  };

  const resolveLookupId = useCallback((rawValue, list) => {
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      return "";
    }
    const sourceValue =
      typeof rawValue === "object"
        ? (rawValue?.id ??
          rawValue?.staff_job_title_id ??
          rawValue?.staff_department_id ??
          rawValue?.department_id ??
          rawValue?.doctor_type_id ??
          rawValue?.administration_type_id ??
          rawValue?.value ??
          rawValue?.pk ??
          rawValue?.name ??
          rawValue?.label ??
          "")
        : rawValue;
    const normalizedRaw = String(sourceValue).trim();
    if (!normalizedRaw) {
      return "";
    }
    const numericRaw = Number(normalizedRaw);
    if (Number.isFinite(numericRaw)) {
      return String(numericRaw);
    }
    if (/^\d+$/.test(normalizedRaw)) {
      return normalizedRaw;
    }
    const matched = (Array.isArray(list) ? list : []).find(
      (item) =>
        String(item?.id ?? "").trim() === normalizedRaw ||
        String(item?.name ?? item?.title ?? item?.label ?? "")
          .trim()
          .toLowerCase() === normalizedRaw.toLowerCase(),
    );
    return matched?.id ? String(matched.id) : "";
  }, []);

  const resolveLookupName = useCallback((rawValue, list) => {
    const toText = (value) => String(value ?? "").trim();
    const resolvedId = resolveLookupId(rawValue, list);
    if (resolvedId) {
      const matched = (Array.isArray(list) ? list : []).find(
        (item) => String(item?.id ?? "") === String(resolvedId),
      );
      const name = toText(matched?.name);
      if (name) return name;
    }
    if (rawValue && typeof rawValue === "object") {
      return toText(rawValue?.name ?? rawValue?.label ?? rawValue?.title);
    }
    return toText(rawValue);
  }, [resolveLookupId]);

  const isCompanyUserAdmin = useCallback((user) => {
    const rawAdmin = user?.is_admin;
    if (rawAdmin === true || rawAdmin === 1) {
      return true;
    }
    const normalized = String(rawAdmin ?? "")
      .trim()
      .toLowerCase();
    return normalized === "true" || normalized === "1";
  }, []);

  const getStaffDepartmentIdFromTitleId = (titleId) => {
    if (!titleId) return "";
    const matchedTitle = (
      Array.isArray(staffJobTitles) ? staffJobTitles : []
    ).find((title) => String(title?.id ?? "") === String(titleId));
    if (!matchedTitle) return "";
    return (
      resolveLookupId(
        matchedTitle?.staff_department?.id ??
          matchedTitle?.staff_department_id ??
          matchedTitle?.staff_department ??
          matchedTitle?.staff_department_name ??
          "",
        staffDepartments,
      ) || ""
    );
  };

  const normalizedLoggedInUsername = useMemo(
    () => normalizeUsername(loggedInUsername),
    [loggedInUsername],
  );

  const scopedDutyRoasters = useMemo(() => {
    if (isAdminUser) {
      return dutyRoasters;
    }
    if (!loggedInUserId && !normalizedLoggedInUsername) {
      return dutyRoasters;
    }
    return dutyRoasters.filter((entry) => {
      const staffId = entry?.staff ?? entry?.staff_id ?? entry?.staff?.id ?? "";
      if (loggedInUserId && String(staffId) === String(loggedInUserId)) {
        return true;
      }
      if (normalizedLoggedInUsername) {
        const staffUsername = normalizeUsername(
          entry?.staff_username ?? entry?.username,
        );
        const staffName = normalizeUsername(entry?.staff_name);
        return (
          staffUsername === normalizedLoggedInUsername ||
          staffName === normalizedLoggedInUsername
        );
      }
      return false;
    });
  }, [dutyRoasters, loggedInUserId, normalizedLoggedInUsername, isAdminUser]);

  const shiftFilteredDutyRoasters = useMemo(() => {
    if (!selectedShiftKeys.length) {
      return scopedDutyRoasters;
    }
    return scopedDutyRoasters.filter((entry) =>
      selectedShiftKeys.includes(String(entry?.shift ?? "")),
    );
  }, [scopedDutyRoasters, selectedShiftKeys]);

  const rosterStaff = useMemo(() => {
    const map = new Map();
    shiftFilteredDutyRoasters.forEach((entry) => {
      const staffId = String(entry.staff);
      const staffJobTitleId =
        entry?.staff_job_title?.id ?? entry?.staff_job_title ?? "";
      const staffJobTitleFromReference =
        (Array.isArray(staffJobTitles) ? staffJobTitles : []).find(
          (title) => String(title?.id) === String(staffJobTitleId),
        )?.name || "";
      const resolvedStaffJobTitle =
        entry?.staff_job_title_name ||
        entry?.staff_job_title__name ||
        staffJobTitleFromReference ||
        entry?.job_title ||
        "";
      if (map.has(staffId)) {
        const existing = map.get(staffId);
        if (!existing.staffJobTitle && resolvedStaffJobTitle) {
          map.set(staffId, {
            ...existing,
            staffJobTitle: resolvedStaffJobTitle,
          });
        }
        return;
      }
      const roleLabel = entry.role || "—";
      map.set(staffId, {
        id: staffId,
        name:
          entry.staff_name || entry.staff_username || `User #${entry.staff}`,
        role: roleLabel,
        roleKey: normalizeRoleValue(roleLabel),
        department: entry.department_name || "",
        administrationType: entry.administration_type_name || "",
        staffDepartment: entry.staff_department_name || "",
        staffJobTitle: resolvedStaffJobTitle,
      });
    });
    return Array.from(map.values());
  }, [shiftFilteredDutyRoasters, staffJobTitles]);

  const filteredStaff = useMemo(() => {
    const q = query.trim().toLowerCase();
    const roleKey = normalizeRoleValue(role);
    return rosterStaff.filter((s) => {
      const roleOk = role === "All" ? true : s.roleKey === roleKey;
      let deptOk = true;
      if (department !== "All") {
        if (role === "Doctor") {
          deptOk = s.department === department;
        } else if (role === "Administrator") {
          deptOk = s.administrationType === department;
        } else if (role === "Staff") {
          deptOk = s.staffDepartment === department;
        } else {
          deptOk =
            s.department === department ||
            s.administrationType === department ||
            s.staffDepartment === department;
        }
      }
      const qOk =
        q.length === 0 ||
        s.name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.administrationType.toLowerCase().includes(q) ||
        s.staffDepartment.toLowerCase().includes(q) ||
        s.staffJobTitle.toLowerCase().includes(q);
      return deptOk && roleOk && qOk;
    });
  }, [department, role, query, rosterStaff]);

  const filteredModalUsers = useMemo(() => {
    const selectedRoleKey = role === "All" ? "" : normalizeRoleValue(role);
    return (Array.isArray(companyUsers) ? companyUsers : []).filter((user) => {
      if (isCompanyUserAdmin(user)) {
        return false;
      }
      const userRoleRaw = user?.role?.name ?? user?.role ?? user?.user_type ?? "";
      const normalizedUserRole = normalizeRoleValue(userRoleRaw);
      let userRoleKey = normalizedUserRole;
      if (!userRoleKey) {
        if (
          user?.staff_department_id ||
          user?.staff_department ||
          user?.staff_department_name ||
          user?.staff_job_title_id ||
          user?.staff_job_title ||
          user?.staff_job_title_name
        ) {
          userRoleKey = "staff";
        } else if (
          user?.administration_type_id ||
          user?.administration_type ||
          user?.administration_type_name
        ) {
          userRoleKey = "administrator";
        } else if (
          user?.doctor_type_id ||
          user?.doctor_type ||
          user?.doctor_type_name ||
          user?.department_id ||
          user?.department ||
          user?.department_name
        ) {
          userRoleKey = "doctor";
        }
      }

      if (selectedRoleKey && userRoleKey !== selectedRoleKey) {
        return false;
      }
      if (department === "All") {
        return true;
      }

      if (selectedRoleKey === "doctor") {
        const doctorDepartmentName = resolveLookupName(
          user?.department_name ?? user?.department_id ?? user?.department ?? "",
          departments,
        );
        return doctorDepartmentName === department;
      }

      if (selectedRoleKey === "administrator") {
        const administrationTypeName = resolveLookupName(
          user?.administration_type_name ??
            user?.administration_type_id ??
            user?.administration_type ??
            "",
          adminTypes,
        );
        return administrationTypeName === department;
      }

      if (selectedRoleKey === "staff") {
        const staffDepartmentName = resolveLookupName(
          user?.staff_department_name ??
            user?.staff_department_id ??
            user?.staff_department ??
            "",
          staffDepartments,
        );
        return staffDepartmentName === department;
      }

      return true;
    });
  }, [
    companyUsers,
    role,
    department,
    departments,
    adminTypes,
    staffDepartments,
    resolveLookupName,
    isCompanyUserAdmin,
  ]);

  const modalUserOptions = useMemo(() => {
    if (!formData.staffId) {
      return filteredModalUsers;
    }
    const alreadyIncluded = filteredModalUsers.some(
      (user) => String(user?.id ?? "") === String(formData.staffId),
    );
    if (alreadyIncluded) {
      return filteredModalUsers;
    }
    const selectedUser = (Array.isArray(companyUsers) ? companyUsers : []).find(
      (user) => String(user?.id ?? "") === String(formData.staffId),
    );
    if (!selectedUser) {
      return filteredModalUsers;
    }
    if (isCompanyUserAdmin(selectedUser)) {
      return filteredModalUsers;
    }
    return [selectedUser, ...filteredModalUsers];
  }, [formData.staffId, filteredModalUsers, companyUsers, isCompanyUserAdmin]);

  const assignmentsByStaff = useMemo(() => {
    const map = {};
    shiftFilteredDutyRoasters.forEach((entry) => {
      const staffId = String(entry.staff);
      const dateKey = entry.duty_date;
      if (!staffId || !dateKey) return;
      if (!map[staffId]) map[staffId] = {};
      map[staffId][dateKey] = {
        id: entry.id,
        shift: entry.shift,
        time_slot: entry.time_slot,
        on_call_time: entry.on_call_time,
        role: entry.role,
        department: entry.department,
        doctor_type: entry.doctor_type,
        administration_type: entry.administration_type,
        job_title: entry.job_title,
        staff_department: entry.staff_department,
        staff_job_title: entry.staff_job_title,
        notes: entry.notes,
      };
    });
    return map;
  }, [shiftFilteredDutyRoasters]);

  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const moveWeek = (dir) => setAnchorDate((d) => addDays(d, dir * 7));
  const resetForm = () =>
    setFormData({
      staffId: "",
      role: "",
      department: "",
      doctor_type: "",
      administration_type: "",
      job_title: "",
      staff_department: "",
      staff_job_title: "",
      date: "",
      shift: "M",
      time_slot: "",
      on_call_time: "",
      extra_days: "",
      notes: "",
    });
  const fetchCompanyUsers = () => {
    if (!companyId) return;
    setIsUsersLoading(true);
    setUsersLoadError("");
    getAllActiveCompanyUser(companyId)
      .then((users) => {
        setCompanyUsers(Array.isArray(users) ? users : []);
      })
      .catch((error) => {
        console.error("Unable to load company users:", error);
        setCompanyUsers([]);
        setUsersLoadError("Unable to load users.");
      })
      .finally(() => setIsUsersLoading(false));
  };

  const openAddModal = () => {
    resetForm();
    setEditingDutyId(null);
    setUsersLoadError("");
    if (companyUsers.length === 0) {
      fetchCompanyUsers();
    }
    setShowAddModal(true);
  };
  const closeAddModal = () => setShowAddModal(false);
  const handleFormChange = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  const handleShiftChange = (e) => {
    const nextShift = e.target.value;
    setFormData((prev) => ({
      ...prev,
      shift: nextShift,
      time_slot: "",
      on_call_time: "",
    }));
  };
  const handleUserSelect = async (event) => {
    const selectedId = event.target.value;
    const selectedUser = companyUsers.find(
      (user) => String(user.id) === String(selectedId),
    );
    const selectedUserRoleRaw =
      selectedUser?.role ?? selectedUser?.user_type ?? "";
    const selectedUserRole =
      typeof selectedUserRoleRaw === "object"
        ? (selectedUserRoleRaw?.name ??
          selectedUserRoleRaw?.label ??
          selectedUserRoleRaw?.value ??
          "")
        : selectedUserRoleRaw;
    const baseRole =
      selectedUserRole ||
      (selectedUser?.staff_department_id ||
      selectedUser?.staff_department ||
      selectedUser?.staff_department_name ||
      selectedUser?.staff_job_title_id ||
      selectedUser?.staff_job_title ||
      selectedUser?.staff_job_title_name
        ? "staff"
        : selectedUser?.administration_type_id ||
            selectedUser?.administration_type ||
            selectedUser?.administration_type_name
          ? "administration"
          : selectedUser?.doctor_type_id ||
              selectedUser?.doctor_type ||
              selectedUser?.doctor_type_name
            ? "doctor"
            : "");
    const baseDepartment =
      resolveLookupId(
        selectedUser?.department_id ??
          selectedUser?.department ??
          selectedUser?.department_name ??
          "",
        departments,
      ) || "";
    const baseDoctorType =
      resolveLookupId(
        selectedUser?.doctor_type_id ??
          selectedUser?.doctor_type ??
          selectedUser?.doctor_type_name ??
          "",
        doctorTypes,
      ) || "";
    const baseAdministrationType =
      resolveLookupId(
        selectedUser?.administration_type_id ??
          selectedUser?.administration_type ??
          selectedUser?.administration_type_name ??
          "",
        adminTypes,
      ) || "";
    const baseStaffDepartment =
      resolveLookupId(
        selectedUser?.staff_department_id ??
          selectedUser?.staff_department ??
          selectedUser?.staff_department_name ??
          "",
        staffDepartments,
      ) || "";
    const baseStaffJobTitle =
      resolveLookupId(
        selectedUser?.staff_job_title_id ??
          selectedUser?.staff_job_title ??
          selectedUser?.staff_job_title_name ??
          "",
        staffJobTitles,
      ) || "";
    const inferredBaseStaffDepartment =
      baseStaffDepartment || getStaffDepartmentIdFromTitleId(baseStaffJobTitle);
    setFormData((prev) => ({
      ...prev,
      staffId: selectedId,
      role: baseRole ? String(baseRole) : "",
      department: baseDepartment ? String(baseDepartment) : "",
      doctor_type: baseDoctorType ? String(baseDoctorType) : "",
      administration_type: baseAdministrationType
        ? String(baseAdministrationType)
        : "",
      job_title: selectedUser?.job_title || "",
      staff_department: inferredBaseStaffDepartment
        ? String(inferredBaseStaffDepartment)
        : "",
      staff_job_title: baseStaffJobTitle ? String(baseStaffJobTitle) : "",
    }));
    setUserDetailsError("");
    if (!selectedUser?.username) {
      return;
    }
    setIsUserDetailsLoading(true);
    try {
      const detailsList = await getCompanyUserDetailsByUsername(
        selectedUser.username,
      );
      const detailCandidates = Array.isArray(detailsList)
        ? detailsList
        : detailsList
          ? [detailsList]
          : [];
      const details = detailCandidates.find(
        (entry) => String(entry?.id) === String(selectedId),
      );
      if (!details) {
        setUserDetailsError(
          "Unable to map user details for selected staff ID.",
        );
        return;
      }
      const roleValue =
        details?.role ||
        baseRole ||
        (details?.staff_department_id || details?.staff_department
          ? "staff"
          : details?.administration_type_id || details?.administration_type
            ? "administration"
            : details?.doctor_type_id || details?.doctor_type
              ? "doctor"
              : "");
      const departmentValue =
        details?.department_id ?? details?.department ?? baseDepartment;
      const doctorTypeValue =
        details?.doctor_type_id ?? details?.doctor_type ?? baseDoctorType;
      const administrationTypeValue =
        details?.administration_type_id ??
        details?.administration_type ??
        baseAdministrationType;
      const staffJobTitleValue =
        resolveLookupId(
          details?.staff_job_title_id ??
            details?.staff_job_title ??
            details?.staff_job_title_name ??
            baseStaffJobTitle,
          staffJobTitles,
        ) || (baseStaffJobTitle ? String(baseStaffJobTitle) : "");
      const staffDepartmentValue =
        resolveLookupId(
          details?.staff_department_id ??
            details?.staff_department ??
            details?.staff_department_name ??
            baseStaffDepartment,
          staffDepartments,
        ) ||
        getStaffDepartmentIdFromTitleId(staffJobTitleValue) ||
        (baseStaffDepartment ? String(baseStaffDepartment) : "");
      setFormData((prev) => ({
        ...prev,
        staffId: selectedId,
        role: roleValue ? String(roleValue) : "",
        department: departmentValue ? String(departmentValue) : "",
        doctor_type: doctorTypeValue ? String(doctorTypeValue) : "",
        administration_type: administrationTypeValue
          ? String(administrationTypeValue)
          : "",
        job_title: details?.job_title || selectedUser?.job_title || "",
        staff_department: staffDepartmentValue
          ? String(staffDepartmentValue)
          : "",
        staff_job_title: staffJobTitleValue ? String(staffJobTitleValue) : "",
      }));
    } catch (error) {
      console.error("Unable to load company user details:", error);
      setUserDetailsError("Unable to load user details.");
    } finally {
      setIsUserDetailsLoading(false);
    }
  };
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const {
      staffId,
      role: newRole,
      department: newDept,
      date,
      shift,
      time_slot,
      on_call_time,
      extra_days,
      doctor_type,
      administration_type,
      job_title,
      staff_department,
      staff_job_title,
      notes,
    } = formData;
    if (!staffId || !date || !companyId) {
      return;
    }
    const payload = {
      staff: staffId,
      role: newRole,
      department: newDept || null,
      doctor_type: doctor_type || null,
      administration_type: administration_type || null,
      job_title: job_title || "",
      staff_department: staff_department || null,
      staff_job_title: staff_job_title || null,
      duty_date: date,
      shift,
      time_slot: time_slot || "",
      on_call_time: on_call_time || "",
      notes: notes || "",
    };
    try {
      if (editingDutyId) {
        await updateDutyRoaster(editingDutyId, payload, companyId);
      } else {
        const extraDays = Number(extra_days) || 0;
        const daysToCreate = Array.from({ length: extraDays + 1 }, (_, idx) =>
          addDaysToISODate(date, idx),
        ).filter(Boolean);
        await Promise.all(
          daysToCreate.map((dutyDate) =>
            createDutyRoaster(
              {
                ...payload,
                duty_date: dutyDate,
              },
              companyId,
            ),
          ),
        );
      }
      const start_date = toISODate(weekStart);
      const end_date = toISODate(weekEnd);
      setIsRosterLoading(true);
      setRosterError("");
      const data = await getDutyRoasters(companyId, { start_date, end_date });
      setDutyRoasters(Array.isArray(data) ? data : []);
      closeAddModal();
    } catch (error) {
      console.error("Unable to save duty roaster:", error);
      setRosterError("Unable to save duty roaster.");
    } finally {
      setIsRosterLoading(false);
    }
  };

  const handleEditDuty = (staffId, dutyDate) => {
    const assignment =
      assignmentsByStaff[staffId] && assignmentsByStaff[staffId][dutyDate];
    if (!assignment) return;
    setEditingDutyId(assignment.id || null);
    setUsersLoadError("");
    if (companyUsers.length === 0) {
      fetchCompanyUsers();
    }
    setFormData((prev) => ({
      ...prev,
      staffId,
      role: assignment.role || "",
      department: assignment.department || "",
      doctor_type: assignment.doctor_type || "",
      administration_type: assignment.administration_type || "",
      job_title: assignment.job_title || "",
      staff_department: assignment.staff_department || "",
      staff_job_title: assignment.staff_job_title || "",
      date: dutyDate,
      shift: assignment.shift || "M",
      time_slot: assignment.time_slot || "",
      on_call_time: formatTimeInputValue(assignment.on_call_time),
      notes: assignment.notes || "",
    }));
    setShowAddModal(true);
  };

  useEffect(() => {
    if (!calendarOpen) {
      return;
    }
    const handler = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [calendarOpen]);

  useEffect(() => {
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (username) {
      setLoggedInUsername(username);
    }
    if (!username) {
      setCompanyContextError("Missing company context. Please login again.");
      setIsCompanyContextLoading(false);
      return;
    }
    setIsCompanyContextLoading(true);
    setCompanyContextError("");
    get_Hospital_User_Login_Details(username)
      .then((data) => {
        const userDetails = data?.user ?? data ?? {};
        const roleRaw = String(
          userDetails?.role ?? data?.role ?? "",
        ).toLowerCase();
        const userTypeRaw = String(
          userDetails?.user_type ?? data?.user_type ?? "",
        ).toLowerCase();
        const rolesList = Array.isArray(userDetails?.roles)
          ? userDetails.roles
          : Array.isArray(data?.roles)
            ? data.roles
            : [];
        const hasStaffRole = rolesList.some((r) =>
          String(r?.name ?? r ?? "")
            .toLowerCase()
            .includes("staff"),
        );
        const isSuperuser = Boolean(
          userDetails?.is_superuser ?? data?.is_superuser,
        );
        const isCompanyAdmin = Array.isArray(data?.companies)
          ? data.companies.some((company) => company?.is_admin === true)
          : data?.companies?.is_admin === true;
        const adminFlag =
          isSuperuser ||
          isCompanyAdmin ||
          userTypeRaw.includes("admin") ||
          userTypeRaw.includes("company_admin") ||
          roleRaw.includes("admin") ||
          roleRaw.includes("administration");
        if (hasStaffRole) {
          setIsAdminUser(false);
        } else {
          setIsAdminUser(adminFlag);
        }
        const resolvedUserId =
          userDetails?.id ?? data?.user_id ?? data?.id ?? null;
        if (resolvedUserId) {
          setLoggedInUserId(resolvedUserId);
        }
        const resolvedUsername =
          userDetails?.username ??
          userDetails?.user_name ??
          data?.username ??
          username;
        if (resolvedUsername) {
          setLoggedInUsername(resolvedUsername);
        }
        const resolvedCompanyId =
          data?.company_id || data?.companies?.[0]?.company_id || localStorage.getItem("company_id");
        if (resolvedCompanyId) {
          setCompanyId(resolvedCompanyId);
          setCompanyContextError("");
        } else {
          setCompanyContextError("Unable to determine company context.");
        }
      })
      .catch((error) => {
        console.error("Error fetching user details:", error);
        setCompanyContextError("Unable to load user context.");
      })
      .finally(() => {
        setIsCompanyContextLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!companyId) return;
    fetchCompanyUsers();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    setIsReferenceDataLoading(true);
    setReferenceDataError("");
    Promise.allSettled([
      getApprovedDepartments(companyId),
      getApprovedDoctorTypes(companyId),
      getApprovedAdministratorTypes(companyId),
      getApprovedStaffDepartments(companyId),
      getApprovedStaffJobTitles(companyId),
    ])
      .then(
        ([
          departmentsResult,
          doctorTypesResult,
          adminTypesResult,
          staffDepartmentsResult,
          staffJobTitlesResult,
        ]) => {
          setDepartments(
            departmentsResult.status === "fulfilled" &&
              Array.isArray(departmentsResult.value)
              ? departmentsResult.value
              : [],
          );
          setDoctorTypes(
            doctorTypesResult.status === "fulfilled" &&
              Array.isArray(doctorTypesResult.value)
              ? doctorTypesResult.value
              : [],
          );
          setAdminTypes(
            adminTypesResult.status === "fulfilled" &&
              Array.isArray(adminTypesResult.value)
              ? adminTypesResult.value
              : [],
          );
          setStaffDepartments(
            staffDepartmentsResult.status === "fulfilled" &&
              Array.isArray(staffDepartmentsResult.value)
              ? staffDepartmentsResult.value
              : [],
          );
          setStaffJobTitles(
            staffJobTitlesResult.status === "fulfilled" &&
              Array.isArray(staffJobTitlesResult.value)
              ? staffJobTitlesResult.value
              : [],
          );
          const hasFailure = [
            departmentsResult,
            doctorTypesResult,
            adminTypesResult,
            staffDepartmentsResult,
            staffJobTitlesResult,
          ].some((result) => result.status === "rejected");
          if (hasFailure) {
            setReferenceDataError("Unable to load reference data.");
          }
        },
      )
      .catch((error) => {
        console.error("Unable to load reference data:", error);
        setDepartments([]);
        setDoctorTypes([]);
        setAdminTypes([]);
        setStaffDepartments([]);
        setStaffJobTitles([]);
        setReferenceDataError("Unable to load reference data.");
      })
      .finally(() => {
        setIsReferenceDataLoading(false);
      });
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    const start_date = toISODate(weekStart);
    const end_date = toISODate(weekEnd);
    setIsRosterLoading(true);
    setRosterError("");
    getDutyRoasters(companyId, { start_date, end_date })
      .then((data) => {
        setDutyRoasters(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Unable to load duty roaster:", error);
        setDutyRoasters([]);
        setRosterError("Unable to load duty roster.");
      })
      .finally(() => setIsRosterLoading(false));
  }, [companyId, weekStart, weekEnd]);

  const selectedRole = normalizeRoleValue(formData.role);
  const isOnCallShift = formData.shift === "C";
  const timeSlotOptions = useMemo(() => {
    switch (formData.shift) {
      case "M":
        return ["6AM to 2PM", "6AM to 6PM"];
      case "E":
        return ["2PM to 10PM"];
      case "N":
        return ["8PM to 8AM", "10PM to 6AM"];
      case "G":
        return ["8AM - 5PM", "8AM - 8PM"];
      default:
        return [];
    }
  }, [formData.shift]);
  const filteredStaffJobTitles = useMemo(() => {
    const baseList = !formData.staff_department
      ? staffJobTitles
      : staffJobTitles.filter((title) => {
          const departmentId =
            title?.staff_department?.id ??
            title?.staff_department_id ??
            title?.staff_department ??
            "";
          return String(departmentId) === String(formData.staff_department);
        });
    if (!formData.staff_job_title) {
      return baseList;
    }
    const hasSelected = baseList.some(
      (title) => String(title?.id ?? "") === String(formData.staff_job_title),
    );
    if (hasSelected) {
      return baseList;
    }
    const selectedFromAll = staffJobTitles.find(
      (title) => String(title?.id ?? "") === String(formData.staff_job_title),
    );
    if (!selectedFromAll) {
      return baseList;
    }
    return [selectedFromAll, ...baseList];
  }, [staffJobTitles, formData.staff_department, formData.staff_job_title]);

  const isInitialPageLoading =
    isCompanyContextLoading ||
    (!companyId && !companyContextError) ||
    isUsersLoading ||
    isReferenceDataLoading ||
    isRosterLoading;

  const hasInitialPageError = Boolean(
    companyContextError || usersLoadError || referenceDataError || rosterError,
  );

  useEffect(() => {
    if (isInitialPageReady) return;
    if (isInitialPageLoading) return;
    if (hasInitialPageError) return;
    setIsInitialPageReady(true);
  }, [isInitialPageReady, isInitialPageLoading, hasInitialPageError]);

  if (!isInitialPageReady && isInitialPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-sky-50 p-6">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <div className="h-10 w-10 rounded-full border-4 border-sky-200 border-t-sky-600 animate-spin" />
          <p className="text-sm font-medium">Loading Duty Roster Data...</p>
        </div>
      </div>
    );
  }

  if (!isInitialPageReady && hasInitialPageError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-sky-50 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-red-700">
            Unable to load duty roster
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            One or more API requests failed. Please try reloading this page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      {/* Print styling */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-bg {
            background: white !important;
          }
          .print-border {
            border-color: #cbd5e1 !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        .roster-theme {
          font-family: "Space Grotesk", "Segoe UI", system-ui, sans-serif;
        }
      `}</style>

      <div className="roster-theme relative mx-auto max-w-7xl px-4 py-10">
        <div className="pointer-events-none absolute -left-10 top-10 h-48 w-48 rounded-full bg-sky-200/50 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-24 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />

        {/* Header */}
        <div className="relative flex flex-col gap-5 rounded-3xl border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <button
              onClick={() => router.back()}
              className="no-print rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              ← Back
            </button>
            <div>
              {/* <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                Duty Roster
              </span> */}
              <h1 className="inline-flex items-center mt-0 text-3xl bg-sky-100 rounded-full gap-2 px-3 font-semibold tracking-tight text-slate-900 md:text-3xl">
                Shift Duty Roster
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Weekly shift view • {formatRange(weekStart, weekEnd)}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="no-print flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 shadow-sm">
              <button
                onClick={() => moveWeek(-1)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                ← Prev
              </button>
              <button
                onClick={() => setAnchorDate(new Date())}
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
              >
                This week
              </button>
              <button
                onClick={() => moveWeek(1)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Next →
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setDepartment("All");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 sm:w-44"
              >
                <option value="All">All roles</option>
                <option value="Doctor">Doctor</option>
                <option value="Administrator">Administrator</option>
                <option value="Staff">Staff</option>
              </select>

              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 sm:w-44"
              >
                <option value="All">All departments</option>
                {role === "Doctor" &&
                  departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                {role === "Administrator" &&
                  adminTypes.map((adminType) => (
                    <option key={adminType.id} value={adminType.name}>
                      {adminType.name}
                    </option>
                  ))}
                {role === "Staff" &&
                  staffDepartments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
              </select>

              <div className="relative w-full sm:w-64">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search staff, role, dept…"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </span>
              </div>

              <button
                onClick={() => {
                  if (disableAddDuty) return;
                  openAddModal();
                }}
                disabled={disableAddDuty}
                aria-disabled={disableAddDuty}
                className={
                  disableAddDuty
                    ? "rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400 shadow-sm cursor-not-allowed"
                    : "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
                }
              >
                Add Duty
              </button>

              {/* <button
                onClick={() => window.print()}
                className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-slate-800 hover:to-slate-700"
              >
                Print
              </button> */}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="no-print mt-6">
          <button
            onClick={() => setShowLegend((v) => !v)}
            className="text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            {showLegend ? "Hide legend" : "Show legend"}
          </button>

          {showLegend && (
            <div className="mt-3 flex flex-wrap gap-2">
              {["G", "M", "E", "N", "C", "O"].map((k) => {
                const isSelected = selectedShiftKeys.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setSelectedShiftKeys((prev) =>
                        prev.includes(k)
                          ? prev.filter((key) => key !== k)
                          : [...prev, k],
                      );
                    }}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                      isSelected
                        ? SHIFT_META[k].className
                        : `${SHIFT_META[k].className} opacity-60`
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isSelected
                          ? SHIFT_META[k].dot
                          : `${SHIFT_META[k].dot} opacity-70`
                      }`}
                    />
                    {k} • {SHIFT_META[k].label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Table card */}
        <div className="print-bg mt-6 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-lg shadow-slate-100">
          <div className="flex items-center justify-between border-b border-slate-200/70 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">
              Staff on roster:{" "}
              <span className="text-slate-600">{filteredStaff.length}</span>
            </div>
            <div className="text-xs font-medium text-slate-500">
              {isRosterLoading
                ? "Loading roster..."
                : rosterError || "Tip: use search/filter • print for sharing"}
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-[900px] w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="print-border w-[280px] border-b border-slate-200 px-4 py-3 text-left">
                    Staff
                  </th>
                  {days.map((d) => (
                    <th
                      key={d.dateISO}
                      className="print-border border-b border-slate-200 px-4 py-3"
                    >
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {s.name}
                          </div>
                          <div className="mt-0.5 text-xs font-medium text-slate-600">
                            {s.role} • {s.department}
                            {s.staffDepartment ? ` ${s.staffDepartment}` : ""}
                            {s.roleKey === "staff" && s.staffJobTitle
                              ? ` • (${s.staffJobTitle})`
                              : ""}
                          </div>
                        </div>
                        <span className="no-print rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
                          {s.id.toUpperCase()}
                        </span>
                      </div>
                    </td>

                    {days.map((d) => {
                      const assignment =
                        assignmentsByStaff[s.id] &&
                        assignmentsByStaff[s.id][d.dateISO];
                      const shift = assignment?.shift || "O";
                      const meta = SHIFT_META[shift];
                      const timeLabel =
                        assignment?.time_slot ||
                        (assignment?.on_call_time
                          ? formatTimeValue(assignment.on_call_time)
                          : "");
                      return (
                        <td
                          key={d.dateISO}
                          className="px-4 py-3"
                          onDoubleClick={() =>
                            handleEditDuty(String(s.id), d.dateISO)
                          }
                        >
                          <div className="flex flex-col items-center gap-1 text-center">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}
                              title={meta.label}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${meta.dot}`}
                              />
                              {shift}
                            </span>
                            {timeLabel ? (
                              <span className="text-[11px] font-medium text-slate-500">
                                {timeLabel}
                              </span>
                            ) : (
                              <span className="w-full text-center text-[11px] font-medium text-slate-400">
                                ---
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {filteredStaff.length === 0 && (
                  <tr>
                    <td
                      colSpan={days.length + 1}
                      className="px-4 py-10 text-center text-sm text-slate-600"
                    >
                      No staff found for the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="print-border border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            Generated roster view based on duty roster assignments.
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
          <div className="flex w-full max-w-2xl flex-col overflow-visible rounded-3xl border border-slate-200/70 bg-white shadow-2xl max-h-[90vh]">
            <div className="rounded-t-3xl bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Add Duty Roster Entry
                  </h2>
                  <p className="mt-1 text-xs text-slate-200">
                    Create a new duty assignment for the week.
                  </p>
                </div>
                <button
                  onClick={closeAddModal}
                  className="rounded-xl bg-white/10 px-3 py-1 text-sm font-medium text-white hover:bg-white/20"
                  aria-label="Close"
                >
                  Close
                </button>
              </div>
            </div>

            <form
              onSubmit={handleFormSubmit}
              className="flex min-h-0 flex-1 flex-col px-4 py-5 sm:px-6"
            >
              <div className="grid flex-1 gap-4 overflow-y-auto pr-1 pb-24 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  User&apos;s
                  <select
                    value={formData.staffId}
                    onChange={handleUserSelect}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    required
                  >
                    <option value="" disabled>
                      {isUsersLoading
                        ? "Loading users..."
                        : modalUserOptions.length
                          ? "Select user"
                          : "No users for selected filters"}
                    </option>
                    {modalUserOptions.map((user) => (
                      <option key={user.id} value={user.id}>
                        {getUserOptionLabel(user)}
                      </option>
                    ))}
                  </select>
                  {!isUsersLoading && modalUserOptions.length === 0 && (
                    <span className="mt-1 block text-xs text-slate-500">
                      No users match selected role/department filters.
                    </span>
                  )}
                  {usersLoadError && (
                    <span className="mt-1 block text-xs text-rose-500">
                      {usersLoadError}
                    </span>
                  )}
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Role
                  <input
                    value={formData.role}
                    readOnly
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    placeholder="Role will be auto-filled"
                  />
                  {isUserDetailsLoading && (
                    <span className="mt-1 block text-xs text-slate-500">
                      Loading user details...
                    </span>
                  )}
                  {userDetailsError && (
                    <span className="mt-1 block text-xs text-rose-500">
                      {userDetailsError}
                    </span>
                  )}
                </label>

                {selectedRole === "doctor" && (
                  <>
                    <label className="text-sm font-medium text-slate-700">
                      Department
                      <select
                        value={formData.department}
                        disabled
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        <option value="" disabled>
                          Department
                        </option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={String(dept.id)}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Doctor Type
                      <select
                        value={formData.doctor_type}
                        disabled
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        <option value="" disabled>
                          Doctor type
                        </option>
                        {doctorTypes.map((type) => (
                          <option key={type.id} value={String(type.id)}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                {selectedRole === "administrator" && (
                  <>
                    <label className="text-sm font-medium text-slate-700">
                      Administration Type
                      <select
                        value={formData.administration_type}
                        disabled
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        <option value="" disabled>
                          Administration type
                        </option>
                        {adminTypes.map((type) => (
                          <option key={type.id} value={String(type.id)}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Job Title
                      <input
                        value={formData.job_title}
                        readOnly
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        placeholder="Job title"
                      />
                    </label>
                  </>
                )}

                {selectedRole === "staff" && (
                  <>
                    <label className="text-sm font-medium text-slate-700">
                      Staff Department
                      <select
                        value={formData.staff_department}
                        disabled
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        <option value="" disabled>
                          Staff department
                        </option>
                        {staffDepartments.map((dept) => (
                          <option key={dept.id} value={String(dept.id)}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Staff Job Title
                      <select
                        value={formData.staff_job_title}
                        disabled
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        {/* <option value="" disabled>
                          Staff job title
                        </option> */}
                        {filteredStaffJobTitles.map((title) => (
                          <option key={title.id} value={String(title.id)}>
                            {title.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                <label className="text-sm font-medium text-slate-700">
                  Date
                  <div className="relative mt-2" ref={calendarRef}>
                    <button
                      type="button"
                      onClick={() => {
                        const base = formData.date
                          ? new Date(formData.date)
                          : new Date();
                        setCalendarMonth(startOfMonth(base));
                        setCalendarOpen((prev) => !prev);
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 pr-11 text-left text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      {formatPickerDate(formData.date) || "Select date"}
                    </button>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white px-2 py-1 text-slate-400 shadow-sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                    </span>
                    {calendarOpen && (
                      <div className="absolute z-30 mt-2 w-full min-w-[280px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
                        <div className="flex items-center justify-between px-1 pb-2">
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarMonth(
                                new Date(
                                  calendarMonth.getFullYear(),
                                  calendarMonth.getMonth() - 1,
                                  1,
                                ),
                              )
                            }
                            className="rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
                          >
                            ← Prev
                          </button>
                          <div className="text-sm font-semibold text-slate-900">
                            {calendarMonth.toLocaleString(undefined, {
                              month: "long",
                            })}{" "}
                            <span className="text-slate-400">
                              {calendarMonth.getFullYear()}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarMonth(
                                new Date(
                                  calendarMonth.getFullYear(),
                                  calendarMonth.getMonth() + 1,
                                  1,
                                ),
                              )
                            }
                            className="rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
                          >
                            Next →
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-slate-400">
                          {[
                            "SUN",
                            "MON",
                            "TUE",
                            "WED",
                            "THU",
                            "FRI",
                            "SAT",
                          ].map((d) => (
                            <div key={d}>{d}</div>
                          ))}
                        </div>
                        <div className="mt-2 grid grid-cols-7 gap-2 text-center">
                          {(() => {
                            const year = calendarMonth.getFullYear();
                            const month = calendarMonth.getMonth();
                            const firstDay = new Date(year, month, 1);
                            const startOffset = firstDay.getDay();
                            const daysInMonth = new Date(
                              year,
                              month + 1,
                              0,
                            ).getDate();
                            const cells = [];
                            for (let i = 0; i < startOffset; i++) {
                              cells.push(
                                <div key={`blank-${i}`} className="h-8" />,
                              );
                            }
                            for (let d = 1; d <= daysInMonth; d++) {
                              const date = new Date(year, month, d);
                              const isSelected =
                                formData.date &&
                                isSameDay(date, new Date(formData.date));
                              const isToday = isSameDay(date, new Date());
                              cells.push(
                                <button
                                  key={`day-${d}`}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      date: toISODate(date),
                                      extra_days: "",
                                    }));
                                    setCalendarOpen(false);
                                  }}
                                  className={`h-8 w-8 rounded-full text-xs font-semibold transition ${
                                    isSelected
                                      ? "bg-emerald-400 text-emerald-950"
                                      : "text-slate-600 hover:bg-slate-100"
                                  } ${
                                    isToday && !isSelected
                                      ? "border border-emerald-200"
                                      : ""
                                  }`}
                                >
                                  {d}
                                </button>,
                              );
                            }
                            return cells;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                  <input type="hidden" value={formData.date} required />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Shift
                  <select
                    value={formData.shift}
                    onChange={handleShiftChange}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="M">Morning</option>
                    <option value="G">General</option>
                    <option value="E">Evening</option>
                    <option value="N">Night</option>
                    <option value="O">Off</option>
                    <option value="C">On-call</option>
                  </select>
                </label>

                {!editingDutyId && formData.date && (
                  <label className="text-sm font-medium text-slate-700">
                    Days
                    <select
                      value={formData.extra_days}
                      onChange={handleFormChange("extra_days")}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      <option value="" disabled>
                        Select days
                      </option>
                      <option value="2">2 days</option>
                      <option value="3">3 days</option>
                      <option value="4">4 days</option>
                      <option value="5">5 days</option>
                    </select>
                  </label>
                )}

                <label className="text-sm font-medium text-slate-700">
                  {isOnCallShift ? "Time" : "Time Slot"}
                  {isOnCallShift ? (
                    <input
                      type="time"
                      value={formData.on_call_time}
                      onChange={handleFormChange("on_call_time")}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                  ) : (
                    <select
                      value={formData.time_slot}
                      onChange={handleFormChange("time_slot")}
                      disabled={timeSlotOptions.length === 0}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="" disabled>
                        {timeSlotOptions.length === 0
                          ? "Select shift first"
                          : "Select time slot"}
                      </option>
                      {timeSlotOptions.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  )}
                </label>

                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  Notes
                  <textarea
                    value={formData.notes}
                    onChange={handleFormChange("notes")}
                    rows={3}
                    placeholder="Optional notes..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center">
                {/* <button
                  type="button"
                  onClick={closeAddModal}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Cancel
                </button> */}
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
                >
                  {editingDutyId ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
