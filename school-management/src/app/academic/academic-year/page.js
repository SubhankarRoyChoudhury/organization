"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AccessDeniedDialog from "@/components/ui/AccessDeniedDialog";
import CreateAcademicYearDialog from "@/components/ui/CreateAcademicYearDialog";
import DelistConfirmDialog from "@/components/ui/DelistConfirmDialog";
import {
  createAcademicYearList,
  delistAcademicYearList,
  getAcademicYearList,
  getCurrentSchoolInfo,
  updateAcademicYearList,
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

function getAcademicYearSortKey(item) {
  const yearName = String(item?.year_name || item?.yearName || "").trim();
  if (!yearName) {
    return Number.POSITIVE_INFINITY;
  }

  const startYear = Number(yearName.split("-")[0]);
  if (Number.isFinite(startYear)) {
    return startYear;
  }

  return Number.POSITIVE_INFINITY;
}

function sortAcademicYearsBySequence(items) {
  return [...(Array.isArray(items) ? items : [])].sort((left, right) => {
    const leftKey = getAcademicYearSortKey(left);
    const rightKey = getAcademicYearSortKey(right);
    if (leftKey !== rightKey) {
      return leftKey - rightKey;
    }

    const leftName = String(left?.year_name || left?.yearName || "");
    const rightName = String(right?.year_name || right?.yearName || "");
    return leftName.localeCompare(rightName);
  });
}

export default function AcademicYearPage() {
  const [academicYears, setAcademicYears] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [companyId, setCompanyId] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(null);
  const [dialogMode, setDialogMode] = useState("create");
  const [isDelistDialogOpen, setIsDelistDialogOpen] = useState(false);
  const [delistTarget, setDelistTarget] = useState(null);
  const [isDelisting, setIsDelisting] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [isAccessDeniedDialogOpen, setIsAccessDeniedDialogOpen] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");

  const fetchAcademicYears = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getAcademicYearList();
      setAcademicYears(sortAcademicYearsBySequence(data));
    } catch (_error) {
      setErrorMessage("Unable to load academic year list.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const data = await getCurrentSchoolInfo();
        if (data?.company?.id) {
          setCompanyId(data.company.id);
        }
        setCurrentUserRole(String(data?.role || "").trim().toLowerCase());
      } catch (_error) {
        setCompanyId(null);
        setCurrentUserRole("");
      }
    };
    loadCompany();
  }, []);

  const handleSaveAcademicYear = async (payload) => {
    const requestPayload = {
      year_name: payload.yearName,
      start_date: payload.startDate,
      end_date: payload.endDate,
      is_active: Boolean(payload.isActive),
      company_id: payload.companyId || companyId || undefined,
    };

    if (dialogMode === "edit" && payload.id) {
      await updateAcademicYearList(payload.id, requestPayload, payload.accessToken);
    } else {
      await createAcademicYearList(requestPayload, payload.accessToken);
    }

    await fetchAcademicYears();
    setIsCreateDialogOpen(false);
    setSelectedAcademicYear(null);
    setDialogMode("create");
  };

  const handleOpenCreate = () => {
    setDialogMode("create");
    setSelectedAcademicYear(null);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (item) => {
    setActiveMenu(null);
    if (currentUserRole === "non-teaching") {
      setAccessDeniedMessage("You do not have permission to edit academic year records.");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
    setDialogMode("edit");
    setSelectedAcademicYear(item);
    setIsCreateDialogOpen(true);
  };

  const handleDelist = (item) => {
    setActiveMenu(null);
    if (currentUserRole === "non-teaching") {
      setAccessDeniedMessage("You do not have permission to delist academic year records.");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
    setDelistTarget(item);
    setIsDelistDialogOpen(true);
  };

  const handleConfirmDelist = async () => {
    if (!delistTarget) {
      return;
    }
    if (currentUserRole === "non-teaching") {
      setIsDelistDialogOpen(false);
      setDelistTarget(null);
      setAccessDeniedMessage("You do not have permission to delist academic year records.");
      setIsAccessDeniedDialogOpen(true);
      return;
    }

    setIsDelisting(true);
    const accessToken =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token") || ""
        : "";

    try {
      await delistAcademicYearList(delistTarget.id, accessToken);
      await fetchAcademicYears();
      setIsDelistDialogOpen(false);
      setDelistTarget(null);
    } finally {
      setIsDelisting(false);
    }
  };

  const toggleActionMenu = (event, item) => {
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
      id: item.id,
      item,
      top,
      left,
    };

    setActiveMenu((prev) => (prev?.id === item.id ? null : nextMenu));
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
              Academic Year
            </h1>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50 sm:px-4 sm:text-sm"
            >
              {dialogMode === "edit" ? "Update Academic Year" : "Create Year"}
            </button>
          </div>
        </section>

        <section className="mt-6 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3 font-semibold">SL.No.</th>
                  <th className="px-2 py-3 font-semibold">Year Name</th>
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
                    <td className="px-2 py-3" colSpan={7}>
                      Loading...
                    </td>
                  </tr>
                ) : null}
                {!isLoading && errorMessage ? (
                  <tr className="border-b border-slate-100 text-sm text-red-600">
                    <td className="px-2 py-3" colSpan={7}>
                      {errorMessage}
                    </td>
                  </tr>
                ) : null}
                {!isLoading && !errorMessage && academicYears.length === 0 ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3" colSpan={7}>
                      No academic year records found.
                    </td>
                  </tr>
                ) : null}
                {academicYears.map((item, index) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 text-sm text-slate-700"
                  >
                    <td className="px-2 py-3 font-medium text-slate-800">
                      {index + 1}
                    </td>
                    <td className="px-2 py-3">{item.year_name || "-"}</td>
                    <td className="px-2 py-3">{formatDate(item.start_date)}</td>
                    <td className="px-2 py-3">{formatDate(item.end_date)}</td>
                    <td className="px-2 py-3">
                      <span
                        className={
                          item.is_active
                            ? "inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"
                            : "inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
                        }
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
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
                        aria-label="Academic year actions"
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
      </div>

      <CreateAcademicYearDialog
        key={`${dialogMode}-${selectedAcademicYear?.id || "new"}-${isCreateDialogOpen ? "open" : "closed"}`}
        open={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setSelectedAcademicYear(null);
          setDialogMode("create");
        }}
        onCreate={handleSaveAcademicYear}
        companyId={companyId}
        initialData={selectedAcademicYear}
        mode={dialogMode}
        academicYears={academicYears}
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
                onClick={() => handleEdit(activeMenu.item)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelist(activeMenu.item)}
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
        itemLabel={delistTarget?.year_name || "this academic year"}
        isSubmitting={isDelisting}
      />

      <AccessDeniedDialog
        open={isAccessDeniedDialogOpen}
        message={accessDeniedMessage || "You do not have permission for this action."}
        onClose={() => {
          setIsAccessDeniedDialogOpen(false);
          setAccessDeniedMessage("");
        }}
      />
    </main>
  );
}
