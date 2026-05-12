"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AccessDeniedDialog from "@/components/ui/AccessDeniedDialog";
import StaffCreateDialog from "@/components/ui/StaffCreateDialog";
import DelistConfirmDialog from "@/components/ui/DelistConfirmDialog";
import {
  createNonTeachingStaffList,
  delistNonTeachingStaffList,
  getCurrentSchoolInfo,
  getAttachmentsWithIDs,
  getNonTeachingStaffList,
  updateNonTeachingStaffList,
} from "@/lib/apiService";

function formatDob(value) {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(parsed);
  const day = parts.find((part) => part.type === "day")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const year = parts.find((part) => part.type === "year")?.value || "";
  if (!day || !month || !year) {
    return "-";
  }
  return `${day} ${month}, ${year}`;
}

function getStaffInitials(name) {
  const firstLetter = String(name || "").trim().charAt(0).toUpperCase();
  return firstLetter || "S";
}

const isAbsoluteUrl = (value) =>
  /^https?:\/\//i.test(value || "") || /^data:/i.test(value || "");

function buildAttachmentPreviewUrl(attachment) {
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
}

function getVisiblePageItems(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "...", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "...", totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "...", currentPage, "...", totalPages];
}

export default function NonTeachingPage() {
  const [allStaffList, setAllStaffList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [staffAttachmentPreviews, setStaffAttachmentPreviews] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [isSearchVisibleSmallScreen, setIsSearchVisibleSmallScreen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [companyId, setCompanyId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [isCurrentUserHeadMaster, setIsCurrentUserHeadMaster] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [dialogMode, setDialogMode] = useState("create");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAccessDeniedDialogOpen, setIsAccessDeniedDialogOpen] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");
  const STAFF_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(totalCount / STAFF_PER_PAGE));
  const visiblePageItems = getVisiblePageItems(currentPage, totalPages);

  const fetchStaffList = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getNonTeachingStaffList();
      setAllStaffList(Array.isArray(data) ? data : []);
    } catch (_error) {
      setErrorMessage("Unable to load non-teaching staff list.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchText]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchText]);

  useEffect(() => {
    const normalizedSearch = debouncedSearchText.toLowerCase();
    const filteredStaff = normalizedSearch
      ? allStaffList.filter((staff) => {
          const searchFields = [
            staff?.name,
            staff?.username,
            staff?.mobile,
            staff?.email,
            staff?.qualification,
            staff?.experience,
          ];
          return searchFields.some((value) =>
            String(value ?? "").toLowerCase().includes(normalizedSearch),
          );
        })
      : allStaffList;

    const total = filteredStaff.length;
    const start = (currentPage - 1) * STAFF_PER_PAGE;
    const pageData = filteredStaff.slice(start, start + STAFF_PER_PAGE);
    const previousExists = currentPage > 1;
    const nextExists = start + STAFF_PER_PAGE < total;

    setStaffList(pageData);
    setTotalCount(total);
    setHasPreviousPage(previousExists);
    setHasNextPage(nextExists);

    if (currentPage > 1 && pageData.length === 0 && total > 0) {
      setCurrentPage((prev) => Math.max(1, prev - 1));
    }
  }, [allStaffList, currentPage, debouncedSearchText]);

  useEffect(() => {
    if (!staffList.length) {
      setStaffAttachmentPreviews({});
      return undefined;
    }

    const attachmentIds = Array.from(
      new Set(
        staffList
          .map((staff) => Number(staff?.attachment_id || 0))
          .filter((attachmentId) => Number.isFinite(attachmentId) && attachmentId > 0),
      ),
    );

    if (!attachmentIds.length) {
      setStaffAttachmentPreviews({});
      return undefined;
    }

    let mounted = true;
    getAttachmentsWithIDs(attachmentIds)
      .then((data) => {
        if (!mounted) {
          return;
        }

        const attachments = Array.isArray(data?.response) ? data.response : [];
        const nextPreviews = {};
        attachments.forEach((attachment) => {
          const preview = buildAttachmentPreviewUrl(attachment);
          if (preview) {
            nextPreviews[String(attachment.id)] = preview;
          }
        });
        setStaffAttachmentPreviews(nextPreviews);
      })
      .catch(() => {
        if (mounted) {
          setStaffAttachmentPreviews({});
        }
      });

    return () => {
      mounted = false;
    };
  }, [staffList]);

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const data = await getCurrentSchoolInfo();
        if (data?.company?.id) {
          setCompanyId(data.company.id);
        }
        setCurrentUserRole(String(data?.role || "").trim().toLowerCase());
        setIsCurrentUserHeadMaster(Boolean(data?.is_head_master));
      } catch (_error) {
        setCompanyId(null);
        setCurrentUserRole("");
        setIsCurrentUserHeadMaster(false);
      }
    };
    loadCompany();
  }, []);

  const handleSaveStaff = async (staffData) => {
    const payload = {
      company_id: staffData.companyId || companyId || undefined,
      name: staffData.name,
      username: staffData.username || "",
      role: staffData.role || "non-teaching",
      job_title: staffData.job_title || staffData.role || "",
      mobile: staffData.mobile || "",
      email: staffData.email,
      is_verified: Boolean(staffData.is_verified),
      password: "abc123",
      dob: staffData.dob,
      qualification: staffData.qualification || "",
      experience: staffData.experience || "",
      address: staffData.address || "",
      country: staffData.country || "",
      state: staffData.state || "",
      city: staffData.city || "",
      pin: staffData.pin || "",
      attachment_id: staffData.attachmentId,
    };

    if (dialogMode === "edit" && staffData.id) {
      await updateNonTeachingStaffList(staffData.id, payload, staffData.accessToken);
    } else {
      await createNonTeachingStaffList(payload, staffData.accessToken);
    }

    await fetchStaffList();
    setIsCreateDialogOpen(false);
    setSelectedStaff(null);
    setDialogMode("create");
  };

  const handleOpenCreate = () => {
    setDialogMode("create");
    setSelectedStaff(null);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (staffItem) => {
    setActiveMenu(null);
    if (currentUserRole === "non-teaching" || (currentUserRole === "teacher" && !isCurrentUserHeadMaster)) {
      setAccessDeniedMessage("Teacher cannot edit");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
    setDialogMode("edit");
    setSelectedStaff(staffItem);
    setIsCreateDialogOpen(true);
  };

  const handleReview = (staffItem) => {
    setActiveMenu(null);
    setDialogMode("review");
    setSelectedStaff(staffItem);
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (staffItem) => {
    setActiveMenu(null);
    if (currentUserRole === "non-teaching") {
      setAccessDeniedMessage("Non-teaching staff cannot delete");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
    setDeleteTarget(staffItem);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    const accessToken =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token") || ""
        : "";
    try {
      await delistNonTeachingStaffList(deleteTarget.id, accessToken);
      await fetchStaffList();
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleActionMenu = (event, staffItem) => {
    event.stopPropagation();
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 144;
    const menuHeight = 88;
    const gap = 6;
    const viewportPadding = 8;

    const left = Math.min(
      Math.max(viewportPadding, buttonRect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );

    const canOpenBelow =
      window.innerHeight - buttonRect.bottom >= menuHeight + gap + viewportPadding;
    const top = canOpenBelow
      ? buttonRect.bottom + gap
      : Math.max(viewportPadding, buttonRect.top - menuHeight - gap);

    const nextMenu = {
      id: staffItem.id,
      staffItem,
      top,
      left,
    };

    setActiveMenu((prev) => (prev?.id === staffItem.id ? null : nextMenu));
  };

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        setActiveMenu(null);
        return;
      }
      if (
        target.closest("[data-action-menu-trigger='true']") ||
        target.closest("[data-action-menu='true']")
      ) {
        return;
      }
      setActiveMenu(null);
    };

    const closeMenu = () => setActiveMenu(null);

    document.addEventListener("click", closeOnOutsideClick);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      document.removeEventListener("click", closeOnOutsideClick);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, []);

  return (
    <main className="dashboard-shell h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full w-full flex-col px-3 pb-4 pt-16 sm:px-6 lg:px-8 lg:pt-8">
        <section className="shrink-0 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-700 via-cyan-700 to-teal-700 px-4 py-4 text-white shadow-[0_16px_34px_rgba(14,116,144,0.25)] sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <h1 className="min-w-0 flex-1 text-lg font-semibold leading-tight tracking-wide sm:text-2xl">
              Non-Teaching Staff
            </h1>
            <div className="hidden items-center gap-3 lg:flex">
              <label htmlFor="staff-search-desktop" className="sr-only">
                Search non-teaching staff
              </label>
              <input
                id="staff-search-desktop"
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search name, username, email, mobile, qualification"
                className="h-10 w-[320px] max-w-[52vw] rounded-lg border border-white/70 bg-white/95 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-500 focus:border-white focus:ring-2 focus:ring-white/70"
              />
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(true)}
                className="inline-flex items-center justify-center rounded-full border border-white/80 bg-white p-2.5 text-sky-700 shadow-sm transition hover:bg-sky-50"
                aria-label="Watch non-teaching staff setup video"
                title="Watch non-teaching staff setup video"
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
                type="button"
                onClick={handleOpenCreate}
                className="whitespace-nowrap rounded-lg bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
              >
                Add Staff
              </button>
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() =>
                  setIsSearchVisibleSmallScreen((prevVisible) => !prevVisible)
                }
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm transition hover:bg-sky-50"
                aria-label="Toggle non-teaching search"
                title="Search non-teaching staff"
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
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white text-sky-700 shadow-sm transition hover:bg-sky-50"
                aria-label="Watch non-teaching staff setup video"
                title="Watch non-teaching staff setup video"
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
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white text-sky-700 shadow-sm transition hover:bg-sky-50"
                aria-label="Add staff"
                title="Add staff"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="10" cy="8" r="3" />
                  <path d="M4.8 18c0-2.87 2.33-5.2 5.2-5.2s5.2 2.33 5.2 5.2" />
                  <path d="M18.5 9.5v5" />
                  <path d="M16 12h5" />
                </svg>
              </button>
            </div>
          </div>
          {isSearchVisibleSmallScreen ? (
            <div className="mt-3 lg:hidden">
              <label htmlFor="staff-search-mobile" className="sr-only">
                Search non-teaching staff
              </label>
              <input
                id="staff-search-mobile"
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search name, username, email, mobile, qualification"
                className="h-10 w-full rounded-lg border border-white/70 bg-white/95 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-500 focus:border-white focus:ring-2 focus:ring-white/70"
              />
            </div>
          ) : null}
        </section>

        <section className="mt-6 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-center text-slate-500">
                  {/* <th className="px-2 py-3 font-semibold">SL.No.</th> */}
                  <th className="px-2 py-3 font-semibold">Photo</th>
                  <th className="px-2 py-3 font-semibold">Name</th>
                  <th className="px-2 py-3 font-semibold">Username</th>
                  {/* <th className="px-2 py-3 font-semibold">Mobile</th>
                  <th className="px-2 py-3 font-semibold">Email</th>
                  <th className="px-2 py-3 font-semibold">DOB</th> */}
                  <th className="px-2 py-3 font-semibold">Qualification</th>
                  <th className="px-2 py-3 font-semibold">Experience</th>
                  {/* <th className="px-2 py-3 font-semibold">Address</th>
                  <th className="px-2 py-3 font-semibold">State</th>
                  <th className="px-2 py-3 font-semibold">City</th>
                  <th className="px-2 py-3 font-semibold">PIN</th>
                  <th className="px-2 py-3 font-semibold">Attachment ID</th> */}
                  <th className="px-2 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3" colSpan={6}>
                      Loading...
                    </td>
                  </tr>
                ) : null}
                {!isLoading && errorMessage ? (
                  <tr className="border-b border-slate-100 text-sm text-red-600">
                    <td className="px-2 py-3" colSpan={6}>
                      {errorMessage}
                    </td>
                  </tr>
                ) : null}
                {!isLoading && !errorMessage && staffList.length === 0 ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3" colSpan={6}>
                      No non-teaching staff records found.
                    </td>
                  </tr>
                ) : null}
                {staffList.map((staff, index) => (
                  <tr
                    key={staff.id}
                    className="border-b border-slate-100 text-sm text-slate-700 text-center"
                  >
                    {/* <td className="px-2 py-3 font-medium text-slate-800">{index + 1}</td> */}
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-center">
                        <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-sky-50">
                          {staff.attachment_id &&
                          staffAttachmentPreviews[String(staff.attachment_id)] ? (
                            <img
                              src={staffAttachmentPreviews[String(staff.attachment_id)]}
                              alt={`${staff.name || "Staff"} profile`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-sky-100 text-sm font-semibold text-sky-700">
                              {getStaffInitials(staff.name)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3">{staff.name || "-"}</td>
                    <td className="px-2 py-3">{staff.username || "-"}</td>
                    {/* <td className="px-2 py-3">{staff.mobile || "-"}</td>
                    <td className="px-2 py-3">{staff.email || "-"}</td>
                    <td className="px-2 py-3">{formatDob(staff.dob)}</td> */}
                    <td className="px-2 py-3">{staff.qualification || "-"}</td>
                    <td className="px-2 py-3">{staff.experience || "-"}</td>
                    {/* <td className="px-2 py-3">{staff.address || "-"}</td>
                    <td className="px-2 py-3">{staff.state || "-"}</td>
                    <td className="px-2 py-3">{staff.city || "-"}</td>
                    <td className="px-2 py-3">{staff.pin || "-"}</td>
                    <td className="px-2 py-3">{staff.attachment_id ?? "-"}</td> */}
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        data-action-menu-trigger="true"
                        onClick={(event) => toggleActionMenu(event, staff)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
                        aria-label="Staff actions"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="5" r="1.8" />
                          <circle cx="12" cy="12" r="1.8" />
                          <circle cx="12" cy="19" r="1.8" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-4 shrink-0 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
          <p className="text-sm text-slate-600">
            Showing{" "}
            {staffList.length > 0 ? (currentPage - 1) * STAFF_PER_PAGE + 1 : 0}
            -
            {(currentPage - 1) * STAFF_PER_PAGE + staffList.length} of{" "}
            {totalCount}
          </p>
          <div className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={isLoading || !hasPreviousPage}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            {visiblePageItems.map((item, index) =>
              item === "..." ? (
                <span
                  key={`ellipsis-${index}`}
                  className="inline-flex h-7 min-w-[18px] items-center justify-center text-xs text-slate-500"
                >
                  ...
                </span>
              ) : (
                <button
                  key={`page-${item}`}
                  type="button"
                  onClick={() => setCurrentPage(item)}
                  disabled={isLoading || item === currentPage}
                  className={`inline-flex h-7 min-w-[20px] items-center justify-center rounded px-1.5 text-xs font-medium transition ${
                    item === currentPage
                      ? "bg-sky-500 text-white"
                      : "text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                  } disabled:cursor-not-allowed`}
                >
                  {item}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={isLoading || !hasNextPage}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h2 className="text-base font-semibold text-gray-900">
                Non-Teaching Staff Video Guide
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
                src="https://www.youtube-nocookie.com/embed/iI2dXIcfOds?autoplay=1&vq=hd1080&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1"
                title="Non-teaching staff setup tutorial video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      <StaffCreateDialog
        key={`${dialogMode}-${selectedStaff?.id || "new"}-${isCreateDialogOpen ? "open" : "closed"}`}
        open={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setSelectedStaff(null);
          setDialogMode("create");
        }}
        onCreate={handleSaveStaff}
        companyId={companyId}
        initialData={selectedStaff}
        mode={dialogMode}
        staffMembers={allStaffList}
      />

      {activeMenu && typeof document !== "undefined"
        ? createPortal(
            <div
              data-action-menu="true"
              className="fixed z-[1000] w-36 overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.28)]"
              style={{ top: activeMenu.top, left: activeMenu.left }}
            >
              <button
                type="button"
                onClick={() => handleReview(activeMenu.staffItem)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Review
              </button>
              <button
                type="button"
                onClick={() => handleEdit(activeMenu.staffItem)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(activeMenu.staffItem)}
                className="block w-full px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
              >
                Delete
              </button>
            </div>,
            document.body,
          )
        : null}

      <DelistConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => {
          if (isDeleting) {
            return;
          }
          setIsDeleteDialogOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        itemLabel={deleteTarget?.name || "this staff"}
        isSubmitting={isDeleting}
      />

      <AccessDeniedDialog
        open={isAccessDeniedDialogOpen}
        message={accessDeniedMessage || "Teacher cannot edit"}
        onClose={() => {
          setIsAccessDeniedDialogOpen(false);
          setAccessDeniedMessage("");
        }}
      />
    </main>
  );
}
