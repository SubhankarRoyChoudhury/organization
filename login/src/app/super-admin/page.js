"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearLoginSession,
  createOrganization,
  createOrganizationUser,
  getOrganizations,
  sendOrganizationInvite,
  updateOrganization,
} from "@/app/api/apiService";
import OrganizationCreateDialog from "@/components/ui/OrganizationCreateDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  return sanitizeUsernamePart(raw.split(".")[0] || "");
};

const buildOrgCodeCandidates = (name) => {
  const cleaned = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) {
    return [];
  }

  const words = cleaned.split(" ").filter(Boolean);
  const lettersOnly = cleaned.replace(/\s/g, "");
  const candidates = [];

  if (words.length >= 3) {
    candidates.push(words[0][0] + words[1][0] + words[2][0]);
    candidates.push(words[0][0] + words[1][0] + words[2][0] + (words[3]?.[0] || ""));
  } else if (words.length === 2) {
    const [first, second] = words;
    candidates.push(first[0] + second.slice(0, 2));
    candidates.push(first.slice(0, 2) + second[0]);
    candidates.push(first[0] + second[0] + second.slice(-1));
    candidates.push(first[0] + second.slice(0, 3));
  } else if (words.length === 1) {
    const [word] = words;
    candidates.push(word.slice(0, 3));
    candidates.push(word.slice(0, 4));
    if (word.length >= 4) {
      candidates.push(word.slice(0, 2) + word.slice(-2));
    }
  }

  if (lettersOnly.length >= 3) {
    candidates.push(lettersOnly.slice(0, 3));
    candidates.push(lettersOnly.slice(-3));
  }
  if (lettersOnly.length >= 4) {
    candidates.push(lettersOnly.slice(0, 4));
    candidates.push(lettersOnly.slice(-4));
  }

  return Array.from(
    new Set(
      candidates
        .map((item) => sanitizeOrgCode(item))
        .filter((item) => item.length >= 3),
    ),
  );
};

