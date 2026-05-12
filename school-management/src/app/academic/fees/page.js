"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import AccessDeniedDialog from "@/components/ui/AccessDeniedDialog";
import DelistConfirmDialog from "@/components/ui/DelistConfirmDialog";
import DialogNewFeesCreate from "@/components/ui/DialogNewFeesCreate";
import {
  createClassFeeStructure,
  delistClassFeeStructure,
  getAcademicYearList,
  getClassFeeStructureById,
  getClassFeeStructureList,
  getClassList,
  getCurrentSchoolInfo,
  updateClassFeeStructure,
} from "@/lib/apiService";

function formatAmount(value) {
  const amount = Number.parseFloat(String(value ?? "0"));
  if (!Number.isFinite(amount)) {
    return "0.00";
  }
  return amount.toFixed(2);
}

export default function FeesPage() {
  const [fees, setFees] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedFeeId, setSelectedFeeId] = useState(null);
  const [selectedFeeData, setSelectedFeeData] = useState(null);
  const [isDelistDialogOpen, setIsDelistDialogOpen] = useState(false);
  const [delistTarget, setDelistTarget] = useState(null);
  const [isDelisting, setIsDelisting] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [isAccessDeniedDialogOpen, setIsAccessDeniedDialogOpen] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");

  const fetchFees = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getClassFeeStructureList();
      setFees(Array.isArray(data) ? data : []);
    } catch (_error) {
      setFees([]);
      setErrorMessage("Unable to load fees list.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const [classesData, academicYearsData] = await Promise.all([
        getClassList(),
        getAcademicYearList(),
      ]);
      setClassOptions(Array.isArray(classesData) ? classesData : []);
      setAcademicYearOptions(Array.isArray(academicYearsData) ? academicYearsData : []);
    } catch (_error) {
      setClassOptions([]);
      setAcademicYearOptions([]);
    }
  }, []);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

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

  const handleSaveFees = async (payload) => {
    const requestPayload = {
      class_details_id: payload.classDetailsId,
      academic_year_id: payload.academicYearId,
      admission_fee: payload.admissionFee,
      tuition_fee: payload.tuitionFee,
      exam_fee: payload.examFee,
      annual_charge: payload.annualCharge,
      total_fees: payload.totalFees,
      frequency: payload.frequency,
      is_active: payload.isActive,
      company_id: payload.companyId || companyId || undefined,
    };

    await createClassFeeStructure(requestPayload, payload.accessToken);
    await fetchFees();
    setIsCreateDialogOpen(false);
    setDialogMode("create");
    setSelectedFeeId(null);
    setSelectedFeeData(null);
  };

  const handleUpdateFees = async (payload) => {
    if (!payload?.id) {
      throw new Error("Unable to update fees: missing id");
    }

    const requestPayload = {
      class_details_id: payload.classDetailsId,
      academic_year_id: payload.academicYearId,
      admission_fee: payload.admissionFee,
      tuition_fee: payload.tuitionFee,
      exam_fee: payload.examFee,
      annual_charge: payload.annualCharge,
      total_fees: payload.totalFees,
      frequency: payload.frequency,
      is_active: payload.isActive,
      company_id: payload.companyId || companyId || undefined,
    };

    await updateClassFeeStructure(payload.id, requestPayload, payload.accessToken);
    await fetchFees();
    setIsCreateDialogOpen(false);
    setDialogMode("create");
    setSelectedFeeId(null);
    setSelectedFeeData(null);
  };

  const handleOpenCreate = () => {
    setDialogMode("create");
    setSelectedFeeId(null);
    setSelectedFeeData(null);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = async (item) => {
    setActiveMenu(null);
    if (currentUserRole === "teacher" || currentUserRole === "non-teaching") {
      setAccessDeniedMessage("You do not have permission to edit fees records.");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
    setDialogMode("edit");
    setSelectedFeeId(item?.id || null);
    setSelectedFeeData(null);
    setErrorMessage("");

    if (!item?.id) {
      setErrorMessage("Unable to load selected fees record.");
      return;
    }

    try {
      const data = await getClassFeeStructureById(item.id);
      setSelectedFeeData(data);
      setIsCreateDialogOpen(true);
    } catch (_error) {
      setSelectedFeeData(null);
      setErrorMessage("Unable to load selected fees record.");
    }
  };

  const handleDelist = (item) => {
    setActiveMenu(null);
    if (currentUserRole === "teacher" || currentUserRole === "non-teaching") {
      setAccessDeniedMessage("You do not have permission to delist fees records.");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
    setDelistTarget(item);
    setIsDelistDialogOpen(true);
  };

  const handleConfirmDelist = async () => {
    if (!delistTarget?.id) {
      return;
    }

    setIsDelisting(true);
    const accessToken =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token") || ""
        : "";

    try {
      await delistClassFeeStructure(delistTarget.id, accessToken);
      await fetchFees();
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

  const dialogKey = useMemo(() => {
    const idPart = selectedFeeId ? String(selectedFeeId) : "new";
    return `${dialogMode}-${idPart}-${isCreateDialogOpen ? "open" : "closed"}`;
  }, [dialogMode, isCreateDialogOpen, selectedFeeId]);

  return (
    <main className="dashboard-shell h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full w-full flex-col px-3 pb-4 pt-16 sm:px-6 lg:px-8 lg:pt-8">
        <section className="shrink-0 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-700 via-cyan-700 to-teal-700 px-4 py-5 text-white shadow-[0_16px_34px_rgba(14,116,144,0.25)] sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-wide sm:text-2xl">Fees Structure</h1>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="whitespace-nowrap rounded-lg bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
            >
              Add New Fees
            </button>
          </div>
        </section>

        <section className="mt-6 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3 font-semibold">SL.No.</th>
                  <th className="px-2 py-3 font-semibold">Class</th>
                  <th className="px-2 py-3 font-semibold">Academic Year</th>
                  <th className="px-2 py-3 font-semibold">Admission Fee</th>
                  <th className="px-2 py-3 font-semibold">Tuition Fee</th>
                  <th className="px-2 py-3 font-semibold">Exam Fee</th>
                  <th className="px-2 py-3 font-semibold">Annual Charge</th>
                  <th className="px-2 py-3 font-semibold">Total Fees</th>
                  <th className="px-2 py-3 font-semibold">Status</th>
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

                {!isLoading && !errorMessage && fees.length === 0 ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3" colSpan={10}>
                      No fees records found.
                    </td>
                  </tr>
                ) : null}

                {fees.map((item, index) => (
                  <tr key={item.id} className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3 font-medium text-slate-800">{index + 1}</td>
                    <td className="px-2 py-3">{item.class_name || "-"}</td>
                    <td className="px-2 py-3">{item.academic_year_name || "-"}</td>
                    <td className="px-2 py-3">{formatAmount(item.admission_fee)}</td>
                    <td className="px-2 py-3">{formatAmount(item.tuition_fee)}</td>
                    <td className="px-2 py-3">{formatAmount(item.exam_fee)}</td>
                    <td className="px-2 py-3">{formatAmount(item.annual_charge)}</td>
                    <td className="px-2 py-3 font-semibold text-slate-900">
                      {formatAmount(item.total_fees)}
                    </td>
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
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        data-action-menu-trigger="true"
                        onClick={(event) => toggleActionMenu(event, item)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
                        aria-label="Fee structure actions"
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

      <DialogNewFeesCreate
        key={dialogKey}
        open={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setDialogMode("create");
          setSelectedFeeId(null);
          setSelectedFeeData(null);
        }}
        onCreate={handleSaveFees}
        onUpdate={handleUpdateFees}
        companyId={companyId}
        classOptions={classOptions}
        academicYearOptions={academicYearOptions}
        initialData={selectedFeeData}
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
                onClick={() => handleEdit(activeMenu.item)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelist(activeMenu.item)}
                className="block w-full px-3 py-2 text-left text-sm text-red-600 transition hover:bg-slate-100"
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
        itemLabel={
          delistTarget
            ? `${delistTarget.class_name || "Class"} (${delistTarget.academic_year_name || "Year"})`
            : "this fees record"
        }
        isSubmitting={isDelisting}
      />

      <AccessDeniedDialog
        open={isAccessDeniedDialogOpen}
        message={accessDeniedMessage || "You do not have permission to perform this action."}
        onClose={() => {
          setIsAccessDeniedDialogOpen(false);
          setAccessDeniedMessage("");
        }}
      />
    </main>
  );
}
