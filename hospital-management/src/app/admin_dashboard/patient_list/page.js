/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getPatients,
  get_Hospital_User_Login_Details,
  createPatientRecord,
  updatePatientRecord,
  delistPatientRecord,
} from "@/app/api/apiService";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function PatientListPage() {
  const [patients, setPatients] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const buildPatientFormState = () => ({
    name: "",
    gender: "",
    mobile: "",
    dateOfBirth: "",
    country: "",
    state: "",
    district: "",
    ps: "",
    address: "",
    pin: "",
    health_insurance_company: "",
    policy_no: "",
    policy_amount: "",
  });
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientForm, setPatientForm] = useState(() => buildPatientFormState());
  const [patientSubmitError, setPatientSubmitError] = useState(null);
  const [patientSubmitSuccess, setPatientSubmitSuccess] = useState(null);
  const [isPatientSubmitting, setIsPatientSubmitting] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [actionMenuId, setActionMenuId] = useState(null);
  const [actionMenuPatient, setActionMenuPatient] = useState(null);
  const [actionMenuRect, setActionMenuRect] = useState(null);
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loggedInDetails, setLoggedInDetails] = useState(null);
  const [insuranceOptions, setInsuranceOptions] = useState([]);
  const [isInsuranceOptionsLoading, setIsInsuranceOptionsLoading] =
    useState(false);
  const [insuranceOptionsError, setInsuranceOptionsError] = useState(null);
  const [isInsuranceDropdownOpen, setIsInsuranceDropdownOpen] =
    useState(false);
  const [insuranceHighlightIndex, setInsuranceHighlightIndex] = useState(-1);
  const [insuranceDropdownRect, setInsuranceDropdownRect] = useState(null);
  const [patientDialogPosition, setPatientDialogPosition] = useState({
    x: 0,
    y: 0,
  });
  const [isDraggingPatientDialog, setIsDraggingPatientDialog] =
    useState(false);
  const modalScrollRef = useRef(null);
  const insuranceInputWrapperRef = useRef(null);
  const patientDragStateRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const patientDialogBaseRectRef = useRef(null);
  const patientLimit = 10;
  const INSURANCE_FETCH_LIMIT = 200;

  useEffect(() => {
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (!username) {
      setError("Missing login context. Please sign in again to view patients.");
      setIsLoading(false);
      return;
    }
    fetchCompany(username);
  }, []);

  const fetchCompany = async (username) => {
    try {
      const data = await get_Hospital_User_Login_Details(username);
      setLoggedInDetails(data);
      const resolvedCompanyId =
        data?.company_id || data?.companies?.[0]?.company_id || localStorage.getItem("company_id");
      if (resolvedCompanyId) {
        setCompanyId(resolvedCompanyId);
        fetchPatients(resolvedCompanyId);
      } else {
        setError("Unable to determine your company. Please contact support.");
        setIsLoading(false);
      }
    } catch (companyError) {
      console.error("Failed to load user details:", companyError);
      setError("Unable to load your user details right now.");
      setIsLoading(false);
    }
  };

  const fetchPatients = async (company, search = "", page = 1) => {
    setIsLoading(true);
    try {
      const data = await getPatients(company, {
        search: search.trim(),
        limit: patientLimit,
        page,
        includeCount: true,
        includeIndex: true,
      });
      if (Array.isArray(data)) {
        setPatients(data);
        setTotalCount(data.length);
      } else {
        setPatients(Array.isArray(data?.results) ? data.results : []);
        setTotalCount(Number(data?.count) || 0);
      }
      setError(null);
    } catch (fetchError) {
      console.error("Failed to load patients:", fetchError);
      setError("Unable to load patients. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!companyId) return;
    const timeoutId = setTimeout(() => {
      fetchPatients(companyId, patientSearch, currentPage);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [patientSearch, companyId, currentPage]);

  useEffect(() => {
    const handleDocumentPointerDown = (event) => {
      if (event.target.closest("[data-action-menu]")) return;
      setActionMenuId(null);
      setActionMenuPatient(null);
      setActionMenuRect(null);
    };
    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    return () =>
      document.removeEventListener(
        "pointerdown",
        handleDocumentPointerDown,
        true,
      );
  }, []);

  useEffect(() => {
    if (!companyId) return;
    const fetchInsuranceCompanies = async () => {
      setIsInsuranceOptionsLoading(true);
      setInsuranceOptionsError(null);
      try {
        const firstPage = await getPatients(companyId, {
          limit: INSURANCE_FETCH_LIMIT,
          page: 1,
          includeCount: true,
        });
        const firstResults = Array.isArray(firstPage)
          ? firstPage
          : Array.isArray(firstPage?.results)
            ? firstPage.results
            : [];
        let allPatients = [...firstResults];
        const totalCount = Number(firstPage?.count) || 0;
        const totalPages =
          totalCount > 0
            ? Math.ceil(totalCount / INSURANCE_FETCH_LIMIT)
            : 1;
        if (!Array.isArray(firstPage) && totalPages > 1) {
          const pageRequests = [];
          for (let page = 2; page <= totalPages; page += 1) {
            pageRequests.push(
              getPatients(companyId, {
                limit: INSURANCE_FETCH_LIMIT,
                page,
              }),
            );
          }
          const pages = await Promise.all(pageRequests);
          pages.forEach((pageData) => {
            const pageResults = Array.isArray(pageData)
              ? pageData
              : Array.isArray(pageData?.results)
                ? pageData.results
                : [];
            if (pageResults.length) {
              allPatients = allPatients.concat(pageResults);
            }
          });
        }
        const uniqueCompanies = Array.from(
          new Set(
            allPatients
              .map((patient) => patient?.health_insurance_company?.trim())
              .filter(Boolean),
          ),
        ).sort((a, b) => a.localeCompare(b));
        setInsuranceOptions(uniqueCompanies);
      } catch (insuranceError) {
        console.error(
          "Failed to load insurance companies:",
          insuranceError,
        );
        setInsuranceOptions([]);
        setInsuranceOptionsError(
          "Unable to load insurance companies right now.",
        );
      } finally {
        setIsInsuranceOptionsLoading(false);
      }
    };
    fetchInsuranceCompanies();
  }, [companyId]);

  const clampPatientDialogPosition = useCallback((position) => {
    const dialog = modalScrollRef.current;
    if (!dialog || typeof window === "undefined") return position;
    const baseRect = patientDialogBaseRectRef.current;
    if (!baseRect) return position;
    const padding = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const minX = padding - baseRect.left;
    const maxX = viewportWidth - padding - baseRect.right;
    const minY = padding - baseRect.top;
    const maxY = viewportHeight - padding - baseRect.bottom;
    return {
      x: Math.min(maxX, Math.max(minX, position.x)),
      y: Math.min(maxY, Math.max(minY, position.y)),
    };
  }, []);

  useEffect(() => {
    if (!isPatientModalOpen) return;
    requestAnimationFrame(() => {
      if (modalScrollRef.current) {
        patientDialogBaseRectRef.current =
          modalScrollRef.current.getBoundingClientRect();
      }
      setPatientDialogPosition({ x: 0, y: 0 });
    });
  }, [isPatientModalOpen]);

  useEffect(() => {
    if (!isDraggingPatientDialog) return;
    const handleMouseMove = (event) => {
      const deltaX = event.clientX - patientDragStateRef.current.startX;
      const deltaY = event.clientY - patientDragStateRef.current.startY;
      setPatientDialogPosition(
        clampPatientDialogPosition({
          x: patientDragStateRef.current.originX + deltaX,
          y: patientDragStateRef.current.originY + deltaY,
        }),
      );
    };
    const handleMouseUp = () => {
      setIsDraggingPatientDialog(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [clampPatientDialogPosition, isDraggingPatientDialog]);

  useEffect(() => {
    if (!isPatientModalOpen) return;
    const handleResize = () => {
      if (modalScrollRef.current) {
        patientDialogBaseRectRef.current =
          modalScrollRef.current.getBoundingClientRect();
      }
      setPatientDialogPosition((prev) => clampPatientDialogPosition(prev));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPatientDialogPosition, isPatientModalOpen]);

  const handlePatientDialogDragStart = (event) => {
    event.preventDefault();
    patientDragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: patientDialogPosition.x,
      originY: patientDialogPosition.y,
    };
    setIsDraggingPatientDialog(true);
  };

  const handleActionSelect = (action, patient) => {
    setActionMenuId(null);
    setActionMenuPatient(null);
    setActionMenuRect(null);
    if (action === "edit") {
      const baseForm = buildPatientFormState();
      Object.keys(baseForm).forEach((key) => {
        if (patient && Object.prototype.hasOwnProperty.call(patient, key)) {
          const value = patient[key];
          baseForm[key] = value === null || value === undefined ? "" : value;
        }
      });
      setEditingPatientId(patient.id);
      setPatientForm(baseForm);
      openPatientModal();
      return;
    }
    if (action === "review") {
      const baseForm = buildPatientFormState();
      Object.keys(baseForm).forEach((key) => {
        if (patient && Object.prototype.hasOwnProperty.call(patient, key)) {
          const value = patient[key];
          baseForm[key] = value === null || value === undefined ? "" : value;
        }
      });
      setEditingPatientId(null);
      setIsReviewMode(true);
      setPatientForm(baseForm);
      setIsPatientModalOpen(true);
      return;
    }
    if (action === "delist") {
      if (!companyId) {
        setError("Missing company context. Please login again.");
        return;
      }
      const confirmDelist = window.confirm(
        `Delist ${patient.name || "this patient"}?`,
      );
      if (!confirmDelist) return;
      delistPatientRecord(patient.id, companyId)
        .then(() => fetchPatients(companyId, patientSearch, currentPage))
        .catch((delistError) => {
          console.error("Delist failed:", delistError);
          setError("Unable to delist patient. Please try again.");
        });
    }
  };

  const openActionMenu = (event, patient) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 144;
    const padding = 8;
    const left = Math.min(
      Math.max(padding, rect.right - menuWidth),
      window.innerWidth - menuWidth - padding,
    );
    const top = rect.bottom + 8;
    setActionMenuId((prev) => (prev === patient.id ? null : patient.id));
    setActionMenuPatient(patient);
    setActionMenuRect({ left, top, width: menuWidth });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [patientSearch]);

  const totalPages = Math.max(1, Math.ceil(totalCount / patientLimit));
  const safePage = Math.min(currentPage, totalPages);
  const startEntry = totalCount === 0 ? 0 : (safePage - 1) * patientLimit + 1;
  const endEntry = Math.min(safePage * patientLimit, totalCount);
  const pageNumbers =
    totalPages <= 5
      ? Array.from({ length: totalPages }, (_, index) => index + 1)
      : Array.from({ length: 5 }, (_, index) => {
          const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
          return start + index;
        });

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openPatientModal = () => {
    setIsReviewMode(false);
    setIsPatientModalOpen(true);
  };

  const closePatientModal = () => {
    if (isPatientSubmitting) return;
    setIsPatientModalOpen(false);
    setPatientForm(buildPatientFormState());
    setPatientSubmitError(null);
    setPatientSubmitSuccess(null);
    setEditingPatientId(null);
    setIsReviewMode(false);
  };

  const handlePatientFieldChange = (event) => {
    const { name, value } = event.target;
    setPatientForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const filteredInsuranceOptions = useMemo(() => {
    const query = patientForm.health_insurance_company?.trim().toLowerCase();
    return insuranceOptions
      .filter((option) => {
        if (!query) return true;
        return option.toLowerCase().includes(query);
      })
      .slice(0, 8);
  }, [insuranceOptions, patientForm.health_insurance_company]);

  const updateInsuranceDropdownRect = () => {
    const wrapper = insuranceInputWrapperRef.current;
    if (!wrapper) return;
    const input = wrapper.querySelector("input");
    if (!input) return;
    const rect = input.getBoundingClientRect();
    setInsuranceDropdownRect({
      left: rect.left,
      top: rect.bottom + 8,
      width: rect.width,
    });
  };

  const handleInsuranceInputChange = (event) => {
    const { value } = event.target;
    setPatientForm((prev) => ({
      ...prev,
      health_insurance_company: value,
    }));
    setInsuranceHighlightIndex(-1);
    setIsInsuranceDropdownOpen(true);
    updateInsuranceDropdownRect();
  };

  const handleInsuranceSelect = (value) => {
    setPatientForm((prev) => ({
      ...prev,
      health_insurance_company: value,
    }));
    setIsInsuranceDropdownOpen(false);
    setInsuranceHighlightIndex(-1);
  };

  const handleInsuranceKeyDown = (event) => {
    if (!isInsuranceDropdownOpen) return;
    if (!filteredInsuranceOptions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setInsuranceHighlightIndex((prev) =>
        prev < filteredInsuranceOptions.length - 1 ? prev + 1 : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setInsuranceHighlightIndex((prev) =>
        prev > 0 ? prev - 1 : filteredInsuranceOptions.length - 1,
      );
    } else if (event.key === "Enter") {
      if (insuranceHighlightIndex >= 0) {
        event.preventDefault();
        handleInsuranceSelect(
          filteredInsuranceOptions[insuranceHighlightIndex],
        );
      }
    } else if (event.key === "Escape") {
      setIsInsuranceDropdownOpen(false);
      setInsuranceHighlightIndex(-1);
    }
  };

  useEffect(() => {
    if (!isInsuranceDropdownOpen) return;
    updateInsuranceDropdownRect();
    const handleScroll = () => updateInsuranceDropdownRect();
    const handleResize = () => updateInsuranceDropdownRect();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    const modalNode = modalScrollRef.current;
    if (modalNode) {
      modalNode.addEventListener("scroll", handleScroll, { passive: true });
    }
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
      if (modalNode) {
        modalNode.removeEventListener("scroll", handleScroll);
      }
    };
  }, [isInsuranceDropdownOpen]);

  const handlePatientModalSubmit = async (event) => {
    event.preventDefault();
    if (isReviewMode) {
      closePatientModal();
      return;
    }
    if (!companyId) {
      setPatientSubmitError(
        "Missing company context. Please login again or refresh the page.",
      );
      return;
    }
    const trimmedName = patientForm.name?.trim();
    if (!trimmedName) {
      setPatientSubmitError("Patient name is required.");
      return;
    }
    if (!patientForm.gender) {
      setPatientSubmitError("Gender is required.");
      return;
    }
    const normalizedPatientForm = {
      ...patientForm,
      name: trimmedName,
      country: patientForm.country?.trim() || "India",
      mobile: patientForm.mobile?.trim(),
    };
    setPatientSubmitError(null);
    setPatientSubmitSuccess(null);
    setIsPatientSubmitting(true);
    try {
      if (editingPatientId) {
        await updatePatientRecord(
          editingPatientId,
          normalizedPatientForm,
          companyId,
        );
        setPatientSubmitSuccess("Patient updated successfully.");
      } else {
        await createPatientRecord(normalizedPatientForm, companyId);
        setPatientSubmitSuccess("Patient saved successfully.");
      }
      await fetchPatients(companyId);
      setTimeout(() => {
        closePatientModal();
      }, 800);
    } catch (patientError) {
      const apiError =
        patientError.response?.data?.errors ||
        patientError.response?.data?.error ||
        "Failed to save patient.";
      setPatientSubmitError(
        typeof apiError === "string" ? apiError : JSON.stringify(apiError),
      );
    } finally {
      setIsPatientSubmitting(false);
    }
  };

  const fieldClassNames =
    "w-full border border-gray-300 rounded-md px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-200 outline-none bg-white text-gray-900 placeholder-gray-500";

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#f9fafc] to-[#eef3f9]">
      <div className="w-full space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              Registered Patients
            </h1>
            <p className="text-sm text-gray-500">
              Listing of all patients stored in the hospital records.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={openPatientModal}
              className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition"
            >
              + Add New Patient
            </button>
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
                placeholder="Search Here..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="rounded-3xl border border-gray-100 bg-white shadow">
          {isLoading ? (
            <div className="p-10 text-center text-sm text-gray-500">
              Loading patients...
            </div>
          ) : patients.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">
              No patient records available yet.
            </div>
          ) : (
            <>
              <div className="max-h-[65vh] overflow-x-auto overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3  text-[12px] font-semibold uppercase tracking-wide text-gray-500 text-center">
                        #
                      </th>
                      <th className="px-4 py-3  text-[12px] font-semibold uppercase tracking-wide text-gray-500 text-center">
                        Patient ID
                      </th>
                      <th className="px-4 py-3  text-[12px] font-semibold uppercase tracking-wide text-gray-500 text-center">
                        Name
                      </th>
                      <th className="px-4 py-3  text-[12px] font-semibold uppercase tracking-wide text-gray-500 text-center">
                        Gender
                      </th>
                      <th className="px-4 py-3  text-[12px] font-semibold uppercase tracking-wide text-gray-500 text-center">
                        Mobile
                      </th>
                      <th className="px-4 py-3  text-[12px] font-semibold uppercase tracking-wide text-gray-500 text-center">
                        Age
                      </th>
                      <th className="px-4 py-3  text-[12px] font-semibold uppercase tracking-wide text-gray-500 text-center">
                        Address
                      </th>

                      <th className="px-4 py-3  text-[12px] font-semibold uppercase tracking-wide text-gray-500 text-center">
                        Health insurance company
                      </th>
                      <th className="px-4 py-3  text-[12px] font-semibold uppercase tracking-wide text-gray-500 text-center">
                        Policy No.
                      </th>
                      <th className="px-4 py-3  text-[12px] font-semibold uppercase tracking-wide text-gray-500 text-center">
                        Created On
                      </th>
                      <th className="px-4 py-3  text-[12px] font-semibold uppercase tracking-wide text-gray-500 text-center">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {patients.map((patient, index) => (
                      <tr key={patient.id} className="hover:bg-gray-50/70">
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">
                          {patient.serial_no ??
                            (currentPage - 1) * patientLimit + index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800 text-center">
                          {patient.patient_id || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800 text-center">
                          {patient.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800 text-center">
                          {patient.gender || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">
                          {patient.mobile || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">
                          {patient.dateOfBirth}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">
                          {[patient.address, patient.district, patient.state]
                            .filter(Boolean)
                            .join(", ") || "-"}
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-600 text-center">
                          {patient.health_insurance_company || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">
                          {patient.policy_no || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">
                          {formatDate(patient.created_on)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">
                          <div className="relative inline-flex">
                            <button
                              type="button"
                              onPointerDown={(event) =>
                                openActionMenu(event, patient)
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                              aria-label="Open actions"
                            >
                              ⋮
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalCount > 0 && (
                <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
                  <span>
                    Showing {startEntry} to {endEntry} out of {totalCount}{" "}
                    entries
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={safePage === 1}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-600 transition disabled:cursor-not-allowed disabled:text-gray-300"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-2">
                      {pageNumbers.map((page) => (
                        <button
                          key={`page-${page}`}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`h-8 w-8 rounded-full text-sm font-semibold transition ${
                            page === safePage
                              ? "bg-indigo-600 text-white"
                              : "text-gray-600 hover:bg-indigo-50"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={safePage === totalPages}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-600 transition disabled:cursor-not-allowed disabled:text-gray-300"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {actionMenuId &&
          actionMenuPatient &&
          actionMenuRect &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="rounded-lg border border-gray-200 bg-white shadow-lg"
              style={{
                position: "fixed",
                left: actionMenuRect.left,
                top: actionMenuRect.top,
                width: actionMenuRect.width,
                zIndex: 60,
              }}
              data-action-menu
            >
              <button
                type="button"
                onClick={() => handleActionSelect("edit", actionMenuPatient)}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleActionSelect("review", actionMenuPatient)}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Review
              </button>
              <button
                type="button"
                onClick={() => handleActionSelect("delist", actionMenuPatient)}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Delist
              </button>
            </div>,
            document.body,
          )}
      </div>
      {isPatientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:py-10 overflow-y-auto">
          <div
            className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
            onClick={closePatientModal}
            aria-hidden="true"
          />
          <div
            ref={modalScrollRef}
            className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
            style={{
              transform: `translate(${patientDialogPosition.x}px, ${patientDialogPosition.y}px)`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {isReviewMode
                    ? "Review Patient"
                    : editingPatientId
                      ? "Edit Patient"
                      : "Add New Patient"}
                </h2>
                <p className="text-sm text-gray-500">
                  Capture patient information for hospital records.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onMouseDown={handlePatientDialogDragStart}
                  className="cursor-grab rounded-full border border-gray-200 p-2 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  aria-label="Drag dialog"
                >
                  ⠿
                </button>
                <button
                  type="button"
                  onClick={closePatientModal}
                  className="rounded-full border border-gray-200 p-2 text-gray-500 hover:text-gray-700 hover:border-gray-300 disabled:opacity-50"
                  disabled={isPatientSubmitting}
                  aria-label="Close patient modal"
                >
                  ✕
                </button>
              </div>
            </div>
            <form onSubmit={handlePatientModalSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-medium text-gray-700">
                    Patient Name :<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={patientForm.name}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                    disabled={isReviewMode}
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-gray-700">
                    Gender :<span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={patientForm.gender}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                    disabled={isReviewMode}
                    required
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Mobile :</label>
                  <input
                    type="tel"
                    name="mobile"
                    value={patientForm.mobile}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                    disabled={isReviewMode}
                    placeholder="10 digit mobile no"
                  />
                </div>
                <div>
                  <label className="font-medium text-gray-700">
                    Age :<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="dateOfBirth"
                    value={patientForm.dateOfBirth}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                    disabled={isReviewMode}
                    placeholder="Enter Your Age"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-gray-700">Country :</label>
                  <input
                    type="text"
                    name="country"
                    value={patientForm.country || "India"}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                    disabled={isReviewMode}
                  />
                </div>
                <div>
                  <label className="font-medium text-gray-700">State :</label>
                  <input
                    type="text"
                    name="state"
                    value={patientForm.state}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                    disabled={isReviewMode}
                  />
                </div>
                <div>
                  <label className="font-medium text-gray-700">
                    District :
                  </label>
                  <input
                    type="text"
                    name="district"
                    value={patientForm.district}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                    disabled={isReviewMode}
                  />
                </div>
                <div>
                  <label className="font-medium text-gray-700">
                    Police Station :
                  </label>
                  <input
                    type="text"
                    name="ps"
                    value={patientForm.ps}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                    disabled={isReviewMode}
                  />
                </div>
                <div>
                  <label className="font-medium text-gray-700">PIN :</label>
                  <input
                    type="text"
                    name="pin"
                    value={patientForm.pin}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                    disabled={isReviewMode}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="font-medium text-gray-700">Address :</label>
                  <textarea
                    name="address"
                    value={patientForm.address}
                    onChange={handlePatientFieldChange}
                    className={`${fieldClassNames} min-h-[80px]`}
                    disabled={isReviewMode}
                  />
                </div>
                <div ref={insuranceInputWrapperRef}>
                  <label className="font-medium text-gray-700">
                    Health Insurance Company :
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="health_insurance_company"
                      value={patientForm.health_insurance_company}
                      onChange={handleInsuranceInputChange}
                      onFocus={() => {
                        setIsInsuranceDropdownOpen(true);
                        updateInsuranceDropdownRect();
                      }}
                      onBlur={() =>
                        setTimeout(() => setIsInsuranceDropdownOpen(false), 120)
                      }
                      onKeyDown={handleInsuranceKeyDown}
                      className={`${fieldClassNames} pr-10`}
                      disabled={isReviewMode}
                      placeholder={
                        isInsuranceOptionsLoading
                          ? "Loading insurance companies..."
                          : "Type or choose"
                      }
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      ▾
                    </span>
                    {isInsuranceDropdownOpen &&
                      insuranceDropdownRect &&
                      typeof document !== "undefined" &&
                      createPortal(
                        <div
                          className="rounded-xl border border-gray-200 bg-white shadow-2xl"
                          style={{
                            position: "fixed",
                            left: insuranceDropdownRect.left,
                            top: insuranceDropdownRect.top,
                            width: insuranceDropdownRect.width,
                            zIndex: 70,
                          }}
                        >
                          {filteredInsuranceOptions.length ? (
                            <ul className="max-h-48 overflow-auto py-1 text-sm text-gray-700">
                              {filteredInsuranceOptions.map(
                                (option, index) => (
                                  <li key={option} role="option">
                                    <div
                                      role="button"
                                      tabIndex={-1}
                                      title=""
                                      aria-label={option}
                                      onMouseDown={(event) =>
                                        event.preventDefault()
                                      }
                                      onClick={() =>
                                        handleInsuranceSelect(option)
                                      }
                                      className={`w-full cursor-pointer px-3 py-2 text-left transition ${
                                        index === insuranceHighlightIndex
                                          ? "bg-blue-50 text-blue-700"
                                          : "hover:bg-gray-50"
                                      }`}
                                    >
                                      {option}
                                    </div>
                                  </li>
                                ),
                              )}
                            </ul>
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              {isInsuranceOptionsLoading
                                ? "Loading..."
                                : "No matches found"}
                            </div>
                          )}
                        </div>,
                        document.body,
                      )}
                  </div>
                  {insuranceOptionsError && (
                    <p className="mt-1 text-xs text-red-500">
                      {insuranceOptionsError}
                    </p>
                  )}
                </div>
                <div>
                  <label className="font-medium text-gray-700">
                    Policy No :
                  </label>
                  <input
                    type="text"
                    name="policy_no"
                    value={patientForm.policy_no}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                    disabled={isReviewMode}
                  />
                </div>
                <div>
                  <label className="font-medium text-gray-700">
                    Policy Amount :
                  </label>
                  <input
                    type="number"
                    name="policy_amount"
                    value={patientForm.policy_amount}
                    onChange={handlePatientFieldChange}
                    className={fieldClassNames}
                    disabled={isReviewMode}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              {patientSubmitError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                  {patientSubmitError}
                </div>
              )}
              {patientSubmitSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                  {patientSubmitSuccess}
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                {!isReviewMode && (
                  <>
                    <button
                      type="button"
                      onClick={closePatientModal}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800 disabled:opacity-50"
                      disabled={isPatientSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      disabled={isPatientSubmitting}
                    >
                      {isPatientSubmitting
                        ? "Saving..."
                        : editingPatientId
                          ? "Update Patient"
                          : "Save Patient"}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