export default function SuperAdminPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [organizationsError, setOrganizationsError] = useState("");
  const [actionOrganization, setActionOrganization] = useState(null);
  const [actionType, setActionType] = useState("");
  const [approvalFrom, setApprovalFrom] = useState("");
  const [approvalUpto, setApprovalUpto] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [menuOrganization, setMenuOrganization] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isOrganizationCreateDialogOpen, setOrganizationCreateDialogOpen] =
    useState(false);
  const [isEditingOrganization, setIsEditingOrganization] = useState(false);
  const [editingOrganizationId, setEditingOrganizationId] = useState(null);
  const [organizationCreateError, setOrganizationCreateError] = useState("");
  const [organizationCreateForm, setOrganizationCreateForm] = useState({
    name: "",
    org_code: "",
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
  const [orgCodeTouched, setOrgCodeTouched] = useState(false);
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false);
  const [isInviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  useEffect(() => {
    const isSuperuser = localStorage.getItem("is_superuser") === "true";
    if (!isSuperuser) {
      router.replace("/home");
      return;
    }

    let mounted = true;
    const loadDashboardData = async () => {
      try {
        setOrganizationsLoading(true);
        const organizationResponse = await getOrganizations();
        if (mounted) {
          setOrganizations(
            Array.isArray(organizationResponse) ? organizationResponse : [],
          );
        }
      } catch (err) {
        if (mounted) {
          setOrganizationsError("Unable to load organizations.");
        }
      } finally {
        if (mounted) {
          setOrganizationsLoading(false);
        }
      }
    };

    loadDashboardData();
    return () => {
      mounted = false;
    };
  }, [router]);

  const reloadOrganizations = async () => {
    try {
      const response = await getOrganizations();
      setOrganizations(Array.isArray(response) ? response : []);
    } catch (err) {
      setOrganizationsError("Unable to refresh organizations.");
    }
  };

  const handleLogout = () => {
    clearLoginSession();
    router.replace("/login");
  };

  const resetInviteDialog = () => {
    setInviteEmail("");
    setInviteStatus("");
    setInviteError("");
    setIsSendingInvite(false);
  };

  const closeActionModal = () => {
    setActionOrganization(null);
    setActionType("");
    setApprovalFrom("");
    setApprovalUpto("");
    setActionStatus("");
    setActionLoading(false);
  };

  const openApproveModal = (organization) => {
    const initialFrom =
      formatDateInput(organization.active_from) || formatDateInput(new Date());
    const initialUpto =
      formatDateInput(organization.active_upto) || formatDateInput(addDays(new Date(), 30));
    setOpenMenuId(null);
    setActionOrganization(organization);
    setActionType("approve");
    setApprovalFrom(initialFrom);
    setApprovalUpto(initialUpto);
    setActionStatus("");
  };

  const openDatesModal = (organization) => {
    const initialFrom =
      formatDateInput(organization.active_from) || formatDateInput(new Date());
    const initialUpto =
      formatDateInput(organization.active_upto) || formatDateInput(addDays(new Date(), 30));
    setOpenMenuId(null);
    setActionOrganization(organization);
    setActionType("dates");
    setApprovalFrom(initialFrom);
    setApprovalUpto(initialUpto);
    setActionStatus("");
  };

  const openDelistModal = (organization) => {
    setOpenMenuId(null);
    setActionOrganization(organization);
    setActionType("delist");
    setApprovalFrom("");
    setApprovalUpto("");
    setActionStatus("");
  };

  const addDays = (dateValue, days) => {
    const date = new Date(dateValue);
    date.setDate(date.getDate() + days);
    return date;
  };

  const handleApproveConfirm = async () => {
    setActionStatus("");
    if (!approvalFrom || !approvalUpto) {
      setActionStatus("Select both active from and active upto dates.");
      return;
    }
    try {
      setActionLoading(true);
      const organizationId = actionOrganization?.id;
      await updateOrganization(organizationId, {
        is_approve: true,
        is_approved: true,
        delist: false,
        active_from: approvalFrom,
        active_upto: approvalUpto,
      });
      await reloadOrganizations();
      closeActionModal();
    } catch (err) {
      setActionStatus("Unable to approve this organization.");
      setActionLoading(false);
    }
  };

  const handleDatesConfirm = async () => {
    setActionStatus("");
    if (!approvalFrom || !approvalUpto) {
      setActionStatus("Select both active from and active upto dates.");
      return;
    }
    try {
      setActionLoading(true);
      const organizationId = actionOrganization?.id;
      await updateOrganization(organizationId, {
        active_from: approvalFrom,
        active_upto: approvalUpto,
      });
      await reloadOrganizations();
      closeActionModal();
    } catch (err) {
      setActionStatus("Unable to update active dates.");
      setActionLoading(false);
    }
  };

  const handleDelistConfirm = async () => {
    setActionStatus("");
    try {
      setActionLoading(true);
      const organizationId = actionOrganization?.id;
      await updateOrganization(organizationId, {
        delist: true,
        is_approve: false,
        is_approved: false,
      });
      await reloadOrganizations();
      closeActionModal();
    } catch (err) {
      setActionStatus("Unable to delist this organization.");
      setActionLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }
    if (typeof value === "string") {
      return value.split("T")[0];
    }
    try {
      return new Date(value).toISOString().split("T")[0];
    } catch (err) {
      return "-";
    }
  };

  const formatDateInput = (value) => {
    if (!value) {
      return "";
    }
    if (typeof value === "string") {
      return value.split("T")[0];
    }
    try {
      return new Date(value).toISOString().split("T")[0];
    } catch (err) {
      return "";
    }
  };

  const resetOrganizationCreateForm = () => {
    setOrganizationCreateForm({
      name: "",
      org_code: "",
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
    setOrgCodeTouched(false);
    setOrganizationCreateError("");
    setIsEditingOrganization(false);
    setEditingOrganizationId(null);
  };

  const existingOrgCodes = useMemo(() => {
    const codes = new Set();

    organizations.forEach((organization) => {
      const explicitCode = sanitizeOrgCode(
        organization?.org_code || organization?.organization_code || "",
      );
      if (explicitCode) {
        codes.add(explicitCode);
      }

      [
        organization?.username,
        organization?.admin_user_name,
        organization?.admin_username,
        organization?.admin_user,
      ].forEach((value) => {
        const raw = String(value || "").toLowerCase();
        if (!raw.includes(".")) {
          return;
        }
        const suffix = sanitizeOrgCode(raw.split(".").pop());
        if (suffix) {
          codes.add(suffix);
        }
      });
    });

    return codes;
  }, [organizations]);

  const getUniqueOrgCode = useCallback((name) => {
    const candidates = buildOrgCodeCandidates(name);
    for (const candidate of candidates) {
      if (!existingOrgCodes.has(candidate)) {
        return candidate;
      }
    }

    const fallbackBase = sanitizeOrgCode(
      candidates[0] || String(name || "").slice(0, 4) || "org",
    ) || "org";
    let suffix = 1;
    let nextCode = `${fallbackBase}${suffix}`;
    while (existingOrgCodes.has(nextCode)) {
      suffix += 1;
      nextCode = `${fallbackBase}${suffix}`;
    }
    return nextCode.slice(0, 6);
  }, [existingOrgCodes]);

  const handleOrganizationCreateFormChange = (event) => {
    const { name, value } = event.target;
    setOrganizationCreateForm((prev) => {
      if (name === "org_code") {
        setOrgCodeTouched(true);
        return { ...prev, org_code: value };
      }

      if (name === "name") {
        if (orgCodeTouched) {
          return { ...prev, name: value };
        }
        return {
          ...prev,
          name: value,
          org_code: getUniqueOrgCode(value),
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  useEffect(() => {
    if (isEditingOrganization || !organizationCreateForm.name || orgCodeTouched) {
      return;
    }

    const nextCode = getUniqueOrgCode(
      organizationCreateForm.name,
    );
    if (!nextCode) {
      return;
    }

    setOrganizationCreateForm((prev) =>
      prev.org_code === nextCode ? prev : { ...prev, org_code: nextCode },
    );
  }, [
    getUniqueOrgCode,
    isEditingOrganization,
    orgCodeTouched,
    organizationCreateForm.name,
    organizationCreateForm.org_code,
  ]);

  const syncUsernameWithOrgCode = () => {
    setOrganizationCreateForm((prev) => {
      const base = getUsernameBase(prev.username);
      const orgCode = sanitizeOrgCode(prev.org_code);
      if (!base || !orgCode) {
        return prev;
      }
      const nextUsername = `${base}.${orgCode}`;
      return nextUsername === prev.username
        ? prev
        : { ...prev, username: nextUsername };
    });
  };

  const handleOrganizationUsernameBlur = () => {
    syncUsernameWithOrgCode();
  };

  const handleOrganizationOrgCodeBlur = () => {
    setOrganizationCreateForm((prev) => {
      const sanitized = sanitizeOrgCode(prev.org_code);
      const base = getUsernameBase(prev.username);
      const nextUsername =
        base && sanitized ? `${base}.${sanitized}` : prev.username;
      if (sanitized === prev.org_code && nextUsername === prev.username) {
        return prev;
      }
      return {
        ...prev,
        org_code: sanitized,
        username: nextUsername,
      };
    });
  };

  const handleOrganizationCreateSubmit = async (event) => {
    event.preventDefault();
    setOrganizationCreateError("");

    const organizationPayload = {
      name: organizationCreateForm.name.trim(),
      email: organizationCreateForm.email.trim(),
      phone_number: organizationCreateForm.phone_number.trim(),
      address: organizationCreateForm.address.trim(),
      city: organizationCreateForm.city.trim(),
      state: organizationCreateForm.state.trim(),
      country: organizationCreateForm.country.trim(),
      postal_code: organizationCreateForm.postal_code.trim(),
    };
    if (!isEditingOrganization) {
      const orgCode = sanitizeOrgCode(organizationCreateForm.org_code);
      if (!orgCode) {
        setOrganizationCreateError("Organization code is required.");
        return;
      }
      const requestedUsernameBase = getUsernameBase(organizationCreateForm.username);
      const requestedUsername = requestedUsernameBase
        ? `${requestedUsernameBase}.${orgCode}`
        : organizationCreateForm.username.trim();
      if (requestedUsername) {
        organizationPayload.username = requestedUsername;
        organizationPayload.admin_user_name = requestedUsername;
      }
    }
    const organizationUserPayload = {
      role: "user",
      name: organizationCreateForm.admin_name.trim(),
      username: (() => {
        const orgCode = sanitizeOrgCode(organizationCreateForm.org_code);
        const usernameBase = getUsernameBase(organizationCreateForm.username);
        return usernameBase && orgCode
          ? `${usernameBase}.${orgCode}`
          : organizationCreateForm.username.trim();
      })(),
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
    if (!isEditingOrganization) {
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
    }

    try {
      setIsCreatingOrganization(true);
      if (isEditingOrganization && editingOrganizationId) {
        await updateOrganization(editingOrganizationId, organizationPayload);
      } else {
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
      }
      setOrganizationCreateDialogOpen(false);
      resetOrganizationCreateForm();
      await reloadOrganizations();
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
        "Unable to save organization.";
      setOrganizationCreateError(String(detail));
    } finally {
      setIsCreatingOrganization(false);
    }
  };

  const handleSendInvite = async (event) => {
    event.preventDefault();
    const normalizedEmail = inviteEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setInviteError("Email is required.");
      setInviteStatus("");
      return;
    }

    try {
      setIsSendingInvite(true);
      setInviteError("");
      setInviteStatus("");
      const inviteUrl = `${window.location.origin}/create-organization`;
      const response = await sendOrganizationInvite({
        email: normalizedEmail,
        invite_url: inviteUrl,
      });
      setInviteStatus(response?.detail || "Invitation sent.");
    } catch (requestError) {
      const responseData = requestError.response?.data;
      setInviteError(
        responseData?.detail ||
          responseData?.error ||
          "Unable to send invitation.",
      );
    } finally {
      setIsSendingInvite(false);
    }
  };

  const openOrganizationEditDialog = (organization) => {
    setOrganizationCreateForm({
      name: organization.name || "",
      org_code: "",
      admin_name: "",
      username: "",
      email: organization.email || "",
      phone_number: organization.phone_number || "",
      password: "",
      address: organization.address || "",
      city: organization.city || "",
      state: organization.state || "",
      country: organization.country || "",
      postal_code: organization.postal_code || "",
    });
    setOrganizationCreateError("");
    setIsEditingOrganization(true);
    setEditingOrganizationId(organization.id);
    setOpenMenuId(null);
    setOrganizationCreateDialogOpen(true);
  };

  const toggleOrganizationMenu = (event, organization) => {
    if (openMenuId === organization.id) {
      setOpenMenuId(null);
      setMenuOrganization(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 192;
    const viewportPadding = 12;
    const left = Math.max(
      viewportPadding,
      Math.min(
        rect.right - menuWidth,
        window.innerWidth - menuWidth - viewportPadding,
      ),
    );

    setMenuPosition({
      top: rect.bottom + 8,
      left,
    });
    setMenuOrganization(organization);
    setOpenMenuId(organization.id);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-200 text-slate-900">
      <div className="space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-[32px] border border-white/70 bg-white/75 px-6 py-5 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <p className=" font-semibold uppercase tracking-[0.45em] text-orange-600">
                <span className="sm:text-4lg">Phenx</span>&nbsp;Super Admin
              </p>
              <h1 className="text-3xl font-semibold leading-tight text-slate-900">
                Organization Control Center
              </h1>
              <p className="max-w-3xl text-sm text-slate-500">
                Manage organizations, approval windows, and admin access from a single dashboard.
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.32em] text-slate-700 shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:bg-slate-50"
                onClick={() => {
                  resetInviteDialog();
                  setInviteDialogOpen(true);
                }}
              >
                Invite
              </button>
              <button
                type="button"
                className="rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.32em] text-white shadow-[0_10px_28px_rgba(15,23,42,0.28)] transition hover:bg-slate-800"
                onClick={() => {
                  resetOrganizationCreateForm();
                  setOrganizationCreateDialogOpen(true);
                }}
              >
                Create Organization
              </button>
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-[0_15px_35px_rgba(15,23,42,0.08)] transition hover:border-slate-300"
                  onClick={() => setProfileMenuOpen((open) => !open)}
                >
                  <span className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500" />
                  <div className="text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-600">
                      Phenx Super Admin
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">
                      Admin Access
                    </p>
                  </div>
                </button>
                {profileMenuOpen ? (
                  <div className="absolute right-0 top-full z-20 mt-2 min-w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_48px_rgba(15,23,42,0.18)]">
                    <button
                      type="button"
                      className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <section className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Organization Snapshot
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Current counts and health indicators for organization onboarding.
              </p>
            </div>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Live
            </span>
          </div>
          {organizationsError ? (
            <p className="pt-6 text-sm text-rose-600">{organizationsError}</p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Total Organizations
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {organizationsLoading ? "-" : organizations.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Active
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {organizationsLoading
                    ? "-"
                    : organizations.filter((org) => org.is_active !== false).length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Delisted
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {organizationsLoading
                    ? "-"
                    : organizations.filter((org) => Boolean(org.delist)).length}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Organizations</h2>
              <p className="mt-1 text-sm text-slate-500">
                View approval status, active period, and quick actions for every organization.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
              {organizationsLoading ? "Loading..." : `${organizations.length} records`}
            </div>
          </div>
          {organizationsError ? (
            <p className="pt-6 text-sm text-rose-600">{organizationsError}</p>
          ) : organizationsLoading ? (
            <p className="pt-6 text-sm text-slate-500">Loading organizations...</p>
          ) : organizations.length === 0 ? (
            <p className="pt-6 text-sm text-slate-500">No organizations found.</p>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-[24px] border border-slate-100">
              <table className="min-w-full text-left text-sm text-slate-600">
                <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Organization</th>
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">Admin User</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">City</th>
                    <th className="px-4 py-3 font-semibold">State</th>
                    <th className="px-4 py-3 font-semibold">Country</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Active From</th>
                    <th className="px-4 py-3 font-semibold">Active Until</th>
                    <th className="px-4 py-3 font-semibold">Delisted</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {organizations.map((organization) => {
                    const statusLabel = organization.delist
                      ? "Delisted"
                      : organization.is_approve || organization.is_approved
                        ? "Approved"
                        : "Pending";
                    return (
                      <tr key={organization.id}>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {organization.name || "Unnamed"}
                        </td>
                        <td className="px-4 py-3">{organization.id || "-"}</td>
                        <td className="px-4 py-3">
                          {organization.admin_user_display ||
                            organization.admin_user_name ||
                            "-"}
                        </td>
                        <td className="px-4 py-3">{organization.email || "-"}</td>
                        <td className="px-4 py-3">{organization.phone_number || "-"}</td>
                        <td className="px-4 py-3">{organization.city || "-"}</td>
                        <td className="px-4 py-3">{organization.state || "-"}</td>
                        <td className="px-4 py-3">{organization.country || "-"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                              statusLabel === "Approved"
                                ? "bg-emerald-100 text-emerald-700"
                                : statusLabel === "Delisted"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3">{formatDate(organization.active_from)}</td>
                        <td className="px-4 py-3">{formatDate(organization.active_upto)}</td>
                        <td className="px-4 py-3">{organization.delist ? "Yes" : "No"}</td>
                        <td className="px-4 py-3">{formatDate(organization.created_at)}</td>
                        <td className="relative px-4 py-3">
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                            type="button"
                            aria-haspopup="menu"
                            aria-expanded={openMenuId === organization.id}
                            onClick={(event) =>
                              toggleOrganizationMenu(event, organization)
                            }
                          >
                            ⋮
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {openMenuId && menuOrganization ? (
        <div
          className="fixed z-[70] w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_40px_rgba(15,23,42,0.14)]"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
          }}
        >
          <button
            className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            type="button"
            onClick={() => openOrganizationEditDialog(menuOrganization)}
          >
            Edit
          </button>
          <button
            className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:text-slate-400"
            type="button"
            onClick={() => openApproveModal(menuOrganization)}
            disabled={menuOrganization.delist}
          >
            {menuOrganization.is_approve || menuOrganization.is_approved
              ? "Update approval"
              : "Approve"}
          </button>
          <button
            className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:text-slate-400"
            type="button"
            onClick={() => openDatesModal(menuOrganization)}
            disabled={menuOrganization.delist}
          >
            Update dates
          </button>
          <button
            className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:text-slate-300"
            type="button"
            onClick={() => openDelistModal(menuOrganization)}
            disabled={menuOrganization.delist}
          >
            Delist
          </button>
        </div>
      ) : null}

      {actionOrganization ? (
        <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-slate-900/60 px-4 py-10">
          <div className="w-full max-w-lg rounded-[32px] bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900">
              {actionType === "approve"
                ? "Approve Organization"
                : actionType === "dates"
                  ? "Update Active Dates"
                  : "Delist Organization"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {actionOrganization.name || "Unnamed"} ({actionOrganization.id})
            </p>
            {actionType === "approve" || actionType === "dates" ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  <span>Active from</span>
                  <input
                    id="approval-from"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    type="date"
                    value={approvalFrom}
                    onChange={(event) => setApprovalFrom(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  <span>Active upto</span>
                  <input
                    id="approval-upto"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    type="date"
                    min={approvalFrom || undefined}
                    value={approvalUpto}
                    onChange={(event) => setApprovalUpto(event.target.value)}
                  />
                </label>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                This will remove the organization from the active list without deleting it.
              </p>
            )}
            {actionStatus ? <p className="mt-4 text-sm text-rose-600">{actionStatus}</p> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                type="button"
                onClick={closeActionModal}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                type="button"
                onClick={
                  actionType === "approve"
                    ? handleApproveConfirm
                    : actionType === "dates"
                      ? handleDatesConfirm
                      : handleDelistConfirm
                }
                disabled={actionLoading}
              >
                {actionLoading ? "Working..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <OrganizationCreateDialog
        open={isOrganizationCreateDialogOpen}
        onOpenChange={(open) => {
          setOrganizationCreateDialogOpen(open);
          if (!open) {
            resetOrganizationCreateForm();
          }
        }}
        isEditingOrganization={isEditingOrganization}
        organizationCreateForm={organizationCreateForm}
        organizationCreateError={organizationCreateError}
        isCreatingOrganization={isCreatingOrganization}
        onSubmit={handleOrganizationCreateSubmit}
        onFormChange={handleOrganizationCreateFormChange}
        onUsernameBlur={handleOrganizationUsernameBlur}
        onOrgCodeBlur={handleOrganizationOrgCodeBlur}
        onCancel={() => {
          setOrganizationCreateDialogOpen(false);
          resetOrganizationCreateForm();
        }}
      />

      <Dialog
        open={isInviteDialogOpen}
        onOpenChange={(open) => {
          setInviteDialogOpen(open);
          if (!open) {
            resetInviteDialog();
          }
        }}
      >
        <DialogContent className="max-w-md rounded-[28px] border border-slate-200 bg-white p-0">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-xl text-slate-900">
                Send Invitation
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Send a create-organization invitation email.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSendInvite} className="mt-5 space-y-4">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                <span>Email</span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => {
                    setInviteEmail(event.target.value);
                    if (inviteError) {
                      setInviteError("");
                    }
                    if (inviteStatus) {
                      setInviteStatus("");
                    }
                  }}
                  placeholder="name@example.com"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </label>

              {inviteError ? (
                <p className="text-sm text-rose-600">{inviteError}</p>
              ) : null}
              {inviteStatus ? (
                <p className="text-sm text-emerald-600">{inviteStatus}</p>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setInviteDialogOpen(false);
                    resetInviteDialog();
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingInvite}
                  className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSendingInvite ? "Sending..." : "Send invite"}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
