"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ActionMenu from "@/components/ui/ActionMenu";
import {
  GripVertical,
  CheckCheck,
  XCircle,
  ChevronLeft,
} from "lucide-react";
import {
  get_Hospital_User_Login_Details,
  getApprovedDepartments,
  getInsuaranceProviders,
  getRateCharts,
  createRateChart,
  updateRateChart,
} from "@/app/api/apiService";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

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

const toISODate = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const startOfMonth = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const isSameDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const formatPickerDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
};

const normalizeCsvHeader = (header) =>
  String(header || "")
    .replace(/\uFEFF/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const parseCsvLine = (line) => {
  const columns = [];
  let current = "";
  let isInsideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      const nextChar = line[index + 1];
      if (isInsideQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        isInsideQuotes = !isInsideQuotes;
      }
      continue;
    }

    if (char === "," && !isInsideQuotes) {
      columns.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  columns.push(current.trim());
  return columns;
};

const parseRateChartCsv = (csvContent) => {
  const normalizedText = String(csvContent || "")
    .replace(/\uFEFF/g, "")
    .trim();

  if (!normalizedText) {
    return {
      rows: [],
      errors: ["The CSV file is empty."],
    };
  }

  const lines = normalizedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      rows: [],
      errors: ["The CSV file must include a header and at least one data row."],
    };
  }

  const headers = parseCsvLine(lines[0]).map(normalizeCsvHeader);
  const nameIndex = headers.findIndex(
    (header) => header === "name" || header.endsWith("name"),
  );
  const fixedAmountIndex = headers.findIndex(
    (header) => header === "fixedamount" || header === "amount",
  );

  if (nameIndex === -1 || fixedAmountIndex === -1) {
    return {
      rows: [],
      errors: ["CSV headers must include both Name and Fixed Amount columns."],
    };
  }

  const rows = [];
  const errors = [];

  lines.slice(1).forEach((line, rowOffset) => {
    const rowNumber = rowOffset + 2;
    const columns = parseCsvLine(line);
    const name = String(columns[nameIndex] || "").trim();
    const rawAmount = String(columns[fixedAmountIndex] || "").trim();
    const sanitizedAmount = rawAmount.replace(/,/g, "").replace(/[^\d.-]/g, "");
    const fixed_amount = Number(sanitizedAmount);

    if (!name && !rawAmount) {
      return;
    }
    if (!name) {
      errors.push(`Row ${rowNumber}: Name is required.`);
      return;
    }
    if (!rawAmount || Number.isNaN(fixed_amount)) {
      errors.push(`Row ${rowNumber}: Fixed Amount must be numeric.`);
      return;
    }
    if (fixed_amount <= 0) {
      errors.push(`Row ${rowNumber}: Fixed Amount must be greater than zero.`);
      return;
    }

    rows.push({ name, fixed_amount });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push("No valid rows were found in the CSV file.");
  }

  return { rows, errors };
};

