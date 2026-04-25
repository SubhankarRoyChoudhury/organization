"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Hospital,
  School,
  Wallet,
  Package,
  Sparkles,
  CalendarDays,
  ArrowUpRight,
  TrendingUp,
  Gift,
  Receipt,
  ArrowRightLeft,
  Pencil,
  Check,
  X,
  Filter,
  Camera,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import {
  getCompanyInfo,
  getCurrentUserStatus,
  clearLoginSession,
  getOrganizationUserDetails,
  getOrganizationUsersByUsername,
  getAllCountries,
  getAllStates,
  getOwners,
  addOwner,
  updateOwner,
  addStatutoryRegister,
  updateStatutoryRegister,
  getStatutoryCustomFields,
  addStatutoryCustomField,
  updateStatutoryCustomField,
  deleteStatutoryCustomField,
  updateCompanyInfo,
  updateCompanyUserProfile,
  uploadImageFromAnyWhere,
  changeUserImage,
  sendTeamInvitation,
  checkEmailAlreadyExist,
  createOrganization,
  createOrganizationUser,
  getOrganizations,
  getDepartments,
  createDepartment,
  getDoctorTypes,
  createDoctorType,
  getAdministrationTypes,
  createAdministrationType,
  getStaffDepartments,
  createStaffDepartment,
  getStaffJobTitles,
  createStaffJobTitle,
  createCompanyAccount,
  getCategoryDashboardSummary,
  getOrganizationHospitals,
} from "@/app/api/apiService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SchoolCreateDialog from "@/components/ui/school-create-dialog";
import { environment } from "@/environments/environments";

const baseModules = [
  {
    title: "Vidya",
    description: "School operations for teachers, students, and classes.",
    href: "/category/vidya",
    icon: School,
    tint: "from-[#0ea5a5]/10 to-[#0ea5a5]/30",
    ring: "ring-[#0ea5a5]/40",
    enabled: true,
  },
  {
    title: "Swasthya",
    description: "Hospital operations for doctors, patients, and appointments.",
    href: "/category/swasthya",
    icon: Hospital,
    tint: "from-[#0284c7]/10 to-[#0284c7]/30",
    ring: "ring-[#0284c7]/40",
    enabled: true,
  },
  {
    title: "Ashram",
    description: "Ashram operations, members, and daily activities.",
    href: "/ashram-management",
    icon: Building2,
    tint: "from-[#6366f1]/10 to-[#6366f1]/30",
    ring: "ring-[#6366f1]/40",
    enabled: true,
  },
  // {
  //   title: "Payroll Management",
  //   description: "Salaries, attendance, and staff payouts.",
  //   href: "/payroll-management",
  //   icon: Wallet,
  //   tint: "from-[#3b82f6]/10 to-[#3b82f6]/30",
  //   ring: "ring-[#3b82f6]/40",
  //   enabled: true,
  // },
  // {
  //   title: "Inventory Management",
  //   description: "Stock, categories, groups, and restock rules.",
  //   href: "/inventory-managment",
  //   icon: Package,
  //   tint: "from-[#0891b2]/10 to-[#0891b2]/30",
  //   ring: "ring-[#0891b2]/40",
  //   enabled: true,
  // },
  // {
  //   title: "Account Management",
  //   description: "Revenue, expenses, and financial health.",
  //   href: "/accounts-management",
  //   icon: Building2,
  //   tint: "from-[#22c55e]/10 to-[#22c55e]/30",
  //   ring: "ring-[#22c55e]/40",
  //   enabled: true,
  // },
  // {
  //   title: "Asset Management",
  //   description: "Inventory, equipment, and lifecycle tracking.",
  //   href: "/asset-management",
  //   icon: Package,
  //   tint: "from-[#f97316]/10 to-[#f97316]/30",
  //   ring: "ring-[#f97316]/40",
  //   enabled: false,
  // },
  // {
  //   title: "Access Control",
  //   description: "Manage app access, groups, and permissions.",
  //   href: "/access-control",
  //   icon: Sparkles,
  //   tint: "from-[#14b8a6]/10 to-[#14b8a6]/30",
  //   ring: "ring-[#14b8a6]/40",
  //   adminOnly: true,
  //   enabled: true,
  // },
];

const organizationUserCategoryOptions = ["Vidya", "Swasthya", "Ashram"];
const organizationUserLevelOptions = ["Level1", "Level2"];
const organizationUserRoleOptions = [
  "admin",
  "user",
  "IT Admin",
  "Secretary",
  "Chief Admin",
];

const categoryQuickActions = [
  { label: "Vidya", icon: School },
  { label: "Swasthya", icon: Hospital },
  { label: "Ashram", icon: Building2 },
];

const categoryPerformanceMonths = ["Schools", "Teachers", "Students", "Headmasters"];

const categorySignalTints = [
  "bg-[#d6ff57]",
  "bg-[#f8b3ff]",
  "bg-[#8ff2d1]",
  "bg-[#ffd978]",
];

const hospitalDetailFields = [
  {
    key: "organization_name",
    label: "Organization name",
    placeholder: "Sunrise Health Network",
    required: true,
  },
  {
    key: "admin_name",
    label: "Administrator name",
    placeholder: "Dr. Alex Morgan",
    required: true,
  },
  {
    key: "email",
    label: "Email address",
    placeholder: "admin@sunrise.com",
    type: "email",
    required: true,
  },
  {
    key: "mobile_no",
    label: "Mobile number",
    placeholder: "+1 222 555 0198",
    required: true,
  },
  {
    key: "address",
    label: "Address",
    placeholder: "112 Elm Street",
    required: true,
  },
  {
    key: "city",
    label: "City",
    placeholder: "San Diego",
    required: true,
  },
  {
    key: "pin",
    label: "Postal code",
    placeholder: "90210",
    required: true,
  },
  {
    key: "country",
    label: "Country",
    placeholder: "United States",
    required: true,
  },
  {
    key: "head_office_state",
    label: "State/Province",
    placeholder: "California",
    required: true,
  },
];

const statutoryFields = [
  {
    key: "registration_no",
    label: "Registration no. (optional)",
    placeholder: "REG-12345",
  },
  {
    key: "renewed_type",
    label: "Renewed type (optional)",
    type: "select",
    options: ["none", "yearly", "quaterly", "monthly"],
  },
  {
    key: "since",
    label: "Since (optional)",
    type: "date",
  },
  {
    key: "renewal_date",
    label: "Renewal date (optional)",
    type: "date",
  },
  {
    key: "desc",
    label: "Description (optional)",
    placeholder: "Registration details",
  },
  {
    key: "note",
    label: "Note (optional)",
    placeholder: "Additional notes",
  },
];

const defaultLocaleProfile = {
  currency_code: "USD",
  date_format: "MMM DD, YYYY",
  language: "en-US",
};

const isAbsoluteUrl = (value) =>
  /^https?:\/\//i.test(value || "") ||
  /^data:/i.test(value || "") ||
  /^blob:/i.test(value || "");

const stripApiMediaPrefix = (value) => {
  if (!value) return value;
  return value
    .replace(
      /^(https?:\/\/[^/]+)\/api\/(media\/.*)$/i,
      (_match, origin, rest) => `${origin}/${rest}`,
    )
    .replace(/^\/api\/(media\/.*)$/i, "/$1")
    .replace(/^api\/(media\/.*)$/i, "/$1");
};

const getApiBase = () => {
  const rawBase = environment.base_url?.trim();
  if (!rawBase) {
    return "/api";
  }
  const withoutTrailingSlash = rawBase.replace(/\/+$/, "");
  return withoutTrailingSlash || "/api";
};

const buildUrlFromBase = (relativePath) => {
  const apiBase = getApiBase();
  if (isAbsoluteUrl(apiBase)) {
    const baseWithSlash = apiBase.endsWith("/") ? apiBase : `${apiBase}/`;
    return new URL(relativePath, baseWithSlash).toString();
  }
  const baseWithLeading = apiBase.startsWith("/") ? apiBase : `/${apiBase}`;
  return `${baseWithLeading}/${relativePath}`.replace(/\/{2,}/g, "/");
};

