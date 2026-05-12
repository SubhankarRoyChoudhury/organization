"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import AccessDeniedDialog from "@/components/ui/AccessDeniedDialog";
import {
  createExamScheduleList,
  delistExamScheduleList,
  getAcademicYearList,
  getClassList,
  getCurrentSchoolInfo,
  getExamScheduleList,
  getExamTypeList,
  getSectionList,
  getSubjectList,
  updateExamScheduleList,
} from "@/lib/apiService";
import DelistConfirmDialog from "@/components/ui/DelistConfirmDialog";

const ExamScheduleCreateDialog = dynamic(
  () => import("@/components/ui/ExamScheduleCreateDialog"),
  {
    ssr: false,
  },
);

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

function formatTime(value) {
  if (!value) {
    return "-";
  }
  return String(value).slice(0, 5);
}

function formatOptionLabel(value) {
  return String(value || "").trim();
}

function formatCreatedBy(value) {
  const label = String(value || "").trim();
  if (!label) {
    return "-";
  }

  const [shortName] = label.split(".");
  return shortName || label;
}

function normalizeExamScheduleSubjectSchedules(item) {
  return Array.isArray(item?.subject_schedules) ? item.subject_schedules : [];
}

function renderSubjectSchedulesTable(item) {
  const subjectSchedules = normalizeExamScheduleSubjectSchedules(item);
  const entries = subjectSchedules.length
    ? subjectSchedules
    : [
        {
          subject_name: item.subject_name || item.subject?.subject_name || "",
          exam_date: item.exam_date || "",
          subject_id: item.subject_id || item.subject?.id || "",
        },
      ];

  const subjectValues = entries.map((entry) =>
    formatOptionLabel(entry?.subject_name || entry?.subjectName || entry?.subject?.subject_name || "-"),
  );
  const dateValues = entries.map((entry) => formatDate(entry?.exam_date || entry?.examDate));
  const maxColumns = Math.max(subjectValues.length, dateValues.length);

  return (
    <div className="w-full overflow-hidden">
      <div
        className="grid w-full bg-white text-center"
        style={{ gridTemplateColumns: `repeat(${maxColumns}, minmax(132px, 1fr))` }}
      >
        {Array.from({ length: maxColumns }).map((_, index) => (
          <div
            key={`${item.id}-schedule-card-${index}`}
            className={`min-w-[132px] border-r border-slate-200 px-3 py-2 last:border-r-0 sm:px-4 ${index === 0 ? "pl-5" : ""}`}
          >
            <div className="overflow-hidden whitespace-nowrap text-[11px] font-semibold leading-tight tracking-tight text-slate-700 sm:text-xs">
              {subjectValues[index] || ""}
            </div>
            <div className="mt-1 whitespace-nowrap text-[11px] leading-tight text-slate-700 sm:text-xs">
              {dateValues[index] || ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExamSchedulePage() {
  const [examSchedules, setExamSchedules] = useState([]);
  const [examTypeOptions, setExamTypeOptions] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedExamSchedule, setSelectedExamSchedule] = useState(null);
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

  const examTypeById = useMemo(() => {
    const entries = new Map();
    examTypeOptions.forEach((item) => entries.set(String(item.id), item));
    return entries;
  }, [examTypeOptions]);

  const academicYearFilterOptions = useMemo(
    () =>
      [...(Array.isArray(academicYears) ? academicYears : [])]
        .map((item) => ({
          id: String(item?.id || "").trim(),
          label: String(item?.year_name || item?.yearName || "").trim(),
        }))
        .filter((item) => item.id && item.label)
        .sort((left, right) => left.label.localeCompare(right.label, undefined, { numeric: true })),
    [academicYears],
  );

  const filteredExamSchedules = useMemo(() => {
    if (!selectedAcademicYearId) {
      return examSchedules;
    }
    return examSchedules.filter(
      (item) => String(item?.academic_year_id || "").trim() === selectedAcademicYearId,
    );
  }, [examSchedules, selectedAcademicYearId]);

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

  const fetchExamSchedules = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getExamScheduleList();
      setExamSchedules(Array.isArray(data) ? data : []);
    } catch (_error) {
      setErrorMessage("Unable to load exam schedule list.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const buildExamScheduleRequestPayload = useCallback(
    (payload) => ({
      company_id: payload.companyId || companyId || undefined,
      academic_year_id: Number(payload.academicYearId) || undefined,
      exam_id: Number(payload.examId) || undefined,
      class_details_id: Number(payload.classDetailsId) || undefined,
      section_details_id: Number(payload.sectionDetailsId) || undefined,
      subject_id: Number(payload.subjectId || payload.subjectSchedules?.[0]?.subjectId) || undefined,
      exam_date: payload.examDate || payload.subjectSchedules?.[0]?.examDate,
      subject_schedules: Array.isArray(payload.subjectSchedules)
        ? payload.subjectSchedules.map((entry) => ({
            subject_id: Number(entry.subjectId) || undefined,
            subject_name: String(entry.subjectName || "").trim(),
            exam_date: entry.examDate,
          }))
        : undefined,
      start_time: payload.startTime,
      end_time: payload.endTime,
      total_marks: payload.totalMarks,
      passing_marks: payload.passingMarks,
      exam_room: payload.examRoom,
      instructions: payload.instructions,
      created_by: payload.created_by || undefined,
      updated_by: payload.updated_by || undefined,
    }),
    [companyId],
  );

  const handleCreateExamSchedule = useCallback(
    async (payload) => {
      const requestPayload = buildExamScheduleRequestPayload(payload);
      const accessToken = payload.accessToken || "";
      await createExamScheduleList(requestPayload, accessToken);
      await fetchExamSchedules();
      setIsScheduleDialogOpen(false);
      setSelectedExamSchedule(null);
      setDialogMode("create");
    },
    [buildExamScheduleRequestPayload, fetchExamSchedules],
  );

  const handleUpdateExamSchedule = useCallback(
    async (payload) => {
      const scheduleId = payload.id;
      if (!scheduleId) {
        throw new Error("Missing exam schedule id");
      }

      const requestPayload = buildExamScheduleRequestPayload(payload);
      const accessToken = payload.accessToken || "";
      await updateExamScheduleList(scheduleId, requestPayload, accessToken);
      await fetchExamSchedules();
      setIsScheduleDialogOpen(false);
      setSelectedExamSchedule(null);
      setDialogMode("create");
    },
    [buildExamScheduleRequestPayload, fetchExamSchedules],
  );

  const toggleActionMenu = useCallback((event, examScheduleItem) => {
    event.stopPropagation();
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 144;
    const menuHeight = 88;
    const viewportPadding = 8;
    const spaceBelow = window.innerHeight - buttonRect.bottom - viewportPadding;
    const shouldOpenAbove = spaceBelow < menuHeight && buttonRect.top > menuHeight + viewportPadding;
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
      prev?.examScheduleItem?.id === examScheduleItem.id ? null : {
        top,
        left,
        examScheduleItem,
      },
    );
  }, []);

  const handleEdit = useCallback((examScheduleItem) => {
    setActiveMenu(null);
    if (currentUserRole === "non-teaching" || (currentUserRole === "teacher" && !isCurrentUserHeadMaster)) {
      setAccessDeniedMessage("Teacher cannot edit");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
    setSelectedExamSchedule(examScheduleItem);
    setDialogMode("edit");
    setIsScheduleDialogOpen(true);
  }, [currentUserRole, isCurrentUserHeadMaster]);

  const handleDelist = useCallback((examScheduleItem) => {
    setActiveMenu(null);
    if (currentUserRole === "non-teaching") {
      setAccessDeniedMessage("Non-teaching staff cannot delist");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
    setDelistTarget(examScheduleItem);
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
      await delistExamScheduleList(delistTarget.id, accessToken);
      await fetchExamSchedules();
      setIsDelistDialogOpen(false);
      setDelistTarget(null);
    } catch (_error) {
      setErrorMessage("Unable to delist exam schedule.");
    } finally {
      setIsDelisting(false);
    }
  }, [delistTarget, fetchExamSchedules, isDelisting]);

  useEffect(() => {
    fetchExamSchedules();
  }, [fetchExamSchedules]);

  useEffect(() => {
    const loadInitialData = async () => {
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

      try {
        const [examTypes, classes, sections, subjects, years] = await Promise.all([
          getExamTypeList(),
          getClassList(),
          getSectionList(),
          getSubjectList(),
          getAcademicYearList(),
        ]);
        setExamTypeOptions(Array.isArray(examTypes) ? examTypes : []);
        setClassOptions(Array.isArray(classes) ? classes : []);
        setSectionOptions(Array.isArray(sections) ? sections : []);
        setSubjectOptions(Array.isArray(subjects) ? subjects : []);
        setAcademicYears(Array.isArray(years) ? years : []);
      } catch (_error) {
        setExamTypeOptions([]);
        setClassOptions([]);
        setSectionOptions([]);
        setSubjectOptions([]);
        setAcademicYears([]);
      }
    };

    loadInitialData();
  }, []);

  return (
    <main className="dashboard-shell h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full w-full flex-col px-3 pb-4 pt-16 sm:px-6 lg:px-8 lg:pt-8">
        <section className="shrink-0 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-700 via-cyan-700 to-teal-700 px-4 py-4 text-white shadow-[0_16px_34px_rgba(14,116,144,0.25)] sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-[14px] font-semibold tracking-wide sm:text-[18px]">
              Exam Schedule
            </h1>
            <div className="flex items-center gap-3">
              <label className="sr-only" htmlFor="exam-schedule-academic-year-filter">
                Academic Year
              </label>
              <select
                id="exam-schedule-academic-year-filter"
                value={selectedAcademicYearId}
                onChange={(event) => setSelectedAcademicYearId(event.target.value)}
                className="h-10 min-w-[164px] rounded-lg border border-white/80 bg-white px-3 text-sm font-medium text-sky-700 outline-none transition focus:border-white focus:ring-2 focus:ring-white/50"
              >
                <option value="">All academic years</option>
                {academicYearFilterOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(true)}
                className="inline-flex items-center justify-center rounded-full border border-white/80 bg-white p-2.5 text-sky-700 shadow-sm transition hover:bg-sky-50"
                aria-label="Watch exam schedule setup video"
                title="Watch exam schedule setup video"
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
                onClick={() => {
                  setSelectedExamSchedule(null);
                  setDialogMode("create");
                  setIsScheduleDialogOpen(true);
                }}
                className="whitespace-nowrap rounded-lg bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
              >
                Add Exam Schedule
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="h-full overflow-auto pb-10 sm:pb-6">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead>
                <tr className="text-center text-xs uppercase tracking-wide text-slate-500">
                  <th className="sticky top-0 z-20 w-[60px] border-b border-slate-200 bg-slate-50 px-2 py-3 font-semibold shadow-[0_1px_0_rgba(148,163,184,0.35)] first:rounded-l-xl">
                    SL.No.
                  </th>
                  <th className="sticky top-0 z-20 w-[140px] whitespace-nowrap border-b border-slate-200 bg-slate-50 px-2 py-3 font-semibold shadow-[0_1px_0_rgba(148,163,184,0.35)]">
                    Academic Year
                  </th>
                  <th className="sticky top-0 z-20 w-[150px] whitespace-nowrap border-b border-slate-200 bg-slate-50 px-2 py-3 font-semibold shadow-[0_1px_0_rgba(148,163,184,0.35)]">
                    Exam Name
                  </th>
                  <th className="sticky top-0 z-20 w-[60px] border-b border-slate-200 bg-slate-50 px-2 py-3 font-semibold shadow-[0_1px_0_rgba(148,163,184,0.35)]">
                    Class
                  </th>
                  <th className="sticky top-0 z-20 w-[72px] border-b border-slate-200 bg-slate-50 px-2 py-3 font-semibold shadow-[0_1px_0_rgba(148,163,184,0.35)]">
                    Section
                  </th>
                  <th className="sticky top-0 z-20 w-[88px] whitespace-nowrap border-b border-slate-200 bg-slate-50 px-2 py-3 font-semibold shadow-[0_1px_0_rgba(148,163,184,0.35)]">
                    Full Marks
                  </th>
                  <th className="sticky top-0 z-20 w-[620px] border-b border-slate-200 bg-slate-50 px-2 py-3 font-semibold shadow-[0_1px_0_rgba(148,163,184,0.35)]">
                    Subject Schedules
                  </th>
                  <th className="sticky top-0 z-20 w-[200px] border-b border-slate-200 bg-slate-50 px-2 py-3 font-semibold shadow-[0_1px_0_rgba(148,163,184,0.35)]">
                    Created By
                  </th>
                  <th className="sticky top-0 z-20 w-[68px] border-b border-slate-200 bg-slate-50 px-2 py-3 font-semibold shadow-[0_1px_0_rgba(148,163,184,0.35)] last:rounded-r-xl">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3" colSpan={9}>
                      Loading...
                    </td>
                  </tr>
                ) : null}

                {!isLoading && errorMessage ? (
                  <tr className="border-b border-slate-100 text-sm text-red-600">
                    <td className="px-2 py-3" colSpan={9}>
                      {errorMessage}
                    </td>
                  </tr>
                ) : null}

                {!isLoading && !errorMessage && filteredExamSchedules.length === 0 ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-3" colSpan={9}>
                      No exam schedule records found.
                    </td>
                  </tr>
                ) : null}

                {filteredExamSchedules.map((item, index) => {
                  const examName =
                    item.exam_name ||
                    examTypeById.get(String(item.exam_id))?.exam_name ||
                    "-";

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 text-center text-sm text-slate-700 transition-colors odd:bg-slate-50/40 even:bg-white hover:bg-slate-50/70"
                    >
                      <td className="px-2 py-4 font-medium text-slate-800">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-2 py-4 align-center">
                        {item.academic_year_name || "-"}
                      </td>
                      <td className="px-2 py-4 align-center">
                        <div className="whitespace-nowrap font-semibold text-slate-900">
                          {formatOptionLabel(examName)}
                        </div>
                      </td>
                      <td className="px-2 py-4 align-center">
                        {item.class_name || item.class_details?.class_name || "-"}
                      </td>
                      <td className="px-2 py-4 align-center">
                        {item.section_name || item.section_details?.section || "-"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-4 align-center font-semibold text-slate-900">
                        {item.total_marks ?? item.totalMarks ?? item.exam?.total_marks ?? item.exam?.totalMarks ?? "-"}
                      </td>
                      <td className="px-2 py-4 align-center">
                        {renderSubjectSchedulesTable(item)}
                      </td>
                      <td className="px-2 py-4 align-center">
                        <span className="inline-flex px-3 py-1 text-xs ">
                          {formatCreatedBy(item.created_by)}
                        </span>
                      </td>
                      <td className="px-2 py-4 align-center">
                        <button
                          type="button"
                          data-action-menu-trigger="true"
                          onClick={(event) => toggleActionMenu(event, item)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                          aria-label="Exam schedule actions"
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
        </section>
      </div>

      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h2 className="text-base font-semibold text-gray-900">
                Exam Schedule Video Guide
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
                src="https://www.youtube-nocookie.com/embed/qQiSNcuHAYM?autoplay=1&vq=hd1080&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1"
                title="Exam schedule setup tutorial video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      <ExamScheduleCreateDialog
        key={`${dialogMode}-${selectedExamSchedule?.id || "new"}-${isScheduleDialogOpen ? "open" : "closed"}`}
        open={isScheduleDialogOpen}
        onClose={() => {
          setIsScheduleDialogOpen(false);
          setSelectedExamSchedule(null);
          setDialogMode("create");
        }}
        onCreate={handleCreateExamSchedule}
        onUpdate={handleUpdateExamSchedule}
        companyId={companyId}
        examTypeOptions={examTypeOptions}
        classOptions={classOptions}
        sectionOptions={sectionOptions}
        subjectOptions={subjectOptions}
        academicYears={academicYears}
        preselectedAcademicYearId={selectedAcademicYearId}
        initialData={selectedExamSchedule}
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
                onClick={() => handleEdit(activeMenu.examScheduleItem)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelist(activeMenu.examScheduleItem)}
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
        itemLabel={delistTarget?.exam_name || "this exam schedule"}
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
