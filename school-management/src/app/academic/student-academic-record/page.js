"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import AccessDeniedDialog from "@/components/ui/AccessDeniedDialog";
import StudentAcademicRecordCreateDialog from "@/components/ui/StudentAcademicRecordCreateDialog";
import DelistConfirmDialog from "@/components/ui/DelistConfirmDialog";
import {
  createAcademicYearList,
  createStudentAcademicRecordList,
  delistStudentAcademicRecordList,
  getAcademicYearList,
  getClassList,
  getCurrentSchoolInfo,
  getAllActiveCompanyUser,
  getSectionList,
  getAttachmentsWithIDs,
  getStudentAcademicRecordList,
  getStudentList,
  updateStudentAcademicRecordList,
} from "@/lib/apiService";

const STUDENT_RECORDS_PER_PAGE = 5;

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

function formatStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return "-";
  }
  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAcademicYearSortKey(item) {
  const yearName = String(item?.year_name || item?.yearName || "").trim();
  if (!yearName) {
    return Number.POSITIVE_INFINITY;
  }

  const startYear = Number(yearName.split("-")[0]);
  return Number.isFinite(startYear) ? startYear : Number.POSITIVE_INFINITY;
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

function resolveDefaultAcademicYearId(academicYearOptions = []) {
  const options = Array.isArray(academicYearOptions) ? academicYearOptions : [];
  if (!options.length) {
    return "";
  }

  const currentYear = new Date().getFullYear();
  const parsedYears = options
    .map((item) => {
      const yearName = String(item?.year_name || item?.yearName || "").trim();
      const [startText, endText] = yearName.split("-");
      const startYear = Number.parseInt(startText, 10);
      const endYear = Number.parseInt(endText, 10);
      if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) {
        return null;
      }
      return { item, startYear, endYear };
    })
    .filter(Boolean);

  const exactCurrentStartYear = parsedYears.find(
    (entry) => entry.startYear === currentYear,
  );
  if (exactCurrentStartYear?.item?.id) {
    return String(exactCurrentStartYear.item.id);
  }

  const matchingRangeYear = parsedYears.find(
    (entry) => currentYear >= entry.startYear && currentYear <= entry.endYear,
  );
  if (matchingRangeYear?.item?.id) {
    return String(matchingRangeYear.item.id);
  }

  const activeYear = options.find(
    (item) => Boolean(item?.is_active) || Boolean(item?.isActive),
  );
  if (activeYear?.id) {
    return String(activeYear.id);
  }

  const sorted = sortAcademicYearsBySequence(options);
  const fallback = sorted[sorted.length - 1];
  return fallback?.id ? String(fallback.id) : "";
}

