"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera } from "lucide-react";
import {
  extractAttachmentIdFromUploadResponse,
  registerHospital,
  emailExists,
  uploadImageFromAnyWhere,
} from "@/app/api/apiService";
import ImageCropDialog from "@/components/ui/image-crop-dialog";
import ErrorDialog from "@/app/ErrorDialog/page";
import SuccessDialog from "@/app/SuccessDialog/page";

export default function RegiterHospitalPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    company_name: "",
    admin_name: "",
    email: "",
    mobile: "",
    address: "",
    pin: "",
  });
  const [errors, setErrors] = useState({});
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [logoError, setLogoError] = useState("");
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [imageCropDialog, setImageCropDialog] = useState({
    open: false,
    sourceUrl: "",
    fileName: "logo.jpg",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (name === "email") {
      setErrors((prev) => ({
        ...prev,
        email: "",
      }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.company_name.trim()) {
      nextErrors.company_name = "Hospital name is required";
    }
    if (!formData.admin_name.trim()) {
      nextErrors.admin_name = "Administrator name is required";
    }
    if (!formData.email.trim()) {
      nextErrors.email = "Email is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const checkEmailAvailability = async () => {
    const trimmedEmail = formData.email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrors((prev) => ({
        ...prev,
        email: "",
      }));
      return false;
    }

    setIsCheckingEmail(true);
    try {
      const result = await emailExists(trimmedEmail);
      const exists =
        result?.exists === true ||
        result?.exists === "true";
      if (exists) {
        setErrors((prev) => ({
          ...prev,
          email: "Email already exists",
        }));
        return false;
      }
      setErrors((prev) => ({
        ...prev,
        email: "",
      }));
      return true;
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        email: "Unable to verify email. Try again.",
      }));
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    const isEmailAvailable = await checkEmailAvailability();
    if (!isEmailAvailable) {
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        username: formData.email.trim().toLowerCase(),
      };

      const response = await registerHospital(payload);
      let logoNote = "";

      if (logoFile) {
        try {
          const uploadResponse = await uploadImageFromAnyWhere(
            logoFile,
            payload.username,
          );
          const attachmentId =
            extractAttachmentIdFromUploadResponse(uploadResponse);
          if (attachmentId) {
            localStorage.setItem(
              "pending_company_logo_id",
              String(attachmentId),
            );
            logoNote = " Logo uploaded. Complete your profile to apply it.";
          } else {
            logoNote =
              " Logo upload failed. You can add it later in your profile.";
          }
        } catch (uploadError) {
          console.error("Logo upload failed:", uploadError);
          logoNote =
            " Logo upload failed. You can add it later in your profile.";
        }
      }

      setSuccessMessage(`Hospital registered successfully!${logoNote}`);
      setIsSuccessDialogOpen(true);

      if (response?.msg) {
        console.log("Register response:", response.msg);
      }
    } catch (error) {
      const responseData = error.response?.data;
      const apiMessage =
        responseData?.msg ||
        responseData?.detail ||
        (typeof responseData === "string" ? responseData : null) ||
        "Registration failed. Please try again.";
      setErrorMessage(apiMessage);
      setIsErrorDialogOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeErrorDialog = () => {
    setIsErrorDialogOpen(false);
  };

  const closeSuccessDialog = () => {
    setIsSuccessDialogOpen(false);
    router.push("/");
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!file.type?.startsWith("image/")) {
      setLogoError("Please select an image file.");
      return;
    }
    setLogoError("");
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setLogoError("Logo is too large. Max size is 2MB.");
      return;
    }

    if (imageCropDialog.sourceUrl) {
      URL.revokeObjectURL(imageCropDialog.sourceUrl);
    }
    setImageCropDialog({
      open: true,
      sourceUrl: URL.createObjectURL(file),
      fileName: file.name || "logo.jpg",
    });
  };

  const closeImageCropDialog = () => {
    if (imageCropDialog.sourceUrl) {
      URL.revokeObjectURL(imageCropDialog.sourceUrl);
    }
    setImageCropDialog({
      open: false,
      sourceUrl: "",
      fileName: "logo.jpg",
    });
  };

  const handleImageCropConfirm = (file, previewUrl) => {
    setLogoFile(file);
    setLogoPreviewUrl(previewUrl);
    closeImageCropDialog();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#fff7ed] via-white to-[#e0f2fe] flex items-center justify-center px-4 py-10">
      <div className="absolute -top-12 -left-10 w-40 h-40 rounded-full bg-amber-200/50 blur-3xl" />
      <div className="absolute -bottom-16 -right-8 w-56 h-56 rounded-full bg-sky-200/40 blur-3xl" />

      <div className="relative w-full max-w-5xl bg-white/90 backdrop-blur-sm rounded-[32px] shadow-2xl border border-white/70 overflow-hidden">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="px-8 sm:px-12 py-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-500">
                  Regiter Hospital
                </p>
                <h1 className="text-3xl font-bold text-gray-900 mt-2">
                  Create your hospital workspace
                </h1>
              </div>
              <Link
                href="/"
                className="text-sm font-semibold text-sky-600 hover:text-sky-700"
              >
                Back to login
              </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-6 text-center">
                <div className="relative h-24 w-24 overflow-visible rounded-full border border-amber-200 bg-white shadow-sm">
                  {logoPreviewUrl ? (
                    <img
                      src={logoPreviewUrl}
                      alt="Hospital logo preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-amber-500">
                      Logo
                    </div>
                  )}
                  <label className="absolute -bottom-2 -right-2 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-amber-400 text-white shadow-lg ring-2 ring-white transition hover:bg-amber-600">
                    <Camera className="h-5 w-5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Hospital logo
                  </p>
                  <p className="text-xs text-gray-500">
                    Upload a square image (max 2MB).
                  </p>
                </div>
                {logoError && (
                  <span className="text-xs text-red-500">{logoError}</span>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Hospital name
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="Sunrise Medical Center"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                  />
                  {errors.company_name && (
                    <span className="text-red-500 text-xs">
                      {errors.company_name}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Administrator name
                  </label>
                  <input
                    type="text"
                    name="admin_name"
                    value={formData.admin_name}
                    onChange={handleChange}
                    placeholder="Dr. Alex Morgan"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                  />
                  {errors.admin_name && (
                    <span className="text-red-500 text-xs">
                      {errors.admin_name}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={checkEmailAvailability}
                    placeholder="admin@sunrise.com"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                  />
                  {errors.email ? (
                    <span className="text-red-500 text-xs">
                      {errors.email}
                    </span>
                  ) : isCheckingEmail ? (
                    <span className="text-gray-400 text-xs">
                      Checking email...
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Mobile
                  </label>
                  <input
                    type="text"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="+1 222 555 0198"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="112 Elm Street"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Postal code
                  </label>
                  <input
                    type="text"
                    name="pin"
                    value={formData.pin}
                    onChange={handleChange}
                    placeholder="90210"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  Your login username will be your email address.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600"
                >
                  {isSubmitting ? "Submitting..." : "Submit For registration"}
                </button>
              </div>
            </form>
          </div>

          <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-amber-50 via-white to-sky-100 px-10 py-12">
            <div className="space-y-4">
              <span className="inline-flex items-center rounded-full bg-amber-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">
                Hospital Suite
              </span>
              <h2 className="text-2xl font-semibold text-gray-900">
                Onboard your facility in minutes.
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Centralize patient operations, configure departments, and
                empower staff with dashboards tailored to your hospital.
              </p>
            </div>

            <div className="rounded-3xl border border-white bg-white/80 p-6 shadow-xl">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.2em]">
                What happens next
              </p>
              <ul className="mt-4 space-y-3 text-sm text-gray-700">
                <li>We create your hospital profile.</li>
                <li>Your admin credentials are emailed instantly.</li>
                <li>Start configuring departments and services.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <ErrorDialog
        open={isErrorDialogOpen}
        onClose={closeErrorDialog}
        message={errorMessage}
      />
      <SuccessDialog
        open={isSuccessDialogOpen}
        onClose={closeSuccessDialog}
        message={successMessage}
      />
      <ImageCropDialog
        key={imageCropDialog.sourceUrl || "image-crop-register-hospital"}
        open={imageCropDialog.open}
        sourceUrl={imageCropDialog.sourceUrl}
        fileName={imageCropDialog.fileName}
        title="Crop hospital logo"
        description="Adjust logo before saving."
        confirmLabel="Use cropped logo"
        onCancel={closeImageCropDialog}
        onConfirm={handleImageCropConfirm}
        onError={setLogoError}
      />
    </div>
  );
}
