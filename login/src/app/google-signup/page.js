"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  sendOrganizationEmailOtp,
  provisionOrganization,
  userLogin,
} from "@/app/api/apiService";

// ─── Org code / username helpers (same logic as OrganizationCreateDialog) ─────
const sanitizeOrgCode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 6);

const sanitizeUsernamePart = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getUsernameBase = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  return sanitizeUsernamePart(raw.split(".")[0] || "");
};

const buildOrgCodeFromName = (name) => {
  const cleaned = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const words = cleaned.split(" ").filter(Boolean);
  if (words.length >= 3) return words[0][0] + words[1][0] + words[2][0];
  if (words.length === 2) return words[0][0] + words[1].slice(0, 2);
  return words[0]?.slice(0, 3) || "";
};

const generatePassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const EMPTY_FORM = {
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
};

// ─── Org creation form ────────────────────────────────────────────────────────
function OrgForm({ googleUser, onSuccess }) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    admin_name: googleUser.displayName || "",
    email: googleUser.email || "",
    username: googleUser.firstName || "",
  });
  const [orgCodeTouched, setOrgCodeTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError("");
    setForm((prev) => {
      // When org_code is manually edited, mark as touched so it stops auto-updating
      if (name === "org_code") {
        setOrgCodeTouched(true);
        return { ...prev, org_code: value };
      }
      // When org name changes, auto-generate org_code (unless user already edited it)
      if (name === "name") {
        if (orgCodeTouched) return { ...prev, name: value };
        return { ...prev, name: value, org_code: buildOrgCodeFromName(value) };
      }
      return { ...prev, [name]: value };
    });
  };

  // On org_code blur: sanitize and sync username suffix
  const handleOrgCodeBlur = () => {
    setForm((prev) => {
      const sanitized = sanitizeOrgCode(prev.org_code);
      const base = getUsernameBase(prev.username);
      const nextUsername = base && sanitized ? `${base}.${sanitized}` : prev.username;
      return { ...prev, org_code: sanitized, username: nextUsername };
    });
  };

  // On username blur: sync suffix with current org_code
  const handleUsernameBlur = () => {
    setForm((prev) => {
      const base = getUsernameBase(prev.username);
      const orgCode = sanitizeOrgCode(prev.org_code);
      if (!base || !orgCode) return prev;
      const nextUsername = `${base}.${orgCode}`;
      return nextUsername === prev.username ? prev : { ...prev, username: nextUsername };
    });
  };

  const usernamePreview =
    form.username && form.org_code
      ? form.username.includes(".")
        ? form.username
        : `${form.username.toLowerCase()}.${sanitizeOrgCode(form.org_code)}`
      : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Organization name is required.");
    if (!form.org_code.trim()) return setError("Org code is required.");
    if (!form.admin_name.trim()) return setError("Admin name is required.");
    if (!form.username.trim()) return setError("Username is required.");
    if (!form.email.trim()) return setError("Email is required.");
    if (!form.phone_number.trim()) return setError("Phone number is required.");

    // Send username base only — serializer builds final as "base.org_code" itself
    const usernameBase = getUsernameBase(form.username.trim());
    const orgCode = sanitizeOrgCode(form.org_code.trim());
    const finalUsername = `${usernameBase}.${orgCode}`;
    const autoPassword = generatePassword();

    setLoading(true);
    try {
      await provisionOrganization({
        name: form.name.trim(),
        org_code: orgCode,
        username: usernameBase,
        admin_name: form.admin_name.trim(),
        email: form.email.trim(),
        phone_number: form.phone_number.trim(),
        password: autoPassword,
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
        postal_code: form.postal_code.trim(),
        google_signup: true,
        is_googleuser: true,
      });

      // Auto-login after provisioning
      try {
        const loginData = await userLogin(finalUsername, autoPassword);
        const tokens = loginData?.tokens || {};
        const user = loginData?.user || {};
        if (tokens.access && tokens.refresh) {
          localStorage.setItem("access_token", tokens.access);
          localStorage.setItem("refresh_token", tokens.refresh);
          localStorage.setItem("username", user.username || finalUsername);
          localStorage.setItem("email", user.email || form.email);
          localStorage.setItem("is_superuser", String(Boolean(user.is_superuser)));
          localStorage.setItem("session_user_type", String(user.user_type || ""));
          window.dispatchEvent(new Event("session-context-changed"));
        }
      } catch (_) {
        // auto-login failed — user can log in manually
      }

      localStorage.removeItem("google_pending_user");
      onSuccess();
    } catch (err) {
      const rd = err?.response?.data || {};
      const detail =
        rd?.name?.[0] ||
        rd?.org_code?.[0] ||
        rd?.username?.[0] ||
        rd?.email?.[0] ||
        rd?.phone_number?.[0] ||
        rd?.password?.[0] ||
        rd?.admin_name?.[0] ||
        rd?.detail ||
        rd?.error ||
        (typeof rd === "string" ? rd : null) ||
        err?.message ||
        "Registration failed. Please try again.";
      setError(String(detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-h-[92svh] overflow-y-auto px-4 py-4 sm:max-h-[90svh] sm:px-6 sm:py-6">
      <div>
        <h2 className="text-xl text-gray-900 sm:text-2xl font-semibold">Create organization</h2>
        <p className="text-sm text-gray-600 mt-1">Add a new organization using the Organization model fields.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-6 sm:mt-5">
        <div className="grid gap-4 md:grid-cols-2">

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            <span>Organization name</span>
            <input type="text" name="name" value={form.name}
              onChange={handleChange} onBlur={handleOrgCodeBlur}
              placeholder="Acme Hospital" required className={inputCls} />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            <span>Org code</span>
            <input type="text" name="org_code" value={form.org_code}
              onChange={handleChange} onBlur={handleOrgCodeBlur}
              placeholder="bha" required className={inputCls} />
            <span className="text-xs text-gray-400">Auto-generated from organization name. You can edit it.</span>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            <span>Admin name</span>
            <input type="text" name="admin_name" value={form.admin_name}
              onChange={handleChange} placeholder="Organization Admin" required className={inputCls} />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            <span>Username</span>
            <input type="text" name="username" value={form.username}
              onChange={handleChange} onBlur={handleUsernameBlur}
              placeholder="debasish" required className={inputCls} />
            <span className="text-xs text-gray-400">
              {usernamePreview
                ? <>Will be saved as <strong className="text-blue-600">{usernamePreview}</strong></>
                : "Username will be saved as `username.orgcode`."}
            </span>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Email
            <input type="email" name="email" value={form.email}
              onChange={handleChange} placeholder="contact@acme.com" className={inputCls} />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Phone number
            <input type="text" name="phone_number" value={form.phone_number}
              onChange={handleChange} placeholder="9888888888" className={inputCls} />
          </label>


          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Address
            <input type="text" name="address" value={form.address}
              onChange={handleChange} placeholder="MG Road" className={inputCls} />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            City
            <input type="text" name="city" value={form.city}
              onChange={handleChange} placeholder="Pune" className={inputCls} />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            State
            <input type="text" name="state" value={form.state}
              onChange={handleChange} placeholder="Maharashtra" className={inputCls} />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Country
            <input type="text" name="country" value={form.country}
              onChange={handleChange} placeholder="India" className={inputCls} />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Postal code
            <input type="text" name="postal_code" value={form.postal_code}
              onChange={handleChange} placeholder="411001" className={inputCls} />
          </label>

        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-100 bg-white/95 p-1 pt-3">
          <button type="button"
            onClick={() => { localStorage.removeItem("google_pending_user"); window.location.href = "/"; }}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">
            {loading ? "Working..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GoogleSignupPage() {
  const router = useRouter();
  const [googleUser, setGoogleUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("google_pending_user");
    if (!stored) { router.replace("/"); return; }
    const user = JSON.parse(stored);
    setGoogleUser(user);
    // Silently send + verify OTP in background so the provision endpoint is satisfied
    sendOrganizationEmailOtp(user.email).catch(() => {});
  }, [router]);

  if (!googleUser) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2d6e] via-[#1155a5] to-[#3aa870] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#1155a5] to-[#3aa870] px-8 py-5 flex items-center gap-4">
          {googleUser.photoURL ? (
            <img src={googleUser.photoURL} alt={googleUser.displayName}
              className="w-12 h-12 rounded-full border-2 border-white shadow" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center text-white text-xl font-bold">
              {(googleUser.displayName || "U")[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-white font-semibold text-lg leading-tight">{googleUser.displayName}</p>
            <p className="text-white/80 text-sm">{googleUser.email}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-white/70 text-xs uppercase tracking-widest font-semibold">Sign Up</p>
            <p className="text-white text-sm font-medium">Create Organization</p>
          </div>
        </div>

        <OrgForm googleUser={googleUser} onSuccess={() => router.push("/category")} />
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