function getUniqueOptions(records, idKey, labelKey) {
  const options = new Map();

  for (const record of Array.isArray(records) ? records : []) {
    const id = String(record?.[idKey] || "").trim();
    const label = String(record?.[labelKey] || "").trim();
    if (!id || !label || options.has(id)) {
      continue;
    }
    options.set(id, { id, label });
  }

  return Array.from(options.values()).sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  showLabel = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const selectedOption = options.find((option) => String(option?.id) === String(value || ""));
  const selectedLabel = String(selectedOption?.label || "").trim();

  const updateMenuPosition = () => {
    const buttonElement = buttonRef.current;
    if (!buttonElement) {
      setMenuStyle(null);
      return;
    }

    const rect = buttonElement.getBoundingClientRect();
    const viewportPadding = 8;
    const menuWidth = rect.width;
    const menuMaxHeight = 232;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openAbove = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxHeight = openAbove
      ? Math.max(140, Math.min(menuMaxHeight, spaceAbove))
      : Math.max(140, Math.min(menuMaxHeight, spaceBelow));

    setMenuStyle({
      left: Math.max(
        viewportPadding,
        Math.min(rect.left, window.innerWidth - menuWidth - viewportPadding),
      ),
      top: openAbove ? Math.max(viewportPadding, rect.top - maxHeight - 6) : rect.bottom + 6,
      width: menuWidth,
      maxHeight,
    });
  };

  useEffect(() => {
    if (!isOpen || disabled) {
      return undefined;
    }

    const animationFrameId = window.requestAnimationFrame(updateMenuPosition);

    const handleOutsideClick = (event) => {
      if (!(event.target instanceof Node)) {
        setIsOpen(false);
        return;
      }
      if (
        !containerRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleResizeOrScroll = () => {
      updateMenuPosition();
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleResizeOrScroll);
    window.addEventListener("scroll", handleResizeOrScroll, true);
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll, true);
    };
  }, [disabled, isOpen]);

  return (
    <label className="flex min-w-0 w-full flex-col gap-0.5 text-[11px] font-medium text-slate-700 sm:w-[150px] lg:w-[140px]">
      {showLabel ? (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
      ) : null}
      <div ref={containerRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setIsOpen((prev) => !prev);
            }
          }}
          className="flex h-8 w-full items-center justify-between rounded-md border border-sky-300 bg-white px-3 text-[11px] text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 sm:text-xs"
        >
          <span className="line-clamp-1 text-left">{selectedLabel || placeholder}</span>
          <svg
            viewBox="0 0 24 24"
            className={`ml-2 h-3 w-3 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {isOpen && !disabled && menuStyle && typeof document !== "undefined"
          ? createPortal(
              <div
                ref={menuRef}
                className="fixed z-[2400] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.18)]"
                style={{
                  left: menuStyle.left,
                  top: menuStyle.top,
                  width: menuStyle.width,
                  maxHeight: menuStyle.maxHeight,
                }}
                role="listbox"
              >
                <div className="max-h-full overflow-y-auto p-1">
                  {options.length > 0 ? (
                    options.map((option) => {
                      const optionId = String(option?.id || "");
                      const isActive = String(value || "") === optionId;
                      return (
                        <button
                          key={optionId}
                          type="button"
                          onClick={() => {
                            onChange(optionId);
                            setIsOpen(false);
                          }}
                          className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-[11px] transition sm:text-xs ${
                            isActive
                              ? "bg-sky-50 text-sky-700"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                          role="option"
                          aria-selected={isActive}
                        >
                          <span className="truncate">{String(option?.label || "")}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-sm text-slate-500">No options found.</div>
                  )}
                </div>
              </div>,
              document.body,
            )
          : null}

      </div>
    </label>
  );
}

function getStudentInitials(name) {
  const firstLetter = String(name || "").trim().charAt(0).toUpperCase();
  return firstLetter || "S";
}

function formatStudentDisplayName(studentName, guardianName) {
  const name = String(studentName || "").trim();
  const guardian = String(guardianName || "").trim();
  if (name && guardian) {
    return `${name} (${guardian})`;
  }
  return name || guardian || "-";
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

function StudentAcademicRecordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allRecords, setAllRecords] = useState([]);
  const [records, setRecords] = useState([]);
  const [studentAttachmentPreviews, setStudentAttachmentPreviews] = useState({});
  const [companyUsers, setCompanyUsers] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [hasUserSelectedAcademicYear, setHasUserSelectedAcademicYear] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [prefilledStudentId, setPrefilledStudentId] = useState("");
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedRecord, setSelectedRecord] = useState(null);
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
  const totalPages = Math.max(1, Math.ceil(totalCount / STUDENT_RECORDS_PER_PAGE));

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getStudentAcademicRecordList();
      setAllRecords(Array.isArray(data) ? data : []);
    } catch (_error) {
      setErrorMessage("Unable to load student academic records.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOptionData = useCallback(async () => {
    const [students, years, classes, sections, users] = await Promise.all([
      getStudentList().catch(() => []),
      getAcademicYearList().catch(() => []),
      getClassList().catch(() => []),
      getSectionList().catch(() => []),
      getAllActiveCompanyUser().catch(() => []),
    ]);

    setStudentOptions(Array.isArray(students) ? students : []);
    setAcademicYearOptions(sortAcademicYearsBySequence(years));
    setClassOptions(Array.isArray(classes) ? classes : []);
    setSectionOptions(Array.isArray(sections) ? sections : []);
    setCompanyUsers(Array.isArray(users?.response) ? users.response : []);
  }, []);

  const handleCreateAcademicYear = useCallback(
    async (payload) => {
      const requestPayload = {
        year_name: payload.yearName,
        start_date: payload.startDate,
        end_date: payload.endDate,
        is_active: Boolean(payload.isActive),
        company_id: payload.companyId || companyId || undefined,
      };

      const createdYear = await createAcademicYearList(
        requestPayload,
        payload.accessToken,
      );

      await fetchOptionData();
      return createdYear;
    },
    [companyId, fetchOptionData],
  );

  useEffect(() => {
    fetchRecords();
    fetchOptionData();
  }, [fetchRecords, fetchOptionData]);

  useEffect(() => {
    if (!records.length || !companyUsers.length) {
      setStudentAttachmentPreviews({});
      return undefined;
    }

    const companyUserById = new Map(
      companyUsers.map((user) => [String(user?.id), user]),
    );
    const attachmentIds = Array.from(
      new Set(
        records
          .map((record) => {
            const linkedUser = companyUserById.get(
              String(record?.student_company_user_id || ""),
            );
            const linkedAttachmentId = Number(linkedUser?.attachment_id || 0);
            return Number.isFinite(linkedAttachmentId) && linkedAttachmentId > 0
              ? linkedAttachmentId
              : 0;
          })
          .filter((attachmentId) => Number.isFinite(attachmentId) && attachmentId > 0),
      ),
    );

    if (!attachmentIds.length) {
      setStudentAttachmentPreviews({});
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
        setStudentAttachmentPreviews(nextPreviews);
      })
      .catch(() => {
        if (mounted) {
          setStudentAttachmentPreviews({});
        }
      });

    return () => {
      mounted = false;
    };
  }, [records, companyUsers]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchText]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchText, selectedAcademicYearId, selectedClassId, selectedSectionId]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = debouncedSearchText.toLowerCase();

    return allRecords.filter((record) => {
      if (
        selectedAcademicYearId &&
        String(record?.academic_year_id || "") !== selectedAcademicYearId
      ) {
        return false;
      }
      if (selectedClassId && String(record?.class_details_id || "") !== selectedClassId) {
        return false;
      }
      if (
        selectedSectionId &&
        String(record?.section_details_id || "") !== selectedSectionId
      ) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }

      const searchFields = [
        record?.student_name,
        record?.academic_year_name,
        record?.class_name,
        record?.section_name,
        record?.roll_number,
        record?.status,
        record?.remarks,
      ];
      return searchFields.some((value) =>
        String(value ?? "").toLowerCase().includes(normalizedSearch),
      );
    });
  }, [
    allRecords,
    debouncedSearchText,
    selectedAcademicYearId,
    selectedClassId,
    selectedSectionId,
  ]);

  useEffect(() => {
    const total = filteredRecords.length;
    const start = (currentPage - 1) * STUDENT_RECORDS_PER_PAGE;
    const pageData = filteredRecords.slice(start, start + STUDENT_RECORDS_PER_PAGE);
    const previousExists = currentPage > 1;
    const nextExists = start + STUDENT_RECORDS_PER_PAGE < total;

    setRecords(pageData);
    setTotalCount(total);
    setHasPreviousPage(previousExists);
    setHasNextPage(nextExists);

    if (currentPage > 1 && pageData.length === 0 && total > 0) {
      setCurrentPage((prev) => Math.max(1, prev - 1));
    }
  }, [currentPage, filteredRecords]);

  const academicYearFilterOptions = useMemo(
    () =>
      academicYearOptions.map((item) => ({
        id: String(item.id),
        label: String(item.year_name || item.yearName || ""),
      })),
    [academicYearOptions],
  );

  const classFilterOptions = useMemo(() => {
    const sourceRecords = selectedAcademicYearId
      ? allRecords.filter(
          (record) => String(record?.academic_year_id || "") === selectedAcademicYearId,
        )
      : allRecords;
    return getUniqueOptions(sourceRecords, "class_details_id", "class_name");
  }, [allRecords, selectedAcademicYearId]);

  const sectionFilterOptions = useMemo(() => {
    const sourceRecords = allRecords.filter((record) => {
      if (
        selectedAcademicYearId &&
        String(record?.academic_year_id || "") !== selectedAcademicYearId
      ) {
        return false;
      }
      if (selectedClassId && String(record?.class_details_id || "") !== selectedClassId) {
        return false;
      }
      return true;
    });
    return getUniqueOptions(sourceRecords, "section_details_id", "section_name");
  }, [allRecords, selectedAcademicYearId, selectedClassId]);

  const handleAcademicYearFilterChange = (value) => {
    setHasUserSelectedAcademicYear(true);
    setSelectedAcademicYearId(value);
    setSelectedClassId("");
    setSelectedSectionId("");
  };

  const handleClassFilterChange = (value) => {
    setSelectedClassId(value);
    setSelectedSectionId("");
  };

  const handleSectionFilterChange = (value) => {
    setSelectedSectionId(value);
  };

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

  useEffect(() => {
    if (!academicYearOptions.length || hasUserSelectedAcademicYear) {
      return;
    }

    setSelectedAcademicYearId((previous) => {
      const previousExists = academicYearOptions.some(
        (item) => String(item?.id || "") === String(previous || ""),
      );
      if (previous && previousExists) {
        return previous;
      }
      return resolveDefaultAcademicYearId(academicYearOptions);
    });
  }, [academicYearOptions, hasUserSelectedAcademicYear]);

  useEffect(() => {
    const shouldOpenCreate = searchParams.get("openCreate") === "1";
    if (!shouldOpenCreate) {
      return;
    }

    const studentIdParam = String(searchParams.get("studentId") || "").trim();
    setPrefilledStudentId(studentIdParam);
    setIsCreateDialogOpen(true);
    router.replace("/academic/student-academic-record/", { scroll: false });
  }, [router, searchParams]);

  const handleCreateRecord = async (recordData) => {
    const payload = {
      company_id: recordData.companyId || companyId || undefined,
      student_id: recordData.studentId,
      academic_year_id: recordData.academicYearId,
      class_details_id: recordData.classDetailsId,
      section_details_id: recordData.sectionDetailsId,
      roll_number: recordData.rollNumber || "",
      admission_date: recordData.admissionDate,
      status: recordData.status,
      remarks: recordData.remarks || "",
    };

    if (dialogMode === "edit" && recordData.id) {
      await updateStudentAcademicRecordList(recordData.id, payload, recordData.accessToken);
    } else {
      await createStudentAcademicRecordList(payload, recordData.accessToken);
    }

    await fetchRecords();
    setIsCreateDialogOpen(false);
    setPrefilledStudentId("");
    setDialogMode("create");
    setSelectedRecord(null);
  };

  const toggleActionMenu = (event, recordItem) => {
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
      id: recordItem.id,
      recordItem,
      top,
      left,
    };

    setActiveMenu((prev) => (prev?.id === recordItem.id ? null : nextMenu));
  };

  const handleEdit = (recordItem) => {
    setActiveMenu(null);
    const normalizedStatus = String(recordItem?.status || "").trim().toLowerCase();
    if (normalizedStatus === "promoted") {
      return;
    }
    if (currentUserRole === "non-teaching" || (currentUserRole === "teacher" && !isCurrentUserHeadMaster)) {
      setAccessDeniedMessage("Teacher cannot edit");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
    setDialogMode("edit");
    setSelectedRecord(recordItem);
    setIsCreateDialogOpen(true);
  };

  const handleReview = (recordItem) => {
    setActiveMenu(null);
    setDialogMode("review");
    setSelectedRecord(recordItem);
    setIsCreateDialogOpen(true);
  };

  const handleDelist = (recordItem) => {
    setActiveMenu(null);
    if (currentUserRole === "non-teaching") {
      setAccessDeniedMessage("Non-teaching staff cannot delist");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
    setDelistTarget(recordItem);
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
      await delistStudentAcademicRecordList(delistTarget.id, accessToken);
      await fetchRecords();
      setIsDelistDialogOpen(false);
      setDelistTarget(null);
    } finally {
      setIsDelisting(false);
    }
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
              Student Academic Record
            </h1>
            <div className="hidden items-center gap-3 lg:flex">
              <div className="flex items-end gap-1.5">
                <FilterSelect
                  value={selectedAcademicYearId}
                  onChange={handleAcademicYearFilterChange}
                  options={academicYearFilterOptions}
                  placeholder="All academic years"
                />
                <FilterSelect
                  value={selectedClassId}
                  onChange={handleClassFilterChange}
                  options={classFilterOptions}
                  placeholder="All classes"
                />
                <FilterSelect
                  value={selectedSectionId}
                  onChange={handleSectionFilterChange}
                  options={sectionFilterOptions}
                  placeholder="All sections"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAcademicYearId("");
                    setSelectedClassId("");
                    setSelectedSectionId("");
                  }}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    !selectedAcademicYearId && !selectedClassId && !selectedSectionId
                  }
                  aria-label="Clear filters"
                  title="Clear filters"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12" />
                    <path d="M18 6l-12 12" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPrefilledStudentId("");
                  setIsCreateDialogOpen(true);
                }}
                className="whitespace-nowrap rounded-lg bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
              >
                Add New Record
              </button>
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => {
                  setPrefilledStudentId("");
                  setIsCreateDialogOpen(true);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white text-sky-700 shadow-sm transition hover:bg-sky-50"
                aria-label="Add record"
                title="Add new record"
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
          <div className="mt-3 grid gap-2 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              <FilterSelect
                label="Academic Year"
                value={selectedAcademicYearId}
                onChange={handleAcademicYearFilterChange}
                options={academicYearFilterOptions}
                placeholder="All academic years"
                showLabel={false}
              />
              <FilterSelect
                label="Class"
                value={selectedClassId}
                onChange={handleClassFilterChange}
                options={classFilterOptions}
                placeholder="All classes"
                showLabel={false}
              />
            </div>
            <div className="grid grid-cols-2 items-start gap-2">
              <FilterSelect
                label="Section"
                value={selectedSectionId}
                onChange={handleSectionFilterChange}
                options={sectionFilterOptions}
                placeholder="All sections"
                showLabel={false}
              />
              <div className="flex h-full items-start">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAcademicYearId("");
                    setSelectedClassId("");
                    setSelectedSectionId("");
                  }}
                  className="inline-flex h-8 w-full items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    !selectedAcademicYearId && !selectedClassId && !selectedSectionId
                  }
                  aria-label="Clear filters"
                  title="Clear filters"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12" />
                    <path d="M18 6l-12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 text-center">
                  {/* <th className="px-2 py-3 font-semibold">SL.No.</th> */}
                  <th className="px-2 py-3 font-semibold">Photo</th>
                  <th className="px-2 py-3 font-semibold">Student</th>
                  <th className="px-2 py-3 font-semibold">Academic Year</th>
                  <th className="px-2 py-3 font-semibold">Class</th>
                  <th className="px-2 py-3 font-semibold">Section</th>
                  <th className="px-2 py-3 font-semibold">Roll Number</th>
              <th className="px-2 py-3 font-semibold">Admission Date</th>
              <th className="px-2 py-3 font-semibold">Status</th>
              <th className="px-2 py-3 font-semibold">Remarks</th>
              <th className="px-2 py-3 font-semibold">Action</th>
            </tr>
          </thead>
              <tbody>
                {isLoading ? (
                  <tr className="border-b border-slate-100 text-sm text-slate-700">
                <td className="px-2 py-3" colSpan={11}>
                  Loading...
                </td>
              </tr>
            ) : null}
            {!isLoading && errorMessage ? (
              <tr className="border-b border-slate-100 text-sm text-red-600">
                <td className="px-2 py-3" colSpan={11}>
                  {errorMessage}
                </td>
              </tr>
            ) : null}
            {!isLoading && !errorMessage && records.length === 0 ? (
              <tr className="border-b border-slate-100 text-sm text-slate-700">
                <td className="px-2 py-3" colSpan={11}>
                  No student academic records found.
                </td>
              </tr>
            ) : null}
                {records.map((item, index) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 text-sm text-slate-700 text-center"
                  >
                    {/* <td className="px-2 py-3 font-medium text-slate-800">
                      {(currentPage - 1) * STUDENT_RECORDS_PER_PAGE + index + 1}
                    </td> */}
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-center">
                        <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-sky-50">
                          {(() => {
                            const companyUserId = String(
                              item?.student_company_user_id || "",
                            );
                            const attachmentId = Number(
                              companyUsers.find(
                                (user) => String(user?.id) === companyUserId,
                              )?.attachment_id || 0,
                            );
                            const preview =
                              Number.isFinite(attachmentId) && attachmentId > 0
                                ? studentAttachmentPreviews[String(attachmentId)]
                                : "";
                            return preview ? (
                              <img
                                src={preview}
                                alt={`${item.student_name || "Student"} profile`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-sky-100 text-sm font-semibold text-sky-700">
                                {getStudentInitials(item.student_name)}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      {formatStudentDisplayName(
                        item.student_name,
                        item.student_guardian_name,
                      )}
                    </td>
                    <td className="px-2 py-3">{item.academic_year_name || "-"}</td>
                    <td className="px-2 py-3">{item.class_name || "-"}</td>
                    <td className="px-2 py-3">{item.section_name || "-"}</td>
                    <td className="px-2 py-3">{item.roll_number || "-"}</td>
                    <td className="px-2 py-3">{formatDate(item.admission_date)}</td>
                    <td className="px-2 py-3">{formatStatus(item.status)}</td>
                    <td className="px-2 py-3">{item.remarks || "-"}</td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        data-action-menu-trigger="true"
                        onClick={(event) => toggleActionMenu(event, item)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
                        aria-label="Record actions"
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
          {!isLoading && !errorMessage && totalCount > STUDENT_RECORDS_PER_PAGE ? (
            <div className="mt-3 shrink-0 flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
              <p className="text-xs text-slate-600 sm:text-sm">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={isLoading || !hasPreviousPage}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={isLoading || !hasNextPage}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <StudentAcademicRecordCreateDialog
        key={`${dialogMode}-${selectedRecord?.id || "new"}-${isCreateDialogOpen ? "open" : "closed"}`}
        open={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setPrefilledStudentId("");
          setDialogMode("create");
          setSelectedRecord(null);
        }}
        onCreate={handleCreateRecord}
        companyId={companyId}
        existingRecords={records}
        studentOptions={studentOptions}
        academicYearOptions={academicYearOptions}
        classOptions={classOptions}
        sectionOptions={sectionOptions}
        initialData={selectedRecord}
        mode={dialogMode}
        initialStudentId={prefilledStudentId}
        onCreateAcademicYear={handleCreateAcademicYear}
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
                onClick={() => handleReview(activeMenu.recordItem)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Review
              </button>
              <button
                type="button"
                disabled={
                  String(activeMenu.recordItem?.status || "").trim().toLowerCase() === "promoted"
                }
                onClick={() => handleEdit(activeMenu.recordItem)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelist(activeMenu.recordItem)}
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
        itemLabel={delistTarget?.student_name || "this academic record"}
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

export default function StudentAcademicRecordPage() {
  return (
    <Suspense fallback={null}>
      <StudentAcademicRecordPageContent />
    </Suspense>
  );
}
