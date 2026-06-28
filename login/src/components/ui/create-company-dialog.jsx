"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  createCompanyAccount,
  getAllCountries,
  getAllStates,
  getOrganizationUserDetails,
  sendOrganizationEmailOtp,
  verifyOrganizationEmailOtp,
  updateCompanyInfo,
} from "@/app/api/apiService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, EyeOff } from "lucide-react";

const GROUP_SUBGROUP_MAP = {
  Vidya: ["School", "Skill", "College"],
  Swasthya: ["Hospital", "Clinic"],
  Ashram: ["Ashram"],
};

const SCHOOL_CATEGORY_OPTIONS = ["Primary", "Secondary", "Higher Secondary"];

const INITIAL_FORM_STATE = {
  id: "",
  company_id: "",
  organization_id: "",
  company_name: "",
  location: "",
  school_code: "",
  district: "",
  start_date: "",
  admin_name: "",
  username: "",
  email: "",
  phone_number: "",
  password: "",
  address: "",
  city: "",
  state: "",
  country: "",
  pin: "",
  main_group: "Vidya",
  sub_group: "School",
  school_category: "",
};

const getCodePart = (value, length = 3) =>
  (() => {
    const raw = String(value || "").trim();
    if (!raw) {
      return "";
    }

    const words = raw
      .split(/\s+/)
      .map((word) => word.replace(/[^a-zA-Z0-9]/g, ""))
      .filter(Boolean);

    if (words.length > 1) {
      return words
        .map((word) => word[0])
        .join("")
        .toLowerCase()
        .slice(0, length);
    }

    return raw
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, length);
  })();

const generateSchoolCode = (companyName, location) => {
  const companyPart = getCodePart(companyName);
  const locationPart = getCodePart(location);

  if (!companyPart && !locationPart) {
    return "";
  }
  if (!locationPart) {
    return companyPart;
  }
  if (!companyPart) {
    return locationPart;
  }
  return `${companyPart}-${locationPart}`;
};

