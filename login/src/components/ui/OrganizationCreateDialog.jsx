"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function OrganizationCreateDialog({
  open,
  onOpenChange,
  isEditingOrganization,
  organizationCreateForm,
  organizationCreateError,
  isCreatingOrganization,
  onSubmit,
  onFormChange,
  onUsernameBlur,
  onOrgCodeBlur,
  onCancel,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-3xl max-h-[92svh] overflow-hidden border border-blue-100 bg-white/95 p-0 sm:max-h-[90svh] sm:w-full sm:max-w-3xl">
        <div className="max-h-[92svh] overflow-y-auto px-4 py-4 sm:max-h-[90svh] sm:px-6 sm:py-6">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900 sm:text-2xl">
              {isEditingOrganization ? "Edit organization" : "Create organization"}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              {isEditingOrganization
                ? "Update organization details."
                : "Add a new organization using the Organization model fields."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="mt-4 space-y-6 sm:mt-5">
            <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              <span>Organization name</span>
              <input
                type="text"
                name="name"
                value={organizationCreateForm.name}
                onChange={onFormChange}
                placeholder="Acme School"
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            {!isEditingOrganization && (
              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                <span>Org code</span>
                <input
                  type="text"
                  name="org_code"
                  value={organizationCreateForm.org_code}
                  onChange={onFormChange}
                  onBlur={onOrgCodeBlur}
                  placeholder="acs"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <span className="text-xs text-gray-400">
                  Auto-generated from organization name. You can edit it.
                </span>
              </label>
            )}

            {!isEditingOrganization && (
              <>
                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                  <span>Admin name</span>
                  <input
                    type="text"
                    name="admin_name"
                    value={organizationCreateForm.admin_name}
                    onChange={onFormChange}
                    placeholder="Organization Admin"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                  <span>Username</span>
                  <input
                    type="text"
                    name="username"
                    value={organizationCreateForm.username}
                    onChange={onFormChange}
                    onBlur={onUsernameBlur}
                    placeholder="acme_admin"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="text-xs text-gray-400">
                    Username will be saved as `username.orgcode`.
                  </span>
                </label>
              </>
            )}

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Email
              <input
                type="email"
                name="email"
                value={organizationCreateForm.email}
                onChange={onFormChange}
                placeholder="contact@acme-school.com"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Phone number
              <input
                type="text"
                name="phone_number"
                value={organizationCreateForm.phone_number}
                onChange={onFormChange}
                placeholder="9888888888"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            {!isEditingOrganization && (
              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Password
                <input
                  type="password"
                  name="password"
                  value={organizationCreateForm.password}
                  onChange={onFormChange}
                  placeholder="Enter password"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            )}

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Address
              <input
                type="text"
                name="address"
                value={organizationCreateForm.address}
                onChange={onFormChange}
                placeholder="MG Road"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              City
              <input
                type="text"
                name="city"
                value={organizationCreateForm.city}
                onChange={onFormChange}
                placeholder="Pune"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              State
              <input
                type="text"
                name="state"
                value={organizationCreateForm.state}
                onChange={onFormChange}
                placeholder="Maharashtra"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Country
              <input
                type="text"
                name="country"
                value={organizationCreateForm.country}
                onChange={onFormChange}
                placeholder="India"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Postal code
              <input
                type="text"
                name="postal_code"
                value={organizationCreateForm.postal_code}
                onChange={onFormChange}
                placeholder="411001"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            </div>

            {organizationCreateError && (
              <p className="text-sm text-red-500">{organizationCreateError}</p>
            )}

            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-100 bg-white/95 p-1 pt-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingOrganization}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCreatingOrganization
                  ? "Working..."
                  : isEditingOrganization
                    ? "Update"
                    : "Create"}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
