"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  clearLoginSession,
  getCurrentUserStatus,
  getOrganizationUserDetails,
  getCurrentSchoolInfo,
  getCompanyInfo,
} from "@/app/api/apiService";
import { UserCircle2 } from "lucide-react";

const isAbsoluteUrl = (value) =>
  /^https?:\/\//i.test(value || "") || /^data:/i.test(value || "");

const stripApiMediaPrefix = (value) => {
  if (!value) {
    return value;
  }
  return value
    .replace(
      /^(https?:\/\/[^/]+)\/api\/(media\/.*)$/i,
      (_match, origin, rest) => `${origin}/${rest}`,
    )
    .replace(/^\/api\/(media\/.*)$/i, "/$1")
    .replace(/^api\/(media\/.*)$/i, "/$1");
};

const resolveMediaUrl = (value) => {
  if (!value) {
    return "";
  }
  const stripped = stripApiMediaPrefix(value);
  if (isAbsoluteUrl(stripped)) {
    return stripped;
  }
  const normalized = String(stripped).replace(/^\/+/, "");
  return normalized ? `/${normalized}` : "";
};

function LogoMark({ imageUrl = "", fallback = "P" }) {
  return (
    <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0ea5e9,#38bdf8)] text-sm font-bold text-white shadow-[0_20px_40px_-24px_rgba(14,165,233,0.8)]">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Organization logo"
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.4),transparent_55%)]" />
          <span className="relative">{fallback}</span>
        </>
      )}
    </span>
  );
}

