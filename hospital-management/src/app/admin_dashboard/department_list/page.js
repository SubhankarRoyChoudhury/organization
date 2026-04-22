"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Check } from "lucide-react";
import ActionMenu from "@/components/ui/ActionMenu";
import {
  getAllDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  get_Hospital_User_Login_Details,
} from "@/app/api/apiService";

export default function DepartmentList() {
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [rowError, setRowError] = useState(null);
  const [formState, setFormState] = useState({
    name: "",
    isApprove: true,
  });
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [editingForm, setEditingForm] = useState({
    name: "",
    isApprove: false,
  });
  const [rowLoadingId, setRowLoadingId] = useState(null);
  const [loggedInDetails, setLoggedInDetails] = useState(null);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const resolvedCompanyId =
    loggedInDetails?.company_id || loggedInDetails?.companies?.[0]?.company_id;

  // Fetch logged-in details
  useEffect(() => {
    const username = localStorage.getItem("username");
    if (username) fetchUserDetails(username);
  }, []);

  const fetchUserDetails = async (username) => {
    try {
      const data = await get_Hospital_User_Login_Details(username);
      console.log("Logged Details ===>>>", data);
      setLoggedInDetails(data);

      setError(null);
    } catch (error) {
      console.error("Error fetching user:", error);
      setError("Failed to fetch user details.");
    }
  };
  // ----------------------- Old Fetch Department Start ---------------------
  // useEffect(() => {
  //   fetchDepartments();
  // }, [fetchDepartments]);
  // const fetchDepartments = useCallback(async () => {
  //   setIsLoading(true);
  //   try {
  //     const data = await getAllDepartment();
  //     setDepartments(Array.isArray(data) ? data : []);
  //     setError(null);
  //   } catch (fetchError) {
  //     setError("Unable to load departments right now. Please try again.");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, []);
  // ----------------------- Old Fetch Department End ---------------------

  const fetchDepartments = useCallback(async (company_id) => {
    setIsLoading(true);
    try {
      const data = await getAllDepartment(company_id);
      setDepartments(Array.isArray(data) ? data : []);
      setError(null);
    } catch (fetchError) {
      setError("Unable to load departments right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (resolvedCompanyId) {
      fetchDepartments(resolvedCompanyId);
    }
  }, [resolvedCompanyId, fetchDepartments]);

  const closeDialog = () => {
    if (isSubmitting) return;
    setIsDialogOpen(false);
    setFormError(null);
    setFormState({ name: "", isApprove: true });
  };

  const startEditing = (department) => {
    setEditingDepartmentId(department.id);
    setEditingForm({
      name: department.name || "",
      isApprove: Boolean(department.is_approve),
    });
    setRowError(null);
  };

  const cancelEditing = () => {
    setEditingDepartmentId(null);
    setEditingForm({ name: "", isApprove: false });
    setRowError(null);
  };

  const handleSaveEdit = async (departmentId) => {
    console.log(loggedInDetails);
    if (!editingForm.name.trim()) {
      setRowError("Department name cannot be empty.");
      return;
    }

    if (!resolvedCompanyId) {
      setRowError("Missing company context. Please refresh and try again.");
      return;
    }

    setRowLoadingId(departmentId);
    try {
      await updateDepartment(
        departmentId,
        {
          name: editingForm.name.trim(),
          is_approve: editingForm.isApprove,
        },
        resolvedCompanyId,
      );
      await fetchDepartments(resolvedCompanyId);
      cancelEditing();
    } catch (updateError) {
      const apiError =
        updateError.response?.data?.errors?.name?.[0] ||
        updateError.response?.data?.error ||
        "Failed to update department.";
      setRowError(apiError);
    } finally {
      setRowLoadingId(null);
    }
  };

  const handleDeleteDepartment = async (departmentId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this department?",
    );
    if (!confirmDelete) return;

    if (!resolvedCompanyId) {
      setRowError("Missing company context. Please refresh and try again.");
      return;
    }

    setRowLoadingId(departmentId);
    try {
      await deleteDepartment(departmentId, resolvedCompanyId);
      setDepartments((prev) =>
        prev.filter((department) => department.id !== departmentId),
      );
      if (editingDepartmentId === departmentId) {
        cancelEditing();
      }
      setRowError(null);
    } catch (deleteError) {
      const apiError =
        deleteError.response?.data?.error ||
        "Failed to delete department. Please try again.";
      setRowError(apiError);
    } finally {
      setRowLoadingId(null);
    }
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCreateDepartment = async (event) => {
    console.log(resolvedCompanyId);
    event.preventDefault();
    if (!formState.name.trim()) {
      setFormError("Department name is required.");
      return;
    }
    if (!resolvedCompanyId) {
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
      await createDepartment(
        {
          name: formState.name.trim(),
          is_approve: formState.isApprove,
          created_by: createdBy,
        },
        resolvedCompanyId,
      );
      closeDialog();
      fetchDepartments(resolvedCompanyId);
    } catch (creationError) {
      const apiError =
        creationError.response?.data?.errors?.name?.[0] ||
        creationError.response?.data?.error?.[0] ||
        "Could not create department. Please try again.";
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

  const filteredDepartments = departments.filter((department) => {
    const query = departmentSearch.trim().toLowerCase();
    if (!query) return true;
    return String(department.name || "")
      .toLowerCase()
      .includes(query);
  });
  const totalItems = filteredDepartments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pagedDepartments = filteredDepartments.slice(startIndex, endIndex);

  return (
    <div className="p-6 pb-10 min-h-screen bg-gradient-to-br from-[#f9fafc] to-[#eef3f9]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          {/* <p className="text-sm uppercase tracking-[0.2em] font-semibold text-indigo-500">
            Departments
          </p> */}
          <h1 className="text-3xl font-semibold text-gray-900">
            Department List
          </h1>
          {/* <p className="text-sm text-gray-500">
            Manage and create departments directly from this view.
          </p> */}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => {
              setFormState({ name: "", isApprove: true });
              setIsDialogOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#5B5BF6] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-[#4338CA] hover:to-[#4F46E5]"
          >
            <Plus size={18} />
            Add Department
          </button>
          <div className="w-full sm:w-64">
            <input
              type="text"
              value={departmentSearch}
              onChange={(event) => {
                setDepartmentSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search department"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100">
        {isLoading ? (
          <div className="p-10 text-center text-gray-500 text-sm">
            Loading departments...
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">
            No departments available yet. Create the first one to get started.
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
                    Department
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
                {pagedDepartments.map((department, index) => (
                  <tr
                    key={department.id}
                    className="hover:bg-gray-50/80"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 font-medium">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {editingDepartmentId === department.id ? (
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
                        department.name || "Unnamed Department"
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {editingDepartmentId === department.id ? (
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
                        renderStatus(department.is_approve)
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-500">
                      {editingDepartmentId === department.id ? (
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            disabled={rowLoadingId === department.id}
                            onClick={() => handleSaveEdit(department.id)}
                            className="rounded-full border border-green-100 bg-green-50 p-2 text-green-600 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Save department"
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
                          buttonLabel="Department actions"
                          items={[
                            {
                              label: "Edit",
                              onClick: () => startEditing(department),
                            },
                            {
                              label: "Delist",
                              variant: "danger",
                              disabled: rowLoadingId === department.id,
                              onClick: () => handleDeleteDepartment(department.id),
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
      {!isLoading && filteredDepartments.length > 0 && (
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
                  Create Department
                </h2>
                <p className="text-sm text-gray-500">
                  Provide the department details to add it to the hospital.
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
              onSubmit={handleCreateDepartment}
              className="space-y-6 px-6 py-6"
            >
              <div className="space-y-2">
                <label
                  htmlFor="department-name"
                  className="text-sm font-medium text-gray-700"
                >
                  Department Name
                </label>
                <input
                  id="department-name"
                  name="name"
                  type="text"
                  placeholder="e.g. Cardiology"
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
                    Approved departments appear instantly on the list.
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
                  {isSubmitting ? "Saving..." : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
