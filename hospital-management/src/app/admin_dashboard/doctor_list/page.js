"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  CirclePlay,
  Grid,
  List,
  X,
  CheckCheck,
  CheckSquare,
  Clock,
  UserX,
  MoreVertical,
  Trash2,
} from "lucide-react";
import {
  getAllDoctors,
  approveDoctor,
  upholdDoctor,
  deleteDoctor,
  createNewDoctor,
  updateDoctor,
  uploadImageFromAnyWhere,
  get_Hospital_User_Login_Details,
  getApprovedDepartments,
  getApprovedDoctorTypes,
  updateDoctorSchedule,
  getAllDoctorSchedules,
  extractAttachmentIdFromUploadResponse,
} from "@/app/api/apiService";
import { formatProfileImage } from "@/utils/profileImage";

export default function DoctorListPage() {
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const router = useRouter();

  const [allDoctors, setAllDoctors] = useState([]);
  const [error, setError] = useState(null);
  const [localMessage, setLocalMessage] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [doctorTypes, setDoctorTypes] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [doctorTypeFilter, setDoctorTypeFilter] = useState("all");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    whatsapp_number: "",
    medical_council_registration: "",
    department: "",
    doctor_type: "",
  });
  const [editProfileImage, setEditProfileImage] = useState(null);
  const [editProfilePreview, setEditProfilePreview] = useState("");
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [profileImageError, setProfileImageError] = useState(null);
  const updateEditPreview = useCallback((nextSrc) => {
    setEditProfilePreview((prev) => {
      if (prev && prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return nextSrc;
    });
  }, []);
  const [detailError, setDetailError] = useState(null);
  const [isDetailSaving, setIsDetailSaving] = useState(false);
  const [formState, setFormState] = useState({
    full_name: "",
    email: "",
    phone: "",
    medical_council_registration: "",
    // password: "",
    department: "",
    doctor_type: "",
    role: "doctor",
  });
  const [viewMode, setViewMode] = useState("grid");
  const [loggedInDetails, setLoggedInDetails] = useState(null);
  const [companyError, setCompanyError] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDelistDoctor, setPendingDelistDoctor] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

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
      if (event.target.closest("[data-doctor-menu]")) return;
      setOpenMenuId(null);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const handleMenuAction = async (action, doctor) => {
    let actionFn = null;

    if (action === "Approve") {
      actionFn = approveDoctor;
    } else if (action === "Uphold") {
      actionFn = upholdDoctor;
    } else if (action === "Delete" || action === "Delist") {
      actionFn = deleteDoctor;
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
        if (action === "Delete" || action === "Delist") {
          await actionFn(doctor.id, companyId);
          setAllDoctors((prevDoctors) =>
            prevDoctors.filter((item) => item.id !== doctor.id),
          );
          setSelectedDoctor((prevSelected) =>
            prevSelected?.id === doctor.id ? null : prevSelected,
          );
          if (selectedDoctor?.id === doctor.id) {
            setIsDetailOpen(false);
          }
          setLocalMessage("Doctor delisted successfully.");
        } else {
          const updatedDoctor = await actionFn(doctor.id, companyId);
          if (action === "Approve") {
            const emailSent = updatedDoctor?.email_sent;
            const emailError = updatedDoctor?.email_error;
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
          const targetStatus =
            typeof updatedDoctor?.is_approve === "boolean"
              ? updatedDoctor.is_approve
              : action === "Approve";
          try {
            const schedules = await getAllDoctorSchedules(companyId, doctor.id);
            await Promise.all(
              (schedules || [])
                .filter((schedule) => schedule?.id)
                .map((schedule) =>
                  updateDoctorSchedule(schedule.id, companyId, {
                    is_available: targetStatus,
                  }).catch(() => null),
                ),
            );
          } catch (scheduleError) {
            console.error(
              "Failed to update schedule availability:",
              scheduleError,
            );
          }
          setAllDoctors((prevDoctors) =>
            prevDoctors.map((item) =>
              item.id === doctor.id ? { ...item, ...updatedDoctor } : item,
            ),
          );
          setSelectedDoctor((prevSelected) =>
            prevSelected?.id === doctor.id
              ? { ...prevSelected, ...updatedDoctor }
              : prevSelected,
          );
          setError(null);
        }
      } catch (err) {
        console.error("Failed to update doctor status:", err);
        setError("Failed to update doctor status.");
      }
    } else {
      console.log(`${action} doctor id:`, doctor.id);
    }

    setOpenMenuId(null);
  };

  const requestDelistConfirmation = (doctor) => {
    setPendingDelistDoctor(doctor);
    setIsConfirmOpen(true);
    setOpenMenuId(null);
  };

  const closeDelistConfirmation = () => {
    setIsConfirmOpen(false);
    setPendingDelistDoctor(null);
  };

  const confirmDelist = async () => {
    if (!pendingDelistDoctor) return;
    await handleMenuAction("Delist", pendingDelistDoctor);
    closeDelistConfirmation();
  };

  const openDoctorDetails = (doctor) => {
    setSelectedDoctor(doctor);
    setIsDetailOpen(true);
    setIsEditingDetails(false);
    setDetailError(null);
    setEditProfileImage(null);
    updateEditPreview(formatProfileImage(doctor?.image_url));
  };

  const closeDetailsPanel = () => {
    setIsDetailOpen(false);
    setIsEditingDetails(false);
    setDetailError(null);
    setEditProfileImage(null);
  };

  const startEditingDetails = () => {
    if (!selectedDoctor) return;
    setEditForm({
      full_name: selectedDoctor.full_name || "",
      email: selectedDoctor.email || "",
      phone: selectedDoctor.phone || "",
      whatsapp_number: selectedDoctor.whatsapp_number || "",
      medical_council_registration:
        selectedDoctor.medical_council_registration || "",
      department: selectedDoctor.department
        ? String(selectedDoctor.department)
        : "",
      doctor_type: selectedDoctor.doctor_type
        ? String(selectedDoctor.doctor_type)
        : "",
    });
    setDetailError(null);
    setIsEditingDetails(true);
    setEditProfileImage(null);
    updateEditPreview(formatProfileImage(selectedDoctor.image_url));
  };

  const handleEditFormChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const cancelEditingDetails = () => {
    setIsEditingDetails(false);
    setDetailError(null);
    setEditProfileImage(null);
    if (selectedDoctor) {
      setEditForm({
        full_name: selectedDoctor.full_name || "",
        email: selectedDoctor.email || "",
        phone: selectedDoctor.phone || "",
        whatsapp_number: selectedDoctor.whatsapp_number || "",
        medical_council_registration:
          selectedDoctor.medical_council_registration || "",
        department: selectedDoctor.department
          ? String(selectedDoctor.department)
          : "",
        doctor_type: selectedDoctor.doctor_type
          ? String(selectedDoctor.doctor_type)
          : "",
      });
      updateEditPreview(formatProfileImage(selectedDoctor.image_url));
    }
  };

  const handleEditProfileImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedDoctor || !companyId) return;
    setProfileImageError(null);
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setProfileImageError("Image too large. Max size is 2MB.");
      return;
    }
    updateEditPreview(URL.createObjectURL(file));
    setEditProfileImage(file);
  };

  const clearEditProfileImage = () => {
    setEditProfileImage(null);
    updateEditPreview(formatProfileImage(selectedDoctor?.image_url));
  };

  const handleUpdateDoctor = async () => {
    if (!selectedDoctor) return;
    if (!companyId) {
      setDetailError("Missing company context. Please refresh and try again.");
      return;
    }
    setIsDetailSaving(true);
    setDetailError(null);
    setProfileImageError(null);
    try {
      const payload = {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        whatsapp_number: editForm.whatsapp_number.trim(),
        medical_council_registration:
          editForm.medical_council_registration.trim(),
        department: editForm.department ? Number(editForm.department) : null,
        doctor_type: editForm.doctor_type ? Number(editForm.doctor_type) : null,
      };
      if (editProfileImage) {
        setIsUploadingProfileImage(true);
        const username =
          loggedInDetails?.username ||
          loggedInDetails?.user?.username ||
          localStorage.getItem("username") ||
          loggedInDetails?.user?.email ||
          loggedInDetails?.email ||
          selectedDoctor.username ||
          selectedDoctor.email ||
          "";
        if (!username) {
          setProfileImageError(
            "Missing uploader username. Please login again and retry.",
          );
          throw new Error("Missing uploader username.");
        }
        try {
          const uploadResponse = await uploadImageFromAnyWhere(
            editProfileImage,
            username,
            companyId,
          );
          const attachmentId =
            extractAttachmentIdFromUploadResponse(uploadResponse);
          if (!attachmentId) {
            const uploadMessage =
              uploadResponse?.response?.msg || "Attachment ID missing.";
            throw new Error(uploadMessage);
          }
          payload.attachment_id = attachmentId;
        } catch (uploadError) {
          const uploadMessage =
            uploadError.response?.data?.response?.msg ||
            uploadError.response?.data?.msg ||
            uploadError.message ||
            "Failed to upload profile image.";
          setProfileImageError(uploadMessage);
          throw new Error(uploadMessage);
        }
      }
      const updatedDoctor = await updateDoctor(
        selectedDoctor.id,
        payload,
        companyId,
      );
      const normalizedUpdatedDoctor = {
        ...selectedDoctor,
        ...updatedDoctor,
        attachment_id:
          updatedDoctor?.attachment_id ??
          payload?.attachment_id ??
          selectedDoctor?.attachment_id ??
          null,
        image_url:
          updatedDoctor?.image_url ||
          editProfilePreview ||
          selectedDoctor?.image_url ||
          "",
      };
      setAllDoctors((prevDoctors) =>
        prevDoctors.map((doctor) =>
          doctor.id === normalizedUpdatedDoctor.id ? normalizedUpdatedDoctor : doctor,
        ),
      );
      setSelectedDoctor(normalizedUpdatedDoctor);
      setEditProfileImage(null);
      updateEditPreview(formatProfileImage(normalizedUpdatedDoctor.image_url));
      setIsEditingDetails(false);
      setLocalMessage("Doctor information updated.");
    } catch (updateError) {
      const apiError =
        updateError.response?.data?.errors ||
        updateError.response?.data?.error ||
        updateError.message ||
        "Failed to update doctor.";
      if (typeof apiError === "string") {
        setDetailError(apiError);
      } else if (apiError && typeof apiError === "object") {
        const firstKey = Object.keys(apiError)[0];
        const firstMessage = Array.isArray(apiError[firstKey])
          ? apiError[firstKey][0]
          : apiError[firstKey];
        setDetailError(firstMessage || "Failed to update doctor.");
      } else {
        setDetailError("Failed to update doctor.");
      }
    } finally {
      setIsUploadingProfileImage(false);
      setIsDetailSaving(false);
    }
  };

  const profileUploadInputId = selectedDoctor
    ? `doctor-profile-upload-${selectedDoctor.id}`
    : "doctor-profile-upload";
  const previewImage =
    editProfilePreview || formatProfileImage(selectedDoctor?.image_url);

  const detailPanelContent = (
    <>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white shadow-lg">
            <img
              key={`${selectedDoctor?.id}-${previewImage}`}
              src={previewImage}
              alt={selectedDoctor?.full_name || "Doctor avatar"}
              className="h-full w-full object-cover"
            />
          </div>
          {isEditingDetails && (
            <div className="flex flex-col items-center gap-1">
              <label
                htmlFor={profileUploadInputId}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  isUploadingProfileImage
                    ? "border-gray-200 text-gray-400 cursor-not-allowed"
                    : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {isUploadingProfileImage ? "Uploading..." : "Upload Photo"}
              </label>
              <input
                id={profileUploadInputId}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleEditProfileImageChange}
                disabled={isUploadingProfileImage}
              />
              {editProfileImage && (
                <button
                  type="button"
                  onClick={clearEditProfileImage}
                  className="text-xs font-medium text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          )}
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              selectedDoctor?.is_approve
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {selectedDoctor?.is_approve ? "Approved" : "Pending"}
          </span>
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500">Full Name</p>
            {isEditingDetails ? (
              <input
                type="text"
                name="full_name"
                value={editForm.full_name}
                onChange={handleEditFormChange}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            ) : (
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedDoctor?.full_name || "Select a doctor"}
              </h3>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Email</p>
            {isEditingDetails ? (
              <input
                type="email"
                name="email"
                value={editForm.email}
                onChange={handleEditFormChange}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            ) : (
              <p className="text-sm font-semibold text-gray-700">
                {selectedDoctor?.email || "--"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4 text-sm text-gray-600">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-gray-500">Phone</p>
            {isEditingDetails ? (
              <input
                type="text"
                name="phone"
                value={editForm.phone}
                onChange={handleEditFormChange}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            ) : (
              <p className="text-sm font-semibold text-gray-700">
                {selectedDoctor?.phone || "--"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">WhatsApp</p>
            {isEditingDetails ? (
              <input
                type="text"
                name="whatsapp_number"
                value={editForm.whatsapp_number}
                onChange={handleEditFormChange}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            ) : (
              <p className="text-sm font-semibold text-gray-700">
                {selectedDoctor?.whatsapp_number || "--"}
              </p>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">
            Medical Council Registration
          </p>
          {isEditingDetails ? (
            <input
              type="text"
              name="medical_council_registration"
              value={editForm.medical_council_registration}
              onChange={handleEditFormChange}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          ) : (
            <p className="text-sm font-semibold text-gray-700">
              {selectedDoctor?.medical_council_registration || "--"}
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-gray-500">Department</p>
            {isEditingDetails ? (
              <select
                name="department"
                value={editForm.department}
                onChange={handleEditFormChange}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-semibold text-gray-800">
                {selectedDoctor?.department_name || "--"}
              </span>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Doctor Type</p>
            {isEditingDetails ? (
              <select
                name="doctor_type"
                value={editForm.doctor_type}
                onChange={handleEditFormChange}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Select doctor type</option>
                {doctorTypes.map((type) => (
                  <option key={type.id} value={String(type.id)}>
                    {type.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-semibold text-gray-800">
                {selectedDoctor?.doctor_type_name || "--"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-500">Status</span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              selectedDoctor?.is_approve
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {selectedDoctor?.is_approve ? "Approved" : "Pending"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-500">Created By</span>
          <span className="font-semibold text-gray-800">
            {selectedDoctor?.created_by || "--"}
          </span>
        </div>
      </div>

      {detailError && (
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          {detailError}
        </div>
      )}
      {profileImageError && (
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          {profileImageError}
        </div>
      )}

      {isEditingDetails ? (
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleUpdateDoctor}
            disabled={isDetailSaving}
            className="w-full rounded-xl bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#4338CA] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isDetailSaving ? "Updating..." : "Update Doctor"}
          </button>
          <button
            type="button"
            onClick={cancelEditingDetails}
            className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      ) : null}
    </>
  );

  const fetchAllDoctors = useCallback(async (company_id) => {
    if (!company_id) return;
    try {
      const data = await getAllDoctors(company_id);
      setError(null);
      const normalized = (Array.isArray(data) ? data : [])
        .filter(
          (doctor) => String(doctor?.role || "").toLowerCase() === "doctor",
        )
        .map((doctor) => ({
          ...doctor,
          full_name: doctor.full_name ?? doctor.name ?? "",
          phone: doctor.phone ?? doctor.mobile ?? "",
          department_name:
            doctor.department_name ?? doctor.department?.name ?? "",
          doctor_type_name:
            doctor.doctor_type_name ?? doctor.doctor_type?.name ?? "",
        }));
      setAllDoctors(normalized);
    } catch (fetchError) {
      setError("Failed to fetch doctors.");
    }
  }, []);

  useEffect(() => {
    const savedView =
      typeof window !== "undefined"
        ? localStorage.getItem("doctorViewMode")
        : null;
    if (savedView === "grid" || savedView === "list") {
      setViewMode(savedView);
    }
    const username = localStorage.getItem("username");
    if (username) {
      get_Hospital_User_Login_Details(username)
        .then((data) => {
          setLoggedInDetails(data);
          const resolved = resolveCompanyId(data);
          if (resolved) {
            setCompanyId(resolved);
            setCompanyError(null);
          } else {
            setCompanyError("Unable to determine company context.");
          }
        })
        .catch((err) => {
          console.error("Error fetching user details:", err);
          setCompanyError("Unable to determine company context.");
        });
    } else {
      setCompanyError("Missing company context. Please login again.");
    }
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchAllDoctors(companyId);
    }
  }, [companyId, fetchAllDoctors]);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("doctorViewMode", mode);
    }
  };

  useEffect(() => {
    const fetchOptions = async () => {
      if (!companyId) return;
      try {
        const [deptData, doctorTypeData] = await Promise.all([
          getApprovedDepartments(companyId),
          getApprovedDoctorTypes(companyId),
        ]);
        setDepartments(Array.isArray(deptData) ? deptData : []);
        setDoctorTypes(Array.isArray(doctorTypeData) ? doctorTypeData : []);
      } catch {
        setDepartments([]);
        setDoctorTypes([]);
      }
    };
    fetchOptions();
  }, [companyId]);

  useEffect(() => {
    if (selectedDoctor) {
      setEditForm({
        full_name: selectedDoctor.full_name || "",
        email: selectedDoctor.email || "",
        phone: selectedDoctor.phone || "",
        whatsapp_number: selectedDoctor.whatsapp_number || "",
        medical_council_registration:
          selectedDoctor.medical_council_registration || "",
        department: selectedDoctor.department
          ? String(selectedDoctor.department)
          : "",
        doctor_type: selectedDoctor.doctor_type
          ? String(selectedDoctor.doctor_type)
          : "",
      });
    } else {
      setEditForm({
        full_name: "",
        email: "",
        phone: "",
        whatsapp_number: "",
        medical_council_registration: "",
        department: "",
        doctor_type: "",
      });
    }
  }, [selectedDoctor]);

  const filteredDoctors = allDoctors.filter((doctor) => {
    const matchesDepartment =
      departmentFilter === "all" ||
      String(doctor.department) === departmentFilter;
    const matchesDoctorType =
      doctorTypeFilter === "all" ||
      String(doctor.doctor_type) === doctorTypeFilter;
    const query = doctorSearch.trim().toLowerCase();
    const matchesSearch = !query
      ? true
      : [
          doctor.full_name,
          doctor.phone,
          doctor.medical_council_registration,
          doctor.department_name,
          doctor.department?.name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
    return matchesDepartment && matchesDoctorType && matchesSearch;
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isDetailOpen) {
        closeDetailsPanel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDetailOpen]);
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNavigateToSignup = () => {
    const params = new URLSearchParams({
      role: "doctor",
      hide_admin_role: "true",
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
      medical_council_registration: "",
      // password: "",
      department: "",
      doctor_type: "",
      role: "doctor",
    });
  };

  const handleCreateDoctor = async (event) => {
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
    if (!formState.medical_council_registration.trim()) {
      setFormError("Medical council registration is required.");
      return;
    }
    // if (!formState.password.trim()) {
    //   setFormError("Temporary password is required.");
    //   return;
    // }
    if (!formState.department) {
      setFormError("Please select a department.");
      return;
    }
    if (!formState.doctor_type) {
      setFormError("Please select a doctor type.");
      return;
    }

    if (!companyId) {
      setFormError("Missing company context. Please refresh and try again.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setLocalMessage(null);
    try {
      await createNewDoctor(
        {
          full_name: formState.full_name.trim(),
          email: formState.email.trim(),
          phone: formState.phone.trim(),
          medical_council_registration:
            formState.medical_council_registration.trim(),
          role: formState.role,
          department: Number(formState.department),
          doctor_type: Number(formState.doctor_type),
        },
        companyId,
      );
      setLocalMessage("Doctor created successfully.");
      closeDialog();
      fetchAllDoctors(companyId);
    } catch (creationError) {
      const apiError =
        creationError.response?.data?.errors?.full_name?.[0] ||
        creationError.response?.data?.errors?.email?.[0] ||
        creationError.response?.data?.errors?.phone?.[0] ||
        creationError.response?.data?.errors?.medical_council_registration?.[0] ||
        creationError.response?.data?.error?.[0] ||
        "Could not create doctor. Please try again.";
      setFormError(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full min-h-0 box-border overflow-hidden p-6 bg-gradient-to-br from-[#f9fafc] to-[#eef3f9] flex flex-col">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Doctors</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsVideoModalOpen(true)}
            className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-white p-2.5 text-[#4F46E5] shadow-sm transition hover:bg-indigo-50"
            aria-label="Watch doctor setup video"
            title="Watch doctor setup video"
          >
            <CirclePlay size={20} />
          </button>
          <button
            type="button"
            onClick={handleNavigateToSignup}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#5B5BF6] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-[#4338CA] hover:to-[#4F46E5]"
          >
            <Plus size={18} />
            Add Doctor
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
        <div className="mb-4 rounded-lg bg-green-100 px-4 py-3 text-sm text-green-700">
          {localMessage}
        </div>
      )}

      {/* View Toggle */}
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
              setSelectedDoctor(null);
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
          <div className="relative flex-1 min-w-[180px]">
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2 pr-10 text-sm text-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">All Departments</option>
              {departments.map((department) => (
                <option key={department.id} value={String(department.id)}>
                  {department.name}
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
          <div className="relative flex-1 min-w-[180px]">
            <select
              value={doctorTypeFilter}
              onChange={(event) => setDoctorTypeFilter(event.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2 pr-10 text-sm text-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">All Doctor Types</option>
              {doctorTypes.map((type) => (
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
              value={doctorSearch}
              onChange={(event) => setDoctorSearch(event.target.value)}
              placeholder="Search Here..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          {(departmentFilter !== "all" ||
            doctorTypeFilter !== "all" ||
            doctorSearch.trim()) && (
            <button
              type="button"
              onClick={() => {
                setDepartmentFilter("all");
                setDoctorTypeFilter("all");
                setDoctorSearch("");
              }}
              className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-gray-50 w-9 h-9 flex items-center justify-center"
              title="Clear filters"
            >
              <X size={16} />
              <span className="sr-only">Clear filters</span>
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 lg:relative">
        <div className="h-full min-h-0 overflow-y-auto pr-1">
          {viewMode === "grid" ? (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 auto-rows-fr justify-items-center">
              {filteredDoctors.map((doctor) => {
                const isApproved = Boolean(doctor.is_approve);
                const statusLabel = isApproved ? "Approved" : "Pending";
                const imageSrc = formatProfileImage(doctor.image_url);

                return (
                  <div
                    key={doctor.id}
                    onClick={() => openDoctorDetails(doctor)}
                    className={`relative bg-white rounded-2xl shadow-md hover:shadow-lg p-5 w-full max-w-[250px] text-center cursor-pointer transition-all ${
                      selectedDoctor?.id === doctor.id && isDetailOpen
                        ? "ring-2 ring-indigo-500"
                        : ""
                    }`}
                  >
                    <div className="absolute right-3 top-3" data-doctor-menu>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenuId((prev) =>
                            prev === doctor.id ? null : doctor.id,
                          );
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-100"
                        aria-label="Doctor actions"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenuId === doctor.id && (
                        <div
                          className="absolute right-0 z-20 mt-2 w-32 rounded-md border border-gray-200 bg-white shadow-lg"
                          onClick={(event) => event.stopPropagation()}
                          data-doctor-menu
                        >
                          {isApproved && (
                            <button
                              type="button"
                              onClick={() => handleMenuAction("Uphold", doctor)}
                              className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                            >
                              Uphold
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openDoctorDetails(doctor)}
                            className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                          >
                            Review
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-24 h-24 mb-3 rounded-full overflow-hidden shadow-md">
                        <img
                          src={imageSrc}
                          alt={doctor.full_name}
                          className="object-cover w-full h-full"
                        />
                      </div>

                      <h2 className="text-lg font-semibold text-gray-800 truncate w-full">
                        {doctor.full_name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {doctor.department_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {doctor.doctor_type_name}
                      </p>

                      <div className="flex flex-wrap justify-center gap-3 mt-5 text-gray-500">
                        <button
                          className={`px-4 py-1.5 text-sm font-medium rounded-full text-white ${
                            isApproved ? "status-approved" : "blink-pending"
                          }`}
                        >
                          {statusLabel}
                        </button>
                        {/* <button
                          type="button"
                          className="text-sm text-[#4F46E5] border border-[#4F46E5] px-4 py-1.5 rounded-full hover:bg-[#4F46E5] hover:text-white transition"
                          onClick={(event) => {
                            event.stopPropagation();
                            openDoctorDetails(doctor);
                          }}
                        >
                          View Profile
                        </button> */}
                        {/* <button className="text-sm text-[#4F46E5] border border-[#4F46E5] px-4 py-1.5 rounded-full hover:bg-[#4F46E5] hover:text-white transition">
                      Message
                    </button> */}
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
                      className="px-6 py-3 font-semibold text-gray-600 text-center"
                    >
                      Profile
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 font-semibold text-gray-600 text-center"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 font-semibold text-gray-600 text-center"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 font-semibold text-gray-600 text-center"
                    >
                      Phone
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 font-semibold text-gray-600 text-center"
                    >
                      Department
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 font-semibold text-gray-600 text-center"
                    >
                      Doctor Type
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 font-semibold text-gray-600 text-center"
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
                  {filteredDoctors.map((doctor) => {
                    const isApproved = Boolean(doctor.is_approve);
                    const statusLabel = isApproved ? "Approved" : "Pending";
                    const imageSrc = formatProfileImage(doctor.image_url);

                    return (
                      <tr
                        key={doctor.id}
                        onClick={() => openDoctorDetails(doctor)}
                        className="hover:bg-gray-50 transition cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="h-10 w-10 overflow-hidden text-center rounded-full border border-gray-200 shadow-sm">
                            <img
                              src={imageSrc}
                              alt={doctor.full_name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-center">
                          {doctor.full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-center">
                          {doctor.email ? (
                            <span className="inline-flex items-center text-green-600">
                              <CheckSquare size={16} />
                              <span className="sr-only">Email available</span>
                            </span>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-center">
                          {doctor.phone ? (
                            <span className="inline-flex items-center text-green-600">
                              <CheckSquare size={16} />
                              <span className="sr-only">Phone available</span>
                            </span>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-center">
                          {doctor.department_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-center">
                          {doctor.doctor_type_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
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
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center gap-3">
                            {isApproved && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleMenuAction("Uphold", doctor);
                                }}
                                className="rounded-full border border-[#4F46E5] px-4 py-1.5 text-xs font-medium text-[#4F46E5] transition hover:bg-[#4F46E5] hover:text-white"
                              >
                                Uphold
                              </button>
                            )}

                            {/* <button
                              type="button"
                              className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
                              onClick={(event) => {
                                event.stopPropagation();
                                console.log("Message doctor", doctor.id);
                              }}
                            >
                              Message
                            </button> */}
                            <button
                              type="button"
                              className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
                              onClick={(event) => {
                                event.stopPropagation();
                                openDoctorDetails(doctor);
                              }}
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 text-red-600 transition hover:bg-red-50"
                              onClick={(event) => {
                                event.stopPropagation();
                                requestDelistConfirmation(doctor);
                              }}
                              aria-label="Delist doctor"
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
            <div className="rounded-3xl border border-gray-100 bg-white shadow-xl p-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-gray-700">
                    User Detail
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDoctor && (
                    <button
                      type="button"
                      onClick={() => requestDelistConfirmation(selectedDoctor)}
                      className="rounded-full border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                      aria-label="Delist doctor"
                    >
                      <UserX size={16} />
                    </button>
                  )}
                  {!isEditingDetails && selectedDoctor && (
                    <button
                      type="button"
                      onClick={startEditingDetails}
                      className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50"
                      aria-label="Edit doctor details"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652l-9.45 9.45a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897l9.763-9.762z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 7.125L16.862 4.487"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeDetailsPanel}
                    className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
                    aria-label="Close doctor details"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="mt-4">{detailPanelContent}</div>
            </div>
          </div>
        )}
      </div>

      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden ${
          isDetailOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
        onClick={closeDetailsPanel}
      />

      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-300 lg:hidden ${
          isDetailOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Doctor details"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-gray-700">
              User Detail
            </p>
            {/* <h2 className="text-lg font-semibold text-gray-900">
              {selectedDoctor?.full_name || "Select a doctor"}
            </h2> */}
          </div>
          <div className="flex items-center gap-2">
            {selectedDoctor && (
              <button
                type="button"
                onClick={() => requestDelistConfirmation(selectedDoctor)}
                className="rounded-full border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                aria-label="Delist doctor"
              >
                <UserX size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={closeDetailsPanel}
              className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
              aria-label="Close doctor details"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {selectedDoctor ? (
          <div className="h-[calc(100%-64px)] overflow-y-auto px-6 py-5">
            {detailPanelContent}
          </div>
        ) : (
          <div className="flex h-[calc(100%-64px)] items-center justify-center px-6 text-center text-sm text-gray-500">
            Select a doctor to view the detailed information.
          </div>
        )}
      </aside>

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
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Create Doctor
                </h2>
                <p className="text-sm text-gray-500">
                  Fill in the doctor details to add them to the hospital.
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
            <form onSubmit={handleCreateDoctor} className="space-y-4 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="doctor-full-name"
                    className="text-sm font-medium text-gray-700"
                  >
                    Full Name
                  </label>
                  <input
                    id="doctor-full-name"
                    name="full_name"
                    type="text"
                    value={formState.full_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Dr. Sarah Lee"
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="doctor-email"
                    className="text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <input
                    id="doctor-email"
                    name="email"
                    type="email"
                    value={formState.email}
                    onChange={handleInputChange}
                    placeholder="sarah@hospital.com"
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="doctor-phone"
                    className="text-sm font-medium text-gray-700"
                  >
                    Phone
                  </label>
                  <input
                    id="doctor-phone"
                    name="phone"
                    type="text"
                    value={formState.phone}
                    onChange={handleInputChange}
                    placeholder="+1 555 123 4567"
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="doctor-medical-registration"
                    className="text-sm font-medium text-gray-700"
                  >
                    Medical Council Registration
                  </label>
                  <input
                    id="doctor-medical-registration"
                    name="medical_council_registration"
                    type="text"
                    value={formState.medical_council_registration}
                    onChange={handleInputChange}
                    placeholder="Enter registration number"
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                {/* <div>
                  <label
                    htmlFor="doctor-password"
                    className="text-sm font-medium text-gray-700"
                  >
                    Temporary Password
                  </label>
                  <input
                    id="doctor-password"
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
                    htmlFor="doctor-department"
                    className="text-sm font-medium text-gray-700"
                  >
                    Department
                  </label>
                  <select
                    id="doctor-department"
                    name="department"
                    value={formState.department}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label
                    htmlFor="doctor-type"
                    className="text-sm font-medium text-gray-700"
                  >
                    Doctor Type
                  </label>
                  <select
                    id="doctor-type"
                    name="doctor_type"
                    value={formState.doctor_type}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Select doctor type</option>
                    {doctorTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
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
                  {isSubmitting ? "Creating..." : "Create Doctor"}
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
                Doctor List Video Guide
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
                src="https://www.youtube-nocookie.com/embed/YfAVweO0-OE?autoplay=1&vq=hd1080&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1"
                title="Doctor setup tutorial video"
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
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Trash2 size={18} className="text-red-600" />
                  Confirm Delist{" "}
                  <span className="font-semibold text-red-600">
                    {pendingDelistDoctor.full_name}
                  </span>
                </h2>
                {/* <p className="text-sm text-gray-500">
                  This will remove the doctor from the active list.
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
              {pendingDelistDoctor?.full_name ? (
                <>
                  Delist the doctor from this active list{" "}
                  <span className="font-semibold text-gray-900">
                    {pendingDelistDoctor.full_name}
                  </span>
                  ?
                </>
              ) : (
                "Delist this doctor?"
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