export default function Header({ showOnlyOnHome = false, hideOnPaths = [] }) {
  const headerRef = useRef(null);
  const profileMenuRef = useRef(null);
  const router = useRouter();
  const [schoolInfo, setSchoolInfo] = useState({
    username: "",
    schoolName: "",
    roleLabel: "",
    level: "",
    userTypeLabel: "",
    avatarUrl: "",
    organizationLogoUrl: "",
  });
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isAdminMenuOpen, setAdminMenuOpen] = useState(false);
  const [isOrganizationInfoVideoOpen, setIsOrganizationInfoVideoOpen] =
    useState(false);
  const pathname = usePathname();
  const isHomeRoute = pathname === "/";
  const isVidyaRoute = pathname?.startsWith("/category/vidya");
  const shouldHideForCurrentPath = hideOnPaths.some((path) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  });
  const shouldHideHeader = (showOnlyOnHome && !isHomeRoute) || shouldHideForCurrentPath;
  const triggerHeaderMenuAction = (action) => {
    if (typeof window === "undefined") {
      return;
    }
    window.dispatchEvent(
      new CustomEvent("header-profile-menu-action", {
        detail: { action },
      }),
    );
  };
  const closeOrganizationInfoVideoModal = () => {
    setIsOrganizationInfoVideoOpen(false);
    setProfileMenuOpen(false);
    setAdminMenuOpen(false);
  };

  useEffect(() => {
    let mounted = true;

    getCurrentSchoolInfo()
      .then((data) => {
        if (!mounted || !data) {
          return;
        }
        setSchoolInfo({
          username: data.username || "",
          schoolName: data.school?.name || data.company?.name || "",
          roleLabel: "",
          level: "",
          userTypeLabel: "",
          avatarUrl: "",
          organizationLogoUrl:
            resolveMediaUrl(
              data?.school?.image_url ||
                data?.school?.logo_url ||
                data?.company?.image_url ||
                data?.company?.logo_url ||
                data?.company_thumbnail_image_url ||
                "",
            ),
        });
      })
      .catch(() => {
        // swallow and keep defaults
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const resetSchoolInfo = () => {
      setSchoolInfo({
        username: "",
        schoolName: "",
        roleLabel: "",
        level: "",
        userTypeLabel: "",
        avatarUrl: "",
        organizationLogoUrl: "",
      });
    };
    const syncSchoolInfo = async () => {
      try {
        const { data: currentUser, status } = await getCurrentUserStatus();
        if (!mounted) {
          return;
        }
        if (!currentUser || (status && status >= 400)) {
          resetSchoolInfo();
          return;
        }
        
        const userDetails = currentUser?.user || {};
        const companyDetails = currentUser?.company_details || {};
        const normalizedUserType = String(
          currentUser?.user_type || userDetails?.user_type || "",
        ).toLowerCase();
        const isOrganizationUser = normalizedUserType.startsWith("organization");
        const isCompanyUser = normalizedUserType.startsWith("company");
        const userTypeLabel = isOrganizationUser
          ? "ORGANIZATION USER"
          : isCompanyUser
            ? "COMPANY USER"
            : "";
        const normalizedRole = String(userDetails.role || "")
          .trim()
          .toLowerCase();
        const isSuperuser = localStorage.getItem("is_superuser") === "true";
        const sessionUsername =
          userDetails.username || localStorage.getItem("username") || "";
        let organizationUserDetails = null;
        if (!isSuperuser && sessionUsername) {
          try {
            organizationUserDetails = await getOrganizationUserDetails(
              sessionUsername,
            );
            console.log("organizationUserDetails=====>", organizationUserDetails);
            
          } catch (_error) {
            organizationUserDetails = null;
          }
        }
        const isAdminRole =
          isSuperuser ||
          userDetails.is_admin === true ||
          userDetails.is_owner === true ||
          normalizedRole.includes("admin");
        const isManagerRole = userDetails.is_manager === true;
        const rawRoleLabel =
          organizationUserDetails?.role ||
          userDetails.role ||
          (isAdminRole ? "Admin" : isManagerRole ? "Manager" : "");
        const roleLabel = String(rawRoleLabel || "").toUpperCase();
        let organizationLogoUrl = "";
        const resolvedCompanyId =
          currentUser?.user?.company_id ||
          currentUser?.company_details?.id ||
          Number(localStorage.getItem("organization_id") || 0) ||
          Number(localStorage.getItem("company_id") || 0) ||
          null;

        if (resolvedCompanyId) {
          try {
            const companyInfoResponse = await getCompanyInfo(resolvedCompanyId);
            const base64LogoUrl =
              companyInfoResponse?.response?.company_thumbnail_image_url || "";
            const imageDetails = companyInfoResponse?.response?.image_details || [];
            const logoAttachment = imageDetails?.[0];
            const rawLogoValue =
              logoAttachment?.url ||
              logoAttachment?.image_url ||
              logoAttachment?.base_64_image ||
              companyDetails?.image_url ||
              companyDetails?.logo_url ||
              "";
            organizationLogoUrl = resolveMediaUrl(base64LogoUrl || rawLogoValue);
          } catch (_error) {
            organizationLogoUrl = resolveMediaUrl(
              companyDetails?.image_url || companyDetails?.logo_url || "",
            );
          }
        }

        setSchoolInfo((prev) => ({
          username: userDetails.name || userDetails.username || "",
          schoolName:
            companyDetails.organization_name || companyDetails.company_name || "",
          roleLabel: roleLabel || prev.roleLabel,
          level:
            organizationUserDetails?.level || userDetails.level || prev.level || "",
          userTypeLabel,
          avatarUrl: resolveMediaUrl(userDetails.image_url || ""),
          organizationLogoUrl:
            organizationLogoUrl || prev.organizationLogoUrl || "",
        }));
      } catch (_error) {
        if (mounted) {
          resetSchoolInfo();
        }
      }
    };

    syncSchoolInfo();
    window.addEventListener("session-context-changed", syncSchoolInfo);

    return () => {
      mounted = false;
      window.removeEventListener("session-context-changed", syncSchoolInfo);
    };
  }, []);

  // if (showOnlyOnHome && !isHomeRoute) {
  //   return null;
  // }

  // const shouldHideLoginRoute =
  //   hideOnLogin && (pathname === "/login" || pathname.startsWith("/login/"));
  // const shouldHideRegisterRoute =
  //   hideOnRegister &&
  //   (pathname === "/register" || pathname.startsWith("/register/"));
  // const shouldHideDashboardRoute =
  //   hideOnDashboard &&
  //   (pathname === "/dashboard" || pathname.startsWith("/dashboard/"));

  // if (
  //   shouldHideLoginRoute ||
  //   shouldHideRegisterRoute ||
  //   shouldHideDashboardRoute
  // ) {
  //   return null;
  // }

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }
    if (shouldHideHeader) {
      document.documentElement.style.setProperty("--app-header-height", "0px");
      document.body.classList.add("app-header-hidden");
      return () => {
        document.body.classList.remove("app-header-hidden");
      };
    }
    document.body.classList.remove("app-header-hidden");
    if (!headerRef.current) {
      return undefined;
    }
    const syncHeaderHeight = () => {
      const nextHeight = Math.ceil(headerRef.current?.getBoundingClientRect().height || 74);
      document.documentElement.style.setProperty("--app-header-height", `${nextHeight}px`);
    };
    syncHeaderHeight();
    const observer = new ResizeObserver(syncHeaderHeight);
    observer.observe(headerRef.current);
    window.addEventListener("resize", syncHeaderHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeaderHeight);
    };
  }, [shouldHideHeader]);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return undefined;
    }
    const handleClickOutside = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
        setAdminMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  if (shouldHideHeader) {
    return null;
  }

  return (
    <header
      ref={headerRef}
      className="fixed inset-x-0 top-0 z-[100] border-b border-white/70 bg-[linear-gradient(180deg,rgba(248,252,255,0.96),rgba(239,247,255,0.92))] shadow-[0_18px_50px_-34px_rgba(15,23,42,0.25)] backdrop-blur-xl"
    >
      <div className="mx-auto flex h-[82px] w-full items-center justify-between px-4 md:px-6 lg:px-8">
        <Link href="/category" className="flex min-w-0 items-center gap-3 no-underline">
          <LogoMark
            imageUrl={schoolInfo.organizationLogoUrl}
            fallback={(schoolInfo.schoolName || "P").trim().charAt(0).toUpperCase()}
          />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-600">
              Organization
            </p>
            <span className="block truncate text-[22px] font-semibold leading-none tracking-[-0.02em] text-slate-900 max-[640px]:text-[18px]">
              {schoolInfo.schoolName || "PhenxOrganization"}
            </span>
          </div>
        </Link>
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className="flex items-center gap-3 rounded-[20px] border border-white/80 bg-white/72 px-3 py-2 text-slate-800 shadow-[0_14px_32px_-22px_rgba(15,23,42,0.3)] backdrop-blur transition hover:bg-white/90"
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(56,189,248,0.32))] text-sky-700">
              {schoolInfo.avatarUrl ? (
                <img
                  src={schoolInfo.avatarUrl}
                  alt={`${schoolInfo.username || "User"} avatar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserCircle2 className="h-6 w-6" />
              )}
            </div>
            <div className="hidden text-left sm:block">
              <span className="block max-w-[220px] truncate text-[14px] font-semibold leading-none">
                {schoolInfo.username || "User"}
              </span>
              <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                {schoolInfo.userTypeLabel || "Workspace"}
              </span>
            </div>
            {schoolInfo.roleLabel ? (
              <span className="hidden rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-sky-700 sm:inline-flex">
                {schoolInfo.roleLabel}
                {schoolInfo.level ? (
                  <span className="ml-1 text-[9px] font-semibold text-sky-800/70">
                    {schoolInfo.level}
                  </span>
                ) : null}
              </span>
            ) : null}
          </button>

          {isProfileMenuOpen ? (
            <div className="absolute right-0 z-[120] mt-3 w-72 rounded-[26px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,246,255,0.94))] p-3 text-sm text-slate-700 shadow-[0_28px_70px_-36px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <div className="mb-2 rounded-[22px] border border-white/80 bg-white/72 p-3 shadow-[0_16px_32px_-24px_rgba(15,23,42,0.2)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(56,189,248,0.32))] text-sky-700">
                    {schoolInfo.avatarUrl ? (
                      <img
                        src={schoolInfo.avatarUrl}
                        alt={`${schoolInfo.username || "User"} avatar`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserCircle2 className="h-7 w-7" />
                    )}
                  </div>
                  <div>
                    <span className="block max-w-[190px] truncate text-[15px] font-semibold text-slate-800">
                    {schoolInfo.username || "User"}
                    </span>
                    {schoolInfo.userTypeLabel ? (
                      <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                        {schoolInfo.userTypeLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
                {schoolInfo.roleLabel || schoolInfo.userTypeLabel ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {schoolInfo.roleLabel ? (
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-sky-700">
                        {schoolInfo.roleLabel}
                        {schoolInfo.level ? (
                          <span className="ml-1 text-[9px] font-semibold text-sky-800/70">
                            {schoolInfo.level}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                    {schoolInfo.userTypeLabel ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-slate-700">
                        {schoolInfo.userTypeLabel}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="mb-2 h-px bg-sky-100" />

              

              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  router.push("/organization-admin");
                }}
                className="mt-2 w-full rounded-[18px] px-3 py-2.5 text-left font-semibold text-slate-700 transition hover:bg-white/85"
              >
                Organization Admin control
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHeaderMenuAction("open_user_profile");
                  setProfileMenuOpen(false);
                }}
                className="mt-2 w-full rounded-[18px] px-3 py-2.5 text-left font-semibold text-slate-700 transition hover:bg-white/85"
              >
                User Profile
              </button>

              <div className="mt-2 flex items-center justify-between gap-2 rounded-[18px] px-2 py-1.5 transition hover:bg-white/85">
                <button
                  type="button"
                  onClick={() => {
                    triggerHeaderMenuAction("open_organization_information");
                    setProfileMenuOpen(false);
                  }}
                  className="flex-1 rounded-[14px] px-2 py-1 text-left font-semibold text-slate-700"
                >
                  Organization informationsss
                </button>
                <button
                  type="button"
                  onClick={() => setIsOrganizationInfoVideoOpen(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                  aria-label="Watch organization information video"
                  title="Watch organization information video"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4.5 w-4.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M10 8.8l5.2 3.2L10 15.2z" fill="currentColor" stroke="none" />
                  </svg>
                </button>
              </div>

              <div className="my-2 h-px bg-sky-100" />

              <button
                type="button"
                onClick={() => {
                  clearLoginSession();
                  setProfileMenuOpen(false);
                  setAdminMenuOpen(false);
                  router.push("/");
                }}
                className="w-full rounded-[18px] bg-red-50/85 px-3 py-2.5 text-left font-semibold text-red-600 transition hover:bg-red-100"
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {isOrganizationInfoVideoOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
              <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                  <h2 className="text-base font-semibold text-gray-900">
                    Organization Information Video Guide
                  </h2>
                  <button
                    type="button"
                    onClick={closeOrganizationInfoVideoModal}
                    className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
                    aria-label="Close video modal"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-[18px] w-[18px]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M18 6L6 18" />
                      <path d="M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="aspect-video w-full bg-black">
                  <iframe
                    className="h-full w-full"
                    src="https://www.youtube-nocookie.com/embed/NQNk2lU_Hi0?autoplay=1&vq=hd1080&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1"
                    title="Organization information tutorial video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
}
