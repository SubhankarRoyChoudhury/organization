"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, MoreVertical } from "lucide-react";
import {
  getOrganizationSchools,
  getOrganizations,
  getCompanyInfo,
  delistCompany,
  approveCompany,
  unapproveCompany,
  getOrganizationUserDetails,
} from "@/app/api/apiService";
import CreateCompanyDialog from "@/components/ui/create-company-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateValue, toDateInputValue } from "@/lib/companyLocale";

const formatDate = (value) => formatDateValue(value, { fallback: "-" });

const formatDateForInput = (value) => toDateInputValue(value);

export default function OrganizationAdminSchoolListPage() {
  const router = useRouter();
  const [schools, setSchools] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const createCompanyDialogRef = useRef(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionMessageTone, setActionMessageTone] = useState("error");
  const [loadingCompanyId, setLoadingCompanyId] = useState(null);
  const [deletingCompanyId, setDeletingCompanyId] = useState(null);
  const [approvingCompanyId, setApprovingCompanyId] = useState(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [companyPendingApproval, setCompanyPendingApproval] = useState(null);
  const [approvalAction, setApprovalAction] = useState("approve");
  const [organizationUserLevel, setOrganizationUserLevel] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const canCreateSchool = organizationUserLevel === "Level2";
  const categoryMenuRef = useRef(null);

  const categoryOptions = useMemo(() => {
    const categorySet = new Set();
    schools.forEach((school) => {
      const category = String(school?.school_category || "").trim();
      if (category) {
        categorySet.add(category);
      }
    });
    return Array.from(categorySet).sort((a, b) => a.localeCompare(b));
  }, [schools]);

  const filteredSchools = useMemo(() => {
    if (selectedCategoryFilter === "all") {
      return schools;
    }
    return schools.filter(
      (school) =>
        String(school?.school_category || "").trim() === selectedCategoryFilter,
    );
  }, [schools, selectedCategoryFilter]);

  const loadSchools = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getOrganizationSchools({ sub_group: "College" });
      const allCompanies = Array.isArray(response?.schools) ? response.schools : [];
      const vidyaCollegeCompanies = allCompanies.filter((company) => {
        const mainGroup = String(company?.main_group || "").trim().toLowerCase();
        const subGroup = String(
          company?.sub_group || company?.sub_category || "",
        ).trim().toLowerCase();
        return mainGroup === "vidya" && subGroup === "college";
      });
      setSchools(vidyaCollegeCompanies);
      setTotal(vidyaCollegeCompanies.length);
    } catch (err) {
      setError("Unable to load the college list.");
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

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

  useEffect(() => {
    let mounted = true;
    const loadOrganizations = async () => {
      try {
        setIsLoadingOrganizations(true);
        const response = await getOrganizations();
        if (!mounted) {
          return;
        }
        setOrganizations(Array.isArray(response) ? response : []);
      } catch (err) {
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
    const handleDocumentClick = (event) => {
      if (!event.target?.closest("[data-action-menu]")) {
        setActionMenuOpenId(null);
        setActionMenuPosition(null);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    if (!isCategoryMenuOpen) {
      return undefined;
    }
    const handleOutsideClick = (event) => {
      if (!categoryMenuRef.current?.contains(event.target)) {
        setIsCategoryMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isCategoryMenuOpen]);

  useEffect(() => {
    if (!actionMenuOpenId) {
      return undefined;
    }
    const closeMenu = () => {
      setActionMenuOpenId(null);
      setActionMenuPosition(null);
    };
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [actionMenuOpenId]);

  const toggleActionMenu = (schoolId, event) => {
    const rect = event?.currentTarget?.getBoundingClientRect?.() || null;
    setActionMenuOpenId((prev) => {
      if (prev === schoolId) {
        setActionMenuPosition(null);
        return null;
      }
      if (!rect) {
        setActionMenuPosition(null);
        return schoolId;
      }
      const menuWidth = 160;
      const padding = 12;
      const left = Math.max(
        padding,
        Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - padding),
      );
      setActionMenuPosition({
        top: rect.bottom + 8,
        left,
      });
      return schoolId;
    });
  };

  const handleEditSchool = async (school) => {
    setActionMessage("");
    setActionMenuOpenId(null);
    setActionMenuPosition(null);
    const identifierCandidates = [
      school.id ? String(school.id) : null,
      school.company_id ? String(school.company_id) : null,
    ].filter(Boolean);
    if (!identifierCandidates.length) {
      setActionMessageTone("error");
      setActionMessage("Unable to determine the selected company.");
      return;
    }

    setLoadingCompanyId(school.id);
    let companyInfoPayload = null;
    let companyUsername = "";
    let companyPayload = null;
    for (const candidate of identifierCandidates) {
      try {
        const companyInfoResponse = await getCompanyInfo(candidate, undefined, {
          byCompanyId: true,
        });
        companyInfoPayload =
          companyInfoResponse?.response?.company_info ||
          companyInfoResponse?.response?.companyInfo ||
          null;
        companyPayload = companyInfoResponse?.response?.company || null;
        companyUsername = companyInfoResponse?.response?.company?.username || "";
        break;
      } catch (infoError) {
        console.error("Unable to load company info for", candidate, infoError);
      }
    }

    setLoadingCompanyId(null);

    const initialValues = {
      id: companyInfoPayload?.id || "",
      company_id:
        companyInfoPayload?.company_id || school.company_id || "",
      organization_id:
        companyInfoPayload?.organization_id ||
        school.company_id ||
        "",
      company_name:
        companyInfoPayload?.company_name || school.company_name || "",
      location:
        companyInfoPayload?.location ||
        companyPayload?.location ||
        school.location ||
        "",
      district:
        companyInfoPayload?.district ||
        companyPayload?.district ||
        school.district ||
        "",
      school_code:
        companyInfoPayload?.school_code ||
        companyPayload?.school_code ||
        school.school_code ||
        "",
      start_date: formatDateForInput(
        companyInfoPayload?.start_date ||
          companyPayload?.start_date ||
          school.start_date,
      ),
      admin_name:
        companyInfoPayload?.admin_name || school.admin_name || "",
      username:
        companyInfoPayload?.username ||
        companyUsername ||
        school.username ||
        "",
      email:
        companyInfoPayload?.email ||
        school.email ||
        "",
      phone_number: companyInfoPayload?.mobile_no || "",
      address: companyInfoPayload?.address || "",
      city: companyInfoPayload?.city || "",
      state: companyInfoPayload?.head_office_state || "",
      country: companyInfoPayload?.country || "",
      pin: companyInfoPayload?.pin || "",
      main_group:
        school.main_group ||
        companyPayload?.main_group ||
        companyInfoPayload?.main_group ||
        "",
      sub_group:
        school.sub_group ||
        companyPayload?.sub_group ||
        school.sub_category ||
        companyInfoPayload?.sub_group ||
        companyInfoPayload?.sub_category ||
        "",
      school_category:
        school.school_category ||
        companyPayload?.school_category ||
        companyInfoPayload?.school_category ||
        "",
    };

    createCompanyDialogRef.current?.open({
      initialValues,
      mode: "update",
    });
  };

  const handleDeleteSchool = async (school) => {
    setActionMessage("");
    setActionMenuOpenId(null);
    setActionMenuPosition(null);
    const identifier = school.company_id || school.id;
    if (!identifier) {
      setActionMessageTone("error");
      setActionMessage("Unable to determine the selected company.");
      return;
    }

    setDeletingCompanyId(school.id);
    try {
      await delistCompany({ company_id: identifier });
      setActionMessageTone("success");
      setActionMessage("Company delisted successfully.");
      await loadSchools();
    } catch (deleteError) {
      console.error("Unable to delete company:", deleteError);
      setActionMessageTone("error");
      setActionMessage(
        deleteError.response?.data?.error ||
          deleteError.response?.data?.detail ||
          "Unable to delete the company.",
      );
    } finally {
      setDeletingCompanyId(null);
    }
  };

  const openApproveDialog = (school, action = "approve") => {
    setActionMessage("");
    setActionMenuOpenId(null);
    setActionMenuPosition(null);
    setCompanyPendingApproval(school);
    setApprovalAction(action);
    setApproveDialogOpen(true);
  };

  const handleApproveCompany = async () => {
    if (!companyPendingApproval) {
      return;
    }
    const identifier =
      companyPendingApproval.company_id || companyPendingApproval.id;
    if (!identifier) {
      setActionMessageTone("error");
      setActionMessage("Unable to determine the selected company.");
      return;
    }

    try {
      setApprovingCompanyId(companyPendingApproval.id);
      if (approvalAction === "unapprove") {
        await unapproveCompany({ company_id: identifier });
      } else {
        await approveCompany({
          company_id: identifier,
          active_from: new Date().toISOString().slice(0, 10),
        });
      }
      setApproveDialogOpen(false);
      setCompanyPendingApproval(null);
      setActionMessageTone("success");
      setActionMessage(
        approvalAction === "unapprove"
          ? "Company unapproved successfully."
          : "Company approved successfully.",
      );
      await loadSchools();
    } catch (approveError) {
      console.error("Unable to update approval status:", approveError);
      setActionMessageTone("error");
      setActionMessage(
        approveError.response?.data?.error ||
          approveError.response?.data?.detail ||
          "Unable to update company approval status.",
      );
    } finally {
      setApprovingCompanyId(null);
    }
  };

  const openCompanyAccountDialogWithOrganizationName = (
    name,
    mainCategory,
    subCategory = "",
  ) => {
    setActionMessage("");
    createCompanyDialogRef.current?.open({
      organizationName: name,
      mainCategory,
      subCategory,
      mode: "create",
    });
  };

  const renderTable = () => {
    if (loading) {
      return <p className="text-sm text-slate-500">Loading colleges...</p>;
    }
    if (error) {
      return (
        <p className="text-sm font-medium text-rose-600">
          {error}
        </p>
      );
    }
    if (filteredSchools.length === 0) {
      return <p className="text-sm text-slate-500">No colleges found.</p>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-3 px-3">Sl. No.</th>
              <th className="py-3 px-3">College</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3">Location</th>
              <th className="py-3 px-3">Admin</th>
              {/* <th className="py-3 px-3">Email</th> */}
              <th className="py-3 px-3">UserId</th>
              <th className="py-3 px-3">Address</th>
              <th className="py-3 px-3">District</th>
              <th className="py-3 px-3">City</th>
              <th className="py-3 px-3">State</th>
              <th className="py-3 px-3">Approved</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchools.map((school, index) => (
              <tr
                key={school.id}
                className="border-b border-slate-100 last:border-b-0"
              >
                <td className="py-3 px-3 font-medium text-slate-900">
                  {index + 1}
                </td>
                <td className="py-3 px-3 font-medium text-slate-900">
                  {school.company_name || "—"}
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {school.school_category || "—"}
                </td>
                <td className="py-3 px-3 font-medium text-slate-900">
                  {school.location || "—"}
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {school.admin_name || "—"}
                </td>
                {/* <td className="py-3 px-3 text-slate-600">
                  {school.email || "—"}
                </td> */}
                 <td className="py-3 px-3 text-slate-600">
                  {school.username || "—"}
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {school.address || "—"}
                </td>
                <td className="py-3 px-3 font-medium text-slate-900">
                  {school.district || "—"}
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {school.city || "—"}
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {school.state || school.head_office_state || "—"}
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      school.is_approved
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {school.is_approved ? "Yes" : "Pending"}
                  </span>
                </td>
                {/* <td className="py-3 px-3 text-slate-600">
                  {formatDate(school.active_from)}
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {formatDate(school.active_upto)}
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {formatDate(school.registrationDate)}
                </td> */}
                <td className="py-3 px-3 text-right text-slate-600">
                  <div
                    className="relative inline-flex justify-end"
                    data-action-menu="true"
                  >
                    <button
                      type="button"
                      onClick={(event) => toggleActionMenu(school.id, event)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {actionMenuOpenId === school.id && actionMenuPosition && (
                      <div
                        className="fixed z-[90] w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left text-sm shadow-lg"
                        style={{
                          top: `${actionMenuPosition.top}px`,
                          left: `${actionMenuPosition.left}px`,
                        }}
                        data-action-menu="true"
                      >
                        <button
                          type="button"
                          onClick={() => handleEditSchool(school)}
                          disabled={loadingCompanyId === school.id}
                          className="w-full px-4 py-2 text-left font-medium text-slate-700 transition hover:bg-slate-50 disabled:text-slate-400"
                        >
                          {loadingCompanyId === school.id ? "Loading..." : "Edit"}
                        </button>
                        {!school.is_approved ? (
                          <button
                            type="button"
                            onClick={() => openApproveDialog(school, "approve")}
                            disabled={approvingCompanyId === school.id}
                            className="w-full px-4 py-2 text-left font-medium text-emerald-700 transition hover:bg-slate-50 disabled:text-emerald-200"
                          >
                            {approvingCompanyId === school.id ? "Approving..." : "Approve"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openApproveDialog(school, "unapprove")}
                            disabled={approvingCompanyId === school.id}
                            className="w-full px-4 py-2 text-left font-medium text-amber-700 transition hover:bg-slate-50 disabled:text-amber-200"
                          >
                            {approvingCompanyId === school.id ? "UnApproving..." : "UnApprove"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteSchool(school)}
                          disabled={deletingCompanyId === school.id}
                          className="w-full px-4 py-2 text-left font-medium text-rose-600 transition hover:bg-slate-50 disabled:text-rose-200"
                        >
                          {deletingCompanyId === school.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <main className="min-h-screen bg-slate-50 py-10">
        <div className="w-full space-y-6 px-4 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                {/* <p className="text-xs font-semibold uppercase tracking-[2px] text-slate-400">
                  Organization Admin
                </p> */}
                <h1 className="text-2xl font-semibold text-slate-900">
                  College List
                </h1>
              </div>
              <div className="flex gap-2">
                <div className="relative" ref={categoryMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                    className="inline-flex min-w-[180px] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Filter className="h-4 w-4 text-slate-500" />
                      <span>
                      {selectedCategoryFilter === "all"
                        ? "All Categories"
                        : selectedCategoryFilter}
                      </span>
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 text-slate-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {isCategoryMenuOpen ? (
                    <div className="absolute right-0 z-30 mt-2 min-w-[180px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategoryFilter("all");
                          setIsCategoryMenuOpen(false);
                        }}
                        className={`block w-full px-3 py-2 text-left text-sm transition ${
                          selectedCategoryFilter === "all"
                            ? "bg-slate-100 font-semibold text-slate-900"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        All Categories
                      </button>
                      {categoryOptions.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            setSelectedCategoryFilter(category);
                            setIsCategoryMenuOpen(false);
                          }}
                          className={`block w-full px-3 py-2 text-left text-sm transition ${
                            selectedCategoryFilter === category
                              ? "bg-slate-100 font-semibold text-slate-900"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/organization-admin")}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                >
                  Back to Org Dashboard
                </button>
                {canCreateSchool && (
                  <button
                    className="super-button is-secondary rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                    type="button"
                    onClick={() => {
                      if (!canCreateSchool) {
                        return;
                      }
                      openCompanyAccountDialogWithOrganizationName(
                        "Vidya",
                        "Vidya",
                        "College",
                      );
                    }}
                  >
                    Create College
                  </button>
                )}
              </div>
            </div>
            {/* <p className="text-sm text-slate-500">
              The list shows only companies from your organization whose sub-category is &quot;School&quot;.
            </p> */}
          </header>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
            {/* <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[1px] text-slate-400">
                  Total schools
                </p>
                <p className="text-3xl font-semibold text-slate-900">
                  {total ?? "-"}
                </p>
              </div>
              <p className="text-sm text-slate-500">
                Showing the current roster of School sub-category companies.
              </p>
            </div> */}
            {actionMessage && (
              <p
                className={`text-sm font-medium ${
                  actionMessageTone === "success"
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {actionMessage}
              </p>
            )}
            <div className="mt-6">{renderTable()}</div>
          </section>
        </div>
      </main>
      <CreateCompanyDialog
        ref={createCompanyDialogRef}
        organizations={organizations}
        isLoadingOrganizations={isLoadingOrganizations}
        onSuccess={loadSchools}
      />
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-slate-200 bg-white p-0">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-xl text-slate-900">
                {approvalAction === "unapprove" ? "UnApprove Company" : "Approve Company"}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                {approvalAction === "unapprove" ? "UnApprove " : "Approve "}
                <span className="font-semibold text-slate-900">
                  {companyPendingApproval?.company_name || "this company"}
                </span>
                ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6">
              <button
                type="button"
                onClick={() => setApproveDialogOpen(false)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveCompany}
                disabled={Boolean(approvingCompanyId)}
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {approvingCompanyId
                  ? approvalAction === "unapprove"
                    ? "UnApproving..."
                    : "Approving..."
                  : approvalAction === "unapprove"
                  ? "UnApprove"
                  : "Approve"}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
