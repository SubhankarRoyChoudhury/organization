"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, X, Check } from "lucide-react";
import ActionMenu from "@/components/ui/ActionMenu";
import {
  getAllStaffJobTitles,
  createStaffJobTitle,
  updateStaffJobTitle,
  deleteStaffJobTitle,
  getAllStaffDepartments,
  get_Hospital_User_Login_Details,
} from "@/app/api/apiService";

export default function StaffJobTitle() {
  const [jobTitles, setJobTitles] = useState([]);
  const [staffDepartments, setStaffDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [rowError, setRowError] = useState(null);
  const [formState, setFormState] = useState({
    name: "",
    staff_department: "",
    isApprove: true,
  });
  const [editingJobTitleId, setEditingJobTitleId] = useState(null);
  const [editingForm, setEditingForm] = useState({
    name: "",
    staff_department: "",
    isApprove: false,
  });
  const [rowLoadingId, setRowLoadingId] = useState(null);
  const [loggedInDetails, setLoggedInDetails] = useState(null);
  const [jobTitleSearch, setJobTitleSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const resolvedCompanyId =
    loggedInDetails?.company_id || loggedInDetails?.companies?.[0]?.company_id;

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (username) fetchUserDetails(username);
  }, []);

  const fetchUserDetails = async (username) => {
    try {
      const data = await get_Hospital_User_Login_Details(username);
      setLoggedInDetails(data);
      setError(null);
    } catch (error) {
      console.error("Error fetching user:", error);
      setError("Failed to fetch user details.");
    }
  };

  const fetchStaffJobTitles = useCallback(async (company_id) => {
    setIsLoading(true);
    try {
      const data = await getAllStaffJobTitles(company_id);
      setJobTitles(Array.isArray(data) ? data : []);
      setError(null);
    } catch (fetchError) {
      setError("Unable to load staff job titles right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStaffDepartments = useCallback(async (company_id) => {
    try {
      const data = await getAllStaffDepartments(company_id);
      setStaffDepartments(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error("Failed to load staff departments:", fetchError);
    }
  }, []);

  useEffect(() => {
    if (resolvedCompanyId) {
      fetchStaffJobTitles(resolvedCompanyId);
      fetchStaffDepartments(resolvedCompanyId);
    }
  }, [resolvedCompanyId, fetchStaffJobTitles, fetchStaffDepartments]);

  const departmentLookup = useMemo(() => {
    const map = new Map();
    staffDepartments.forEach((dept) => {
      if (!dept?.id) return;
      map.set(String(dept.id), dept);
    });
    return map;
  }, [staffDepartments]);

  const closeDialog = () => {
    if (isSubmitting) return;
    setIsDialogOpen(false);
    setFormError(null);
    setFormState({ name: "", staff_department: "", isApprove: true });
  };

  const startEditing = (jobTitle) => {
    setEditingJobTitleId(jobTitle.id);
    setEditingForm({
      name: jobTitle.name || "",
      staff_department: String(
        jobTitle.staff_department ?? jobTitle.staff_department_id ?? "",
      ),
      isApprove: Boolean(jobTitle.is_approve),
    });
    setRowError(null);
  };

  const cancelEditing = () => {
    setEditingJobTitleId(null);
    setEditingForm({ name: "", staff_department: "", isApprove: false });
    setRowError(null);
  };

  const handleSaveEdit = async (jobTitleId) => {
    if (!editingForm.name.trim()) {
      setRowError("Job title cannot be empty.");
      return;
    }
    if (!editingForm.staff_department) {
      setRowError("Please select a staff department.");
      return;
    }
    if (!resolvedCompanyId) {
      setRowError("Missing company context. Please refresh and try again.");
      return;
    }

    setRowLoadingId(jobTitleId);
    try {
      const createdBy =
        loggedInDetails?.user?.name ||
        loggedInDetails?.user?.username ||
        loggedInDetails?.username ||
        "unknown";
      await updateStaffJobTitle(
        jobTitleId,
        {
          name: editingForm.name.trim(),
          staff_department: Number(editingForm.staff_department),
          is_approve: editingForm.isApprove,
          updated_by: createdBy,
        },
        resolvedCompanyId,
      );
      await fetchStaffJobTitles(resolvedCompanyId);
      cancelEditing();
    } catch (updateError) {
      const apiError =
        updateError.response?.data?.errors?.name?.[0] ||
        updateError.response?.data?.errors?.staff_department?.[0] ||
        updateError.response?.data?.error ||
        "Failed to update staff job title.";
      setRowError(apiError);
    } finally {
      setRowLoadingId(null);
    }
  };

  const handleDeleteJobTitle = async (jobTitleId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this staff job title?",
    );
    if (!confirmDelete) return;

    if (!resolvedCompanyId) {
      setRowError("Missing company context. Please refresh and try again.");
      return;
    }

    setRowLoadingId(jobTitleId);
    try {
      await deleteStaffJobTitle(jobTitleId, resolvedCompanyId);
      setJobTitles((prev) => prev.filter((title) => title.id !== jobTitleId));
      if (editingJobTitleId === jobTitleId) {
        cancelEditing();
      }
      setRowError(null);
    } catch (deleteError) {
      const apiError =
        deleteError.response?.data?.error ||
        "Failed to delete staff job title. Please try again.";
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

  const handleCreateJobTitle = async (event) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      setFormError("Job title is required.");
      return;
    }
    if (!formState.staff_department) {
      setFormError("Please select a staff department.");
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
      await createStaffJobTitle(
        {
          name: formState.name.trim(),
          staff_department: Number(formState.staff_department),
          is_approve: formState.isApprove,
          created_by: createdBy,
        },
        resolvedCompanyId,
      );
      closeDialog();
      fetchStaffJobTitles(resolvedCompanyId);
    } catch (creationError) {
      const apiError =
        creationError.response?.data?.errors?.name?.[0] ||
        creationError.response?.data?.errors?.staff_department?.[0] ||
        creationError.response?.data?.error?.[0] ||
        "Could not create staff job title. Please try again.";
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

  const filteredJobTitles = jobTitles.filter((jobTitle) => {
    const query = jobTitleSearch.trim().toLowerCase();
    const matchesQuery = !query
      ? true
      : [jobTitle.name, jobTitle.staff_department_name].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query),
        );
    const matchesDepartment =
      departmentFilter === "all" ||
      String(
        jobTitle.staff_department ?? jobTitle.staff_department_id ?? "",
      ) === String(departmentFilter);
    return matchesQuery && matchesDepartment;
  });

  const totalItems = filteredJobTitles.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pagedJobTitles = filteredJobTitles.slice(startIndex, endIndex);

  return (
    <div className="p-6 pb-10 min-h-screen bg-gradient-to-br from-[#f9fafc] to-[#eef3f9]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Staff Job Title List
          </h1>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => {
              setFormState({
                name: "",
                staff_department: "",
                isApprove: true,
              });
              setIsDialogOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#5B5BF6] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-[#4338CA] hover:to-[#4F46E5]"
          >
            <Plus size={18} />
            Add Staff Job Title
          </button>
          <div className="w-full sm:w-56">
            <select
              value={departmentFilter}
              onChange={(event) => {
                setDepartmentFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">All Departments</option>
              {staffDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name || "Unnamed Department"}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-64">
            <input
              type="text"
              value={jobTitleSearch}
              onChange={(event) => {
                setJobTitleSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search job title"
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
            Loading staff job titles...
          </div>
        ) : filteredJobTitles.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">
            No staff job titles available yet. Create the first one to get
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
                    Job Title
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
                {pagedJobTitles.map((jobTitle, index) => {
                  const departmentId = String(
                    jobTitle.staff_department ??
                      jobTitle.staff_department_id ??
                      "",
                  );
                  const departmentName =
                    jobTitle.staff_department_name ||
                    departmentLookup.get(departmentId)?.name ||
                    "—";

                  return (
                    <tr key={jobTitle.id} className="hover:bg-gray-50/80">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 font-medium">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {editingJobTitleId === jobTitle.id ? (
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
                          jobTitle.name || "Unnamed Title"
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {editingJobTitleId === jobTitle.id ? (
                          <select
                            value={editingForm.staff_department}
                            onChange={(event) =>
                              setEditingForm((prev) => ({
                                ...prev,
                                staff_department: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                          >
                            <option value="">Select department</option>
                            {staffDepartments.map((department) => (
                              <option key={department.id} value={department.id}>
                                {department.name || "Unnamed Department"}
                              </option>
                            ))}
                          </select>
                        ) : (
                          departmentName
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {editingJobTitleId === jobTitle.id ? (
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
                          renderStatus(jobTitle.is_approve)
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-gray-500">
                        {editingJobTitleId === jobTitle.id ? (
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              disabled={rowLoadingId === jobTitle.id}
                              onClick={() => handleSaveEdit(jobTitle.id)}
                              className="rounded-full border border-green-100 bg-green-50 p-2 text-green-600 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label="Save staff job title"
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
                            buttonLabel="Staff job title actions"
                            items={[
                              {
                                label: "Edit",
                                onClick: () => startEditing(jobTitle),
                              },
                              {
                                label: "Delist",
                                variant: "danger",
                                disabled: rowLoadingId === jobTitle.id,
                                onClick: () => handleDeleteJobTitle(jobTitle.id),
                              },
                            ]}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && filteredJobTitles.length > 0 && (
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
                  Create Staff Job Title
                </h2>
                <p className="text-sm text-gray-500">
                  Provide the job title details to add it to the staff list.
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
              onSubmit={handleCreateJobTitle}
              className="space-y-6 px-6 py-6"
            >
              <div className="space-y-2">
                <label
                  htmlFor="staff-job-title-name"
                  className="text-sm font-medium text-gray-700"
                >
                  Job Title
                </label>
                <input
                  id="staff-job-title-name"
                  name="name"
                  type="text"
                  placeholder="e.g. Senior Nurse"
                  value={formState.name}
                  onChange={handleInputChange}
                  autoFocus
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="staff-job-title-department"
                  className="text-sm font-medium text-gray-700"
                >
                  Staff Department
                </label>
                <select
                  id="staff-job-title-department"
                  name="staff_department"
                  value={formState.staff_department}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select department</option>
                  {staffDepartments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name || "Unnamed Department"}
                    </option>
                  ))}
                </select>
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
                    Approved job titles appear instantly on the list.
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
                  {isSubmitting ? "Saving..." : "Create Staff Job Title"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
