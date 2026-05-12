"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  clearLoginSession,
  getCompanyInfo,
  getOrganizationUsers,
  updateOrganizationUser,
  createOrganizationUser,
  getOrganizationUserDetails,
  sendOrganizationEmailOtp,
  verifyOrganizationEmailOtp,
} from "@/app/api/apiService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateValue } from "@/lib/companyLocale";

const organizationUserLevelOptions = ["Level1", "Level2"];
const organizationUserRoleOptions = [
  "admin",
  "user",
  "IT Admin",
  "Secretary",
  "Chief Admin",
];
const organizationUserCategoryOptions = ["Vidya", "Swasthya", "Ashram"];

const formatDate = (value) => formatDateValue(value, { fallback: "-" });

const sanitizeUsernamePart = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const sanitizeOrgCode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 6);

const getUsernameBase = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) {
    return "";
  }
  const base = raw.split(".")[0] || "";
  return sanitizeUsernamePart(base);
};

const getOrgCodeFromUsername = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw.includes(".")) {
    return "";
  }
  const suffix = raw.split(".").pop() || "";
  return sanitizeOrgCode(suffix);
};

const buildUsernameWithOrgCode = (name, orgCode) => {
  const base = sanitizeUsernamePart(name);
  const normalizedOrgCode = sanitizeOrgCode(orgCode);
  if (!base || !normalizedOrgCode) {
    return "";
  }
  return `${base}.${normalizedOrgCode}`;
};