const resolveImageUrl = (value) => {
  if (!value) {
    return "";
  }
  const stripped = stripApiMediaPrefix(value);
  if (isAbsoluteUrl(stripped)) {
    return stripped;
  }
  const normalized = String(stripped)
    .replace(/^\/+/, "")
    .replace(/^api\//i, "");
  return normalized ? buildUrlFromBase(normalized) : "";
};

const buildCompanyMediaUrl = (fileName, companyName) => {
  if (!fileName) {
    return "";
  }
  if (isAbsoluteUrl(fileName) || /^data:/i.test(fileName)) {
    return fileName;
  }
  const normalized = String(fileName).replace(/^\/+/, "");
  if (/^media\//i.test(normalized) || normalized.includes("/")) {
    return resolveImageUrl(normalized);
  }
  if (!companyName) {
    return resolveImageUrl(normalized);
  }
  const encodedCompany = encodeURIComponent(companyName);
  return `/media/${encodedCompany}/${normalized}`;
};

const isImageAttachment = (attachment) => {
  const attachmentType = String(attachment?.type || "").toLowerCase();
  if (attachmentType.startsWith("image/")) {
    return true;
  }
  const attachmentUrl = String(
    attachment?.url || attachment?.image_url || "",
  ).toLowerCase();
  return /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(attachmentUrl);
};

const resolveAttachmentPreviewUrl = (attachment, companyName = "") => {
  if (!attachment) {
    return "";
  }

  const directUrl = resolveImageUrl(
    attachment.url || attachment.image_url || "",
  );
  const scopedUrl = buildCompanyMediaUrl(
    attachment.url || attachment.image_url || "",
    companyName,
  );

  return (
    attachment.base_64_image ||
    directUrl ||
    scopedUrl
  );
};

const countryLocaleProfiles = {
  india: {
    currency_code: "INR",
    date_format: "DD MMM, YYYY",
    language: "en-IN",
  },
  "united states": {
    currency_code: "USD",
    date_format: "MMM DD, YYYY",
    language: "en-US",
  },
  usa: {
    currency_code: "USD",
    date_format: "MMM DD, YYYY",
    language: "en-US",
  },
  "united kingdom": {
    currency_code: "GBP",
    date_format: "DD MMM, YYYY",
    language: "en-GB",
  },
  uk: {
    currency_code: "GBP",
    date_format: "DD MMM, YYYY",
    language: "en-GB",
  },
  canada: {
    currency_code: "CAD",
    date_format: "DD MMM, YYYY",
    language: "en-CA",
  },
  australia: {
    currency_code: "AUD",
    date_format: "DD MMM, YYYY",
    language: "en-AU",
  },
  "united arab emirates": {
    currency_code: "AED",
    date_format: "DD MMM, YYYY",
    language: "en-AE",
  },
  uae: {
    currency_code: "AED",
    date_format: "DD MMM, YYYY",
    language: "en-AE",
  },
};

const getLocaleProfileForCountry = (country, fallback) => {
  const normalized = (country || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return countryLocaleProfiles[normalized] || fallback;
};

const applyLocaleDefaults = (formData) => {
  const localeProfile = getLocaleProfileForCountry(
    formData.country,
    defaultLocaleProfile,
  );

  return {
    ...formData,
    currency_code: formData.currency_code || localeProfile.currency_code,
    date_format: formData.date_format || localeProfile.date_format,
    language: formData.language || localeProfile.language,
  };
};

const getLocaleFieldsForCountry = (countryName, countryRecord = null) => {
  const normalizedCountry = String(countryName || "").trim().toLowerCase();
  const mappedLocaleProfile = countryLocaleProfiles[normalizedCountry];

  if (mappedLocaleProfile) {
    return mappedLocaleProfile;
  }

  return {
    currency_code:
      countryRecord?.currency || defaultLocaleProfile.currency_code,
    date_format:
      countryRecord?.date_format || defaultLocaleProfile.date_format,
    language: countryRecord?.language || defaultLocaleProfile.language,
  };
};

const resolveOrganizationAdminName = (entry) => {
  if (!entry) {
    return "";
  }

  return (
    entry.admin_name ||
    entry.organization_admin_name ||
    entry.adminName ||
    entry.admin?.name ||
    ""
  );
};

const formatStatutoryDate = (dateValue, dateFormat) => {
  if (!dateValue) {
    return "—";
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return String(dateValue);
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthName = monthNames[parsed.getMonth()];
  const year = parsed.getFullYear();
  const normalizedFormat = (dateFormat || "MMM DD, YYYY").toUpperCase();

  if (normalizedFormat.includes("YYYY") && normalizedFormat.includes("MMM")) {
    if (normalizedFormat.startsWith("YYYY")) {
      return `${year} ${monthName}, ${day}`;
    }
    if (normalizedFormat.startsWith("DD")) {
      return `${day} ${monthName}, ${year}`;
    }
    return `${monthName} ${day}, ${year}`;
  }

  return parsed.toISOString().slice(0, 10);
};

const PROFILE_IMAGE_CROP_PREVIEW_SIZE = 280;
const PROFILE_IMAGE_CROP_EXPORT_SIZE = 600;
const PROFILE_IMAGE_CROP_OFFSET_LIMIT = 240;
const PROFILE_IMAGE_CROP_MIN_SIZE = 120;

const clampCropOffset = (value) =>
  Math.max(-PROFILE_IMAGE_CROP_OFFSET_LIMIT, Math.min(PROFILE_IMAGE_CROP_OFFSET_LIMIT, value));

const clampValue = (value, min, max) => Math.max(min, Math.min(max, value));

const getDefaultProfileCropBox = () => {
  const size = 220;
  const position = (PROFILE_IMAGE_CROP_PREVIEW_SIZE - size) / 2;
  return {
    x: position,
    y: position,
    size,
  };
};

const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to read image"));
    image.src = src;
  });

const drawProfileCropPreviewCanvas = ({
  canvas,
  image,
  zoom,
  offsetX,
  offsetY,
  rotation,
  cropBox,
}) => {
  if (!canvas || !image) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const previewSize = PROFILE_IMAGE_CROP_PREVIEW_SIZE;
  canvas.width = previewSize;
  canvas.height = previewSize;
  context.clearRect(0, 0, previewSize, previewSize);
  context.fillStyle = "#f1f5f9";
  context.fillRect(0, 0, previewSize, previewSize);

  const baseScale = Math.max(cropBox.size / image.width, cropBox.size / image.height);
  const finalScale = baseScale * zoom;

  context.save();
  context.translate(previewSize / 2 + offsetX, previewSize / 2 + offsetY);
  context.rotate((rotation * Math.PI) / 180);
  context.scale(finalScale, finalScale);
  context.drawImage(image, -image.width / 2, -image.height / 2);
  context.restore();
};

const drawProfileCropExportCanvas = ({
  canvas,
  image,
  zoom,
  offsetX,
  offsetY,
  rotation,
  cropBox,
}) => {
  if (!canvas || !image) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const outputSize = PROFILE_IMAGE_CROP_EXPORT_SIZE;
  const previewCenter = PROFILE_IMAGE_CROP_PREVIEW_SIZE / 2;
  const cropCenterX = cropBox.x + cropBox.size / 2;
  const cropCenterY = cropBox.y + cropBox.size / 2;

  const baseScalePreview = Math.max(
    cropBox.size / image.width,
    cropBox.size / image.height,
  );
  const previewScale = baseScalePreview * zoom;
  const scaleRatio = outputSize / cropBox.size;
  const exportScale = previewScale * scaleRatio;
  const exportTranslateX =
    ((previewCenter + offsetX - cropCenterX) * scaleRatio) + outputSize / 2;
  const exportTranslateY =
    ((previewCenter + offsetY - cropCenterY) * scaleRatio) + outputSize / 2;

  canvas.width = outputSize;
  canvas.height = outputSize;
  context.clearRect(0, 0, outputSize, outputSize);

  context.save();
  context.translate(exportTranslateX, exportTranslateY);
  context.rotate((rotation * Math.PI) / 180);
  context.scale(exportScale, exportScale);
  context.drawImage(image, -image.width / 2, -image.height / 2);
  context.restore();
};

const buildStatutoryRows = (registers, customValues) => {
  const valueMap = {};
  customValues.forEach((item) => {
    if (!valueMap[item.statutory_register_id]) {
      valueMap[item.statutory_register_id] = {};
    }
    valueMap[item.statutory_register_id][item.custom_field_id] =
      item.value || "";
  });

  return registers.map((item) => ({
    ...item,
    custom_values: valueMap[item.id] || {},
  }));
};

export default function Category() {
  const router = useRouter();
  const attachmentScrollerRef = useRef(null);
  const attachmentDragStateRef = useRef({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
  });
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [isToastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef(null);
  const [isCompanyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [isOrganizationSelectionDialogOpen, setOrganizationSelectionDialogOpen] =
    useState(false);
  const [organizationSelectionError, setOrganizationSelectionError] =
    useState("");
  const [isCompanyDialogLocked, setCompanyDialogLocked] = useState(false);
  const [isApprovalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [companyApprovalStatus, setCompanyApprovalStatus] = useState("unknown");
  const [companyAccessStatus, setCompanyAccessStatus] = useState("unknown");
  const [expiryDialog, setExpiryDialog] = useState({
    open: false,
    mode: "",
    remainingDays: null,
  });
  const [companyMeta, setCompanyMeta] = useState({
    isApproved: null,
    delist: null,
    activeUpto: null,
  });
  const [isSavingCompanyInfo, setIsSavingCompanyInfo] = useState(false);
  const [companyInfoError, setCompanyInfoError] = useState("");
  const [companyId, setCompanyId] = useState(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [companyLogoPreview, setCompanyLogoPreview] = useState("");
  const [isUploadingCompanyLogo, setIsUploadingCompanyLogo] = useState(false);
  const [companyLogoError, setCompanyLogoError] = useState("");
  const [organizationAttachments, setOrganizationAttachments] = useState([]);
  const [isUploadingOrganizationAttachments, setIsUploadingOrganizationAttachments] =
    useState(false);
  const [organizationAttachmentError, setOrganizationAttachmentError] =
    useState("");
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [activeSection, setActiveSection] = useState("hospital");
  const [owners, setOwners] = useState([]);
  const [editedOwners, setEditedOwners] = useState([]);
  const [editingOwnerId, setEditingOwnerId] = useState(null);
  const [ownerMenuOpenId, setOwnerMenuOpenId] = useState(null);
  const [ownerAccountStatus, setOwnerAccountStatus] = useState({});
  const [profileData, setProfileData] = useState({
    displayName: "",
    companyname: "",
    avatarUrl: "",
    roleLabel: "",
    userTypeLabel: "",
    isOrganizationUser: false,
    isCompanyUser: false,
    isAdminOwner: false,
    username: "",
    level: "",
  });
  const [isOrganizationMember, setOrganizationMember] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isSuperuserSession, setIsSuperuserSession] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isAdminMenuOpen, setAdminMenuOpen] = useState(false);
  const [isProfileDialogOpen, setProfileDialogOpen] = useState(false);
  const [isOrgApprovalDialogOpen, setOrgApprovalDialogOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [profileImageError, setProfileImageError] = useState("");
  const [isProfileImageCropDialogOpen, setProfileImageCropDialogOpen] =
    useState(false);
  const [profileImageCropSourceUrl, setProfileImageCropSourceUrl] =
    useState("");
  const [profileImageCropFileName, setProfileImageCropFileName] =
    useState("profile-image.jpg");
  const [profileImageCropTarget, setProfileImageCropTarget] =
    useState("profile");
  const [pendingAttachmentFiles, setPendingAttachmentFiles] = useState([]);
  const [completedAttachmentUploads, setCompletedAttachmentUploads] =
    useState(0);
  const [profileImageCropZoom, setProfileImageCropZoom] = useState(1);
  const [profileImageCropOffsetX, setProfileImageCropOffsetX] = useState(0);
  const [profileImageCropOffsetY, setProfileImageCropOffsetY] = useState(0);
  const [profileImageCropRotation, setProfileImageCropRotation] = useState(0);
  const [profileImageCropBox, setProfileImageCropBox] = useState(
    getDefaultProfileCropBox(),
  );
  const [profileImageCropElement, setProfileImageCropElement] = useState(null);
  const [isProfileImageCropDragging, setProfileImageCropDragging] =
    useState(false);
  const [isProfileCropBoxDragging, setProfileCropBoxDragging] = useState(false);
  const [isProfileCropBoxResizing, setProfileCropBoxResizing] = useState(false);
  const profileImageCropCanvasRef = useRef(null);
  const profileImageCropDragStateRef = useRef({
    isActive: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originOffsetX: 0,
    originOffsetY: 0,
  });
  const profileImageCropBoxStateRef = useRef({
    isActive: false,
    mode: "",
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    originSize: 0,
  });
  const [profileForm, setProfileForm] = useState({
    name: "",
    mobile: "",
    about: "",
    address: "",
  });
  const [isOwnerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [isSavingOwner, setIsSavingOwner] = useState(false);
  const [ownerError, setOwnerError] = useState("");
  const [statutoryRegisters, setStatutoryRegisters] = useState([]);
  const [editedStatutoryRegisters, setEditedStatutoryRegisters] = useState([]);
  const [editingStatutoryId, setEditingStatutoryId] = useState(null);
  const [isStatutoryDialogOpen, setStatutoryDialogOpen] = useState(false);
  const [isSavingStatutory, setIsSavingStatutory] = useState(false);
  const [statutoryError, setStatutoryError] = useState("");
  const [statutoryCustomFields, setStatutoryCustomFields] = useState([]);
  const [isCustomFieldDialogOpen, setCustomFieldDialogOpen] = useState(false);
  const [customFieldName, setCustomFieldName] = useState("");
  const [customFieldType, setCustomFieldType] = useState("text");
  const [customFieldEdits, setCustomFieldEdits] = useState({});
  const [customFieldError, setCustomFieldError] = useState("");
  const [isAddMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [memberOwnerId, setMemberOwnerId] = useState(null);
  const [isOrganizationCreateDialogOpen, setOrganizationCreateDialogOpen] =
    useState(false);
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false);
  const [organizationCreateError, setOrganizationCreateError] = useState("");
  const [organizationCreateForm, setOrganizationCreateForm] = useState({
    name: "",
    admin_name: "",
    username: "",
    email: "",
    phone_number: "",
    password: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
  });
  const [
    isOrganizationUserCreateDialogOpen,
    setOrganizationUserCreateDialogOpen,
  ] = useState(false);
  const [isCreatingOrganizationUser, setIsCreatingOrganizationUser] =
    useState(false);
  const [organizationUserCreateError, setOrganizationUserCreateError] =
    useState("");
  const [organizationUserCategorySelections, setOrganizationUserCategorySelections] =
    useState([]);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [loggedInOrganizationId, setLoggedInOrganizationId] = useState(null);
  const [loggedInOrganizationName, setLoggedInOrganizationName] = useState("");
  const [organizationProfileOptions, setOrganizationProfileOptions] = useState(
    [],
  );
  const [selectedOrganizationProfileId, setSelectedOrganizationProfileId] =
    useState("");
  const selectedManagementContext = "default";
  const [organizationUserCreateForm, setOrganizationUserCreateForm] = useState({
    organization_id: "",
    role: "user",
    name: "",
    fatherOrHusband: "",
    aliasName: "",
    username: "",
    email: "",
    phone_number: "",
    mobile: "",
    whatsapp_number: "",
    address: "",
    job_title: "",
    category: "",
    level: "",
    association_type: "",
    medical_council_registration: "",
    department: "",
    doctor_type: "",
    administration_type: "",
    staff_department: "",
    staff_job_title: "",
    about: "",
  });
  const [organizationUserId, setOrganizationUserId] = useState(null);
  const [hospitalReferenceOptions, setHospitalReferenceOptions] = useState({
    departments: [],
    doctorTypes: [],
    administrationTypes: [],
    staffDepartments: [],
    staffJobTitles: [],
  });
  const [
    isLoadingHospitalReferenceOptions,
    setIsLoadingHospitalReferenceOptions,
  ] = useState(false);
  const [isCreatingHospitalReference, setIsCreatingHospitalReference] =
    useState(false);
  const [hospitalReferenceError, setHospitalReferenceError] = useState("");
  const [isSchoolCreateDialogOpen, setSchoolCreateDialogOpen] = useState(false);
  const [isCreatingSchool, setIsCreatingSchool] = useState(false);
  const [schoolCreateError, setSchoolCreateError] = useState("");
  const [schoolCreateForm, setSchoolCreateForm] = useState({
    username: "",
    email: "",
    phone_number: "",
    name: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
  });
  const [memberForm, setMemberForm] = useState({
    name: "",
    email: "",
    role: "doctor",
    number: "",
  });
  const [statutoryForm, setStatutoryForm] = useState({
    desc: "",
    registration_no: "",
    renewed_type: "none",
    since: "",
    renewal_date: "",
    note: "",
    customValues: {},
  });
  const [ownerForm, setOwnerForm] = useState({
    Name: "",
    Designation: "",
    otherid: "",
    email: "",
    note: "",
    Pan: "",
    primary_admin: false,
  });
  const [companyInfoForm, setCompanyInfoForm] = useState({
    id: null,
    organization_id: null,
    organization_logo_id: null,
    attachment_ids: [],
    background_attachment_id: null,
    organization_name: "",
    admin_name: "",
    email: "",
    mobile_no: "",
    address: "",
    city: "",
    pin: "",
    country: "",
    head_office_state: "",
    currency_code: defaultLocaleProfile.currency_code,
    date_format: defaultLocaleProfile.date_format,
    language: defaultLocaleProfile.language,
  });

  const resolvedOrganizationId = selectedOrganizationProfileId || loggedInOrganizationId;

  const [availableModules, setAvailableModules] = useState(baseModules);
  const [selectedWorkspacePanel, setSelectedWorkspacePanel] = useState("Vidya");
  const [isWorkspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [isCategoryDashboardLoading, setCategoryDashboardLoading] = useState(false);
  const [categoryDashboardSummary, setCategoryDashboardSummary] = useState({
    schools: 0,
    teachers: 0,
    students: 0,
    headmasters: 0,
    student_teacher_ratio: null,
    doctors: 0,
    administration: 0,
    staff: 0,
    approved: 0,
  });
  const [categoryDashboardGraph, setCategoryDashboardGraph] = useState([]);
  const [categoryDashboardSchools, setCategoryDashboardSchools] = useState([]);
  const [categoryDashboardList, setCategoryDashboardList] = useState([]);
  const workspaceDropdownRef = useRef(null);
  const emptyCategorySummary = {
    schools: 0,
    teachers: 0,
    students: 0,
    headmasters: 0,
    student_teacher_ratio: null,
    doctors: 0,
    administration: 0,
    staff: 0,
    approved: 0,
  };

  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2200);
  };

  const loadCategoryDashboardSummary = async (panel = "Vidya") => {
    setCategoryDashboardLoading(true);
    try {
      if (panel === "Swasthya") {
        const response = await getOrganizationHospitals();
        const hospitals = Array.isArray(response?.hospitals) ? response.hospitals : [];
        const hospitalCount = hospitals.length;
        const swasthyaSummary = {
          ...emptyCategorySummary,
          schools: response?.summary?.hospitals ?? hospitalCount,
          approved:
            response?.summary?.approved ??
            hospitals.filter((item) => item?.is_approved).length,
          doctors: response?.summary?.doctors ?? 0,
          administration: response?.summary?.administration ?? 0,
          staff: response?.summary?.staff ?? 0,
        };
        setCategoryDashboardSummary({
          ...swasthyaSummary,
        });
        setCategoryDashboardGraph([
          { label: "Hospitals", value: swasthyaSummary.schools },
          { label: "Doctors", value: swasthyaSummary.doctors },
          { label: "Administration", value: swasthyaSummary.administration },
          { label: "Staff", value: swasthyaSummary.staff },
          { label: "Approved", value: swasthyaSummary.approved },
        ]);
        setCategoryDashboardSchools(hospitals);
        setCategoryDashboardList([
          { key: "schools", label: "Hospitals", value: swasthyaSummary.schools },
          { key: "doctors", label: "Doctors", value: swasthyaSummary.doctors },
          {
            key: "administration",
            label: "Administration",
            value: swasthyaSummary.administration,
          },
          { key: "staff", label: "Staff", value: swasthyaSummary.staff },
          {
            key: "approved",
            label: "Approved",
            value: swasthyaSummary.approved,
          },
        ]);
        return;
      }

      if (panel === "Vidya") {
        const response = await getCategoryDashboardSummary();
        setCategoryDashboardSummary(response?.summary || emptyCategorySummary);
        setCategoryDashboardGraph(Array.isArray(response?.graph) ? response.graph : []);
        setCategoryDashboardSchools(Array.isArray(response?.schools) ? response.schools : []);
        setCategoryDashboardList(Array.isArray(response?.list) ? response.list : []);
        return;
      }

      setCategoryDashboardSummary(emptyCategorySummary);
      setCategoryDashboardGraph([]);
      setCategoryDashboardSchools([]);
      setCategoryDashboardList([]);
    } catch (_error) {
      setCategoryDashboardSummary(emptyCategorySummary);
      setCategoryDashboardGraph([]);
      setCategoryDashboardSchools([]);
      setCategoryDashboardList([]);
      showToast(`Unable to load ${panel} dashboard summary.`);
    } finally {
      setCategoryDashboardLoading(false);
    }
  };

  const handleWorkspacePanelSelect = (label) => {
    setSelectedWorkspacePanel(label);
    setWorkspaceDropdownOpen(false);
    if (label === "Ashram") {
      showToast(`${label} will introduce later`);
      return;
    }
    loadCategoryDashboardSummary(label);
  };

  useEffect(() => {
    if (!isWorkspaceDropdownOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!workspaceDropdownRef.current?.contains(event.target)) {
        setWorkspaceDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isWorkspaceDropdownOpen]);

  const buildOrganizationProfileOptions = (records = [], fallbackRecords = []) => {
    const optionMap = new Map();

    [...records, ...fallbackRecords].forEach((entry) => {
      const organizationId =
        entry?.organization_id ??
        entry?.organization ??
        entry?.company_id ??
        entry?.id ??
        null;

      if (!organizationId) {
        return;
      }

      const normalizedId = String(organizationId);
      if (optionMap.has(normalizedId)) {
        return;
      }

      optionMap.set(normalizedId, {
        id: normalizedId,
        name:
          entry?.organization_name ||
          entry?.company_name ||
          entry?.name ||
          `Organization ${normalizedId}`,
        admin_name: resolveOrganizationAdminName(entry),
      });
    });

    return Array.from(optionMap.values());
  };

  const applyCompanyInfoResponse = (
    companyInfoResponse,
    resolvedCompanyId,
    fallbackCompanyName = "",
  ) => {
    const fetchedCompanyInfo =
      companyInfoResponse?.response?.company_info ||
      companyInfoResponse?.response?.companyInfo;
    const base64LogoUrl =
      companyInfoResponse?.response?.company_thumbnail_image_url || "";
    const imageDetails = companyInfoResponse?.response?.image_details || [];
    const attachmentDetails =
      companyInfoResponse?.response?.attachment_details ||
      fetchedCompanyInfo?.attachment_details ||
      [];
    const logoAttachment = imageDetails?.[0];
    const rawLogoValue =
      logoAttachment?.url ||
      logoAttachment?.image_url ||
      logoAttachment?.base_64_image ||
      "";
    const resolvedLogoUrl =
      base64LogoUrl ||
      buildCompanyMediaUrl(
        rawLogoValue,
        fetchedCompanyInfo?.organization_name ||
          fetchedCompanyInfo?.company_name ||
          fallbackCompanyName,
      );
    const ownerList = companyInfoResponse?.response?.owners || [];
    const statutoryList = companyInfoResponse?.response?.statutory_registers || [];
    const statutoryCustomFieldList =
      companyInfoResponse?.response?.statutory_custom_fields || [];
    const statutoryCustomValues =
      companyInfoResponse?.response?.statutory_custom_values || [];

    if (!fetchedCompanyInfo) {
      return null;
    }

    const normalizedCompanyInfo = {
      id: fetchedCompanyInfo.id || null,
      organization_id:
        fetchedCompanyInfo.organization_id ||
        fetchedCompanyInfo.company_id ||
        resolvedCompanyId,
      organization_logo_id:
        fetchedCompanyInfo.organization_logo_id ||
        fetchedCompanyInfo.company_logo_id ||
        null,
      attachment_ids: Array.isArray(fetchedCompanyInfo.attachment_ids)
        ? fetchedCompanyInfo.attachment_ids
        : [],
      background_attachment_id:
        fetchedCompanyInfo.background_attachment_id || null,
      organization_name:
        fetchedCompanyInfo.organization_name ||
        fetchedCompanyInfo.company_name ||
        "",
      email: fetchedCompanyInfo.email || "",
      mobile_no: fetchedCompanyInfo.mobile_no || "",
      address: fetchedCompanyInfo.address || "",
      city: fetchedCompanyInfo.city || "",
      pin: fetchedCompanyInfo.pin || "",
      country: fetchedCompanyInfo.country || "",
      head_office_state: fetchedCompanyInfo.head_office_state || "",
      currency_code:
        fetchedCompanyInfo.currency_code ||
        defaultLocaleProfile.currency_code,
      date_format:
        fetchedCompanyInfo.date_format || defaultLocaleProfile.date_format,
      language:
        fetchedCompanyInfo.language || defaultLocaleProfile.language,
    };
    const matchedOrganization = organizationProfileOptions.find(
      (option) => option.id === String(resolvedCompanyId),
    );
    const organizationAdminName = resolveOrganizationAdminName(
      matchedOrganization,
    );

    normalizedCompanyInfo.admin_name =
      organizationAdminName ||
      fetchedCompanyInfo.admin_name ||
      normalizedCompanyInfo.admin_name ||
      "";

    const matchedCountry = countries.find(
      (country) =>
        country.name?.toLowerCase() ===
        normalizedCompanyInfo.country.toLowerCase(),
    );
    const localeDefaults = getLocaleFieldsForCountry(
      normalizedCompanyInfo.country,
      matchedCountry,
    );
    const useLocaleDefaultsForCountry = Boolean(
      countryLocaleProfiles[
        String(normalizedCompanyInfo.country || "").trim().toLowerCase()
      ],
    );

    const mergedCompanyInfo = {
      ...normalizedCompanyInfo,
      currency_code:
        useLocaleDefaultsForCountry
          ? localeDefaults.currency_code
          : normalizedCompanyInfo.currency_code || localeDefaults.currency_code,
      date_format:
        useLocaleDefaultsForCountry
          ? localeDefaults.date_format
          : normalizedCompanyInfo.date_format || localeDefaults.date_format,
      language:
        useLocaleDefaultsForCountry
          ? localeDefaults.language
          : normalizedCompanyInfo.language || localeDefaults.language,
    };

    setCompanyId(resolvedCompanyId);
    setSelectedOrganizationProfileId(String(resolvedCompanyId));
    localStorage.setItem("company_id", String(resolvedCompanyId));
    localStorage.setItem("organization_id", String(resolvedCompanyId));
    localStorage.setItem("company_id", String(resolvedCompanyId));
    if (matchedOrganization?.name) {
      localStorage.setItem(
        "selected_organization_name",
        matchedOrganization.name,
      );
      localStorage.setItem("selected_company_name", matchedOrganization.name);
      setLoggedInOrganizationName(matchedOrganization.name);
    }
    setCompanyInfoForm(mergedCompanyInfo);
    setCompanyLogoUrl(resolvedLogoUrl || "");
    setOrganizationAttachments(
      attachmentDetails
        .map((attachment) => ({
          ...attachment,
          is_image:
            attachment?.is_image != null
              ? Boolean(attachment.is_image)
              : isImageAttachment(attachment),
        }))
        .sort((left, right) => {
          if (left.is_background && !right.is_background) return -1;
          if (!left.is_background && right.is_background) return 1;
          if (left.is_logo && !right.is_logo) return -1;
          if (!left.is_logo && right.is_logo) return 1;
          return 0;
        }),
    );
    setOwners(ownerList);
    setEditedOwners(ownerList);
    checkOwnersAccountStatus(ownerList);
    const statutoryRows = buildStatutoryRows(
      statutoryList,
      statutoryCustomValues,
    );
    setStatutoryCustomFields(statutoryCustomFieldList);
    setCustomFieldEdits(
      statutoryCustomFieldList.reduce((acc, field) => {
        acc[field.id] = {
          name: field.name || "",
          field_type: field.field_type || "text",
        };
        return acc;
      }, {}),
    );
    setStatutoryRegisters(statutoryRows);
    setEditedStatutoryRegisters(statutoryRows);

    return normalizedCompanyInfo;
  };

  const loadOrganizationProfile = async (organizationId, fileId) => {
    const resolvedCompanyId = Number(organizationId || companyId);
    if (!resolvedCompanyId) {
      return null;
    }

    const companyInfoResponse = await getCompanyInfo(
      resolvedCompanyId,
      fileId || undefined,
    );
    return applyCompanyInfoResponse(companyInfoResponse, resolvedCompanyId);
  };

  useEffect(() => {
    const isSuperuser = localStorage.getItem("is_superuser") === "true";
    if (isSuperuser) {
      router.replace("/super-admin");
      return undefined;
    }
    userDetails();
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [router]);

  useEffect(() => {
    setIsSuperuserSession(localStorage.getItem("is_superuser") === "true");
  }, []);

  useEffect(() => {
    if (!isProfileImageCropDialogOpen || !profileImageCropSourceUrl) {
      setProfileImageCropElement(null);
      return;
    }

    let isMounted = true;
    loadImageElement(profileImageCropSourceUrl)
      .then((image) => {
        if (!isMounted) {
          return;
        }
        setProfileImageCropElement(image);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setProfileImageError("Unable to open image for cropping.");
        setProfileImageCropElement(null);
      });

    return () => {
      isMounted = false;
    };
  }, [isProfileImageCropDialogOpen, profileImageCropSourceUrl]);

  useEffect(() => {
    if (!isProfileImageCropDialogOpen || !profileImageCropElement) {
      return;
    }

    drawProfileCropPreviewCanvas({
      canvas: profileImageCropCanvasRef.current,
      image: profileImageCropElement,
      zoom: profileImageCropZoom,
      offsetX: profileImageCropOffsetX,
      offsetY: profileImageCropOffsetY,
      rotation: profileImageCropRotation,
      cropBox: profileImageCropBox,
    });
  }, [
    isProfileImageCropDialogOpen,
    profileImageCropElement,
    profileImageCropZoom,
    profileImageCropOffsetX,
    profileImageCropOffsetY,
    profileImageCropRotation,
    profileImageCropBox,
  ]);

  useEffect(() => {
    if (!isOrganizationUserCreateDialogOpen) {
      return;
    }
    if (selectedManagementContext !== "hospital") {
      return;
    }
    const organizationId = Number(
      organizationUserCreateForm.organization_id || loggedInOrganizationId,
    );
    if (!organizationId) {
      return;
    }
    loadHospitalReferenceOptions(organizationId);
  }, [
    isOrganizationUserCreateDialogOpen,
    selectedManagementContext,
    organizationUserCreateForm.organization_id,
    loggedInOrganizationId,
  ]);

  const userDetails = async () => {
    const username = localStorage.getItem("username");
    const allLocalStorage = Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, index) => {
        const key = localStorage.key(index);
        return key ? [key, localStorage.getItem(key)] : null;
      }).filter(Boolean),
    );
    console.log("LocalStorage username=====>>>>>>>", username);
    console.log("LocalStorage all=====>>>>>>>", allLocalStorage);
    if (!username) {
      return;
    }

    try {
      const isSuperuserSession = localStorage.getItem("is_superuser") === "true";
      const [organizationUserDetails, organizationMemberships] =
        await Promise.all([
          isSuperuserSession
            ? Promise.resolve(null)
            : getOrganizationUserDetails(username),
          getOrganizationUsersByUsername(username),
        ]);
      console.log(
        "OrganizationUser details=====>>>>>>>",
        organizationUserDetails,
      );
      const membershipOptions = buildOrganizationProfileOptions(
        organizationMemberships,
      );
      const preferredOrganizationId =
        localStorage.getItem("organization_id") ||
        localStorage.getItem("company_id") ||
        organizationUserDetails?.organization ||
        membershipOptions[0]?.id ||
        null;
      const matchedOrganization = membershipOptions.find(
        (option) => option.id === String(preferredOrganizationId),
      );
      setOrganizationProfileOptions(membershipOptions);
      setOrganizationMember(
        Boolean(organizationUserDetails) || membershipOptions.length > 0,
      );
      if (organizationUserDetails) {
        setProfileData((prev) => ({
          ...prev,
          roleLabel: organizationUserDetails.role || prev.roleLabel,
          level: organizationUserDetails.level || prev.level,
        }));

        const normalizedLevel = String(
          organizationUserDetails.level || "",
        ).toLowerCase();
        const rawCategory = organizationUserDetails.category;
        const normalizedCategories = (
          Array.isArray(rawCategory)
            ? rawCategory
            : String(rawCategory || "").split(",")
        )
          .map((value) => String(value || "").trim().toLowerCase())
          .filter(Boolean);

        if (normalizedLevel === "Level2" && normalizedCategories.length > 0) {
          const enabledByCategory = new Set(normalizedCategories);
          setAvailableModules(
            baseModules.map((module) => ({
              ...module,
              enabled: enabledByCategory.has(
                String(module.title || "").toLowerCase(),
              ),
            })),
          );
        } else {
          setAvailableModules(baseModules);
        }
      } else {
        setAvailableModules(baseModules);
      }
      setOrgApprovalDialogOpen(
        !isSuperuserSession &&
          Boolean(organizationUserDetails) &&
          organizationUserDetails?.is_approve === false,
      );
      setSelectedOrganizationProfileId(
        preferredOrganizationId ? String(preferredOrganizationId) : "",
      );
      setOrganizationUserId(
        organizationUserDetails?.id ||
          organizationUserDetails?.user_id ||
          organizationUserDetails?.user ||
          null,
      );
      setLoggedInOrganizationId(
        preferredOrganizationId
          ? Number(preferredOrganizationId)
          : organizationUserDetails?.organization || null,
      );
      setLoggedInOrganizationName(
        matchedOrganization?.name ||
          organizationUserDetails?.organization_name ||
          "",
      );
      setOrganizationUserCreateForm((prev) => ({
        ...prev,
        organization_id: preferredOrganizationId
          ? String(preferredOrganizationId)
          : prev.organization_id,
      }));
      setSchoolCreateForm((prev) => ({
        ...prev,
        username: organizationUserDetails?.username || prev.username,
        email: organizationUserDetails?.email || prev.email,
        phone_number:
          organizationUserDetails?.phone_number || prev.phone_number,
      }));
    } catch {
      setOrganizationUserId(null);
      setLoggedInOrganizationId(null);
      setLoggedInOrganizationName("");
      setOrganizationProfileOptions([]);
      setSelectedOrganizationProfileId("");
      setOrganizationMember(false);
      setOrgApprovalDialogOpen(false);
      setAvailableModules(baseModules);
    }

    // const userDetails = await get_Hospital_User_Login_Details(username);
    // const permissions = userDetails?.app_permissions || [];
    // if (Array.isArray(permissions)) {
    //   localStorage.setItem("app_permissions", JSON.stringify(permissions));
    // }
    // console.log("userDetails=====>>>>>>>", userDetails);
    // if (Array.isArray(permissions)) {
    //   const normalizeKey = (value) =>
    //     String(value || "")
    //       .trim()
    //       .toLowerCase();
    //   const permissionMap = new Map(
    //     permissions.map((permission) => [
    //       normalizeKey(permission?.name),
    //       permission?.can_access === true,
    //     ]),
    //   );
    //   setAvailableModules((prevModules) =>
    //     prevModules.map((module) => {
    //       const key = normalizeKey(module.title);
    //       if (permissionMap.has(key)) {
    //         return { ...module, enabled: permissionMap.get(key) };
    //       }
    //       return module;
    //     }),
    //   );
    // }
  };
  useEffect(() => {
    if (!isProfileMenuOpen || !isAdminMenuOpen) {
      setOwnerMenuOpenId(null);
    }
  }, [isProfileMenuOpen, isAdminMenuOpen]);

  const handleForcedLogout = () => {
    clearLoginSession();
    router.push("/login");
  };

  useEffect(() => {
    const loadCountries = async () => {
      try {
        setIsLoadingCountries(true);
        const response = await getAllCountries();
        const countryList = response?.response || [];
        setCountries(countryList);
      } catch (error) {
        console.error("Failed to load countries:", error);
        setCountries([]);
      } finally {
        setIsLoadingCountries(false);
      }
    };

    loadCountries();
  }, []);

  useEffect(() => {
    if (!countries.length || selectedCountryCode) {
      return;
    }

    if (companyInfoForm.country) {
      const matchedCountry = countries.find(
        (country) =>
          country.name?.toLowerCase() === companyInfoForm.country.toLowerCase(),
      );
      if (matchedCountry?.alpha_2) {
        setSelectedCountryCode(matchedCountry.alpha_2);
      }
    }
  }, [countries, selectedCountryCode, companyInfoForm.country]);

  useEffect(() => {
    const loadStates = async () => {
      if (!selectedCountryCode) {
        setStates([]);
        return;
      }

      try {
        setIsLoadingStates(true);
        const response = await getAllStates(selectedCountryCode);
        const stateList = response?.response || [];
        const names = stateList.map((state) => state.name).filter(Boolean);
        setStates(names);
      } catch (error) {
        console.error("Failed to load states:", error);
        setStates([]);
      } finally {
        setIsLoadingStates(false);
      }
    };

    loadStates();
  }, [selectedCountryCode]);

  useEffect(() => {
    if (!countries.length || !companyInfoForm.country) {
      return;
    }

    const matchedCountry = countries.find(
      (country) =>
        country.name?.toLowerCase() === companyInfoForm.country.toLowerCase(),
    );
    if (!matchedCountry) {
      return;
    }

    const localeDefaults = getLocaleFieldsForCountry(
      matchedCountry.name,
      matchedCountry,
    );
    const useLocaleDefaultsForCountry = Boolean(
      countryLocaleProfiles[
        String(matchedCountry.name || "").trim().toLowerCase()
      ],
    );

    setCompanyInfoForm((prev) => ({
      ...prev,
      currency_code: useLocaleDefaultsForCountry
        ? localeDefaults.currency_code
        : matchedCountry.currency || prev.currency_code || "",
      date_format: useLocaleDefaultsForCountry
        ? localeDefaults.date_format
        : matchedCountry.date_format || prev.date_format || "",
      language: useLocaleDefaultsForCountry
        ? localeDefaults.language
        : matchedCountry.language || prev.language || "",
    }));
  }, [countries, companyInfoForm.country]);

  const getMissingCompanyInfoFields = (formData) =>
    hospitalDetailFields.filter((field) => {
      if (!field.required) {
        return false;
      }
      const value = formData?.[field.key];
      return !String(value || "").trim();
    });

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

  const maybeOpenExpiryDialog = (accessState) => {
    if (!accessState?.mode) {
      return false;
    }
    const dialogAlreadyShown =
      typeof window !== "undefined" &&
      localStorage.getItem("expiry_dialog_shown") === "true";
    if (dialogAlreadyShown) {
      return false;
    }
    setExpiryDialog({
      open: true,
      mode: accessState.mode,
      remainingDays: accessState.remainingDays,
    });
    localStorage.setItem("expiry_dialog_shown", "true");
    return true;
  };

  useEffect(() => {
    let isMounted = true;
    const loadCompanyInfo = async () => {
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) {
        if (isMounted) {
          setIsPageLoading(false);
        }
        return;
      }

      try {
        const { data: currentUser, status } = await getCurrentUserStatus();
        if (status && status >= 400 && status < 500) {
          localStorage.removeItem("expiry_dialog_shown");
          return;
        }
        if (!currentUser) {
          return;
        }
        const userDetails = currentUser?.user || {};
        console.log(userDetails);
        
        const companyDetails = currentUser?.company_details || {};
        console.log("company_details", companyDetails);
        const isSuperuser = localStorage.getItem("is_superuser") === "true";
        setIsSuperuserSession(isSuperuser);
        const meta = {
          isApproved: companyDetails.is_approved === true,
          delist: companyDetails.delist === true,
          activeUpto: companyDetails.active_upto,
        };
        setCompanyMeta(meta);
        const accessState = resolveAccessStatus({
          isSuperuser,
          meta,
        });
        setCompanyApprovalStatus(
          accessState.status === "blocked" ? "blocked" : "approved",
        );
        setCompanyAccessStatus(accessState.status);
        maybeOpenExpiryDialog(accessState);
        const fallbackName = localStorage.getItem("username") || "Admin";

        const normalizedUserType = String(
          currentUser?.user_type || userDetails?.user_type || "",
        ).toLowerCase();
        localStorage.setItem("session_user_type", normalizedUserType);
        window.dispatchEvent(new Event("session-context-changed"));
        const isOrganizationUser = normalizedUserType.startsWith("organization");
        const isCompanyUser = normalizedUserType.startsWith("company");
        const userTypeLabel = isOrganizationUser
          ? "Organization user"
          : isCompanyUser
            ? "Company user"
            : "";
        const normalizedRole = String(userDetails.role || "")
          .trim()
          .toLowerCase();
        const isAdminRole =
          userDetails.is_admin === true ||
          userDetails.is_owner === true ||
          normalizedRole.includes("admin");
        const isManagerRole = userDetails.is_manager === true;
        const roleLabel =
          userDetails.role ||
          (isAdminRole ? "Admin" : isManagerRole ? "Manager" : "");
        setProfileData((prev) => ({
          displayName: userDetails.name || userDetails.username || fallbackName,
          companyname:
            companyDetails.organization_name || companyDetails.company_name || "",
          avatarUrl:
            userDetails.image_url || "https://i.pravatar.cc/100?img=12",
          roleLabel: roleLabel || prev.roleLabel,
          userTypeLabel,
          isOrganizationUser,
          isCompanyUser,
          isAdminOwner: isSuperuser || isAdminRole,
          username:
            userDetails.username || localStorage.getItem("username") || "",
          level: userDetails.level || prev.level,
        }));
        setIsAdminUser(isSuperuser || isAdminRole);
        setProfileForm({
          name: userDetails.name || "",
          mobile: userDetails.mobile || "",
          about: userDetails.about || "",
          address: userDetails.address || "",
        });
        const isAdmin =
          isSuperuser ||
          currentUser?.user?.is_admin ||
          currentUser?.user?.is_owner;

        if (!isAdmin) {
          return;
        }

        const currentUserOrganizations = buildOrganizationProfileOptions(
          currentUser?.companies || [],
          currentUser?.company_details ? [currentUser.company_details] : [],
        );
        let availableOrganizationOptions = currentUserOrganizations;

        if (isSuperuser || isAdminRole) {
          try {
            const organizationCatalog = await getOrganizations();
            availableOrganizationOptions = buildOrganizationProfileOptions(
              currentUserOrganizations,
              Array.isArray(organizationCatalog) ? organizationCatalog : [],
            );
          } catch (organizationLoadError) {
            console.error(
              "Unable to load organization catalog:",
              organizationLoadError,
            );
          }
        }

        if (availableOrganizationOptions.length > 0) {
          setOrganizationProfileOptions(availableOrganizationOptions);
        }

        const resolvedCompanyId =
          Number(selectedOrganizationProfileId) ||
          Number(localStorage.getItem("organization_id") || 0) ||
          Number(localStorage.getItem("company_id") || 0) ||
          currentUser?.user?.company_id ||
          currentUser?.company_details?.id ||
          Number(availableOrganizationOptions[0]?.id || 0);

        if (!resolvedCompanyId) {
          return;
        }

        const pendingLogoId = localStorage.getItem("pending_company_logo_id");
        const normalizedCompanyInfo = await loadOrganizationProfile(
          resolvedCompanyId,
          pendingLogoId,
        );

        if (!normalizedCompanyInfo) {
          return;
        }
        const missingFields = getMissingCompanyInfoFields(
          normalizedCompanyInfo,
        );
        if (missingFields.length > 0) {
          const hasExplicitOrg = Boolean(resolvedCompanyId);
          const shouldSkipSelectionDialog =
            !isSuperuser && hasExplicitOrg;
          setCompanyDialogLocked(true);
          if (!shouldSkipSelectionDialog && availableOrganizationOptions.length > 1) {
            setCompanyDialogOpen(false);
            setOrganizationSelectionDialogOpen(true);
          } else {
            setOrganizationSelectionDialogOpen(false);
            setCompanyDialogOpen(true);
          }
        }

        if (pendingLogoId) {
          if (normalizedCompanyInfo.organization_logo_id) {
            localStorage.removeItem("pending_company_logo_id");
          } else if (normalizedCompanyInfo.id) {
            try {
              await updateCompanyInfo({
                id: normalizedCompanyInfo.id,
                organization_id:
                  normalizedCompanyInfo.organization_id || resolvedCompanyId,
                organization_logo_id: Number(pendingLogoId) || pendingLogoId,
              });
              const refreshedLogo = await getCompanyInfo(resolvedCompanyId);
              const refreshedInfo =
                refreshedLogo?.response?.company_info ||
                refreshedLogo?.response?.companyInfo;
              const refreshedBase64Logo =
                refreshedLogo?.response?.company_thumbnail_image_url || "";
              const refreshedImages =
                refreshedLogo?.response?.image_details || [];
              const refreshedAttachment = refreshedImages?.[0];
              const refreshedRawLogo =
                refreshedAttachment?.url ||
                refreshedAttachment?.image_url ||
                refreshedAttachment?.base_64_image ||
                "";
              setCompanyInfoForm((prev) => ({
                ...prev,
                organization_logo_id:
                  refreshedInfo?.organization_logo_id ||
                  refreshedInfo?.company_logo_id ||
                  null,
              }));
              setCompanyLogoUrl(
                refreshedBase64Logo ||
                  buildCompanyMediaUrl(
                    refreshedRawLogo,
                    refreshedInfo?.organization_name || refreshedInfo?.company_name,
                  ),
              );
              localStorage.removeItem("pending_company_logo_id");
            } catch (logoError) {
              console.error("Unable to apply pending logo:", logoError);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load company info:", error);
        setCompanyInfoError("Unable to load company profile.");
      } finally {
        if (isMounted) {
          setIsPageLoading(false);
        }
      }
    };

    loadCompanyInfo();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOrganizationProfileChange = async (event) => {
    const nextOrganizationId = event.target.value;
    setSelectedOrganizationProfileId(nextOrganizationId);
    if (!nextOrganizationId) {
      return;
    }

    try {
      setCompanyInfoError("");
      await loadOrganizationProfile(nextOrganizationId);
    } catch (error) {
      console.error("Unable to switch organization profile:", error);
      setCompanyInfoError("Unable to load organization profile.");
    }
  };

  const handleOpenOrganizationInformation = async () => {
    setProfileMenuOpen(false);
    setOrganizationSelectionError("");
    let availableOrganizationOptions = organizationProfileOptions;
    const loggedOrganizationId =
      Number(localStorage.getItem("organization_id") || 0) ||
      Number(localStorage.getItem("company_id") || 0) ||
      Number(loggedInOrganizationId || 0) ||
      0;

    try {
      const username = localStorage.getItem("username");
      const currentUserOrganizations = username
        ? await getOrganizationUsersByUsername(username)
        : [];
      const organizationCatalog = await getOrganizations();
      availableOrganizationOptions = buildOrganizationProfileOptions(
        currentUserOrganizations,
        Array.isArray(organizationCatalog) ? organizationCatalog : [],
      );
    } catch (error) {
      console.error("Unable to refresh organization options:", error);
    }

    if (availableOrganizationOptions.length > 0) {
      setOrganizationProfileOptions(availableOrganizationOptions);
    }

    if (loggedOrganizationId) {
      try {
        await loadOrganizationProfile(loggedOrganizationId);
      } catch (error) {
        console.error("Unable to load organization profile:", error);
        setCompanyInfoError("Unable to load organization profile.");
        return;
      }
      setOrganizationSelectionDialogOpen(false);
      setCompanyDialogOpen(true);
      return;
    }

    if (availableOrganizationOptions.length > 1) {
      const resolvedSelectedOrganizationId =
        selectedOrganizationProfileId ||
        String(companyId || companyInfoForm.organization_id || "");
      setSelectedOrganizationProfileId(resolvedSelectedOrganizationId);
      setOrganizationSelectionDialogOpen(true);
      return;
    }

    const resolvedOrganizationId =
      availableOrganizationOptions[0]?.id ||
      selectedOrganizationProfileId ||
      String(companyId || companyInfoForm.organization_id || "");

    if (resolvedOrganizationId) {
      try {
        await loadOrganizationProfile(resolvedOrganizationId);
      } catch (error) {
        console.error("Unable to load organization profile:", error);
        setCompanyInfoError("Unable to load organization profile.");
        return;
      }
    }

    setCompanyDialogOpen(true);
  };

  const handleOrganizationSelectionSubmit = async (event) => {
    event.preventDefault();

    if (!selectedOrganizationProfileId) {
      setOrganizationSelectionError("Select an organization first.");
      return;
    }

    try {
      setOrganizationSelectionError("");
      await loadOrganizationProfile(selectedOrganizationProfileId);
      setOrganizationSelectionDialogOpen(false);
      setCompanyDialogOpen(true);
    } catch (error) {
      console.error("Unable to load selected organization:", error);
      setOrganizationSelectionError("Unable to load selected organization.");
    }
  };

  const handleCompanyInfoChange = (event) => {
    const { name, value } = event.target;
    setCompanyInfoForm((prev) => {
      if (name === "country") {
        return prev;
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleCountrySelect = (event) => {
    const countryCode = event.target.value;
    const matchedCountry = countries.find(
      (country) => country.alpha_2 === countryCode,
    );
    const localeDefaults = getLocaleFieldsForCountry(
      matchedCountry?.name || "",
      matchedCountry,
    );

    setSelectedCountryCode(countryCode);
    setCompanyInfoForm((prev) => ({
      ...prev,
      country: matchedCountry?.name || "",
      head_office_state: "",
      currency_code: localeDefaults.currency_code || "",
      date_format: localeDefaults.date_format || "",
      language: localeDefaults.language || "",
    }));
  };

  const handleStateSelect = (event) => {
    const { value } = event.target;
    setCompanyInfoForm((prev) => ({
      ...prev,
      head_office_state: value,
    }));
  };

  const resetOwnerForm = () => {
    setOwnerForm({
      Name: "",
      Designation: "",
      otherid: "",
      email: "",
      note: "",
      Pan: "",
      primary_admin: false,
    });
    setOwnerError("");
  };

  const resetMemberForm = () => {
    setMemberForm({
      name: "",
      email: "",
      role: "doctor",
      number: "",
    });
    setMemberOwnerId(null);
    setMemberError("");
  };

  useEffect(() => {
    const handleHeaderProfileMenuAction = (event) => {
      const action = event?.detail?.action;
      if (action === "add_member") {
        resetMemberForm();
        setAddMemberDialogOpen(true);
        return;
      }
      if (action === "delist_user") {
        showToast("Delist user coming soon");
        return;
      }
      if (action === "reactivate_user") {
        showToast("Reactivate user coming soon");
        return;
      }
      if (action === "open_user_profile") {
        setProfileDialogOpen(true);
        return;
      }
      if (action === "open_organization_information") {
        handleOpenOrganizationInformation();
      }
    };

    window.addEventListener(
      "header-profile-menu-action",
      handleHeaderProfileMenuAction,
    );
    return () => {
      window.removeEventListener(
        "header-profile-menu-action",
        handleHeaderProfileMenuAction,
      );
    };
  }, []);

  useEffect(() => {
    if (isPageLoading || selectedWorkspacePanel === "Ashram") {
      return;
    }

    const run = async () => {
      await loadCategoryDashboardSummary(selectedWorkspacePanel);
    };

    run();
  }, [isPageLoading, selectedWorkspacePanel]);

  const resetOrganizationCreateForm = () => {
    setOrganizationCreateForm({
      name: "",
      admin_name: "",
      username: "",
      email: "",
      phone_number: "",
      password: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postal_code: "",
    });
    setOrganizationCreateError("");
  };

  const handleOrganizationCreateFormChange = (event) => {
    const { name, value } = event.target;
    setOrganizationCreateForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOrganizationCreateSubmit = async (event) => {
    event.preventDefault();
    setOrganizationCreateError("");

    const organizationPayload = {
      name: organizationCreateForm.name.trim(),
      username: organizationCreateForm.username.trim(),
      email: organizationCreateForm.email.trim(),
      phone_number: organizationCreateForm.phone_number.trim(),
      address: organizationCreateForm.address.trim(),
      city: organizationCreateForm.city.trim(),
      state: organizationCreateForm.state.trim(),
      country: organizationCreateForm.country.trim(),
      postal_code: organizationCreateForm.postal_code.trim(),
    };
    const organizationUserPayload = {
      role: "user",
      name: organizationCreateForm.admin_name.trim(),
      username: organizationCreateForm.username.trim(),
      email: organizationCreateForm.email.trim(),
      phone_number: organizationCreateForm.phone_number.trim(),
      mobile: organizationCreateForm.phone_number.trim(),
      address: organizationCreateForm.address.trim(),
      password: organizationCreateForm.password,
    };

    if (!organizationPayload.name) {
      setOrganizationCreateError("Organization name is required.");
      return;
    }
    if (!organizationUserPayload.name) {
      setOrganizationCreateError("Admin name is required.");
      return;
    }
    if (!organizationUserPayload.username) {
      setOrganizationCreateError("Username is required.");
      return;
    }
    if (!organizationUserPayload.email) {
      setOrganizationCreateError("Email is required.");
      return;
    }
    if (!organizationUserPayload.phone_number) {
      setOrganizationCreateError("Phone number is required.");
      return;
    }
    if (!organizationUserPayload.password) {
      setOrganizationCreateError("Password is required.");
      return;
    }

    try {
      setIsCreatingOrganization(true);
      const createdOrganization = await createOrganization(organizationPayload);
      const organizationId = Number(
        createdOrganization?.id ||
          createdOrganization?.organization_id ||
          createdOrganization?.organization?.id ||
          createdOrganization?.response?.id ||
          createdOrganization?.response?.organization_id,
      );

      if (!organizationId) {
        throw new Error(
          "Organization created, but organization user could not be created because the organization id was not returned.",
        );
      }

      await createOrganizationUser({
        ...organizationUserPayload,
        organization_id: organizationId,
      });
      setOrganizationCreateDialogOpen(false);
      resetOrganizationCreateForm();
      showToast("Organization and login user created successfully.");
    } catch (error) {
      const responseData = error.response?.data;
      const detail =
        responseData?.detail ||
        responseData?.error ||
        responseData?.message ||
        responseData?.name?.[0] ||
        responseData?.username?.[0] ||
        responseData?.email?.[0] ||
        responseData?.phone_number?.[0] ||
        responseData?.password?.[0] ||
        (typeof responseData === "string" ? responseData : null) ||
        error.message ||
        "Unable to create organization.";
      setOrganizationCreateError(String(detail));
    } finally {
      setIsCreatingOrganization(false);
    }
  };

  const resetOrganizationUserCreateForm = () => {
    const isHospitalContext = selectedManagementContext === "hospital";
    setOrganizationUserCreateForm({
      organization_id: loggedInOrganizationId
        ? String(loggedInOrganizationId)
        : "",
      role: isHospitalContext ? "doctor" : "user",
      name: "",
      fatherOrHusband: "",
      aliasName: "",
      username: "",
      email: "",
      phone_number: "",
      mobile: "",
      whatsapp_number: "",
      address: "",
      job_title: "",
      category: "",
      level: "",
      association_type: "",
      medical_council_registration: "",
      department: "",
      doctor_type: "",
      administration_type: "",
      staff_department: "",
      staff_job_title: "",
      about: "",
    });
    setOrganizationUserCategorySelections([]);
    setOrganizationUserCreateError("");
    setHospitalReferenceError("");
  };

  const loadOrganizationsForDropdown = async () => {
    try {
      setIsLoadingOrganizations(true);
      const response = await getOrganizations();
      setOrganizations(Array.isArray(response) ? response : []);
    } catch (error) {
      setOrganizationUserCreateError("Unable to load organizations.");
    } finally {
      setIsLoadingOrganizations(false);
    }
  };

  const loadHospitalReferenceOptions = async (organizationId) => {
    if (!organizationId) {
      setHospitalReferenceOptions({
        departments: [],
        doctorTypes: [],
        administrationTypes: [],
        staffDepartments: [],
        staffJobTitles: [],
      });
      return;
    }
    try {
      setIsLoadingHospitalReferenceOptions(true);
      setHospitalReferenceError("");
      const [
        departments,
        doctorTypes,
        administrationTypes,
        staffDepartments,
        staffJobTitles,
      ] = await Promise.all([
        getDepartments(organizationId),
        getDoctorTypes(organizationId),
        getAdministrationTypes(organizationId),
        getStaffDepartments(organizationId),
        getStaffJobTitles(organizationId),
      ]);
      setHospitalReferenceOptions({
        departments: Array.isArray(departments) ? departments : [],
        doctorTypes: Array.isArray(doctorTypes) ? doctorTypes : [],
        administrationTypes: Array.isArray(administrationTypes)
          ? administrationTypes
          : [],
        staffDepartments: Array.isArray(staffDepartments)
          ? staffDepartments
          : [],
        staffJobTitles: Array.isArray(staffJobTitles) ? staffJobTitles : [],
      });
    } catch (error) {
      setHospitalReferenceError("Unable to load hospital master data.");
    } finally {
      setIsLoadingHospitalReferenceOptions(false);
    }
  };

  const handleOrganizationUserCreateFieldValueChange = (name, value) => {
    setOrganizationUserCreateForm((prev) => {
      if (name === "level") {
        const nextLevel = String(value || "");
        const nextRole = prev.role || "user";
        if (nextLevel === "Level1") {
          setOrganizationUserCategorySelections([]);
          if (!organizationUserRoleOptions.includes(nextRole)) {
            return { ...prev, level: nextLevel, role: "user" };
          }
          return { ...prev, level: nextLevel };
        }
        if (nextLevel === "Level2") {
          return { ...prev, level: nextLevel };
        }
        return { ...prev, level: nextLevel };
      }
      if (name === "role") {
        const nextRole = String(value || "user");
        if (nextRole === "doctor") {
          return {
            ...prev,
            role: nextRole,
            administration_type: "",
            staff_department: "",
            staff_job_title: "",
          };
        }
        if (nextRole === "administration") {
          return {
            ...prev,
            role: nextRole,
            department: "",
            doctor_type: "",
            association_type: "",
            medical_council_registration: "",
            staff_department: "",
            staff_job_title: "",
          };
        }
        if (nextRole === "staff") {
          return {
            ...prev,
            role: nextRole,
            department: "",
            doctor_type: "",
            administration_type: "",
            association_type: "",
            medical_council_registration: "",
          };
        }
        return {
          ...prev,
          role: nextRole,
          department: "",
          doctor_type: "",
          administration_type: "",
          staff_department: "",
          staff_job_title: "",
          association_type: "",
          medical_council_registration: "",
        };
      }
      if (
        name === "staff_department" &&
        String(prev.staff_department) !== String(value || "")
      ) {
        return {
          ...prev,
          staff_department: value,
          staff_job_title: "",
        };
      }
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleOrganizationUserCreateFormChange = (event) => {
    const { name, value } = event.target;
    handleOrganizationUserCreateFieldValueChange(name, value);
  };

  const toggleOrganizationUserCategory = (value) => {
    setOrganizationUserCategorySelections((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const handleCreateHospitalReference = async (type, payload) => {
    const organizationId = Number(
      organizationUserCreateForm.organization_id || loggedInOrganizationId,
    );
    if (!organizationId) {
      throw new Error("Please select organization first.");
    }
    const basePayload = {
      company: organizationId,
      company_id: organizationId,
      ...payload,
    };
    try {
      setIsCreatingHospitalReference(true);
      setHospitalReferenceError("");
      let createdRecord = null;
      if (type === "department") {
        createdRecord = await createDepartment(basePayload);
        setHospitalReferenceOptions((prev) => ({
          ...prev,
          departments: [createdRecord, ...prev.departments],
        }));
      } else if (type === "doctor_type") {
        createdRecord = await createDoctorType(basePayload);
        setHospitalReferenceOptions((prev) => ({
          ...prev,
          doctorTypes: [createdRecord, ...prev.doctorTypes],
        }));
      } else if (type === "administration_type") {
        createdRecord = await createAdministrationType(basePayload);
        setHospitalReferenceOptions((prev) => ({
          ...prev,
          administrationTypes: [createdRecord, ...prev.administrationTypes],
        }));
      } else if (type === "staff_department") {
        createdRecord = await createStaffDepartment(basePayload);
        setHospitalReferenceOptions((prev) => ({
          ...prev,
          staffDepartments: [createdRecord, ...prev.staffDepartments],
        }));
      } else if (type === "staff_job_title") {
        createdRecord = await createStaffJobTitle(basePayload);
        setHospitalReferenceOptions((prev) => ({
          ...prev,
          staffJobTitles: [createdRecord, ...prev.staffJobTitles],
        }));
      }
      return createdRecord;
    } catch (error) {
      const responseData = error.response?.data || {};
      const message =
        responseData?.detail ||
        responseData?.error?.[0] ||
        responseData?.errors?.name?.[0] ||
        responseData?.errors?.code?.[0] ||
        responseData?.errors?.staff_department?.[0] ||
        "Unable to create master data.";
      setHospitalReferenceError(String(message));
      throw error;
    } finally {
      setIsCreatingHospitalReference(false);
    }
  };

  const handleOrganizationUserCreateSubmit = async (event) => {
    event.preventDefault();
    setOrganizationUserCreateError("");
    const categoryValue =
      organizationUserCreateForm.level === "Level1"
        ? "all"
        : organizationUserCategorySelections.length
          ? organizationUserCategorySelections.join(", ")
          : organizationUserCreateForm.category.trim();
    const parseOptionalId = (value) => {
      const normalized = String(value || "").trim();
      if (!normalized) return null;
      const parsed = Number(normalized);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const payload = {
      organization_id: Number(
        organizationUserCreateForm.organization_id || loggedInOrganizationId,
      ),
      role: organizationUserCreateForm.role || "user",
      name: organizationUserCreateForm.name.trim(),
      fatherOrHusband: organizationUserCreateForm.fatherOrHusband.trim(),
      aliasName: organizationUserCreateForm.aliasName.trim(),
      username: organizationUserCreateForm.username.trim(),
      email: organizationUserCreateForm.email.trim(),
      phone_number: organizationUserCreateForm.phone_number.trim(),
      mobile:
        organizationUserCreateForm.mobile.trim() ||
        organizationUserCreateForm.phone_number.trim(),
      whatsapp_number: organizationUserCreateForm.whatsapp_number.trim(),
      address: organizationUserCreateForm.address.trim(),
      job_title: organizationUserCreateForm.job_title.trim(),
      category: categoryValue,
      level: organizationUserCreateForm.level.trim(),
      association_type: organizationUserCreateForm.association_type.trim(),
      medical_council_registration:
        organizationUserCreateForm.medical_council_registration.trim(),
      department: parseOptionalId(organizationUserCreateForm.department),
      doctor_type: parseOptionalId(organizationUserCreateForm.doctor_type),
      administration_type: parseOptionalId(
        organizationUserCreateForm.administration_type,
      ),
      staff_department: parseOptionalId(
        organizationUserCreateForm.staff_department,
      ),
      staff_job_title: parseOptionalId(
        organizationUserCreateForm.staff_job_title,
      ),
      about: organizationUserCreateForm.about.trim(),
    };
    if (payload.role !== "doctor") {
      payload.department = null;
      payload.doctor_type = null;
      payload.association_type = "";
      payload.medical_council_registration = "";
    }
    if (payload.role !== "administration") {
      payload.administration_type = null;
    }
    if (payload.role !== "staff") {
      payload.staff_department = null;
      payload.staff_job_title = null;
    }

    if (!payload.organization_id) {
      setOrganizationUserCreateError("Please select an organization.");
      return;
    }

    if (
      !payload.name ||
      !payload.username ||
      !payload.email ||
      !payload.phone_number
    ) {
      setOrganizationUserCreateError(
        "Name, username, email, and phone number are required.",
      );
      return;
    }

    try {
      setIsCreatingOrganizationUser(true);
      await createOrganizationUser(payload);
      setOrganizationUserCreateDialogOpen(false);
      resetOrganizationUserCreateForm();
      showToast("Organization user created successfully.");
    } catch (error) {
      const responseData = error.response?.data || {};
      const detail =
        responseData?.detail ||
        responseData?.username?.[0] ||
        responseData?.name?.[0] ||
        responseData?.email?.[0] ||
        responseData?.phone_number?.[0] ||
        responseData?.mobile?.[0] ||
        responseData?.organization_id?.[0] ||
        responseData?.category?.[0] ||
        responseData?.level?.[0] ||
        responseData?.department?.[0] ||
        responseData?.doctor_type?.[0] ||
        responseData?.administration_type?.[0] ||
        responseData?.staff_department?.[0] ||
        responseData?.staff_job_title?.[0] ||
        responseData?.password?.[0] ||
        "Unable to create organization user.";
      setOrganizationUserCreateError(String(detail));
    } finally {
      setIsCreatingOrganizationUser(false);
    }
  };

  const resetSchoolCreateForm = () => {
    setSchoolCreateForm((prev) => ({
      ...prev,
      name: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postal_code: "",
      username: prev.username || localStorage.getItem("username") || "",
      email: prev.email || localStorage.getItem("email") || "",
      phone_number:
        prev.phone_number || localStorage.getItem("phone_number") || "",
    }));
    setSchoolCreateError("");
  };

  const handleSchoolCreateFormChange = (event) => {
    const { name, value } = event.target;
    setSchoolCreateForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSchoolCreateSubmit = async (event) => {
    event.preventDefault();
    setSchoolCreateError("");

    const resolvedOrganizationId =
      selectedOrganizationProfileId || loggedInOrganizationId;

    if (!resolvedOrganizationId) {
      setSchoolCreateError(
        "Organization selection missing. Please pick an organization first.",
      );
      return;
    }

    const deriveUsername = () => {
      const fallback = (schoolCreateForm.name || "").trim();
      if (schoolCreateForm.username?.trim()) return schoolCreateForm.username.trim();
      return fallback
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 30) || "school_admin";
    };

    const companyName = (schoolCreateForm.name || "").trim();
    const username = deriveUsername();
    const phoneNumber = (schoolCreateForm.phone_number || "").trim();
    const password = "abc123";

    if (!companyName) {
      setSchoolCreateError("School name is required.");
      return;
    }
    if (!phoneNumber) {
      setSchoolCreateError("Phone number is required to create the account.");
      return;
    }

    const payload = {
      organization_id: resolvedOrganizationId,
      company_name: companyName,
      admin_name: companyName,
      username,
      email: (schoolCreateForm.email || "").trim(),
      phone_number: phoneNumber,
      password,
     
    };

    try {
      setIsCreatingSchool(true);
      await createCompanyAccount(payload);
      setSchoolCreateDialogOpen(false);
      resetSchoolCreateForm();
      showToast("School company created successfully.");
    } catch (error) {
      const responseData = error.response?.data || {};
      const detail =
        responseData?.detail ||
        responseData?.company_name?.[0] ||
        responseData?.username?.[0] ||
        responseData?.email?.[0] ||
        responseData?.phone_number?.[0] ||
        responseData?.password?.[0] ||
        "Unable to create school company.";
      setSchoolCreateError(String(detail));
    } finally {
      setIsCreatingSchool(false);
    }
  };

  const handleProfileFormChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setProfileError("");
    try {
      setIsSavingProfile(true);
      await updateCompanyUserProfile({
        name: profileForm.name,
        mobile: profileForm.mobile,
        about: profileForm.about,
        address: profileForm.address,
      });
      setProfileData((prev) => ({
        ...prev,
        displayName: profileForm.name || prev.displayName,
      }));
      setProfileDialogOpen(false);
    } catch (error) {
      setProfileError("Unable to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const resetProfileImageCropper = () => {
    if (profileImageCropSourceUrl) {
      URL.revokeObjectURL(profileImageCropSourceUrl);
    }
    setProfileImageCropDialogOpen(false);
    setProfileImageCropSourceUrl("");
    setProfileImageCropFileName("profile-image.jpg");
    setProfileImageCropTarget("profile");
    setProfileImageCropZoom(1);
    setProfileImageCropOffsetX(0);
    setProfileImageCropOffsetY(0);
    setProfileImageCropRotation(0);
    setProfileImageCropBox(getDefaultProfileCropBox());
    setPendingAttachmentFiles([]);
    setCompletedAttachmentUploads(0);
    setProfileImageCropElement(null);
    setProfileImageCropDragging(false);
    setProfileCropBoxDragging(false);
    setProfileCropBoxResizing(false);
    profileImageCropDragStateRef.current = {
      isActive: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      originOffsetX: 0,
      originOffsetY: 0,
    };
    profileImageCropBoxStateRef.current = {
      isActive: false,
      mode: "",
      pointerId: null,
      startX: 0,
      startY: 0,
      originX: 0,
      originY: 0,
      originSize: 0,
    };
  };

  const isProfileCropUploadBusy =
    isUploadingProfileImage ||
    isUploadingCompanyLogo ||
    isUploadingOrganizationAttachments;

  const openProfileImageCropper = (
    file,
    target = "profile",
    attachmentQueue = [],
  ) => {
    if (profileImageCropSourceUrl) {
      URL.revokeObjectURL(profileImageCropSourceUrl);
    }

    setProfileImageCropSourceUrl(URL.createObjectURL(file));
    setProfileImageCropFileName(file.name || "profile-image.jpg");
    setProfileImageCropTarget(target);
    setProfileImageCropZoom(1);
    setProfileImageCropOffsetX(0);
    setProfileImageCropOffsetY(0);
    setProfileImageCropRotation(0);
    setProfileImageCropBox(getDefaultProfileCropBox());
    setPendingAttachmentFiles(attachmentQueue);
    if (target === "attachment" && attachmentQueue.length === 0) {
      setCompletedAttachmentUploads(0);
    }
    setProfileImageCropDialogOpen(true);
  };

  const handleProfileCropPointerDown = (event) => {
    if (isProfileCropUploadBusy || !profileImageCropElement) {
      return;
    }

    if (profileImageCropBoxStateRef.current.isActive) {
      return;
    }

    event.preventDefault();
    const target = event.currentTarget;
    if (target?.setPointerCapture) {
      target.setPointerCapture(event.pointerId);
    }

    profileImageCropDragStateRef.current = {
      isActive: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originOffsetX: profileImageCropOffsetX,
      originOffsetY: profileImageCropOffsetY,
    };
    setProfileImageCropDragging(true);
  };

  const handleProfileCropPointerMove = (event) => {
    const cropBoxState = profileImageCropBoxStateRef.current;
    if (cropBoxState.isActive && cropBoxState.pointerId === event.pointerId) {
      const deltaX = event.clientX - cropBoxState.startX;
      const deltaY = event.clientY - cropBoxState.startY;

      if (cropBoxState.mode === "move") {
        setProfileImageCropBox((prev) => {
          const nextX = clampValue(
            cropBoxState.originX + deltaX,
            0,
            PROFILE_IMAGE_CROP_PREVIEW_SIZE - prev.size,
          );
          const nextY = clampValue(
            cropBoxState.originY + deltaY,
            0,
            PROFILE_IMAGE_CROP_PREVIEW_SIZE - prev.size,
          );
          return {
            ...prev,
            x: nextX,
            y: nextY,
          };
        });
      }

      if (cropBoxState.mode === "resize") {
        setProfileImageCropBox((prev) => {
          const maxSize = Math.min(
            PROFILE_IMAGE_CROP_PREVIEW_SIZE - cropBoxState.originX,
            PROFILE_IMAGE_CROP_PREVIEW_SIZE - cropBoxState.originY,
          );
          const delta = Math.max(deltaX, deltaY);
          const nextSize = clampValue(
            cropBoxState.originSize + delta,
            PROFILE_IMAGE_CROP_MIN_SIZE,
            maxSize,
          );
          return {
            ...prev,
            x: cropBoxState.originX,
            y: cropBoxState.originY,
            size: nextSize,
          };
        });
      }
      return;
    }

    const dragState = profileImageCropDragStateRef.current;
    if (!dragState.isActive || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    setProfileImageCropOffsetX(clampCropOffset(dragState.originOffsetX + deltaX));
    setProfileImageCropOffsetY(clampCropOffset(dragState.originOffsetY + deltaY));
  };

  const handleProfileCropPointerUp = (event) => {
    const cropBoxState = profileImageCropBoxStateRef.current;
    if (cropBoxState.isActive && cropBoxState.pointerId === event.pointerId) {
      const target = event.currentTarget;
      if (target?.releasePointerCapture) {
        target.releasePointerCapture(event.pointerId);
      }

      profileImageCropBoxStateRef.current = {
        isActive: false,
        mode: "",
        pointerId: null,
        startX: 0,
        startY: 0,
        originX: 0,
        originY: 0,
        originSize: 0,
      };
      setProfileCropBoxDragging(false);
      setProfileCropBoxResizing(false);
      return;
    }

    const dragState = profileImageCropDragStateRef.current;
    if (!dragState.isActive || dragState.pointerId !== event.pointerId) {
      return;
    }

    const target = event.currentTarget;
    if (target?.releasePointerCapture) {
      target.releasePointerCapture(event.pointerId);
    }

    profileImageCropDragStateRef.current = {
      isActive: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      originOffsetX: 0,
      originOffsetY: 0,
    };
    setProfileImageCropDragging(false);
  };

  const handleCropBoxMovePointerDown = (event) => {
    if (isProfileCropUploadBusy || !profileImageCropElement) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    if (target?.setPointerCapture) {
      target.setPointerCapture(event.pointerId);
    }

    profileImageCropBoxStateRef.current = {
      isActive: true,
      mode: "move",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: profileImageCropBox.x,
      originY: profileImageCropBox.y,
      originSize: profileImageCropBox.size,
    };
    setProfileCropBoxDragging(true);
  };

  const handleCropBoxResizePointerDown = (event) => {
    if (isProfileCropUploadBusy || !profileImageCropElement) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    if (target?.setPointerCapture) {
      target.setPointerCapture(event.pointerId);
    }

    profileImageCropBoxStateRef.current = {
      isActive: true,
      mode: "resize",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: profileImageCropBox.x,
      originY: profileImageCropBox.y,
      originSize: profileImageCropBox.size,
    };
    setProfileCropBoxResizing(true);
  };

  const handleProfileImageChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (!file.type?.startsWith("image/")) {
      setProfileImageError("Please select an image file.");
      return;
    }

    setProfileImageError("");
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setProfileImageError("Image too large. Max size is 2MB.");
      return;
    }

    openProfileImageCropper(file, "profile");
  };

  const handleProfileImageCropSubmit = async () => {
    if (!profileImageCropElement) {
      setProfileImageError("Unable to crop image.");
      return;
    }

    try {
      if (profileImageCropTarget === "profile") {
        setIsUploadingProfileImage(true);
      } else if (profileImageCropTarget === "company_logo") {
        setIsUploadingCompanyLogo(true);
      } else if (profileImageCropTarget === "attachment") {
        setIsUploadingOrganizationAttachments(true);
      }

      const exportCanvas = document.createElement("canvas");
      drawProfileCropExportCanvas({
        canvas: exportCanvas,
        image: profileImageCropElement,
        zoom: profileImageCropZoom,
        offsetX: profileImageCropOffsetX,
        offsetY: profileImageCropOffsetY,
        rotation: profileImageCropRotation,
        cropBox: profileImageCropBox,
      });

      const blob = await new Promise((resolve) => {
        exportCanvas.toBlob(resolve, "image/jpeg", 0.92);
      });

      if (!blob) {
        throw new Error("Cropped image generation failed");
      }

      const maxSizeBytes = 2 * 1024 * 1024;
      if (blob.size > maxSizeBytes) {
        const message =
          "Cropped image is too large. Reduce zoom or use a smaller source image.";
        if (profileImageCropTarget === "company_logo") {
          setCompanyLogoError(message);
        } else if (profileImageCropTarget === "attachment") {
          setOrganizationAttachmentError(message);
        } else {
          setProfileImageError(message);
        }
        return;
      }

      const normalizedFileName = profileImageCropFileName
        .replace(/\.[^.]+$/, "")
        .concat(".jpg");
      const croppedFile = new File([blob], normalizedFileName, {
        type: "image/jpeg",
      });
      const previewUrl = URL.createObjectURL(croppedFile);

      if (profileImageCropTarget === "profile") {
        const companyId = localStorage.getItem("company_id");
        const uploadResponse = await uploadImageFromAnyWhere(
          croppedFile,
          profileData.username || localStorage.getItem("username"),
          companyId,
        );
        const attachmentId =
          uploadResponse?.response?.file?.id ||
          uploadResponse?.response?.file?.attachment_id;
        if (!attachmentId) {
          throw new Error("Attachment ID missing");
        }
        await changeUserImage(attachmentId);
        setProfileData((prev) => ({
          ...prev,
          avatarUrl: previewUrl,
        }));
        resetProfileImageCropper();
        showToast("Profile image updated.");
        return;
      }

      if (profileImageCropTarget === "company_logo") {
        setCompanyLogoPreview(previewUrl);
        const uploadResponse = await uploadImageFromAnyWhere(
          croppedFile,
          profileData.username || localStorage.getItem("username"),
          companyId,
        );
        const attachmentId =
          uploadResponse?.response?.file?.id ||
          uploadResponse?.response?.file?.attachment_id;
        if (!attachmentId) {
          throw new Error("Attachment ID missing");
        }
        await updateCompanyInfo({
          id: companyInfoForm.id,
          organization_id: companyInfoForm.organization_id || companyId,
          organization_logo_id: attachmentId,
        });
        setCompanyInfoForm((prev) => ({
          ...prev,
          organization_logo_id: attachmentId,
        }));
        setCompanyLogoUrl(previewUrl);
        localStorage.removeItem("pending_company_logo_id");
        resetProfileImageCropper();
        showToast("Organization logo updated.");
        return;
      }

      if (profileImageCropTarget === "attachment") {
        const uploadResponse = await uploadImageFromAnyWhere(
          croppedFile,
          profileData.username || localStorage.getItem("username"),
          companyId,
        );
        const attachmentId =
          uploadResponse?.response?.file?.id ||
          uploadResponse?.response?.file?.attachment_id;
        if (!attachmentId) {
          throw new Error("Attachment ID missing");
        }

        const newAttachment = {
          id: attachmentId,
          attachment_id: attachmentId,
          url: previewUrl,
          type: croppedFile.type || "image/*",
          base_64_image: "",
          is_image: true,
          is_logo: false,
          is_background: false,
        };

        const nextAttachments = [
          ...organizationAttachments,
          newAttachment,
        ];
        const nextAttachmentIds = Array.from(
          new Set(
            nextAttachments.map((attachment) =>
              Number(attachment.id || attachment.attachment_id),
            ),
          ),
        );
        const nextBackgroundAttachmentId =
          companyInfoForm.background_attachment_id || Number(attachmentId);

        setOrganizationAttachments((prev) => {
          const nextMap = new Map(
            prev.map((attachment) => [
              Number(attachment.id || attachment.attachment_id),
              attachment,
            ]),
          );
          nextMap.set(Number(newAttachment.id), newAttachment);
          return Array.from(nextMap.values());
        });
        setCompanyInfoForm((prev) => ({
          ...prev,
          attachment_ids: nextAttachmentIds,
          background_attachment_id: nextBackgroundAttachmentId,
        }));
        await persistOrganizationAttachments(
          nextAttachmentIds,
          nextBackgroundAttachmentId,
        );

        const remainingQueue = pendingAttachmentFiles;
        if (remainingQueue.length > 0) {
          const [nextFile, ...restQueue] = remainingQueue;
          setCompletedAttachmentUploads((prev) => prev + 1);
          openProfileImageCropper(nextFile, "attachment", restQueue);
          return;
        }

        const uploadedCount = completedAttachmentUploads + 1;
        resetProfileImageCropper();
        showToast(
          uploadedCount === 1 ? "Attachment uploaded." : "Attachments uploaded.",
        );
      }
    } catch (error) {
      if (profileImageCropTarget === "company_logo") {
        setCompanyLogoError("Unable to upload organization logo.");
      } else if (profileImageCropTarget === "attachment") {
        setOrganizationAttachmentError(
          error?.userFriendlyMessage ||
            (error?.response?.status === 413
              ? "Upload failed: the selected file is too large for the server limit."
              : "Unable to upload attachments."),
        );
      } else {
        setProfileImageError("Unable to upload profile image.");
      }
    } finally {
      setIsUploadingProfileImage(false);
      setIsUploadingCompanyLogo(false);
      setIsUploadingOrganizationAttachments(false);
    }
  };

  const handleCompanyLogoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!file.type?.startsWith("image/")) {
      setCompanyLogoError("Please select an image file.");
      return;
    }
    setCompanyLogoError("");
    if (!companyInfoForm.id) {
      setCompanyLogoError("Company profile is missing.");
      return;
    }
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setCompanyLogoError("Logo is too large. Max size is 2MB.");
      return;
    }
    openProfileImageCropper(file, "company_logo");
  };

  const persistOrganizationAttachments = async (
    attachmentIds,
    backgroundAttachmentId,
  ) => {
    if (!companyInfoForm.id) {
      return;
    }

    await updateCompanyInfo({
      id: companyInfoForm.id,
      organization_id: companyInfoForm.organization_id || companyId,
      attachment_ids: attachmentIds,
      background_attachment_id: backgroundAttachmentId,
    });
  };

  const handleOrganizationAttachmentsChange = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) {
      return;
    }

    setOrganizationAttachmentError("");
    if (!companyInfoForm.id) {
      setOrganizationAttachmentError("Company profile is missing.");
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    const oversizedFile = files.find((file) => file.size > maxSizeBytes);
    if (oversizedFile) {
      setOrganizationAttachmentError(
        `${oversizedFile.name} is too large. Max size is 5MB.`,
      );
      return;
    }
    const [firstFile, ...restFiles] = files;
    setCompletedAttachmentUploads(0);
    openProfileImageCropper(firstFile, "attachment", restFiles);
  };

  const handleBackgroundAttachmentSelect = async (attachmentId) => {
    const nextAttachmentIds = Array.from(
      new Set([
        ...(Array.isArray(companyInfoForm.attachment_ids)
          ? companyInfoForm.attachment_ids
          : []),
        Number(attachmentId),
      ]),
    );
    setCompanyInfoForm((prev) => ({
      ...prev,
      background_attachment_id: Number(attachmentId),
      attachment_ids: nextAttachmentIds,
    }));
    setOrganizationAttachments((prev) =>
      prev.map((attachment) => ({
        ...attachment,
        is_background:
          Number(attachment.id || attachment.attachment_id) ===
          Number(attachmentId),
      })),
    );
    try {
      await persistOrganizationAttachments(nextAttachmentIds, Number(attachmentId));
    } catch (error) {
      console.error("Unable to save background attachment:", error);
      setOrganizationAttachmentError("Unable to save background selection.");
    }
  };

  const handleClearBackgroundAttachment = async () => {
    setCompanyInfoForm((prev) => ({
      ...prev,
      background_attachment_id: null,
    }));
    setOrganizationAttachments((prev) =>
      prev.map((attachment) => ({
        ...attachment,
        is_background: false,
      })),
    );
    try {
      await persistOrganizationAttachments(
        Array.isArray(companyInfoForm.attachment_ids)
          ? companyInfoForm.attachment_ids
          : [],
        null,
      );
    } catch (error) {
      console.error("Unable to clear background attachment:", error);
      setOrganizationAttachmentError("Unable to remove background.");
    }
  };

  const scrollOrganizationAttachments = (direction = 1) => {
    const container = attachmentScrollerRef.current;
    if (!container) {
      return;
    }
    const distance = Math.max(container.clientWidth * 0.72, 280);
    container.scrollBy({
      left: direction * distance,
      behavior: "smooth",
    });
  };

  const handleOrganizationAttachmentsWheel = (event) => {
    const container = attachmentScrollerRef.current;
    if (!container) {
      return;
    }

    if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) {
      return;
    }

    event.preventDefault();
    container.scrollLeft += event.deltaY;
  };

  const handleOrganizationAttachmentsDragStart = (event) => {
    const container = attachmentScrollerRef.current;
    if (!container) {
      return;
    }

    attachmentDragStateRef.current = {
      isDragging: true,
      startX: event.pageX - container.offsetLeft,
      scrollLeft: container.scrollLeft,
    };
  };

  const handleOrganizationAttachmentsDragMove = (event) => {
    const container = attachmentScrollerRef.current;
    const dragState = attachmentDragStateRef.current;
    if (!container || !dragState.isDragging) {
      return;
    }

    event.preventDefault();
    const x = event.pageX - container.offsetLeft;
    const walk = (x - dragState.startX) * 1.2;
    container.scrollLeft = dragState.scrollLeft - walk;
  };

  const handleOrganizationAttachmentsDragEnd = () => {
    attachmentDragStateRef.current = {
      isDragging: false,
      startX: 0,
      scrollLeft: 0,
    };
  };

  const handleRemoveOrganizationAttachment = async (attachmentId) => {
    const nextAttachmentIds = (companyInfoForm.attachment_ids || []).filter(
      (id) => Number(id) !== Number(attachmentId),
    );
    const nextBackgroundAttachmentId =
      Number(companyInfoForm.background_attachment_id) === Number(attachmentId)
        ? null
        : companyInfoForm.background_attachment_id;
    setOrganizationAttachments((prev) =>
      prev.filter(
        (attachment) =>
          Number(attachment.id || attachment.attachment_id) !==
          Number(attachmentId),
      ),
    );
    setCompanyInfoForm((prev) => {
      return {
        ...prev,
        attachment_ids: nextAttachmentIds,
        background_attachment_id: nextBackgroundAttachmentId,
      };
    });
    try {
      await persistOrganizationAttachments(
        nextAttachmentIds,
        nextBackgroundAttachmentId,
      );
    } catch (error) {
      console.error("Unable to remove organization attachment:", error);
      setOrganizationAttachmentError("Unable to remove attachment.");
    }
  };

  const getOwnerEmail = (owner) => {
    const email = String(owner?.email || "").trim();
    return email.includes("@") ? email.toLowerCase() : "";
  };

  const checkOwnersAccountStatus = async (ownerList) => {
    if (!ownerList.length) {
      setOwnerAccountStatus({});
      return;
    }

    try {
      const entries = await Promise.all(
        ownerList.map(async (owner) => {
          const email = getOwnerEmail(owner);
          if (!email) {
            return [owner.id, false];
          }
          const response = await checkEmailAlreadyExist(email);
          const warning =
            response?.warning || response?.response?.warning || "";
          return [owner.id, warning === "Email Already Exists"];
        }),
      );

      setOwnerAccountStatus((prev) => {
        const next = { ...prev };
        entries.forEach(([id, exists]) => {
          if (id != null) {
            next[id] = exists;
          }
        });
        return next;
      });
    } catch (error) {
      console.error("Failed to check owner accounts:", error);
    }
  };

  const resetStatutoryForm = () => {
    setStatutoryForm({
      desc: "",
      registration_no: "",
      renewed_type: "none",
      since: "",
      renewal_date: "",
      note: "",
      customValues: {},
    });
    setStatutoryError("");
  };

  const handleStatutoryFormChange = (event) => {
    const { name, value } = event.target;
    setStatutoryForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStatutoryFieldChange = (statutoryId, field, value) => {
    setEditedStatutoryRegisters((prev) =>
      prev.map((item) =>
        item.id === statutoryId ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleStatutoryCustomValueChange = (statutoryId, fieldId, value) => {
    setEditedStatutoryRegisters((prev) =>
      prev.map((item) => {
        if (item.id !== statutoryId) {
          return item;
        }
        return {
          ...item,
          custom_values: {
            ...(item.custom_values || {}),
            [fieldId]: value,
          },
        };
      }),
    );
  };

  const handleStatutoryEdit = (statutoryId) => {
    setEditingStatutoryId(statutoryId);
  };

  const handleStatutoryCancel = (statutoryId) => {
    const originalItem = statutoryRegisters.find(
      (item) => item.id === statutoryId,
    );
    if (originalItem) {
      setEditedStatutoryRegisters((prev) =>
        prev.map((item) =>
          item.id === statutoryId ? { ...originalItem } : item,
        ),
      );
    }
    setEditingStatutoryId(null);
    setStatutoryError("");
  };

  const handleStatutorySave = async (statutoryId) => {
    const itemToSave = editedStatutoryRegisters.find(
      (item) => item.id === statutoryId,
    );
    if (!itemToSave) {
      return;
    }

    try {
      setIsSavingStatutory(true);
      await updateStatutoryRegister({
        id: itemToSave.id,
        company_id: companyId,
        desc: itemToSave.desc,
        registration_no: itemToSave.registration_no,
        renewed_type: itemToSave.renewed_type,
        since: itemToSave.since ? String(itemToSave.since).slice(0, 10) : "",
        renewal_date: itemToSave.renewal_date
          ? String(itemToSave.renewal_date).slice(0, 10)
          : "",
        note: itemToSave.note,
        custom_values: statutoryCustomFields.map((field) => ({
          custom_field_id: field.id,
          value: itemToSave.custom_values?.[field.id] || "",
        })),
      });
      const refreshed = await getCompanyInfo(companyId);
      const refreshedList = refreshed?.response?.statutory_registers || [];
      const refreshedFields =
        refreshed?.response?.statutory_custom_fields || [];
      const refreshedValues =
        refreshed?.response?.statutory_custom_values || [];
      const refreshedRows = buildStatutoryRows(refreshedList, refreshedValues);
      setStatutoryCustomFields(refreshedFields);
      setStatutoryRegisters(refreshedRows);
      setEditedStatutoryRegisters(refreshedRows);
      setEditingStatutoryId(null);
      setStatutoryError("");
    } catch (error) {
      setStatutoryError("Unable to update statutory register.");
    } finally {
      setIsSavingStatutory(false);
    }
  };

  const handleCreateUserForOwner = (owner) => {
    const email = getOwnerEmail(owner);
    setMemberOwnerId(owner.id);
    setMemberForm((prev) => ({
      ...prev,
      name: owner.Name || "",
      email: email || "",
    }));
    setMemberError("");
    setAddMemberDialogOpen(true);
  };

  const handleMemberSubmit = async (event) => {
    event.preventDefault();
    setMemberError("");

    const trimmedName = memberForm.name.trim();
    const trimmedEmail = memberForm.email.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail) {
      setMemberError("Name and email are required.");
      return;
    }

    const resolvedCompanyId = companyId || companyInfoForm.organization_id;
    if (!resolvedCompanyId) {
      setMemberError("Company profile is missing.");
      return;
    }

    const inviteUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/login`
        : "/login";

    try {
      setIsSavingMember(true);
      await sendTeamInvitation({
        name: trimmedName,
        email: trimmedEmail,
        company_id: resolvedCompanyId,
        access_permission: "assistant",
        role: memberForm.role,
        is_googleuser: false,
        inv_url: inviteUrl,
        admin_name:
          profileData.displayName || companyInfoForm.admin_name || "Admin",
        team_name: companyInfoForm.organization_name || "our team",
        number: memberForm.number?.trim() || "",
      });
      showToast("Invitation sent.");
      setAddMemberDialogOpen(false);
      if (memberOwnerId != null) {
        setOwnerAccountStatus((prev) => ({
          ...prev,
          [memberOwnerId]: true,
        }));
      }
      resetMemberForm();
    } catch (error) {
      setMemberError("Unable to send invitation.");
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleStatutorySubmit = async (event) => {
    event.preventDefault();
    setStatutoryError("");

    try {
      setIsSavingStatutory(true);
      await addStatutoryRegister({
        ...statutoryForm,
        company_id: companyId,
        custom_values: statutoryCustomFields.map((field) => ({
          custom_field_id: field.id,
          value: statutoryForm.customValues?.[field.id] || "",
        })),
      });
      const refreshed = await getCompanyInfo(companyId);
      const refreshedList = refreshed?.response?.statutory_registers || [];
      const refreshedFields =
        refreshed?.response?.statutory_custom_fields || [];
      const refreshedValues =
        refreshed?.response?.statutory_custom_values || [];
      const refreshedRows = buildStatutoryRows(refreshedList, refreshedValues);
      setStatutoryCustomFields(refreshedFields);
      setStatutoryRegisters(refreshedRows);
      setEditedStatutoryRegisters(refreshedRows);
      setStatutoryDialogOpen(false);
      resetStatutoryForm();
    } catch (error) {
      setStatutoryError("Unable to add statutory register.");
    } finally {
      setIsSavingStatutory(false);
    }
  };

  const handleCustomFieldSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = customFieldName.trim();
    if (!trimmedName) {
      setCustomFieldError("Field name is required.");
      return;
    }

    try {
      setCustomFieldError("");
      const response = await addStatutoryCustomField({
        name: trimmedName,
        field_type: customFieldType,
        company_id: companyId,
      });
      const newFieldId = response?.response;
      const refreshed = await getStatutoryCustomFields();
      const fields = refreshed?.response || [];
      setStatutoryCustomFields(fields);
      setCustomFieldEdits(
        fields.reduce((acc, field) => {
          acc[field.id] = {
            name: field.name || "",
            field_type: field.field_type || "text",
          };
          return acc;
        }, {}),
      );
      setStatutoryForm((prev) => ({
        ...prev,
        customValues: {
          ...prev.customValues,
          ...(newFieldId ? { [newFieldId]: "" } : {}),
        },
      }));
      setCustomFieldName("");
      setCustomFieldType("text");
      setCustomFieldDialogOpen(false);
    } catch (error) {
      setCustomFieldError("Unable to add custom field.");
    }
  };

  const handleCustomFieldUpdate = async (fieldId, name, fieldType) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setCustomFieldError("Field name is required.");
      return;
    }

    try {
      await updateStatutoryCustomField({
        id: fieldId,
        company_id: companyId,
        name: trimmedName,
        field_type: fieldType,
      });
      const refreshed = await getStatutoryCustomFields();
      const fields = refreshed?.response || [];
      setStatutoryCustomFields(fields);
      setCustomFieldEdits(
        fields.reduce((acc, field) => {
          acc[field.id] = {
            name: field.name || "",
            field_type: field.field_type || "text",
          };
          return acc;
        }, {}),
      );
      setCustomFieldError("");
    } catch (error) {
      setCustomFieldError("Unable to update custom field.");
    }
  };

  const handleCustomFieldEditChange = (fieldId, key, value) => {
    setCustomFieldEdits((prev) => ({
      ...prev,
      [fieldId]: {
        ...(prev[fieldId] || {}),
        [key]: value,
      },
    }));
  };

  const handleCustomFieldDelete = async (fieldId) => {
    try {
      await deleteStatutoryCustomField({
        id: fieldId,
        company_id: companyId,
      });
      const refreshed = await getStatutoryCustomFields();
      const fields = refreshed?.response || [];
      setStatutoryCustomFields(fields);
    } catch (error) {
      setCustomFieldError("Unable to delete custom field.");
    }
  };

  const handleOwnerFieldChange = (ownerId, field, value) => {
    setEditedOwners((prev) =>
      prev.map((owner) =>
        owner.id === ownerId ? { ...owner, [field]: value } : owner,
      ),
    );
  };

  const handleOwnerEdit = (ownerId) => {
    setEditingOwnerId(ownerId);
  };

  const handleOwnerCancel = (ownerId) => {
    const originalOwner = owners.find((owner) => owner.id === ownerId);
    if (originalOwner) {
      setEditedOwners((prev) =>
        prev.map((owner) =>
          owner.id === ownerId ? { ...originalOwner } : owner,
        ),
      );
    }
    setEditingOwnerId(null);
    setOwnerError("");
  };

  const handleOwnerSave = async (ownerId) => {
    const ownerToSave = editedOwners.find((owner) => owner.id === ownerId);
    if (!ownerToSave) {
      return;
    }

    if (!ownerToSave.Name || !ownerToSave.Name.trim()) {
      setOwnerError("Owner name is required.");
      return;
    }

    try {
      setIsSavingOwner(true);
      await updateOwner({
        id: ownerToSave.id,
        company_id: companyId,
        Name: ownerToSave.Name,
        Designation: ownerToSave.Designation,
        otherid: ownerToSave.otherid,
        email: ownerToSave.email,
        note: ownerToSave.note,
        Pan: ownerToSave.Pan,
        primary_admin: ownerToSave.primary_admin,
      });
      const ownersResponse = await getOwners();
      const ownerList = ownersResponse?.response || [];
      setOwners(ownerList);
      setEditedOwners(ownerList);
      checkOwnersAccountStatus(ownerList);
      setEditingOwnerId(null);
      setOwnerError("");
    } catch (error) {
      setOwnerError("Unable to update owner.");
    } finally {
      setIsSavingOwner(false);
    }
  };

  const handleOwnerFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setOwnerForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleOwnerSubmit = async (event) => {
    event.preventDefault();
    setOwnerError("");

    if (!ownerForm.Name.trim()) {
      setOwnerError("Owner name is required.");
      return;
    }

    try {
      setIsSavingOwner(true);
      await addOwner({
        ...ownerForm,
        company_id: companyId,
      });
      const ownersResponse = await getOwners();
      const ownerList = ownersResponse?.response || [];
      setOwners(ownerList);
      setEditedOwners(ownerList);
      setOwnerDialogOpen(false);
      resetOwnerForm();
    } catch (error) {
      setOwnerError("Unable to add owner.");
    } finally {
      setIsSavingOwner(false);
    }
  };

  const renderRequiredLabel = (label) => (
    <>
      {label}
      <span className="text-red-500"> *</span>
    </>
  );

  const toggleSection = (section) => {
    setActiveSection((prev) => {
      if (prev === section) {
        return "hospital";
      }
      return section;
    });
  };

  const handleCompanyInfoSubmit = async (event) => {
    event.preventDefault();
    setCompanyInfoError("");

    const missingFields = getMissingCompanyInfoFields(companyInfoForm);
    if (missingFields.length > 0) {
      setCompanyInfoError("Please complete all required fields.");
      setActiveSection("hospital");
      return;
    }

    if (!companyInfoForm.id) {
      setCompanyInfoError("Missing company profile ID.");
      return;
    }

    try {
      setIsSavingCompanyInfo(true);
      await updateCompanyInfo({ ...companyInfoForm });
      const companyInfoResponse = await getCompanyInfo(companyId);
      const normalizedCompanyInfo = applyCompanyInfoResponse(
        companyInfoResponse,
        companyId,
        companyInfoForm.organization_name,
      );
      setCompanyLogoPreview("");
      const remainingMissing = getMissingCompanyInfoFields(
        normalizedCompanyInfo || companyInfoForm,
      );
      if (remainingMissing.length === 0) {
        setCompanyDialogLocked(false);
        setCompanyDialogOpen(false);
      } else {
        setCompanyInfoError("Please complete all required fields.");
      }
    } catch (error) {
      setCompanyInfoError("Unable to update company profile.");
    } finally {
      setIsSavingCompanyInfo(false);
    }
  };

  const handleCompanyDialogChange = (nextOpen) => {
    if (!nextOpen && isCompanyDialogLocked) {
      return;
    }
    setCompanyDialogOpen(nextOpen);
  };

  const handleSchoolManagementClick = () => {
    window.location.replace("/category/vidya");
  };

  const handleHospitalManagementClick = () => {
    window.location.replace("/category/swasthya");
    // const username = localStorage.getItem("username");
    // const isSuperuser = localStorage.getItem("is_superuser") === "true";

    // if (!username) {
    //   showToast("Session expired. Please log in again.");
    //   router.push("/login");
    //   return;
    // }

    // try {
    //   const userDetails = await get_Hospital_User_Login_Details(username);
    //   console.log("userDetails=====>>>>>>>", userDetails);

    //   const userRoles = userDetails?.user?.roles || [];
    //   const isAdministrationRole = userRoles.includes("administration");
    //   const isAdminRole =
    //     userDetails?.user?.is_admin === true ||
    //     userDetails?.user?.is_owner === true ||
    //     (Array.isArray(userDetails?.companies) &&
    //       userDetails.companies.some(
    //         (company) =>
    //           company?.is_admin === true || company?.is_owner === true,
    //       ));

    //   const accessState = resolveAccessStatus({
    //     isSuperuser,
    //     meta: companyMeta,
    //   });
    //   if (!isSuperuser && accessState.status === "expired") {
    //     maybeOpenExpiryDialog({ ...accessState, mode: "expired" });
    //     return;
    //   }

    //   if (
    //     !isSuperuser &&
    //     accessState.status === "blocked" &&
    //     !isAdministrationRole
    //   ) {
    //     setApprovalDialogOpen(true);
    //     return;
    //   }

    //   if (isSuperuser) {
    //     window.location.replace("/hospital-management/admin_dashboard");
    //   } else if (isAdminRole) {
    //     window.location.replace("/hospital-management/admin_dashboard");
    //   } else if (userRoles.includes("administration")) {
    //     window.location.replace(
    //       "/hospital-management/administration_dashboard",
    //     );
    //   } else if (userRoles.includes("doctor")) {
    //     window.location.replace("/hospital-management/doctor_dashboard");
    //   } else {
    //     console.warn("⚠️ Unknown roles:", userRoles);
    //     window.location.replace("/");
    //   }
    // } catch (error) {
    //   console.error("Failed to load user details:", error);
    //   showToast("Unable to load your account details.");
    //   window.location.replace("/");
    // }
  };

  const selectedBackgroundAttachment = organizationAttachments.find(
    (attachment) =>
      Number(attachment.id || attachment.attachment_id) ===
      Number(companyInfoForm.background_attachment_id),
  );
  const categoryBackgroundImageUrl = resolveAttachmentPreviewUrl(
    selectedBackgroundAttachment,
    companyInfoForm.organization_name,
  );
  const categoryPageBackgroundStyle = categoryBackgroundImageUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(173, 216, 255, 0.26), rgba(232, 244, 255, 0.18), rgba(165, 214, 255, 0.28)), linear-gradient(135deg, rgba(8, 47, 73, 0.12), rgba(14, 116, 144, 0.08), rgba(37, 99, 235, 0.1)), url(${categoryBackgroundImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }
    : undefined;

  const handleRestrictedNavigation = (action) => {
    const isSuperuser = localStorage.getItem("is_superuser") === "true";
    const accessState = resolveAccessStatus({
      isSuperuser,
      meta: companyMeta,
    });
    if (!isSuperuser && accessState.status === "expired") {
      maybeOpenExpiryDialog({ ...accessState, mode: "expired" });
      return;
    }
    if (!isSuperuser && accessState.status === "blocked") {
      setApprovalDialogOpen(true);
      return;
    }
    action();
  };

  const summaryCardsByKey = categoryDashboardList.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});
  const graphCards = categoryDashboardGraph.map((item, index) => ({
    ...item,
    tint: categorySignalTints[index % categorySignalTints.length],
    text: "text-slate-900",
  }));
  const schoolsValue = categoryDashboardSummary.schools ?? summaryCardsByKey.schools ?? 0;
  const teachersValue = categoryDashboardSummary.teachers ?? summaryCardsByKey.teachers ?? 0;
  const studentsValue = categoryDashboardSummary.students ?? summaryCardsByKey.students ?? 0;
  const headmastersValue =
    categoryDashboardSummary.headmasters ?? summaryCardsByKey.headmasters ?? 0;
  const doctorsValue = categoryDashboardSummary.doctors ?? summaryCardsByKey.doctors ?? 0;
  const administrationValue =
    categoryDashboardSummary.administration ?? summaryCardsByKey.administration ?? 0;
  const staffValue = categoryDashboardSummary.staff ?? summaryCardsByKey.staff ?? 0;
  const ratioValue =
    categoryDashboardSummary.student_teacher_ratio ??
    summaryCardsByKey.student_teacher_ratio;
  const ratioDisplay = ratioValue === null || ratioValue === undefined ? "—" : `${ratioValue}:1`;
  const isSwasthyaWorkspace = selectedWorkspacePanel === "Swasthya";
  const primaryEntityLabel = isSwasthyaWorkspace ? "Hospitals" : "Schools";
  const primaryEntityLabelSingular = isSwasthyaWorkspace ? "Hospital" : "School";
  const capabilityRows = isSwasthyaWorkspace
    ? [
        { label: "Hospitals", value: String(schoolsValue) },
        { label: "Doctors", value: String(doctorsValue) },
        { label: "Administration", value: String(administrationValue) },
        { label: "Staff", value: String(staffValue) },
      ]
    : [
        { label: primaryEntityLabel, value: String(schoolsValue) },
        { label: "Teachers", value: String(teachersValue) },
        { label: "Students", value: String(studentsValue) },
      ];
  const schoolsDisplayValue = categoryDashboardSchools.length || schoolsValue;
  const categorySchoolRows = categoryDashboardSchools.map((school, index) => {
    const baseName = school.company_name || school.name || "—";
    const locationValue = String(school.location || school.district || "").trim();
    const displayName =
      !isSwasthyaWorkspace && locationValue
        ? `${baseName} (${locationValue})`
        : baseName;

    return {
      id:
        school.id ||
        school.company_id ||
        school.school_id ||
        school.username ||
        `school-${index}`,
      serial: index + 1,
      school: displayName,
      category:
        school.school_category ||
        school.sub_category ||
        school.sub_group ||
        school.category ||
        "—",
      location: school.location || "—",
      admin: school.admin_name || "—",
      email: school.email || "—",
      userId: school.username || school.user_id || school.userid || "—",
      address: school.address || "—",
      district: school.district || "—",
      city: school.city || "—",
      state: school.state || school.head_office_state || "—",
      isApproved:
        school.is_approved === true ||
        String(school.approved || "").toLowerCase() === "yes",
    };
  });

  if (isPageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#e1f5ff] via-white to-[#d7f1ff] px-6 py-10">
        <div className="rounded-2xl border border-blue-100 bg-white/90 px-8 py-6 text-center shadow-lg">
          <div
            className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"
            role="status"
            aria-label="Loading"
          />
          <p className="mt-3 text-sm font-semibold text-blue-700">
            Loading workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#e1f5ff] via-white to-[#d7f1ff] px-6 py-10"
      style={categoryPageBackgroundStyle}
    >
      {!categoryBackgroundImageUrl && (
        <svg
          className="pointer-events-none absolute bottom-0 left-1/2 w-[200%] -translate-x-1/2 text-[#c7e7ff] wave-motion-delayed"
          viewBox="0 0 1440 320"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M0,288L48,256C96,224,192,160,288,128C384,96,480,96,576,122.7C672,149,768,203,864,218.7C960,235,1056,213,1152,197.3C1248,181,1344,171,1392,165.3L1440,160L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
          />
        </svg>
      )}

      <div className="absolute -top-20 -left-10 h-56 w-56 rounded-full bg-blue-200/40 blur-3xl" />
      <div className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-teal-200/40 blur-3xl" />
      <div className="relative mx-auto flex w-full max-w-[1720px] flex-col gap-10 px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
        <header className="flex flex-wrap items-center justify-end gap-6">
          <div className="flex flex-wrap items-center justify-end gap-4">
            {/* <div className="flex items-center gap-3 rounded-full border border-white/80 bg-white/70 px-5 py-2 text-sm font-medium text-blue-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              All systems ready
            </div> */}
            {/* <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-4 rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-left text-sm text-gray-700 shadow-sm backdrop-blur transition hover:border-blue-200"
              >
                <div className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-blue-200">
                  {profileData.avatarUrl ? (
                    <img
                      src={profileData.avatarUrl}
                      alt={`${profileData.displayName} avatar`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-blue-100 text-sm font-semibold text-blue-700">
                      {(profileData.displayName || "A")
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600/80">
                    {profileData.companyname || "Organisation Profile Name"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {profileData.displayName || "Admin"}
                    </p>
                    {profileData.roleLabel ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                        {profileData.roleLabel}
                        {profileData.level ? (
                          <span className="ml-1 text-[9px] font-semibold text-blue-800/70">
                            {profileData.level}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                    {profileData.userTypeLabel ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        {profileData.userTypeLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 z-50 mt-3 w-64 rounded-2xl border border-blue-100 bg-white p-3 text-sm text-gray-700 shadow-xl">
                  {profileData.isAdminOwner && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminMenuOpen((prev) => !prev);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-semibold text-gray-700 transition hover:bg-blue-50"
                      >
                        Admin control
                        <span className="text-xs text-blue-600">
                          {isAdminMenuOpen ? "Hide" : "Show"}
                        </span>
                      </button>
                      {isAdminMenuOpen && (
                        <div className="mt-2 space-y-1 rounded-xl border border-blue-50 bg-blue-50/40 p-2">
                          <button
                            type="button"
                            onClick={() => {
                              resetMemberForm();
                              setAddMemberDialogOpen(true);
                              setAdminMenuOpen(false);
                              setProfileMenuOpen(false);
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-gray-700 transition hover:bg-white"
                          >
                            Add member
                          </button>
                          <button
                            type="button"
                            onClick={() => showToast("Delist user coming soon")}
                            className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-gray-700 transition hover:bg-white"
                          >
                            Delist user
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              showToast("Reactivate user coming soon")
                            }
                            className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-gray-700 transition hover:bg-white"
                          >
                            Reactivate user
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {isOrganizationMember && !profileData.isCompanyUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        router.push("/organization-admin");
                      }}
                      className="mt-2 w-full rounded-xl px-3 py-2 text-left font-semibold text-gray-700 transition hover:bg-blue-50"
                    >
                      Organization Admin control
                    </button>
                  )}

                  {profileData.isAdminOwner && profileData.isCompanyUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        router.push("/company-admin");
                      }}
                      className="mt-2 w-full rounded-xl px-3 py-2 text-left font-semibold text-gray-700 transition hover:bg-blue-50"
                    >
                      Company Admin control
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDialogOpen(true);
                      setProfileMenuOpen(false);
                    }}
                    className="mt-2 w-full rounded-xl px-3 py-2 text-left font-semibold text-gray-700 transition hover:bg-blue-50"
                  >
                    User Profile
                  </button>

                  {(isOrganizationMember || isSuperuserSession) &&
                    !profileData.isCompanyUser && (
                    <button
                      type="button"
                      onClick={handleOpenOrganizationInformation}
                      className="mt-2 w-full rounded-xl px-3 py-2 text-left font-semibold text-gray-700 transition hover:bg-blue-50"
                    >
                      Organization information
                    </button>
                  )}


                  <div className="my-2 h-px bg-blue-100" />

                  <button
                    type="button"
                    onClick={() => {
                      clearLoginSession();
                      setProfileMenuOpen(false);
                      router.push("/");
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div> */}
          </div>
        </header>

        <section className="grid justify-items-center gap-8 md:grid-cols-3">
          {availableModules.map((module) => {
            if (module.adminOnly && !isAdminUser) {
              return null;
            }
            const Icon = module.icon;
            const cardClassName = `group relative flex aspect-square w-full max-w-[195px] items-center justify-center overflow-hidden rounded-full border border-white/80 bg-white/70 p-4 text-center shadow-[0_28px_70px_-40px_rgba(15,23,42,0.22)] backdrop-blur-xl transition duration-300 ${module.enabled ? "hover:-translate-y-1.5 hover:shadow-[0_30px_80px_-36px_rgba(15,23,42,0.28)]" : "opacity-40 grayscale"} ${module.ring}`;
            const cardContent = (
              <>
                <div
                  className={`absolute inset-0 opacity-80 transition duration-500 group-hover:opacity-100 bg-gradient-to-br ${module.tint}`}
                />
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
                  viewBox="0 0 100 100"
                  aria-hidden="true"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="48"
                    fill="none"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="1.2"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="48"
                    fill="none"
                    stroke="rgba(56,189,248,0.96)"
                    strokeWidth="1.8"
                    pathLength="100"
                    strokeLinecap="round"
                    className="workspace-orbit-ring [stroke-dasharray:100] [stroke-dashoffset:100]"
                  />
                </svg>
                <div className="absolute inset-6 rounded-full border border-white/30" />
                <div className="absolute inset-12 rounded-full bg-white/12 blur-2xl" />
                <div className="relative flex flex-col items-center justify-center gap-2.5">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-white/90 shadow-[0_18px_45px_-24px_rgba(59,130,246,0.45)]">
                    <div className={`absolute inset-3 rounded-full bg-gradient-to-br ${module.tint} opacity-90`} />
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-inner">
                      <Icon className="h-4 w-4 text-slate-700" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-[19px] font-semibold tracking-tight text-slate-900">
                      {module.title}
                    </h2>
                  </div>
                </div>
              </>
            );

            if (module.enabled && module.href === "/category/vidya") {
              return (
                <button
                  key={module.title}
                  type="button"
                  className={`${cardClassName} text-left`}
                  onClick={handleSchoolManagementClick}
                >
                  {cardContent}
                </button>
              );
            }

            if (module.enabled && module.href === "/category/swasthya") {
              return (
                <button
                  key={module.title}
                  type="button"
                  className={`${cardClassName} text-left`}
                  onClick={handleHospitalManagementClick}
                >
                  {cardContent}
                </button>
              );
            }

            if (module.enabled && module.href === "/ashram-management") {
              return (
                <button
                  key={module.title}
                  type="button"
                  className={`${cardClassName} text-left`}
                  onClick={() => showToast("Ashram workspace coming soon")}
                >
                  {cardContent}
                </button>
              );
            }

            if (module.enabled && module.href === "/payroll-management") {
              return (
                <button
                  key={module.title}
                  type="button"
                  className={`${cardClassName} text-left`}
                  onClick={() =>
                    handleRestrictedNavigation(() =>
                      window.location.replace("/payroll-management/"),
                    )
                  }
                >
                  {cardContent}
                </button>
              );
            }

            if (module.enabled && module.href === "/accounts-management") {
              return (
                <button
                  key={module.title}
                  type="button"
                  className={`${cardClassName} text-left`}
                  onClick={() =>
                    handleRestrictedNavigation(() =>
                      window.location.replace("/accounts-management/"),
                    )
                  }
                >
                  {cardContent}
                </button>
              );
            }

            if (module.enabled && module.href === "/inventory-managment") {
              return (
                <button
                  key={module.title}
                  type="button"
                  className={`${cardClassName} text-left`}
                  onClick={() =>
                    handleRestrictedNavigation(() =>
                      window.location.replace("/inventory-managment/"),
                    )
                  }
                >
                  {cardContent}
                </button>
              );
            }

            if (module.enabled && module.href === "/asset-management") {
              return (
                <button
                  key={module.title}
                  type="button"
                  className={`${cardClassName} text-left`}
                  onClick={() => showToast("Coming soon")}
                >
                  {cardContent}
                </button>
              );
            }

            if (module.enabled && module.href === "/access-control") {
              return (
                <button
                  key={module.title}
                  type="button"
                  className={`${cardClassName} text-left`}
                  onClick={() =>
                    handleRestrictedNavigation(() =>
                      window.location.replace("/access-control/"),
                    )
                  }
                >
                  {cardContent}
                </button>
              );
            }

            if (module.enabled) {
              return (
                <Link
                  key={module.title}
                  href={module.href}
                  className={cardClassName}
                >
                  {cardContent}
                </Link>
              );
            }

            return (
              <button
                key={module.title}
                type="button"
                className={`${cardClassName} text-left`}
                onClick={() => showToast("Coming soon")}
              >
                {cardContent}
              </button>
            );
          })}
        </section>

        <section className="relative overflow-visible rounded-[36px] border border-white/60 bg-white/28 p-5 shadow-[0_40px_110px_-54px_rgba(15,23,42,0.28)] backdrop-blur-2xl sm:p-7">
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent" />
          <div className="absolute -left-20 bottom-10 h-56 w-56 rounded-full bg-cyan-200/35 blur-3xl" />
          <div className="absolute right-10 top-10 h-40 w-40 rounded-full bg-blue-100/60 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.24),rgba(255,255,255,0.08))]" />

          <div className="relative grid gap-5 xl:grid-cols-[1.05fr_1.45fr]">
            <div className="rounded-[30px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(239,247,255,0.22))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_24px_60px_-36px_rgba(15,23,42,0.22)] backdrop-blur-2xl">
              <p className="text-lg font-medium text-slate-700">{selectedWorkspacePanel} organization summary</p>
              <div className="mt-3 flex items-end gap-2">
                <h2 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                  {schoolsDisplayValue}
                </h2>
                <span className="mb-2 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {primaryEntityLabel}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleOpenOrganizationInformation}
                  className="rounded-2xl border border-white/70 bg-white/55 px-5 py-3 text-sm font-semibold text-slate-700 shadow-[0_14px_32px_-22px_rgba(15,23,42,0.24)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/70"
                >
                  Complete organization profile
                </button>
                <div className="relative" ref={workspaceDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setWorkspaceDropdownOpen((prev) => !prev)}
                    className="rounded-2xl border border-white/70 bg-white/55 px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_14px_32px_-22px_rgba(15,23,42,0.24)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/70"
                    aria-haspopup="menu"
                    aria-expanded={isWorkspaceDropdownOpen}
                    aria-label="Organization summary filter"
                    title="Organization summary filter"
                  >
                    <Filter className="h-4 w-4" />
                  </button>

                  {isWorkspaceDropdownOpen ? (
                    <div className="absolute left-0 top-[calc(100%+12px)] z-30 min-w-[220px] rounded-[24px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(235,244,255,0.86))] p-3 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
                      <div className="space-y-2">
                        {categoryQuickActions.map((action) => {
                          const ActionIcon = action.icon;
                          const isSelected = selectedWorkspacePanel === action.label;

                          return (
                            <button
                              key={action.label}
                              type="button"
                              onClick={() => handleWorkspacePanelSelect(action.label)}
                              className={`flex w-full items-center gap-3 rounded-[20px] border px-4 py-3 text-left shadow-[0_16px_32px_-28px_rgba(15,23,42,0.2)] backdrop-blur transition hover:-translate-y-0.5 ${
                                isSelected
                                  ? "border-sky-200/80 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(255,255,255,0.72))] text-sky-800"
                                  : "border-white/70 bg-white/55 text-slate-700 hover:bg-white/75"
                              }`}
                            >
                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                                  isSelected
                                    ? "bg-white text-sky-700"
                                    : "bg-slate-50/90 text-slate-500"
                                }`}
                              >
                                <ActionIcon className="h-4 w-4" />
                              </div>
                              <div className="flex items-center justify-between gap-3 w-full">
                                <span className="text-sm font-semibold">{action.label}</span>
                                {isSelected ? (
                                  <ChevronDown className="-rotate-90 h-4 w-4 text-sky-600" />
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-10 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[28px] font-medium tracking-tight text-slate-800">
                    Capabilities
                  </p>
                  <p className="mt-1 text-base text-slate-500">
                    Live {selectedWorkspacePanel} organization summary
                  </p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/55 p-3 shadow-[0_12px_28px_-20px_rgba(15,23,42,0.22)] backdrop-blur">
                  <Sparkles className="h-5 w-5 text-slate-500" />
                </div>
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                <div
                  className={`relative mx-auto flex items-center justify-center ${
                    isSwasthyaWorkspace
                      ? "min-h-44 rounded-[30px] border border-white/60 bg-[linear-gradient(160deg,rgba(255,255,255,0.54),rgba(224,242,254,0.4))] p-6 shadow-[0_20px_40px_-24px_rgba(56,189,248,0.35)]"
                      : "h-44 w-44 rounded-full bg-[conic-gradient(from_220deg,_#49d7ff,_#39ef7d,_#f1f45d,_#ffb86b,_#d694ff,_#49d7ff)] p-5 shadow-[0_20px_40px_-24px_rgba(34,211,238,0.8)]"
                  }`}
                >
                  {isSwasthyaWorkspace ? (
                    <div className="w-full space-y-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Hospital management
                        </p>
                        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                          {doctorsValue + administrationValue + staffValue}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Total doctor, administration, and staff records
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/70 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Doctors
                          </p>
                          <p className="mt-2 text-xl font-semibold text-slate-900">
                            {doctorsValue}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/70 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Staff
                          </p>
                          <p className="mt-2 text-xl font-semibold text-slate-900">
                            {staffValue}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Ratio
                      </span>
                      <span className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                        {ratioDisplay}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {capabilityRows.map((item, index) => (
                    <div key={item.label} className="rounded-2xl border border-white/60 bg-white/45 px-4 py-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.18)] backdrop-blur">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-500">{item.label}</span>
                        <span className="text-2xl font-semibold tracking-tight text-slate-900">
                          {item.value}
                        </span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300"
                          style={{ width: `${Math.min(100, 28 + index * 24)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid min-w-0 gap-5">
              <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(31,32,37,0.82),rgba(31,32,37,0.92))] p-6 text-white shadow-[0_34px_70px_-36px_rgba(17,24,39,0.62)] backdrop-blur-xl">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/60">
                      {isSwasthyaWorkspace ? "Doctors" : "Teachers"}
                    </p>
                    <h3 className="mt-1 text-4xl font-semibold tracking-tight">
                      {isSwasthyaWorkspace ? doctorsValue : teachersValue}
                    </h3>
                    <p className="mt-2 text-sm text-emerald-300">
                      {isSwasthyaWorkspace
                        ? "Active hospital management records"
                        : "Active teaching records"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/60">
                      {isSwasthyaWorkspace ? "Staff" : "Students"}
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {isSwasthyaWorkspace ? staffValue : studentsValue}
                    </p>
                    {isSwasthyaWorkspace ? (
                      <div className="mt-3 flex items-center justify-end gap-2 text-emerald-300">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs">
                          {administrationValue} administration records
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center justify-end gap-2 text-emerald-300">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs">{ratioDisplay} student-teacher ratio</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 h-16 rounded-[22px] bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.06))] p-2">
                  <svg viewBox="0 0 320 64" className="h-full w-full" aria-hidden="true">
                    <defs>
                      <linearGradient id="signalLine" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6ee7f9" />
                        <stop offset="50%" stopColor="#9ae6b4" />
                        <stop offset="100%" stopColor="#fcd34d" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M4 42 C28 14, 54 18, 78 34 S132 54, 158 29 S212 8, 236 28 S286 49, 316 17"
                      fill="none"
                      stroke="url(#signalLine)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {[
                      [44, 24],
                      [99, 38],
                      [170, 24],
                      [238, 28],
                      [306, 17],
                    ].map(([cx, cy], index) => (
                      <circle
                        key={`${cx}-${cy}-${index}`}
                        cx={cx}
                        cy={cy}
                        r="2.8"
                        fill="#f8fafc"
                        opacity="0.95"
                      />
                    ))}
                  </svg>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {(graphCards.length ? graphCards : [
                    ...(isSwasthyaWorkspace
                      ? [
                          { label: "Hospitals", value: schoolsValue, tint: categorySignalTints[0], text: "text-slate-900" },
                          { label: "Doctors", value: doctorsValue, tint: categorySignalTints[1], text: "text-slate-900" },
                          { label: "Administration", value: administrationValue, tint: categorySignalTints[2], text: "text-slate-900" },
                          { label: "Staff", value: staffValue, tint: categorySignalTints[3], text: "text-slate-900" },
                        ]
                      : [
                          { label: primaryEntityLabel, value: schoolsValue, tint: categorySignalTints[0], text: "text-slate-900" },
                          { label: "Teachers", value: teachersValue, tint: categorySignalTints[1], text: "text-slate-900" },
                          { label: "Students", value: studentsValue, tint: categorySignalTints[2], text: "text-slate-900" },
                          { label: "Headmasters", value: headmastersValue, tint: categorySignalTints[3], text: "text-slate-900" },
                        ]),
                  ]).map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[20px] bg-[#2a2b31] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.tint} ${item.text}`}>
                        <Wallet className="h-5 w-5" />
                      </div>
                      <p className="mt-3 text-sm text-white/65">{item.label}</p>
                      <p className="mt-1 text-lg font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-w-0 rounded-[30px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(245,249,255,0.24))] p-6 shadow-[0_28px_70px_-44px_rgba(15,23,42,0.22)] backdrop-blur-2xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h3 className="text-2xl font-medium tracking-tight text-slate-800">
                    {primaryEntityLabelSingular} List
                  </h3>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/55 px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)] backdrop-blur">
                    <CalendarDays className="h-4 w-4" />
                    <span>{selectedWorkspacePanel} default view</span>
                  </div>
                </div>

                <div className="mt-6 min-w-0 rounded-[26px] border border-white/55 bg-[linear-gradient(180deg,rgba(246,250,255,0.34),rgba(255,255,255,0.24))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-xl">
                  {isCategoryDashboardLoading ? (
                    <div className="flex h-52 items-center justify-center text-sm font-medium text-slate-500">
                      Loading {selectedWorkspacePanel} summary...
                    </div>
                  ) : categorySchoolRows.length ? (
                    <div className="max-w-full overflow-x-auto overscroll-x-contain pb-2">
                      <table className="min-w-max border-separate border-spacing-y-2 text-sm">
                        <thead>
                          <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            <th className="px-3 py-2">Sl. No.</th>
                            <th className="px-3 py-2">{primaryEntityLabelSingular}</th>
                            <th className="px-3 py-2">Admin</th>
                            <th className="px-3 py-2">UserId</th>
                            <th className="px-3 py-2">Address</th>
                            <th className="px-3 py-2">District</th>
                            <th className="px-3 py-2">City</th>
                            <th className="px-3 py-2">State</th>
                            <th className="px-3 py-2">Approved</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categorySchoolRows.map((school) => (
                            <tr
                              key={school.id}
                              className="rounded-2xl bg-white/55 text-slate-700 shadow-[0_14px_28px_-22px_rgba(15,23,42,0.18)]"
                            >
                              <td className="rounded-l-2xl px-3 py-3 font-medium text-slate-900">
                                {school.serial}
                              </td>
                              <td className="px-3 py-3 font-medium text-slate-900">
                                {school.school}
                              </td>
                              <td className="px-3 py-3">{school.admin}</td>
                              <td className="px-3 py-3">{school.userId}</td>
                              <td className="px-3 py-3">{school.address}</td>
                              <td className="px-3 py-3">{school.district}</td>
                              <td className="px-3 py-3">{school.city}</td>
                              <td className="px-3 py-3">{school.state}</td>
                              <td className="px-3 py-3">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                    school.isApproved
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {school.isApproved ? "Yes" : "Pending"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex h-52 items-center justify-center text-sm font-medium text-slate-500">
                      No {primaryEntityLabel.toLowerCase()} available for this organization.
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </section>

        <footer className="text-xs text-gray-500">
          © 2026 PhenxOrganization
        </footer>
      </div>

      <div
        className={`fixed bottom-6 right-6 z-50 min-w-[220px] rounded-xl border border-blue-100 bg-white/90 px-4 py-3 text-sm font-medium text-blue-700 shadow-lg backdrop-blur transition-all duration-200 ${
          isToastVisible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
        role="status"
        aria-live="polite"
      >
        {toastMessage}
      </div>

      <SchoolCreateDialog
        open={isSchoolCreateDialogOpen}
        onOpenChange={(open) => {
          setSchoolCreateDialogOpen(open);
          if (!open) {
            setSchoolCreateError("");
          }
        }}
        formData={schoolCreateForm}
        onFormChange={handleSchoolCreateFormChange}
        onSubmit={handleSchoolCreateSubmit}
        errorMessage={schoolCreateError}
        isSubmitting={isCreatingSchool}
        organizationId={resolvedOrganizationId}
        organizationName={loggedInOrganizationName}
      />

      <Dialog
        open={isOrganizationUserCreateDialogOpen}
        onOpenChange={(open) => {
          setOrganizationUserCreateDialogOpen(open);
          if (!open) {
            resetOrganizationUserCreateForm();
          }
        }}
      >
        <DialogContent className="max-w-lg border border-blue-100 bg-white/95">
          <DialogHeader>
            <DialogTitle className="text-2xl text-gray-900">
              Add organization user
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Organization: {loggedInOrganizationName || "Selected organization"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOrganizationUserCreateSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Name
                <input
                  type="text"
                  name="name"
                  value={organizationUserCreateForm.name}
                  onChange={handleOrganizationUserCreateFormChange}
                  placeholder="Organization User"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Username
                <input
                  type="text"
                  name="username"
                  value={organizationUserCreateForm.username}
                  onChange={handleOrganizationUserCreateFormChange}
                  placeholder="org_user"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Email
                <input
                  type="email"
                  name="email"
                  value={organizationUserCreateForm.email}
                  onChange={handleOrganizationUserCreateFormChange}
                  placeholder="user@org.com"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Phone number
                <input
                  type="text"
                  name="phone_number"
                  value={organizationUserCreateForm.phone_number}
                  onChange={handleOrganizationUserCreateFormChange}
                  placeholder="9888888888"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Level
                <select
                  name="level"
                  value={organizationUserCreateForm.level}
                  onChange={handleOrganizationUserCreateFormChange}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select level</option>
                  {organizationUserLevelOptions.map((levelOption) => (
                    <option key={levelOption} value={levelOption}>
                      {levelOption}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Role
                {organizationUserCreateForm.level === "Level2" ? (
                  <input
                    type="text"
                    name="role"
                    value={organizationUserCreateForm.role}
                    onChange={handleOrganizationUserCreateFormChange}
                    placeholder="Custom role"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                ) : (
                  <select
                    name="role"
                    value={organizationUserCreateForm.role}
                    onChange={handleOrganizationUserCreateFormChange}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    {organizationUserRoleOptions.map((roleOption) => (
                      <option key={roleOption} value={roleOption}>
                        {roleOption}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            </div>

            {organizationUserCreateForm.level === "Level2" && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Category</p>
                <div className="flex flex-wrap gap-3">
                  {organizationUserCategoryOptions.map((categoryOption) => (
                    <label
                      key={categoryOption}
                      className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm"
                    >
                      <input
                        type="checkbox"
                        checked={organizationUserCategorySelections.includes(
                          categoryOption,
                        )}
                        onChange={() =>
                          toggleOrganizationUserCategory(categoryOption)
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      {categoryOption}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {organizationUserCreateError && (
              <p className="text-sm text-red-500">{organizationUserCreateError}</p>
            )}

            <div className="flex flex-col items-center justify-end gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setOrganizationUserCreateDialogOpen(false);
                  resetOrganizationUserCreateForm();
                }}
                className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingOrganizationUser}
                className="w-full rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {isCreatingOrganizationUser ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-white" />
                    Creating...
                  </span>
                ) : (
                  "Create user"
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isOrganizationSelectionDialogOpen}
        onOpenChange={(open) => {
          setOrganizationSelectionDialogOpen(open);
          if (!open) {
            setOrganizationSelectionError("");
          }
        }}
      >
        <DialogContent className="max-w-md border border-blue-100 bg-white/95">
          <DialogHeader>
            <DialogTitle className="text-2xl text-gray-900">
              Select organization
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Choose the organization you want to update before opening the information form.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOrganizationSelectionSubmit} className="space-y-5">
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Organization
              <select
                value={selectedOrganizationProfileId}
                onChange={(event) => {
                  setSelectedOrganizationProfileId(event.target.value);
                  setOrganizationSelectionError("");
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                required
              >
                <option value="">Select organization</option>
                {organizationProfileOptions.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>

            {organizationSelectionError && (
              <p className="text-sm text-red-500">{organizationSelectionError}</p>
            )}

            <div className="flex flex-col items-center justify-end gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setOrganizationSelectionDialogOpen(false);
                  setOrganizationSelectionError("");
                }}
                className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
              >
                Continue
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCompanyDialogOpen}
        onOpenChange={handleCompanyDialogChange}
      >
        <DialogContent
          showCloseButton={false}
          onPointerDownOutside={(event) => {
            if (isCompanyDialogLocked) {
              event.preventDefault();
            }
          }}
          onEscapeKeyDown={(event) => {
            if (isCompanyDialogLocked) {
              event.preventDefault();
            }
          }}
          className="h-[90vh] !w-[80vw] !max-w-[80vw] overflow-y-auto overflow-x-hidden border border-blue-100 bg-white/95"
        >
          <DialogHeader>
            <DialogTitle className="text-2xl text-gray-900">
              Complete organization profile
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Admins must finish the organization details before continuing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCompanyInfoSubmit} className="flex min-w-0 flex-col space-y-6">
            <div className="min-w-0 space-y-4">
              <button
                type="button"
                onClick={() => toggleSection("hospital")}
                className="flex w-full items-center justify-between rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-left text-sm font-semibold text-blue-900"
              >
                Organization details
                <span className="text-xs text-blue-700">
                  {activeSection === "hospital" ? "Hide" : "Show"}
                </span>
              </button>
              {activeSection === "hospital" && (
                <div className="w-full min-w-0 space-y-6 rounded-2xl border border-blue-100 bg-white p-4">
                  <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-100 bg-slate-50/60 px-4 py-6 text-center">
                    <div className="relative h-24 w-24 overflow-visible rounded-full border border-gray-200 bg-white shadow-sm">
                      {companyLogoPreview || companyLogoUrl ? (
                        <img
                          src={companyLogoPreview || companyLogoUrl}
                          alt="Organization logo"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-blue-500">
                          Logo
                        </div>
                      )}
                      <label className="absolute -bottom-2 -right-2 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-blue-300 text-white shadow-lg ring-2 ring-white transition hover:bg-blue-700">
                        <Camera className="h-5 w-5" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCompanyLogoChange}
                          disabled={isUploadingCompanyLogo}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Organization logo
                      </p>
                      <p className="text-xs text-gray-500">
                        Upload a square image to represent your organization.
                      </p>
                    </div>
                    <div className="mt-2 w-full">
                      {isUploadingCompanyLogo && (
                        <span className="mt-2 block text-xs text-blue-600">
                          Uploading...
                        </span>
                      )}
                      {companyLogoError && (
                        <p className="mt-2 text-xs text-red-500">
                          {companyLogoError}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="w-full min-w-0 space-y-4 rounded-2xl border border-blue-100 bg-white/70 p-4 shadow-[0_18px_45px_-32px_rgba(14,116,144,0.5)] backdrop-blur-xl">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          Attachments
                        </p>
                        <p className="text-xs text-gray-500">
                          Upload images and choose one as the category background.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => scrollOrganizationAttachments(-1)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-white/80 text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                          aria-label="Scroll attachments left"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollOrganizationAttachments(1)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-white/80 text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                          aria-label="Scroll attachments right"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50">
                          <Camera className="mr-2 h-4 w-4" />
                          {isUploadingOrganizationAttachments
                            ? "Uploading..."
                            : "Add attachments"}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleOrganizationAttachmentsChange}
                            disabled={isUploadingOrganizationAttachments}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {organizationAttachmentError && (
                      <p className="text-xs text-red-500">
                        {organizationAttachmentError}
                      </p>
                    )}

                    {organizationAttachments.length > 0 ? (
                      <div
                        ref={attachmentScrollerRef}
                        onWheel={handleOrganizationAttachmentsWheel}
                        onMouseDown={handleOrganizationAttachmentsDragStart}
                        onMouseMove={handleOrganizationAttachmentsDragMove}
                        onMouseUp={handleOrganizationAttachmentsDragEnd}
                        onMouseLeave={handleOrganizationAttachmentsDragEnd}
                        className="attachment-scrollbar w-full max-w-full cursor-grab overflow-x-auto overflow-y-hidden overscroll-x-contain pb-4 active:cursor-grabbing"
                      >
                        <div className="grid h-[430px] min-w-full grid-flow-col auto-cols-[minmax(320px,calc((100%-1.5rem)/3))] gap-3 pr-3">
                        {organizationAttachments.map((attachment) => {
                          const attachmentId =
                            attachment.id || attachment.attachment_id;
                          const previewUrl = resolveAttachmentPreviewUrl(
                            attachment,
                            companyInfoForm.organization_name,
                          );
                          const isBackgroundSelected =
                            Number(companyInfoForm.background_attachment_id) ===
                            Number(attachmentId);

                          return (
                            <div
                              key={attachmentId}
                              className={`flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border ${
                                isBackgroundSelected
                                  ? "border-blue-400 bg-blue-50/80 shadow-[0_20px_40px_-30px_rgba(59,130,246,0.75)]"
                                  : "border-white/70 bg-white/75"
                              } backdrop-blur-xl`}
                            >
                              <div className="relative h-[308px] flex-none overflow-hidden bg-slate-100">
                                {previewUrl ? (
                                  <img
                                    src={previewUrl}
                                    alt="Organization attachment"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-500">
                                    Preview unavailable
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveOrganizationAttachment(attachmentId)
                                  }
                                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-black/55 text-white transition hover:bg-black/75"
                                  aria-label="Remove attachment"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="flex flex-1 flex-col justify-between gap-3 p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    {isBackgroundSelected ? "Background" : "Attachment"}
                                  </span>
                                  {attachment.is_logo && (
                                    <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                                      Logo
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleBackgroundAttachmentSelect(attachmentId)
                                  }
                                  className={`inline-flex w-full items-center justify-center rounded-full px-3 py-2 text-xs font-semibold transition ${
                                    isBackgroundSelected
                                      ? "bg-blue-600 text-white shadow-sm"
                                      : "border border-blue-200 bg-white/80 text-blue-700 hover:bg-blue-50"
                                  }`}
                                >
                                  {isBackgroundSelected ? (
                                    <>
                                      <Check className="mr-1.5 h-4 w-4" />
                                      Set as background
                                    </>
                                  ) : (
                                    "Use as background"
                                  )}
                                </button>
                                {isBackgroundSelected && (
                                  <button
                                    type="button"
                                    onClick={handleClearBackgroundAttachment}
                                    className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white/85 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                  >
                                    Remove background
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-6 text-center text-sm text-slate-500">
                        No attachments added yet.
                      </div>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {hospitalDetailFields.map((field) => {
                      if (field.key === "country") {
                        return (
                          <label
                            key={field.key}
                            className="flex flex-col gap-2 text-sm font-medium text-gray-700"
                          >
                            {field.required
                              ? renderRequiredLabel(field.label)
                              : field.label}
                            <select
                              name={field.key}
                              value={selectedCountryCode}
                              onChange={handleCountrySelect}
                              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                              required={field.required}
                              disabled={isLoadingCountries}
                            >
                              <option value="">
                                {isLoadingCountries
                                  ? "Loading countries..."
                                  : "Select country"}
                              </option>
                              {countries.map((country) => (
                                <option
                                  key={country.alpha_2}
                                  value={country.alpha_2}
                                >
                                  {country.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        );
                      }

                      if (field.key === "head_office_state") {
                        return (
                          <label
                            key={field.key}
                            className="flex flex-col gap-2 text-sm font-medium text-gray-700"
                          >
                            {field.required
                              ? renderRequiredLabel(field.label)
                              : field.label}
                            <select
                              name={field.key}
                              value={companyInfoForm.head_office_state}
                              onChange={handleStateSelect}
                              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                              required={field.required}
                              disabled={!selectedCountryCode || isLoadingStates}
                            >
                              <option value="">
                                {isLoadingStates
                                  ? "Loading states..."
                                  : "Select state"}
                              </option>
                              {states.map((state) => (
                                <option key={state} value={state}>
                                  {state}
                                </option>
                              ))}
                            </select>
                          </label>
                        );
                      }

                      return (
                        <label
                          key={field.key}
                          className="flex flex-col gap-2 text-sm font-medium text-gray-700"
                        >
                          {field.required
                            ? renderRequiredLabel(field.label)
                            : field.label}
                          <input
                            type={field.type || "text"}
                            name={field.key}
                            value={companyInfoForm[field.key]}
                            onChange={handleCompanyInfoChange}
                            placeholder={field.placeholder}
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                            required={field.required}
                          />
                        </label>
                      );
                    })}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                      Currency code
                      <input
                        type="text"
                        value={companyInfoForm.currency_code}
                        readOnly
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                      Date format
                      <input
                        type="text"
                        value={companyInfoForm.date_format}
                        readOnly
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                      Language
                      <input
                        type="text"
                        value={companyInfoForm.language}
                        readOnly
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {companyInfoError && (
              <p className="text-sm text-red-500">{companyInfoError}</p>
            )}

            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-xs text-gray-500">
                This information powers reports and compliance dashboards.
              </p>
              <button
                type="submit"
                disabled={isSavingCompanyInfo}
                className="w-full sm:w-auto rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingCompanyInfo ? "Saving..." : "Save & continue"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCustomFieldDialogOpen}
        onOpenChange={setCustomFieldDialogOpen}
      >
        <DialogContent className="max-w-md border border-blue-100 bg-white/95">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900">
              Add custom field
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Create a custom field for statutory registers.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCustomFieldSubmit} className="space-y-4">
            {statutoryCustomFields.length > 0 && (
              <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Existing fields
                </p>
                {statutoryCustomFields.map((field) => (
                  <div
                    key={field.id}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input
                      type="text"
                      value={customFieldEdits[field.id]?.name || ""}
                      onChange={(event) =>
                        handleCustomFieldEditChange(
                          field.id,
                          "name",
                          event.target.value,
                        )
                      }
                      onBlur={(event) =>
                        handleCustomFieldUpdate(
                          field.id,
                          event.target.value,
                          customFieldEdits[field.id]?.field_type || "text",
                        )
                      }
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                    <select
                      value={customFieldEdits[field.id]?.field_type || "text"}
                      onChange={(event) =>
                        handleCustomFieldEditChange(
                          field.id,
                          "field_type",
                          event.target.value,
                        )
                      }
                      onBlur={(event) =>
                        handleCustomFieldUpdate(
                          field.id,
                          customFieldEdits[field.id]?.name || field.name,
                          event.target.value,
                        )
                      }
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleCustomFieldDelete(field.id)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Field name
              <input
                type="text"
                value={customFieldName}
                onChange={(event) => setCustomFieldName(event.target.value)}
                placeholder="License number"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Field type
              <select
                value={customFieldType}
                onChange={(event) => setCustomFieldType(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
              </select>
            </label>

            {customFieldError && (
              <p className="text-sm text-red-500">{customFieldError}</p>
            )}

            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setCustomFieldName("");
                  setCustomFieldError("");
                  setCustomFieldDialogOpen(false);
                }}
                className="w-full sm:w-auto rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Save field
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAddMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
      >
        <DialogContent className="max-w-lg border border-blue-100 bg-white/95">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900">
              Add team member
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Invite a member to join your hospital team by email.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleMemberSubmit} className="space-y-4">
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Full name
              <input
                type="text"
                value={memberForm.name}
                onChange={(event) =>
                  setMemberForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="e.g. Priya Sharma"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Email address
              <input
                type="email"
                value={memberForm.email}
                onChange={(event) =>
                  setMemberForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                placeholder="name@hospital.com"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Role
                <select
                  value={memberForm.role}
                  onChange={(event) =>
                    setMemberForm((prev) => ({
                      ...prev,
                      role: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="administration">Administration</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Mobile number (optional)
                <input
                  type="tel"
                  value={memberForm.number}
                  onChange={(event) =>
                    setMemberForm((prev) => ({
                      ...prev,
                      number: event.target.value,
                    }))
                  }
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                />
              </label>
            </div>

            {memberError && (
              <p className="text-sm text-red-500">{memberError}</p>
            )}

            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  resetMemberForm();
                  setAddMemberDialogOpen(false);
                }}
                className="w-full sm:w-auto rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingMember}
                className="w-full sm:w-auto rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingMember ? "Sending..." : "Send invite"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isProfileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-lg border border-blue-100 bg-white/95">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900">
              Edit profile
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Update your profile details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-4">
              <div className="h-16 w-16 overflow-hidden rounded-full ring-2 ring-blue-200">
                {profileData.avatarUrl ? (
                  <img
                    src={profileData.avatarUrl}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-blue-100 text-sm font-semibold text-blue-700">
                    {(profileForm.name || "A").trim().charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Profile photo
                </p>
                <p className="text-xs text-gray-600">
                  Upload a square image for best results.
                </p>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    className="hidden"
                  />
                  {isUploadingProfileImage ? "Uploading..." : "Change photo"}
                </label>
                {profileImageError && (
                  <p className="mt-2 text-xs text-red-500">
                    {profileImageError}
                  </p>
                )}
              </div>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Name
              <input
                type="text"
                name="name"
                readOnly
                value={profileForm.name}
                onChange={handleProfileFormChange}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Mobile
              <input
                type="text"
                name="mobile"
                value={profileForm.mobile}
                onChange={handleProfileFormChange}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              About
              <textarea
                name="about"
                value={profileForm.about}
                onChange={handleProfileFormChange}
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Address
              <textarea
                name="address"
                value={profileForm.address}
                onChange={handleProfileFormChange}
                rows={2}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </label>

            {profileError && (
              <p className="text-sm text-red-500">{profileError}</p>
            )}

            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setProfileDialogOpen(false)}
                className="w-full sm:w-auto rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full sm:w-auto rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingProfile ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isProfileImageCropDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isProfileCropUploadBusy) {
            resetProfileImageCropper();
          }
        }}
      >
        <DialogContent className="max-w-xl border border-blue-100 bg-white/95">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900">
              Crop profile photo
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Adjust image position before uploading.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div
              className={`mx-auto w-fit rounded-2xl border border-blue-100 bg-slate-100 p-2 ${
                isProfileImageCropDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              style={{ touchAction: "none" }}
              onPointerDown={handleProfileCropPointerDown}
              onPointerMove={handleProfileCropPointerMove}
              onPointerUp={handleProfileCropPointerUp}
              onPointerCancel={handleProfileCropPointerUp}
              onPointerLeave={handleProfileCropPointerUp}
            >
              <div className="relative h-[280px] w-[280px] overflow-hidden rounded-xl">
                <canvas
                  ref={profileImageCropCanvasRef}
                  width={PROFILE_IMAGE_CROP_PREVIEW_SIZE}
                  height={PROFILE_IMAGE_CROP_PREVIEW_SIZE}
                  className="h-[280px] w-[280px]"
                />

                <div
                  className={`absolute border-2 border-white shadow-[0_0_0_9999px_rgba(15,23,42,0.35)] ${
                    isProfileCropBoxDragging ? "cursor-move" : "cursor-grab"
                  } ${isProfileCropBoxResizing ? "ring-2 ring-blue-200" : ""}`}
                  style={{
                    left: `${profileImageCropBox.x}px`,
                    top: `${profileImageCropBox.y}px`,
                    width: `${profileImageCropBox.size}px`,
                    height: `${profileImageCropBox.size}px`,
                  }}
                  onPointerDown={handleCropBoxMovePointerDown}
                  onPointerMove={handleProfileCropPointerMove}
                  onPointerUp={handleProfileCropPointerUp}
                  onPointerCancel={handleProfileCropPointerUp}
                >
                  <div className="pointer-events-none absolute inset-0 border border-white/60" />
                  <button
                    type="button"
                    className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full border border-white bg-blue-500"
                    onPointerDown={handleCropBoxResizePointerDown}
                    aria-label="Resize crop area"
                  />
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-gray-500">
              Drag image to reposition. Move/resize the crop border to choose area and amount.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs font-semibold text-gray-700">
                Zoom
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={profileImageCropZoom}
                  onChange={(event) =>
                    setProfileImageCropZoom(Number(event.target.value))
                  }
                  disabled={isUploadingProfileImage}
                />
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold text-gray-700">
                Rotate
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={profileImageCropRotation}
                  onChange={(event) =>
                    setProfileImageCropRotation(Number(event.target.value))
                  }
                  disabled={isUploadingProfileImage}
                />
              </label>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <button
                type="button"
                onClick={resetProfileImageCropper}
                disabled={isProfileCropUploadBusy}
                className="w-full sm:w-auto rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProfileImageCropSubmit}
                disabled={isProfileCropUploadBusy || !profileImageCropElement}
                className="w-full sm:w-auto rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isProfileCropUploadBusy ? "Uploading..." : "Crop & upload"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isOrgApprovalDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleForcedLogout();
          }
          setOrgApprovalDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-md border border-blue-100 bg-white/95">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900">
              Approval required
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              You are not approved yet. Please ask for permission to be
              approved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Contact your organization admin to activate your access.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-blue-200 px-5 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                onClick={handleForcedLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isApprovalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="max-w-lg overflow-hidden border border-blue-100 bg-white/95 p-0">
          <div className="relative">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full border border-blue-100 bg-white/90 p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-700"
              onClick={() => setApprovalDialogOpen(false)}
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="bg-gradient-to-br from-[#0ea5a5]/15 via-white to-[#3b82f6]/15 px-6 pb-4 pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-md">
                  <Hospital className="h-6 w-6 text-[#0ea5a5]" />
                </div>
                <div className="space-y-2">
                  <DialogTitle className="text-xl text-gray-900">
                    Hospital approval required
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-600">
                    Your hospital is not approved yet. Please contact the
                    approval team to activate access.
                  </DialogDescription>
                </div>
              </div>
            </div>
            <div className="space-y-4 px-6 pb-6">
              <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600/80">
                  Contact
                </p>
                <a
                  href="mailto:info@phenx.io"
                  className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  info@phenx.io
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  onClick={() => setApprovalDialogOpen(false)}
                >
                  Got it
                </button>
                <button
                  type="button"
                  className="rounded-full border border-blue-200 px-5 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
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

      <Dialog
        open={expiryDialog.open}
        onOpenChange={(open) => setExpiryDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent
          className="max-w-lg overflow-hidden border border-blue-100 bg-white/95 p-0"
          onKeyDownCapture={(event) => {
            if (event.key === "Enter" && expiryDialog.mode === "reminder") {
              event.preventDefault();
              setExpiryDialog((prev) => ({ ...prev, open: false }));
            }
          }}
        >
          <div className="relative">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full border border-blue-100 bg-white/90 p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-700"
              onClick={() =>
                setExpiryDialog((prev) => ({ ...prev, open: false }))
              }
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
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
                  onClick={() =>
                    setExpiryDialog((prev) => ({ ...prev, open: false }))
                  }
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
      <style jsx>{`
        .attachment-scrollbar::-webkit-scrollbar {
          height: 12px;
        }

        .attachment-scrollbar::-webkit-scrollbar-track {
          background: rgba(219, 234, 254, 0.75);
          border-radius: 999px;
        }

        .attachment-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, rgba(56, 189, 248, 0.95), rgba(59, 130, 246, 0.95));
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.95);
        }

        .group:hover .workspace-orbit-ring {
          animation: workspace-ring-draw 720ms ease-out forwards;
        }

        @keyframes workspace-ring-draw {
          0% {
            stroke-dashoffset: 100;
            opacity: 0.35;
          }

          50% {
            stroke-dashoffset: 50;
            opacity: 0.75;
          }

          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