export default function RateChart() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(null);
  const [rateCharts, setRateCharts] = useState([]);
  const [insuaranceProviderOptions, setInsuaranceProviderOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);
  const [activeNameIndex, setActiveNameIndex] = useState(-1);
  const [editingRateChartId, setEditingRateChartId] = useState(null);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState({
    insuarance_provider: "",
    department: "",
    name: "",
    fixed_amount: "",
    effective_from: "",
    is_active: true,
  });
  const [bulkUploadRows, setBulkUploadRows] = useState([]);
  const [bulkUploadFileName, setBulkUploadFileName] = useState("");
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [isEffectiveFromCalendarOpen, setIsEffectiveFromCalendarOpen] =
    useState(false);
  const [effectiveFromCalendarMonth, setEffectiveFromCalendarMonth] = useState(
    () => startOfMonth(new Date()),
  );
  const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 0 });
  const [isDraggingDialog, setIsDraggingDialog] = useState(false);
  const nameDropdownRef = useRef(null);
  const csvFileInputRef = useRef(null);
  const effectiveFromCalendarRef = useRef(null);
  const dialogRef = useRef(null);
  const dragStateRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const rateChartNameOptions = useMemo(() => {
    if (!formData.department) return [];
    const seen = new Set();
    const options = [];
    rateCharts.forEach((chart) => {
      if (String(chart.department) !== String(formData.department)) return;
      if (
        formData.insuarance_provider &&
        String(chart.insuarance_provider || "") !==
          String(formData.insuarance_provider)
      ) {
        return;
      }
      const name = String(chart.name || "").trim();
      if (!name || seen.has(name)) return;
      seen.add(name);
      options.push(name);
    });
    return options.sort((a, b) => a.localeCompare(b));
  }, [formData.department, formData.insuarance_provider, rateCharts]);

  const filteredRateChartNames = useMemo(() => {
    const query = String(formData.name || "")
      .trim()
      .toLowerCase();
    if (!query) return rateChartNameOptions;
    return rateChartNameOptions.filter((name) =>
      name.toLowerCase().includes(query),
    );
  }, [formData.name, rateChartNameOptions]);

  const totalItems = rateCharts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pagedRateCharts = rateCharts.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        nameDropdownRef.current &&
        !nameDropdownRef.current.contains(event.target)
      ) {
        setIsNameDropdownOpen(false);
        setActiveNameIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (!username) return;
    get_Hospital_User_Login_Details(username)
      .then((data) => {
        const resolvedCompanyId =
          data?.company_id || data?.companies?.[0]?.company_id;
        if (resolvedCompanyId) {
          setCompanyId(resolvedCompanyId);
        } else {
          setFormError("Unable to determine company context.");
        }
      })
      .catch(() => setFormError("Failed to load user information."));
  }, []);

  useEffect(() => {
    if (!companyId) return;
    fetchInsuaranceProviders(companyId);
    fetchDepartments(companyId);
    fetchRateCharts(companyId);
  }, [companyId]);

  const fetchInsuaranceProviders = async (company_id) => {
    try {
      const data = await getInsuaranceProviders(company_id, {
        activeOnly: true,
      });
      setInsuaranceProviderOptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load insuarance providers:", error);
      setInsuaranceProviderOptions([]);
      setFormError("Unable to load insuarance providers.");
    }
  };

  const fetchDepartments = async (company_id) => {
    try {
      const data = await getApprovedDepartments(company_id);
      setDepartmentOptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load departments:", error);
      setDepartmentOptions([]);
      setFormError("Unable to load departments.");
    }
  };

  const fetchRateCharts = async (company_id) => {
    try {
      const data = await getRateCharts(company_id);
      setRateCharts(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (error) {
      console.error("Failed to load rate charts:", error);
      setRateCharts([]);
      setFormError("Unable to load rate charts.");
    }
  };

  const resetBulkUpload = useCallback(() => {
    setBulkUploadRows([]);
    setBulkUploadFileName("");
    setBulkUploadFile(null);
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = "";
    }
  }, []);

  const isBulkUploadMode =
    !editingRateChartId &&
    (bulkUploadRows.length > 0 || Boolean(bulkUploadFile));

  const handleOpenModal = () => {
    setEditingRateChartId(null);
    setIsModalOpen(true);
    setDialogPosition({ x: 0, y: 0 });
    setFormError("");
    setIsEffectiveFromCalendarOpen(false);
    setEffectiveFromCalendarMonth(startOfMonth(new Date()));
    resetBulkUpload();
  };

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setIsNameDropdownOpen(false);
    setActiveNameIndex(-1);
    setIsEffectiveFromCalendarOpen(false);
    setEditingRateChartId(null);
    setDialogPosition({ x: 0, y: 0 });
    resetBulkUpload();
    setFormData({
      insuarance_provider: "",
      department: "",
      name: "",
      fixed_amount: "",
      effective_from: "",
      is_active: true,
    });
    setFormError("");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    if (name === "insuarance_provider") {
      setIsNameDropdownOpen(false);
      setActiveNameIndex(-1);
      resetBulkUpload();
      setFormData((prev) => ({
        ...prev,
        insuarance_provider: value,
        department: "",
        name: "",
        fixed_amount: "",
      }));
      return;
    }
    if (name === "department") {
      setIsNameDropdownOpen(false);
      setActiveNameIndex(-1);
      resetBulkUpload();
      setFormData((prev) => ({
        ...prev,
        department: value,
        name: "",
        fixed_amount: "",
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "name") {
      setIsNameDropdownOpen(true);
      setActiveNameIndex(0);
    }
  };

  const handleEdit = (entry) => {
    setEditingRateChartId(entry.id);
    setIsModalOpen(true);
    setDialogPosition({ x: 0, y: 0 });
    setFormError("");
    setIsEffectiveFromCalendarOpen(false);
    setEffectiveFromCalendarMonth(
      startOfMonth(entry.effective_from || new Date()),
    );
    resetBulkUpload();
    setFormData({
      insuarance_provider: entry.insuarance_provider
        ? String(entry.insuarance_provider)
        : "",
      department: entry.department ? String(entry.department) : "",
      name: entry.name || "",
      fixed_amount:
        entry.fixed_amount !== null && entry.fixed_amount !== undefined
          ? String(entry.fixed_amount)
          : "",
      effective_from: entry.effective_from || "",
      is_active: Boolean(entry.is_active),
    });
  };

  const clampDialogPosition = useCallback((position) => {
    const dialog = dialogRef.current;
    if (!dialog || typeof window === "undefined") return position;
    const padding = 2;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dialogWidth = dialog.offsetWidth;
    const dialogHeight = dialog.offsetHeight;
    const maxX = Math.max(0, (viewportWidth - dialogWidth) / 2 - padding);
    const maxY = Math.max(0, (viewportHeight - dialogHeight) / 2 - padding);
    return {
      x: Math.min(maxX, Math.max(-maxX, position.x)),
      y: Math.min(maxY, Math.max(-maxY, position.y)),
    };
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    setDialogPosition({ x: 0, y: 0 });
  }, [isModalOpen]);

  useEffect(() => {
    if (!isEffectiveFromCalendarOpen) return;
    const handleOutsideClick = (event) => {
      if (
        effectiveFromCalendarRef.current &&
        !effectiveFromCalendarRef.current.contains(event.target)
      ) {
        setIsEffectiveFromCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isEffectiveFromCalendarOpen]);

  useEffect(() => {
    if (!isDraggingDialog) return;
    const handleMouseMove = (event) => {
      const deltaX = event.clientX - dragStateRef.current.startX;
      const deltaY = event.clientY - dragStateRef.current.startY;
      setDialogPosition(
        clampDialogPosition({
          x: dragStateRef.current.originX + deltaX,
          y: dragStateRef.current.originY + deltaY,
        }),
      );
    };
    const handleMouseUp = () => {
      setIsDraggingDialog(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [clampDialogPosition, isDraggingDialog]);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleResize = () => {
      setDialogPosition((prev) => clampDialogPosition(prev));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampDialogPosition, isModalOpen]);

  const handleDialogDragStart = (event) => {
    event.preventDefault();
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: dialogPosition.x,
      originY: dialogPosition.y,
    };
    setIsDraggingDialog(true);
  };

  const handleBulkFileChange = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      resetBulkUpload();
      return;
    }

    const lowerFileName = selectedFile.name.toLowerCase();
    const isCsvFile = lowerFileName.endsWith(".csv");
    const isXlsxFile = lowerFileName.endsWith(".xlsx");

    if (!isCsvFile && !isXlsxFile) {
      resetBulkUpload();
      setFormError("Please select a valid CSV or XLSX file.");
      return;
    }

    setBulkUploadFile(selectedFile);
    setBulkUploadFileName(selectedFile.name);
    setBulkUploadRows([]);
    setFormError("");

    if (!isCsvFile) {
      setFormData((prev) => ({
        ...prev,
        name: "",
        fixed_amount: "",
      }));
      return;
    }

    setIsParsingCsv(true);
    try {
      const fileContents = await selectedFile.text();
      const { rows, errors } = parseRateChartCsv(fileContents);
      if (errors.length > 0) {
        setBulkUploadRows([]);
        setBulkUploadFileName("");
        setBulkUploadFile(null);
        if (csvFileInputRef.current) {
          csvFileInputRef.current.value = "";
        }
        const [firstError, ...restErrors] = errors;
        setFormError(
          restErrors.length
            ? `${firstError} (+${restErrors.length} more issue${
                restErrors.length > 1 ? "s" : ""
              })`
            : firstError,
        );
        return;
      }

      setBulkUploadRows(rows);
      setFormData((prev) => ({
        ...prev,
        name: "",
        fixed_amount: "",
      }));
    } catch (error) {
      console.error("Failed to parse CSV file:", error);
      resetBulkUpload();
      setFormError("Unable to read this CSV file.");
    } finally {
      setIsParsingCsv(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!formData.insuarance_provider) {
      setFormError("Please select an insuarance provider.");
      return;
    }
    if (!formData.department) {
      setFormError("Please select a department.");
      return;
    }
    if (isBulkUploadMode) {
      if (!formData.effective_from) {
        setFormError("Please select an effective from date for bulk upload.");
        return;
      }
      if (bulkUploadRows.length === 0 && !bulkUploadFile) {
        setFormError("Please upload a valid CSV or XLSX file.");
        return;
      }
    } else {
      if (!formData.name.trim()) {
        setFormError("Please enter a rate chart name.");
        return;
      }
      if (formData.fixed_amount && Number(formData.fixed_amount) <= 0) {
        setFormError("Fixed amount must be greater than zero.");
        return;
      }
    }

    setFormError("");
    setIsSaving(true);
    try {
      if (editingRateChartId) {
        const payload = {
          insuarance_provider: Number(formData.insuarance_provider),
          department: Number(formData.department),
          name: formData.name.trim(),
          status: formData.is_active ? "Active" : "Inactive",
          is_active: Boolean(formData.is_active),
        };
        if (formData.fixed_amount) {
          payload.fixed_amount = Number(formData.fixed_amount);
        }
        if (formData.effective_from) {
          payload.effective_from = formData.effective_from;
        }
        const updated = await updateRateChart(
          editingRateChartId,
          payload,
          companyId,
        );
        setRateCharts((prev) =>
          prev.map((item) =>
            item.id === editingRateChartId ? { ...item, ...updated } : item,
          ),
        );
      } else {
        if (isBulkUploadMode) {
          let payload;
          if (bulkUploadRows.length > 0) {
            payload = {
              insuarance_provider: Number(formData.insuarance_provider),
              department: Number(formData.department),
              effective_from: formData.effective_from,
              status: formData.is_active ? "Active" : "Inactive",
              is_active: Boolean(formData.is_active),
              items: bulkUploadRows.map((row) => ({
                name: row.name,
                fixed_amount: Number(row.fixed_amount),
              })),
            };
          } else if (bulkUploadFile) {
            payload = new FormData();
            payload.append(
              "insuarance_provider",
              String(formData.insuarance_provider),
            );
            payload.append("department", String(formData.department));
            payload.append("effective_from", formData.effective_from);
            payload.append(
              "status",
              formData.is_active ? "Active" : "Inactive",
            );
            payload.append("is_active", String(Boolean(formData.is_active)));
            payload.append("bulk_file", bulkUploadFile);
          } else {
            setFormError("Please upload a valid CSV or XLSX file.");
            setIsSaving(false);
            return;
          }

          const created = await createRateChart(payload, companyId);
          const createdEntries = Array.isArray(created)
            ? created
            : Array.isArray(created?.entries)
              ? created.entries
              : [];
          if (createdEntries.length > 0) {
            setRateCharts((prev) => [...createdEntries, ...prev]);
          } else {
            await fetchRateCharts(companyId);
          }
        } else {
          const payload = {
            insuarance_provider: Number(formData.insuarance_provider),
            department: Number(formData.department),
            name: formData.name.trim(),
            status: formData.is_active ? "Active" : "Inactive",
            is_active: Boolean(formData.is_active),
          };
          if (formData.fixed_amount) {
            payload.fixed_amount = Number(formData.fixed_amount);
          }
          if (formData.effective_from) {
            payload.effective_from = formData.effective_from;
          }
          const created = await createRateChart(payload, companyId);
          setRateCharts((prev) => [created, ...prev]);
        }
      }
      handleCloseModal();
    } catch (error) {
      const errors = error.response?.data?.errors;
      let message = "Unable to save rate chart.";
      if (typeof errors === "string") {
        message = errors;
      } else if (Array.isArray(errors) && errors.length > 0) {
        message = String(errors[0]);
      } else if (errors && typeof errors === "object") {
        const firstError = Object.values(errors)[0];
        if (Array.isArray(firstError) && firstError.length > 0) {
          message = String(firstError[0]);
        } else if (typeof firstError === "string") {
          message = firstError;
        }
      } else if (error.response?.data?.detail) {
        message = error.response.data.detail;
      }
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="min-h-screen bg-slate-50 p-6 pb-12 sm:pb-16">
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="mt-1 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Rate Chart</h1>
              <p className="text-sm text-slate-500">
                Manage fixed charges by department with effective dates.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenModal}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
          >
            Add Rate
          </button>
        </header>

        <div className="rounded-2xl bg-white shadow-sm">
          {rateCharts.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">
              No rate chart entries available.
            </p>
          ) : (
            <div className="overflow-x-auto overflow-y-visible">
              <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
                <thead className="sticky top-0 z-10 bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">SL No.</th>
                    <th className="px-4 py-3 text-left">Insuarance Provider</th>
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Fixed Amount</th>
                    <th className="px-4 py-3 text-left">Effective From</th>
                    {/* <th className="px-4 py-3 text-left">Effective To</th> */}
                    {/* <th className="px-4 py-3 text-left">Status</th> */}
                    <th className="px-4 py-3 text-left">Active</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedRateCharts.map((entry, index) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{startIndex + index + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {entry.insuarance_provider_name || "-"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {entry.department_name || "-"}
                      </td>
                      <td className="px-4 py-3">{entry.name || "-"}</td>
                      <td className="px-4 py-3">
                        {entry.fixed_amount !== null &&
                        entry.fixed_amount !== undefined
                          ? formatCurrency(Number(entry.fixed_amount) || 0)
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {formatDate(entry.effective_from)}
                      </td>
                      {/* <td className="px-4 py-3">
                        {formatDate(entry.effective_to)}
                      </td> */}
                      {/* <td className="px-4 py-3">{entry.status || "-"}</td> */}
                      <td className="px-4 py-3">
                        {entry.is_active ? (
                          <CheckCheck
                            size={18}
                            className="text-emerald-600"
                            aria-label="Active"
                          />
                        ) : (
                          <XCircle
                            size={18}
                            className="text-red-500"
                            aria-label="Inactive"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ActionMenu
                          buttonLabel="Rate chart actions"
                          items={[
                            {
                              label: "Edit",
                              onClick: () => handleEdit(entry),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {rateCharts.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
            <span>
              Showing {Math.min(startIndex + 1, totalItems)} to{" "}
              {Math.min(endIndex, totalItems)} of {totalItems} entries
            </span>
            <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safeCurrentPage === 1}
                className="shrink-0 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, index) => {
                const page = index + 1;
                const isActive = page === safeCurrentPage;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[34px] shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={safeCurrentPage === totalPages}
                className="shrink-0 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center sm:p-6">
          <div
            ref={dialogRef}
            className="w-full max-w-5xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6 lg:p-8"
            style={{
              transform: `translate(${dialogPosition.x}px, ${dialogPosition.y}px)`,
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingRateChartId ? "Edit Rate Chart" : "Add Rate Chart"}
                </h2>
                <p className="text-sm text-slate-500">
                  {editingRateChartId
                    ? "Update the selected rate chart details."
                    : "Create a new department rate entry."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onMouseDown={handleDialogDragStart}
                  className="cursor-grab rounded-full border border-slate-200 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
                  aria-label="Drag dialog"
                >
                  <GripVertical size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  disabled={isSaving}
                  aria-label="Close"
                >
                  <span className="text-lg">&times;</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-slate-600">
                  Insuarance Provider
                  <select
                    name="insuarance_provider"
                    value={formData.insuarance_provider}
                    onChange={handleFormChange}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                    required
                  >
                    <option value="">Select insuarance provider</option>
                    {insuaranceProviderOptions.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.provider_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-slate-600">
                  Department
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleFormChange}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                    required
                    disabled={!formData.insuarance_provider}
                  >
                    <option value="">
                      {formData.insuarance_provider
                        ? "Select department"
                        : "Select insuarance provider first"}
                    </option>
                    {departmentOptions.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>

                {!editingRateChartId && (
                  <label className="flex flex-col gap-1 text-slate-600">
                    Upload CSV/XLSX (Optional)
                    <input
                      ref={csvFileInputRef}
                      type="file"
                      accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={handleBulkFileChange}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus:border-slate-400 focus:outline-none"
                      disabled={
                        !formData.department || isSaving || isParsingCsv
                      }
                    />
                    <span className="text-xs text-slate-500">
                      CSV/XLSX must include Name and Fixed Amount columns.
                    </span>
                    {bulkUploadFileName && (
                      <div className="mt-1 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                        <span>
                          {bulkUploadFileName}
                          {bulkUploadRows.length > 0
                            ? ` (${bulkUploadRows.length} rows ready)`
                            : " (ready for upload)"}
                        </span>
                        <button
                          type="button"
                          onClick={resetBulkUpload}
                          className="font-medium text-emerald-700 underline underline-offset-2"
                          disabled={isSaving}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </label>
                )}

                <label
                  className="flex flex-col gap-1 text-slate-600"
                  ref={nameDropdownRef}
                >
                  Name
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    onFocus={() => {
                      if (isBulkUploadMode) return;
                      setIsNameDropdownOpen(true);
                      setActiveNameIndex(0);
                    }}
                    onKeyDown={(event) => {
                      if (isBulkUploadMode) return;
                      if (!isNameDropdownOpen) return;
                      if (!filteredRateChartNames.length) return;
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setActiveNameIndex((prev) =>
                          prev < filteredRateChartNames.length - 1
                            ? prev + 1
                            : 0,
                        );
                      } else if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setActiveNameIndex((prev) =>
                          prev > 0
                            ? prev - 1
                            : filteredRateChartNames.length - 1,
                        );
                      } else if (event.key === "Enter") {
                        event.preventDefault();
                        const selected =
                          filteredRateChartNames[activeNameIndex];
                        if (selected) {
                          setFormData((prev) => ({
                            ...prev,
                            name: selected,
                          }));
                          setIsNameDropdownOpen(false);
                          setActiveNameIndex(-1);
                        }
                      } else if (event.key === "Escape") {
                        setIsNameDropdownOpen(false);
                        setActiveNameIndex(-1);
                      }
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                    placeholder={
                      isBulkUploadMode
                        ? "Value comes from uploaded file"
                        : formData.department
                          ? "Type or select a name"
                          : "Select department first"
                    }
                    required={!isBulkUploadMode}
                    disabled={!formData.department || isBulkUploadMode}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {isNameDropdownOpen &&
                    formData.department &&
                    !isBulkUploadMode &&
                    rateChartNameOptions.length > 0 && (
                      <div className="relative">
                        <div className="absolute z-20 mt-2 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                          {filteredRateChartNames.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-slate-500">
                              No matches found.
                            </div>
                          ) : (
                            filteredRateChartNames.map((name, index) => (
                              <button
                                type="button"
                                key={name}
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    name,
                                  }));
                                  setIsNameDropdownOpen(false);
                                  setActiveNameIndex(-1);
                                }}
                                className={`block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 ${
                                  index === activeNameIndex
                                    ? "bg-slate-100"
                                    : ""
                                }`}
                              >
                                {name}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                </label>

                <label className="flex flex-col gap-1 text-slate-600">
                  Fixed Amount
                  <input
                    type="number"
                    name="fixed_amount"
                    value={formData.fixed_amount}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                    placeholder={
                      isBulkUploadMode
                        ? "Amount comes from uploaded file"
                        : "Enter amount"
                    }
                    disabled={isBulkUploadMode}
                  />
                </label>

                <label className="flex flex-col gap-1 text-slate-600">
                  Effective From
                  <div className="relative" ref={effectiveFromCalendarRef}>
                    <button
                      type="button"
                      onClick={() => {
                        const baseDate = formData.effective_from
                          ? new Date(formData.effective_from)
                          : new Date();
                        setEffectiveFromCalendarMonth(startOfMonth(baseDate));
                        setIsEffectiveFromCalendarOpen((prev) => !prev);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-11 text-left text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      {formatPickerDate(formData.effective_from) ||
                        "Select effective from date"}
                    </button>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-400 shadow-sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                    </span>
                    {isEffectiveFromCalendarOpen && (
                      <div className="absolute z-30 mt-2 w-full min-w-[280px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
                        <div className="flex items-center justify-between px-1 pb-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEffectiveFromCalendarMonth(
                                new Date(
                                  effectiveFromCalendarMonth.getFullYear(),
                                  effectiveFromCalendarMonth.getMonth() - 1,
                                  1,
                                ),
                              )
                            }
                            className="rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
                          >
                            ← Prev
                          </button>
                          <div className="text-sm font-semibold text-slate-900">
                            {effectiveFromCalendarMonth.toLocaleString(
                              undefined,
                              {
                                month: "long",
                              },
                            )}{" "}
                            <span className="text-slate-400">
                              {effectiveFromCalendarMonth.getFullYear()}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setEffectiveFromCalendarMonth(
                                new Date(
                                  effectiveFromCalendarMonth.getFullYear(),
                                  effectiveFromCalendarMonth.getMonth() + 1,
                                  1,
                                ),
                              )
                            }
                            className="rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
                          >
                            Next →
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-slate-400">
                          {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(
                            (day) => (
                              <div key={day}>{day}</div>
                            ),
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-7 gap-2 text-center">
                          {(() => {
                            const year = effectiveFromCalendarMonth.getFullYear();
                            const month = effectiveFromCalendarMonth.getMonth();
                            const firstDay = new Date(year, month, 1);
                            const startOffset = firstDay.getDay();
                            const daysInMonth = new Date(
                              year,
                              month + 1,
                              0,
                            ).getDate();
                            const cells = [];
                            for (let i = 0; i < startOffset; i += 1) {
                              cells.push(
                                <div key={`blank-${i}`} className="h-8" />,
                              );
                            }
                            for (let day = 1; day <= daysInMonth; day += 1) {
                              const date = new Date(year, month, day);
                              const isSelected =
                                formData.effective_from &&
                                isSameDay(date, new Date(formData.effective_from));
                              const isToday = isSameDay(date, new Date());
                              cells.push(
                                <button
                                  key={`day-${day}`}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      effective_from: toISODate(date),
                                    }));
                                    setIsEffectiveFromCalendarOpen(false);
                                  }}
                                  className={`h-8 w-8 rounded-full text-xs font-semibold transition ${
                                    isSelected
                                      ? "bg-emerald-400 text-emerald-950"
                                      : "text-slate-600 hover:bg-slate-100"
                                  } ${
                                    isToday && !isSelected
                                      ? "border border-emerald-200"
                                      : ""
                                  }`}
                                >
                                  {day}
                                </button>,
                              );
                            }
                            return cells;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    type="hidden"
                    value={formData.effective_from}
                    required={isBulkUploadMode}
                  />
                </label>

                <label className="flex flex-col gap-1 text-slate-600">
                  Active
                  <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={Boolean(formData.is_active)}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          is_active: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                    Mark as active
                  </label>
                </label>
              </div>

              {formError && (
                <p className="text-sm font-medium text-red-500">{formError}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : editingRateChartId
                      ? "Update Rate"
                      : isBulkUploadMode
                        ? bulkUploadRows.length > 0
                          ? `Save ${bulkUploadRows.length} Rates`
                          : "Save Bulk Rates"
                        : "Save Rate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
