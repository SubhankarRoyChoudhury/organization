"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  approveCompany,
  delistCompany,
  getCompanyInfo,
  getOrganizations,
  getOrganizationCompanySummary,
  getOrganizationHospitals,
  getOrganizationSchools,
  getOrganizationUserDetails,
  unapproveCompany,
} from "@/app/api/apiService";
import CreateCompanyDialog from "@/components/ui/create-company-dialog";
import { formatDateValue, toDateInputValue as toLocaleDateInputValue } from "@/lib/companyLocale";

function ActionIcon({ type }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    className: "h-4 w-4",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    "aria-hidden": "true",
  };

  if (type === "access") {
    return (
      <svg {...commonProps}>
        <path d="M12 3l7 4v5c0 4.5-2.8 7.5-7 9-4.2-1.5-7-4.5-7-9V7l7-4z" />
        <path d="M9.5 12.5 11 14l3.5-4" />
      </svg>
    );
  }

  if (type === "directory") {
    return (
      <svg {...commonProps}>
        <path d="M4 7h16v10H4z" />
        <path d="M8 11h8M8 15h5" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function RowMenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

const formatDate = (value) => formatDateValue(value, { fallback: "-" });

const formatPercent = (value) => `${Math.round(Number(value || 0))}%`;

const toDateInputValue = (value) => {
  return toLocaleDateInputValue(value);
};

export default function OrganizationAdminPage() {
  const router = useRouter();
  const [updatedOnLabel, setUpdatedOnLabel] = useState("-");
  const [summary, setSummary] = useState({
    total: 0,
    approved: 0,
    delisted: 0,
  });
  const [schoolRecords, setSchoolRecords] = useState([]);
  const [skillRecords, setSkillRecords] = useState([]);
  const [collegeRecords, setCollegeRecords] = useState([]);
  const [hospitalRecords, setHospitalRecords] = useState([]);
  const [clinicRecords, setClinicRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [organizationContext, setOrganizationContext] = useState({
    id: "",
    name: "Organization workspace",
  });
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [organizationUserLevel, setOrganizationUserLevel] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [actionDialogMode, setActionDialogMode] = useState("");
  const [recordsDialogMode, setRecordsDialogMode] = useState("");
  const [actionForm, setActionForm] = useState({
    active_from: "",
    active_upto: "",
  });
  const [actionError, setActionError] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [permissionErrorModalMessage, setPermissionErrorModalMessage] = useState("");
  const createCompanyDialogRef = useRef(null);
  const organizationRecordsSectionRef = useRef(null);

  useEffect(() => {
    setUpdatedOnLabel(formatDate(new Date().toISOString()));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setOrganizationContext({
      id: localStorage.getItem("organization_id") || "",
      name:
        localStorage.getItem("selected_organization_name") ||
        "Organization workspace",
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSummary = async () => {
      try {
        setLoading(true);
        setError("");
        const organizationId = localStorage.getItem("organization_id") || "";
        const localePromise = organizationId
          ? getCompanyInfo(organizationId).catch(() => null)
          : Promise.resolve(null);
        const summaryPromise = Promise.all([
          getOrganizationCompanySummary({
            organization_id: organizationId || undefined,
          }),
          getOrganizationSchools({
            organization_id: organizationId || undefined,
          }),
          getOrganizationSchools({
            organization_id: organizationId || undefined,
            sub_group: "Skill",
          }),
          getOrganizationSchools({
            organization_id: organizationId || undefined,
            sub_group: "College",
          }),
          getOrganizationHospitals({
            organization_id: organizationId || undefined,
          }),
          getOrganizationHospitals({
            organization_id: organizationId || undefined,
            sub_group: "Clinic",
          }),
        ]);
        const [[summaryResponse, schoolResponse, skillResponse, collegeResponse, hospitalResponse, clinicResponse]] = await Promise.all(
          [summaryPromise, localePromise],
        );
        if (!mounted) {
          return;
        }
        setSummary({
          total: Number(summaryResponse?.total || 0),
          approved: Number(summaryResponse?.approved || 0),
          delisted: Number(summaryResponse?.delisted || 0),
        });
        setSchoolRecords(Array.isArray(schoolResponse?.schools) ? schoolResponse.schools : []);
        setSkillRecords(Array.isArray(skillResponse?.schools) ? skillResponse.schools : []);
        setCollegeRecords(Array.isArray(collegeResponse?.schools) ? collegeResponse.schools : []);
        setHospitalRecords(Array.isArray(hospitalResponse?.hospitals) ? hospitalResponse.hospitals : []);
        setClinicRecords(Array.isArray(clinicResponse?.hospitals) ? clinicResponse.hospitals : []);
      } catch (_err) {
        if (!mounted) {
          return;
        }
        setError("Unable to load organization company summary.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSummary();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadOrganizations = async () => {
      try {
        setIsLoadingOrganizations(true);
        const response = await getOrganizations();
        if (!mounted) {
          return;
        }
        const nextOrganizations = Array.isArray(response) ? response : [];
        setOrganizations(nextOrganizations);
      } catch (_err) {
        if (mounted) {
          setOrganizations([]);
        }
      } finally {
        if (mounted) {
          setIsLoadingOrganizations(false);
        }
      }
    };

    loadOrganizations();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!organizationContext.id || organizationContext.name !== "Organization workspace") {
      return;
    }

    const matchingOrganization = organizations.find(
      (organization) => String(organization?.id || "") === organizationContext.id,
    );

    if (matchingOrganization?.name) {
      setOrganizationContext((previous) => ({
        ...previous,
        name: matchingOrganization.name,
      }));
    }
  }, [organizationContext.id, organizationContext.name, organizations]);

  useEffect(() => {
    let mounted = true;

    const syncOrganizationUserLevel = async () => {
      const username =
        (typeof window !== "undefined" && localStorage.getItem("username")) || "";
      if (!username) {
        if (mounted) {
          setOrganizationUserLevel("");
        }
        return;
      }

      try {
        const organizationUserDetails = await getOrganizationUserDetails(username);
        if (!mounted) {
          return;
        }
        setOrganizationUserLevel(String(organizationUserDetails?.level || "").trim());
      } catch (_error) {
        if (mounted) {
          setOrganizationUserLevel("");
        }
      }
    };

    syncOrganizationUserLevel();
    window.addEventListener("session-context-changed", syncOrganizationUserLevel);
    return () => {
      mounted = false;
      window.removeEventListener(
        "session-context-changed",
        syncOrganizationUserLevel,
      );
    };
  }, []);

  const canApproveCompanies = useMemo(
    () => String(organizationUserLevel || "").trim().toLowerCase() === "level1",
    [organizationUserLevel],
  );

  const reloadSummary = async () => {
    try {
      setLoading(true);
      setError("");
      const organizationId = localStorage.getItem("organization_id") || "";
      const localePromise = organizationId
        ? getCompanyInfo(organizationId).catch(() => null)
        : Promise.resolve(null);
      const summaryPromise = Promise.all([
        getOrganizationCompanySummary({
          organization_id: organizationId || undefined,
        }),
        getOrganizationSchools({
          organization_id: organizationId || undefined,
        }),
        getOrganizationSchools({
          organization_id: organizationId || undefined,
          sub_group: "Skill",
        }),
        getOrganizationSchools({
          organization_id: organizationId || undefined,
          sub_group: "College",
        }),
        getOrganizationHospitals({
          organization_id: organizationId || undefined,
        }),
        getOrganizationHospitals({
          organization_id: organizationId || undefined,
          sub_group: "Clinic",
        }),
      ]);
      const [[summaryResponse, schoolResponse, skillResponse, collegeResponse, hospitalResponse, clinicResponse]] = await Promise.all(
        [summaryPromise, localePromise],
      );
      setSummary({
        total: Number(summaryResponse?.total || 0),
        approved: Number(summaryResponse?.approved || 0),
        delisted: Number(summaryResponse?.delisted || 0),
      });
      setSchoolRecords(Array.isArray(schoolResponse?.schools) ? schoolResponse.schools : []);
      setSkillRecords(Array.isArray(skillResponse?.schools) ? skillResponse.schools : []);
      setCollegeRecords(Array.isArray(collegeResponse?.schools) ? collegeResponse.schools : []);
      setHospitalRecords(Array.isArray(hospitalResponse?.hospitals) ? hospitalResponse.hospitals : []);
      setClinicRecords(Array.isArray(clinicResponse?.hospitals) ? clinicResponse.hospitals : []);
    } catch (_err) {
      setError("Unable to load organization company summary.");
    } finally {
      setLoading(false);
    }
  };

  const openCreateCompanyDialog = () => {
    createCompanyDialogRef.current?.open({
      organizationId: organizationContext.id,
      organizationName: organizationContext.name,
    });
  };

  const dashboardMetrics = useMemo(() => {
    const total = Number(summary.total || 0);
    const approved = Number(summary.approved || 0);
    const delisted = Number(summary.delisted || 0);
    const pending = Math.max(total - approved, 0);
    const active = Math.max(total - delisted, 0);
    const approvalRate = total ? (approved / total) * 100 : 0;
    const activeCoverage = total ? (active / total) * 100 : 0;
    const reviewLoad = total ? (pending / total) * 100 : 0;

    return {
      pending,
      active,
      approvalRate,
      activeCoverage,
      reviewLoad,
    };
  }, [summary]);

  const companySections = useMemo(
    () => [
      {
        key: "vidya",
        caption: "Vidya",
        title: "School List",
        records: schoolRecords,
        emptyMessage: "No Vidya school records are linked to this organization.",
      },
      {
        key: "vidya-skill",
        caption: "Vidya",
        title: "Skill Dev Center List",
        records: skillRecords,
        emptyMessage: "No Vidya skill records are linked to this organization.",
      },
      {
        key: "vidya-college",
        caption: "Vidya",
        title: "College List",
        records: collegeRecords,
        emptyMessage: "No Vidya college records are linked to this organization.",
      },
      {
        key: "swasthya",
        caption: "Swasthya",
        title: "Hospital List",
        records: hospitalRecords,
        emptyMessage: "No Swasthya hospital records are linked to this organization.",
      },
      {
        key: "clinic",
        caption: "Swasthya",
        title: "Clinic List",
        records: clinicRecords,
        emptyMessage: "No Swasthya clinic records are linked to this organization.",
      },
    ],
    [schoolRecords, skillRecords, collegeRecords, hospitalRecords, clinicRecords],
  );

  const pendingSections = useMemo(
    () =>
      companySections.map((section) => ({
        ...section,
        records: section.records.filter(
          (company) => !company?.delist && !company?.is_approved,
        ),
      })),
    [companySections],
  );

  const delistedSections = useMemo(
    () =>
      companySections.map((section) => ({
        ...section,
        records: section.records.filter((company) => Boolean(company?.delist)),
      })),
    [companySections],
  );

  const activeSections = useMemo(
    () =>
      companySections.map((section) => ({
        ...section,
        records: section.records.filter(
          (company) => Boolean(company?.is_approved) && !company?.delist,
        ),
      })),
    [companySections],
  );

  const tableSections = useMemo(
    () =>
      companySections.map((section) => ({
        ...section,
        // Main table should not show pending rows.
        records: section.records.filter(
          (company) => Boolean(company?.is_approved) || Boolean(company?.delist),
        ),
      })),
    [companySections],
  );

  const pendingRecordCount = useMemo(
    () => pendingSections.reduce((total, section) => total + section.records.length, 0),
    [pendingSections],
  );

  const delistedRecordCount = useMemo(
    () => delistedSections.reduce((total, section) => total + section.records.length, 0),
    [delistedSections],
  );

  const activeRecordCount = useMemo(
    () => activeSections.reduce((total, section) => total + section.records.length, 0),
    [activeSections],
  );

  const quickActions = [
    {
      label: "Create record",
      description: "Provision a new school or hospital record and assign its admin user.",
      action: openCreateCompanyDialog,
      icon: "create",
      variant: "primary",
    },
    {
      label: "Manage access control",
      description: "Review organization users, permissions, and assignments.",
      action: () => router.push("/organization-admin/access-control"),
      icon: "access",
      variant: "secondary",
    },
    // {
    //   label: "Open school directory",
    //   description: "Jump to the organization school list for detailed records.",
    //   action: () => router.push("/organization-admin/school-list"),
    //   icon: "directory",
    //   variant: "secondary",
    // },
  ];

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!event.target.closest("[data-company-action-menu]")) {
        setOpenActionMenu(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!openActionMenu) {
      return undefined;
    }

    const recalculateMenuPosition = () => {
      setOpenActionMenu((previous) => {
        if (!previous?.anchorEl) {
          return previous;
        }
        const rect = previous.anchorEl.getBoundingClientRect();
        const menuWidth = 176;
        const margin = 8;
        let left = rect.right - menuWidth;
        left = Math.max(
          margin,
          Math.min(left, window.innerWidth - menuWidth - margin),
        );
        const top = rect.bottom + 8;
        return {
          ...previous,
          top,
          left,
        };
      });
    };

    window.addEventListener("scroll", recalculateMenuPosition, true);
    window.addEventListener("resize", recalculateMenuPosition);
    return () => {
      window.removeEventListener("scroll", recalculateMenuPosition, true);
      window.removeEventListener("resize", recalculateMenuPosition);
    };
  }, [openActionMenu]);

  const closeActionDialog = () => {
    setSelectedCompany(null);
    setActionDialogMode("");
    setActionForm({
      active_from: "",
      active_upto: "",
    });
    setActionError("");
    setIsSubmittingAction(false);
  };

  const closeRecordsDialog = () => {
    setRecordsDialogMode("");
  };

  const openApproveDialog = (company) => {
    if (!canApproveCompanies) {
      setOpenActionMenu(null);
      setPermissionErrorModalMessage("Only Organization Level1 users can approve records.");
      return;
    }
    setSelectedCompany(company);
    setActionDialogMode(
      company?.delist ? "enlist" : company?.is_approved ? "unapprove" : "approve",
    );
    setActionForm({
      active_from:
        toDateInputValue(company?.active_from) ||
        toDateInputValue(new Date().toISOString()),
      active_upto: toDateInputValue(company?.active_upto),
    });
    setActionError("");
    setOpenActionMenu(null);
  };

  const openEditValidityDialog = (company) => {
    setSelectedCompany(company);
    setActionDialogMode("edit-validity");
    setActionForm({
      active_from:
        toDateInputValue(company?.active_from) ||
        toDateInputValue(new Date().toISOString()),
      active_upto: toDateInputValue(company?.active_upto),
    });
    setActionError("");
    setOpenActionMenu(null);
  };

  const closePermissionErrorModal = () => {
    setPermissionErrorModalMessage("");
  };

  const handleDelist = async (company) => {
    setSelectedCompany(company);
    setIsSubmittingAction(true);
    setActionError("");
    setOpenActionMenu(null);

    try {
      await delistCompany({
        company_id: company?.company_id || company?.id,
      });
      await reloadSummary();
      setSelectedCompany(null);
    } catch (error) {
      setError(
        error?.response?.data?.error ||
          error?.response?.data?.detail ||
          "Unable to delist company.",
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleApproveOrUpdateValidity = async (event) => {
    event.preventDefault();

    if (!selectedCompany) {
      return;
    }

    if (actionDialogMode !== "unapprove" && !actionForm.active_from) {
      setActionError("Active from is required.");
      return;
    }

    setIsSubmittingAction(true);
    setActionError("");

    try {
      const companyId = selectedCompany?.company_id || selectedCompany?.id;
      if (actionDialogMode === "unapprove") {
        await unapproveCompany({ company_id: companyId });
      } else {
        const payload = {
          company_id: companyId,
          active_from: actionForm.active_from,
        };
        if (actionForm.active_upto) {
          payload.active_upto = actionForm.active_upto;
        }
        await approveCompany(payload);
      }
      await reloadSummary();
      closeActionDialog();
    } catch (error) {
      setActionError(
        error?.response?.data?.error ||
          error?.response?.data?.detail ||
          "Unable to save company status.",
      );
      setIsSubmittingAction(false);
    }
  };

  const getRecordLabel = (sectionKey) => {
    if (sectionKey === "vidya") {
      return "School";
    }
    if (sectionKey === "vidya-skill") {
      return "Skill";
    }
    if (sectionKey === "vidya-college") {
      return "College";
    }
    if (sectionKey === "clinic") {
      return "Clinic";
    }
    return "Hospital";
  };

  const getRecordAdminLabel = (sectionKey) => {
    if (sectionKey === "vidya") {
      return "School Admin";
    }
    if (sectionKey === "vidya-skill") {
      return "Skill Admin";
    }
    if (sectionKey === "vidya-college") {
      return "College Admin";
    }
    if (sectionKey === "clinic") {
      return "Clinic Admin";
    }
    return "Hospital Admin";
  };

  const getRecordDisplayName = (company, sectionKey) => {
    const baseName = company?.company_name || "Unnamed record";
    const location = String(
      company?.location || company?.district || company?.city || "",
    ).trim();
    return location ? `${baseName} (${location})` : baseName;
  };

  const renderStatusChip = (company) => {
    if (company?.delist) {
      return (
        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
          Delisted
        </span>
      );
    }
    if (company?.is_approved) {
      return (
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Approved
        </span>
      );
    }
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
        Pending
      </span>
    );
  };

  const recordsDialogSections =
    recordsDialogMode === "pending" ? pendingSections : delistedSections;
  const recordsDialogCount =
    recordsDialogMode === "pending" ? pendingRecordCount : delistedRecordCount;

  const focusOrganizationRecordsSection = () => {
    setOpenActionMenu(null);
    setRecordsDialogMode("");
    if (!organizationRecordsSectionRef.current) {
      return;
    }
    organizationRecordsSectionRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    organizationRecordsSectionRef.current.focus({ preventScroll: true });
  };

  return (
    <>
      <main className="min-h-screen bg-[#f3f5ef] text-slate-900">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.14),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.14),_transparent_30%),linear-gradient(180deg,_#f8fbf8_0%,_#eef2ea_100%)]" />
          <div className="absolute left-[-8rem] top-28 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="absolute right-[-6rem] top-16 h-72 w-72 rounded-full bg-orange-300/20 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            <section className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(243,247,242,0.92))] shadow-[0_25px_80px_rgba(15,23,42,0.10)]">
              <div className="px-6 py-7 lg:px-8 lg:py-8">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && window.history.length > 1) {
                        router.back();
                        return;
                      }
                      router.push("/category");
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
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                    Organization
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                    {organizationContext.name}
                  </h1>
                </div>
              </div>
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                      Portfolio snapshot
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                      Where the organization stands right now
                    </h2>
                  </div>
                  <p className="text-sm text-slate-500">
                    Updated {updatedOnLabel}
                  </p>
                </div>

                {loading ? (
                  <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                    Loading organization metrics...
                  </div>
                ) : error ? (
                  <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-8 text-sm text-rose-700">
                    {error}
                  </div>
                ) : (
                  <div className="mt-6 space-y-5">
                    <div className="grid gap-4 md:grid-cols-3">
                      <button
                        type="button"
                        onClick={focusOrganizationRecordsSection}
                        className="rounded-[24px] bg-[#f6faf7] p-4 text-left transition hover:ring-2 hover:ring-emerald-200"
                      >
                        <p className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Active records
                        </p>
                        <p className="mt-2 text-3xl text-center font-semibold text-slate-900">
                          {dashboardMetrics.active}
                        </p>
                        <span className="mt-1 block text-[12px] leading-[12px]">All school and hospital records linked to this organization.</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionMenu(null);
                          setRecordsDialogMode("pending");
                        }}
                        className="rounded-[24px] bg-[#fff8ef] p-4 text-left transition hover:ring-2 hover:ring-amber-200"
                      >
                        <p className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Pending approvals
                        </p>
                        <p className="mt-2 text-3xl text-center font-semibold text-slate-900">
                          {pendingRecordCount}
                        </p>
                        <span className="mt-1 block text-[12px] leading-[12px]">Registrations still waiting for approval.</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionMenu(null);
                          setRecordsDialogMode("delisted");
                        }}
                        className="rounded-[24px] bg-[#fff2f2] p-4 text-left transition hover:ring-2 hover:ring-rose-200"
                      >
                        <p className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Delisted records
                        </p>
                        <p className="mt-2 text-3xl text-center font-semibold text-slate-900">
                          {delistedRecordCount}
                        </p>
                        <span className="mt-1 block text-[12px] leading-[12px]">Records no longer active in the organization.</span>
                      </button>
                    </div>

                    <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Approval momentum
                          </p>
                          <p className="text-sm text-slate-500">
                            The healthier this bar, the less queue pressure your team carries.
                          </p>
                        </div>
                        <span className="text-lg font-semibold text-slate-900">
                          {formatPercent(dashboardMetrics.approvalRate)}
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-200">
                        <div
                          className="h-3 rounded-full bg-[linear-gradient(90deg,#0f766e,#22c55e)]"
                          style={{ width: `${Math.min(dashboardMetrics.approvalRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </article>

              <article className="rounded-[30px] border border-slate-200 bg-[#fffdf8] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                  Quick actions
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  Common admin tasks
                </h2>
                <div className="mt-6 space-y-4">
                  {quickActions.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className={`w-full rounded-[24px] border p-4 text-left transition ${
                        item.variant === "primary"
                          ? "border-emerald-300 bg-[linear-gradient(135deg,#ecfdf5,#f0fdf4)] hover:border-emerald-400"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                          <ActionIcon type={item.icon} />
                        </span>
                        <span className="block">
                          <span className="block text-base font-semibold text-slate-900">
                            {item.label}
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-slate-500">
                            {item.description}
                          </span>
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </article>
            </section>

            <section
              ref={organizationRecordsSectionRef}
              tabIndex={-1}
              className="mt-8 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] outline-none"
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                    Organization records
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    Group-wise records attached to this organization
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Records are separated into Vidya school, skill, and college data plus Swasthya hospital and clinic data so each list stays aligned to its main group and subgroup.
                  </p>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                  {schoolRecords.length + skillRecords.length + collegeRecords.length + hospitalRecords.length + clinicRecords.length} records
                </div>
              </div>

              {loading ? (
                <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                  Loading organization records...
                </div>
              ) : error ? (
                <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-8 text-sm text-rose-700">
                  {error}
                </div>
              ) : schoolRecords.length === 0 &&
                skillRecords.length === 0 &&
                collegeRecords.length === 0 &&
                hospitalRecords.length === 0 &&
                clinicRecords.length === 0 ? (
                <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                  No school, skill, college, hospital, or clinic records are linked to this organization yet.
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  {tableSections.map((section) => (
                    <div
                      key={section.key}
                      className="overflow-hidden rounded-[24px] border border-slate-200"
                    >
                      <div className="flex items-end justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                            {section.caption}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold text-slate-900">
                            {section.title}
                          </h3>
                        </div>
                        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          {section.records.length} records
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <div className="w-full min-w-full">
                        <div className="grid grid-cols-[minmax(260px,2.1fr)_minmax(180px,1.2fr)_minmax(150px,0.9fr)_minmax(130px,0.8fr)_96px] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <span>
                            {section.key === "vidya"
                              ? "School"
                              : section.key === "vidya-skill"
                              ? "Skill"
                              : section.key === "vidya-college"
                              ? "College"
                              : section.key === "clinic"
                              ? "Clinic"
                              : "Hospital"}
                          </span>
                          <span>
                            {section.key === "vidya"
                              ? "School Admin"
                              : section.key === "vidya-skill"
                              ? "Skill Admin"
                              : section.key === "vidya-college"
                              ? "College Admin"
                              : section.key === "clinic"
                              ? "Clinic Admin"
                              : "Hospital Admin"}
                          </span>
                          {/* <span>Contact email</span> */}
                          <span className="text-center">Status</span>
                          <span className="text-center">Active Since</span>
                          {/* <span>Active until</span> */}
                          {/* <span>Delist</span> */}
                          <span className="text-center">Actions</span>
                        </div>
                        {section.records.length ? section.records.map((company) => {
                          const isDelisted = Boolean(company?.delist);
                          const schoolOrHospitalName = company.company_name || "Unnamed record";
                          const schoolLocation =
                            section.key === "vidya" ||
                            section.key === "vidya-skill" ||
                            section.key === "vidya-college"
                              ? (company.location || company.district || "").trim()
                              : "";
                          const schoolDisplayName =
                            (section.key === "vidya" ||
                              section.key === "vidya-skill" ||
                              section.key === "vidya-college") &&
                            schoolLocation
                              ? `${schoolOrHospitalName} (${schoolLocation})`
                              : schoolOrHospitalName;
                          return (
                            <article
                              key={company.id}
                              className="border-t border-slate-200 first:border-t-0"
                            >
                              <div className="grid grid-cols-[minmax(260px,2.1fr)_minmax(180px,1.2fr)_minmax(150px,0.9fr)_minmax(130px,0.8fr)_96px] gap-4 px-5 py-5 items-center">
                                <div>
                                  <p className="text-base font-semibold text-slate-900">
                                    {getRecordDisplayName(company, section.key)}
                                  </p>
                                  {/* <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                                    ID {company.company_id || company.id}
                                  </p> */}
                                </div>

                                <div className="text-sm font-medium text-slate-900">
                                  {company.admin_name || "-"}
                                </div>

                                {/* <div className="break-all text-sm font-medium text-slate-900">
                                  {company.email || "-"}
                                </div> */}

                                <div className="text-center">{renderStatusChip(company)}</div>

                                <div className="text-sm text-center font-medium text-slate-900">
                                  {company.active_from ? (
                                    formatDate(company.active_from)
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-slate-500">
                                      
                                      ?
                                    </span>
                                  )}
                                </div>

                                {/* <div className="text-sm font-medium text-slate-900">
                                  {formatDate(company.active_upto)}
                                </div> */}

                                {/* <div>
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                                      isDelisted
                                        ? "bg-rose-100 text-rose-700"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {isDelisted ? "Yes" : "No"}
                                  </span>
                                </div> */}

                                <div
                                  className="relative flex justify-center"
                                  data-company-action-menu="true"
                                >
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      const rect = event.currentTarget.getBoundingClientRect();
                                      const menuWidth = 176;
                                      const margin = 8;
                                      let left = rect.right - menuWidth;
                                      left = Math.max(
                                        margin,
                                        Math.min(left, window.innerWidth - menuWidth - margin),
                                      );
                                      const top = rect.bottom + 8;
                                      setOpenActionMenu((previous) =>
                                        previous?.id === company.id
                                          ? null
                                          : {
                                              id: company.id,
                                              company,
                                              isDelisted,
                                              top,
                                              left,
                                              anchorEl: event.currentTarget,
                                            },
                                      );
                                    }}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                                    aria-label={`Open actions for ${company.company_name || "record"}`}
                                  >
                                    <RowMenuIcon />
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        }) : (
                          <div className="px-5 py-8 text-sm text-slate-500">
                            {section.emptyMessage}
                          </div>
                        )}
                      </div>
                    </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {openActionMenu && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed z-40 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
              style={{ top: openActionMenu.top, left: openActionMenu.left }}
              data-company-action-menu="true"
            >
              <button
                type="button"
                onClick={() => openApproveDialog(openActionMenu.company)}
                className="w-full border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              >
                {openActionMenu.isDelisted
                  ? "Enlist"
                  : openActionMenu.company?.is_approved
                  ? "Unapprove"
                  : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => openEditValidityDialog(openActionMenu.company)}
                className="w-full border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              >
                Edit valid date
              </button>
              {!openActionMenu.isDelisted ? (
                <button
                  type="button"
                  onClick={() => handleDelist(openActionMenu.company)}
                  className="w-full px-4 py-3 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                >
                  Delist
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}

      {recordsDialogMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6">
          <div className="w-full max-w-5xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {recordsDialogMode === "pending" ? "Pending approvals" : "Delisted records"}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                  {recordsDialogMode === "pending"
                    ? "Records waiting for review"
                    : "Records removed from active list"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">{recordsDialogCount} records</p>
              </div>
              <button
                type="button"
                onClick={closeRecordsDialog}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            {recordsDialogCount === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                {recordsDialogMode === "pending"
                  ? "No pending records to review."
                  : "No delisted records found."}
              </div>
            ) : (
              <div className="mt-6 max-h-[65vh] space-y-5 overflow-y-auto pr-1">
                {recordsDialogSections.map((section) =>
                  section.records.length ? (
                    <div
                      key={`dialog-${section.key}`}
                      className="overflow-hidden rounded-[20px] border border-slate-200"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                            {section.caption}
                          </p>
                          <h4 className="mt-1 text-sm font-semibold text-slate-900">
                            {section.title}
                          </h4>
                        </div>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          {section.records.length} records
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <div className="min-w-full">
                          <div
                            className={`grid gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 ${
                              recordsDialogMode === "pending"
                                ? "grid-cols-[minmax(260px,2fr)_minmax(180px,1.2fr)_minmax(130px,0.8fr)_minmax(140px,0.85fr)_180px]"
                                : "grid-cols-[minmax(260px,2fr)_minmax(180px,1.2fr)_minmax(130px,0.8fr)_minmax(140px,0.85fr)]"
                            }`}
                          >
                            <span>{getRecordLabel(section.key)}</span>
                            <span>{getRecordAdminLabel(section.key)}</span>
                            <span className="text-center">Status</span>
                            <span className="text-center">Active Since</span>
                            {recordsDialogMode === "pending" ? (
                              <span className="text-center">Actions</span>
                            ) : null}
                          </div>
                          {section.records.map((company) => {
                            const isWorkingOnThisCompany =
                              isSubmittingAction &&
                              (String(selectedCompany?.company_id || selectedCompany?.id || "") ===
                                String(company?.company_id || company?.id || ""));
                            return (
                              <article
                                key={`dialog-row-${section.key}-${company.id}`}
                                className="border-t border-slate-200 first:border-t-0"
                              >
                                <div
                                  className={`grid gap-4 px-4 py-4 items-center ${
                                    recordsDialogMode === "pending"
                                      ? "grid-cols-[minmax(260px,2fr)_minmax(180px,1.2fr)_minmax(130px,0.8fr)_minmax(140px,0.85fr)_180px]"
                                      : "grid-cols-[minmax(260px,2fr)_minmax(180px,1.2fr)_minmax(130px,0.8fr)_minmax(140px,0.85fr)]"
                                  }`}
                                >
                                  <div className="text-base font-semibold text-slate-900">
                                    {getRecordDisplayName(company, section.key)}
                                  </div>
                                  <div className="text-sm font-medium text-slate-900">
                                    {company.admin_name || "-"}
                                  </div>
                                  <div className="text-center">{renderStatusChip(company)}</div>
                                  <div className="text-center text-sm font-medium text-slate-900">
                                    {company.active_from ? formatDate(company.active_from) : "-"}
                                  </div>
                                  {recordsDialogMode === "pending" ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          closeRecordsDialog();
                                          openApproveDialog(company);
                                        }}
                                        disabled={isSubmittingAction}
                                        className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDelist(company)}
                                        disabled={isSubmittingAction}
                                        className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {isWorkingOnThisCompany ? "Working..." : "Delist"}
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {selectedCompany && actionDialogMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {actionDialogMode === "approve"
                    ? "Approve record"
                    : actionDialogMode === "enlist"
                    ? "Enlist record"
                    : actionDialogMode === "unapprove"
                    ? "Unapproved"
                    : "Edit validity"}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                  {selectedCompany.company_name || "Record"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeActionDialog}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleApproveOrUpdateValidity} className="mt-6 space-y-4">
              {actionDialogMode === "unapprove" ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  This company will be marked as unapproved.
                </div>
              ) : (
                <label className="block">
                  <span className="text-sm font-medium  text-slate-700">Active from</span>
                  <input
                    type="date"
                    value={actionForm.active_from}
                    onChange={(event) =>
                      setActionForm((previous) => ({
                        ...previous,
                        active_from: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
              )}

              {/* <label className="block">
                <span className="text-sm font-medium text-slate-700">Active until</span>
                <input
                  type="date"
                  value={actionForm.active_upto}
                  onChange={(event) =>
                    setActionForm((previous) => ({
                      ...previous,
                      active_upto: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </label> */}

              {actionError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {actionError}
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeActionDialog}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingAction
                    ? "Saving..."
                    : actionDialogMode === "approve"
                    ? "Approve Record"
                    : actionDialogMode === "enlist"
                    ? "Enlist Record"
                    : actionDialogMode === "unapprove"
                    ? "Unapprove Record"
                    : "Save validity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {permissionErrorModalMessage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-rose-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">
                  Error
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                  Permission denied
                </h3>
              </div>
              <button
                type="button"
                onClick={closePermissionErrorModal}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {permissionErrorModalMessage}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closePermissionErrorModal}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CreateCompanyDialog
        ref={createCompanyDialogRef}
        organizations={organizations}
        isLoadingOrganizations={isLoadingOrganizations}
        onSuccess={reloadSummary}
      />
    </>
  );
}
