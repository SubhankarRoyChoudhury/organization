"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Grid,
  List,
  X,
  PenLine,
  UserX,
  MoreVertical,
  CheckCheck,
  CheckSquare,
} from "lucide-react";
import {
  getAllStaff,
  get_Hospital_User_Login_Details,
  updateStaff,
  uploadImageFromAnyWhere,
  getApprovedStaffDepartments,
  getApprovedStaffJobTitles,
  deleteStaff,
  approveStaff,
  upholdStaff,
  ensureStaffLogin,
} from "@/app/api/apiService";

const formatProfileImage = (profilePath) => {
  if (!profilePath) return "/default_user.png";
  if (/^https?:\/\//i.test(profilePath) || /^data:/i.test(profilePath)) {
    return profilePath;
  }
  let normalized = profilePath;
  if (normalized.startsWith("/api/")) {
    return normalized;
  }
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  return `/api${normalized}`;
};

export default function StaffList() {
  const router = useRouter();
  const [allStaff, setAllStaff] = useState([]);
  const [error, setError] = useState(null);
  const [companyError, setCompanyError] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [localMessage, setLocalMessage] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [isDetailSaving, setIsDetailSaving] = useState(false);
  const [isLoginEnsuring, setIsLoginEnsuring] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    username: "",
    phone: "",
    whatsapp_number: "",
    staff_department: "",
    staff_job_title: "",
    can_access: false,
  });
  const [editProfileImage, setEditProfileImage] = useState(null);
  const [editProfilePreview, setEditProfilePreview] = useState("");
  const updateEditPreview = useCallback((nextSrc) => {
    setEditProfilePreview((prev) => {
      if (prev && prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return nextSrc;
    });
  }, []);
  const [viewMode, setViewMode] = useState("grid");
  const [staffSearch, setStaffSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [jobTitleFilter, setJobTitleFilter] = useState("all");
  const [staffDepartments, setStaffDepartments] = useState([]);
  const [staffJobTitles, setStaffJobTitles] = useState([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDelistStaff, setPendingDelistStaff] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const handleNavigateToSignup = () => {
    const params = new URLSearchParams({ role: "staff" });
    router.push(`/signup?${params.toString()}`);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("staffViewMode", mode);
    }
  };

  const departmentOptions = useMemo(() => {
    return (Array.isArray(staffDepartments) ? staffDepartments : []).map(
      (department) => ({
        id: department.id,
        name: department.name || "Unnamed Department",
      }),
    );
  }, [staffDepartments]);

  const jobTitleOptions = useMemo(() => {
    if (departmentFilter === "all") {
      return [];
    }
    return staffJobTitles.filter((jobTitle) => {
      const departmentId =
        jobTitle.staff_department?.id ??
        jobTitle.staff_department_id ??
        jobTitle.staff_department ??
        "";
      return String(departmentId) === String(departmentFilter);
    });
  }, [staffJobTitles, departmentFilter]);

  const filteredStaffJobTitles = useMemo(() => {
    if (!editForm.staff_department) {
      return staffJobTitles;
    }
    return staffJobTitles.filter((jobTitle) => {
      const departmentId =
        jobTitle.staff_department?.id ??
        jobTitle.staff_department_id ??
        jobTitle.staff_department ??
        "";
      return String(departmentId) === String(editForm.staff_department);
    });
  }, [staffJobTitles, editForm.staff_department]);

  const filteredStaff = useMemo(() => {
    return allStaff.filter((member) => {
      const matchesDepartment =
        departmentFilter === "all" ||
        String(member.staff_department ?? member.staff_department_id ?? "") ===
          String(departmentFilter);
      const matchesJobTitle =
        jobTitleFilter === "all" ||
        String(member.staff_job_title ?? member.staff_job_title_id ?? "") ===
          String(jobTitleFilter);
      const query = staffSearch.trim().toLowerCase();
      if (!query) return matchesDepartment && matchesJobTitle;
      return (
        [
          member.full_name,
          member.email,
          member.phone,
          member.department_name ?? member.department?.name,
          member.role,
          member.job_title,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query),
        ) &&
        matchesDepartment &&
        matchesJobTitle
      );
    });
  }, [allStaff, departmentFilter, jobTitleFilter, staffSearch]);

  useEffect(() => {
    return () => {
      if (editProfilePreview && editProfilePreview.startsWith("blob:")) {
        URL.revokeObjectURL(editProfilePreview);
      }
    };
  }, [editProfilePreview]);

  useEffect(() => {
    if (!localMessage) return;
    const timer = setTimeout(() => setLocalMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [localMessage]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.closest("[data-staff-menu]")) return;
      setOpenMenuId(null);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

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

  const fetchAllStaff = useCallback(async (company_id) => {
    if (!company_id) return;
    try {
      const data = await getAllStaff(company_id, "staff");
      setError(null);
      const normalized = Array.isArray(data) ? data : [];
      setAllStaff(
        normalized.filter(
          (item) => String(item?.role || "").toLowerCase() === "staff",
        ),
      );
    } catch (err) {
      console.error("Failed to fetch staff:", err);
      setError("Failed to fetch staff.");
    }
  }, []);

  const fetchStaffDepartments = useCallback(async (company_id) => {
    if (!company_id) return;
    try {
      const data = await getApprovedStaffDepartments(company_id);
      setStaffDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch staff departments:", err);
    }
  }, []);

  const fetchStaffJobTitles = useCallback(async (company_id) => {
    if (!company_id) return;
    try {
      const data = await getApprovedStaffJobTitles(company_id);
      setStaffJobTitles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch staff job titles:", err);
    }
  }, []);

  useEffect(() => {
    const savedView =
      typeof window !== "undefined"
        ? localStorage.getItem("staffViewMode")
        : null;
    if (savedView === "grid" || savedView === "list") {
      setViewMode(savedView);
    }
    const username = localStorage.getItem("username");
    if (username) {
      get_Hospital_User_Login_Details(username)
        .then((data) => {
          const resolved = resolveCompanyId(data);
          setCompanyId(resolved);
          setCompanyError(null);
        })
        .catch((err) => {
          console.error("Error fetching user details:", err);
          setCompanyError("Unable to determine company context.");
        });
    } else {
      setCompanyError("Missing company context. Please login again.");
    }
  }, [fetchAllStaff]);

  useEffect(() => {
    if (companyId) {
      fetchAllStaff(companyId);
      fetchStaffDepartments(companyId);
      fetchStaffJobTitles(companyId);
    }
  }, [companyId, fetchAllStaff, fetchStaffDepartments, fetchStaffJobTitles]);

  const openStaffDetails = (member) => {
    setSelectedStaff(member);
    setIsDetailOpen(true);
    setIsEditingDetails(false);
    setDetailError(null);
    if (member) {
      setEditForm({
        full_name: member.full_name || member.name || "",
        email: member.email || "",
        username: member.username || member.email || "",
        phone: member.phone || member.mobile || "",
        whatsapp_number: member.whatsapp_number || "",
        staff_department: String(
          member.staff_department ?? member.staff_department_id ?? "",
        ),
        staff_job_title: String(
          member.staff_job_title ?? member.staff_job_title_id ?? "",
        ),
        can_access: Boolean(member.can_access),
      });
      updateEditPreview(formatProfileImage(member.image_url));
    }
  };

  const closeDetailsPanel = () => {
    setIsDetailOpen(false);
    setIsEditingDetails(false);
    setDetailError(null);
    setEditProfileImage(null);
    updateEditPreview("");
  };

  const startEditingDetails = () => {
    if (!selectedStaff) return;
    setIsEditingDetails(true);
    setDetailError(null);
  };

  const cancelEditingDetails = () => {
    setIsEditingDetails(false);
    setDetailError(null);
    setEditProfileImage(null);
    if (selectedStaff) {
      setEditForm({
        full_name: selectedStaff.full_name || selectedStaff.name || "",
        email: selectedStaff.email || "",
        username: selectedStaff.username || selectedStaff.email || "",
        phone: selectedStaff.phone || selectedStaff.mobile || "",
        whatsapp_number: selectedStaff.whatsapp_number || "",
        staff_department: String(
          selectedStaff.staff_department ??
            selectedStaff.staff_department_id ??
            "",
        ),
        staff_job_title: String(
          selectedStaff.staff_job_title ??
            selectedStaff.staff_job_title_id ??
            "",
        ),
        can_access: Boolean(selectedStaff.can_access),
      });
      updateEditPreview(formatProfileImage(selectedStaff.image_url));
    }
  };

  const handleDetailFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "email"
        ? { username: type === "checkbox" ? prev.username : value }
        : null),
    }));
  };

  const handleStaffDepartmentChange = (event) => {
    const nextDepartment = event.target.value;
    setEditForm((prev) => ({
      ...prev,
      staff_department: nextDepartment,
      staff_job_title: "",
    }));
  };

  const handleEditProfileImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setEditProfileImage(file);
    updateEditPreview(URL.createObjectURL(file));
  };

  const clearEditProfileImage = () => {
    setEditProfileImage(null);
    if (selectedStaff) {
      updateEditPreview(formatProfileImage(selectedStaff.image_url));
    } else {
      updateEditPreview("");
    }
  };

  const handleUpdateStaffDetails = async () => {
    if (!selectedStaff) return;
    if (!companyId) {
      setDetailError("Missing company context. Please refresh and try again.");
      return;
    }
    const staffId =
      selectedStaff.id ??
      selectedStaff.company_user_id ??
      selectedStaff.user_id ??
      selectedStaff.staff_id;
    if (!staffId) {
      setDetailError("Missing staff ID. Please refresh and try again.");
      return;
    }
    setIsDetailSaving(true);
    setDetailError(null);

    try {
      const trimmedEmail = editForm.email.trim();
      const trimmedUsername = editForm.username
        ? editForm.username.trim()
        : trimmedEmail;
      const payload = {
        full_name: editForm.full_name.trim(),
        name: editForm.full_name.trim(),
        email: trimmedEmail,
        username: trimmedUsername,
        phone: editForm.phone.trim(),
        mobile: editForm.phone.trim(),
        whatsapp_number: editForm.whatsapp_number.trim(),
        staff_department: editForm.staff_department
          ? Number(editForm.staff_department)
          : null,
        staff_job_title: editForm.staff_job_title
          ? Number(editForm.staff_job_title)
          : null,
        can_access: Boolean(editForm.can_access),
        role: "staff",
      };
      if (editProfileImage) {
        const username =
          selectedStaff.username ||
          selectedStaff.email ||
          localStorage.getItem("username") ||
          "";
        const uploadResponse = await uploadImageFromAnyWhere(
          editProfileImage,
          username,
          companyId,
        );
        const attachmentId =
          uploadResponse?.response?.file?.id ||
          uploadResponse?.response?.file?.attachment_id;
        if (!attachmentId) {
          throw new Error("Attachment ID missing");
        }
        payload.attachment_id = attachmentId;
      }

      const updatedStaff = await updateStaff(staffId, payload, companyId);
      const normalizedUpdatedStaff = {
        ...updatedStaff,
        username:
          updatedStaff?.username ||
          payload.username ||
          updatedStaff?.email ||
          payload.email,
      };

      setAllStaff((prevStaff) =>
        prevStaff.map((item) =>
          item.id === normalizedUpdatedStaff.id ? normalizedUpdatedStaff : item,
        ),
      );
      setSelectedStaff(normalizedUpdatedStaff);
      setEditProfileImage(null);
      updateEditPreview(formatProfileImage(normalizedUpdatedStaff.image_url));
      setIsEditingDetails(false);
      setLocalMessage("Staff updated successfully.");
    } catch (err) {
      const apiError =
        err.response?.data?.errors ||
        err.response?.data?.error ||
        "Failed to update staff.";
      if (typeof apiError === "string") {
        setDetailError(apiError);
      } else if (apiError && typeof apiError === "object") {
        const firstKey = Object.keys(apiError)[0];
        const firstMessage = Array.isArray(apiError[firstKey])
          ? apiError[firstKey][0]
          : apiError[firstKey];
        setDetailError(firstMessage || "Failed to update staff.");
      } else {
        setDetailError("Failed to update staff.");
      }
    } finally {
      setIsDetailSaving(false);
    }
  };

  const handleEnsureLogin = async () => {
    if (!selectedStaff) return;
    if (!companyId) {
      setDetailError("Missing company context. Please refresh and try again.");
      return;
    }
    const staffId =
      selectedStaff.id ??
      selectedStaff.company_user_id ??
      selectedStaff.user_id ??
      selectedStaff.staff_id;
    if (!staffId) {
      setDetailError("Missing staff ID. Please refresh and try again.");
      return;
    }
    const trimmedEmail = editForm.email.trim();
    if (!trimmedEmail) {
      setDetailError("Email is required to create login access.");
      return;
    }
    setIsLoginEnsuring(true);
    setDetailError(null);
    try {
      const response = await ensureStaffLogin(staffId, companyId, trimmedEmail);
      const updatedStaff = response?.staff || response;
      if (updatedStaff?.id) {
        setAllStaff((prevStaff) =>
          prevStaff.map((item) =>
            item.id === updatedStaff.id ? updatedStaff : item,
          ),
        );
        setSelectedStaff(updatedStaff);
        setEditForm((prev) => ({
          ...prev,
          can_access: true,
        }));
      }
      const created = Boolean(response?.created);
      setLocalMessage(
        created ? "Login created successfully." : "Login already exists.",
      );
    } catch (err) {
      const apiError =
        err.response?.data?.error ||
        err.response?.data?.errors ||
        err.message ||
        "Failed to create login access.";
      setDetailError(
        typeof apiError === "string"
          ? apiError
          : "Failed to create login access.",
      );
    } finally {
      setIsLoginEnsuring(false);
    }
  };

  const requestDelistConfirmation = (member) => {
    setPendingDelistStaff(member);
    setIsConfirmOpen(true);
    setOpenMenuId(null);
  };

  const closeDelistConfirmation = () => {
    setIsConfirmOpen(false);
    setPendingDelistStaff(null);
  };

  const confirmDelist = async () => {
    if (!pendingDelistStaff) return;
    if (!companyId) {
      setError("Missing company context. Please refresh and try again.");
      return;
    }
    const staffId =
      pendingDelistStaff.id ??
      pendingDelistStaff.company_user_id ??
      pendingDelistStaff.user_id ??
      pendingDelistStaff.staff_id;
    if (!staffId) {
      setError("Missing staff ID. Please refresh and try again.");
      return;
    }
    try {
      await deleteStaff(staffId, companyId);
      setAllStaff((prevStaff) =>
        prevStaff.filter((item) => {
          const itemId =
            item.id ?? item.company_user_id ?? item.user_id ?? item.staff_id;
          return itemId !== staffId;
        }),
      );
      const selectedId =
        selectedStaff?.id ??
        selectedStaff?.company_user_id ??
        selectedStaff?.user_id ??
        selectedStaff?.staff_id;
      if (selectedId === staffId) {
        setSelectedStaff(null);
        setIsDetailOpen(false);
      }
      setLocalMessage("Staff delisted successfully.");
    } catch (err) {
      console.error("Failed to delist staff:", err);
      const apiMessage =
        err.response?.data?.errors ||
        err.response?.data?.error ||
        err.message ||
        "Failed to delist staff.";
      setError(
        typeof apiMessage === "string" ? apiMessage : "Failed to delist staff.",
      );
    } finally {
      closeDelistConfirmation();
    }
  };

  const handleApprovalToggle = async (member) => {
    if (!companyId) {
      setError("Missing company context. Please refresh and try again.");
      return;
    }
    const staffId =
      member?.id ??
      member?.company_user_id ??
      member?.user_id ??
      member?.staff_id;
    if (!staffId) {
      setError("Missing staff ID. Please refresh and try again.");
      return;
    }
    try {
      const isApproved = Boolean(member?.is_approve);
      const actionFn = isApproved ? upholdStaff : approveStaff;
      const updatedStaff = await actionFn(staffId, companyId);
      setAllStaff((prevStaff) =>
        prevStaff.map((item) =>
          item.id === updatedStaff.id ? updatedStaff : item,
        ),
      );
      setSelectedStaff((prevSelected) =>
        prevSelected?.id === updatedStaff.id ? updatedStaff : prevSelected,
      );
      setLocalMessage(
        isApproved ? "Staff approval removed." : "Staff approved.",
      );
    } catch (err) {
      console.error("Failed to update staff approval:", err);
      const apiMessage =
        err.response?.data?.errors ||
        err.response?.data?.error ||
        err.message ||
        "Failed to update staff approval.";
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "Failed to update staff approval.",
      );
    }
  };

  return (
    <div className="h-full min-h-0 box-border overflow-hidden p-6 bg-gradient-to-br from-[#f9fafc] to-[#eef3f9] flex flex-col">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Staff</h1>

        <button
          type="button"
          onClick={handleNavigateToSignup}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#5B5BF6] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-[#4338CA] hover:to-[#4F46E5]"
        >
          <Plus size={18} />
          Add Staff
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {companyError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
          {companyError}
        </div>
      )}
      {localMessage && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg bg-green-100 px-4 py-3 text-sm text-green-700">
          <span>{localMessage}</span>
          <button
            type="button"
            onClick={() => setLocalMessage(null)}
            className="rounded-full p-1 text-green-700/70 transition hover:text-green-900"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* View Toggle & Filter */}
      <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 text-gray-500">
          <button
            type="button"
            onClick={() => {
              handleViewModeChange("grid");
              setOpenMenuId(null);
            }}
            className={`p-2 rounded-md transition ${
              viewMode === "grid"
                ? "text-white bg-[#4F46E5]"
                : "text-gray-500 hover:text-[#4F46E5] hover:bg-gray-100"
            }`}
            aria-label="Grid view"
            title="Grid view"
          >
            <Grid size={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              handleViewModeChange("list");
              setOpenMenuId(null);
              setSelectedStaff(null);
              setIsDetailOpen(false);
              setIsEditingDetails(false);
            }}
            className={`p-2 rounded-md transition ${
              viewMode === "list"
                ? "text-white bg-[#4F46E5]"
                : "text-gray-500 hover:text-[#4F46E5] hover:bg-gray-100"
            }`}
            aria-label="List view"
            title="List view"
          >
            <List size={18} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <select
              value={departmentFilter}
              onChange={(event) => {
                const nextDepartment = event.target.value;
                setDepartmentFilter(nextDepartment);
                setJobTitleFilter("all");
              }}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2 pr-10 text-sm text-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">Filter Department</option>
              {departmentOptions.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.356a.75.75 0 111.04 1.08l-4.25 3.844a.75.75 0 01-1.04 0l-4.25-3.844a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <select
              value={jobTitleFilter}
              onChange={(event) => setJobTitleFilter(event.target.value)}
              disabled={departmentFilter === "all"}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2 pr-10 text-sm text-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="all">
                {departmentFilter === "all"
                  ? "Select department first"
                  : "Filter Job Title"}
              </option>
              {jobTitleOptions.map((jobTitle) => (
                <option key={jobTitle.id} value={jobTitle.id}>
                  {jobTitle.name || "Unnamed Job Title"}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.356a.75.75 0 111.04 1.08l-4.25 3.844a.75.75 0 01-1.04 0l-4.25-3.844a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </div>
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              value={staffSearch}
              onChange={(event) => setStaffSearch(event.target.value)}
              placeholder="Search Here..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          {(departmentFilter !== "all" ||
            jobTitleFilter !== "all" ||
            staffSearch.trim()) && (
            <button
              type="button"
              onClick={() => {
                setDepartmentFilter("all");
                setJobTitleFilter("all");
                setStaffSearch("");
              }}
              className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-gray-50 w-9 h-9 flex items-center justify-center"
              title="Clear filter"
            >
              <X size={16} />
              <span className="sr-only">Clear filter</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden lg:flex lg:items-stretch lg:gap-6">
        <div
          className={`flex-1 min-h-0 overflow-hidden transition-all duration-300 ${
            isDetailOpen ? "lg:pr-6" : ""
          }`}
        >
          <div className="h-full min-h-0 overflow-y-auto pr-1 pb-2">
            {viewMode === "grid" ? (
              <div className="grid content-start gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 justify-items-center">
                {filteredStaff.length === 0 ? (
                  <div className="col-span-full rounded-2xl bg-white px-6 py-10 text-center text-sm text-gray-500 shadow-md">
                    No staff found yet.
                  </div>
                ) : (
                  filteredStaff.map((member) => {
                    const imageSrc = formatProfileImage(member.image_url);
                    const staffDepartmentName =
                      member.staff_department_name ??
                      staffDepartments.find(
                        (department) =>
                          String(department.id) ===
                          String(
                            member.staff_department ??
                              member.staff_department_id ??
                              "",
                          ),
                      )?.name ??
                      "--";
                    const staffJobTitleName =
                      member.staff_job_title_name ??
                      staffJobTitles.find(
                        (jobTitle) =>
                          String(jobTitle.id) ===
                          String(
                            member.staff_job_title ??
                              member.staff_job_title_id ??
                              "",
                          ),
                      )?.name ??
                      "--";
                    const statusLabel = member.is_approve
                      ? "Approved"
                      : "Pending";
                    const menuId =
                      member.id ??
                      member.email ??
                      member.full_name ??
                      member.name;

                    return (
                      <div key={menuId} className="w-full h-full max-w-[280px]">
                        <div
                          onClick={() => openStaffDetails(member)}
                          className={`relative bg-white rounded-2xl shadow-md hover:shadow-lg p-6 text-center transition-all h-full flex flex-col cursor-pointer ${
                            selectedStaff?.id === member.id && isDetailOpen
                              ? "ring-2 ring-indigo-500"
                              : ""
                          }`}
                        >
                          <div
                            className="absolute right-3 top-3"
                            data-staff-menu
                          >
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenMenuId((prev) =>
                                  prev === menuId ? null : menuId,
                                );
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-100"
                              aria-label="Staff actions"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {openMenuId === menuId && (
                              <div
                                className="absolute right-0 z-20 mt-2 w-32 rounded-md border border-gray-200 bg-white shadow-lg"
                                onClick={(event) => event.stopPropagation()}
                                data-staff-menu
                              >
                                {member.is_approve && (
                                  <button
                                    type="button"
                                    onClick={() => handleApprovalToggle(member)}
                                    className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                                  >
                                    Uphold
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openStaffDetails(member)}
                                  className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                                >
                                  Review
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-center flex-1">
                            <div className="w-24 h-24 mb-3 rounded-full overflow-hidden shadow-md">
                              <img
                                src={imageSrc}
                                alt={member.full_name || member.name || "Staff"}
                                className="object-cover w-full h-full"
                              />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-800 truncate w-full">
                              {member.full_name || member.name || "Unnamed Staff"}
                            </h2>
                            {/* <p className="text-sm text-gray-500">
                            {departmentName}
                          </p> */}
                            <p className="text-sm text-gray-800">
                              {member.email || "--"}
                            </p>
                            <p className="text-sm text-gray-800">
                              {staffDepartmentName}
                            </p>
                            <p className="text-sm text-gray-800">
                              ({staffJobTitleName})
                            </p>

                            <div className="flex gap-4 justify-center mt-4 text-gray-500 w-full">
                              <span
                                className={`px-4 py-1.5 text-sm font-medium rounded-full ${
                                  member.is_approve
                                    ? "bg-green-100 text-green-700"
                                    : "bg-orange-100 text-orange-700"
                                }`}
                              >
                                {statusLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl shadow-md">
                <table className="min-w-full divide-y divide-gray-200 bg-white text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 font-semibold text-gray-600"
                    >
                      Profile
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 font-semibold text-gray-600"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 font-semibold text-gray-600"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 font-semibold text-gray-600"
                    >
                      Phone
                    </th>
                    {/* <th
                      scope="col"
                      className="px-6 py-3 font-semibold text-gray-600"
                    >
                      Department
                    </th> */}
                    <th
                      scope="col"
                      className="px-6 py-3 font-semibold text-gray-600"
                    >
                      Staff Department
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 font-semibold text-gray-600"
                    >
                      Staff Job Title
                    </th>
                    {/* <th
                      scope="col"
                      className="px-6 py-3 font-semibold text-gray-600"
                    >
                      Status
                    </th> */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-6 text-center text-sm text-gray-500"
                      >
                        No staff found yet.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((member) => {
                      const imageSrc = formatProfileImage(member.image_url);
                      const departmentName =
                        member.department_name ??
                        member.department?.name ??
                        "--";
                      const staffDepartmentName =
                        member.staff_department_name ??
                        staffDepartments.find(
                          (department) =>
                            String(department.id) ===
                            String(
                              member.staff_department ??
                                member.staff_department_id ??
                                "",
                            ),
                        )?.name ??
                        "--";
                      const staffJobTitleName =
                        member.staff_job_title_name ??
                        staffJobTitles.find(
                          (jobTitle) =>
                            String(jobTitle.id) ===
                            String(
                              member.staff_job_title ??
                                member.staff_job_title_id ??
                                "",
                            ),
                        )?.name ??
                        "--";
                      const statusLabel = member.is_approve
                        ? "Approved"
                        : "Pending";
                      const rowId =
                        member.id ??
                        member.email ??
                        member.full_name ??
                        member.name;

                      return (
                        <tr
                          key={rowId}
                          className="hover:bg-gray-50 transition cursor-pointer"
                          onClick={() => openStaffDetails(member)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-10 w-10 overflow-hidden rounded-full border border-gray-200 shadow-sm">
                              <img
                                src={imageSrc}
                                alt={member.full_name || member.name || "Staff"}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-medium">
                            {member.full_name || member.name || "Unnamed Staff"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {member.email ? (
                              <span className="inline-flex items-center text-green-600">
                                <CheckSquare size={16} />
                                <span className="sr-only">Email available</span>
                              </span>
                            ) : (
                              "--"
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {member.phone ? (
                              <span className="inline-flex items-center text-green-600">
                                <CheckSquare size={16} />
                                <span className="sr-only">Phone available</span>
                              </span>
                            ) : (
                              "--"
                            )}
                          </td>
                          {/* <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {departmentName}
                          </td> */}
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {staffDepartmentName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {staffJobTitleName}
                          </td>
                          {/* <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white ${
                                member.is_approve
                                  ? "status-approved"
                                  : "blink-pending"
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </td> */}
                        </tr>
                      );
                    })
                  )}
                </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div
          className={`hidden lg:block transition-all duration-300 ${
            isDetailOpen ? "lg:w-[360px]" : "lg:w-0"
          }`}
        >
          {isDetailOpen && (
            <StaffDetailContent
              staff={selectedStaff}
              isEditing={isEditingDetails}
              editForm={editForm}
              staffDepartments={staffDepartments}
              staffJobTitles={staffJobTitles}
              filteredStaffJobTitles={filteredStaffJobTitles}
              editProfilePreview={editProfilePreview}
              hasNewProfileImage={Boolean(editProfileImage)}
              onSelectProfileImage={handleEditProfileImageChange}
              onRemoveProfileImage={clearEditProfileImage}
              onChange={handleDetailFieldChange}
              onStaffDepartmentChange={handleStaffDepartmentChange}
              onStartEdit={startEditingDetails}
              onCancelEdit={cancelEditingDetails}
              onSave={handleUpdateStaffDetails}
              isSaving={isDetailSaving}
              isEnsuringLogin={isLoginEnsuring}
              onEnsureLogin={handleEnsureLogin}
              detailError={detailError}
              onDelist={() =>
                selectedStaff && requestDelistConfirmation(selectedStaff)
              }
              onClose={closeDetailsPanel}
            />
          )}
        </div>
      </div>

      {isDetailOpen && selectedStaff && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 px-4 pb-6 lg:hidden">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <StaffDetailContent
              staff={selectedStaff}
              isEditing={isEditingDetails}
              editForm={editForm}
              staffDepartments={staffDepartments}
              staffJobTitles={staffJobTitles}
              filteredStaffJobTitles={filteredStaffJobTitles}
              editProfilePreview={editProfilePreview}
              hasNewProfileImage={Boolean(editProfileImage)}
              onSelectProfileImage={handleEditProfileImageChange}
              onRemoveProfileImage={clearEditProfileImage}
              onChange={handleDetailFieldChange}
              onStaffDepartmentChange={handleStaffDepartmentChange}
              onStartEdit={startEditingDetails}
              onCancelEdit={cancelEditingDetails}
              onSave={handleUpdateStaffDetails}
              isSaving={isDetailSaving}
              isEnsuringLogin={isLoginEnsuring}
              onEnsureLogin={handleEnsureLogin}
              detailError={detailError}
              onDelist={() =>
                selectedStaff && requestDelistConfirmation(selectedStaff)
              }
              onClose={closeDetailsPanel}
            />
          </div>
        </div>
      )}

      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Confirm Delist
                </h2>
                <p className="text-sm text-gray-500">
                  This will remove the staff member from the active list.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDelistConfirmation}
                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close confirmation"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 text-sm text-gray-600">
              {pendingDelistStaff?.full_name || pendingDelistStaff?.name ? (
                <>
                  Delist{" "}
                  <span className="font-semibold text-gray-900">
                    {pendingDelistStaff.full_name || pendingDelistStaff.name}
                  </span>
                  ?
                </>
              ) : (
                "Delist this staff member?"
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={closeDelistConfirmation}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelist}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition hover:bg-red-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StaffDetailContent({
  staff,
  isEditing,
  editForm,
  staffDepartments = [],
  staffJobTitles = [],
  filteredStaffJobTitles = [],
  editProfilePreview,
  hasNewProfileImage,
  onSelectProfileImage,
  onRemoveProfileImage,
  onChange,
  onStaffDepartmentChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  isSaving,
  isEnsuringLogin,
  onEnsureLogin,
  detailError,
  onDelist,
  onClose,
}) {
  if (!staff) {
    return (
      <div className="text-sm text-gray-500">
        Select a staff member to view detailed information.
      </div>
    );
  }

  const isApproved = Boolean(staff.is_approve);
  const labelClass =
    "text-xs font-medium uppercase tracking-wide text-gray-500";
  const inputClass =
    "mt-1 w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-900 focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20";
  const lastUpdated = staff.updated_on
    ? new Date(staff.updated_on).toLocaleString()
    : "Not updated yet";
  const imageSrc = isEditing
    ? editProfilePreview || formatProfileImage(staff.image_url)
    : formatProfileImage(staff.image_url);
  const departmentName =
    staff.department_name ?? staff.department?.name ?? "--";
  const roleLabel = staff.role ?? "--";
  const uploadInputId = `staff-profile-upload-${staff.id}`;

  return (
    <div className="w-full max-w-md">
      <div className="rounded-[28px] bg-white p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-500">
            User Detail
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDelist}
              className="rounded-full border border-red-200 bg-white p-2 text-red-600 shadow-sm transition hover:bg-red-50"
              aria-label="Delist staff"
            >
              <UserX size={16} />
            </button>
            {!isEditing && (
              <button
                type="button"
                onClick={onStartEdit}
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition hover:text-[#4F46E5]"
                aria-label="Edit staff"
              >
                <PenLine size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition hover:text-[#4F46E5]"
              aria-label="Close details"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="my-4 border-t border-gray-100" />

        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white shadow-lg">
              <img
                src={imageSrc}
                alt={staff.full_name || staff.name || "Staff"}
                className="h-full w-full object-cover"
              />
            </div>
            {isEditing && (
              <div className="flex flex-col items-center gap-1 text-center">
                <label
                  htmlFor={uploadInputId}
                  className="cursor-pointer rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:border-blue-300 hover:text-blue-600"
                >
                  Upload Photo
                </label>
                <input
                  id={uploadInputId}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={onSelectProfileImage}
                />
                {hasNewProfileImage && (
                  <button
                    type="button"
                    onClick={onRemoveProfileImage}
                    className="text-xs font-medium text-red-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
            <span
              className={`rounded-full px-4 py-1 text-xs font-semibold ${
                isApproved
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {isApproved ? "Approved" : "Pending"}
            </span>
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className={labelClass}>Full Name</p>
              {isEditing ? (
                <input
                  type="text"
                  name="full_name"
                  value={editForm.full_name}
                  onChange={onChange}
                  className={inputClass}
                />
              ) : (
                <p className="text-lg font-semibold text-gray-900">
                  {staff.full_name || staff.name || "--"}
                </p>
              )}
            </div>
            <div>
              <p className={labelClass}>Email</p>
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="email"
                    name="email"
                    value={editForm.email}
                    onChange={onChange}
                    className={inputClass}
                  />
                  {editForm.email?.trim() && (
                    <button
                      type="button"
                      onClick={onEnsureLogin}
                      disabled={isEnsuringLogin}
                      className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isEnsuringLogin ? "Creating login..." : "Need login"}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm font-semibold text-gray-700">
                  {staff.email || "--"}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className={labelClass}>Phone</p>
            {isEditing ? (
              <input
                type="text"
                name="phone"
                value={editForm.phone}
                onChange={onChange}
                className={inputClass}
              />
            ) : (
              <p className="text-sm font-semibold text-gray-700">
                {staff.phone || staff.mobile || "--"}
              </p>
            )}
          </div>
          <div>
            <p className={labelClass}>WhatsApp</p>
            {isEditing ? (
              <input
                type="text"
                name="whatsapp_number"
                value={editForm.whatsapp_number}
                onChange={onChange}
                className={inputClass}
              />
            ) : (
              <p className="text-sm font-semibold text-gray-700">
                {staff.whatsapp_number || "--"}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-4 text-sm text-gray-700">
          {/* <div>
            <p className={labelClass}>Department</p>
            <p className="mt-1 text-base font-semibold text-gray-900">
              {departmentName}
            </p>
          </div> */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={labelClass}>Staff Department</p>
              {isEditing ? (
                <select
                  name="staff_department"
                  value={editForm.staff_department}
                  onChange={onStaffDepartmentChange}
                  className={inputClass}
                >
                  <option value="">Select staff department</option>
                  {staffDepartments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name || "Unnamed Department"}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 text-base font-semibold text-gray-900">
                  {staff.staff_department_name ||
                    staffDepartments.find(
                      (department) =>
                        String(department.id) ===
                        String(
                          staff.staff_department ??
                            staff.staff_department_id ??
                            "",
                        ),
                    )?.name ||
                    "--"}
                </p>
              )}
            </div>
            <div>
              <p className={labelClass}>Staff Job Title</p>
              {isEditing ? (
                <select
                  name="staff_job_title"
                  value={editForm.staff_job_title}
                  onChange={onChange}
                  disabled={!editForm.staff_department}
                  className={inputClass}
                >
                  <option value="">
                    {editForm.staff_department
                      ? "Select staff job title"
                      : "Select staff department first"}
                  </option>
                  {filteredStaffJobTitles.map((jobTitle) => (
                    <option key={jobTitle.id} value={jobTitle.id}>
                      {jobTitle.name || "Unnamed Job Title"}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 text-base font-semibold text-gray-900">
                  {staff.staff_job_title_name ||
                    staffJobTitles.find(
                      (jobTitle) =>
                        String(jobTitle.id) ===
                        String(
                          staff.staff_job_title ??
                            staff.staff_job_title_id ??
                            "",
                        ),
                    )?.name ||
                    "--"}
                </p>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className={labelClass}>Role</p>
              <p className="mt-1 font-semibold text-gray-900 capitalize">
                {roleLabel}
              </p>
            </div>
            <div>
              <p className={labelClass}>Status</p>
              <p className="mt-1 font-semibold text-gray-900">
                {isApproved ? "Approved" : "Pending"}
              </p>
            </div>
          </div>
          <div>
            <p className={labelClass}>Give Access to Add and Edit Details</p>
            {isEditing ? (
              <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="can_access"
                  checked={Boolean(editForm.can_access)}
                  onChange={onChange}
                  className="h-4 w-4 rounded border-gray-300 text-[#4F46E5] focus:ring-[#4F46E5]"
                />
                Allow access
              </label>
            ) : (
              <p className="mt-1 font-semibold text-gray-900">
                {staff.can_access ? "Yes" : "No"}
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className={labelClass}>Last Updated :</p>
              <p className="mt-1 font-semibold text-gray-900">{lastUpdated}</p>
            </div>
            <div>
              <p className={labelClass}>Created By :</p>
              <p className="mt-1 font-semibold text-gray-900">
                {staff.created_by || "--"}
              </p>
            </div>
          </div>
        </div>

        {detailError && (
          <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
            {detailError}
          </div>
        )}

        {isEditing && (
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="w-full rounded-xl bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Updating..." : "Update Staff"}
            </button>
            {/* <button
              type="button"
              onClick={onCancelEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button> */}
          </div>
        )}
      </div>
    </div>
  );
}
