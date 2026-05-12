"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  CirclePlay,
  Grid,
  List,
  X,
  PenLine,
  CheckCheck,
  CheckSquare,
  Clock,
  UserX,
  MoreVertical,
  Trash2,
} from "lucide-react";
import {
  getAllAdministrations,
  approveAdministration,
  upholdAdministration,
  getApprovedAdministratorTypes,
  createNewAdministration,
  updateAdministration,
  deleteAdministration,
  get_Hospital_User_Login_Details,
  uploadImageFromAnyWhere,
  extractAttachmentIdFromUploadResponse,
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

const jobTitleOptions = [
  { value: "Driver", label: "Driver" },
  { value: "Security Guard", label: "Security Guard" },
  { value: "OT Nurse", label: "OT Nurse" },
  { value: "Ward Nurse", label: "Ward Nurse" },
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

const getJobTitleLabel = (value) => {
  if (!value) return "--";
  const match = jobTitleOptions.find((option) => option.value === value);
  return match?.label || value;
};

export default function AdministrationListPage() {
  const [selectedAdministration, setSelectedAdministration] = useState(null);
  const router = useRouter();

  const [allAdministrations, setAllAdministrations] = useState([]);
  const [error, setError] = useState(null);
  const [adminTypes, setAdminTypes] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formState, setFormState] = useState({
    full_name: "",
    email: "",
    phone: "",
    administration_type: "",
    job_title: "",
    role: "administration",
  });
  const [localMessage, setLocalMessage] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [administrationTypeFilter, setAdministrationTypeFilter] =
    useState("all");
  const [administrationSearch, setAdministrationSearch] = useState("");
  const [loggedInDetails, setLoggedInDetails] = useState(null);
  const [companyError, setCompanyError] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDelistAdministration, setPendingDelistAdministration] =
    useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [isDetailSaving, setIsDetailSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    whatsapp_number: "",
    administration_type: "",
    job_title: "",
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
      if (event.target.closest("[data-admin-menu]")) return;
      setOpenMenuId(null);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const handleMenuAction = async (action, administration) => {
    let actionFn = null;

    if (action === "Approve") {
      actionFn = approveAdministration;
    } else if (action === "Uphold") {
      actionFn = upholdAdministration;
    } else if (action === "Delist") {
      actionFn = deleteAdministration;
    }

    if (actionFn) {
      if (!companyId) {
        setError("Missing company context. Please refresh and try again.");
        return;
      }
      try {
        if (action === "Approve") {
          setLocalMessage("Sending approval email...");
        }
        if (action === "Delist") {
          await actionFn(administration.id, companyId);
          setAllAdministrations((prevAdministrations) =>
            prevAdministrations.filter((item) => item.id !== administration.id),
          );
          setSelectedAdministration((prevSelected) =>
            prevSelected?.id === administration.id ? null : prevSelected,
          );
          if (selectedAdministration?.id === administration.id) {
            setIsDetailOpen(false);
          }
          setLocalMessage("Administration delisted successfully.");
        } else {
          const updatedAdministration = await actionFn(
            administration.id,
            companyId,
          );
          if (action === "Approve") {
            const emailSent = updatedAdministration?.email_sent;
            const emailError = updatedAdministration?.email_error;
            if (emailSent === true) {
              setLocalMessage("Email sent.");
            } else if (emailSent === false) {
              setLocalMessage(
                emailError
                  ? `Approval updated, but email failed: ${emailError}`
                  : "Approval updated, but email could not be sent.",
              );
            } else {
              setLocalMessage("Approval updated.");
            }
          }
          setAllAdministrations((prevAdministrations) =>
            prevAdministrations.map((item) =>
              item.id === administration.id
                ? { ...item, ...updatedAdministration }
                : item,
            ),
          );
          setSelectedAdministration((prevSelected) =>
            prevSelected?.id === administration.id
              ? { ...prevSelected, ...updatedAdministration }
              : prevSelected,
          );
          setError(null);
        }
      } catch (err) {
        console.error("Failed to update administration status:", err);
        const apiMessage =
          err.response?.data?.errors ||
          err.response?.data?.error ||
          err.message ||
          "Failed to update administration status.";
        setError(
          typeof apiMessage === "string"
            ? apiMessage
            : "Failed to update administration status.",
        );
      }
    } else {
      console.log(`${action} administration id:`, administration.id);
    }

    setOpenMenuId(null);
  };

  const requestDelistConfirmation = (administration) => {
    setPendingDelistAdministration(administration);
    setIsConfirmOpen(true);
    setOpenMenuId(null);
  };

  const closeDelistConfirmation = () => {
    setIsConfirmOpen(false);
    setPendingDelistAdministration(null);
  };

  const confirmDelist = async () => {
    if (!pendingDelistAdministration) return;
    await handleMenuAction("Delist", pendingDelistAdministration);
    closeDelistConfirmation();
  };

  const fetchAlladministrations = useCallback(async (company_id) => {
    if (!company_id) return;
    try {
      const data = await getAllAdministrations(company_id, "administration");
      setError(null);
      console.log(data);

      const normalized = Array.isArray(data) ? data : [];
      setAllAdministrations(
        normalized.filter(
          (item) => String(item?.role || "").toLowerCase() === "administration",
        ),
      );
    } catch {
      setError("Failed to fetch administrations.");
    }
  }, []);

  useEffect(() => {
    const savedView =
      typeof window !== "undefined"
        ? localStorage.getItem("administrationViewMode")
        : null;
    if (savedView === "grid" || savedView === "list") {
      setViewMode(savedView);
    }
    const username = localStorage.getItem("username");
    if (username) {
      get_Hospital_User_Login_Details(username)
        .then((data) => {
          console.log(data);

          setLoggedInDetails(data);
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
  }, [fetchAlladministrations]);

  useEffect(() => {
    if (companyId) {
      fetchAlladministrations(companyId);
    }
  }, [companyId, fetchAlladministrations]);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("administrationViewMode", mode);
    }
  };

  useEffect(() => {
    const fetchAdminTypes = async () => {
      if (!companyId) return;
      try {
        const data = await getApprovedAdministratorTypes(companyId);
        setAdminTypes(Array.isArray(data) ? data : []);
      } catch {
        setAdminTypes([]);
      }
    };
    fetchAdminTypes();
  }, [companyId]);

  const filteredAdministrations = allAdministrations.filter(
    (administration) => {
      const matchesType =
        administrationTypeFilter === "all" ||
        String(administration.administration_type) === administrationTypeFilter;
      if (!matchesType) return false;
      const query = administrationSearch.trim().toLowerCase();
      if (!query) return true;
      return [
        administration.full_name,
        administration.phone,
        administration.administration_type_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    },
  );

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    if (selectedAdministration) {
      setEditForm({
        full_name: selectedAdministration.full_name || "",
        email: selectedAdministration.email || "",
        phone: selectedAdministration.phone || "",
        whatsapp_number: selectedAdministration.whatsapp_number || "",
        administration_type: selectedAdministration.administration_type
          ? String(selectedAdministration.administration_type)
          : "",
        job_title: selectedAdministration.job_title || "",
        can_access: Boolean(selectedAdministration.can_access),
      });
      setEditProfileImage(null);
      updateEditPreview(formatProfileImage(selectedAdministration.image_url));
    } else {
      setEditForm({
        full_name: "",
        email: "",
        phone: "",
        whatsapp_number: "",
        administration_type: "",
        job_title: "",
        can_access: false,
      });
      setEditProfileImage(null);
      updateEditPreview("");
    }
  }, [selectedAdministration, updateEditPreview]);

  const openAdministrationDetails = (administration) => {
    setSelectedAdministration(administration);
    setIsDetailOpen(true);
    setIsEditingDetails(false);
    setDetailError(null);
  };

  const closeDetailsPanel = () => {
    setIsDetailOpen(false);
    setIsEditingDetails(false);
    setDetailError(null);
  };

  const startEditingDetails = () => {
    if (!selectedAdministration) return;
    setIsEditingDetails(true);
    setDetailError(null);
  };

  const cancelEditingDetails = () => {
    setIsEditingDetails(false);
    setDetailError(null);
    clearEditProfileImage();
    if (selectedAdministration) {
      setEditForm({
        full_name: selectedAdministration.full_name || "",
        email: selectedAdministration.email || "",
        phone: selectedAdministration.phone || "",
        whatsapp_number: selectedAdministration.whatsapp_number || "",
        administration_type: selectedAdministration.administration_type
          ? String(selectedAdministration.administration_type)
          : "",
        job_title: selectedAdministration.job_title || "",
        can_access: Boolean(selectedAdministration.can_access),
      });
    }
  };

  const handleDetailFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEditProfileImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      setDetailError("Please select an image file.");
      return;
    }
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setDetailError("Image too large. Max size is 2MB.");
      return;
    }
    setDetailError(null);
    setEditProfileImage(file);
    updateEditPreview(URL.createObjectURL(file));
  };

  const clearEditProfileImage = () => {
    setEditProfileImage(null);
    if (selectedAdministration) {
      updateEditPreview(formatProfileImage(selectedAdministration.image_url));
    } else {
      updateEditPreview("");
    }
  };

  const handleUpdateAdministrationDetails = async () => {
    if (!selectedAdministration) return;
    if (!companyId) {
      setDetailError("Missing company context. Please refresh and try again.");
      return;
    }
    setIsDetailSaving(true);
    setDetailError(null);

    try {
      const payload = {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        whatsapp_number: editForm.whatsapp_number.trim(),
        administration_type: editForm.administration_type
          ? Number(editForm.administration_type)
          : null,
        job_title: editForm.job_title || null,
        can_access: Boolean(editForm.can_access),
      };
      if (editProfileImage) {
        const username =
          loggedInDetails?.username ||
          loggedInDetails?.user?.username ||
          localStorage.getItem("username") ||
          loggedInDetails?.user?.email ||
          loggedInDetails?.email ||
          selectedAdministration.username ||
          selectedAdministration.email ||
          "";
        if (!username) {
          throw new Error(
            "Missing uploader username. Please login again and retry.",
          );
        }
        const uploadResponse = await uploadImageFromAnyWhere(
          editProfileImage,
          username,
          companyId,
        );
        const attachmentId =
          extractAttachmentIdFromUploadResponse(uploadResponse);
        if (!attachmentId) {
          throw new Error(uploadResponse?.response?.msg || "Attachment ID missing.");
        }
        payload.attachment_id = attachmentId;
      }

      const updatedAdministration = await updateAdministration(
        selectedAdministration.id,
        payload,
        companyId,
      );
      const normalizedUpdatedAdministration = {
        ...selectedAdministration,
        ...updatedAdministration,
        attachment_id:
          updatedAdministration?.attachment_id ??
          payload?.attachment_id ??
          selectedAdministration?.attachment_id ??
          null,
        image_url:
          updatedAdministration?.image_url ||
          editProfilePreview ||
          selectedAdministration?.image_url ||
          "",
      };

      setAllAdministrations((prevAdministrations) =>
        prevAdministrations.map((item) =>
          item.id === normalizedUpdatedAdministration.id
            ? normalizedUpdatedAdministration
            : item,
        ),
      );
      setSelectedAdministration(normalizedUpdatedAdministration);
      setEditProfileImage(null);
      updateEditPreview(formatProfileImage(normalizedUpdatedAdministration.image_url));
      setIsEditingDetails(false);
      setLocalMessage("Administration updated successfully.");
    } catch (err) {
      const apiError =
        err.response?.data?.errors ||
        err.response?.data?.error ||
        err.message ||
        "Failed to update administration.";
      if (typeof apiError === "string") {
        setDetailError(apiError);
      } else if (apiError && typeof apiError === "object") {
        const firstKey = Object.keys(apiError)[0];
        const firstMessage = Array.isArray(apiError[firstKey])
          ? apiError[firstKey][0]
          : apiError[firstKey];
        setDetailError(firstMessage || "Failed to update administration.");
      } else {
        setDetailError("Failed to update administration.");
      }
    } finally {
      setIsDetailSaving(false);
    }
  };

  // const openAdministrationDetails = (administration) => {
  //   setSelectedAdministration(administration);
  //   setIsDetailOpen(true);
  // };

  // const closeDetailsPanel = () => {
  //   setIsDetailOpen(false);
  // };

  const handleNavigateToSignup = () => {
    const params = new URLSearchParams({
      role: "administration",
      hide_doctor_role: "true",
    });
    if (companyId) {
      params.set("company_id", String(companyId));
    }
    router.push(`/signup?${params.toString()}`);
  };

  const closeDialog = () => {
    if (isSubmitting) return;
    setIsDialogOpen(false);
    setFormError(null);
    setFormState({
      full_name: "",
      email: "",
      phone: "",
      administration_type: "",
      job_title: "",
      role: "administration",
    });
  };

  const handleCreateAdministration = async (event) => {
    event.preventDefault();
    if (!formState.full_name.trim()) {
      setFormError("Full name is required.");
      return;
    }
    if (!formState.email.trim()) {
      setFormError("Email is required.");
      return;
    }
    if (!formState.phone.trim()) {
      setFormError("Phone is required.");
      return;
    }
    // if (!formState.password.trim()) {
    //   setFormError("Temporary password is required.");
    //   return;
    // }
    if (!formState.administration_type) {
      setFormError("Please select an administration type.");
      return;
    }
    if (!formState.job_title) {
      setFormError("Please select a job title.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setLocalMessage(null);
    try {
      if (!companyId) {
        setFormError("Missing company context. Please refresh and try again.");
        setIsSubmitting(false);
        return;
      }
      await createNewAdministration(
        {
          full_name: formState.full_name.trim(),
          email: formState.email.trim(),
          phone: formState.phone.trim(),
          password: "abc123",
          role: formState.role,
          administration_type: Number(formState.administration_type),
          job_title: formState.job_title,
        },
        companyId,
      );
      setLocalMessage("Administration created successfully.");
      closeDialog();
      fetchAlladministrations(companyId);
    } catch (creationError) {
      const apiError =
        creationError.response?.data?.errors?.full_name?.[0] ||
        creationError.response?.data?.errors?.email?.[0] ||
        creationError.response?.data?.errors?.phone?.[0] ||
        creationError.response?.data?.error?.[0] ||
        "Could not create administration. Please try again.";
      setFormError(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full min-h-0 box-border overflow-hidden p-6 bg-gradient-to-br from-[#f9fafc] to-[#eef3f9] flex flex-col">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Administration</h1>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsVideoModalOpen(true)}
            className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-white p-2.5 text-[#4F46E5] shadow-sm transition hover:bg-indigo-50"
            aria-label="Watch administration setup video"
            title="Watch administration setup video"
          >
            <CirclePlay size={20} />
          </button>
          <button
            type="button"
            onClick={handleNavigateToSignup}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#5B5BF6] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-[#4338CA] hover:to-[#4F46E5]"
          >
            <Plus size={18} />
            Add Adm Staff
          </button>
        </div>
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
              setSelectedAdministration(null);
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
              value={administrationTypeFilter}
              onChange={(event) =>
                setAdministrationTypeFilter(event.target.value)
              }
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2 pr-10 text-sm text-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">Filter Administration Department</option>
              {adminTypes.map((type) => (
                <option key={type.id} value={String(type.id)}>
                  {type.name}
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
              value={administrationSearch}
              onChange={(event) => setAdministrationSearch(event.target.value)}
              placeholder="Search Here..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          {(administrationTypeFilter !== "all" ||
            administrationSearch.trim()) && (
            <button
              type="button"
              onClick={() => {
                setAdministrationTypeFilter("all");
                setAdministrationSearch("");
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

      <div className="flex-1 min-h-0 overflow-hidden lg:relative">
        <div className="h-full min-h-0 overflow-y-auto pr-1 pb-2">
          {viewMode === "grid" ? (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 auto-rows-fr justify-items-center">
              {filteredAdministrations.map((administration) => {
                const isApproved = Boolean(administration.is_approve);
                const statusLabel = isApproved ? "Approved" : "Pending";
                const imageSrc = formatProfileImage(administration.image_url);

                return (
                  <div
                    key={administration.id}
                    className="w-full h-full max-w-[280px]"
                  >
                    <div
                      onClick={() => openAdministrationDetails(administration)}
                      className={`relative bg-white rounded-2xl shadow-md hover:shadow-lg p-6 text-center cursor-pointer transition-all h-full flex flex-col ${
                        selectedAdministration?.id === administration.id
                          ? "ring-2 ring-indigo-500"
                          : ""
                      }`}
                    >
                      <div className="absolute right-3 top-3" data-admin-menu>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuId((prev) =>
                              prev === administration.id
                                ? null
                                : administration.id,
                            );
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-100"
                          aria-label="Administration actions"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === administration.id && (
                          <div
                            className="absolute right-0 z-20 mt-2 w-32 rounded-md border border-gray-200 bg-white shadow-lg"
                            onClick={(event) => event.stopPropagation()}
                            data-admin-menu
                          >
                            {isApproved && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleMenuAction("Uphold", administration)
                                }
                                className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                              >
                                Uphold
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                openAdministrationDetails(administration)
                              }
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
                            alt={
                              administration.name || administration.full_name
                            }
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-800 truncate w-full">
                          {administration.full_name}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {administration.administration_type_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {administration.email}
                        </p>

                        <div className="flex gap-4 justify-center mt-4 text-gray-500 w-full">
                          <button
                            className={`px-4 py-1.5 text-sm font-medium rounded-full text-white ${
                              isApproved ? "status-approved" : "blink-pending"
                            }`}
                          >
                            {statusLabel}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                    <th
                      scope="col"
                      className="px-6 py-3 font-semibold text-gray-600"
                    >
                      Administration Type
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 font-semibold text-gray-600"
                    >
                      Approval Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 font-semibold text-gray-600 text-center"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAdministrations.map((administration) => {
                    const isApproved = Boolean(administration.is_approve);
                    const statusLabel = isApproved ? "Approved" : "Pending";
                    const imageSrc = formatProfileImage(
                      administration.image_url,
                    );

                    return (
                      <tr
                        key={administration.id}
                        className="hover:bg-gray-50 transition cursor-pointer"
                        onClick={() =>
                          openAdministrationDetails(administration)
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-10 w-10 overflow-hidden rounded-full border border-gray-200 shadow-sm">
                            <img
                              src={imageSrc}
                              alt={administration.full_name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {administration.full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {administration.email ? (
                            <span className="inline-flex items-center text-green-600">
                              <CheckSquare size={16} />
                              <span className="sr-only">Email available</span>
                            </span>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {administration.phone ? (
                            <span className="inline-flex items-center text-green-600">
                              <CheckSquare size={16} />
                              <span className="sr-only">Phone available</span>
                            </span>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {administration.administration_type_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                              isApproved
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                            aria-label={statusLabel}
                          >
                            {isApproved ? (
                              <CheckCheck size={14} />
                            ) : (
                              <Clock size={14} />
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {isApproved && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleMenuAction("Uphold", administration);
                                }}
                                className="rounded-full border border-[#4F46E5] px-4 py-1.5 text-xs font-medium text-[#4F46E5] transition hover:bg-[#4F46E5] hover:text-white"
                              >
                                Uphold
                              </button>
                            )}
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 text-red-600 transition hover:bg-red-50"
                              onClick={(event) => {
                                event.stopPropagation();
                                requestDelistConfirmation(administration);
                              }}
                              aria-label="Delist administration"
                            >
                              <UserX size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isDetailOpen && (
          <div className="hidden lg:block absolute right-0 top-0 z-20 w-[360px]">
            <div className="max-h-[calc(100vh-3rem)] overflow-y-auto pr-1 rounded-3xl border border-gray-100 bg-white shadow-xl">
              <AdministrationDetailContent
                administration={selectedAdministration}
                adminTypes={adminTypes}
                isEditing={isEditingDetails}
                editForm={editForm}
                editProfilePreview={editProfilePreview}
                hasNewProfileImage={Boolean(editProfileImage)}
                onSelectProfileImage={handleEditProfileImageChange}
                onRemoveProfileImage={clearEditProfileImage}
                onChange={handleDetailFieldChange}
                onStartEdit={startEditingDetails}
                onCancelEdit={cancelEditingDetails}
                onSave={handleUpdateAdministrationDetails}
                isSaving={isDetailSaving}
                detailError={detailError}
                onDelist={() =>
                  selectedAdministration &&
                  requestDelistConfirmation(selectedAdministration)
                }
                onClose={closeDetailsPanel}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile detail drawer */}
      {isDetailOpen && selectedAdministration && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 lg:hidden"
            aria-hidden="true"
            onClick={closeDetailsPanel}
          />
          <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-transparent transition-transform duration-300 lg:hidden translate-x-0">
            <div className="h-full overflow-y-auto px-4 py-6">
              <AdministrationDetailContent
                administration={selectedAdministration}
                adminTypes={adminTypes}
                isEditing={isEditingDetails}
                editForm={editForm}
                editProfilePreview={editProfilePreview}
                hasNewProfileImage={Boolean(editProfileImage)}
                onSelectProfileImage={handleEditProfileImageChange}
                onRemoveProfileImage={clearEditProfileImage}
                onChange={handleDetailFieldChange}
                onStartEdit={startEditingDetails}
                onCancelEdit={cancelEditingDetails}
                onSave={handleUpdateAdministrationDetails}
                isSaving={isDetailSaving}
                detailError={detailError}
                onDelist={() =>
                  selectedAdministration &&
                  requestDelistConfirmation(selectedAdministration)
                }
                onClose={closeDetailsPanel}
              />
            </div>
          </aside>
        </>
      )}

      <style jsx>{`
        .blink-pending {
          color: #ffffff;
          border: none;
          animation: blinkPending 1.2s ease-in-out infinite;
        }

        .status-approved {
          background-color: #22c55e;
          border: none;
        }

        .status-approved:hover {
          background-color: #16a34a;
        }

        @keyframes blinkPending {
          0%,
          100% {
            background-color: #f97316;
          }
          50% {
            background-color: #facc15;
          }
        }
      `}</style>
      {isDialogOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Create Administration
                </h2>
                <p className="text-sm text-gray-500">
                  Fill in the details to add a new administration account.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={handleCreateAdministration}
              className="space-y-4 px-6 py-6"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="administration-full-name"
                    className="text-sm font-medium text-gray-700"
                  >
                    Full Name
                  </label>
                  <input
                    id="administration-full-name"
                    name="full_name"
                    type="text"
                    value={formState.full_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Alex Johnson"
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="administration-email"
                    className="text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <input
                    id="administration-email"
                    name="email"
                    type="email"
                    value={formState.email}
                    onChange={handleInputChange}
                    placeholder="alex@hospital.com"
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="administration-phone"
                    className="text-sm font-medium text-gray-700"
                  >
                    Phone
                  </label>
                  <input
                    id="administration-phone"
                    name="phone"
                    type="text"
                    value={formState.phone}
                    onChange={handleInputChange}
                    placeholder="+1 555 123 4567"
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                {/* <div>
                  <label
                    htmlFor="administration-password"
                    className="text-sm font-medium text-gray-700"
                  >
                    Temporary Password
                  </label>
                  <input
                    id="administration-password"
                    name="password"
                    type="password"
                    value={formState.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div> */}
                <div>
                  <label
                    htmlFor="administration-type"
                    className="text-sm font-medium text-gray-700"
                  >
                    Administration Type
                  </label>
                  <select
                    id="administration-type"
                    name="administration_type"
                    value={formState.administration_type}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Select type</option>
                    {adminTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="administration-job-title"
                    className="text-sm font-medium text-gray-700"
                  >
                    Job Title
                  </label>
                  <select
                    id="administration-job-title"
                    name="job_title"
                    value={formState.job_title}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Select job title</option>
                    {jobTitleOptions.map((jobTitle) => (
                      <option key={jobTitle.value} value={jobTitle.value}>
                        {jobTitle.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-xl bg-[#4F46E5] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Creating..." : "Create Administration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h2 className="text-base font-semibold text-gray-900">
                Administration Video Guide
              </h2>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
                aria-label="Close video modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                className="h-full w-full"
                src="https://www.youtube.com/embed/k8bip-uhd98?autoplay=1"
                title="Administration tutorial video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                {/* <h2 className="text-lg font-semibold text-gray-900">
                  Confirm Delist
                </h2> */}
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Trash2 size={18} className="text-red-600" />
                  Confirm Delist{" "}
                  <span className="font-semibold text-red-600">
                    {pendingDelistAdministration.full_name}
                  </span>
                </h2>
                {/* <p className="text-sm text-gray-500">
                  This will remove the administration from the active list.
                </p> */}
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
              {pendingDelistAdministration?.full_name ? (
                <>
                  Delist the administration from the active list{" "}
                  <span className="font-semibold text-gray-900">
                    {pendingDelistAdministration.full_name}
                  </span>
                  ?
                </>
              ) : (
                "Delist this administration?"
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
                Yes, delist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdministrationDetailContent({
  administration,
  adminTypes,
  isEditing,
  editForm,
  editProfilePreview,
  hasNewProfileImage,
  onSelectProfileImage,
  onRemoveProfileImage,
  onChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  isSaving,
  detailError,
  onDelist,
  onClose,
}) {
  if (!administration) {
    return (
      <div className="text-sm text-gray-500">
        Select an administration to view detailed information.
      </div>
    );
  }

  const isApproved = Boolean(administration.is_approve);
  const labelClass =
    "text-[11px] font-medium uppercase tracking-wide text-gray-500";
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20";
  const valueClass = "mt-1 text-sm font-semibold text-gray-900";
  const lastUpdated = administration.updated_on
    ? new Date(administration.updated_on).toLocaleString()
    : "Not updated yet";
  const previewSrc = isEditing
    ? editProfilePreview || formatProfileImage(administration.image_url)
    : formatProfileImage(administration.image_url);
  const uploadInputId = `admin-profile-upload-${administration.id}`;

  return (
    <div className="w-full max-w-md">
      <div className="rounded-[24px] bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500">
            User Detail
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDelist}
              className="rounded-full border border-red-200 bg-white p-2 text-red-600 shadow-sm transition hover:bg-red-50"
              aria-label="Delist administration"
            >
              <UserX size={16} />
            </button>
            {!isEditing && (
              <button
                type="button"
                onClick={onStartEdit}
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition hover:text-[#4F46E5]"
                aria-label="Edit administration"
              >
                <PenLine size={16} />
              </button>
            )}
            {/* {isEditing && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition hover:text-red-500"
                aria-label="Cancel editing"
              >
                <X size={16} />
              </button>
            )} */}
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

        <div className="my-3 border-t border-gray-100" />

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-16 w-16 overflow-hidden rounded-full border-4 border-white shadow-md">
              <img
                key={`${administration.id}-${previewSrc}`}
                src={previewSrc}
                alt={administration.full_name}
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
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                isApproved
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {isApproved ? "Approved" : "Pending"}
            </span>
          </div>
          <div className="flex-1 space-y-3">
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
                <p className="text-base font-semibold text-gray-900">
                  {administration.full_name || "--"}
                </p>
              )}
            </div>
            <div>
              <p className={labelClass}>Email</p>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={editForm.email}
                  onChange={onChange}
                  className={inputClass}
                />
              ) : (
                <p className="text-sm font-semibold text-gray-700">
                  {administration.email || "--"}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                {administration.phone || "--"}
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
                {administration.whatsapp_number || "--"}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3 text-sm text-gray-700">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className={labelClass}>Administration Type</p>
              {isEditing ? (
                <select
                  name="administration_type"
                  value={editForm.administration_type}
                  onChange={onChange}
                  className={`${inputClass} bg-white`}
                >
                  <option value="">Select administration type</option>
                  {adminTypes.map((type) => (
                    <option key={type.id} value={String(type.id)}>
                      {type.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {administration.administration_type_name || "--"}
                </p>
              )}
            </div>
            <div>
              <p className={labelClass}>Job Title</p>
              {isEditing ? (
                <select
                  name="job_title"
                  value={editForm.job_title}
                  onChange={onChange}
                  className={`${inputClass} bg-white`}
                >
                  <option value="">Select job title</option>
                  {jobTitleOptions.map((jobTitle) => (
                    <option key={jobTitle.value} value={jobTitle.value}>
                      {jobTitle.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {getJobTitleLabel(administration.job_title)}
                </p>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className={labelClass}>Role</p>
              <p className="mt-1 font-semibold text-gray-900 capitalize">
                {administration.role || "Administration"}
              </p>
            </div>
            <div>
              <p className={labelClass}>Status</p>
              <p className="mt-1 font-semibold text-gray-900">
                {isApproved ? "Approved" : "Pending"}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className={labelClass}>Last Updated :</p>
              <p className="mt-1 font-semibold text-gray-900">{lastUpdated}</p>
            </div>
            <div>
              <p className={labelClass}>Created By :</p>
              <p className="mt-1 font-semibold text-gray-900">
                {administration.created_by || "--"}
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
              <p className={valueClass}>
                {administration.can_access ? "Yes" : "No"}
              </p>
            )}
          </div>
        </div>

        {detailError && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
            {detailError}
          </div>
        )}

        {isEditing && (
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="w-full rounded-xl bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Updating..." : "Update Administration"}
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
