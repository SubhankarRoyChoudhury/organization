"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Plus, X } from "lucide-react";
import {
  get_Hospital_User_Login_Details,
  getInsuaranceProviders,
  createInsuaranceProvider,
  updateInsuaranceProvider,
  delistInsuaranceProvider,
} from "@/app/api/apiService";

const INITIAL_FORM_STATE = {
  provider_name: "",
  plan_name: "",
  email: "",
  contact_number: "",
  status: "Active",
};

const sanitizeCompanyId = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const resolveCompanyId = (data) => {
  const direct = sanitizeCompanyId(data);
  if (direct) return direct;
  const candidates = [
    data?.company_id,
    data?.user?.company_id,
    data?.companies?.[0]?.company_id,
    data?.companies?.[0]?.id,
    data?.company?.id,
  ];
  for (const candidate of candidates) {
    const parsed = sanitizeCompanyId(candidate);
    if (parsed) return parsed;
  }
  if (Array.isArray(data?.companies)) {
    for (const company of data.companies) {
      const parsed = sanitizeCompanyId(company?.company_id ?? company?.id);
      if (parsed) return parsed;
    }
  }
  return null;
};

const parseApiError = (error, fallbackMessage) => {
  const responseData = error?.response?.data;
  if (typeof responseData?.detail === "string") return responseData.detail;
  if (typeof responseData?.error === "string") return responseData.error;
  if (typeof responseData?.errors === "string") return responseData.errors;

  const serializerErrors = responseData?.errors;
  if (Array.isArray(serializerErrors) && serializerErrors.length > 0) {
    return String(serializerErrors[0]);
  }
  if (serializerErrors && typeof serializerErrors === "object") {
    const firstError = Object.values(serializerErrors)[0];
    if (Array.isArray(firstError) && firstError.length > 0) {
      return String(firstError[0]);
    }
    if (typeof firstError === "string") {
      return firstError;
    }
  }

  return fallbackMessage;
};