export default function OrganizationAccessControlPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [isEditRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [categorySelections, setCategorySelections] = useState([]);
  const [isAccessBlockedDialogOpen, setAccessBlockedDialogOpen] = useState(false);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createError, setCreateError] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [isOtpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [createCategorySelections, setCreateCategorySelections] = useState([]);
  const [createForm, setCreateForm] = useState({
    name: "",
    username: "",
    org_code: "",
    email: "",
    phone_number: "",
    level: "",
    role: "user",
  });
  const [roleForm, setRoleForm] = useState({
    level: "",
    role: "",
    category: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState("");
  const [isPendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [organizationId, setOrganizationId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [currentUserLevel, setCurrentUserLevel] = useState("");
  const [adminDerivedOrgCode, setAdminDerivedOrgCode] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setOrganizationId(localStorage.getItem("organization_id") || "");
    setOrganizationName(localStorage.getItem("selected_organization_name") || "");
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError("");
        let orgId =
          (typeof window !== "undefined" &&
            localStorage.getItem("organization_id")) ||
          "";
        if (!orgId) {
          const username =
            (typeof window !== "undefined" &&
              localStorage.getItem("username")) ||
            "";
          if (username) {
            const details = await getOrganizationUserDetails(username);
            orgId = details?.organization_id
              ? String(details.organization_id)
              : details?.organization
                ? String(details.organization)
                : "";
            if (orgId) {
              localStorage.setItem("organization_id", orgId);
              localStorage.setItem("company_id", orgId);
              setOrganizationId(orgId);
            }
          }
        }
        if (!orgId) {
          if (!mounted) {
            return;
          }
          setUsers([]);
          setLoading(false);
          return;
        }
        const localePromise = getCompanyInfo(orgId).catch(() => null);
        const usersPromise = getOrganizationUsers({
          organization_id: orgId || undefined,
        });
        const [response] = await Promise.all([usersPromise, localePromise]);
        if (!mounted) {
          return;
        }
        setUsers(Array.isArray(response) ? response : []);
      } catch (err) {
        if (!mounted) {
          return;
        }
        setError("Unable to load organization users.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadUsers();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!openActionMenu) {
      return undefined;
    }
    const handlePointerDown = (event) => {
      if (!event.target.closest("[data-user-action-menu]")) {
        setOpenActionMenu(null);
      }
    };
    const closeMenu = () => setOpenActionMenu(null);
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [openActionMenu]);

  useEffect(() => {
    let mounted = true;
    const loadCurrentUserLevel = async () => {
      try {
        const username =
          (typeof window !== "undefined" &&
            localStorage.getItem("username")) ||
          "";
        if (!username) {
          return;
        }
        const details = await getOrganizationUserDetails(username);
        if (!mounted) {
          return;
        }
        const level = details?.level || "";
        setCurrentUserLevel(level);
        setAccessBlockedDialogOpen(level && level !== "Level1");
        const adminCode =
          sanitizeOrgCode(details?.org_code) ||
          sanitizeOrgCode(details?.organization_code) ||
          getOrgCodeFromUsername(details?.username);
        setAdminDerivedOrgCode(adminCode);
        const resolvedOrgName =
          details?.organization_name ||
          details?.organization_details?.organization_name ||
          details?.company_details?.organization_name ||
          details?.organizationInfo?.organization_name ||
          details?.companyInfo?.organization_name ||
          "";
        if (resolvedOrgName) {
          setOrganizationName(resolvedOrgName);
        }
      } catch (err) {
        if (mounted) {
          setCurrentUserLevel("");
          setAdminDerivedOrgCode("");
          setAccessBlockedDialogOpen(false);
        }
      }
    };

    loadCurrentUserLevel();
    return () => {
      mounted = false;
    };
  }, []);

  const reloadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      let orgId =
        (typeof window !== "undefined" &&
          localStorage.getItem("organization_id")) ||
        "";
      if (!orgId) {
        const username =
          (typeof window !== "undefined" && localStorage.getItem("username")) ||
          "";
        if (username) {
          const details = await getOrganizationUserDetails(username);
          orgId = details?.organization_id
            ? String(details.organization_id)
            : details?.organization
              ? String(details.organization)
              : "";
          if (orgId) {
            localStorage.setItem("organization_id", orgId);
            localStorage.setItem("company_id", orgId);
            setOrganizationId(orgId);
          }
        }
      }
      if (!orgId) {
        setUsers([]);
        return;
      }
      const localePromise = getCompanyInfo(orgId).catch(() => null);
      const usersPromise = getOrganizationUsers({
        organization_id: orgId || undefined,
      });
      const [response] = await Promise.all([usersPromise, localePromise]);
      setUsers(Array.isArray(response) ? response : []);
    } catch (err) {
      setError("Unable to load organization users.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearLoginSession();
    router.replace("/login");
  };

  const parseCategorySelections = (value) => {
    if (!value) {
      return [];
    }
    const normalized = String(value).trim();
    if (!normalized || normalized.toLowerCase() === "all") {
      return [];
    }
    return normalized
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const openEditRoleDialog = (user) => {
    setOpenActionMenu(null);
    setSelectedUser(user);
    setCategorySelections(parseCategorySelections(user?.category));
    setRoleForm({
      level: user?.level || "",
      role: user?.role || "user",
      category: user?.category || "",
    });
    setActionError("");
    setEditRoleDialogOpen(true);
  };

  const openConfirmDialog = (action, user) => {
    setOpenActionMenu(null);
    setSelectedUser(user);
    setConfirmAction(action);
    setActionError("");
    setConfirmDialogOpen(true);
  };

  const handleRoleFormChange = (event) => {
    const { name, value } = event.target;
    setRoleForm((prev) => {
      if (name === "level") {
        if (value === "Level1") {
          setCategorySelections([]);
          return {
            ...prev,
            level: value,
            role:
              prev.role && organizationUserRoleOptions.includes(prev.role)
                ? prev.role
                : "user",
            category: "all",
          };
        }
        if (value === "Level2") {
          return {
            ...prev,
            level: value,
            role:
              prev.role && organizationUserRoleOptions.includes(prev.role)
                ? prev.role
                : "user",
            category: prev.category === "all" ? "" : prev.category,
          };
        }
        return { ...prev, level: value };
      }
      return { ...prev, [name]: value };
    });
  };

  const toggleCategorySelection = (value) => {
    setCategorySelections((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const handleCreateFormChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((prev) => {
      if (name === "email") {
        const normalizedEmail = String(value || "").trim().toLowerCase();
        if (normalizedEmail !== verifiedEmail) {
          setVerifiedEmail("");
        }
        setOtpError("");
        setOtpMessage("");
      }
      if (name === "level") {
        if (value === "Level1") {
          setCreateCategorySelections([]);
          return {
            ...prev,
            level: value,
            role:
              prev.role && organizationUserRoleOptions.includes(prev.role)
                ? prev.role
                : "user",
          };
        }
        return {
          ...prev,
          level: value,
          role:
            prev.role && organizationUserRoleOptions.includes(prev.role)
              ? prev.role
            : "user",
        };
      }
      if (name === "name") {
        return {
          ...prev,
          name: value,
          username: buildUsernameWithOrgCode(
            value,
            prev.org_code || adminDerivedOrgCode || resolvedOrgCode,
          ),
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const resolvedOrgCode = useMemo(
    () => sanitizeOrgCode(adminDerivedOrgCode),
    [adminDerivedOrgCode],
  );

  useEffect(() => {
    if (!resolvedOrgCode) {
      return;
    }
    setCreateForm((prev) => {
      const nextUsername = buildUsernameWithOrgCode(
        prev.name || prev.username,
        resolvedOrgCode,
      );
      if (prev.org_code === resolvedOrgCode && prev.username === nextUsername) {
        return prev;
      }
      return {
        ...prev,
        org_code: resolvedOrgCode,
        username: nextUsername,
      };
    });
  }, [resolvedOrgCode]);

  const handleUsernameBlur = () => {
    setCreateForm((prev) => {
      const nextUsername = buildUsernameWithOrgCode(
        prev.name || prev.username,
        prev.org_code || resolvedOrgCode,
      );
      if (!nextUsername) {
        return prev;
      }
      return { ...prev, username: nextUsername };
    });
  };

  const toggleCreateCategorySelection = (value) => {
    setCreateCategorySelections((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: "",
      username: "",
      org_code: "",
      email: "",
      phone_number: "",
      level: "",
      role: "user",
    });
    setCreateCategorySelections([]);
    setCreateError("");
    setVerifiedEmail("");
    setOtpDialogOpen(false);
    setOtpValue("");
    setOtpError("");
    setOtpMessage("");
  };

  const handleSendOtp = async () => {
    const normalizedEmail = createForm.email.trim().toLowerCase();
    if (!normalizedEmail) {
      setCreateError("Email is required.");
      return;
    }

    try {
      setIsSendingOtp(true);
      setCreateError("");
      setOtpError("");
      setOtpMessage("");
      await sendOrganizationEmailOtp(normalizedEmail);
      setOtpDialogOpen(true);
      setOtpMessage(`OTP sent to ${normalizedEmail}.`);
    } catch (requestError) {
      const responseData = requestError.response?.data;
      setCreateError(
        responseData?.detail ||
          responseData?.error ||
          "Unable to send OTP.",
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    const normalizedEmail = createForm.email.trim().toLowerCase();
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
    } catch (requestError) {
      const responseData = requestError.response?.data;
      setOtpError(
        responseData?.detail ||
          responseData?.error ||
          "Unable to verify OTP.",
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    setCreateError("");
    const orgId =
      (typeof window !== "undefined" &&
        localStorage.getItem("organization_id")) ||
      "";
    if (!orgId) {
      setCreateError("Organization is not selected.");
      return;
    }
    if (createForm.level === "Level2" && createCategorySelections.length === 0) {
      setCreateError("Please select at least one category.");
      return;
    }
    const orgCode = sanitizeOrgCode(createForm.org_code || resolvedOrgCode);
    const normalizedEmail = createForm.email.trim().toLowerCase();
    if (!orgCode) {
      setCreateError("Unable to derive organization code from admin username.");
      return;
    }
    if (!normalizedEmail || verifiedEmail !== normalizedEmail) {
      setCreateError("Verify email with OTP before adding the organization user.");
      return;
    }
    const categoryValue =
      createForm.level === "Level1"
        ? "all"
        : createCategorySelections.join(", ");
    const usernameBase = getUsernameBase(createForm.name || createForm.username);
    const fullUsername = usernameBase
      ? `${usernameBase}.${orgCode}`
      : createForm.username.trim();
    if (!fullUsername) {
      setCreateError("Username could not be generated. Enter a valid name.");
      return;
    }
    const payload = {
      organization_id: Number(orgId),
      name: createForm.name.trim(),
      username: fullUsername.trim(),
      email: normalizedEmail,
      phone_number: createForm.phone_number.trim(),
      role: createForm.role || "user",
      level: createForm.level || "",
      category: categoryValue,
      is_verified: true,
    };
    try {
      setIsCreatingUser(true);
      await createOrganizationUser(payload);
      setCreateDialogOpen(false);
      resetCreateForm();
      await reloadUsers();
    } catch (err) {
      const responseData = err.response?.data || {};
      const message =
        responseData?.detail ||
        responseData?.error ||
        responseData?.username?.[0] ||
        responseData?.email?.[0] ||
        responseData?.phone_number?.[0] ||
        responseData?.organization_id?.[0] ||
        err.message ||
        "Unable to create organization user.";
      setCreateError(String(message));
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleEditRoleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedUser?.username) {
      setActionError("Username not available for this user.");
      return;
    }
    try {
      setIsUpdating(true);
      setActionError("");
      const categoryValue =
        roleForm.level === "Level1"
          ? "all"
          : categorySelections.length
            ? categorySelections.join(", ")
            : "";
      const payload = {
        level: roleForm.level || undefined,
        role: roleForm.role || undefined,
        category: categoryValue || undefined,
      };
      await updateOrganizationUser(selectedUser.username, payload);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedUser.id
            ? { ...user, ...payload }
            : user,
        ),
      );
      setEditRoleDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      setActionError("Unable to update role. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedUser?.username) {
      setActionError("Username not available for this user.");
      return;
    }
    const payload =
      confirmAction === "approve"
        ? { is_approve: true }
        : confirmAction === "delist"
          ? { delist: true }
          : {};
    try {
      setIsUpdating(true);
      setActionError("");
      await updateOrganizationUser(selectedUser.username, payload);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedUser.id
            ? { ...user, ...payload }
            : user,
        ),
      );
      setConfirmDialogOpen(false);
      setSelectedUser(null);
      setConfirmAction("");
    } catch (err) {
      setActionError("Unable to update user. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const approvedUsers = useMemo(
    () => users.filter((user) => user?.is_approve),
    [users],
  );

  const pendingUsers = useMemo(
    () => users.filter((user) => !user?.is_approve),
    [users],
  );

  const stats = useMemo(() => {
    const approved = approvedUsers.length;
    const pending = pendingUsers.length;
    const delisted = users.filter((user) => user?.delist).length;
    return { approved, pending, delisted };
  }, [approvedUsers, pendingUsers, users]);

  const normalizedCreateEmail = createForm.email.trim().toLowerCase();
  const isCreateEmailVerified =
    Boolean(normalizedCreateEmail) && verifiedEmail === normalizedCreateEmail;

  return (
    <>
      <main
        className={`min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 ${
          isAccessBlockedDialogOpen ? "pointer-events-none" : ""
        }`}
      >
        <header className="w-full bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    router.back();
                    return;
                  }
                  router.push("/organization-admin");
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M15 18 9 12l6-6" />
                </svg>
                Back
              </button>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
                Access control
              </p>
              <h1 className="text-3xl font-semibold text-slate-900">Organization Users</h1>
              <p className="text-sm text-slate-500">Review and manage who can access this organization.</p>
            </div>
            <div className="flex items-center gap-4">
              {/*
                Showing button for all screen widths; disable interaction unless user is Level1.
              */}
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(true)}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white p-2.5 text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                aria-label="Watch organization user setup video"
                title="Watch organization user setup video"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M10 8.8l5.2 3.2L10 15.2z" fill="currentColor" stroke="none" />
                </svg>
              </button>
              <button
                className={`rounded-full px-5 py-2.5 text-sm font-semibold text-white transition ${
                  currentUserLevel === "Level1"
                    ? "bg-slate-900 shadow-lg hover:bg-slate-800"
                    : "bg-slate-400 cursor-not-allowed"
                }`}
                type="button"
                onClick={() => {
                  if (currentUserLevel === "Level1") {
                    setCreateDialogOpen(true);
                  }
                }}
                disabled={currentUserLevel !== "Level1"}
              >
                Add organization user
              </button>
              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2">
                <span className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400" />
                <div className="text-left">
                  <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-500">
                    Organization Admin
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                    Admin Access
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">

          <section className="space-y-6 rounded-[32px] bg-white p-6 shadow-[0_30px_45px_rgba(15,23,42,0.1)]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Organization Overview</h2>
                <p className="text-sm text-slate-500">
                  {organizationName
                    ? `Managing access for ${organizationName}.`
                    : "Organization user access overview."}
                </p>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase text-sky-600">
                Access
              </span>
            </div>
            {organizationId ? (
              <div className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Total Organization User</p>
                  <p className="text-3xl font-semibold text-slate-900">{stats.approved}</p>
                </article>
                <article
                  className="cursor-pointer rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition hover:border-slate-300"
                  role="button"
                  tabIndex={0}
                  onClick={() => setPendingDialogOpen(true)}
                  onDoubleClick={() => setPendingDialogOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setPendingDialogOpen(true);
                    }
                  }}
                >
                  <p className="text-xs uppercase tracking-widest text-slate-500">Pending</p>
                  <p className="text-3xl font-semibold text-slate-900">{stats.pending}</p>
                </article>
                <article className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Delisted</p>
                  <p className="text-3xl font-semibold text-slate-900">{stats.delisted}</p>
                </article>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No organization is selected. Please log in as an organization admin to view users.
              </p>
            )}
          </section>

          <section className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-[0_25px_40px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">User Access List</h3>
                <p className="text-sm text-slate-500">
                  Review permissions and onboarding status for approved organization users.
                </p>
              </div>
              <button
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300"
                type="button"
                onClick={reloadUsers}
              >
                Refresh
              </button>
            </div>
            {loading ? (
              <p className="px-6 py-6 text-sm text-slate-500">Loading organization users...</p>
            ) : error ? (
              <p className="px-6 py-6 text-sm text-red-500">{error}</p>
            ) : approvedUsers.length === 0 ? (
              <p className="px-6 py-6 text-sm text-slate-500">
                No approved organization users found for this organization.
              </p>
            ) : (
              <div className="max-h-[520px] overflow-auto">
                <div className="min-w-full overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-600">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left">Username</th>
                        <th className="px-4 py-3 text-left">Role</th>
                        <th className="px-4 py-3 text-left">Level</th>
                        <th className="px-4 py-3 text-left">Category</th>
                        <th className="px-4 py-3 text-left">Approved</th>
                        <th className="px-4 py-3 text-left">Delisted</th>
                        <th className="px-4 py-3 text-left">Created</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {approvedUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {user.name || "-"}
                          </td>
                          <td className="px-4 py-3">{user.username || "-"}</td>
                          <td className="px-4 py-3">{user.role || "-"}</td>
                          <td className="px-4 py-3">{user.level || "-"}</td>
                          <td className="px-4 py-3">
                            {user.level === "Level1" ? "all" : user.category || "-"}
                          </td>
                          <td className="px-4 py-3">{user.is_approve ? "Yes" : "No"}</td>
                          <td className="px-4 py-3">{user.delist ? "Yes" : "No"}</td>
                          <td className="px-4 py-3">{formatDate(user.created_on)}</td>
                          <td className="px-4 py-3">
                            {currentUserLevel === "Level1" ? (
                              <div className="relative inline-flex" data-user-action-menu="true">
                                <button
                                  className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500 transition hover:border-slate-300"
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    const rect = event.currentTarget.getBoundingClientRect();
                                    const menuWidth = 160;
                                    const margin = 8;
                                    let left = rect.right - menuWidth;
                                    left = Math.max(
                                      margin,
                                      Math.min(left, window.innerWidth - menuWidth - margin),
                                    );
                                    const top = rect.bottom + 8;
                                    setOpenActionMenu((prev) =>
                                      prev?.id === user.id
                                        ? null
                                        : {
                                            id: user.id,
                                            user,
                                            top,
                                            left,
                                          },
                                    );
                                  }}
                                  aria-haspopup="menu"
                                  aria-expanded={openActionMenu?.id === user.id}
                                  data-user-action-menu="true"
                                >
                                  ⋮
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs uppercase tracking-widest text-slate-400">
                                View only
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

    {isVideoModalOpen ? (
      <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 px-4">
        <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-base font-semibold text-gray-900">
              Organization User Video Guide
            </h2>
            <button
              type="button"
              onClick={() => setIsVideoModalOpen(false)}
              className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
              aria-label="Close video modal"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="aspect-video w-full bg-black">
            <iframe
              className="h-full w-full"
              src="https://www.youtube-nocookie.com/embed/j6nwbRCDtjM?autoplay=1&vq=hd1080&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1"
              title="Organization user setup tutorial video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    ) : null}

    {openActionMenu && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed z-40 w-40 rounded-2xl border border-slate-200 bg-white shadow-lg"
            style={{ top: openActionMenu.top, left: openActionMenu.left }}
            role="menu"
            data-user-action-menu="true"
          >
            <button
              className="w-full px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50"
              type="button"
              onClick={() => openEditRoleDialog(openActionMenu.user)}
            >
              Edit Role
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50"
              type="button"
              onClick={() => openConfirmDialog("delist", openActionMenu.user)}
            >
              Delist
            </button>
          </div>,
          document.body,
        )
      : null}

    <Dialog
      open={isEditRoleDialogOpen}
      onOpenChange={(open) => {
        setEditRoleDialogOpen(open);
        if (!open) {
          setSelectedUser(null);
          setCategorySelections([]);
          setActionError("");
        }
      }}
    >
      <DialogContent className="max-w-lg border border-blue-100 bg-white/95">
        <DialogHeader>
          <DialogTitle className="text-2xl text-gray-900">
            Edit organization role
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {selectedUser?.name || selectedUser?.username || "Organization user"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleEditRoleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Level
              <select
                name="level"
                value={roleForm.level}
                onChange={handleRoleFormChange}
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
              {roleForm.level === "Level2" ? (
                <input
                  type="text"
                  name="role"
                  value={roleForm.role}
                  onChange={handleRoleFormChange}
                  placeholder="Custom role"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              ) : (
                <select
                  name="role"
                  value={roleForm.role}
                  onChange={handleRoleFormChange}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select role</option>
                  {organizationUserRoleOptions.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {roleOption}
                    </option>
                  ))}
                </select>
              )}
            </label>
          </div>

          {roleForm.level === "Level2" ? (
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
                      checked={categorySelections.includes(categoryOption)}
                      onChange={() => toggleCategorySelection(categoryOption)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    {categoryOption}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          {actionError ? (
            <p className="text-sm text-red-600">{actionError}</p>
          ) : null}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="inline-flex justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
              onClick={() => setEditRoleDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              className="inline-flex justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
              type="submit"
              disabled={isUpdating}
            >
              {isUpdating ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog
      open={isCreateDialogOpen}
      onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          resetCreateForm();
        } else if (typeof window !== "undefined") {
          const storedName =
            localStorage.getItem("selected_organization_name") || "";
          if (storedName && storedName !== organizationName) {
            setOrganizationName(storedName);
          }
        }
      }}
    >
      <DialogContent className="max-w-lg border border-blue-100 bg-white/95">
        <DialogHeader>
          <DialogTitle className="text-2xl text-gray-900">
            Add organization user
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Organization: {organizationName || "Selected organization"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Name
              <input
                type="text"
                name="name"
                value={createForm.name}
                onChange={handleCreateFormChange}
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
                value={createForm.username}
                onChange={handleCreateFormChange}
                onBlur={handleUsernameBlur}
                placeholder="name.code"
                required
                readOnly
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <span className="text-xs text-gray-400">
                Username is auto-generated as name.code using the logged-in admin code.
              </span>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Email
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    name="email"
                    value={createForm.email}
                    onChange={handleCreateFormChange}
                    placeholder="user@org.com"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || !normalizedCreateEmail}
                    className="shrink-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSendingOtp ? "Sending..." : isCreateEmailVerified ? "Verified" : "Verify"}
                  </button>
                </div>
                <span
                  className={`text-xs ${
                    isCreateEmailVerified ? "text-emerald-600" : "text-gray-400"
                  }`}
                >
                  {isCreateEmailVerified
                    ? "Email verified. You can add the organization user."
                    : "Send OTP, match it, and verify the email before submitting."}
                </span>
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Phone number
              <input
                type="text"
                name="phone_number"
                value={createForm.phone_number}
                onChange={handleCreateFormChange}
                placeholder="9888888888"
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Level
              <select
                name="level"
                value={createForm.level}
                onChange={handleCreateFormChange}
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
              {createForm.level === "Level2" ? (
                <input
                  type="text"
                  name="role"
                  value={createForm.role}
                  onChange={handleCreateFormChange}
                  placeholder="Custom role"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              ) : (
                <select
                  name="role"
                  value={createForm.role}
                  onChange={handleCreateFormChange}
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

          {createForm.level === "Level2" ? (
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
                      checked={createCategorySelections.includes(categoryOption)}
                      onChange={() =>
                        toggleCreateCategorySelection(categoryOption)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    {categoryOption}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {createError ? (
            <p className="text-sm text-red-600">{createError}</p>
          ) : null}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="inline-flex justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
              onClick={() => setCreateDialogOpen(false)}
              disabled={isCreatingUser}
            >
              Cancel
            </button>
            <button
              className="inline-flex justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
              type="submit"
              disabled={isCreatingUser || !isCreateEmailVerified}
            >
              {isCreatingUser ? "Creating..." : "Add user"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog
      open={isOtpDialogOpen}
      onOpenChange={(open) => {
        setOtpDialogOpen(open);
        if (!open) {
          setOtpValue("");
          setOtpError("");
        }
      }}
    >
      <DialogContent className="max-w-md border border-blue-100 bg-white/95">
        <DialogHeader>
          <DialogTitle className="text-2xl text-gray-900">
            Verify Email
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Enter the OTP sent to {normalizedCreateEmail || "your email"}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            OTP
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
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {otpError ? <p className="text-sm text-red-600">{otpError}</p> : null}
          {otpMessage ? <p className="text-sm text-emerald-600">{otpMessage}</p> : null}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="inline-flex justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
              onClick={handleSendOtp}
              disabled={isSendingOtp}
            >
              {isSendingOtp ? "Sending..." : "Resend OTP"}
            </button>
            <button
              className="inline-flex justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
              type="submit"
              disabled={isVerifyingOtp}
            >
              {isVerifyingOtp ? "Verifying..." : "Verify"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog
      open={isPendingDialogOpen}
      onOpenChange={(open) => {
        setPendingDialogOpen(open);
      }}
    >
      <DialogContent className="fixed inset-0 m-auto translate-x-0 translate-y-0 flex h-[80vh] max-h-[80vh] w-[95vw] max-w-[95vw] sm:h-[65vh] sm:max-h-[65vh] sm:w-[65vw] sm:max-w-[65vw] flex-col overflow-hidden border border-blue-100 bg-white/95">
        <DialogHeader>
          <DialogTitle className="text-2xl text-gray-900">
            Pending organization users
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Approve users who are waiting for organization access.
          </DialogDescription>
        </DialogHeader>

        {pendingUsers.length === 0 ? (
          <p className="text-sm text-slate-500">No pending users found.</p>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Username</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Level</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pendingUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{user.name || "-"}</td>
                    <td className="px-4 py-3">{user.username || "-"}</td>
                    <td className="px-4 py-3">{user.role || "-"}</td>
                    <td className="px-4 py-3">{user.level || "-"}</td>
                    <td className="px-4 py-3">
                      {user.level === "Level1" ? "all" : user.category || "-"}
                    </td>
                    <td className="px-4 py-3">{formatDate(user.created_on)}</td>
                    <td className="px-4 py-3">
                      {currentUserLevel === "Level1" ? (
                        <button
                          type="button"
                          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                          onClick={() => openConfirmDialog("approve", user)}
                          disabled={isUpdating}
                        >
                          Approve
                        </button>
                      ) : (
                        <span className="text-xs uppercase tracking-widest text-slate-400">
                          View only
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>

    <Dialog
      open={isConfirmDialogOpen}
      onOpenChange={(open) => {
        setConfirmDialogOpen(open);
        if (!open) {
          setSelectedUser(null);
          setConfirmAction("");
          setActionError("");
        }
      }}
    >
      <DialogContent className="max-w-md border border-blue-100 bg-white/95">
        <DialogHeader>
          <DialogTitle className="text-2xl text-gray-900">
            {confirmAction === "approve"
              ? "Approve user"
              : "Delist user"}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {selectedUser?.name || selectedUser?.username || "Organization user"}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-gray-700">
          {confirmAction === "approve"
            ? "Are you sure you want to approve this user?"
            : "Are you sure you want to delist this user?"}
        </p>

        {actionError ? (
          <p className="text-sm text-red-600">{actionError}</p>
        ) : null}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="inline-flex justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
            onClick={() => setConfirmDialogOpen(false)}
            disabled={isUpdating}
          >
            Cancel
          </button>
          <button
            className="inline-flex justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
            type="button"
            onClick={handleConfirmAction}
            disabled={isUpdating}
          >
            {isUpdating ? "Updating..." : "Confirm"}
          </button>
        </div>
      </DialogContent>
      </Dialog>

      <Dialog
        open={isAccessBlockedDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            router.push("/category");
          }
          setAccessBlockedDialogOpen(open);
        }}
      >
        <DialogContent
          className="max-w-md border border-blue-100 bg-white/95"
          overlayClassName="bg-black/60 backdrop-blur-md"
        >
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900">
              Access restricted
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              This page is only available to level 1 organization users.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              onClick={() => router.push("/category")}
            >
              Back 
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
