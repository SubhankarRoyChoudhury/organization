"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ORGANIZATION_USER_CATEGORIES = ["Vidya", "Swasthya", "Ashram"];

const buildStaffDeptCode = (name, code) => {
  const fromName = String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
  if (String(code || "").trim()) {
    return String(code).trim();
  }
  if (fromName) {
    return fromName;
  }
  return `SD_${Date.now()}`;
};

export default function OrganizationUserCreateDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
  errorMessage,
  isSubmitting,
  organizations,
  isLoadingOrganizations,
  selectedOrganizationId,
  selectedOrganizationName,
  isHospitalManagementContext,
  hospitalReferenceOptions,
  isLoadingHospitalReferenceOptions,
  onCreateHospitalReference,
  onFieldValueChange,
  isCreatingHospitalReference,
  hospitalReferenceError,
}) {
  const [referenceDialogType, setReferenceDialogType] = useState("");
  const [isReferenceDialogOpen, setReferenceDialogOpen] = useState(false);
  const [referenceForm, setReferenceForm] = useState({
    name: "",
    code: "",
    staff_department: "",
  });
  const [referenceError, setReferenceError] = useState("");

  const departments = hospitalReferenceOptions?.departments || [];
  const doctorTypes = hospitalReferenceOptions?.doctorTypes || [];
  const administrationTypes = hospitalReferenceOptions?.administrationTypes || [];
  const staffDepartments = hospitalReferenceOptions?.staffDepartments || [];
  const staffJobTitles = hospitalReferenceOptions?.staffJobTitles || [];

  const selectedStaffDepartmentId = String(formData.staff_department || "");
  const selectedRole = String(formData.role || "user");
  const isDoctorRole = isHospitalManagementContext && selectedRole === "doctor";
  const isAdministrationRole =
    isHospitalManagementContext && selectedRole === "administration";
  const isStaffRole = isHospitalManagementContext && selectedRole === "staff";
  const filteredStaffJobTitles = selectedStaffDepartmentId
    ? staffJobTitles.filter(
        (item) => String(item.staff_department || "") === selectedStaffDepartmentId,
      )
    : staffJobTitles;

  const isOrganizationLocked = Boolean(selectedOrganizationId);
  const organizationValue = isOrganizationLocked
    ? String(selectedOrganizationId)
    : formData.organization_id;
  const hasOrganizationSelected = Boolean(
    String(organizationValue || "").trim(),
  );

  const updateField = (name, value) => {
    if (onFieldValueChange) {
      onFieldValueChange(name, value);
      return;
    }
    onFormChange({ target: { name, value } });
  };

  const openReferenceDialog = (type) => {
    setReferenceError("");
    setReferenceDialogType(type);
    setReferenceForm({
      name: "",
      code: "",
      staff_department: formData.staff_department || "",
    });
    setReferenceDialogOpen(true);
  };

  const closeReferenceDialog = () => {
    setReferenceDialogOpen(false);
    setReferenceDialogType("");
    setReferenceError("");
    setReferenceForm({ name: "", code: "", staff_department: "" });
  };

  const handleCreateReferenceSubmit = async (event) => {
    event.preventDefault();
    if (!onCreateHospitalReference) {
      return;
    }
    const type = referenceDialogType;
    const name = String(referenceForm.name || "").trim();
    if (!name) {
      setReferenceError("Name is required.");
      return;
    }
    const payload = { name };
    if (!hasOrganizationSelected) {
      setReferenceError("Please select organization first.");
      return;
    }
    if (type === "staff_department") {
      payload.code = buildStaffDeptCode(referenceForm.name, referenceForm.code);
    }
    if (type === "staff_job_title") {
      const staffDepartmentId = Number(referenceForm.staff_department || 0);
      if (!staffDepartmentId) {
        setReferenceError("Staff department is required.");
        return;
      }
      payload.staff_department = staffDepartmentId;
    }

    try {
      const created = await onCreateHospitalReference(type, payload);
      if (!created?.id) {
        setReferenceError("Created, but failed to read the new record.");
        return;
      }
      if (type === "department") updateField("department", String(created.id));
      if (type === "doctor_type") updateField("doctor_type", String(created.id));
      if (type === "administration_type") {
        updateField("administration_type", String(created.id));
      }
      if (type === "staff_department") {
        updateField("staff_department", String(created.id));
      }
      if (type === "staff_job_title") {
        updateField("staff_job_title", String(created.id));
      }
      closeReferenceDialog();
    } catch (error) {
      const responseData = error.response?.data || {};
      const message =
        error.message ||
        responseData?.detail ||
        responseData?.error?.[0] ||
        responseData?.errors?.name?.[0] ||
        responseData?.errors?.code?.[0] ||
        responseData?.errors?.staff_department?.[0] ||
        "Unable to create.";
      setReferenceError(String(message));
    }
  };

  const renderReferenceSelect = ({
    label,
    fieldName,
    value,
    options,
    placeholder,
    addType,
    addDisabled,
  }) => (
    <div className="flex flex-col gap-2 text-sm font-medium text-gray-700">
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => openReferenceDialog(addType)}
          disabled={addDisabled}
          className="rounded-md border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          + Add
        </button>
      </div>
      <select
        name={fieldName}
        value={value}
        onChange={(event) => updateField(fieldName, event.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={item.id} value={String(item.id)}>
            {item.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border border-blue-100 bg-white/95">
          <DialogHeader>
            <DialogTitle className="text-2xl text-gray-900">
              Create organization user
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Create an OrganizationUser and assign an organization from dropdown.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 sm:col-span-2">
                <span>Organization</span>
                <select
                  name="organization_id"
                  value={organizationValue}
                  onChange={onFormChange}
                  required
                  disabled={isLoadingOrganizations || isOrganizationLocked}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-70"
                >
                  <option
                    value={
                      isOrganizationLocked ? String(selectedOrganizationId) : ""
                    }
                  >
                    {isOrganizationLocked
                      ? `${selectedOrganizationName || "Organization"}`
                      : isLoadingOrganizations
                        ? "Loading organizations..."
                        : "Select organization"}
                  </option>
                  {!isOrganizationLocked &&
                    organizations.map((org) => (
                      <option key={org.id} value={String(org.id)}>
                        {org.name}
                      </option>
                    ))}
                </select>
              </label>

              {isHospitalManagementContext ? (
                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 sm:col-span-2">
                  <span>Role</span>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={onFormChange}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="doctor">Doctor</option>
                    <option value="administration">Administration</option>
                    <option value="staff">Staff</option>
                  </select>
                </label>
              ) : null}

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Name
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={onFormChange}
                  placeholder="John Doe"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Father/Husband
                <input
                  type="text"
                  name="fatherOrHusband"
                  value={formData.fatherOrHusband}
                  onChange={onFormChange}
                  placeholder="Parent or spouse name"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Alias name
                <input
                  type="text"
                  name="aliasName"
                  value={formData.aliasName}
                  onChange={onFormChange}
                  placeholder="JD"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Username
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={onFormChange}
                  placeholder="john_doe"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Email
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={onFormChange}
                  placeholder="john.doe@example.com"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Phone number
                <input
                  type="text"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={onFormChange}
                  placeholder="9000000000"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Mobile
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={onFormChange}
                  placeholder="9000000000"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                WhatsApp number
                <input
                  type="text"
                  name="whatsapp_number"
                  value={formData.whatsapp_number}
                  onChange={onFormChange}
                  placeholder="9000000000"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Address
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={onFormChange}
                  placeholder="MG Road"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Job title
                <input
                  type="text"
                  name="job_title"
                  value={formData.job_title}
                  onChange={onFormChange}
                  placeholder="Consultant"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Category
                <select
                  name="category"
                  value={formData.category}
                  onChange={onFormChange}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select category</option>
                  {ORGANIZATION_USER_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Level
                <input
                  type="text"
                  name="level"
                  value={formData.level}
                  onChange={onFormChange}
                  placeholder="Level 1"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {isDoctorRole ? (
                <>
                  {renderReferenceSelect({
                    label: "Department",
                    fieldName: "department",
                    value: formData.department,
                    options: departments,
                    placeholder: isLoadingHospitalReferenceOptions
                      ? "Loading departments..."
                      : "Select department",
                    addType: "department",
                    addDisabled: !hasOrganizationSelected,
                  })}
                  {renderReferenceSelect({
                    label: "Doctor type",
                    fieldName: "doctor_type",
                    value: formData.doctor_type,
                    options: doctorTypes,
                    placeholder: isLoadingHospitalReferenceOptions
                      ? "Loading doctor types..."
                      : "Select doctor type",
                    addType: "doctor_type",
                    addDisabled: !hasOrganizationSelected,
                  })}
                  <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                    Association type
                    <input
                      type="text"
                      name="association_type"
                      value={formData.association_type}
                      onChange={onFormChange}
                      placeholder="Full-time"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                    Medical council registration
                    <input
                      type="text"
                      name="medical_council_registration"
                      value={formData.medical_council_registration}
                      onChange={onFormChange}
                      placeholder="MCI-1234"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </>
              ) : null}

              {isAdministrationRole ? (
                <>
                  {renderReferenceSelect({
                    label: "Administration type",
                    fieldName: "administration_type",
                    value: formData.administration_type,
                    options: administrationTypes,
                    placeholder: isLoadingHospitalReferenceOptions
                      ? "Loading administration types..."
                      : "Select administration type",
                    addType: "administration_type",
                    addDisabled: !hasOrganizationSelected,
                  })}
                </>
              ) : null}

              {isStaffRole ? (
                <>
                  {renderReferenceSelect({
                    label: "Staff department",
                    fieldName: "staff_department",
                    value: formData.staff_department,
                    options: staffDepartments,
                    placeholder: isLoadingHospitalReferenceOptions
                      ? "Loading staff departments..."
                      : "Select staff department",
                    addType: "staff_department",
                    addDisabled: !hasOrganizationSelected,
                  })}
                  {renderReferenceSelect({
                    label: "Staff job title",
                    fieldName: "staff_job_title",
                    value: formData.staff_job_title,
                    options: filteredStaffJobTitles,
                    placeholder: isLoadingHospitalReferenceOptions
                      ? "Loading staff job titles..."
                      : selectedStaffDepartmentId
                        ? "Select staff job title"
                        : "Select staff department first",
                    addType: "staff_job_title",
                    addDisabled: !hasOrganizationSelected || !formData.staff_department,
                  })}
                </>
              ) : null}

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 sm:col-span-2">
                About
                <textarea
                  name="about"
                  value={formData.about}
                  onChange={onFormChange}
                  placeholder="Short description"
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            {hospitalReferenceError ? (
              <p className="text-sm text-red-500">{hospitalReferenceError}</p>
            ) : null}
            {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}

            <div className="flex flex-col items-center justify-end gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isLoadingOrganizations}
                className="w-full rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {isSubmitting ? "Creating..." : "Create user"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isReferenceDialogOpen} onOpenChange={setReferenceDialogOpen}>
        <DialogContent className="max-w-md border border-blue-100 bg-white/95">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900">
              Add {referenceDialogType.replaceAll("_", " ")}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Create and instantly use this item in OrganizationUser.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateReferenceSubmit} className="space-y-4">
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Name
              <input
                type="text"
                value={referenceForm.name}
                onChange={(event) =>
                  setReferenceForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Enter name"
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            {referenceDialogType === "staff_department" ? (
              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Code (optional)
                <input
                  type="text"
                  value={referenceForm.code}
                  onChange={(event) =>
                    setReferenceForm((prev) => ({ ...prev, code: event.target.value }))
                  }
                  placeholder="AUTO if blank"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            ) : null}

            {referenceDialogType === "staff_job_title" ? (
              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Staff department
                <select
                  value={referenceForm.staff_department}
                  onChange={(event) =>
                    setReferenceForm((prev) => ({
                      ...prev,
                      staff_department: event.target.value,
                    }))
                  }
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select staff department</option>
                  {staffDepartments.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {referenceError ? <p className="text-sm text-red-500">{referenceError}</p> : null}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeReferenceDialog}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingHospitalReference}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCreatingHospitalReference ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
