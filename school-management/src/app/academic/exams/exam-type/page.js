"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import AccessDeniedDialog from "@/components/ui/AccessDeniedDialog";
import ExamTypeCreateDialog from "@/components/ui/ExamTypeCreateDialog";
import DelistConfirmDialog from "@/components/ui/DelistConfirmDialog";
import {
  createExamTypeList,
  delistExamTypeList,
  getAcademicYearList,
  getCurrentSchoolInfo,
  getExamTypeList,
  getExamTypeListById,
  updateExamTypeList,
} from "@/lib/apiService";

function formatDate(value) {
  if (!value) {
    return "-";
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function formatAcademicYearLabel(item) {
  return String(item?.academic_year_name || item?.academicYearName || "").trim();
}

export default function ExamTypePage() {
  const PAGE_SIZE = 5;
  const [examTypes, setExamTypes] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedExamType, setSelectedExamType] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [isDelistDialogOpen, setIsDelistDialogOpen] = useState(false);
  const [delistTarget, setDelistTarget] = useState(null);
  const [isDelisting, setIsDelisting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [companyId, setCompanyId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [isCurrentUserHeadMaster, setIsCurrentUserHeadMaster] = useState(false);
  const [isAccessDeniedDialogOpen, setIsAccessDeniedDialogOpen] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalExamTypeCount, setTotalExamTypeCount] = useState(0);

  const academicYearById = useMemo(() => {
    const entries = new Map();
    academicYears.forEach((item) => {
      entries.set(String(item.id), item);
    });
    return entries;
  }, [academicYears]);

  const fetchExamTypes = useCallback(async (pageToLoad = currentPage) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getExamTypeList({
        page: pageToLoad,
        pageSize: PAGE_SIZE,
      });
      if (Array.isArray(data)) {
        setExamTypes(data);
        setTotalExamTypeCount(data.length);
      } else {
        const results = Array.isArray(data?.results) ? data.results : [];
        setExamTypes(results);
        setTotalExamTypeCount(Number(data?.count) || 0);
      }
    } catch (_error) {
      setErrorMessage("Unable to load exam type list.");
      setExamTypes([]);
      setTotalExamTypeCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, PAGE_SIZE]);

  useEffect(() => {
    fetchExamTypes(currentPage);
  }, [fetchExamTypes, currentPage]);

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

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, []);

  useEffect(() => {
    const loadCompanyInfo = async () => {
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

    const loadAcademicYears = async () => {
      try {
        const data = await getAcademicYearList();
        setAcademicYears(Array.isArray(data) ? data : []);
      } catch (_error) {
        setAcademicYears([]);
      }
    };

    loadCompanyInfo();
    loadAcademicYears();
  }, []);

  const handleCreateExamType = async (payload) => {
    const requestPayload = {
      academic_year_id: Number(payload.academicYearId) || undefined,
      exam_name: payload.examName,
      exam_type: payload.examType,
      total_marks: payload.totalMarks,
      start_date: payload.startDate,
      end_date: payload.endDate,
      is_active: Boolean(payload.isActive),
      company_id: payload.companyId || companyId || undefined,
      created_by: payload.created_by || undefined,
      updated_by: payload.updated_by || undefined,
    };

    await createExamTypeList(requestPayload, payload.accessToken);
    await fetchExamTypes();
    setIsCreateDialogOpen(false);
    setSelectedExamType(null);
    setDialogMode("create");
  };

  const handleUpdateExamType = async (payload) => {
    const examTypeId = payload.id;
    if (!examTypeId) {
      throw new Error("Missing exam type id");
    }

    const requestPayload = {
      academic_year_id: Number(payload.academicYearId) || undefined,
      exam_name: payload.examName,
      exam_type: payload.examType,
      total_marks: payload.totalMarks,
      start_date: payload.startDate,
      end_date: payload.endDate,
      is_active: Boolean(payload.isActive),
      company_id: payload.companyId || companyId || undefined,
      created_by: payload.created_by || undefined,
      updated_by: payload.updated_by || undefined,
    };

    await updateExamTypeList(examTypeId, requestPayload, payload.accessToken);
    await fetchExamTypes();
    setIsCreateDialogOpen(false);
    setSelectedExamType(null);
    setDialogMode("create");
  };

  const handleOpenCreate = useCallback(() => {
    setSelectedExamType(null);
    setDialogMode("create");
    setIsCreateDialogOpen(true);
  }, []);

  const toggleActionMenu = useCallback((event, examTypeItem) => {
    event.stopPropagation();
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 144;
    const menuHeight = 88;
    const viewportPadding = 8;
    const spaceBelow = window.innerHeight - buttonRect.bottom - viewportPadding;
    const shouldOpenAbove =
      spaceBelow < menuHeight && buttonRect.top > menuHeight + viewportPadding;
    const left = Math.max(
      viewportPadding,
      Math.min(buttonRect.right - menuWidth, window.innerWidth - menuWidth - viewportPadding),
    );
    const top = shouldOpenAbove
      ? Math.max(viewportPadding, buttonRect.top - menuHeight - viewportPadding)
      : Math.min(
          buttonRect.bottom + viewportPadding,
          window.innerHeight - menuHeight - viewportPadding,
        );

    setActiveMenu((prev) =>
      prev?.examTypeItem?.id === examTypeItem.id
        ? null
        : {
            top,
            left,
            examTypeItem,
          },
    );
  }, []);

  const handleEdit = useCallback(async (examTypeItem) => {
    setActiveMenu(null);
    if (currentUserRole === "non-teaching" || (currentUserRole === "teacher" && !isCurrentUserHeadMaster)) {
      setAccessDeniedMessage("Teacher cannot edit");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
    try {
      const data = await getExamTypeListById(examTypeItem.id);
      setSelectedExamType(data || examTypeItem);
      setDialogMode("edit");
      setIsCreateDialogOpen(true);
    } catch (_error) {
      setErrorMessage("Unable to load exam type details.");
    }
  }, [currentUserRole, isCurrentUserHeadMaster]);

  const handleDelist = useCallback((examTypeItem) => {
    setActiveMenu(null);
    if (currentUserRole === "non-teaching") {
      setAccessDeniedMessage("Non-teaching staff cannot delist");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
    setDelistTarget(examTypeItem);
    setIsDelistDialogOpen(true);
  }, [currentUserRole]);

  const handleConfirmDelist = useCallback(async () => {
    if (!delistTarget || isDelisting) {
      return;
    }

    const accessToken =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token") || ""
        : "";

    setIsDelisting(true);
    try {
      await delistExamTypeList(delistTarget.id, accessToken);
      await fetchExamTypes();
      setIsDelistDialogOpen(false);
      setDelistTarget(null);
    } catch (_error) {
      setErrorMessage("Unable to delist exam type.");
    } finally {
      setIsDelisting(false);
    }
  }, [delistTarget, fetchExamTypes, isDelisting]);

  const handleCloseDialog = useCallback(() => {
    setIsCreateDialogOpen(false);
    setSelectedExamType(null);
    setDialogMode("create");
  }, []);

  useEffect(() => {
    if (!isCreateDialogOpen) {
      setSelectedExamType(null);
      setDialogMode("create");
    }
  }, [isCreateDialogOpen]);

  const activeDialogKey = `${dialogMode}-${selectedExamType?.id || "new"}-${isCreateDialogOpen ? "open" : "closed"}`;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalExamTypeCount / PAGE_SIZE)),
    [totalExamTypeCount, PAGE_SIZE],
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <main className="dashboard-shell h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full w-full flex-col px-3 pb-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <section className="shrink-0 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-700 via-cyan-700 to-teal-700 px-4 py-4 text-white shadow-[0_16px_34px_rgba(14,116,144,0.25)] sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-wide sm:text-2xl">
              Exam Type
            </h1>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(true)}
                className="inline-flex items-center justify-center rounded-full border border-white/80 bg-white p-2.5 text-sky-700 shadow-sm transition hover:bg-sky-50"
                aria-label="Watch exam type setup video"
                title="Watch exam type setup video"
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
                Add Exam Type
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3 font-semibold">SL.No.</th>
                  <th className="px-2 py-3 font-semibold">Academic Year</th>
                  <th className="px-2 py-3 font-semibold">Exam Name</th>
                  <th className="px-2 py-3 font-semibold">Exam Type</th>
                  <th className="px-2 py-3 font-semibold">Total Marks</th>
                  <th className="px-2 py-3 font-semibold">Start Date</th>
                  <th className="px-2 py-3 font-semibold">End Date</th>
                  <th className="px-2 py-3 font-semibold">Status</th>
              <th className="px-2 py-3 font-semibold">Created By</th>
              <th className="px-2 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3" colSpan={10}>
                      Loading...
                    </td>
                  </tr>
                ) : null}

                {!isLoading && errorMessage ? (
                  <tr className="border-b border-slate-100 text-sm text-red-600">
                    <td className="px-2 py-3" colSpan={10}>
                      {errorMessage}
                    </td>
                  </tr>
                ) : null}

                {!isLoading && !errorMessage && examTypes.length === 0 ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3" colSpan={10}>
                      No exam type records found.
                    </td>
                  </tr>
                ) : null}

                {examTypes.map((item, index) => {
                  const academicYearName =
                    formatAcademicYearLabel(item) ||
                    academicYearById.get(String(item.academic_year_id))?.year_name ||
                    "-";

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 text-sm text-slate-700"
                    >
                      <td className="px-2 py-3 font-medium text-slate-800">
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </td>
                      <td className="px-2 py-3">{academicYearName}</td>
                      <td className="px-2 py-3">{item.exam_name || "-"}</td>
                      <td className="px-2 py-3">
                        {item.exam_type_display || item.exam_type || "-"}
                      </td>
                      <td className="px-2 py-3">
                        {item.total_marks ?? item.totalMarks ?? "-"}
                      </td>
                      <td className="px-2 py-3">{formatDate(item.start_date)}</td>
                      <td className="px-2 py-3">{formatDate(item.end_date)}</td>
                      <td className="px-2 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-2 py-3">{item.created_by || "-"}</td>
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          data-action-menu-trigger="true"
                          onClick={(event) => toggleActionMenu(event, item)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                          aria-label="Exam type actions"
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
                  );
                })}
              </tbody>
            </table>
          </div>
          {!isLoading && !errorMessage && examTypes.length > 0 ? (
            <div className="mt-3 shrink-0 flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
              <p className="text-xs text-slate-600 sm:text-sm">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h2 className="text-base font-semibold text-gray-900">
                Exam Type Video Guide
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
                src="https://www.youtube-nocookie.com/embed/sFGbM5T1V0o?autoplay=1&vq=hd1080&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1"
                title="Exam type setup tutorial video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      <ExamTypeCreateDialog
        key={activeDialogKey}
        open={isCreateDialogOpen}
        onClose={handleCloseDialog}
        onCreate={handleCreateExamType}
        onUpdate={handleUpdateExamType}
        companyId={companyId}
        academicYears={academicYears}
        initialData={selectedExamType}
        mode={dialogMode}
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
                onClick={() => handleEdit(activeMenu.examTypeItem)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelist(activeMenu.examTypeItem)}
                className="block w-full px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
              >
                Delist
              </button>
            </div>,
            document.body,
          )
        : null}

      <DelistConfirmDialog
        open={isDelistDialogOpen}
        onClose={() => {
          if (isDelisting) {
            return;
          }
          setIsDelistDialogOpen(false);
          setDelistTarget(null);
        }}
        onConfirm={handleConfirmDelist}
        itemLabel={delistTarget?.exam_name || "this exam type"}
        isSubmitting={isDelisting}
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
