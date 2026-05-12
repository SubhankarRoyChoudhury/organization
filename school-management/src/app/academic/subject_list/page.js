"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AccessDeniedDialog from "@/components/ui/AccessDeniedDialog";
import SubjectCreateDialog from "@/components/ui/SubjectCreateDialog";
import DelistConfirmDialog from "@/components/ui/DelistConfirmDialog";
import {
  createSubjectList,
  delistSubjectList,
  getCurrentSchoolInfo,
  getSubjectListById,
  getSubjectList,
  updateSubjectList,
} from "@/lib/apiService";

export default function SubjectListPage() {
  const [subjects, setSubjects] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [companyId, setCompanyId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [isCurrentUserHeadMaster, setIsCurrentUserHeadMaster] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [isDelistDialogOpen, setIsDelistDialogOpen] = useState(false);
  const [delistTarget, setDelistTarget] = useState(null);
  const [isDelisting, setIsDelisting] = useState(false);
  const [isAccessDeniedDialogOpen, setIsAccessDeniedDialogOpen] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");

  const fetchSubjects = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getSubjectList();
      setSubjects(Array.isArray(data) ? data : []);
    } catch (_error) {
      setErrorMessage("Unable to load subject list.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

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

  const handleCreateSubject = async (subjectData) => {
    const payload = {
      subject_name: subjectData.subjectName,
      subject_initial: subjectData.subjectInitial,
      company_id: subjectData.companyId || companyId || undefined,
      created_by: subjectData.created_by || undefined,
      updated_by: subjectData.updated_by || undefined,
    };

    await createSubjectList(payload, subjectData.accessToken);
    await fetchSubjects();
    setIsCreateDialogOpen(false);
  };

  const handleUpdateSubject = async (subjectData) => {
    const payload = {
      subject_name: subjectData.subjectName,
      subject_initial: subjectData.subjectInitial,
      company_id: subjectData.companyId || companyId || undefined,
      created_by: subjectData.created_by || undefined,
      updated_by: subjectData.updated_by || undefined,
    };

    await updateSubjectList(subjectData.id, payload, subjectData.accessToken);
    await fetchSubjects();
    setIsCreateDialogOpen(false);
    setSelectedSubject(null);
    setDialogMode("create");
  };

  const handleOpenCreate = () => {
    setDialogMode("create");
    setSelectedSubject(null);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = async (subjectItem) => {
    setActiveMenu(null);

    if (currentUserRole === "non-teaching" || (currentUserRole === "teacher" && !isCurrentUserHeadMaster)) {
      setAccessDeniedMessage("Teacher cannot edit");
      setIsAccessDeniedDialogOpen(true);
      return;
    }

    setDialogMode("edit");

    try {
      const subjectDetails = await getSubjectListById(subjectItem.id);
      setSelectedSubject(subjectDetails || subjectItem);
    } catch (_error) {
      setSelectedSubject(subjectItem);
    }

    setIsCreateDialogOpen(true);
  };

  const handleDelist = (subjectItem) => {
    setActiveMenu(null);
    if (currentUserRole === "non-teaching") {
      setAccessDeniedMessage("Non-teaching staff cannot delist");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
    setDelistTarget(subjectItem);
    setIsDelistDialogOpen(true);
  };

  const handleConfirmDelist = async () => {
    if (!delistTarget) {
      return;
    }

    setIsDelisting(true);
    const accessToken =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token") || ""
        : "";

    try {
      await delistSubjectList(delistTarget.id, accessToken);
      await fetchSubjects();
      setIsDelistDialogOpen(false);
      setDelistTarget(null);
    } finally {
      setIsDelisting(false);
    }
  };

  const toggleActionMenu = (event, subjectItem) => {
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
      id: subjectItem.id,
      subjectItem,
      top,
      left,
    };

    setActiveMenu((prev) => (prev?.id === subjectItem.id ? null : nextMenu));
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
        <section className="shrink-0 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-700 via-cyan-700 to-teal-700 px-4 py-5 text-white shadow-[0_16px_34px_rgba(14,116,144,0.25)] sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-wide sm:text-2xl">
              Subject List
            </h1>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="whitespace-nowrap rounded-lg bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
            >
              Add Subject
            </button>
          </div>
        </section>

        <section className="mt-6 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3 font-semibold">SL.No.</th>
                  <th className="px-2 py-3 font-semibold">Subject Name</th>
                  <th className="px-2 py-3 font-semibold">Subject Initial</th>
                  <th className="px-2 py-3 font-semibold">Created By</th>
                  <th className="px-2 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3" colSpan={5}>
                      Loading...
                    </td>
                  </tr>
                ) : null}
                {!isLoading && errorMessage ? (
                  <tr className="border-b border-slate-100 text-sm text-red-600">
                    <td className="px-2 py-3" colSpan={5}>
                      {errorMessage}
                    </td>
                  </tr>
                ) : null}
                {!isLoading && !errorMessage && subjects.length === 0 ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3" colSpan={5}>
                      No subject records found.
                    </td>
                  </tr>
                ) : null}
                {subjects.map((item, index) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 text-sm text-slate-700"
                  >
                    <td className="px-2 py-3 font-medium text-slate-800">
                      {index + 1}
                    </td>
                    <td className="px-2 py-3">{item.subject_name || "-"}</td>
                    <td className="px-2 py-3">{item.subject_initial || "-"}</td>
                    <td className="px-2 py-3">{item.created_by || "-"}</td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        data-action-menu-trigger="true"
                        onClick={(event) => toggleActionMenu(event, item)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
                        aria-label="Subject actions"
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

      <SubjectCreateDialog
        key={`${dialogMode}-${selectedSubject?.id || "new"}-${isCreateDialogOpen ? "open" : "closed"}`}
        open={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setSelectedSubject(null);
          setDialogMode("create");
        }}
        onCreate={handleCreateSubject}
        onUpdate={handleUpdateSubject}
        companyId={companyId}
        initialData={selectedSubject}
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
                onClick={() => handleEdit(activeMenu.subjectItem)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelist(activeMenu.subjectItem)}
                className="block w-full px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
              >
                Delist
              </button>
            </div>,
            document.body,
          )
        : null}

      <AccessDeniedDialog
        open={isAccessDeniedDialogOpen}
        message={accessDeniedMessage || "Teacher cannot edit"}
        onClose={() => {
          setIsAccessDeniedDialogOpen(false);
          setAccessDeniedMessage("");
        }}
      />

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
        itemLabel={delistTarget?.subject_name || "this subject"}
        isSubmitting={isDelisting}
      />
    </main>
  );
}
