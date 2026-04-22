"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AccessDeniedDialog from "@/components/ui/AccessDeniedDialog";
import StudentCreateDialog from "@/components/ui/StudentCreateDialog";
import StudentAcademicRecordCreateDialog from "@/components/ui/StudentAcademicRecordCreateDialog";
import DialogStudentFeesCollection from "@/components/ui/DialogStudentFeesCollection";
import DelistConfirmDialog from "@/components/ui/DelistConfirmDialog";
import {
  createStudentAcademicRecordList,
  createStudentFeesCollection,
  getAcademicYearList,
  getClassFeeStructureList,
  getClassList,
  createStudentList,
  delistStudentList,
  getCurrentSchoolInfo,
  getAttachmentsWithIDs,
  getSectionList,
  getStudentAcademicRecordList,
  getStudentList,
  updateStudentAcademicRecordList,
  updateStudentList,
} from "@/lib/apiService";
import { FcHighPriority } from "react-icons/fc";
import { FcApproval } from "react-icons/fc";

const STUDENTS_PER_PAGE = 10;

function formatDob(value) {
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

function renderWarningIfEmpty(value) {
  const hasValue = String(value ?? "").trim().length > 0;
  if (hasValue) {
    return value;
  }

  return (
    <span
      title="Missing value"
      aria-label="Missing value"
      className="inline-flex  items-center justify-center "
    >
      <FcHighPriority className="h-6 w-6"/>
    </span>
  );
}

function hasMissingContact(student) {
  const mobilePresent = String(student?.mobile ?? "").trim().length > 0;
  const emailPresent = String(student?.email ?? "").trim().length > 0;
  return !mobilePresent || !emailPresent;
}

function getStudentInitials(name) {
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

function sortAcademicYearsBySequence(items) {
  return [...(Array.isArray(items) ? items : [])].sort((left, right) => {
    const leftName = String(left?.year_name || left?.yearName || "");
    const rightName = String(right?.year_name || right?.yearName || "");
    return leftName.localeCompare(rightName);
  });
}

function getStudentAcademicRecordPayload(recordData, overrideStatus) {
  return {
    student_id:
      Number(
        recordData?.student_id ||
          recordData?.studentId ||
          recordData?.student_company_user_id ||
          0,
      ) || undefined,
    academic_year_id:
      Number(recordData?.academic_year_id || recordData?.academicYearId || 0) ||
      undefined,
    class_details_id:
      Number(recordData?.class_details_id || recordData?.classDetailsId || 0) ||
      undefined,
    section_details_id:
      Number(recordData?.section_details_id || recordData?.sectionDetailsId || 0) ||
      undefined,
    roll_number: String(recordData?.roll_number || recordData?.rollNumber || "").trim(),
    admission_date: recordData?.admission_date || recordData?.admissionDate || null,
    status: String(overrideStatus || recordData?.status || "active").trim().toLowerCase(),
    remarks: String(recordData?.remarks || "").trim(),
    company_id: Number(recordData?.company_id || recordData?.companyId || 0) || undefined,
  };
}

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [isSearchVisibleSmallScreen, setIsSearchVisibleSmallScreen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [companyId, setCompanyId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [isCurrentUserHeadMaster, setIsCurrentUserHeadMaster] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [dialogMode, setDialogMode] = useState("create");
  const [studentAttachmentPreviews, setStudentAttachmentPreviews] = useState({});
  const [isDelistDialogOpen, setIsDelistDialogOpen] = useState(false);
  const [delistTarget, setDelistTarget] = useState(null);
  const [isDelisting, setIsDelisting] = useState(false);
  const [isAccessDeniedDialogOpen, setIsAccessDeniedDialogOpen] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");
  const [isAcademicRecordDialogOpen, setIsAcademicRecordDialogOpen] = useState(false);
  const [academicDialogPrefilledStudentId, setAcademicDialogPrefilledStudentId] = useState("");
  const [academicDialogInitialData, setAcademicDialogInitialData] = useState(null);
  const [studentAcademicRecordOptions, setStudentAcademicRecordOptions] = useState([]);
  const [academicStudentOptions, setAcademicStudentOptions] = useState([]);
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [feeStructureOptions, setFeeStructureOptions] = useState([]);
  const [isFeesDialogOpen, setIsFeesDialogOpen] = useState(false);
  const [feesDialogInitialData, setFeesDialogInitialData] = useState(null);
  const [recentCreatedAcademicRecord, setRecentCreatedAcademicRecord] = useState(null);
  const totalPages = Math.max(1, Math.ceil(totalCount / STUDENTS_PER_PAGE));
  const visiblePageItems = getVisiblePageItems(currentPage, totalPages);

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getStudentList({
        page: currentPage,
        pageSize: STUDENTS_PER_PAGE,
        search: debouncedSearchText,
      });

      if (Array.isArray(data)) {
        const start = (currentPage - 1) * STUDENTS_PER_PAGE;
        const pageData = data.slice(start, start + STUDENTS_PER_PAGE);
        setStudents(pageData);
        setTotalCount(data.length);
        setHasPreviousPage(currentPage > 1);
        setHasNextPage(start + STUDENTS_PER_PAGE < data.length);

        if (currentPage > 1 && pageData.length === 0 && data.length > 0) {
          setCurrentPage((prev) => Math.max(1, prev - 1));
        }
        return;
      }

      const pageData = Array.isArray(data?.results) ? data.results : [];
      const count = Number.isFinite(data?.count) ? data.count : pageData.length;
      const nextExists =
        typeof data?.next === "string"
          ? Boolean(data.next)
          : currentPage * STUDENTS_PER_PAGE < count;
      const previousExists =
        typeof data?.previous === "string"
          ? Boolean(data.previous)
          : currentPage > 1;

      setStudents(pageData);
      setTotalCount(count);
      setHasNextPage(nextExists);
      setHasPreviousPage(previousExists);

      if (currentPage > 1 && pageData.length === 0 && count > 0) {
        setCurrentPage((prev) => Math.max(1, prev - 1));
      }
    } catch (_error) {
      setStudents([]);
      setTotalCount(0);
      setHasNextPage(false);
      setHasPreviousPage(currentPage > 1);
      setErrorMessage("Unable to load student list.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchText]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    if (!students.length) {
      setStudentAttachmentPreviews({});
      return undefined;
    }

    const attachmentIds = Array.from(
      new Set(
        students
          .map((student) => Number(student?.attachment_id || 0))
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
  }, [students]);

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

  const fetchAcademicFlowOptions = useCallback(async () => {
    try {
      const [studentRecords, feeStructures, studentList, years, classes, sections] =
        await Promise.all([
          getStudentAcademicRecordList(),
          getClassFeeStructureList(),
          getStudentList(),
          getAcademicYearList(),
          getClassList(),
          getSectionList(),
        ]);
      setStudentAcademicRecordOptions(Array.isArray(studentRecords) ? studentRecords : []);
      setFeeStructureOptions(Array.isArray(feeStructures) ? feeStructures : []);
      setAcademicStudentOptions(Array.isArray(studentList) ? studentList : []);
      setAcademicYearOptions(sortAcademicYearsBySequence(years));
      setClassOptions(Array.isArray(classes) ? classes : []);
      setSectionOptions(Array.isArray(sections) ? sections : []);
    } catch (_error) {
      setStudentAcademicRecordOptions([]);
      setFeeStructureOptions([]);
      setAcademicStudentOptions([]);
      setAcademicYearOptions([]);
      setClassOptions([]);
      setSectionOptions([]);
    }
  }, []);

  useEffect(() => {
    fetchAcademicFlowOptions();
  }, [fetchAcademicFlowOptions]);

  const handleSaveStudent = async (studentData) => {
    const isCreateMode = !(dialogMode === "edit" && studentData.id);
    const payload = {
      company_id: studentData.companyId || companyId || undefined,
      name: studentData.name,
      username: studentData.username || "",
      role: studentData.role || "student",
      mobile: studentData.mobile || "",
      email: studentData.email,
      is_verified: Boolean(studentData.is_verified),
      password: studentData.password || "abc123",
      dob: studentData.dob,
      guardian_name: studentData.guardianName || "",
      address: studentData.address || "",
      state: studentData.state || "",
      city: studentData.city || "",
      pin: studentData.pin || "",
      attachment_id: studentData.attachmentId,
    };

    let apiResponse = null;
    if (!isCreateMode) {
      await updateStudentList(studentData.id, payload, studentData.accessToken);
    } else {
      apiResponse = await createStudentList(payload, studentData.accessToken);
    }

    await fetchStudents();
    setIsCreateDialogOpen(false);
    setSelectedStudent(null);
    setDialogMode("create");

    if (isCreateMode) {
      const createdStudentId = apiResponse?.company_user?.id || "";
      await fetchAcademicFlowOptions();
      setAcademicDialogPrefilledStudentId(String(createdStudentId || ""));
      setAcademicDialogInitialData({
        studentId: String(createdStudentId || ""),
        student_id: String(createdStudentId || ""),
        status: "pending",
      });
      setIsAcademicRecordDialogOpen(true);
    }
  };

  const handleCreateStudentAcademicRecord = async (recordData) => {
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

    const createdRecord = await createStudentAcademicRecordList(payload, recordData.accessToken);
    const createdRecordId = Number(
      createdRecord?.id || createdRecord?.response?.id || createdRecord?.data?.id || 0,
    );
    if (!Number.isFinite(createdRecordId) || createdRecordId <= 0) {
      throw new Error("Created student academic record id not found.");
    }

    const latestStudentRecords = await getStudentAcademicRecordList();
    const normalizedRecords = Array.isArray(latestStudentRecords) ? latestStudentRecords : [];
    setStudentAcademicRecordOptions(normalizedRecords);
    const resolvedCreatedRecord =
      normalizedRecords.find((item) => Number(item?.id) === createdRecordId) || {
        id: createdRecordId,
        ...payload,
      };
    setRecentCreatedAcademicRecord(resolvedCreatedRecord);

    setIsAcademicRecordDialogOpen(false);
    setAcademicDialogPrefilledStudentId("");
    setAcademicDialogInitialData(null);

    setFeesDialogInitialData({
      studentAcademicRecordId: String(createdRecordId),
    });
    setIsFeesDialogOpen(true);
  };

  const handleCreateStudentFeesCollection = async (payload) => {
    const requestPayload = {
      student_academic_rcord_id: payload.studentAcademicRecordId,
      fee_structure_id: payload.feeStructureId,
      installment_name: payload.installmentName,
      due_date: payload.dueDate,
      paid_amount: payload.paidAmount,
      payment_date: payload.paymentDate,
      payment_mode: payload.paymentMode,
      transaction_id: payload.transactionId,
      remarks: payload.remarks,
      company_id: payload.companyId || companyId || undefined,
    };

    await createStudentFeesCollection(requestPayload, payload.accessToken);

    const targetRecordId =
      Number(recentCreatedAcademicRecord?.id || payload.studentAcademicRecordId || 0) || 0;
    if (targetRecordId > 0) {
      const latestStudentRecords = await getStudentAcademicRecordList();
      const normalizedRecords = Array.isArray(latestStudentRecords) ? latestStudentRecords : [];
      const targetRecord =
        normalizedRecords.find((item) => Number(item?.id) === targetRecordId) ||
        recentCreatedAcademicRecord ||
        null;

      if (targetRecord) {
        const activationPayload = getStudentAcademicRecordPayload(
          {
            ...targetRecord,
            company_id: targetRecord?.company_id || companyId,
          },
          "active",
        );
        await updateStudentAcademicRecordList(
          targetRecordId,
          activationPayload,
          payload.accessToken,
        );
        const refreshedRecords = await getStudentAcademicRecordList();
        setStudentAcademicRecordOptions(Array.isArray(refreshedRecords) ? refreshedRecords : []);
      }
    }

    setIsFeesDialogOpen(false);
    setFeesDialogInitialData(null);
    setRecentCreatedAcademicRecord(null);
  };

  const handleOpenCreate = () => {
    setDialogMode("create");
    setSelectedStudent(null);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (studentItem) => {
    setActiveMenu(null);
    if (currentUserRole === "teacher" && !isCurrentUserHeadMaster) {
      setAccessDeniedMessage("Teacher cannot edit");
      setIsAccessDeniedDialogOpen(true);
      return;
    }
    setDialogMode("edit");
    setSelectedStudent(studentItem);
    setIsCreateDialogOpen(true);
  };

  const handleReview = (studentItem) => {
    setActiveMenu(null);
    setDialogMode("review");
    setSelectedStudent(studentItem);
    setIsCreateDialogOpen(true);
  };

  const handleDelist = (studentItem) => {
    setActiveMenu(null);
    setDelistTarget(studentItem);
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
      await delistStudentList(delistTarget.id, accessToken);
      await fetchStudents();
      setIsDelistDialogOpen(false);
      setDelistTarget(null);
    } finally {
      setIsDelisting(false);
    }
  };

  const toggleActionMenu = (event, studentItem) => {
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
      id: studentItem.id,
      studentItem,
      top,
      left,
    };

    setActiveMenu((prev) => (prev?.id === studentItem.id ? null : nextMenu));
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
              Student List
            </h1>
            <div className="hidden items-center gap-3 lg:flex">
              <label htmlFor="student-search-desktop" className="sr-only">
                Search students
              </label>
              <input
                id="student-search-desktop"
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search name, username, email, mobile"
                className="h-10 w-[320px] max-w-[52vw] rounded-lg border border-white/70 bg-white/95 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-500 focus:border-white focus:ring-2 focus:ring-white/70"
              />
              <button
                type="button"
                onClick={handleOpenCreate}
                className="whitespace-nowrap rounded-lg bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
              >
                Add New Student
              </button>
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() =>
                  setIsSearchVisibleSmallScreen((prevVisible) => !prevVisible)
                }
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm transition hover:bg-sky-50"
                aria-label="Toggle student search"
                title="Search students"
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
                onClick={handleOpenCreate}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white text-sky-700 shadow-sm transition hover:bg-sky-50"
                aria-label="Add new student"
                title="Add new student"
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
              <label htmlFor="student-search-mobile" className="sr-only">
                Search students
              </label>
              <input
                id="student-search-mobile"
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search name, username, email, mobile"
                className="h-10 w-full rounded-lg border border-white/70 bg-white/95 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-500 focus:border-white focus:ring-2 focus:ring-white/70"
              />
            </div>
          ) : null}
        </section>

        <div className="mt-6 flex min-h-0 flex-1 flex-col gap-4">
          <section className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:p-5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-center text-slate-500">
                    {/* <th className="px-2 py-3 font-semibold">SL.No.</th> */}
                    <th className="px-2 py-3 font-semibold">Photo</th>
                    <th className="px-2 py-3 font-semibold">Name</th>
                    {/* <th className="px-2 py-3 font-semibold">Username</th>
                    <th className="px-2 py-3 font-semibold">Mobile</th>
                    <th className="px-2 py-3 font-semibold">Email</th>
                    <th className="px-2 py-3 font-semibold">DOB</th> */}
                    <th className="px-2 py-3 font-semibold">Guardian Name</th>
                    <th className="px-2 py-3 font-semibold">Present Class & Section</th>
                    {/* <th className="px-2 py-3 font-semibold">Section</th> */}
                    <th className="px-2 py-3 font-semibold">Contact</th>
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
                  {!isLoading && !errorMessage && students.length === 0 ? (
                    <tr className="border-b border-slate-100 text-sm text-slate-700">
                      <td className="px-2 py-3" colSpan={7}>
                        No student records found.
                      </td>
                    </tr>
                  ) : null}
                  {students.map((student, index) => (
                    <tr
                      key={student.id}
                      className="border-b border-slate-100 text-sm text-slate-700 text-center"
                    >
                      {/* <td className="px-2 py-3 font-medium text-slate-800">
                        {(currentPage - 1) * STUDENTS_PER_PAGE + index + 1}
                      </td> */}
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-center">
                          <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-sky-50">
                            {student.attachment_id &&
                            studentAttachmentPreviews[String(student.attachment_id)] ? (
                              <img
                                src={studentAttachmentPreviews[String(student.attachment_id)]}
                                alt={`${student.name || "Student"} profile`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-sky-100 text-sm font-semibold text-sky-700">
                                {getStudentInitials(student.name)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <span className="font-medium text-slate-800">
                          {student.name || "-"}
                        </span>
                      </td>
                      {/* <td className="px-2 py-3">{student.username || "-"}</td>
                      <td className="px-2 py-3">{renderWarningIfEmpty(student.mobile)}</td>
                      <td className="px-2 py-3">{renderWarningIfEmpty(student.email)}</td>
                      <td className="px-2 py-3">{formatDob(student.dob)}</td> */}
                      <td className="px-2 py-3">{student.guardian_name || "-"}</td>
                      <td className="px-2 py-3">{student.class_name || "-"}, {student.section_name || "-"}</td>
                      {/* <td className="px-2 py-3"></td> */}
                      <td className="px-2 py-3">
                        {hasMissingContact(student) ? (
                          renderWarningIfEmpty("")
                        ) : (
                          <>
                            {/* {student.mobile},&nbsp;{student.email} */}
                            <span
                              title="Missing value"
                              aria-label="Missing value"
                              className="inline-flex  items-center justify-center "
                            >
                              <FcApproval className="h-6 w-6"/>
                            </span>
                          </>
                        )}
                      </td>
                      {/* <td className="px-2 py-3">{student.address || "-"}</td>
                      <td className="px-2 py-3">{student.state || "-"}</td>
                      <td className="px-2 py-3">{student.city || "-"}</td>
                      <td className="px-2 py-3">{student.pin || "-"}</td>
                      <td className="px-2 py-3">{student.attachment_id ?? "-"}</td> */}
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          data-action-menu-trigger="true"
                          onClick={(event) => toggleActionMenu(event, student)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
                          aria-label="Student actions"
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
          <div className="shrink-0 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
            <p className="text-sm text-slate-600">
              Showing{" "}
              {students.length > 0 ? (currentPage - 1) * STUDENTS_PER_PAGE + 1 : 0}
              -
              {(currentPage - 1) * STUDENTS_PER_PAGE + students.length} of{" "}
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
                onClick={() => setCurrentPage((prev) => prev + 1)}
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
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
          </section>
        </div>
      </div>


      <StudentCreateDialog
        key={`${dialogMode}-${selectedStudent?.id || "new"}-${isCreateDialogOpen ? "open" : "closed"}`}
        open={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setSelectedStudent(null);
          setDialogMode("create");
        }}
        onCreate={handleSaveStudent}
        companyId={companyId}
        initialData={selectedStudent}
        mode={dialogMode}
      />

      <StudentAcademicRecordCreateDialog
        key={`student-academic-flow-${isAcademicRecordDialogOpen ? "open" : "closed"}-${academicDialogPrefilledStudentId || "new"}`}
        open={isAcademicRecordDialogOpen}
        onClose={() => {
          setIsAcademicRecordDialogOpen(false);
          setAcademicDialogPrefilledStudentId("");
          setAcademicDialogInitialData(null);
        }}
        onCreate={handleCreateStudentAcademicRecord}
        companyId={companyId}
        existingRecords={studentAcademicRecordOptions}
        studentOptions={academicStudentOptions}
        academicYearOptions={academicYearOptions}
        classOptions={classOptions}
        sectionOptions={sectionOptions}
        mode="create"
        initialStudentId={academicDialogPrefilledStudentId}
        createInitialData={academicDialogInitialData}
        redirectAfterSubmit={false}
      />

      <DialogStudentFeesCollection
        key={`student-fees-flow-${isFeesDialogOpen ? "open" : "closed"}-${feesDialogInitialData?.studentAcademicRecordId || "new"}`}
        open={isFeesDialogOpen}
        onClose={() => {
          setIsFeesDialogOpen(false);
          setFeesDialogInitialData(null);
          setRecentCreatedAcademicRecord(null);
        }}
        onCreate={handleCreateStudentFeesCollection}
        companyId={companyId}
        studentAcademicOptions={studentAcademicRecordOptions}
        feeStructureOptions={feeStructureOptions}
        mode="create"
        createInitialData={feesDialogInitialData}
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
                onClick={() => handleReview(activeMenu.studentItem)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Review
              </button>
              <button
                type="button"
                onClick={() => handleEdit(activeMenu.studentItem)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelist(activeMenu.studentItem)}
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
        itemLabel={delistTarget?.name || "this student"}
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
