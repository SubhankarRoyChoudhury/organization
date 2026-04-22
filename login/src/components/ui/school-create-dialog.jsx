"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SchoolCreateDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
  errorMessage,
  isSubmitting,
  organizationId,
  organizationName,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border border-blue-100 bg-white/95">
        <DialogHeader>
          <DialogTitle className="text-2xl text-gray-900">
            Create school
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Create a school using the School model fields.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
            Organization:{" "}
            <span className="font-semibold">
              {organizationName || "Not available"}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              <span>School name</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={onFormChange}
                placeholder="Green Valley School"
                required
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
          </div>

          {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

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
              disabled={isSubmitting || !organizationId}
              className="w-full rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {isSubmitting ? "Creating..." : "Create school"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
