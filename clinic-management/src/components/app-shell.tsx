"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { Bell, Building2, LogOut, UserRound } from "lucide-react";

type AppShellProps = {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: string;
};

function getStoredProfile() {
  if (typeof window === "undefined") {
    return {
      name: "Clinic User",
      companyName: "Clinic Workspace",
      imageUrl: "",
    };
  }

  const storedName = String(localStorage.getItem("name") || "").trim();
  const username = String(localStorage.getItem("username") || "").trim();
  const email = String(localStorage.getItem("email") || "").trim();
  const selectedCompanyName = String(
    localStorage.getItem("selected_company_name") || "",
  ).trim();

  const derivedName = storedName || username || email || "Clinic User";
  const companyName = selectedCompanyName || "";

  return {
    name: derivedName,
    companyName,
    imageUrl: "",
  };
}

export function AppShell({ title, children, actions, eyebrow }: AppShellProps) {
  const [profile, setProfile] = useState({
    name: "Clinic User",
    companyName: "Clinic Workspace",
    imageUrl: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    startTransition(() => {
      setProfile(getStoredProfile());
    });

    const accessToken = String(localStorage.getItem("access_token") || "").trim();
    if (!accessToken) {
      return;
    }

    const controller = new AbortController();

    fetch("/api/account/legacy/current-user/", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return response.json();
      })
      .then((data) => {
        const companyDetails = data?.company_details || data?.companyInfo || {};
        const resolvedName = String(
          data?.name || data?.user?.name || data?.username || "",
        ).trim();
        const resolvedCompanyName = String(
          companyDetails?.organization_name ||
            companyDetails?.company_name ||
            data?.company?.name ||
            "",
        ).trim();
        const rawImageUrl = String(data?.image_url || "").trim();

        setProfile((current) => ({
          ...current,
          name: resolvedName || current.name,
          companyName: resolvedCompanyName || current.companyName,
          imageUrl: rawImageUrl
            ? rawImageUrl.startsWith("http")
              ? rawImageUrl
              : rawImageUrl.startsWith("/")
                ? rawImageUrl
                : `/${rawImageUrl}`
            : current.imageUrl,
        }));
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          console.error("Failed to load clinic user profile image:", error);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  const initials = useMemo(() => {
    const source = profile.name.includes("@")
      ? profile.name.split("@")[0]
      : profile.name;
    const parts = source
      .split(/[\s._-]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      return "CU";
    }

    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }, [profile.name]);

  const handleLogout = () => {
    if (typeof window === "undefined") {
      return;
    }

    [
      "access_token",
      "refresh_token",
      "username",
      "email",
      "phone_number",
      "is_superuser",
      "session_user_type",
      "company_id",
      "organization_id",
      "selected_organization_name",
      "selected_company_name",
      "pending_company_logo_id",
      "expiry_dialog_shown",
      "company_options",
      "company_main_group",
      "company_sub_group",
      "app_permissions",
      "company_user_role",
      "current_school_info",
      "teacher_school_info",
    ].forEach((key) => localStorage.removeItem(key));

    window.dispatchEvent(new Event("session-context-changed"));
    window.location.replace("/login");
  };

  return (
    <section className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(247,250,252,0.82)_100%)] p-4 shadow-[0_30px_100px_rgba(12,23,37,0.12)] backdrop-blur-xl sm:p-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.14),transparent_55%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_50%)]"
      />
      <header className="relative flex flex-wrap items-center justify-between gap-4 rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,249,251,0.92)_100%)] px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:px-5">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-teal-700/70">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.04em] text-slate-950">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Clinical operations workspace for live records, appointments, and outputs.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {actions}
          <button className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50">
            <Bell className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 rounded-[22px] border border-slate-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#f4fafb_100%)] px-3 py-2 shadow-[0_14px_34px_rgba(12,23,37,0.06)]">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f766e_0%,#164e63_100%)] text-sm font-semibold text-white">
                {profile.imageUrl ? (
                  <img
                    src={profile.imageUrl}
                    alt={`${profile.name} profile`}
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0">
                {profile.companyName ? (
                  <div className="flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="truncate">{profile.companyName}</span>
                  </div>
                ) : null}
                <div className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-slate-950">
                  <UserRound className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate">{profile.name}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <div className="relative mt-4 min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}
