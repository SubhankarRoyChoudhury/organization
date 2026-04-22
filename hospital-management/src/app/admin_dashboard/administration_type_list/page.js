"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Check } from "lucide-react";
import ActionMenu from "@/components/ui/ActionMenu";
import {
  getAllAdministratorType,
  createAdministrationType,
  updateAdministrationType,
  deleteAdministrationType,
  get_Hospital_User_Login_Details,
} from "@/app/api/apiService";

export default function AdministrationTypeList() {
  const [administrationTypes, setAdministrationTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rowError, setRowError] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formState, setFormState] = useState({
    name: "",
    isApprove: true,
  });
  const [editingAdministrationTypeId, setEditingAdministrationTypeId] =
    useState(null);
  const [editingForm, setEditingForm] = useState({
    name: "",
    isApprove: false,
  });
  const [rowLoadingId, setRowLoadingId] = useState(null);

  const [loggedInDetails, setLoggedInDetails] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const sanitizeCompanyId = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const num = Number(value);
    if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
      return null;
    }
    return num;
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

  const resolvedCompanyId = resolveCompanyId(loggedInDetails);

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (username) fetchUserDetails(username);
  }, []);

  const fetchUserDetails = async (username) => {
    try {
      const data = await get_Hospital_User_Login_Details(username);
      setLoggedInDetails(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching user:", err);
      setError("Failed to fetch user details.");
    }
  };

  const fetchAdministrationTypes = useCallback(async (company_id) => {
    setIsLoading(true);
    try {
      const data = await getAllAdministratorType(company_id);
      setAdministrationTypes(Array.isArray(data) ? data : []);
      setError(null);
    } catch (fetchError) {
      setError(
        "Unable to load administration types right now. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (resolvedCompanyId) {
      fetchAdministrationTypes(resolvedCompanyId);
    }
  }, [resolvedCompanyId, fetchAdministrationTypes]);

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const closeDialog = () => {
    if (isSubmitting) return;
    setIsDialogOpen(false);
    setFormError(null);
    setFormState({ name: "", isApprove: true });
  };

  const startEditing = (administrationType) => {
    setEditingAdministrationTypeId(administrationType.id);
    setEditingForm({
      name: administrationType.name || "",
      isApprove: Boolean(administrationType.is_approve),
    });
    setRowError(null);
  };

  const cancelEditing = () => {
    setEditingAdministrationTypeId(null);
    setEditingForm({ name: "", isApprove: false });
    setRowError(null);
  };

  const handleSaveAdministrationType = async (administrationTypeId) => {
    if (!editingForm.name.trim()) {
      setRowError("Administration type name cannot be empty.");
      return;
    }

    const companyId =
      resolvedCompanyId ||
      sanitizeCompanyId(localStorage.getItem("company_id"));
    if (!companyId) {
      setRowError("Missing company context. Please refresh and try again.");
      return;
    }

    setRowLoadingId(administrationTypeId);
    try {
      await updateAdministrationType(
        administrationTypeId,
        {
          name: editingForm.name.trim(),
          is_approve: editingForm.isApprove,
        },
        companyId,
      );
      await fetchAdministrationTypes(companyId);
      cancelEditing();
    } catch (updateError) {
      const apiError =
        updateError.response?.data?.errors?.name?.[0] ||
        updateError.response?.data?.error ||
        "Failed to update administration type.";
      setRowError(apiError);
    } finally {
      setRowLoadingId(null);
    }
  };

  const handleDeleteAdministrationType = async (administrationTypeId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this administration type?",
    );
    if (!confirmDelete) return;

    const companyId =
      resolvedCompanyId ||
      sanitizeCompanyId(localStorage.getItem("company_id"));
    if (!companyId) {
      setRowError("Missing company context. Please refresh and try again.");
      return;
    }

    setRowLoadingId(administrationTypeId);
    try {
      await deleteAdministrationType(administrationTypeId, companyId);
      setAdministrationTypes((prev) =>
        prev.filter(
          (administrationType) =>
            administrationType.id !== administrationTypeId,
        ),
      );
      if (editingAdministrationTypeId === administrationTypeId) {
        cancelEditing();
      }
      setRowError(null);
    } catch (deleteError) {
      const apiError =
        deleteError.response?.data?.error ||
        "Failed to delete administration type. Please try again.";
      setRowError(apiError);
    } finally {
      setRowLoadingId(null);
    }
  };

  const handleCreateAdministrationType = async (event) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      setFormError("Administration type name is required.");
      return;
    }

    const companyId =
      resolvedCompanyId ||
      sanitizeCompanyId(localStorage.getItem("company_id"));
    if (!companyId) {
      setFormError("Missing company context. Please refresh and try again.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const createdBy =
        loggedInDetails?.user?.name ||
        loggedInDetails?.user?.username ||
        loggedInDetails?.username ||
        "unknown";
      await createAdministrationType(
        {
          name: formState.name.trim(),
          is_approve: formState.isApprove,
          created_by: createdBy,
        },
        companyId,
      );
      closeDialog();
      fetchAdministrationTypes(companyId);
    } catch (creationError) {
      const apiError =
        creationError.response?.data?.errors?.name?.[0] ||
        creationError.response?.data?.error?.[0] ||
        "Could not create administration type. Please try again.";
      setFormError(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatus = (isApprove) => {
    const approved = Boolean(isApprove);
    const baseClasses =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    return approved ? (
      <span className={`${baseClasses} bg-green-100 text-green-800`}>
        Approved
      </span>
    ) : (
      <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
        Pending
      </span>
    );
  };
  const totalItems = administrationTypes.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pagedAdministrationTypes = administrationTypes.slice(
    startIndex,
    endIndex,
  );

  return (
    <div className="p-6 pb-10 min-h-screen bg-gradient-to-br from-[#f9fafc] to-[#eef3f9]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          {/* <p className="text-sm uppercase tracking-[0.2em] font-semibold text-indigo-500">
            Administration Types
          </p> */}
          <h1 className="text-3xl font-semibold text-gray-900">
            Administration Dept List
          </h1>
          {/* <p className="text-sm text-gray-500">
            Manage and create administration types directly from this view.
          </p> */}
        </div>
        <button
          type="button"
          onClick={() => {
            setFormState({ name: "", isApprove: true });
            setIsDialogOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#5B5BF6] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-[#4338CA] hover:to-[#4F46E5]"
        >
          <Plus size={18} />
          Add Administration Department
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100">
        {isLoading ? (
          <div className="p-10 text-center text-gray-500 text-sm">
            Loading administration types...
          </div>
        ) : administrationTypes.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">
            No administration types available yet. Create the first one to get
            started.
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="min-w-full table-fixed divide-y divide-gray-100">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Administration Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {pagedAdministrationTypes.map((administrationType, index) => (
                  <tr
                    key={administrationType.id}
                    className="hover:bg-gray-50/80"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 font-medium">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {editingAdministrationTypeId === administrationType.id ? (
                        <input
                          type="text"
                          value={editingForm.name}
                          onChange={(event) =>
                            setEditingForm((prev) => ({
                              ...prev,
                              name: event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                          autoFocus
                        />
                      ) : (
                        administrationType.name || "Unnamed Administration Type"
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {editingAdministrationTypeId === administrationType.id ? (
                        <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={editingForm.isApprove}
                            onChange={(event) =>
                              setEditingForm((prev) => ({
                                ...prev,
                                isApprove: event.target.checked,
                              }))
                            }
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          Mark as approved
                        </label>
                      ) : (
                        renderStatus(administrationType.is_approve)
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-500">
                      {editingAdministrationTypeId === administrationType.id ? (
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            disabled={rowLoadingId === administrationType.id}
                            onClick={() =>
                              handleSaveAdministrationType(
                                administrationType.id,
                              )
                            }
                            className="rounded-full border border-green-100 bg-green-50 p-2 text-green-600 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Save administration type"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-100"
                            aria-label="Cancel edit"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <ActionMenu
                          buttonLabel="Administration type actions"
                          items={[
                            {
                              label: "Edit",
                              onClick: () => startEditing(administrationType),
                            },
                            {
                              label: "Delist",
                              variant: "danger",
                              disabled: rowLoadingId === administrationType.id,
                              onClick: () =>
                                handleDeleteAdministrationType(administrationType.id),
                            },
                          ]}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!isLoading && administrationTypes.length > 0 && (
        <div className="mt-0 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
          <span>
            Showing {Math.min(startIndex + 1, totalItems)} to{" "}
            {Math.min(endIndex, totalItems)} of {totalItems} entries
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className={`min-w-[34px] rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
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
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {rowError && (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {rowError}
        </div>
      )}

      {isDialogOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Create Administration Dept
                </h2>
                <p className="text-sm text-gray-500">
                  Provide the administration type details to add it to the
                  hospital.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={handleCreateAdministrationType}
              className="space-y-6 px-6 py-6"
            >
              <div className="space-y-2">
                <label
                  htmlFor="administration-type-name"
                  className="text-sm font-medium text-gray-700"
                >
                  Administration Dept Name
                </label>
                <input
                  id="administration-type-name"
                  name="name"
                  type="text"
                  placeholder="e.g. HR Manager"
                  value={formState.name}
                  onChange={handleInputChange}
                  autoFocus
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-600">
                <input
                  type="checkbox"
                  name="isApprove"
                  checked={formState.isApprove}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-medium text-gray-900">
                    Mark as approved
                  </span>
                  <p className="text-xs text-gray-500">
                    Approved administration types appear instantly on the list.
                  </p>
                </div>
              </label>

              {formError && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-xl bg-[#4F46E5] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Saving..." : "Create Administration Type"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
