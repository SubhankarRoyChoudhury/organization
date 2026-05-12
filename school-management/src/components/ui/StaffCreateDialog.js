"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DatePickerField from "@/components/ui/DatePickerField";
import {
  extractAttachmentIdFromUploadResponse,
  getAllActiveCompanyUser,
  getAllCountries,
  getAllStates,
  getAttachmentsWithIDs,
  getCurrentSchoolInfo,
  sendOrganizationEmailOtp,
  verifyOrganizationEmailOtp,
  uploadImageFromAnyWhere,
} from "@/lib/apiService";

function getDefaultFormData() {
  return {
    name: "",
    username: "",
    role: "",
    mobile: "",
    email: "",
    dob: "",
    qualification: "",
    experience: "",
    address: "",
    country: "India",
    state: "",
    city: "",
    pin: "",
    attachmentId: "",
  };
}

function buildUsernameFromName(name, schoolCode) {
  const firstName = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0];
  const normalizedFirstName = String(firstName || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const normalizedSchoolCode = String(schoolCode || "")
    .trim()
    .toLowerCase();

  if (!normalizedFirstName) {
    return "";
  }
  if (!normalizedSchoolCode) {
    return normalizedFirstName;
  }
  return `${normalizedFirstName}.${normalizedSchoolCode}`;
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function buildAvailableUsernameSuggestions(baseUsername, takenUsernames, limit = 5) {
  const normalizedBase = normalizeUsername(baseUsername);
  if (!normalizedBase) {
    return [];
  }

  const takenSet = new Set(
    (Array.isArray(takenUsernames) ? takenUsernames : [])
      .map((value) => normalizeUsername(value))
      .filter(Boolean),
  );

  const suggestions = [];
  const seen = new Set([normalizedBase]);
  const candidateSuffixes = ["1", "2", "3", "01", "02", "2026", "2027"];
  const [basePrefix, ...baseSuffixParts] = normalizedBase.split(".");
  const baseSuffix = baseSuffixParts.length ? `.${baseSuffixParts.join(".")}` : "";

  const pushCandidate = (candidate) => {
    const normalizedCandidate = normalizeUsername(candidate);
    if (
      !normalizedCandidate ||
      seen.has(normalizedCandidate) ||
      takenSet.has(normalizedCandidate)
    ) {
      return;
    }
    seen.add(normalizedCandidate);
    suggestions.push(normalizedCandidate);
  };

  pushCandidate(normalizedBase);
  candidateSuffixes.forEach((suffix) => {
    if (baseSuffix) {
      pushCandidate(`${basePrefix}${suffix}${baseSuffix}`);
      pushCandidate(`${basePrefix}.${suffix}${baseSuffix}`);
    } else {
      pushCandidate(`${basePrefix}${suffix}`);
    }
  });

  return suggestions.slice(0, limit);
}

function buildFormDataFromStaff(staff) {
  const dobRaw = String(staff?.dob || "").trim();
  const dobDateOnly = dobRaw ? dobRaw.slice(0, 10) : "";
  return {
    name: String(staff?.name || ""),
    username: String(staff?.username || ""),
    role: String(staff?.job_title || staff?.role || staff?.staff_role || ""),
    mobile: String(staff?.mobile || ""),
    email: String(staff?.email || ""),
    dob: dobDateOnly,
    qualification: String(staff?.qualification || ""),
    experience: String(staff?.experience || ""),
    address: String(staff?.address || ""),
    country: String(staff?.country || ""),
    state: String(staff?.state || ""),
    city: String(staff?.city || ""),
    pin: String(staff?.pin || ""),
    attachmentId:
      staff?.attachment_id === null || staff?.attachment_id === undefined
        ? ""
        : String(staff.attachment_id),
  };
}

function getStaffInitials(name) {
  const firstLetter = String(name || "").trim().charAt(0).toUpperCase();
  return firstLetter || "S";
}

const isAbsoluteUrl = (value) =>
  /^https?:\/\//i.test(value || "") || /^data:/i.test(value || "");

const roleOptions = [
  { value: "assistant_head_master", label: "Asistant HeadMaster" },
  { value: "clerk", label: "Clerk" },
  { value: "library_person", label: "Liabrary Person" },
  { value: "non-teaching", label: "Non teaching" },
];

const buildAttachmentPreviewUrl = (attachment) => {
  const rawValue =
    attachment?.base_64_image ||
    attachment?.url ||
    attachment?.image_url ||
    "";

  if (!rawValue) {
    return "";
  }
  if (isAbsoluteUrl(rawValue)) {
    return rawValue;
  }

  const normalized = String(rawValue).replace(/^\/+/, "");
  if (!normalized) {
    return "";
  }
  if (normalized.startsWith("media/")) {
    return `/${normalized}`;
  }
  return `/media/${normalized}`;
};

function getInitialFormData(mode, initialData) {
  if ((mode === "edit" || mode === "review") && initialData) {
    return buildFormDataFromStaff(initialData);
  }
  return getDefaultFormData();
}

export default function StaffCreateDialog({
  open,
  onClose,
  onCreate,
  companyId,
  initialData = null,
  mode = "create",
  staffMembers = [],
}) {
  const [formData, setFormData] = useState(() => getInitialFormData(mode, initialData));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolLocationName, setSchoolLocationName] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [currentUserIsHeadMaster, setCurrentUserIsHeadMaster] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [profileImageError, setProfileImageError] = useState("");
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [isOtpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [serverTakenUsernames, setServerTakenUsernames] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dialogRef = useRef(null);
  const nameInputRef = useRef(null);
  const dragStateRef = useRef(null);
  const profileImageObjectUrlRef = useRef("");
  const isEditMode = mode === "edit";
  const isReviewMode = mode === "review";
  const normalizedStaffMembers = Array.isArray(staffMembers) ? staffMembers : [];

  const resetDialog = () => {
    if (profileImageObjectUrlRef.current) {
      URL.revokeObjectURL(profileImageObjectUrlRef.current);
      profileImageObjectUrlRef.current = "";
    }
    setFormData(getDefaultFormData());
    setIsSubmitting(false);
    setSubmitErrorMessage("");
    setCompanyName("");
    setSchoolCode("");
    setSchoolLocationName("");
    setCurrentUserRole("");
    setCurrentUserIsHeadMaster(false);
    setProfileImagePreview("");
    setProfileImageError("");
    setIsUploadingProfileImage(false);
    setVerifiedEmail("");
    setOtpDialogOpen(false);
    setOtpValue("");
    setOtpError("");
    setOtpMessage("");
    setServerTakenUsernames([]);
    setCompanyUsers([]);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    dragStateRef.current = null;
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        resetDialog();
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setFormData(getInitialFormData(mode, initialData));
  }, [open, mode, initialData]);

  useEffect(() => {
    if (!open || isReviewMode) {
      return undefined;
    }

    const focusId = window.requestAnimationFrame(() => {
      const nameInput = nameInputRef.current;
      if (!nameInput) {
        return;
      }

      nameInput.focus({ preventScroll: true });
      nameInput.select?.();
    });

    return () => {
      window.cancelAnimationFrame(focusId);
    };
  }, [isReviewMode, open]);

  useEffect(() => {
    if (!open || mode === "create" || !formData.attachmentId) {
      return undefined;
    }

    const attachmentId = Number(formData.attachmentId || 0);
    if (!attachmentId) {
      setProfileImagePreview("");
      return undefined;
    }

    let mounted = true;
    getAttachmentsWithIDs([attachmentId])
      .then((data) => {
        if (!mounted) {
          return;
        }
        const attachment = Array.isArray(data?.response) ? data.response[0] : null;
        const nextPreview = buildAttachmentPreviewUrl(attachment);
        setProfileImagePreview(String(nextPreview || ""));
      })
      .catch(() => {
        if (mounted) {
          setProfileImagePreview("");
        }
      });

    return () => {
      mounted = false;
    };
  }, [open, mode, formData.attachmentId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let mounted = true;
    getCurrentSchoolInfo()
      .then((data) => {
        if (!mounted || !data) {
          return;
        }

        const nextCompanyName = String(data?.company?.name || "").trim();
        const nextSchoolCode = String(data?.company?.school_code || "").trim();
        const nextLocationName = String(
          data?.company?.location_name || data?.company?.location || "",
        ).trim();
        const nextCurrentUserRole = String(data?.role || "").trim().toLowerCase();
        const nextCurrentIsHeadMaster = Boolean(data?.is_head_master);

        setCompanyName(nextCompanyName);
        setSchoolCode(nextSchoolCode);
        setSchoolLocationName(nextLocationName);
        setCurrentUserRole(nextCurrentUserRole);
        setCurrentUserIsHeadMaster(nextCurrentIsHeadMaster);
        setFormData((prev) => ({
          ...prev,
          username:
            mode === "edit" || mode === "review"
              ? prev.username
              : buildUsernameFromName(prev.name, nextSchoolCode),
        }));
      })
      .catch(() => {
        // keep defaults when info lookup fails
      });

    return () => {
      mounted = false;
    };
  }, [open, mode]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let mounted = true;
    getAllActiveCompanyUser()
      .then((data) => {
        if (!mounted) {
          return;
        }
        setCompanyUsers(Array.isArray(data?.response) ? data.response : []);
      })
      .catch(() => {
        if (mounted) {
          setCompanyUsers([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    let cancelled = false;

    const loadCountries = async () => {
      try {
        setIsLoadingCountries(true);
        const response = await getAllCountries();
        if (cancelled) {
          return;
        }
        const countryList = response?.response || [];
        setCountries(Array.isArray(countryList) ? countryList : []);
      } catch (_error) {
        if (!cancelled) {
          setCountries([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCountries(false);
        }
      }
    };

    loadCountries();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!countries.length) {
      return;
    }

    if (!formData.country) {
      setSelectedCountryCode("");
      setStates([]);
      return;
    }

    const matchedCountry = countries.find(
      (country) =>
        String(country?.name || "").toLowerCase() ===
        String(formData.country || "").toLowerCase(),
    );
    const nextCountryCode = String(matchedCountry?.alpha_2 || "");
    if (nextCountryCode !== selectedCountryCode) {
      setSelectedCountryCode(nextCountryCode);
    }
  }, [countries, formData.country, selectedCountryCode]);

  useEffect(() => {
    let cancelled = false;

    const loadStates = async () => {
      if (!selectedCountryCode) {
        setStates([]);
        return;
      }

      try {
        setIsLoadingStates(true);
        setStates([]);
        const response = await getAllStates(selectedCountryCode);
        if (cancelled) {
          return;
        }
        const stateList = response?.response || [];
        setStates(
          Array.isArray(stateList)
            ? stateList.map((state) => state?.name).filter(Boolean)
            : [],
        );
      } catch (_error) {
        if (!cancelled) {
          setStates([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStates(false);
        }
      }
    };

    loadStates();
    return () => {
      cancelled = true;
    };
  }, [selectedCountryCode]);

  const canManageStaff = currentUserRole === "teacher" && currentUserIsHeadMaster;

  const handleChange = (event) => {
    if (isReviewMode) {
      return;
    }
    const { name, value, type, checked } = event.target;
    if (name === "email") {
      const normalizedEmail = String(value || "").trim().toLowerCase();
      if (normalizedEmail !== verifiedEmail) {
        setVerifiedEmail("");
      }
      setOtpError("");
      setOtpMessage("");
    }
    if (name === "name" && !isEditMode) {
      setFormData((prev) => ({
        ...prev,
        name: value,
        username: buildUsernameFromName(value, schoolCode),
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCountryChange = (event) => {
    if (isReviewMode) {
      return;
    }
    const value = String(event?.target?.value || "");
    const matchedCountry = countries.find((country) => country?.name === value);
    setSelectedCountryCode(String(matchedCountry?.alpha_2 || ""));
    setFormData((prev) => ({
      ...prev,
      country: value,
      state: "",
    }));
  };

  const handleStateChange = (event) => {
    if (isReviewMode) {
      return;
    }
    const value = String(event?.target?.value || "");
    setFormData((prev) => ({
      ...prev,
      state: value,
    }));
  };

  const handleProfileImageChange = async (event) => {
    if (isReviewMode || !canManageStaff) {
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setProfileImageError("Image too large. Max size is 2MB.");
      event.target.value = "";
      return;
    }

    setProfileImageError("");

    if (profileImageObjectUrlRef.current) {
      URL.revokeObjectURL(profileImageObjectUrlRef.current);
      profileImageObjectUrlRef.current = "";
    }

    const previewUrl = URL.createObjectURL(file);
    profileImageObjectUrlRef.current = previewUrl;
    setProfileImagePreview(previewUrl);

    try {
      setIsUploadingProfileImage(true);
      const companyIdValue =
        companyId ||
        (typeof window !== "undefined" ? localStorage.getItem("company_id") || "" : "");
      const usernameValue =
        String(formData.username || "").trim() ||
        buildUsernameFromName(formData.name, schoolCode) ||
        (typeof window !== "undefined" ? localStorage.getItem("username") || "" : "");
      const uploadResponse = await uploadImageFromAnyWhere(
        file,
        usernameValue,
        companyIdValue,
      );
      const attachmentId = extractAttachmentIdFromUploadResponse(uploadResponse);

      if (!attachmentId) {
        throw new Error("Attachment ID missing");
      }

      setFormData((prev) => ({
        ...prev,
        attachmentId: String(attachmentId),
      }));
    } catch (error) {
      if (profileImageObjectUrlRef.current === previewUrl) {
        URL.revokeObjectURL(previewUrl);
        profileImageObjectUrlRef.current = "";
      }
      setProfileImagePreview("");
      setProfileImageError(
        String(error?.message || "Unable to upload profile photo").trim(),
      );
    } finally {
      setIsUploadingProfileImage(false);
      event.target.value = "";
    }
  };

  const handleSendOtp = async () => {
    const normalizedEmail = String(formData.email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      setSubmitErrorMessage("Enter an email first if you want to verify it.");
      return;
    }

    try {
      setIsSendingOtp(true);
      setSubmitErrorMessage("");
      setOtpError("");
      setOtpMessage("");
      await sendOrganizationEmailOtp(normalizedEmail);
      setOtpDialogOpen(true);
      setOtpMessage(`OTP sent to ${normalizedEmail}.`);
    } catch (error) {
      setSubmitErrorMessage(
        String(error?.message || "Unable to send OTP").trim(),
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    const normalizedEmail = String(formData.email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      setOtpError("Enter an email first.");
      return;
    }
    if (!otpValue.trim()) {
      setOtpError("Enter OTP.");
      return;
    }

    try {
      setIsVerifyingOtp(true);
      setOtpError("");
      const response = await verifyOrganizationEmailOtp(
        normalizedEmail,
        otpValue.trim(),
      );
      setVerifiedEmail(normalizedEmail);
      setOtpMessage(response?.detail || "Email verified successfully.");
      setOtpValue("");
      setOtpDialogOpen(false);
    } catch (error) {
      setOtpError(
        String(error?.message || "Unable to verify OTP").trim(),
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isReviewMode || isSubmitting) {
      return;
    }
    if (
      isEditMode &&
      initialData &&
      JSON.stringify(formData) === JSON.stringify(buildFormDataFromStaff(initialData))
    ) {
      return;
    }

    const parsedDob = String(formData.dob || "").trim();
    const parsedAttachmentId = String(formData.attachmentId || "").trim();
    const parsedName = String(formData.name || "").trim();
    const parsedUsername = String(formData.username || "").trim();
    const normalizedParsedUsername = normalizeUsername(parsedUsername);
    const parsedRole = String(formData.role || "").trim();
    const parsedMobile = String(formData.mobile || "").trim();
    const parsedEmail = String(formData.email || "").trim().toLowerCase();
    const isEmailVerified =
      Boolean(parsedEmail) && verifiedEmail === parsedEmail;
    const parsedQualification = String(formData.qualification || "").trim();
    const parsedExperience = String(formData.experience || "").trim();
    const parsedAddress = String(formData.address || "").trim();
    const parsedCountry = String(formData.country || "").trim();
    const parsedState = String(formData.state || "").trim();
    const parsedCity = String(formData.city || "").trim();
    const parsedPin = String(formData.pin || "").trim();

    if (
      !parsedName ||
      !parsedUsername ||
      !parsedRole ||
      !parsedMobile ||
      !parsedDob ||
      !parsedQualification ||
      !parsedExperience ||
      !parsedAddress ||
      !parsedCountry ||
      !parsedState ||
      !parsedCity ||
      !parsedPin
    ) {
      return;
    }
    if (!isEditMode) {
      const usernameAlreadyExists = normalizedStaffMembers.some(
        (staff) =>
          normalizeUsername(staff?.username) === normalizedParsedUsername,
      );
      if (usernameAlreadyExists) {
        setServerTakenUsernames((prev) =>
          prev.includes(normalizedParsedUsername)
            ? prev
            : [...prev, normalizedParsedUsername],
        );
        return;
      }
    }
    const createBlockedByPermission = !canManageStaff;
    if (createBlockedByPermission) {
      setSubmitErrorMessage(
        "Only a teacher with head master access can create or update staff.",
      );
      return;
    }
    if (!isEditMode && parsedEmail && !isEmailVerified) {
      setSubmitErrorMessage("Verify email with OTP before creating non-teaching staff.");
      return;
    }

    setIsSubmitting(true);
    setSubmitErrorMessage("");
    try {
      const accessToken =
        typeof window !== "undefined"
          ? localStorage.getItem("access_token") || ""
          : "";

      await onCreate({
        id: initialData?.id || null,
        name: parsedName,
        username: parsedUsername,
        role: parsedRole,
        job_title: parsedRole,
        mobile: parsedMobile,
        email: parsedEmail,
        is_verified: parsedEmail ? isEmailVerified : false,
        password: "abc123",
        dob: parsedDob ? `${parsedDob}T00:00:00Z` : null,
        qualification: parsedQualification,
        experience: parsedExperience,
        address: parsedAddress,
        country: parsedCountry,
        state: parsedState,
        city: parsedCity,
        pin: parsedPin,
        attachmentId: parsedAttachmentId ? Number(parsedAttachmentId) : null,
        companyId: companyId || null,
        accessToken,
      });
      resetDialog();
      onClose();
    } catch (error) {
      const errorMessage = String(error?.message || error || "").trim();
      const normalizedErrorMessage = errorMessage.toLowerCase();
      if (
        normalizedErrorMessage.includes("username") &&
        (normalizedErrorMessage.includes("exists") ||
          normalizedErrorMessage.includes("already") ||
          normalizedErrorMessage.includes("taken"))
      ) {
        setServerTakenUsernames((prev) =>
          prev.includes(normalizedParsedUsername)
            ? prev
            : [...prev, normalizedParsedUsername],
        );
      } else {
        setSubmitErrorMessage(
          String(error?.message || error || "Unable to create staff").trim(),
        );
      }
      setIsSubmitting(false);
    }
  };

  const handleDragStart = (event) => {
    if (event.button !== 0) {
      return;
    }
    const dialogElement = dialogRef.current;
    const dragHandle = event.currentTarget;
    if (!dialogElement || !(dragHandle instanceof HTMLElement)) {
      return;
    }
    dragHandle.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: dragOffset.x,
      startOffsetY: dragOffset.y,
      startRect: dialogElement.getBoundingClientRect(),
    };
    setIsDragging(true);
    event.preventDefault();
  };

  const handleDragMove = (event) => {
    const dragState = dragStateRef.current;
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const isDesktop = window.innerWidth >= 640;
    const screenPaddingX = isDesktop ? 5 : 8;
    const screenPaddingY = isDesktop ? 5 : 0;
    const minLeft = screenPaddingX;
    const minTop = screenPaddingY;
    const maxLeft = Math.max(
      screenPaddingX,
      window.innerWidth - dragState.startRect.width - screenPaddingX,
    );
    const maxTop = Math.max(
      screenPaddingY,
      window.innerHeight - dragState.startRect.height - screenPaddingY,
    );

    const proposedLeft = dragState.startRect.left + deltaX;
    const proposedTop = dragState.startRect.top + deltaY;
    const clampedLeft = Math.min(maxLeft, Math.max(minLeft, proposedLeft));
    const clampedTop = Math.min(maxTop, Math.max(minTop, proposedTop));
    const nextX =
      dragState.startOffsetX + (clampedLeft - dragState.startRect.left);
    const nextY =
      dragState.startOffsetY + (clampedTop - dragState.startRect.top);

    setDragOffset((prev) =>
      prev.x === nextX && prev.y === nextY ? prev : { x: nextX, y: nextY },
    );
  };

  const stopDragging = (event) => {
    const dragState = dragStateRef.current;
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
    setIsDragging(false);
  };

  const normalizedEmail = String(formData.email || "").trim().toLowerCase();
  const isEmailVerified =
    Boolean(normalizedEmail) && verifiedEmail === normalizedEmail;
  const normalizedUsername = normalizeUsername(formData.username);
  const shouldCheckUsernameAvailability = mode === "create";
  const { takenUsernames, usernameSuggestions } = useMemo(() => {
    const mergedTakenUsernames = Array.from(
      new Set([
        ...normalizedStaffMembers
          .map((staff) => normalizeUsername(staff?.username))
          .filter(Boolean),
        ...companyUsers
          .map((user) => normalizeUsername(user?.username))
          .filter(Boolean),
        ...serverTakenUsernames.map((value) => normalizeUsername(value)).filter(Boolean),
      ]),
    );

    const shouldSuggest =
      shouldCheckUsernameAvailability &&
      Boolean(normalizedUsername) &&
      mergedTakenUsernames.includes(normalizedUsername);

    return {
      takenUsernames: mergedTakenUsernames,
      usernameSuggestions: shouldSuggest
        ? buildAvailableUsernameSuggestions(normalizedUsername, mergedTakenUsernames, 5)
        : [],
    };
  }, [
    normalizedStaffMembers,
    companyUsers,
    serverTakenUsernames,
    shouldCheckUsernameAvailability,
    normalizedUsername,
  ]);
  const isUsernameTaken =
    shouldCheckUsernameAvailability &&
    Boolean(normalizedUsername) &&
    takenUsernames.includes(normalizedUsername);

  if (!open) {
    return null;
  }

  const dialogContent = (
    <div className="fixed inset-0 z-[2000] flex items-start justify-center overflow-hidden p-2 pt-0 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={handleClose}
        aria-label="Close create non-teaching dialog"
      />
      <div
        ref={dialogRef}
        style={{ transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)` }}
        className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] will-change-transform max-h-[calc(100svh-0.5rem)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              {isReviewMode
                ? "Review Non-Teaching Staff"
                : isEditMode
                ? "Edit Non-Teaching Staff"
                : "Create Non-Teaching Staff"}
            </h2>
            <p className="text-sm text-slate-600">
              {isReviewMode
                ? "Review selected non-teaching staff details."
                : isEditMode
                ? "Update selected non-teaching staff details."
                : (companyName
                ? (
                  <>
                    {schoolLocationName
                      ? `${companyName}, ${schoolLocationName}, ( `
                      : `${companyName}, ( `}
                    <span className="font-semibold text-sky-600">{schoolCode}</span>
                    {" )."}
                  </>
                )
                : "Fill in details to add a new non-teaching staff record.")}
            </p>
            {!isReviewMode && !canManageStaff ? (
              <p className="mt-1 text-xs font-medium text-rose-600">
                Only a teacher with head master access can create or update staff.
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-drag-handle="true"
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              aria-label="Drag dialog"
              className="hidden h-8 w-8 touch-none cursor-grab items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 active:cursor-grabbing sm:inline-flex"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <circle cx="8" cy="7" r="1.4" />
                <circle cx="16" cy="7" r="1.4" />
                <circle cx="8" cy="12" r="1.4" />
                <circle cx="16" cy="12" r="1.4" />
                <circle cx="8" cy="17" r="1.4" />
                <circle cx="16" cy="17" r="1.4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close dialog"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-5"
        >
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="mb-4 flex items-center gap-4 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-4">
              <div className="h-16 w-16 overflow-hidden rounded-full ring-2 ring-sky-200">
                {profileImagePreview ? (
                  <img
                    src={profileImagePreview}
                    alt="Staff profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-sky-100 text-xl font-semibold text-sky-700">
                    {getStaffInitials(formData.name)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  Profile photo
                </p>
                <p className="text-xs text-slate-600">
                  Upload a square image for the staff record.
                </p>
                {!isReviewMode ? (
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      disabled={!canManageStaff || isUploadingProfileImage}
                      className="hidden"
                    />
                    {isUploadingProfileImage ? "Uploading..." : "Change photo"}
                  </label>
                ) : null}
                {profileImageError ? (
                  <p className="mt-2 text-xs text-rose-600">
                    {profileImageError}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                <span className="text-slate-500 font-semibold">
                  Staff Name <span className="text-rose-600">*</span>
                </span>
                <input
                  ref={nameInputRef}
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  readOnly={isReviewMode}
                  disabled={isReviewMode}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="Enter full name"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                <span className="text-slate-500 font-semibold">
                  Username <span className="text-rose-600">*</span>
                </span>
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  readOnly={isReviewMode}
                  disabled={isReviewMode}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder={schoolCode ? `name.${schoolCode}` : "Enter username"}
                  required
                />
                {shouldCheckUsernameAvailability && isUsernameTaken ? (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-medium text-rose-600">
                      Username already there.
                    </p>
                    {usernameSuggestions.length ? (
                      <div className="flex flex-wrap gap-2">
                        {usernameSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                username: suggestion,
                              }))
                            }
                            className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 transition hover:bg-sky-100"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : shouldCheckUsernameAvailability && normalizedUsername ? (
                  <p className="pt-1 text-xs font-medium text-emerald-600">
                    Username available.
                  </p>
                ) : null}
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                <span className="text-slate-500 font-semibold">
                  Mobile <span className="text-rose-600">*</span>
                </span>
                <input
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  readOnly={isReviewMode}
                  disabled={isReviewMode}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="e.g. +91 98765 43210"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 lg:col-span-2">
                <span className="text-slate-500 font-semibold">
                  Email <span className="text-slate-400">(Optional)</span>
                </span>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      readOnly={isReviewMode}
                      disabled={isReviewMode}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      placeholder="e.g. staff@school.edu"
                    />
                    {!isEditMode && !isReviewMode ? (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSendingOtp || !normalizedEmail}
                        className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSendingOtp ? "Sending..." : isEmailVerified ? "Verified" : "Verify"}
                      </button>
                    ) : null}
                  </div>
                  {!isEditMode && !isReviewMode ? (
                    <span className={`text-xs ${isEmailVerified ? "text-emerald-600" : "text-slate-500"}`}>
                      {isEmailVerified
                        ? "Email verified. You can create the staff record."
                        : "You can leave this blank, or verify it with OTP if provided."}
                    </span>
                  ) : null}
                </div>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                <span className="text-slate-500 font-semibold">
                  Date of Birth <span className="text-rose-600">*</span>
                </span>
                <DatePickerField
                  value={formData.dob}
                  onChange={(value) =>
                    handleChange({
                      target: { name: "dob", value },
                    })
                  }
                  readOnly={isReviewMode}
                  disabled={isReviewMode}
                  ariaLabel="Staff Date of Birth"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                <span className="text-slate-500 font-semibold">
                  Role <span className="text-rose-600">*</span>
                </span>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  readOnly={isReviewMode}
                  disabled={isReviewMode}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  required
                >
                  <option value="">Select role</option>
                  {roleOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                <span className="text-slate-500 font-semibold">
                  Qualification <span className="text-rose-600">*</span>
                </span>
                <input
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  readOnly={isReviewMode}
                  disabled={isReviewMode}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="e.g. B.Com"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 lg:col-span-1">
                <span className="text-slate-500 font-semibold">
                  Experience <span className="text-rose-600">*</span>
                </span>
                <input
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  readOnly={isReviewMode}
                  disabled={isReviewMode}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="e.g. 5 years"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 lg:col-span-2">
                <span className="text-slate-500 font-semibold">
                  Address <span className="text-rose-600">*</span>
                </span>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  readOnly={isReviewMode}
                  disabled={isReviewMode}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="Enter address"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                <span className="text-slate-500 font-semibold">
                  Country <span className="text-rose-600">*</span>
                </span>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleCountryChange}
                  disabled={isReviewMode || isLoadingCountries}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  required
                >
                  <option value="">
                    {isLoadingCountries ? "Loading countries..." : "Select country"}
                  </option>
                  {countries.map((country) => (
                    <option key={country.alpha_2} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                <span className="text-slate-500 font-semibold">
                  State <span className="text-rose-600">*</span>
                </span>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleStateChange}
                  disabled={isReviewMode || !formData.country || isLoadingStates}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  required
                >
                  <option value="">
                    {isLoadingStates ? "Loading states..." : "Select state"}
                  </option>
                  {states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                <span className="text-slate-500 font-semibold">
                  City <span className="text-rose-600">*</span>
                </span>
                <input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  readOnly={isReviewMode}
                  disabled={isReviewMode}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="Enter city"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                <span className="text-slate-500 font-semibold">
                  PIN <span className="text-rose-600">*</span>
                </span>
                <input
                  name="pin"
                  value={formData.pin}
                  onChange={handleChange}
                  readOnly={isReviewMode}
                  disabled={isReviewMode}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="Enter pin"
                  required
                />
              </label>

              {/* <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                <span className="text-slate-500 font-semibold">
                  Attachment ID <span className="text-rose-600">*</span>
                </span>
                <input
                  type="number"
                  name="attachmentId"
                  value={formData.attachmentId}
                  onChange={handleChange}
                  min="1"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="Enter attachment id"
                  required
                />
              </label> */}

            </div>
          </div>

          {!isReviewMode ? (
            <div className="mt-4 flex flex-row flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-4 md:mt-5 md:border-t-0 md:bg-transparent md:pb-0 md:pt-0">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-11 min-w-[96px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-[17px] font-semibold leading-none text-slate-700 transition hover:bg-slate-100 sm:h-10 sm:min-w-[92px] sm:px-4 sm:text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !canManageStaff ||
                  (shouldCheckUsernameAvailability && isUsernameTaken)
                }
                className="inline-flex h-11 min-w-[132px] items-center justify-center rounded-xl bg-sky-600 px-6 text-[17px] font-semibold leading-none text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:min-w-[120px] sm:px-5 sm:text-sm"
              >
                {isSubmitting
                  ? (isEditMode ? "Updating..." : "Creating...")
                  : (isEditMode ? "Update Staff" : "Create Staff")}
              </button>
            </div>
          ) : null}
        </form>
      </div>

      {isOtpDialogOpen ? (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/55 backdrop-blur-[1px]"
            onClick={() => {
              setOtpDialogOpen(false);
              setOtpValue("");
              setOtpError("");
            }}
            aria-label="Close OTP dialog"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
            <h3 className="text-lg font-semibold text-slate-900">Verify Email</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Enter the OTP sent to {normalizedEmail || "your email"}.
            </p>

            <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                <span>OTP</span>
                <input
                  type="text"
                  value={otpValue}
                  onChange={(event) => {
                    setOtpValue(event.target.value);
                    if (otpError) {
                      setOtpError("");
                    }
                  }}
                  placeholder="Enter 6-digit OTP"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </label>

              {otpError ? <p className="text-sm text-rose-600">{otpError}</p> : null}
              {otpMessage ? <p className="text-sm text-emerald-600">{otpMessage}</p> : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                  className="inline-flex h-10 min-w-[92px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSendingOtp ? "Sending..." : "Resend OTP"}
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingOtp}
                  className="inline-flex h-10 min-w-[92px] items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isVerifyingOtp ? "Verifying..." : "Verify"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {submitErrorMessage ? (
        <div className="fixed inset-0 z-[2300] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/55 backdrop-blur-[1px]"
            onClick={() => setSubmitErrorMessage("")}
            aria-label="Close error dialog"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-rose-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
            <h3 className="text-lg font-semibold text-slate-900">Staff save failed</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {submitErrorMessage}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSubmitErrorMessage("")}
                className="inline-flex h-10 min-w-[92px] items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(dialogContent, document.body);
}