const getFirstNamePart = (adminName) =>
  String(adminName || "")
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getSchoolCodePartForUsername = (schoolCode) =>
  String(schoolCode || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");

const generateCompanyUsernamePart = (companyName) => {
  const normalized = String(companyName || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);

  if (!tokens.length) {
    return "";
  }

  return tokens
    .map((token) => (/^\d+$/.test(token) ? token : token[0]))
    .join("");
};

const generateUsername = (companyName, adminName, schoolCode) => {
  const firstNamePart = getFirstNamePart(adminName);
  const schoolCodePart = getSchoolCodePartForUsername(schoolCode);

  if (firstNamePart && schoolCodePart) {
    return `${firstNamePart}.${schoolCodePart}`;
  }

  if (firstNamePart) {
    return firstNamePart;
  }

  const companyPart = generateCompanyUsernamePart(companyName);
  if (companyPart) {
    return companyPart;
  }

  if (schoolCodePart) {
    return schoolCodePart;
  }

  return "";
};

const resolveApiError = (error) => {
  const responseData = error?.response?.data;
  return (
    responseData?.detail ||
    responseData?.error ||
    responseData?.message ||
    responseData?.organization_id?.[0] ||
    responseData?.company_name?.[0] ||
    responseData?.username?.[0] ||
    responseData?.email?.[0] ||
    responseData?.phone_number?.[0] ||
    responseData?.password?.[0] ||
    (typeof responseData === "string" ? responseData : null) ||
    error?.message ||
    "Unable to create company."
  );
};

const CreateCompanyDialog = forwardRef(
  ({ organizations = [], onSuccess }, ref) => {
    const [open, setOpen] = useState(false);
    const [formValues, setFormValues] = useState(INITIAL_FORM_STATE);
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dialogMode, setDialogMode] = useState("create");
    const [isGroupPreset, setIsGroupPreset] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [verifiedEmail, setVerifiedEmail] = useState("");
    const [isOtpDialogOpen, setOtpDialogOpen] = useState(false);
    const [otpValue, setOtpValue] = useState("");
    const [otpError, setOtpError] = useState("");
    const [otpMessage, setOtpMessage] = useState("");
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [selectedCountryCode, setSelectedCountryCode] = useState("");
    const [isLoadingCountries, setIsLoadingCountries] = useState(false);
    const [isLoadingStates, setIsLoadingStates] = useState(false);

    const organizationLookup = useMemo(
      () =>
        (organizations || []).reduce((acc, org) => {
          if (org?.id) {
            acc[String(org.id)] = org;
          }
          if (org?.name) {
            acc[String(org.name).toLowerCase()] = org;
          }
          return acc;
        }, {}),
      [organizations],
    );

    const subGroupOptions = useMemo(
      () => GROUP_SUBGROUP_MAP[formValues.main_group] || [],
      [formValues.main_group],
    );

    useEffect(() => {
      if (!open) {
        return;
      }

      let mounted = true;

      const hydrateLoggedInOrganization = async () => {
        const username =
          typeof window !== "undefined" ? localStorage.getItem("username") : "";
        if (!username) {
          return;
        }

        try {
          const organizationUserDetails = await getOrganizationUserDetails(username);
          if (!mounted || !organizationUserDetails) {
            return;
          }

          const organizationName = String(
            organizationUserDetails?.organization_name || "",
          ).trim();

          const directOrganizationId =
            organizationUserDetails?.organization_id ||
            organizationUserDetails?.organization ||
            "";

          const fallbackOrganizationId =
            organizationName &&
            organizationLookup[organizationName.toLowerCase()]?.id
              ? organizationLookup[organizationName.toLowerCase()]?.id
              : "";

          const resolvedOrganizationId = String(
            directOrganizationId || fallbackOrganizationId || "",
          );

          setFormValues((prev) => {
            const nextOrganizationId = prev.organization_id || resolvedOrganizationId;

            return {
              ...prev,
              organization_id: nextOrganizationId,
            };
          });

          if (organizationName && typeof window !== "undefined") {
            localStorage.setItem("selected_organization_name", organizationName);
          }
        } catch (_error) {
          // Keep manual organization selection as fallback.
        }
      };

      hydrateLoggedInOrganization();

      return () => {
        mounted = false;
      };
    }, [open, dialogMode, organizationLookup]);

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
          setCountries(countryList);
        } catch (error) {
          if (cancelled) {
            return;
          }
          console.error("Failed to load countries:", error);
          setCountries([]);
        } finally {
          if (cancelled) {
            return;
          }
          setIsLoadingCountries(false);
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

      if (!formValues.country) {
        setSelectedCountryCode("");
        setStates([]);
        return;
      }

      const matchedCountry = countries.find(
        (country) =>
          country.name?.toLowerCase() === formValues.country.toLowerCase(),
      );

      const nextCountryCode = matchedCountry?.alpha_2 || "";
      if (nextCountryCode && nextCountryCode !== selectedCountryCode) {
        setSelectedCountryCode(nextCountryCode);
      }
    }, [countries, formValues.country, selectedCountryCode]);

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
          const names = stateList.map((state) => state.name).filter(Boolean);
          setStates(names);
        } catch (error) {
          if (cancelled) {
            return;
          }
          console.error("Failed to load states:", error);
          setStates([]);
        } finally {
          if (cancelled) {
            return;
          }
          setIsLoadingStates(false);
        }
      };

      loadStates();
      return () => {
        cancelled = true;
      };
    }, [selectedCountryCode]);

    const openDialog = useCallback(
      ({
        organizationName,
        organizationId,
        group,
        subGroup,
        mainCategory,
        subCategory,
        initialValues = {},
        mode = "create",
      } = {}) => {
        setDialogMode(mode);
        setErrorMessage("");

        const resolvedOrganizationId =
          organizationId && String(organizationId)
            ? String(organizationId)
            : organizationName &&
              organizationLookup[String(organizationName).toLowerCase()]?.id
            ? String(organizationLookup[String(organizationName).toLowerCase()]?.id)
            : initialValues?.organization_id || "";

        const baseValues =
          mode === "update"
            ? { ...INITIAL_FORM_STATE, ...initialValues }
            : { ...INITIAL_FORM_STATE };

        const resolvedGroup =
          group ||
          mainCategory ||
          baseValues.main_group ||
          baseValues.main_category ||
          baseValues.group ||
          "Vidya";
        const resolvedSubGroup =
          subGroup ||
          subCategory ||
          baseValues.sub_group ||
          baseValues.sub_category ||
          "School";
        const resolvedSchoolCategory =
          baseValues.school_category || baseValues.schoolCategory || "";

        setIsGroupPreset(mode !== "update" && Boolean(resolvedGroup && resolvedSubGroup));

        setFormValues({
          ...baseValues,
          organization_id: resolvedOrganizationId || baseValues.organization_id,
          school_code:
            baseValues.school_code ||
            generateSchoolCode(baseValues.company_name, baseValues.location),
          main_group: resolvedGroup,
          sub_group: resolvedSubGroup,
          school_category: resolvedSchoolCategory,
          password: mode === "update" ? "" : baseValues.password,
        });
        setOpen(true);
      },
      [organizationLookup],
    );

    const resetForm = useCallback(() => {
      setFormValues({ ...INITIAL_FORM_STATE });
      setErrorMessage("");
      setDialogMode("create");
      setIsGroupPreset(true);
      setShowPassword(false);
      setVerifiedEmail("");
      setOtpDialogOpen(false);
      setOtpValue("");
      setOtpError("");
      setOtpMessage("");
      setSelectedCountryCode("");
      setStates([]);
    }, []);

    const handleClose = useCallback(() => {
      setOpen(false);
      resetForm();
    }, [resetForm]);

    useImperativeHandle(
      ref,
      () => ({
        open: openDialog,
        close: handleClose,
      }),
      [handleClose, openDialog],
    );

    const handleChange = (event) => {
      const { name, value } = event.target;
      setFormValues((prev) => {
        if (name === "email") {
          const normalizedEmail = String(value || "").trim().toLowerCase();
          if (normalizedEmail !== verifiedEmail) {
            setVerifiedEmail("");
          }
          setOtpError("");
          setOtpMessage("");
        }
        const nextValues = {
          ...prev,
          [name]: value,
          ...(name === "main_group" ? { sub_group: "", school_category: "" } : {}),
          ...(name === "sub_group" && value !== "School" ? { school_category: "" } : {}),
        };

        if (name === "company_name" || name === "location") {
          const nextCompanyName =
            name === "company_name" ? value : nextValues.company_name;
          const nextLocation = name === "location" ? value : nextValues.location;
          nextValues.school_code = generateSchoolCode(nextCompanyName, nextLocation);
        }

        if (name === "admin_name" || name === "company_name" || name === "location") {
          nextValues.username = generateUsername(
            nextValues.company_name,
            name === "admin_name" ? value : nextValues.admin_name,
            nextValues.school_code,
          );
        }

        return nextValues;
      });
    };

    const handleLocationBlur = async () => {
      if (dialogMode === "update") {
        return;
      }

      const companyName = String(formValues.company_name || "").trim();
      const location = String(formValues.location || "").trim();
      if (!companyName || !location) {
        return;
      }

      const username =
        typeof window !== "undefined" ? localStorage.getItem("username") : "";
      if (!username) {
        return;
      }

      try {
        const organizationUserDetails = await getOrganizationUserDetails(username);
        const loggedInAdminName = String(
          organizationUserDetails?.name ||
            organizationUserDetails?.full_name ||
            organizationUserDetails?.first_name ||
            organizationUserDetails?.username ||
            "",
        ).trim();
        if (!loggedInAdminName) {
          return;
        }

        setFormValues((prev) => {
          const nextSchoolCode =
            prev.school_code ||
            generateSchoolCode(prev.company_name, prev.location);
          return {
            ...prev,
            admin_name: loggedInAdminName,
            username: generateUsername(
              prev.company_name,
              loggedInAdminName,
              nextSchoolCode,
            ),
          };
        });
      } catch (_error) {
        // Keep existing admin name if fetch fails.
      }
    };

    const handleCountryChange = (event) => {
      const value = event.target.value;
      const matchedCountry = countries.find(
        (country) => country.name === value,
      );

      setSelectedCountryCode(matchedCountry?.alpha_2 || "");
      setFormValues((prev) => ({
        ...prev,
        country: value,
        state: "",
      }));
    };

    const handleStateChange = (event) => {
      setFormValues((prev) => ({ ...prev, state: event.target.value }));
    };

    const handleSendOtp = async () => {
      const normalizedEmail = String(formValues.email || "").trim().toLowerCase();
      if (!normalizedEmail) {
        setErrorMessage("Email is required.");
        return;
      }

      try {
        setIsSendingOtp(true);
        setErrorMessage("");
        setOtpError("");
        setOtpMessage("");
        await sendOrganizationEmailOtp(normalizedEmail);
        setOtpDialogOpen(true);
        setOtpMessage(`OTP sent to ${normalizedEmail}.`);
      } catch (error) {
        setErrorMessage(resolveApiError(error));
      } finally {
        setIsSendingOtp(false);
      }
    };

    const handleVerifyOtp = async (event) => {
      event.preventDefault();
      const normalizedEmail = String(formValues.email || "").trim().toLowerCase();
      if (!normalizedEmail) {
        setOtpError("Email is required.");
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
        setOtpError(resolveApiError(error));
      } finally {
        setIsVerifyingOtp(false);
      }
    };

    const handleSubmit = async (event) => {
      event.preventDefault();
      setErrorMessage("");

      const normalize = (value) =>
        typeof value === "string" ? value.trim() : value || "";
      const hasValue = (value) =>
        value !== undefined && value !== null && String(value).trim() !== "";

      const normalizedValues = {
        organization_id: formValues.organization_id,
        company_name: normalize(formValues.company_name),
        location: normalize(formValues.location),
        school_code: normalize(formValues.school_code),
        district: normalize(formValues.district),
        start_date: normalize(formValues.start_date),
        admin_name: normalize(formValues.admin_name),
        username: normalize(formValues.username),
        email: normalize(formValues.email).toLowerCase(),
        phone_number: normalize(formValues.phone_number),
        password: formValues.password,
        address: normalize(formValues.address),
        city: normalize(formValues.city),
        state: normalize(formValues.state),
        country: normalize(formValues.country),
        pin: normalize(formValues.pin),
        main_group: normalize(formValues.main_group),
        sub_group: normalize(formValues.sub_group),
        school_category: normalize(formValues.school_category),
      };

      const isUpdateMode = dialogMode === "update";
      const isEmailVerified =
        Boolean(normalizedValues.email) && verifiedEmail === normalizedValues.email;

      if (!normalizedValues.organization_id) {
        setErrorMessage("Organization is required.");
        return;
      }
      if (!normalizedValues.company_name) {
        setErrorMessage("Company name is required.");
        return;
      }
      if (!normalizedValues.admin_name) {
        setErrorMessage("Admin name is required.");
        return;
      }
      if (!normalizedValues.username) {
        setErrorMessage("Username is required.");
        return;
      }
      if (!isUpdateMode && !normalizedValues.password) {
        setErrorMessage("Password is required.");
        return;
      }
      if (!normalizedValues.main_group) {
        setErrorMessage("Group is required.");
        return;
      }
      if (!normalizedValues.sub_group) {
        setErrorMessage("Sub-group is required.");
        return;
      }
      if (!isUpdateMode && normalizedValues.email && !isEmailVerified) {
        const targetLabel = (normalizedValues.sub_group || "company").toLowerCase();
        setErrorMessage(`Verify email with OTP before creating the ${targetLabel}.`);
        return;
      }
      if (
        normalizedValues.sub_group.toLowerCase() === "school" &&
        !normalizedValues.school_category
      ) {
        setErrorMessage("School category is required.");
        return;
      }

      try {
        setIsSubmitting(true);
        if (isUpdateMode) {
          const updateFieldMap = {
            organization_id: normalizedValues.organization_id,
            company_name: normalizedValues.company_name,
            location: normalizedValues.location,
            school_code: normalizedValues.school_code,
            district: normalizedValues.district,
            start_date: normalizedValues.start_date,
            admin_name: normalizedValues.admin_name,
            email: normalizedValues.email,
            mobile_no: normalizedValues.phone_number,
            username: normalizedValues.username,
            address: normalizedValues.address,
            city: normalizedValues.city,
            pin: normalizedValues.pin,
            country: normalizedValues.country,
            head_office_state: normalizedValues.state,
            main_group: normalizedValues.main_group,
            sub_group: normalizedValues.sub_group,
            school_category: normalizedValues.school_category,
            password: normalize(formValues.password),
          };

          const updatePayload = {
            id: formValues.id,
            company_id: formValues.company_id,
          };
          Object.entries(updateFieldMap).forEach(([key, value]) => {
            if (hasValue(value)) {
              updatePayload[key] = value;
            }
          });
          await updateCompanyInfo(updatePayload);
        } else {
          await createCompanyAccount({
            organization_id: normalizedValues.organization_id,
            company_name: normalizedValues.company_name,
            location: normalizedValues.location,
            school_code: normalizedValues.school_code,
            district: normalizedValues.district,
            start_date: normalizedValues.start_date,
            admin_name: normalizedValues.admin_name,
            username: normalizedValues.username,
            email: normalizedValues.email,
            phone_number: normalizedValues.phone_number,
            password: normalizedValues.password,
            address: normalizedValues.address,
            city: normalizedValues.city,
            state: normalizedValues.state,
            country: normalizedValues.country,
            pin: normalizedValues.pin,
            main_group: normalizedValues.main_group,
            sub_group: normalizedValues.sub_group,
            school_category: normalizedValues.school_category,
            is_verified: true,
            is_approved: false,
          });
        }
        handleClose();
        onSuccess?.();
      } catch (error) {
        const detail = resolveApiError(error);
        setErrorMessage(String(detail));
      } finally {
        setIsSubmitting(false);
      }
    };
    const entityLabel =
      formValues.sub_group === "Hospital"
        ? "Hospital"
        : formValues.sub_group === "Clinic"
        ? "Clinic"
        : formValues.sub_group === "College"
        ? "College"
        : formValues.sub_group === "Skill"
        ? "Skill Dev Center"
        : "School";
    const entityLabelLower = entityLabel.toLowerCase();
    const entityPluralLower =
      entityLabel === "Hospital"
        ? "hospitals"
        : entityLabel === "Clinic"
        ? "clinics"
        : entityLabel === "Skill Dev Center"
        ? "skill dev centers"
        : "schools";

    // School and other will be treated as company 
    const isVidyaCreate = dialogMode !== "update" && formValues.main_group === "Vidya";
    const dialogTitle = isVidyaCreate
      ? formValues.sub_group === "Skill"
        ? "Create New Skill Dev Center"
        : formValues.sub_group === "College"
        ? "Create New College"
        : "Create New School"
      : dialogMode === "update"
      ? `Update ${entityLabel}`
      : "Create Company";

    const dialogDescription = isVidyaCreate
      ? formValues.sub_group === "Skill"
        ? "Provision a skill dev center record and administrative user for your organization."
        : formValues.sub_group === "College"
        ? "Provision a college record and administrative user for your organization."
        : "Provision a school record and administrative user for your organization."
      : dialogMode === "update"
      ? "Update the selected company profile."
      : "Provision a company record and administrative user for your organization.";

    const contextMessage =
      dialogMode !== "update" && formValues.main_group && formValues.sub_group
        ? `Under ${formValues.main_group} Group`
        // ${formValues.sub_group} is Creating
        : "";
    const selectedOrganizationName = useMemo(() => {
      const selectedOrganizationId = String(formValues.organization_id || "");
      if (
        selectedOrganizationId &&
        organizationLookup[selectedOrganizationId]?.name
      ) {
        return organizationLookup[selectedOrganizationId].name;
      }

      if (typeof window !== "undefined") {
        return localStorage.getItem("selected_organization_name") || "";
      }

      return "";
    }, [formValues.organization_id, organizationLookup]);
    const normalizedEmail = String(formValues.email || "").trim().toLowerCase();
    const isEmailVerified =
      Boolean(normalizedEmail) && verifiedEmail === normalizedEmail;

    return (
      <>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            if (!value) {
              handleClose();
            } else {
              setOpen(true);
            }
          }}
        >
          <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] md:w-full md:max-w-3xl xl:max-w-[1100px] max-h-[92dvh] rounded-[28px] sm:rounded-[32px] border border-slate-200 bg-gradient-to-b from-white/95 to-[#f6f8fc] p-3 sm:p-5 lg:p-8 shadow-[0_26px_60px_rgba(15,23,42,0.25)] overflow-hidden">
          <DialogHeader className="space-y-1 text-left">
            <p className="break-words pr-8 text-3xl font-medium text-slate-600 sm:text-4xl">              
              <span className="font-semibold text-slate-900">
                {selectedOrganizationName || "Not available"}
              </span>
            </p>
            <DialogTitle className="text-2xl text-center font-semibold text-slate-900 gap-0 p-0 m-0">
              {dialogTitle}
            </DialogTitle>
            <span className="text-2md text-center font-semibold text-slate-900">{contextMessage || dialogDescription}</span>
          </DialogHeader>

          <div className="mt-2 max-h-[calc(92dvh-12rem)] overflow-y-auto overflow-x-hidden pr-1 sm:pr-0 flex flex-col">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
                <label className="flex min-w-0 flex-col gap-2 col-span-1 md:col-span-2 xl:col-span-6 text-sm font-medium text-slate-700">
                  <span className="font-semibold">
                   {entityLabel} Name <span className="text-rose-600">*</span>
                  </span>
                  <input
                    type="text"
                    name="company_name"
                    value={formValues.company_name}
                    onChange={handleChange}
                    placeholder="Sunrise Health"
                    required
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>

                <label className="flex min-w-0 flex-col gap-2 col-span-1 xl:col-span-3 text-sm font-medium text-slate-700">
                  <span className="font-semibold">
                   {entityLabel} Location <span className="text-rose-600">*</span>
                  </span>
                  <input
                    type="text"
                    name="location"
                    value={formValues.location}
                    onChange={handleChange}
                    onBlur={handleLocationBlur}
                    placeholder="Location Name"
                    required
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
                {formValues.sub_group === "School" && (
                  <label className="flex min-w-0 flex-col gap-2 col-span-1 xl:col-span-3 text-sm font-medium text-slate-700">
                    <span className="font-semibold">
                      School Category <span className="text-rose-600">*</span>
                    </span>
                    <select
                      name="school_category"
                      value={formValues.school_category}
                      onChange={handleChange}
                      required
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="">Select school category</option>
                      {SCHOOL_CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="flex min-w-0 flex-col gap-2 col-span-1 xl:col-span-2 text-sm font-medium text-slate-700">
                  <span className="font-semibold">
                    {entityLabel} Code <span className="text-rose-600">*</span>
                  </span>
                  <input
                    type="text"
                    name="school_code"
                    value={formValues.school_code}
                    readOnly
                    placeholder="Auto-generated from Name and Location"
                    required
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-2 col-span-1 md:col-span-2 xl:col-span-6 text-sm font-medium text-slate-700">
                  <span className="font-semibold">
                    {entityLabel} Admin name <span className="text-rose-600">*</span>
                  </span>
                  <input
                    type="text"
                    name="admin_name"
                    value={formValues.admin_name}
                    readOnly
                    placeholder="Admin Name"
                    required
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>

                <label className="flex min-w-0 flex-col gap-2 col-span-1 md:col-span-2 xl:col-span-4 text-sm font-medium text-slate-700">
                  <span className="font-semibold">
                    {entityLabel} Admin New User Id <span className="text-rose-600">*</span>
                  </span>
                  <input
                    type="text"
                    name="username"
                    value={formValues.username}
                    readOnly
                    placeholder="sunrise.admin"
                    required
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>

                <label className="flex min-w-0 flex-col gap-2 col-span-1 md:col-span-2 xl:col-span-4 text-sm font-medium text-slate-700">
                  <span className="font-semibold">
                    {entityLabel} Admin Email&nbsp;
                  <span className="text-xs font-normal">(Optional)</span>
                  </span>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        name="email"
                        value={formValues.email}
                        onChange={handleChange}
                        placeholder="admin@sunrisehealth.com"
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                      />
                      {dialogMode !== "update" ? (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp || !normalizedEmail}
                          className="shrink-0 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSendingOtp ? "Sending..." : isEmailVerified ? "Verified" : "Verify"}
                        </button>
                      ) : null}
                    </div>
                    {dialogMode !== "update" ? (
                      <span
                        className={`text-xs ${
                          isEmailVerified ? "text-emerald-600" : "text-slate-500"
                        }`}
                      >
                        {isEmailVerified
                          ? `Email verified. You can create the ${entityLabelLower}.`
                          : `Send OTP to the email, verify it, then create the ${entityLabelLower}.`}
                      </span>
                    ) : null}
                  </div>
                </label>

                <label className="flex min-w-0 flex-col gap-2 col-span-1 xl:col-span-4 text-sm font-medium text-slate-700">
                  <span className="font-semibold">
                    {entityLabel} Admin Phone number&nbsp;
                     <span className="text-xs font-normal">(Optional)</span>
                  </span>
                  <input
                    type="text"
                    name="phone_number"
                    value={formValues.phone_number}
                    onChange={handleChange}
                    placeholder="9888888888"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-2 col-span-1 md:col-span-2 xl:col-span-4 text-sm font-medium text-slate-700">
                  <span className="font-semibold">
                    School Admin&apos;s Password{" "}
                    {dialogMode !== "update" ? (
                      <span className="text-rose-600">*</span>
                    ) : (
                      <span className="text-xs font-normal">(Optional)</span>
                    )}
                  </span>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formValues.password}
                      onChange={handleChange}
                      placeholder={
                        dialogMode === "update"
                          ? "Password cannot be changed from update form"
                          : "Create a temporary password"
                      }
                      required={dialogMode !== "update"}
                      disabled={dialogMode === "update"}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 pr-11 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      disabled={dialogMode === "update"}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 transition hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </label>
                 <label className="flex min-w-0 flex-col col-span-1 md:col-span-2 xl:col-span-12 gap-3 text-sm font-medium text-slate-700">
                  <span className="font-semibold">
                    Address <span className="text-rose-600">*</span>
                  </span>
                  <input
                    type="text"
                    name="address"
                    value={formValues.address}
                    onChange={handleChange}
                    placeholder="MG Road"
                    required
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
                <label className="flex flex-col gap-2 col-span-1 xl:col-span-3 text-sm font-medium text-slate-700">
                  <span className="font-semibold">Country</span>
                  <select
                    name="country"
                    value={formValues.country}
                    onChange={handleCountryChange}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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

                <label className="flex min-w-0 flex-col gap-2 col-span-1 xl:col-span-3 text-sm font-medium text-slate-700">
                  <span className="font-semibold">
                    State <span className="text-rose-600">*</span>
                  </span>
                  <select
                    name="state"
                    value={formValues.state}
                    onChange={handleStateChange}
                    required
                    disabled={!selectedCountryCode || isLoadingStates}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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

                <label className="flex min-w-0 flex-col gap-2 col-span-1 xl:col-span-3 text-sm font-medium text-slate-700">
                  <span className="font-semibold">
                    District <span className="text-rose-600">*</span>
                  </span>
                  <input
                    type="text"
                    name="district"
                    value={formValues.district}
                    onChange={handleChange}
                    placeholder="Pune"
                    required
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>

                {/* <label className="flex flex-col gap-2 col-span-2 text-sm font-medium text-slate-700">
                  <span className="font-semibold">City</span>
                  <input
                    type="text"
                    name="city"
                    value={formValues.city}
                    onChange={handleChange}
                    placeholder="Pune"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label> */}


                

                <label className="flex min-w-0 flex-col gap-2 col-span-1 xl:col-span-3 text-sm font-medium text-slate-700">
                  <span className="font-semibold">
                    Pin Code <span className="text-rose-600">*</span>
                  </span>
                  <input
                    type="text"
                    name="pin"
                    value={formValues.pin}
                    onChange={handleChange}
                    placeholder="411001"
                    required
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>

                

                

                <label className="flex min-w-0 flex-col gap-2 col-span-1 xl:col-span-3 text-sm font-medium text-slate-700">
                  <span className="font-semibold">
                    {entityLabel} Starting Date <span className="text-rose-600">*</span>
                  </span>
                  <input
                    type="date"
                    name="start_date"
                    value={formValues.start_date}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>

                {/* <div className="col-span-full rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-slate-800">
                  Company ID is auto-generated based on the company name.
                </div> */}

                

               
              </div>

              {errorMessage && <p className="text-sm text-rose-600">{errorMessage}</p>}

              <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-3 text-xs leading-relaxed text-slate-700 sm:text-2sm">
                <p>
                  <span className="font-semibold">Note:</span> 1. Only Level 2 user of
                  <span className="font-semibold"> {formValues.main_group} Group</span> will be able to create
                  new {entityLabelLower}.
                </p>
                <p>
                  2. After filling up of all informations and by clicking Submit button, the
                  new {entityLabel} will be created. Then the newly created {entityLabelLower} will be visible in
                  the list of {entityPluralLower}.
                </p>
                <p>
                  3. After creation of {entityLabelLower}, {entityLabel} admin will log out from Organization
                  portal. Then he will again login with his {entityLabelLower} user ID and password.
                </p>
                <p className="text-rose-600">
                  4. {entityLabel} code once created can not be changed, as all users are identified
                  with the {entityLabelLower} code.
                </p>
              </div>

              <div className="flex flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (dialogMode !== "update" && Boolean(normalizedEmail) && !isEmailVerified)
                  }
                  className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting
                    ? dialogMode === "update"
                      ? "Updating..."
                      : "Creating..."
                    : dialogMode === "update"
                    ? `Update ${entityLabel}`
                    : `Create ${entityLabel}`}
                </button>
              </div>
            </form>
          </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isOtpDialogOpen}
          onOpenChange={(value) => {
            setOtpDialogOpen(value);
            if (!value) {
              setOtpValue("");
              setOtpError("");
            }
          }}
        >
          <DialogContent className="max-w-md rounded-[28px] border border-slate-200 bg-white p-0">
            <div className="p-6">
              <DialogHeader>
                <DialogTitle className="text-xl text-slate-900">Verify Email</DialogTitle>
                <DialogDescription className="text-sm text-slate-500">
                  Enter the OTP sent to {normalizedEmail || "your email"}.
                </DialogDescription>
              </DialogHeader>

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
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                {otpError ? <p className="text-sm text-rose-600">{otpError}</p> : null}
                {otpMessage ? <p className="text-sm text-emerald-600">{otpMessage}</p> : null}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp}
                    className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSendingOtp ? "Sending..." : "Resend OTP"}
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingOtp}
                    className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isVerifyingOtp ? "Verifying..." : "Verify"}
                  </button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  },
);

CreateCompanyDialog.displayName = "CreateCompanyDialog";

export default CreateCompanyDialog;
