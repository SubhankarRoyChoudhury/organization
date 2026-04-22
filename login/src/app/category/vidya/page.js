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
  Pencil,
  Check,
  X,
  MoreVertical,
  Camera,
  ArrowLeft,
} from "lucide-react";
import {
  getCompanyInfo,
  getCurrentUserStatus,
  clearLoginSession,
  getOrganizationUserDetails,
  // getAllCountries,
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
  createSchool,
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
} from "@/app/api/apiService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ImageCropDialog from "@/components/ui/image-crop-dialog";
import OrganizationUserCreateDialog from "@/components/ui/organization-user-create-dialog";
import SchoolCreateDialog from "@/components/ui/school-create-dialog";
import { environment } from "@/environments/environments";

const baseModules = [
  {
    title: "schools",
    description: "Teacher, Student, Class, and Officials.",
    href: "/category/vidya/school",
    icon: School,
    tint: "from-[#0ea5a5]/10 to-[#0ea5a5]/30",
    ring: "ring-[#0ea5a5]/40",
    enabled: true,
  },
  {
    title: "Skill Management center",
    description: "Doctors, Patients, Appointments, and Operations.",
    href: "/hospital-management",
    icon: Hospital,
    tint: "from-[#0284c7]/10 to-[#0284c7]/30",
    ring: "ring-[#0284c7]/40",
    enabled: true,
  },
  {
    title: "colleges",
    description: "Doctors, Patients, Appointments, and Operations.",
    href: "/hospital-management",
    icon: Hospital,
    tint: "from-[#0284c7]/10 to-[#0284c7]/30",
    ring: "ring-[#0284c7]/40",
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

const hospitalDetailFields = [
  {
    key: "company_name",
    label: "Hospital name",
    placeholder: "Sunrise Medical Center",
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

export default function Vidya() {
  const router = useRouter();
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [isToastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef(null);
  const [isCompanyDialogOpen, setCompanyDialogOpen] = useState(false);
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
  const [categoryBackgroundImageUrl, setCategoryBackgroundImageUrl] =
    useState("");
  const [companyLogoPreview, setCompanyLogoPreview] = useState("");
  const [isUploadingCompanyLogo, setIsUploadingCompanyLogo] = useState(false);
  const [companyLogoError, setCompanyLogoError] = useState("");
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
    hospitalName: "",
    avatarUrl: "",
    roleLabel: "",
    isAdminOwner: false,
    username: "",
  });
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isSuperuserSession, setIsSuperuserSession] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isAdminMenuOpen, setAdminMenuOpen] = useState(false);
  const [isProfileDialogOpen, setProfileDialogOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [profileImageError, setProfileImageError] = useState("");
  const [imageCropDialog, setImageCropDialog] = useState({
    open: false,
    sourceUrl: "",
    fileName: "image.jpg",
    target: "",
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
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [loggedInOrganizationId, setLoggedInOrganizationId] = useState(null);
  const [loggedInOrganizationName, setLoggedInOrganizationName] = useState("");
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
    company_id: null,
    company_logo_id: null,
    company_name: "",
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

  const [availableModules, setAvailableModules] = useState(baseModules);

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

  useEffect(() => {
    userDetails();
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setIsSuperuserSession(localStorage.getItem("is_superuser") === "true");
  }, []);

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
      const organizationUserDetails =
        await getOrganizationUserDetails(username);
      console.log(
        "OrganizationUser details=====>>>>>>>",
        organizationUserDetails,
      );
      setOrganizationUserId(
        organizationUserDetails?.id ||
          organizationUserDetails?.user_id ||
          organizationUserDetails?.user ||
          null,
      );
      setLoggedInOrganizationId(organizationUserDetails?.organization || null);
      setLoggedInOrganizationName(
        organizationUserDetails?.organization_name || "",
      );
      setOrganizationUserCreateForm((prev) => ({
        ...prev,
        organization_id: organizationUserDetails?.organization
          ? String(organizationUserDetails.organization)
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

  // useEffect(() => {
  //   const loadCountries = async () => {
  //     try {
  //       setIsLoadingCountries(true);
  //       const response = await getAllCountries();
  //       const countryList = response?.response || [];
  //       setCountries(countryList);
  //     } catch (error) {
  //       console.error("Failed to load countries:", error);
  //     } finally {
  //       setIsLoadingCountries(false);
  //     }
  //   };

  //   loadCountries();
  // }, []);

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

    setCompanyInfoForm((prev) => ({
      ...prev,
      currency_code: prev.currency_code || matchedCountry.currency || "",
      date_format: prev.date_format || matchedCountry.date_format || "",
      language: prev.language || matchedCountry.language || "",
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

        const isAdminRole =
          userDetails.is_admin === true || userDetails.is_owner === true;
        const isManagerRole = userDetails.is_manager === true;
        const roleLabel = isAdminRole
          ? "Admin"
          : isManagerRole
            ? "Manager"
            : userDetails.role || "";
        setProfileData({
          displayName: userDetails.name || userDetails.username || fallbackName,
          hospitalName: companyDetails.company_name || "",
          avatarUrl:
            userDetails.image_url || "https://i.pravatar.cc/100?img=12",
          roleLabel,
          isAdminOwner:
            isSuperuser ||
            userDetails.is_admin === true ||
            userDetails.is_owner === true,
          username:
            userDetails.username || localStorage.getItem("username") || "",
        });
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

        const resolvedCompanyId =
          currentUser?.user?.company_id || currentUser?.company_details?.id;

        if (!resolvedCompanyId) {
          return;
        }

        setCompanyId(resolvedCompanyId);
        const pendingLogoId = localStorage.getItem("pending_company_logo_id");
        const companyInfoResponse = await getCompanyInfo(
          resolvedCompanyId,
          pendingLogoId || undefined,
        );
        const fetchedCompanyInfo =
          companyInfoResponse?.response?.company_info ||
          companyInfoResponse?.response?.companyInfo;
        const base64LogoUrl =
          companyInfoResponse?.response?.company_thumbnail_image_url || "";
        const imageDetails = companyInfoResponse?.response?.image_details || [];
        const rawBackgroundValue =
          companyInfoResponse?.response?.background_image_url ||
          fetchedCompanyInfo?.background_image_url ||
          "";
        const logoAttachment = imageDetails?.[0];
        const rawLogoValue =
          logoAttachment?.url ||
          logoAttachment?.image_url ||
          logoAttachment?.base_64_image ||
          "";
        const resolvedLogoUrl =
          base64LogoUrl ||
          buildCompanyMediaUrl(rawLogoValue, fetchedCompanyInfo?.company_name);
        const ownerList = companyInfoResponse?.response?.owners || [];
        const statutoryList =
          companyInfoResponse?.response?.statutory_registers || [];
        const statutoryCustomFieldList =
          companyInfoResponse?.response?.statutory_custom_fields || [];
        const statutoryCustomValues =
          companyInfoResponse?.response?.statutory_custom_values || [];

        if (!fetchedCompanyInfo) {
          return;
        }

        // console.log(companyInfoResponse);

        const normalizedCompanyInfo = {
          id: fetchedCompanyInfo.id || null,
          company_id: fetchedCompanyInfo.company_id || resolvedCompanyId,
          company_logo_id: fetchedCompanyInfo.company_logo_id || null,
          company_name: fetchedCompanyInfo.company_name || "",
          admin_name: fetchedCompanyInfo.admin_name || "",
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
        const matchedCountry = countries.find(
          (country) =>
            country.name?.toLowerCase() ===
            normalizedCompanyInfo.country.toLowerCase(),
        );
        const apiLocaleDefaults = matchedCountry
          ? {
              currency_code: matchedCountry.currency || "",
              date_format: matchedCountry.date_format || "",
              language: matchedCountry.language || "",
            }
          : null;

        const mergedCompanyInfo = {
          ...normalizedCompanyInfo,
          currency_code:
            normalizedCompanyInfo.currency_code ||
            apiLocaleDefaults?.currency_code ||
            defaultLocaleProfile.currency_code,
          date_format:
            normalizedCompanyInfo.date_format ||
            apiLocaleDefaults?.date_format ||
            defaultLocaleProfile.date_format,
          language:
            normalizedCompanyInfo.language ||
            apiLocaleDefaults?.language ||
            defaultLocaleProfile.language,
        };

        setCompanyInfoForm(mergedCompanyInfo);
        setCompanyLogoUrl(resolvedLogoUrl || "");
        setCategoryBackgroundImageUrl(
          rawBackgroundValue
            ? buildCompanyMediaUrl(
                rawBackgroundValue,
                fetchedCompanyInfo?.company_name ||
                  fetchedCompanyInfo?.organization_name,
              ) || resolveImageUrl(rawBackgroundValue)
            : "",
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
        const missingFields = getMissingCompanyInfoFields(
          normalizedCompanyInfo,
        );
        if (missingFields.length > 0) {
          setCompanyDialogLocked(true);
          setCompanyDialogOpen(true);
        }

        if (pendingLogoId) {
          if (normalizedCompanyInfo.company_logo_id) {
            localStorage.removeItem("pending_company_logo_id");
          } else if (fetchedCompanyInfo?.id) {
            try {
              await updateCompanyInfo({
                id: fetchedCompanyInfo.id,
                company_logo_id: Number(pendingLogoId) || pendingLogoId,
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
                company_logo_id: refreshedInfo?.company_logo_id || null,
              }));
              setCompanyLogoUrl(
                refreshedBase64Logo ||
                  buildCompanyMediaUrl(
                    refreshedRawLogo,
                    refreshedInfo?.company_name,
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
    const fallbackProfile = getLocaleProfileForCountry(
      matchedCountry?.name || "",
      {
        currency_code: defaultLocaleProfile.currency_code,
        date_format: defaultLocaleProfile.date_format,
        language: defaultLocaleProfile.language,
      },
    );

    setSelectedCountryCode(countryCode);
    setCompanyInfoForm((prev) => ({
      ...prev,
      country: matchedCountry?.name || "",
      head_office_state: "",
      currency_code:
        matchedCountry?.currency || fallbackProfile.currency_code || "",
      date_format:
        matchedCountry?.date_format || fallbackProfile.date_format || "",
      language: matchedCountry?.language || fallbackProfile.language || "",
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
        setCompanyDialogOpen(true);
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
      category: organizationUserCreateForm.category.trim(),
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

    if (!organizationUserId) {
      setSchoolCreateError(
        "Organization user details not found for current login.",
      );
      return;
    }

    const payload = {
      organization_user: organizationUserId,
      username: schoolCreateForm.username.trim(),
      email: schoolCreateForm.email.trim(),
      phone_number: schoolCreateForm.phone_number.trim(),
      name: schoolCreateForm.name.trim(),
      address: schoolCreateForm.address.trim(),
      city: schoolCreateForm.city.trim(),
      state: schoolCreateForm.state.trim(),
      country: schoolCreateForm.country.trim(),
      postal_code: schoolCreateForm.postal_code.trim(),
    };

    if (!payload.name) {
      setSchoolCreateError("School name is required.");
      return;
    }

    try {
      setIsCreatingSchool(true);
      await createSchool(payload);
      setSchoolCreateDialogOpen(false);
      resetSchoolCreateForm();
      showToast("School created successfully.");
    } catch (error) {
      const responseData = error.response?.data || {};
      const detail =
        responseData?.detail ||
        responseData?.name?.[0] ||
        responseData?.organization_user?.[0] ||
        responseData?.username?.[0] ||
        responseData?.email?.[0] ||
        "Unable to create school.";
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

  const closeImageCropDialog = () => {
    if (imageCropDialog.sourceUrl) {
      URL.revokeObjectURL(imageCropDialog.sourceUrl);
    }
    setImageCropDialog({
      open: false,
      sourceUrl: "",
      fileName: "image.jpg",
      target: "",
    });
  };

  const openImageCropDialog = (file, target) => {
    if (imageCropDialog.sourceUrl) {
      URL.revokeObjectURL(imageCropDialog.sourceUrl);
    }
    setImageCropDialog({
      open: true,
      sourceUrl: URL.createObjectURL(file),
      fileName: file.name || "image.jpg",
      target,
    });
  };

  const uploadProfileImageFile = async (file, previewUrl) => {
    setProfileData((prev) => ({
      ...prev,
      avatarUrl: previewUrl,
    }));

    setIsUploadingProfileImage(true);
    try {
      const companyId = localStorage.getItem("company_id");
      const uploadResponse = await uploadImageFromAnyWhere(
        file,
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
      closeImageCropDialog();
      showToast("Profile image updated.");
    } catch (_error) {
      setProfileImageError("Unable to upload profile image.");
    } finally {
      setIsUploadingProfileImage(false);
    }
  };

  const uploadCompanyLogoFile = async (file, previewUrl) => {
    setCompanyLogoPreview(previewUrl);
    setIsUploadingCompanyLogo(true);
    try {
      const uploadResponse = await uploadImageFromAnyWhere(
        file,
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
        company_logo_id: attachmentId,
      });
      setCompanyInfoForm((prev) => ({
        ...prev,
        company_logo_id: attachmentId,
      }));
      setCompanyLogoUrl(previewUrl);
      localStorage.removeItem("pending_company_logo_id");
      closeImageCropDialog();
      showToast("Hospital logo updated.");
    } catch (error) {
      console.error("Unable to upload hospital logo:", error);
      setCompanyLogoError("Unable to upload hospital logo.");
    } finally {
      setIsUploadingCompanyLogo(false);
    }
  };

  const handleImageCropConfirm = async (file, previewUrl) => {
    if (imageCropDialog.target === "profile") {
      await uploadProfileImageFile(file, previewUrl);
      return;
    }
    if (imageCropDialog.target === "company_logo") {
      await uploadCompanyLogoFile(file, previewUrl);
    }
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
    openImageCropDialog(file, "profile");
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
    openImageCropDialog(file, "company_logo");
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

    const resolvedCompanyId = companyId || companyInfoForm.company_id;
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
        team_name: companyInfoForm.company_name || "our team",
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
      const refreshedCompanyInfo =
        companyInfoResponse?.response?.company_info ||
        companyInfoResponse?.response?.companyInfo;
      const refreshedBase64Logo =
        companyInfoResponse?.response?.company_thumbnail_image_url || "";
      const refreshedBackgroundValue =
        companyInfoResponse?.response?.background_image_url ||
        refreshedCompanyInfo?.background_image_url ||
        "";
      const refreshedImages =
        companyInfoResponse?.response?.image_details || [];
      const refreshedLogoAttachment = refreshedImages?.[0];
      const refreshedRawLogo =
        refreshedLogoAttachment?.url ||
        refreshedLogoAttachment?.image_url ||
        refreshedLogoAttachment?.base_64_image ||
        "";
      const refreshedLogoUrl =
        refreshedBase64Logo ||
        buildCompanyMediaUrl(
          refreshedRawLogo,
          refreshedCompanyInfo?.company_name || companyInfoForm.company_name,
        );
      const refreshedOwners = companyInfoResponse?.response?.owners || [];
      const refreshedStatutoryList =
        companyInfoResponse?.response?.statutory_registers || [];
      const refreshedCustomFields =
        companyInfoResponse?.response?.statutory_custom_fields || [];
      const refreshedCustomValues =
        companyInfoResponse?.response?.statutory_custom_values || [];

      const normalizedCompanyInfo = {
        id: refreshedCompanyInfo?.id || companyInfoForm.id,
        company_id:
          refreshedCompanyInfo?.company_id || companyInfoForm.company_id,
        company_logo_id: refreshedCompanyInfo?.company_logo_id || null,
        company_name: refreshedCompanyInfo?.company_name || "",
        admin_name: refreshedCompanyInfo?.admin_name || "",
        email: refreshedCompanyInfo?.email || "",
        mobile_no: refreshedCompanyInfo?.mobile_no || "",
        address: refreshedCompanyInfo?.address || "",
        city: refreshedCompanyInfo?.city || "",
        pin: refreshedCompanyInfo?.pin || "",
        country: refreshedCompanyInfo?.country || "",
        head_office_state: refreshedCompanyInfo?.head_office_state || "",
        currency_code:
          refreshedCompanyInfo?.currency_code ||
          companyInfoForm.currency_code ||
          defaultLocaleProfile.currency_code,
        date_format:
          refreshedCompanyInfo?.date_format ||
          companyInfoForm.date_format ||
          defaultLocaleProfile.date_format,
        language:
          refreshedCompanyInfo?.language ||
          companyInfoForm.language ||
          defaultLocaleProfile.language,
      };

      setCompanyInfoForm(applyLocaleDefaults(normalizedCompanyInfo));
      setCompanyLogoUrl(refreshedLogoUrl || "");
      setCategoryBackgroundImageUrl(
        refreshedBackgroundValue
          ? buildCompanyMediaUrl(
              refreshedBackgroundValue,
              refreshedCompanyInfo?.company_name ||
                refreshedCompanyInfo?.organization_name ||
                companyInfoForm.company_name,
            ) || resolveImageUrl(refreshedBackgroundValue)
          : "",
      );
      setCompanyLogoPreview("");
      setOwners(refreshedOwners);
      setEditedOwners(refreshedOwners);
      checkOwnersAccountStatus(refreshedOwners);
      const refreshedRows = buildStatutoryRows(
        refreshedStatutoryList,
        refreshedCustomValues,
      );
      setStatutoryCustomFields(refreshedCustomFields);
      setCustomFieldEdits(
        refreshedCustomFields.reduce((acc, field) => {
          acc[field.id] = {
            name: field.name || "",
            field_type: field.field_type || "text",
          };
          return acc;
        }, {}),
      );
      setStatutoryRegisters(refreshedRows);
      setEditedStatutoryRegisters(refreshedRows);
      const remainingMissing = getMissingCompanyInfoFields(
        normalizedCompanyInfo,
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
    window.location.replace("/category/vidya/school");
  };

  const handleHospitalManagementClick = () => {
    const mainGroup = String(localStorage.getItem("company_main_group") || "")
      .trim()
      .toLowerCase();
    const subGroup = String(localStorage.getItem("company_sub_group") || "")
      .trim()
      .toLowerCase();

    if (mainGroup === "swasthya" && subGroup === "clinic") {
      window.location.replace("/clinic-management");
      return;
    }

    window.location.replace("/hospital-management");
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

  const handleBackNavigation = () => {
    // const referrer = document.referrer || "";
    // const currentPath = window.location.pathname;

    // if (referrer) {
    //   try {
    //     const referrerUrl = new URL(referrer);
    //     const hasInternalReferrer =
    //       referrerUrl.origin === window.location.origin &&
    //       referrerUrl.pathname !== currentPath;
    //     if (hasInternalReferrer) {
    //       router.back();
    //       return;
    //     }
    //   } catch {
    //     // Ignore invalid referrer and use fallback route.
    //   }
    // }

    router.push("/category");
  };

  const categoryPageBackgroundStyle = categoryBackgroundImageUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(173, 216, 255, 0.26), rgba(232, 244, 255, 0.18), rgba(165, 214, 255, 0.28)), linear-gradient(135deg, rgba(8, 47, 73, 0.12), rgba(14, 116, 144, 0.08), rgba(37, 99, 235, 0.1)), url(${categoryBackgroundImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }
    : undefined;

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
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#e1f5ff] via-white to-[#d7f1ff] px-4 py-10"
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
      <div className="absolute top-10 right-1/3 h-10 w-10 rounded-full bg-white/60 shadow-lg" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="flex items-start">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/90 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <section className="max-w-3xl rounded-[2rem] border border-white/70 bg-white/58 px-6 py-6 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:px-8">
          <div className="inline-flex items-center rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-700">
            Category Dashboard
          </div>
          <div className="mt-4">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Vidya
            </h1>
          </div>
        </section>

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
                    {profileData.hospitalName || "Organisation Profile Name"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {profileData.displayName || "Admin"}
                    </p>
                    {profileData.roleLabel ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                        {profileData.roleLabel}
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

            if (module.enabled && module.href === "/category/vidya/school") {
              return (
                <button
                  key={module.title}
                  type="button"
                  className={`${cardClassName} text-center`}
                  onClick={handleSchoolManagementClick}
                >
                  {cardContent}
                </button>
              );
            }

            if (module.enabled && module.href === "/hospital-management") {
              return (
                <button
                  key={module.title}
                  type="button"
                  className={`${cardClassName} text-center`}
                  onClick={handleHospitalManagementClick}
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
                  className={`${cardClassName} text-center`}
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
                  className={`${cardClassName} text-center`}
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
                  className={`${cardClassName} text-center`}
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
                  className={`${cardClassName} text-center`}
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
                  className={`${cardClassName} text-center`}
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
                className={`${cardClassName} text-center`}
                onClick={() => showToast("Coming soon")}
              >
                {cardContent}
              </button>
            );
          })}
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

      <OrganizationUserCreateDialog
        open={isOrganizationUserCreateDialogOpen}
        onOpenChange={(open) => {
          setOrganizationUserCreateDialogOpen(open);
          if (!open) {
            setOrganizationUserCreateError("");
          }
        }}
        formData={organizationUserCreateForm}
        onFormChange={handleOrganizationUserCreateFormChange}
        onSubmit={handleOrganizationUserCreateSubmit}
        errorMessage={organizationUserCreateError}
        isSubmitting={isCreatingOrganizationUser}
        organizations={organizations}
        isLoadingOrganizations={isLoadingOrganizations}
        selectedOrganizationId={loggedInOrganizationId}
        selectedOrganizationName={loggedInOrganizationName}
        isHospitalManagementContext={selectedManagementContext === "hospital"}
        hospitalReferenceOptions={hospitalReferenceOptions}
        isLoadingHospitalReferenceOptions={isLoadingHospitalReferenceOptions}
        onCreateHospitalReference={handleCreateHospitalReference}
        onFieldValueChange={handleOrganizationUserCreateFieldValueChange}
        isCreatingHospitalReference={isCreatingHospitalReference}
        hospitalReferenceError={hospitalReferenceError}
      />

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
        organizationUserId={organizationUserId}
        organizationName={loggedInOrganizationName}
      />

      <Dialog
        open={isOrganizationCreateDialogOpen}
        onOpenChange={(open) => {
          setOrganizationCreateDialogOpen(open);
          if (!open) {
            setOrganizationCreateError("");
          }
        }}
      >
        <DialogContent className="max-w-3xl border border-blue-100 bg-white/95">
          <DialogHeader>
            <DialogTitle className="text-2xl text-gray-900">
              Create organization
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Add a new organization using the Organization model fields.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOrganizationCreateSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                <span>Organization name</span>
                <input
                  type="text"
                  name="name"
                  value={organizationCreateForm.name}
                  onChange={handleOrganizationCreateFormChange}
                  placeholder="Acme School"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Admin name
                <input
                  type="text"
                  name="admin_name"
                  value={organizationCreateForm.admin_name}
                  onChange={handleOrganizationCreateFormChange}
                  placeholder="Organization Admin"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Username
                <input
                  type="text"
                  name="username"
                  value={organizationCreateForm.username}
                  onChange={handleOrganizationCreateFormChange}
                  placeholder="acme_admin"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Email
                <input
                  type="email"
                  name="email"
                  value={organizationCreateForm.email}
                  onChange={handleOrganizationCreateFormChange}
                  placeholder="contact@acme-school.com"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Phone number
                <input
                  type="text"
                  name="phone_number"
                  value={organizationCreateForm.phone_number}
                  onChange={handleOrganizationCreateFormChange}
                  placeholder="9888888888"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Password
                <input
                  type="password"
                  name="password"
                  value={organizationCreateForm.password}
                  onChange={handleOrganizationCreateFormChange}
                  placeholder="Enter password"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Address
                <input
                  type="text"
                  name="address"
                  value={organizationCreateForm.address}
                  onChange={handleOrganizationCreateFormChange}
                  placeholder="MG Road"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                City
                <input
                  type="text"
                  name="city"
                  value={organizationCreateForm.city}
                  onChange={handleOrganizationCreateFormChange}
                  placeholder="Pune"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                State
                <input
                  type="text"
                  name="state"
                  value={organizationCreateForm.state}
                  onChange={handleOrganizationCreateFormChange}
                  placeholder="Maharashtra"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Country
                <input
                  type="text"
                  name="country"
                  value={organizationCreateForm.country}
                  onChange={handleOrganizationCreateFormChange}
                  placeholder="India"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Postal code
                <input
                  type="text"
                  name="postal_code"
                  value={organizationCreateForm.postal_code}
                  onChange={handleOrganizationCreateFormChange}
                  placeholder="411001"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            {organizationCreateError && (
              <p className="text-sm text-red-500">{organizationCreateError}</p>
            )}

            <div className="flex flex-col items-center justify-end gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setOrganizationCreateDialogOpen(false);
                  setOrganizationCreateError("");
                }}
                className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingOrganization}
                className="w-full rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {isCreatingOrganization ? "Creating..." : "Create organization"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      

      <Dialog open={isOwnerDialogOpen} onOpenChange={setOwnerDialogOpen}>
        <DialogContent className="max-w-lg border border-blue-100 bg-white/95">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900">
              Add owner
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Link an owner to this hospital profile.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOwnerSubmit} className="space-y-4">
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Owner name
              <input
                type="text"
                name="Name"
                value={ownerForm.Name}
                onChange={handleOwnerFormChange}
                placeholder="Dr. Maya Singh"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Designation
              <input
                type="text"
                name="Designation"
                value={ownerForm.Designation}
                onChange={handleOwnerFormChange}
                placeholder="Managing Director"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Email
              <input
                type="email"
                name="email"
                value={ownerForm.email}
                onChange={handleOwnerFormChange}
                placeholder="owner@hospital.com"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Other ID (optional)
              <input
                type="text"
                name="otherid"
                value={ownerForm.otherid}
                onChange={handleOwnerFormChange}
                placeholder="ID-12345"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Note (optional)
              <input
                type="text"
                name="note"
                value={ownerForm.note}
                onChange={handleOwnerFormChange}
                placeholder="Owner notes"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              PAN (optional)
              <input
                type="text"
                name="Pan"
                value={ownerForm.Pan}
                onChange={handleOwnerFormChange}
                placeholder="ABCDE1234F"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="primary_admin"
                checked={ownerForm.primary_admin}
                onChange={handleOwnerFormChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
              />
              Primary admin
            </label>

            {ownerError && <p className="text-sm text-red-500">{ownerError}</p>}

            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  resetOwnerForm();
                  setOwnerDialogOpen(false);
                }}
                className="w-full sm:w-auto rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingOwner}
                className="w-full sm:w-auto rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingOwner ? "Saving..." : "Save owner"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isStatutoryDialogOpen}
        onOpenChange={setStatutoryDialogOpen}
      >
        <DialogContent className="max-w-3xl border border-blue-100 bg-white/95">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900">
              Add statutory registration
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Add a new statutory register record for this hospital.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStatutorySubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {statutoryFields.map((field) => (
                <label
                  key={field.key}
                  className="flex flex-col gap-2 text-sm font-medium text-gray-700"
                >
                  {field.label}
                  {field.type === "select" ? (
                    <select
                      name={field.key}
                      value={statutoryForm[field.key] || "none"}
                      onChange={handleStatutoryFormChange}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                    >
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || "text"}
                      name={field.key}
                      value={statutoryForm[field.key]}
                      onChange={handleStatutoryFormChange}
                      placeholder={field.placeholder}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                    />
                  )}
                </label>
              ))}
            </div>
            {statutoryCustomFields.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {statutoryCustomFields.map((field) => (
                  <label
                    key={field.id}
                    className="flex flex-col gap-2 text-sm font-medium text-gray-700"
                  >
                    {field.name}
                    <input
                      type={
                        field.field_type === "number"
                          ? "number"
                          : field.field_type === "date"
                            ? "date"
                            : "text"
                      }
                      value={statutoryForm.customValues?.[field.id] || ""}
                      onChange={(event) =>
                        setStatutoryForm((prev) => ({
                          ...prev,
                          customValues: {
                            ...(prev.customValues || {}),
                            [field.id]: event.target.value,
                          },
                        }))
                      }
                      placeholder={`Enter ${field.name}`}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </label>
                ))}
              </div>
            )}

            {/* <button
              type="button"
              onClick={() => {
                setCustomFieldName("");
                setCustomFieldType("text");
                setCustomFieldError("");
                setCustomFieldDialogOpen(true);
              }}
              className="w-full rounded-xl border border-blue-200 px-4 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Add custom field
            </button> */}

            {statutoryError && (
              <p className="text-sm text-red-500">{statutoryError}</p>
            )}

            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  resetStatutoryForm();
                  setStatutoryDialogOpen(false);
                }}
                className="w-full sm:w-auto rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingStatutory}
                className="w-full sm:w-auto rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingStatutory ? "Saving..." : "Save register"}
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

      <ImageCropDialog
        key={imageCropDialog.sourceUrl || "image-crop-vidya"}
        open={imageCropDialog.open}
        sourceUrl={imageCropDialog.sourceUrl}
        fileName={imageCropDialog.fileName}
        isSubmitting={
          imageCropDialog.target === "profile"
            ? isUploadingProfileImage
            : isUploadingCompanyLogo
        }
        title="Crop image"
        description="Adjust image position before uploading."
        confirmLabel="Crop & upload"
        onCancel={closeImageCropDialog}
        onConfirm={handleImageCropConfirm}
        onError={(message) => {
          if (imageCropDialog.target === "profile") {
            setProfileImageError(message);
            return;
          }
          setCompanyLogoError(message);
        }}
      />

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
