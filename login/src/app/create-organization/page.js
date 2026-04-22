"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getOrganizations,
  provisionOrganization,
  sendOrganizationEmailOtp,
  verifyOrganizationEmailOtp,
} from "@/app/api/apiService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const createEmptyForm = () => ({
  name: "",
  org_code: "",
  admin_name: "",
  username: "",
  email: "",
  phone_number: "",
  address: "",
  city: "",
  state: "",
  country: "",
  postal_code: "",
});

const sanitizeUsernamePart = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const sanitizeOrgCode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 6);

const getUsernameBase = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) {
    return "";
  }
  return sanitizeUsernamePart(raw.split(".")[0] || "");
};

const buildOrgCodeCandidates = (name) => {
  const cleaned = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) {
    return [];
  }

  const words = cleaned.split(" ").filter(Boolean);
  const lettersOnly = cleaned.replace(/\s/g, "");
  const candidates = [];

  if (words.length >= 3) {
    candidates.push(words[0][0] + words[1][0] + words[2][0]);
    candidates.push(words[0][0] + words[1][0] + words[2][0] + (words[3]?.[0] || ""));
  } else if (words.length === 2) {
    const [first, second] = words;
    candidates.push(first[0] + second.slice(0, 2));
    candidates.push(first.slice(0, 2) + second[0]);
    candidates.push(first[0] + second[0] + second.slice(-1));
    candidates.push(first[0] + second.slice(0, 3));
  } else if (words.length === 1) {
    const [word] = words;
    candidates.push(word.slice(0, 3));
    candidates.push(word.slice(0, 4));
    if (word.length >= 4) {
      candidates.push(word.slice(0, 2) + word.slice(-2));
    }
  }

  if (lettersOnly.length >= 3) {
    candidates.push(lettersOnly.slice(0, 3));
    candidates.push(lettersOnly.slice(-3));
  }
  if (lettersOnly.length >= 4) {
    candidates.push(lettersOnly.slice(0, 4));
    candidates.push(lettersOnly.slice(-4));
  }

  return Array.from(
    new Set(
      candidates
        .map((item) => sanitizeOrgCode(item))
        .filter((item) => item.length >= 3),
    ),
  );
};

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState([]);
  const [form, setForm] = useState(createEmptyForm);
  const [orgCodeTouched, setOrgCodeTouched] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isOtpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      setOrganizations([]);
      return;
    }

    let mounted = true;
    const loadOrganizations = async () => {
      try {
        const response = await getOrganizations();
        if (mounted) {
          setOrganizations(Array.isArray(response) ? response : []);
        }
      } catch (_error) {
        if (mounted) {
          setOrganizations([]);
        }
      }
    };

    loadOrganizations();
    return () => {
      mounted = false;
    };
  }, [router]);

  const existingOrgCodes = useMemo(() => {
    const codes = new Set();

    organizations.forEach((organization) => {
      [
        organization?.username,
        organization?.admin_user_name,
        organization?.admin_username,
        organization?.admin_user,
        organization?.admin_user_display,
      ].forEach((value) => {
        const raw = String(value || "").toLowerCase();
        if (!raw.includes(".")) {
          return;
        }
        const suffix = sanitizeOrgCode(raw.split(".").pop());
        if (suffix) {
          codes.add(suffix);
        }
      });
    });

    return codes;
  }, [organizations]);

  const getUniqueOrgCode = useCallback((name) => {
    const candidates = buildOrgCodeCandidates(name);
    for (const candidate of candidates) {
      if (!existingOrgCodes.has(candidate)) {
        return candidate;
      }
    }

    const fallbackBase = sanitizeOrgCode(
      candidates[0] || String(name || "").slice(0, 4) || "org",
    ) || "org";
    let suffix = 1;
    let nextCode = `${fallbackBase}${suffix}`;
    while (existingOrgCodes.has(nextCode)) {
      suffix += 1;
      nextCode = `${fallbackBase}${suffix}`;
    }
    return nextCode.slice(0, 6);
  }, [existingOrgCodes]);

  useEffect(() => {
    if (!form.name || orgCodeTouched) {
      return;
    }

    const nextCode = getUniqueOrgCode(form.name);
    if (!nextCode) {
      return;
    }

    setForm((prev) => (prev.org_code === nextCode ? prev : { ...prev, org_code: nextCode }));
  }, [form.name, getUniqueOrgCode, orgCodeTouched]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      if (name === "org_code") {
        setOrgCodeTouched(true);
        return { ...prev, org_code: value };
      }

      if (name === "name" && !orgCodeTouched) {
        return {
          ...prev,
          name: value,
          org_code: getUniqueOrgCode(value),
        };
      }

      return { ...prev, [name]: value };
    });

    if (name === "email") {
      const normalizedEmail = String(value || "").trim().toLowerCase();
      if (normalizedEmail !== verifiedEmail) {
        setVerifiedEmail("");
        setOtpValue("");
        setOtpError("");
        setOtpMessage("");
      }
    }
  };

  const handleUsernameBlur = () => {
    setForm((prev) => {
      const base = getUsernameBase(prev.username);
      const orgCode = sanitizeOrgCode(prev.org_code);
      if (!base || !orgCode) {
        return prev;
      }

      const nextUsername = `${base}.${orgCode}`;
      return nextUsername === prev.username ? prev : { ...prev, username: nextUsername };
    });
  };

  const handleOrgCodeBlur = () => {
    setForm((prev) => {
      const sanitized = sanitizeOrgCode(prev.org_code);
      const base = getUsernameBase(prev.username);
      const nextUsername = base && sanitized ? `${base}.${sanitized}` : prev.username;
      if (sanitized === prev.org_code && nextUsername === prev.username) {
        return prev;
      }

      return {
        ...prev,
        org_code: sanitized,
        username: nextUsername,
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = form.email.trim().toLowerCase();
    if (!normalizedEmail || verifiedEmail !== normalizedEmail) {
      setError("Verify email before creating organization.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      org_code: sanitizeOrgCode(form.org_code),
      admin_name: form.admin_name.trim(),
      username: getUsernameBase(form.username),
      email: normalizedEmail,
      phone_number: form.phone_number.trim(),
      password: "abc123",
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      country: form.country.trim(),
      postal_code: form.postal_code.trim(),
    };

    if (!payload.name) {
      setError("Organization name is required.");
      return;
    }
    if (!payload.org_code) {
      setError("Organization code is required.");
      return;
    }
    if (!payload.admin_name) {
      setError("Admin name is required.");
      return;
    }
    if (!payload.username) {
      setError("Username is required.");
      return;
    }
    if (!payload.email) {
      setError("Email is required.");
      return;
    }
    if (!payload.phone_number) {
      setError("Phone number is required.");
      return;
    }
    try {
      setIsSubmitting(true);
      await provisionOrganization(payload);
      startTransition(() => {
        router.push("/");
      });
    } catch (submitError) {
      const responseData = submitError.response?.data;
      const detail =
        responseData?.detail ||
        responseData?.error ||
        responseData?.message ||
        responseData?.name?.[0] ||
        responseData?.username?.[0] ||
        responseData?.email?.[0] ||
        responseData?.phone_number?.[0] ||
        responseData?.password?.[0] ||
        (typeof responseData === "string" ? responseData : null) ||
        submitError.message ||
        "Unable to create organization.";
      setError(String(detail));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    const normalizedEmail = form.email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }

    try {
      setIsSendingOtp(true);
      setError("");
      setOtpError("");
      setOtpMessage("");
      await sendOrganizationEmailOtp(normalizedEmail);
      setOtpDialogOpen(true);
      setOtpMessage(`OTP sent to ${normalizedEmail}.`);
    } catch (requestError) {
      const responseData = requestError.response?.data;
      setError(
        responseData?.detail ||
          responseData?.error ||
          "Unable to send OTP.",
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    const normalizedEmail = form.email.trim().toLowerCase();
    if (!normalizedEmail) {
      setOtpError("Email is required.");
      return;
    }
    if (!otpValue.trim()) {
      setOtpError("Enter OTP.");
      return;
    }

    try {
      setIsVerifyingOtp(true);
      setOtpError("");
      const response = await verifyOrganizationEmailOtp(
        normalizedEmail,
        otpValue.trim(),
      );
      setVerifiedEmail(normalizedEmail);
      setOtpMessage(response?.detail || "Email verified successfully.");
      setOtpValue("");
      setOtpDialogOpen(false);
    } catch (requestError) {
      const responseData = requestError.response?.data;
      setOtpError(
        responseData?.detail ||
          responseData?.error ||
          "Unable to verify OTP.",
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const normalizedEmail = form.email.trim().toLowerCase();
  const isEmailVerified = Boolean(normalizedEmail) && verifiedEmail === normalizedEmail;
  const isBusy = isSubmitting || isPending;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_28%),linear-gradient(180deg,_#eef6ff_0%,_#ffffff_42%,_#e9eef7_100%)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[32px] border border-white/80 bg-white/92 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-md sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Organization Details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Use the same fields from the previous modal, now as a dedicated page.
                </p>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                New Provisioning API
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  <span>Organization name</span>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="Acme School"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  <span>Org code</span>
                  <input
                    type="text"
                    name="org_code"
                    value={form.org_code}
                    onChange={handleFormChange}
                    onBlur={handleOrgCodeBlur}
                    placeholder="acs"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                  <span className="text-xs text-slate-400">
                    Auto-generated from organization name. You can edit it.
                  </span>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  <span>Admin name</span>
                  <input
                    type="text"
                    name="admin_name"
                    value={form.admin_name}
                    onChange={handleFormChange}
                    placeholder="Organization Admin"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  <span>Username</span>
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleFormChange}
                    onBlur={handleUsernameBlur}
                    placeholder="acme_admin"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                  <span className="text-xs text-slate-400">
                    Username will be stored as `username.orgcode`.
                  </span>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  <span>Email</span>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleFormChange}
                      placeholder="contact@acme-school.com"
                      required
                      className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp || !normalizedEmail}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSendingOtp ? "Sending..." : isEmailVerified ? "Verified" : "Verify"}
                    </button>
                  </div>
                  <span className={isEmailVerified ? "text-xs text-emerald-600" : "text-xs text-slate-400"}>
                    {isEmailVerified
                      ? "Email verified. You can create the organization."
                      : "Verify email with OTP before creating organization."}
                  </span>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  <span>Phone number</span>
                  <input
                    type="text"
                    name="phone_number"
                    value={form.phone_number}
                    onChange={handleFormChange}
                    placeholder="9888888888"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  <span>Address</span>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleFormChange}
                    placeholder="MG Road"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  <span>City</span>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleFormChange}
                    placeholder="Pune"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  <span>State</span>
                  <input
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={handleFormChange}
                    placeholder="Maharashtra"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  <span>Country</span>
                  <input
                    type="text"
                    name="country"
                    value={form.country}
                    onChange={handleFormChange}
                    placeholder="India"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  <span>Postal code</span>
                  <input
                    type="text"
                    name="postal_code"
                    value={form.postal_code}
                    onChange={handleFormChange}
                    placeholder="411001"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </label>
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => router.push("/super-admin")}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy || !isEmailVerified}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isBusy ? "Creating..." : "Create organization"}
                </button>
              </div>
            </form>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-white/80 bg-slate-900 p-6 text-slate-50 shadow-[0_28px_60px_rgba(15,23,42,0.24)]">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300">
                Submission Flow
              </p>
              <h3 className="mt-3 text-2xl font-semibold">One request, three records.</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                The page now provisions the organization, admin login user, and organization user profile in a single backend transaction.
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                Preview
              </p>
              <dl className="mt-4 space-y-4 text-sm">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <dt className="text-slate-500">Login username</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {getUsernameBase(form.username) && sanitizeOrgCode(form.org_code)
                      ? `${getUsernameBase(form.username)}.${sanitizeOrgCode(form.org_code)}`
                      : "username.orgcode"}
                  </dd>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <dt className="text-slate-500">Organization code</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {sanitizeOrgCode(form.org_code) || "Generated automatically"}
                  </dd>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <dt className="text-slate-500">Initial status</dt>
                  <dd className="mt-1 font-semibold text-emerald-700">Approved and active</dd>
                </div>
              </dl>
            </div>
          </aside>
        </section>
      </div>

      <Dialog open={isOtpDialogOpen} onOpenChange={setOtpDialogOpen}>
        <DialogContent className="max-w-md rounded-[28px] border border-slate-200 bg-white p-0">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-xl text-slate-900">Verify Email</DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Enter the OTP sent to {normalizedEmail || "your email"}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                <span>OTP</span>
                <input
                  type="text"
                  value={otpValue}
                  onChange={(event) => {
                    setOtpValue(event.target.value);
                    if (otpError) {
                      setOtpError("");
                    }
                  }}
                  placeholder="Enter 6-digit OTP"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </label>

              {otpError ? <p className="text-sm text-rose-600">{otpError}</p> : null}
              {otpMessage ? <p className="text-sm text-emerald-600">{otpMessage}</p> : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSendingOtp ? "Sending..." : "Resend OTP"}
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingOtp}
                  className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isVerifyingOtp ? "Verifying..." : "Verify"}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
