"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import {
  checkResetPasswordToken,
  resetUserPassword,
} from "@/app/api/apiService";

function getHashParams() {
  if (typeof window === "undefined") {
    return {};
  }
  const hash = window.location.hash || "";
  const queryIndex = hash.indexOf("?");
  if (queryIndex < 0) {
    return {};
  }
  const params = new URLSearchParams(hash.slice(queryIndex + 1));
  return Object.fromEntries(params.entries());
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const params = {
    token: searchParams.get("token") || "",
    username: searchParams.get("username") || "",
    email: searchParams.get("email") || "",
    username_hashed: searchParams.get("username_hashed") || "",
    email_hashed: searchParams.get("email_hashed") || "",
  };
  const resolvedUsername = params.username || getHashParams().username || "";

  useEffect(() => {
    const hashParams = getHashParams();
    const resolvedUsername = params.username || hashParams.username || "";
    const resolvedToken = params.token || hashParams.token || "";
    if (!resolvedUsername || !resolvedToken) {
      setStatus("error");
      setMessage("Reset link is invalid.");
      return;
    }

    const runCheck = async () => {
      try {
        const response = await checkResetPasswordToken(
          resolvedUsername,
          resolvedToken
        );
        if (response?.status === 200) {
          setStatus("ready");
          setMessage("");
        } else {
          setStatus("error");
          setMessage(response?.response || "Reset link expired.");
        }
      } catch (error) {
        setStatus("error");
        setMessage("Unable to validate reset link.");
      }
    };

    runCheck();
  }, [params.token, params.username]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!newPassword || !confirmPassword) {
      setMessage("Please enter the new password twice.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    const hashParams = getHashParams();
    const payload = {
      user_id: params.username || hashParams.username || "",
      email: params.email || hashParams.email || "",
      new_password: newPassword,
      username_hashed:
        params.username_hashed || hashParams.username_hashed || "",
      email_hashed: params.email_hashed || hashParams.email_hashed || "",
    };

    if (!payload.user_id || !payload.email) {
      setMessage("Reset link is invalid.");
      return;
    }

    try {
      setIsSaving(true);
      const response = await resetUserPassword(payload);
      if (response?.status === 200) {
        setStatus("success");
        setMessage("Password reset successfully. You can now log in.");
        setTimeout(() => {
          router.push("/");
        }, 1200);
      } else {
        setStatus("error");
        setMessage(response?.response || "Unable to reset password.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Unable to reset password.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#154ca6_0%,#116ea5_56%,#45bf67_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(25,82,175,0.85)_0%,rgba(25,82,175,0)_45%)]" />
      <svg
        className="pointer-events-none absolute bottom-0 left-1/2 w-[220%] -translate-x-1/2 text-white/18"
        viewBox="0 0 1440 320"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M0,288L48,256C96,224,192,160,288,128C384,96,480,96,576,122.7C672,149,768,203,864,218.7C960,235,1056,213,1152,197.3C1248,181,1344,171,1392,165.3L1440,160L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
        />
      </svg>

      <div className="relative w-full max-w-[420px] pt-14">
        <div className="absolute left-1/2 top-0 z-20 flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border border-[#67b2a5] bg-[#4ca494] shadow-[0_10px_26px_rgba(4,23,87,0.55)]">
          <Lock className="h-10 w-10 text-white/90 stroke-[1.7]" />
        </div>

        <div className="border-2 border-[#1a57a4] bg-[#022567] p-4 shadow-[0_26px_64px_rgba(3,27,104,0.68)]">
          <div className="mt-9 space-y-4">
            <div className="space-y-1 text-center text-white">
              <h2 className="text-2xl font-bold tracking-[0.06em]">
                RESET PASSWORD
              </h2>
              <p className="text-[12px] text-[#b7ccdf]">
                {resolvedUsername
                  ? `Create a new password for ${resolvedUsername}`
                  : "Create a new password for your account"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <div className="flex h-11 items-stretch border border-[#bcc1c9] bg-[#d8dbe0]">
                  <span className="flex w-11 items-center justify-center border-r border-[#bcc1c9] bg-[#c5c9d0]">
                    <Lock className="h-3.5 w-3.5 text-[#5f6470]" />
                  </span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="New password"
                    className="h-full w-full bg-transparent px-3 text-[13px] text-[#616875] placeholder:text-[#98a0aa] outline-none"
                    disabled={status !== "ready"}
                  />
                </div>
              </div>

              <div>
                <div className="flex h-11 items-stretch border border-[#bcc1c9] bg-[#d8dbe0]">
                  <span className="flex w-11 items-center justify-center border-r border-[#bcc1c9] bg-[#c5c9d0]">
                    <Lock className="h-3.5 w-3.5 text-[#5f6470]" />
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm password"
                    className="h-full w-full bg-transparent px-3 text-[13px] text-[#616875] placeholder:text-[#98a0aa] outline-none"
                    disabled={status !== "ready"}
                  />
                </div>
              </div>

              {message && (
                <p
                  className={`text-[11px] ${
                    status === "error"
                      ? "text-[#fecaca]"
                      : "text-[#bce5d6]"
                  }`}
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={status !== "ready" || isSaving}
                className="mt-1 h-11 w-full bg-[#58a596] text-sm font-bold tracking-[0.2em] text-white transition hover:bg-[#4d9588] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "SAVING..." : "RESET PASSWORD"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/")}
                className="h-11 w-full border border-[#93a9c3] text-sm font-semibold text-[#dbe6f2] transition hover:bg-white/8"
              >
                BACK TO LOGIN
              </button>
            </form>

            <div className="border border-[#1e5ca8] bg-[#063277] px-4 py-3 text-[11px] text-[#b7ccdf]">
              Use a strong password with letters and numbers. The reset link remains valid only for a short time.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center text-gray-600">
          Loading reset page...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