export default function InsuaranceList() {
  const [companyId, setCompanyId] = useState(null);
  const [loggedInDetails, setLoggedInDetails] = useState(null);
  const [insuaranceList, setInsuaranceList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingInsuaranceId, setEditingInsuaranceId] = useState(null);
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [formError, setFormError] = useState("");
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [actionMenuRect, setActionMenuRect] = useState(null);
  const [actionMenuInsuarance, setActionMenuInsuarance] = useState(null);

  const closeActionMenu = () => {
    setOpenActionMenuId(null);
    setActionMenuRect(null);
    setActionMenuInsuarance(null);
  };

  const resolveActorName = () => {
    const fromDetails =
      loggedInDetails?.user?.name ||
      loggedInDetails?.user?.username ||
      loggedInDetails?.username;
    if (fromDetails) return fromDetails;
    if (typeof window !== "undefined") {
      return localStorage.getItem("username") || "unknown";
    }
    return "unknown";
  };

  const loadInsuaranceProviders = async (resolvedCompanyId) => {
    if (!resolvedCompanyId) {
      setInsuaranceList([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getInsuaranceProviders(resolvedCompanyId);
      setInsuaranceList(Array.isArray(data) ? data : []);
      setError(null);
    } catch (fetchError) {
      setInsuaranceList([]);
      setError(
        parseApiError(
          fetchError,
          "Unable to load insuarance providers right now.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const username =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (!username) {
      setIsLoading(false);
      setError("Missing login context.");
      return;
    }
    get_Hospital_User_Login_Details(username)
      .then((data) => {
        setLoggedInDetails(data);
        const resolvedCompanyId =
          resolveCompanyId(data) ||
          sanitizeCompanyId(
            typeof window !== "undefined"
              ? localStorage.getItem("company_id")
              : null,
          );
        if (resolvedCompanyId) {
          setCompanyId(resolvedCompanyId);
        } else {
          setIsLoading(false);
          setError("Unable to determine company context.");
        }
      })
      .catch(() => {
        setIsLoading(false);
        setError("Failed to load user information.");
      });
  }, []);

  useEffect(() => {
    if (!companyId) return;
    loadInsuaranceProviders(companyId);
  }, [companyId]);

  useEffect(() => {
    const handleDocumentPointerDown = (event) => {
      if (event.target.closest("[data-insuarance-menu]")) return;
      closeActionMenu();
    };
    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    return () => {
      document.removeEventListener(
        "pointerdown",
        handleDocumentPointerDown,
        true,
      );
    };
  }, []);

  const openModal = () => {
    setEditingInsuaranceId(null);
    setFormState(INITIAL_FORM_STATE);
    setFormError("");
    closeActionMenu();
    setIsModalOpen(true);
  };

  const openEditModal = (insuarance) => {
    setEditingInsuaranceId(insuarance.id);
    setFormState({
      provider_name: insuarance.provider_name || "",
      plan_name: insuarance.plan_name || "",
      email: insuarance.email || "",
      contact_number: insuarance.contact_number || "",
      status: insuarance.status || "Active",
    });
    setFormError("");
    closeActionMenu();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingInsuaranceId(null);
    setFormState(INITIAL_FORM_STATE);
    setFormError("");
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDelistInsuarance = async (insuarance) => {
    closeActionMenu();
    if (!companyId) {
      setError("Missing company context. Please refresh and try again.");
      return;
    }
    const confirmed = window.confirm(
      `Delist "${insuarance.provider_name}" insurance provider?`,
    );
    if (!confirmed) return;

    try {
      await delistInsuaranceProvider(
        insuarance.id,
        companyId,
        resolveActorName(),
      );
      setInsuaranceList((prev) => prev.filter((item) => item.id !== insuarance.id));
      setError(null);
    } catch (delistError) {
      setError(
        parseApiError(delistError, "Unable to delist insuarance provider."),
      );
    }
  };

  const toggleActionMenu = (event, insuarance) => {
    event.stopPropagation();
    if (openActionMenuId === insuarance.id) {
      closeActionMenu();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 128;
    const menuHeight = 84;
    const padding = 8;

    const left = Math.min(
      Math.max(padding, rect.right - menuWidth),
      window.innerWidth - menuWidth - padding,
    );
    let top = rect.bottom + 6;
    if (top + menuHeight > window.innerHeight - padding) {
      top = Math.max(padding, rect.top - menuHeight - 6);
    }

    setOpenActionMenuId(insuarance.id);
    setActionMenuInsuarance(insuarance);
    setActionMenuRect({ left, top, width: menuWidth });
  };

  const handleCreateInsuarance = async (event) => {
    event.preventDefault();

    if (!formState.provider_name.trim()) {
      setFormError("Provider name is required.");
      return;
    }

    if (!formState.plan_name.trim()) {
      setFormError("Plan name is required.");
      return;
    }

    if (!companyId) {
      setFormError("Missing company context. Please refresh and try again.");
      return;
    }

    const payload = {
      provider_name: formState.provider_name.trim(),
      plan_name: formState.plan_name.trim(),
      email: formState.email.trim(),
      contact_number: formState.contact_number.trim(),
      status: formState.status,
    };
    const actorName = resolveActorName();

    setIsSaving(true);
    setFormError("");
    try {
      if (editingInsuaranceId) {
        const updated = await updateInsuaranceProvider(
          editingInsuaranceId,
          {
            ...payload,
            updated_by: actorName,
          },
          companyId,
        );
        setInsuaranceList((prev) =>
          prev.map((item) => (item.id === editingInsuaranceId ? updated : item)),
        );
      } else {
        const created = await createInsuaranceProvider(
          {
            ...payload,
            created_by: actorName,
          },
          companyId,
        );
        setInsuaranceList((prev) => [created, ...prev]);
      }
      closeModal();
    } catch (saveError) {
      setFormError(
        parseApiError(saveError, "Unable to save insuarance provider."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f9fafc] to-[#eef3f9] p-6 pb-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold text-gray-900">
          Insuarance List
        </h1>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#5B5BF6] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-[#4338CA] hover:to-[#4F46E5]"
        >
          <Plus size={18} />
          Add Insuarance
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-gray-100 bg-white shadow-xl">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Loading insuarance providers...
          </div>
        ) : insuaranceList.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            No insuarance records available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    SL. No.
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Provider Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Plan Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Contact Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {insuaranceList.map((insuarance, index) => (
                  <tr key={insuarance.id} className="hover:bg-gray-50/80">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {insuarance.provider_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {insuarance.plan_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {insuarance.contact_number || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {insuarance.email || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          insuarance.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {insuarance.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={(event) => toggleActionMenu(event, insuarance)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-100"
                        aria-label="Insuarance actions"
                        data-insuarance-menu
                      >
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openActionMenuId &&
        actionMenuInsuarance &&
        actionMenuRect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="rounded-md border border-gray-200 bg-white py-1 shadow-lg"
            style={{
              position: "fixed",
              left: actionMenuRect.left,
              top: actionMenuRect.top,
              width: actionMenuRect.width,
              zIndex: 60,
            }}
            data-insuarance-menu
          >
            <button
              type="button"
              onClick={() => openEditModal(actionMenuInsuarance)}
              className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelistInsuarance(actionMenuInsuarance)}
              className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
            >
              Delist
            </button>
          </div>,
          document.body,
        )}

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingInsuaranceId
                    ? "Edit Insuarance"
                    : "Create Insuarance"}
                </h2>
                <p className="text-sm text-gray-500">
                  Add insuarance provider details.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleCreateInsuarance}
              className="space-y-5 px-6 py-6"
            >
              <div className="space-y-2">
                <label
                  htmlFor="provider_name"
                  className="text-sm font-medium text-gray-700"
                >
                  Provider Name
                </label>
                <input
                  id="provider_name"
                  name="provider_name"
                  type="text"
                  value={formState.provider_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Star Health"
                  autoFocus
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="plan_name"
                  className="text-sm font-medium text-gray-700"
                >
                  Plan Name
                </label>
                <input
                  id="plan_name"
                  name="plan_name"
                  type="text"
                  value={formState.plan_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Family Floater"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formState.email}
                  onChange={handleInputChange}
                  placeholder="e.g. contact@starhealth.com"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="contact_number"
                  className="text-sm font-medium text-gray-700"
                >
                  Contact Number
                </label>
                <input
                  id="contact_number"
                  name="contact_number"
                  type="text"
                  value={formState.contact_number}
                  onChange={handleInputChange}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="status"
                  className="text-sm font-medium text-gray-700"
                >
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formState.status}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {formError && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-xl bg-[#4F46E5] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-[#4338CA]"
                >
                  {isSaving
                    ? "Saving..."
                    : editingInsuaranceId
                      ? "Update Insuarance"
                      : "Create Insuarance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
