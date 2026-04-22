"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCompanyUserDetailsByUsername,
  resetUserPassword,
  sendResetPasswordMail,
} from "@/app/api/apiService";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [usernameForReset, setUsernameForReset] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState("lookup");
  const trimmedIdentifier = identifier.trim();
  const isEmailInput =
    trimmedIdentifier.includes("@") && trimmedIdentifier.includes(".");
  const lookupButtonLabel = isEmailInput ? "Send reset link" : "Continue";

  const handleLookupSubmit = async (event) => {
    event.preventDefault();

    if (!trimmedIdentifier) {
      setError("Enter your username or email.");
      setMessage("");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      if (isEmailInput) {
        const response = await sendResetPasswordMail(
          trimmedIdentifier.toLowerCase(),
          window.location.origin,
        );
        setMessage(response?.response || "Reset link sent.");
        return;
      }

      await getCompanyUserDetailsByUsername(trimmedIdentifier);
      setUsernameForReset(trimmedIdentifier);
      setMode("username-reset");
      setError("");
      setMessage("");
    } catch (requestError) {
      const responseData = requestError.response?.data;
      setError(
        responseData?.response ||
          responseData?.error ||
          (isEmailInput
            ? "Unable to send reset link."
            : "Username not found."),
      );
      setMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUsernameResetSubmit = async (event) => {
    event.preventDefault();

    const trimmedUsername = usernameForReset.trim();
    if (!trimmedUsername) {
      setError("Username is required.");
      setMessage("");
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError("Enter the new password twice.");
      setMessage("");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setMessage("");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      const response = await resetUserPassword({
        user_id: trimmedUsername,
        email: "",
        new_password: newPassword,
      });
      if (response?.status === 200) {
        setMessage(response?.response || "Password updated successfully.");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          router.push("/");
        }, 1200);
      } else {
        setError(response?.response || "Unable to update password.");
        setMessage("");
      }
    } catch (requestError) {
      const responseData = requestError.response?.data;
      setError(responseData?.response || "Unable to update password.");
      setMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#e1f5ff] via-white to-[#d7f1ff] px-4 py-10">
      <svg
        className="pointer-events-none absolute bottom-0 left-1/2 w-[200%] -translate-x-1/2 text-[#c7e7ff]"
        viewBox="0 0 1440 320"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M0,288L48,256C96,224,192,160,288,128C384,96,480,96,576,122.7C672,149,768,203,864,218.7C960,235,1056,213,1152,197.3C1248,181,1344,171,1392,165.3L1440,160L1440,0L1392,0C1344,0,1280,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
        />
      </svg>

      <div className="relative w-full max-w-4xl">
        <div className="absolute -left-16 -top-20 h-44 w-44 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-8 h-56 w-56 rounded-full bg-teal-200/40 blur-3xl" />

        <div className="relative grid overflow-hidden rounded-[36px] border border-white/60 bg-white/80 shadow-2xl backdrop-blur-sm md:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-center bg-white/90 px-8 py-12 sm:px-12">
            <h2 className="text-3xl font-bold leading-tight text-gray-900">
              {mode === "lookup" ? "Forgot your password?" : "Create a new password"}
            </h2>
            <p className="mb-8 mt-3 text-gray-500">
              {mode === "lookup"
                ? "Enter your username or email. Username will open direct reset, email will send a reset link."
                : `Set a new password for username: ${usernameForReset}`}
            </p>

            <form
              onSubmit={
                mode === "lookup"
                  ? handleLookupSubmit
                  : handleUsernameResetSubmit
              }
              className="space-y-5"
            >
              {mode === "lookup" ? (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Username or email
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(event) => {
                      setIdentifier(event.target.value);
                      if (error) {
                        setError("");
                      }
                      if (message) {
                        setMessage("");
                      }
                    }}
                    placeholder="Enter username or email"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      New password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value);
                        if (error) {
                          setError("");
                        }
                        if (message) {
                          setMessage("");
                        }
                      }}
                      placeholder="New password"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Confirm password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        if (error) {
                          setError("");
                        }
                        if (message) {
                          setMessage("");
                        }
                      }}
                      placeholder="Confirm password"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </>
              )}

              {message && <p className="text-sm text-emerald-700">{message}</p>}
              {error && <p className="text-sm text-rose-600">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#0ea5a5] py-3 font-semibold text-white shadow-md transition hover:bg-[#0b8c8c] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting
                  ? mode === "lookup"
                    ? "Processing..."
                    : "Updating..."
                  : mode === "lookup"
                    ? lookupButtonLabel
                    : "Update password"}
              </button>

              {mode === "username-reset" && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("lookup");
                    setUsernameForReset("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setError("");
                    setMessage("");
                  }}
                  className="w-full rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Use another username or email
                </button>
              )}

              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-full rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Back to login
              </button>
            </form>
          </div>

          <div className="relative hidden flex-col items-center justify-center gap-6 rounded-l-[48px] bg-gradient-to-br from-white via-[#f3f8ff] to-[#e7f3ff] px-12 py-12 md:flex">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/white-diamond.png')] opacity-30" />
              <svg
                className="absolute -right-36 -top-24 w-[150%] text-[#d5ecff]"
                viewBox="0 0 600 400"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M0,160L40,154.7C80,149,160,139,240,170.7C320,203,400,277,480,277.3C560,277,640,203,720,186.7C800,171,880,213,960,218.7C1040,224,1120,192,1200,165.3C1280,139,1360,117,1400,106.7L1440,96L1440,0L1400,0C1360,0,1280,0,1200,0C1120,0,1040,0,960,0C880,0,800,0,720,0C640,0,560,0,480,0C400,0,320,0,240,0C160,0,80,0,40,0L0,0Z"
                />
              </svg>
            </div>

            <div className="relative z-10 rounded-3xl border border-white bg-white/80 p-6 text-center shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Account recovery
              </p>
              <ul className="mt-4 space-y-3 text-sm text-gray-700">
                <li>Enter a username to reset directly on this page.</li>
                <li>Enter an email to receive a reset link in your inbox.</li>
                <li>Choose a strong new password before signing in again.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
