"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AccessDeniedDialog from "@/components/ui/AccessDeniedDialog";
import SectionCreateDialog from "@/components/ui/SectionCreateDialog";
import DelistConfirmDialog from "@/components/ui/DelistConfirmDialog";
import {
  createSectionList,
  delistSectionList,
  getClassList,
  getCurrentSchoolInfo,
  getSectionList,
  updateSectionList,
} from "@/lib/apiService";

export default function SectionsPage() {
  const [sections, setSections] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [companyId, setCompanyId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [isCurrentUserHeadMaster, setIsCurrentUserHeadMaster] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [dialogMode, setDialogMode] = useState("create");
  const [isDelistDialogOpen, setIsDelistDialogOpen] = useState(false);
  const [delistTarget, setDelistTarget] = useState(null);
  const [isDelisting, setIsDelisting] = useState(false);
  const [isAccessDeniedDialogOpen, setIsAccessDeniedDialogOpen] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");

  const fetchSections = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getSectionList();
      setSections(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMessage("Unable to load section list.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchClassOptions = useCallback(async () => {
    try {
      const data = await getClassList();
      setClassOptions(Array.isArray(data) ? data : []);
    } catch (error) {
      setClassOptions([]);
    }
  }, []);

  useEffect(() => {
    fetchSections();
    fetchClassOptions();
  }, [fetchSections, fetchClassOptions]);

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const data = await getCurrentSchoolInfo();
        if (data?.company?.id) {
          setCompanyId(data.company.id);
        }
        setCurrentUserRole(String(data?.role || "").trim().toLowerCase());
        setIsCurrentUserHeadMaster(Boolean(data?.is_head_master));
      } catch (error) {
        setCompanyId(null);
        setCurrentUserRole("");
        setIsCurrentUserHeadMaster(false);
      }
    };
    loadCompany();
  }, []);

  const handleSaveSection = async (sectionData) => {
    const parsedNumOfStud =
      sectionData.numOfStud === null ||
      sectionData.numOfStud === undefined ||
      sectionData.numOfStud === ""
        ? null
        : Number(sectionData.numOfStud);

    const payload = {
      class_details_id: Number(sectionData.classDetailsId),
      section: sectionData.section,
      num_of_stud: parsedNumOfStud,
      company_id: sectionData.companyId || companyId || undefined,
    };

    if (dialogMode === "edit" && sectionData.id) {
      await updateSectionList(sectionData.id, payload, sectionData.accessToken);
    } else {
      await createSectionList(payload, sectionData.accessToken);
    }

    await fetchSections();
    setIsCreateDialogOpen(false);
    setSelectedSection(null);
    setDialogMode("create");
  };

  const handleOpenCreate = () => {
    setDialogMode("create");
    setSelectedSection(null);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (sectionItem) => {
    setActiveMenu(null);
    if (currentUserRole === "non-teaching" || (currentUserRole === "teacher" && !isCurrentUserHeadMaster)) {
      setAccessDeniedMessage("Teacher cannot edit");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
    setDialogMode("edit");
    setSelectedSection(sectionItem);
    setIsCreateDialogOpen(true);
  };

  const handleDelist = (sectionItem) => {
    setActiveMenu(null);
    if (currentUserRole === "non-teaching") {
      setAccessDeniedMessage("Non-teaching staff cannot delist");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
    setDelistTarget(sectionItem);
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
      await delistSectionList(delistTarget.id, accessToken);
      await fetchSections();
      setIsDelistDialogOpen(false);
      setDelistTarget(null);
    } finally {
      setIsDelisting(false);
    }
  };

  const toggleActionMenu = (event, sectionItem) => {
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
      id: sectionItem.id,
      sectionItem,
      top,
      left,
    };

    setActiveMenu((prev) => (prev?.id === sectionItem.id ? null : nextMenu));
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
              Section List
            </h1>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="whitespace-nowrap rounded-lg bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
            >
              Add New Section
            </button>
          </div>
        </section>

        <section className="mt-6 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3 font-semibold">SL.No.</th>
                  <th className="px-2 py-3 font-semibold">Class Name</th>
                  <th className="px-2 py-3 font-semibold">Section</th>
                  <th className="px-2 py-3 font-semibold">No. of Students</th>
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
                {!isLoading && !errorMessage && sections.length === 0 ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3" colSpan={5}>
                      No section records found.
                    </td>
                  </tr>
                ) : null}
                {sections.map((item, index) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 text-sm text-slate-700"
                  >
                    <td className="px-2 py-3 font-medium text-slate-800">
                      {index + 1}
                    </td>
                    <td className="px-2 py-3">{item.class_name}</td>
                    <td className="px-2 py-3">{item.section}</td>
                    <td className="px-2 py-3">{item.num_of_stud ?? "-"}</td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        data-action-menu-trigger="true"
                        onClick={(event) => toggleActionMenu(event, item)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
                        aria-label="Section actions"
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

      <SectionCreateDialog
        key={`${dialogMode}-${selectedSection?.id || "new"}-${isCreateDialogOpen ? "open" : "closed"}`}
        open={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setSelectedSection(null);
          setDialogMode("create");
        }}
        onCreate={handleSaveSection}
        companyId={companyId}
        classOptions={classOptions}
        initialData={selectedSection}
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
                onClick={() => handleEdit(activeMenu.sectionItem)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelist(activeMenu.sectionItem)}
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
        itemLabel={delistTarget?.section || "this section"}
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
