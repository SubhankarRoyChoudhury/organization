"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  userLogin,
  googleCheckEmail,
  googleLogin,
  getCompanyByUsername,
  getCompanyUserDetailsByUsername,
  getCompanyInfo,
  getCurrentUserStatus,
  getSchoolLoginRouteByUsername,
  getCurrentSchoolInfo,
  getOrganizationUsersByUsername,
} from "@/app/api/apiService";
import { signInWithGoogle } from "@/lib/firebase";
import { Lock, User } from "lucide-react";

import ErrorDialog from "./ErrorDialog/page";
import SuccessDialog from "./SuccessDialog/page";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState({ username: "", password: "" });
  const [googleLoading, setGoogleLoading] = useState(false);

  const validateForm = () => {
    const newErrors = { username: "", password: "" };
    if (!username) {
      newErrors.username = "Username is required";
    }
    if (!password) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return !newErrors.username && !newErrors.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    try {
      const loginIdentifier = username.trim();
      const data = await userLogin(loginIdentifier, password);
      const user = data?.user || {};
      const tokens = data?.tokens || {};
      const accessToken = tokens.access || "";
      const refreshToken = tokens.refresh || "";

      if (!accessToken || !refreshToken) {
        throw new Error("Access token or refresh token missing.");
      }

      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      localStorage.setItem("username", user.username || loginIdentifier);
      localStorage.setItem("email", user.email || "");
      localStorage.setItem("phone_number", user.phone_number || "");
      localStorage.setItem(
        "is_superuser",
        String(Boolean(user.is_superuser ?? data?.is_superuser)),
      );
      localStorage.setItem(
        "session_user_type",
        String(user.user_type || data?.user_type || ""),
      );
      window.dispatchEvent(new Event("session-context-changed"));
      localStorage.removeItem("company_id");
      localStorage.removeItem("organization_id");
      localStorage.removeItem("selected_organization_name");
      localStorage.removeItem("selected_company_name");
      localStorage.removeItem("pending_company_logo_id");
      localStorage.removeItem("expiry_dialog_shown");

      setSuccessMessage("LogIn Successfully!");
      setIsSuccessDialogOpen(true);

      let postLoginRoute = "/category";
      let schoolLoginRoute = null;
      let matchedCompanyRoleRoute = false;
      let companyMainGroup = "";
      let companySubGroup = "";
      let linkedCompanyId = "";
      let hasLinkedCompanyUser = false;
      let companyUserRole = "";
      let primaryCompanyUserIsAdmin = false;
      try {
        const companyUserDetails = await getCompanyUserDetailsByUsername(
          user.username || loginIdentifier,
        ).catch(() => null);
        const primaryCompanyUser = Array.isArray(companyUserDetails?.details)
          ? companyUserDetails.details[0]
          : null;
        hasLinkedCompanyUser = Boolean(primaryCompanyUser);
        companyUserRole = String(primaryCompanyUser?.role || "").trim().toLowerCase();
        primaryCompanyUserIsAdmin = Boolean(
          primaryCompanyUser?.is_admin || primaryCompanyUser?.is_owner,
        );
        linkedCompanyId = String(
          primaryCompanyUser?.company_id ||
          primaryCompanyUser?.company ||
          "",
        ).trim();

        if (linkedCompanyId) {
          localStorage.setItem("company_id", linkedCompanyId);
        }

        let companyByUsername = null;
        if (linkedCompanyId) {
          const companyInfoResponse = await getCompanyInfo(
            linkedCompanyId,
            undefined,
            { byCompanyId: true },
          ).catch(() => null);
          companyByUsername =
            companyInfoResponse?.response?.company ||
            companyInfoResponse?.company ||
            null;
        }

        if (!companyByUsername) {
          companyByUsername = await getCompanyByUsername(
            user.username || loginIdentifier,
          );
        }
        const { data: currentUser } = await getCurrentUserStatus();
        const mainGroup = String(
          companyByUsername?.main_group ||
          currentUser?.company_details?.main_group ||
          currentUser?.company_info?.main_group ||
          user?.main_group ||
          "",
        )
          .trim()
          .toLowerCase();
        const subGroup = String(
          companyByUsername?.sub_group ||
          currentUser?.company_details?.sub_group ||
          currentUser?.company_info?.sub_group ||
          user?.sub_group ||
          "",
        )
          .trim()
          .toLowerCase();
        companyMainGroup = mainGroup;
        companySubGroup = subGroup;
        localStorage.setItem("company_main_group", mainGroup);
        localStorage.setItem("company_sub_group", subGroup);
      } catch (_error) {
        // Keep default redirect when status lookup fails.
      }

      // Any hospital company admin/owner is treated as swasthya_admin even if
      // their CompanyUser.role is still "admin" (created before the role field was added).
      if (
        companyMainGroup === "swasthya" &&
        companySubGroup === "hospital" &&
        (primaryCompanyUserIsAdmin || companyUserRole === "swasthya_admin")
      ) {
        companyUserRole = "swasthya_admin";
      }
      if (companyUserRole) {
        localStorage.setItem("company_user_role", companyUserRole);
      }

      const isCompanyUser =
        hasLinkedCompanyUser ||
        String(user?.user_type || data?.user_type || "")
          .trim()
          .toLowerCase()
          .includes("company");

      if (isCompanyUser && companyMainGroup === "swasthya" && companySubGroup === "clinic") {
        postLoginRoute = "/clinic-management/";
        matchedCompanyRoleRoute = true;
      } else if (isCompanyUser && companyMainGroup === "swasthya" && companySubGroup === "hospital") {
        postLoginRoute = companyUserRole === "swasthya_admin"
          ? "/hospital-management/admin_dashboard/"
          : "/hospital-management/administration_dashboard/";
        matchedCompanyRoleRoute = true;
      } else if (isCompanyUser && companyMainGroup === "vidya" && companySubGroup === "school") {
        postLoginRoute = "/school-management/dashboard/";
        matchedCompanyRoleRoute = true;
      } else {
        try {
          schoolLoginRoute = await getSchoolLoginRouteByUsername(
            user.username || loginIdentifier,
          );
          const companyUserRole = String(
            schoolLoginRoute?.company_user_role || "",
          )
            .trim()
            .toLowerCase();
          const matchedModel = String(
            schoolLoginRoute?.matched_model || "",
          ).trim();
          if (companyUserRole) {
            localStorage.setItem("company_user_role", companyUserRole);
          }
          if (companyUserRole === "student") {
            postLoginRoute = "/school-management";
            matchedCompanyRoleRoute = true;
          } else if (companyUserRole === "teacher") {
            postLoginRoute = "/school-management/dashboard/";
            matchedCompanyRoleRoute = true;
          } else if (companyUserRole === "admin") {
            postLoginRoute = "/school-management/teachers/";
            matchedCompanyRoleRoute = true;
          } else if (schoolLoginRoute?.post_login_route) {
            postLoginRoute = schoolLoginRoute.post_login_route;
            matchedCompanyRoleRoute = matchedModel === "CompanyUser";
          }
        } catch (_error) {
          // Keep default redirect when school login route lookup fails.
        }
      }

      if (
        isCompanyUser &&
        companyMainGroup === "vidya" &&
        companySubGroup === "school"
      ) {
        try {
          const schoolInfo = await getCurrentSchoolInfo();
          if (schoolInfo) {
            localStorage.setItem(
              "current_school_info",
              JSON.stringify(schoolInfo),
            );
            localStorage.setItem(
              "teacher_school_info",
              JSON.stringify(schoolInfo),
            );
            if (schoolInfo?.company?.id) {
              localStorage.setItem(
                "company_id",
                String(schoolInfo.company.id),
              );
            }
            if (schoolInfo?.company?.name) {
              localStorage.setItem(
                "selected_company_name",
                String(schoolInfo.company.name),
              );
            }
          }
        } catch (_error) {
          // Skip school info hydration when current user is not in school models.
        }
      }

      try {
        const organizationUsers = await getOrganizationUsersByUsername(
          user.username || loginIdentifier,
        );
        const hasOrganizationUser = Array.isArray(organizationUsers)
          && organizationUsers.some((organizationUser) => !organizationUser?.delist);
        if (hasOrganizationUser && !matchedCompanyRoleRoute) {
          postLoginRoute = "/category";
        }
      } catch (_error) {
        // Keep previously resolved redirect when organization-user lookup fails.
      }

      setTimeout(() => {
        if (
          postLoginRoute.startsWith("/school-management")
          || postLoginRoute.startsWith("/hospital-management")
          || postLoginRoute.startsWith("/clinic-management")
        ) {
          window.location.replace(postLoginRoute);
          return;
        }
        router.push(postLoginRoute);
      }, 700);
    } catch (error) {
      const responseData = error.response?.data || {};
      const detail =
        responseData.detail ||
        responseData.non_field_errors?.[0] ||
        responseData.error_description ||
        error.message ||
        "Login failed.";
      setErrorMessage(`Error: ${detail}`);
      setIsErrorDialogOpen(true);
    }
  };

  const closeErrorDialog = () => {
    setIsErrorDialogOpen(false);
  };

  const closeSuccessDialog = () => {
    setIsSuccessDialogOpen(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    try {
      const googleUser = await signInWithGoogle();

      // Check if this email is already registered
      const { exists } = await googleCheckEmail(googleUser.email);

      if (exists) {
        // Existing user → log in via Google login endpoint
        const data = await googleLogin(googleUser.email);
        const user = data?.user || {};
        const tokens = data?.tokens || {};
        const accessToken = tokens.access || "";
        const refreshToken = tokens.refresh || "";

        if (accessToken && refreshToken) {
          localStorage.setItem("access_token", accessToken);
          localStorage.setItem("refresh_token", refreshToken);
          localStorage.setItem("username", user.username || googleUser.email);
          localStorage.setItem("email", user.email || googleUser.email);
          localStorage.setItem(
            "is_superuser",
            String(Boolean(user.is_superuser ?? data?.is_superuser)),
          );
          localStorage.setItem(
            "session_user_type",
            String(user.user_type || data?.user_type || ""),
          );
          window.dispatchEvent(new Event("session-context-changed"));
          setSuccessMessage("Signed in with Google!");
          setIsSuccessDialogOpen(true);
          setTimeout(() => router.push("/category"), 700);
          return;
        }
      }

      // New Google user → go to signup form
      localStorage.setItem("google_pending_user", JSON.stringify(googleUser));
      router.push("/google-signup");
    } catch (err) {
      if (err?.code === "auth/popup-closed-by-user") {
        // User dismissed popup — no error needed
      } else {
        setErrorMessage(err?.message || "Google Sign-In failed. Please try again.");
        setIsErrorDialogOpen(true);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#154ca6_0%,#116ea5_56%,#45bf67_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(25,82,175,0.85)_0%,rgba(25,82,175,0)_45%)]" />

      <div className="relative w-full max-w-[420px] pt-14">
        <div className="absolute left-1/2 top-0 z-20 flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border border-[#67b2a5] bg-[#4ca494] shadow-[0_10px_26px_rgba(4,23,87,0.55)]">
          <User className="h-10 w-10 text-white/90 stroke-[1.7]" />
        </div>

        <div className="border-2 border-[#1a57a4] bg-[#022567] p-4 shadow-[0_26px_64px_rgba(3,27,104,0.68)]">
          <form onSubmit={handleSubmit} className="mt-9 space-y-3">
            <div>
              <div className="flex h-11 items-stretch border border-[#bcc1c9] bg-[#d8dbe0]">
                <span className="flex w-11 items-center justify-center border-r border-[#bcc1c9] bg-[#c5c9d0]">
                  <User className="h-3.5 w-3.5 text-[#5f6470]" />
                </span>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="h-full w-full bg-transparent px-3 text-[13px] text-[#616875] placeholder:text-[#98a0aa] outline-none"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-[11px] text-[#fecaca]">
                  {errors.username}
                </p>
              )}
            </div>

            <div>
              <div className="flex h-11 items-stretch border border-[#bcc1c9] bg-[#d8dbe0]">
                <span className="flex w-11 items-center justify-center border-r border-[#bcc1c9] bg-[#c5c9d0]">
                  <Lock className="h-3.5 w-3.5 text-[#5f6470]" />
                </span>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="************"
                  className="h-full w-full bg-transparent px-3 text-[13px] text-[#616875] placeholder:text-[#98a0aa] outline-none"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-[11px] text-[#fecaca]">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="flex justify-end text-[11px] text-[#b7ccdf]">
              <button
                type="button"
                onClick={() => router.push("/forgot_password")}
                className="italic transition hover:text-white"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              className="mt-1 h-11 w-full bg-[#58a596] text-sm font-bold tracking-[0.2em] text-white transition hover:bg-[#4d9588]"
            >
              LOGIN
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 h-px bg-[#2a4a8a]" />
              <span className="text-[11px] text-[#7a9bbf] uppercase tracking-widest">
                or
              </span>
              <div className="flex-1 h-px bg-[#2a4a8a]" />
            </div>

            {/* Google Sign-In button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="flex items-center justify-center gap-3 h-11 w-full border border-[#3a6abf] bg-white text-[13px] font-semibold text-[#3c3c3c] transition hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <svg
                  className="h-4 w-4 animate-spin text-[#3a6abf]"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              {googleLoading ? "Signing in…" : "Continue with Google"}
            </button>
          </form>
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
    </div>
  );
}
