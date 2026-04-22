"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveCompany,
  delistCompany,
  getOrganizations,
  getOrganizationCompanySummary,
  getOrganizationHospitals,
  getOrganizationSchools,
} from "@/app/api/apiService";
import CreateCompanyDialog from "@/components/ui/create-company-dialog";

function StatIcon({ type }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    "aria-hidden": "true",
  };

  if (type === "approved") {
    return (
      <svg {...commonProps}>
        <path d="M20 7 9 18l-5-5" />
      </svg>
    );
  }

  if (type === "pending") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }

  if (type === "delisted") {
    return (
      <svg {...commonProps}>
        <path d="M5 12h14" />
        <path d="M8 8l8 8" />
        <path d="M16 8l-8 8" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M4 12h16" />
      <path d="M12 4v16" />
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

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

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(new Date(value));
  } catch (_error) {
    return "-";
  }
};

const formatPercent = (value) => `${Math.round(Number(value || 0))}%`;

const toDateInputValue = (value) => {
  if (!value) {
    return "";
  }

  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch (_error) {
    return "";
  }
};

export default function OrganizationAdminPage() {
  const router = useRouter();
  const [summary, setSummary] = useState({
    total: 0,
    approved: 0,
    delisted: 0,
  });
  const [schoolRecords, setSchoolRecords] = useState([]);
  const [hospitalRecords, setHospitalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [organizationContext, setOrganizationContext] = useState({
    id: "",
    name: "Organization workspace",
  });
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [actionDialogMode, setActionDialogMode] = useState("");
  const [actionForm, setActionForm] = useState({
    active_from: "",
    active_upto: "",
  });
  const [actionError, setActionError] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const createCompanyDialogRef = useRef(null);

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
        const [summaryResponse, schoolResponse, hospitalResponse] = await Promise.all([
          getOrganizationCompanySummary({
            organization_id: organizationId || undefined,
          }),
          getOrganizationSchools({
            organization_id: organizationId || undefined,
          }),
          getOrganizationHospitals({
            organization_id: organizationId || undefined,
          }),
        ]);
        if (!mounted) {
          return;
        }
        setSummary({
          total: Number(summaryResponse?.total || 0),
          approved: Number(summaryResponse?.approved || 0),
          delisted: Number(summaryResponse?.delisted || 0),
        });
        setSchoolRecords(Array.isArray(schoolResponse?.schools) ? schoolResponse.schools : []);
        setHospitalRecords(Array.isArray(hospitalResponse?.hospitals) ? hospitalResponse.hospitals : []);
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

  const reloadSummary = async () => {
    try {
      setLoading(true);
      setError("");
      const organizationId = localStorage.getItem("organization_id") || "";
      const [summaryResponse, schoolResponse, hospitalResponse] = await Promise.all([
        getOrganizationCompanySummary({
          organization_id: organizationId || undefined,
        }),
        getOrganizationSchools({
          organization_id: organizationId || undefined,
        }),
        getOrganizationHospitals({
          organization_id: organizationId || undefined,
        }),
      ]);
      setSummary({
        total: Number(summaryResponse?.total || 0),
        approved: Number(summaryResponse?.approved || 0),
        delisted: Number(summaryResponse?.delisted || 0),
      });
      setSchoolRecords(Array.isArray(schoolResponse?.schools) ? schoolResponse.schools : []);
      setHospitalRecords(Array.isArray(hospitalResponse?.hospitals) ? hospitalResponse.hospitals : []);
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

  const statusCards = [
    {
      label: "Registered records",
      value: summary.total,
      helper: "All school and hospital records linked to this organization.",
      tone: "from-[#0f766e] via-[#0f766e] to-[#115e59]",
      icon: "total",
    },
    {
      label: "Approved",
      value: summary.approved,
      helper: "Accounts already cleared for active use.",
      tone: "from-[#15803d] via-[#16a34a] to-[#4d7c0f]",
      icon: "approved",
    },
    {
      label: "Pending review",
      value: dashboardMetrics.pending,
      helper: "Registrations still waiting for approval.",
      tone: "from-[#9a3412] via-[#ea580c] to-[#f59e0b]",
      icon: "pending",
    },
    {
      label: "Delisted",
      value: summary.delisted,
      helper: "Records no longer active in the organization.",
      tone: "from-[#7f1d1d] via-[#b91c1c] to-[#dc2626]",
      icon: "delisted",
    },
  ];

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
    {
      label: "Open school directory",
      description: "Jump to the organization school list for detailed records.",
      action: () => router.push("/organization-admin/school-list"),
      icon: "directory",
      variant: "secondary",
    },
  ];

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!event.target.closest("[data-company-action-menu]")) {
        setOpenActionMenuId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

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

  const openApproveDialog = (company) => {
    setSelectedCompany(company);
    setActionDialogMode(company?.delist ? "enlist" : "approve");
    setActionForm({
      active_from:
        toDateInputValue(company?.active_from) ||
        toDateInputValue(new Date().toISOString()),
      active_upto: toDateInputValue(company?.active_upto),
    });
    setActionError("");
    setOpenActionMenuId(null);
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
    setOpenActionMenuId(null);
  };

  const handleDelist = async (company) => {
    setSelectedCompany(company);
    setIsSubmittingAction(true);
    setActionError("");
    setOpenActionMenuId(null);

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

    if (!actionForm.active_from || !actionForm.active_upto) {
      setActionError("Active from and active until are required.");
      return;
    }

    setIsSubmittingAction(true);
    setActionError("");

    try {
      await approveCompany({
        company_id: selectedCompany?.company_id || selectedCompany?.id,
        active_from: actionForm.active_from,
        active_upto: actionForm.active_upto,
      });
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
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                    Organization
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                    {organizationContext.name}
                  </h1>
                </div>
              </div>
            </section>

            <section className="mt-8 grid gap-4 lg:grid-cols-4">
              {statusCards.map((card) => (
                <article
                  key={card.label}
                  className={`overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]`}
                >
                  <div className={`h-1.5 bg-gradient-to-r ${card.tone}`} />
                  <div className="space-y-4 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                        {card.label}
                      </p>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                        <StatIcon type={card.icon} />
                      </span>
                    </div>
                    <p className="text-4xl font-semibold text-slate-900">{card.value}</p>
                    <p className="text-sm leading-6 text-slate-500">{card.helper}</p>
                  </div>
                </article>
              ))}
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
                    Updated {formatDate(new Date().toISOString())}
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
                      <div className="rounded-[24px] bg-[#f6faf7] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Active records
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-slate-900">
                          {dashboardMetrics.active}
                        </p>
                      </div>
                      <div className="rounded-[24px] bg-[#fff8ef] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Pending approvals
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-slate-900">
                          {dashboardMetrics.pending}
                        </p>
                      </div>
                      <div className="rounded-[24px] bg-[#fff2f2] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Delisted records
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-slate-900">
                          {summary.delisted}
                        </p>
                      </div>
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

            <section className="mt-8 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                    Organization records
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    Group-wise records attached to this organization
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Records are separated into Vidya school data and Swasthya hospital data so each list stays aligned to its main group and subgroup.
                  </p>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                  {schoolRecords.length + hospitalRecords.length} records
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
              ) : schoolRecords.length === 0 && hospitalRecords.length === 0 ? (
                <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                  No school or hospital records are linked to this organization yet.
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  {[
                    {
                      key: "vidya",
                      caption: "Vidya",
                      title: "School List",
                      records: schoolRecords,
                      emptyMessage: "No Vidya school records are linked to this organization.",
                    },
                    {
                      key: "swasthya",
                      caption: "Swasthya",
                      title: "Hospital List",
                      records: hospitalRecords,
                      emptyMessage: "No Swasthya hospital records are linked to this organization.",
                    },
                  ].map((section) => (
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
                        <div className="min-w-[1120px]">
                        <div className="grid grid-cols-[minmax(220px,1.7fr)_minmax(160px,1.1fr)_minmax(220px,1.5fr)_120px_120px_120px_120px_72px] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <span>{section.key === "vidya" ? "School" : "Hospital"}</span>
                          <span>Admin owner</span>
                          <span>Contact email</span>
                          <span>Status</span>
                          <span>Active from</span>
                          <span>Active until</span>
                          <span>Delist</span>
                          <span className="text-right">Actions</span>
                        </div>
                        {section.records.length ? section.records.map((company) => {
                          const isApproved = Boolean(company?.is_approved);
                          const isDelisted = Boolean(company?.delist);
                          return (
                            <article
                              key={company.id}
                              className="border-t border-slate-200 first:border-t-0"
                            >
                              <div className="grid grid-cols-[minmax(220px,1.7fr)_minmax(160px,1.1fr)_minmax(220px,1.5fr)_120px_120px_120px_120px_72px] gap-4 px-5 py-5 items-center">
                                <div>
                                  <p className="text-base font-semibold text-slate-900">
                                    {company.company_name || "Unnamed record"}
                                  </p>
                                  {/* <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                                    ID {company.company_id || company.id}
                                  </p> */}
                                </div>

                                <div className="text-sm font-medium text-slate-900">
                                  {company.admin_name || "-"}
                                </div>

                                <div className="break-all text-sm font-medium text-slate-900">
                                  {company.email || "-"}
                                </div>

                                <div>
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                                      isApproved
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {isApproved ? "Approved" : "Pending"}
                                  </span>
                                </div>

                                <div className="text-sm font-medium text-slate-900">
                                  {formatDate(company.active_from)}
                                </div>

                                <div className="text-sm font-medium text-slate-900">
                                  {formatDate(company.active_upto)}
                                </div>

                                <div>
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                                      isDelisted
                                        ? "bg-rose-100 text-rose-700"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {isDelisted ? "Yes" : "No"}
                                  </span>
                                </div>

                                <div
                                  className="relative flex justify-end"
                                  data-company-action-menu="true"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenActionMenuId((previous) =>
                                        previous === company.id ? null : company.id,
                                      )
                                    }
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                                    aria-label={`Open actions for ${company.company_name || "record"}`}
                                  >
                                    <RowMenuIcon />
                                  </button>

                                  {openActionMenuId === company.id ? (
                                    <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                      <button
                                        type="button"
                                        onClick={() => openApproveDialog(company)}
                                        className="w-full border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                      >
                                        {isDelisted ? "Enlist" : "Approve"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openEditValidityDialog(company)}
                                        className="w-full border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                      >
                                        Edit valid date
                                      </button>
                                      {!isDelisted ? (
                                        <button
                                          type="button"
                                          onClick={() => handleDelist(company)}
                                          className="w-full px-4 py-3 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                                        >
                                          Delist
                                        </button>
                                      ) : null}
                                    </div>
                                  ) : null}
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
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Active from</span>
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

              <label className="block">
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
              </label>

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
                    ? "Approve record"
                    : actionDialogMode === "enlist"
                    ? "Enlist record"
                    : "Save validity"}
                </button>
              </div>
            </form>
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
