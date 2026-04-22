"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
// import { getCurrentSchoolInfo } from "../lib/apiService";f

const fullMenuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/super-admin",
    icon: "dashboard",
  },
  {
    id: "organization_admin",
    label: "Organization Admin",
    icon: "academic",
    children: [
      {
        id: "organization_admin_dashboard",
        label: "Organization Admin Dashboard",
        href: "/organization-admin",
        icon: "classes",
      },
      {
        id: "access_control",
        label: "Organization User",
        href: "/organization-admin/access-control",
        icon: "classes",
      },
    ],
  },
  {
    id: "profit-loss",
    label: "Profit Loss",
    href: "/super-admin/profit-loss",
    icon: "dashboard",
  },
  {
    id: "usage-report",
    label: "Usage Report",
    href: "/super-admin/usage-report",
    icon: "dashboard",
  },
];

const superAdminMenuItems = fullMenuItems.filter((item) =>
  ["dashboard", "profit-loss", "usage-report"].includes(item.id),
);

const organizationMenuItems = [
  {
    id: "organization_admin",
    label: "Performance Report",
    icon: "performance",
    children: [
      {
        id: "organization_admin_dashboard",
        label: "Organization Admin Dashboard",
        href: "/organization-admin",
        icon: "classes",
      },
      {
        id: "access_control",
        label: "Organization User",
        href: "/organization-admin/access-control",
        icon: "classes",
      },
    ],
  },
];

const companyMenuItems = [
  {
    id: "company_placeholder",
    label: "Company Dashboard",
    href: "/company-admin",
    icon: "dashboard",
  },
];
const getSidebarRoutePrefixes = (menuItems) =>
  Array.from(
    new Set(
      menuItems.flatMap((item) =>
        item.children
          ? item.children.map((child) => String(child.href || "").split("?")[0])
          : [String(item.href || "").split("?")[0]],
      ),
    ),
  ).filter(Boolean);

const getNormalizedSidebarRoutePrefixes = (menuItems) =>
  getSidebarRoutePrefixes(menuItems)
    .map((prefix) => String(prefix || "").replace(/\/+$/, "") || "/")
    .sort((a, b) => b.length - a.length);

const getCollapsibleMenuIds = (menuItems) =>
  menuItems.filter((item) => item.children).map((item) => item.id);

const getSubMenuState = (menuItems, openId = null) =>
  getCollapsibleMenuIds(menuItems).reduce((state, id) => {
    state[id] = id === openId;
    return state;
  }, {});

const normalizePath = (path) => {
  const [rawPath] = String(path || "").split(/[?#]/);
  const withLeadingSlash = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, "");
  return withoutTrailingSlash || "/";
};

const findPathSegmentIndex = (fullPath, segment) => {
  let index = fullPath.indexOf(segment);
  while (index !== -1) {
    const isBoundaryBefore = index === 0 || fullPath[index - 1] === "/";
    const endIndex = index + segment.length;
    const isBoundaryAfter =
      endIndex === fullPath.length || fullPath[endIndex] === "/";
    if (isBoundaryBefore && isBoundaryAfter) {
      return index;
    }
    index = fullPath.indexOf(segment, index + 1);
  }
  return -1;
};

const resolveSidebarPath = (pathname, normalizedSidebarRoutePrefixes) => {
  const normalizedPathname = normalizePath(pathname);
  for (const routePrefix of normalizedSidebarRoutePrefixes) {
    const matchIndex = findPathSegmentIndex(normalizedPathname, routePrefix);
    if (matchIndex !== -1) {
      return normalizedPathname.slice(matchIndex);
    }
  }
  return normalizedPathname;
};

const isHrefMatch = (href, sidebarPathname, searchParams) => {
  const [linkPath, linkQuery] = String(href || "").split("?");
  if (normalizePath(sidebarPathname) !== normalizePath(linkPath)) {
    return false;
  }
  if (!linkQuery) {
    return true;
  }
  const queryParams = new URLSearchParams(linkQuery);
  for (const [key, value] of queryParams.entries()) {
    if (searchParams.get(key) !== value) {
      return false;
    }
  }
  return true;
};

function MenuDotsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function SchoolLogoCircle() {
  return (
    <span className="relative inline-flex h-10 w-10 overflow-hidden rounded-full border border-sky-200 bg-white shadow-sm">
      <Image
        src="/school-logo.svg"
        alt="School logo"
        fill
        sizes="40px"
        className="object-cover"
      />
    </span>
  );
}

function MenuItemIcon({ icon, className = "h-4 w-4" }) {
  const iconClassName = `${className} shrink-0`;

  switch (icon) {
    case "dashboard":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" />
        </svg>
      );
    case "academic":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" />
          <path d="M8 7h8M8 11h8" />
        </svg>
      );
    case "classes":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 5h16v10H4zM8 19h8M10 15v4M14 15v4" />
        </svg>
      );
    case "timetable":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1zM8 12h3M13 12h3M8 16h3" />
        </svg>
      );
    case "exams":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M9 4h6M9 4a2 2 0 0 0-2 2h10a2 2 0 0 0-2-2M8 6H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-1M9 13l2 2 4-4" />
        </svg>
      );
    case "students":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M17 11a3 3 0 1 0 0-6M21 21v-1a4 4 0 0 0-3-3.87" />
        </svg>
      );
    case "all_students":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 6h16v12H4zM8 10h4M8 13h4M15 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4" />
        </svg>
      );
    case "admissions":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M15 20v-1.5a4.5 4.5 0 0 0-9 0V20M10.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M18 8v6M15 11h6" />
        </svg>
      );
    case "attendance":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M20 12a8 8 0 1 1-3-6.2M8.5 12.5l2.5 2.5 5-5" />
        </svg>
      );
    case "staff":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M9 6V4h6v2M3 8h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 11h18" />
        </svg>
      );
    case "teachers":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 5h16v9H4zM12 14v5M9 19h6M7 9h10" />
        </svg>
      );
    case "non_teaching":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 21h16M6 21V7h12v14M9 10h2M13 10h2M9 14h2M13 14h2" />
        </svg>
      );
    case "payroll":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M3 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3zM3 7V5a2 2 0 0 1 2-2h12M17 13h4" />
        </svg>
      );
    case "reports":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 19h16M7 16v-5M12 16V8M17 16v-3" />
        </svg>
      );
    case "performance":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 18l6-6 4 4 6-8M17 8h3v3" />
        </svg>
      );
    case "fees":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M8 7h8M8 11h8M12 11v6M10 17h4" />
        </svg>
      );
    case "inventory":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m3 8 9-5 9 5-9 5zM3 8v8l9 5 9-5V8M12 13v8" />
        </svg>
      );
    default:
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

function ChevronIcon({ open = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function PanelArrowIcon({ collapsed = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

function SidebarSectionBadge({ collapsed = false }) {
  if (collapsed) {
    return null;
  }

  return (
    <div className="mb-5 rounded-[22px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(235,245,255,0.9))] px-4 py-4 shadow-[0_22px_50px_-34px_rgba(15,23,42,0.3)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-600">
        Navigation
      </p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
        Workspace Panel
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        Jump between organization tools with a cleaner control surface.
      </p>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const hideOnPaths = ["/login"];
  const isRootPath = pathname === "/";
  const shouldHide =
    isRootPath || hideOnPaths.some((path) => pathname?.startsWith(path));
  const searchParams = useSearchParams();
  const [sessionView, setSessionView] = useState(null);
  const menuItems =
    sessionView === "superadmin"
      ? superAdminMenuItems
      : sessionView === "organization"
        ? organizationMenuItems
        : sessionView === "company"
          ? companyMenuItems
        : fullMenuItems;
  const normalizedSidebarRoutePrefixes =
    getNormalizedSidebarRoutePrefixes(menuItems);
  const sidebarPathname = resolveSidebarPath(
    pathname,
    normalizedSidebarRoutePrefixes,
  );
  const activeSubMenuId =
    menuItems.find((item) =>
      item.children?.some((child) =>
        isHrefMatch(child.href, sidebarPathname, searchParams),
      ),
    )?.id || null;
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState(() =>
    getSubMenuState(menuItems, activeSubMenuId),
  );
  const [sidebarSchoolName, setSidebarSchoolName] = useState("Organization");

  useEffect(() => {
    const syncSessionView = () => {
    const isSuperuser = localStorage.getItem("is_superuser") === "true";
    const sessionUserType = String(
      localStorage.getItem("session_user_type") || "",
    ).toLowerCase();

    if (isSuperuser) {
      setSessionView("superadmin");
        return;
    }

    if (sessionUserType.startsWith("organization")) {
      setSessionView("organization");
        return;
    }

    if (sessionUserType.startsWith("company")) {
      setSessionView("company");
        return;
    }

    if (pathname?.startsWith("/category")) {
      setSessionView("pending");
      return;
    }

      setSessionView("default");
    };

    syncSessionView();
    window.addEventListener("session-context-changed", syncSessionView);
    return () => {
      window.removeEventListener("session-context-changed", syncSessionView);
    };
  }, [pathname]);

  useEffect(() => {
    const syncSidebarName = () => {
      const resolvedName =
        localStorage.getItem("selected_organization_name") ||
        localStorage.getItem("organization_name") ||
        localStorage.getItem("company_name") ||
        "Organization";
      setSidebarSchoolName(resolvedName);
    };

    syncSidebarName();
    window.addEventListener("session-context-changed", syncSidebarName);
    window.addEventListener("storage", syncSidebarName);
    return () => {
      window.removeEventListener("session-context-changed", syncSidebarName);
      window.removeEventListener("storage", syncSidebarName);
    };
  }, []);


  useEffect(() => {
    setOpenSubMenus(getSubMenuState(menuItems, activeSubMenuId));
  }, [menuItems, activeSubMenuId]);

  const isSidebarRoute = Boolean(
    (
      (sessionView === "organization" || sessionView === "company") &&
      pathname?.startsWith("/category")
    ) ||
      (sidebarPathname &&
        normalizedSidebarRoutePrefixes.some(
          (prefix) =>
            sidebarPathname === prefix ||
            sidebarPathname.startsWith(`${prefix}/`),
        )),
  );

  useEffect(() => {
    if (shouldHide && typeof document !== "undefined") {
      document.body.classList.remove("school-sidebar-enabled");
      document.body.classList.remove("school-sidebar-collapsed");
    }
  }, [shouldHide]);

 
  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }
    if (!isSidebarRoute) {
      document.body.classList.remove("school-sidebar-enabled");
      document.body.classList.remove("school-sidebar-collapsed");
      return undefined;
    }
    document.body.classList.add("school-sidebar-enabled");
    document.body.classList.toggle(
      "school-sidebar-collapsed",
      isDesktopCollapsed,
    );
    return () => {
      document.body.classList.remove("school-sidebar-enabled");
      document.body.classList.remove("school-sidebar-collapsed");
    };
  }, [isSidebarRoute, isDesktopCollapsed]);

  const toggleSubMenu = (id) => {
    setOpenSubMenus((prev) => getSubMenuState(menuItems, prev[id] ? null : id));
  };

  const openMenuAndExpandSidebar = (id) => {
    if (isDesktopCollapsed) {
      setIsDesktopCollapsed(false);
      setOpenSubMenus(getSubMenuState(menuItems, id));
      return;
    }
    toggleSubMenu(id);
  };

  const isHrefActive = (href) => {
    return isHrefMatch(href, sidebarPathname, searchParams);
  };
  const sidebarInitials =
    sidebarSchoolName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "O";
   if (shouldHide || sessionView === null || !isSidebarRoute) {
    return null;
  }


  return (
    <>
      {!isMobileOpen ? (
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="fixed left-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm lg:hidden"
          style={{ top: "calc(var(--app-header-height, 74px) + 1rem)" }}
          aria-label="Open sidebar menu"
        >
          <MenuDotsIcon />
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => setIsDesktopCollapsed((prev) => !prev)}
        className={`fixed z-50 hidden h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-700 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)] backdrop-blur transition-all duration-300 hover:bg-white lg:inline-flex ${
          isDesktopCollapsed ? "left-[5.25rem]" : "left-[16.75rem]"
        }`}
        style={{ top: "calc(var(--app-header-height, 74px) + 1rem)" }}
        aria-label={
          isDesktopCollapsed ? "Open desktop sidebar" : "Close desktop sidebar"
        }
      >
        <PanelArrowIcon collapsed={isDesktopCollapsed} />
      </button>

      {isMobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close sidebar backdrop"
        />
      ) : null}

      <aside
        className={`fixed bottom-0 left-0 z-50 w-72 border-r border-transparent bg-transparent p-0 transition-all duration-300 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${isDesktopCollapsed ? "lg:w-20" : "lg:w-72"}`}
        style={{ top: "var(--app-header-height, 74px)" }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[30px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,247,255,0.9))] px-3 pb-4 pt-3 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.34)] backdrop-blur-xl">
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent" />
          <div className="absolute -left-10 top-16 h-28 w-28 rounded-full bg-cyan-100/50 blur-2xl" />
          <div className="absolute bottom-12 right-0 h-24 w-24 rounded-full bg-blue-100/50 blur-2xl" />

          <div
            className={`relative flex items-center pb-3 ${
              isDesktopCollapsed ? "justify-center" : "justify-between"
            }`}
          >
            {!isDesktopCollapsed ? (
              <div />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0ea5e9,#38bdf8)] text-sm font-bold text-white shadow-[0_18px_30px_-18px_rgba(14,165,233,0.8)]">
                {sidebarInitials}
              </span>
            )}

            <button
              type="button"
              className="rounded-full border border-white/80 bg-white/85 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="relative mt-2 h-[calc(100%-3.5rem)] overflow-y-auto pr-1">
            <SidebarSectionBadge collapsed={isDesktopCollapsed} />

            <nav className="space-y-3">
              {menuItems.map((item) => {
                if (!item.children) {
                  const isActive = isHrefActive(item.href);
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      title={isDesktopCollapsed ? item.label : undefined}
                      aria-label={item.label}
                      className={`group flex items-center transition ${
                        isDesktopCollapsed
                          ? "justify-center rounded-[22px] px-2 py-3"
                          : "gap-3 rounded-[22px] px-3.5 py-3"
                      } ${
                        isActive
                          ? "bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(56,189,248,0.08))] text-sky-800 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.7)]"
                          : "text-slate-700 hover:bg-white/70 hover:text-slate-900"
                      }`}
                    >
                      <span
                        className={`flex items-center justify-center rounded-2xl transition ${
                          isDesktopCollapsed ? "h-10 w-10" : "h-10 w-10"
                        } ${
                          isActive
                            ? "bg-white text-sky-700 shadow-sm"
                            : "bg-slate-50 text-slate-500 group-hover:bg-white group-hover:text-slate-700"
                        }`}
                      >
                        <MenuItemIcon icon={item.icon} />
                      </span>
                      {!isDesktopCollapsed ? (
                        <span className="text-sm font-semibold tracking-tight">
                          {item.label}
                        </span>
                      ) : null}
                    </Link>
                  );
                }

                const isOpen = Boolean(openSubMenus[item.id]);
                const hasActiveChild = item.children.some((child) =>
                  isHrefActive(child.href),
                );
                return (
                  <div
                    key={item.id}
                    className={`overflow-hidden rounded-[24px] transition ${
                      isDesktopCollapsed
                        ? ""
                        : "border border-white/70 bg-white/55 shadow-[0_20px_45px_-36px_rgba(15,23,42,0.24)]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => openMenuAndExpandSidebar(item.id)}
                      title={isDesktopCollapsed ? item.label : undefined}
                      aria-label={item.label}
                      aria-expanded={isOpen}
                      className={`group flex w-full items-center text-left transition ${
                        isDesktopCollapsed
                          ? "justify-center rounded-[22px] px-2 py-3"
                          : "justify-between px-3.5 py-3.5"
                      } ${
                        hasActiveChild
                          ? "bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(59,130,246,0.08))] text-sky-800"
                          : "text-slate-800 hover:bg-white/60"
                      }`}
                    >
                      <span
                        className={`flex items-center ${isDesktopCollapsed ? "" : "gap-3"}`}
                      >
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                            hasActiveChild
                              ? "bg-white text-sky-700 shadow-sm"
                              : "bg-slate-50 text-slate-500 group-hover:bg-white"
                          }`}
                        >
                          <MenuItemIcon icon={item.icon} />
                        </span>
                        {!isDesktopCollapsed ? (
                          <span className="text-sm font-semibold tracking-tight">
                            {item.label}
                          </span>
                        ) : null}
                      </span>
                      {!isDesktopCollapsed ? <ChevronIcon open={isOpen} /> : null}
                    </button>

                    {isOpen && !isDesktopCollapsed ? (
                      <div className="space-y-2 px-3 pb-3">
                        {item.children.map((child) => {
                          const isChildActive = isHrefActive(child.href);
                          return (
                            <Link
                              key={child.id}
                              href={child.href}
                              onClick={() => setIsMobileOpen(false)}
                              className={`flex items-center gap-3 rounded-[18px] px-3 py-2.5 text-sm transition ${
                                isChildActive
                                  ? "bg-slate-900 text-white shadow-[0_14px_32px_-22px_rgba(15,23,42,0.8)]"
                                  : "text-slate-600 hover:bg-white hover:text-slate-900"
                              }`}
                            >
                              <span
                                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                                  isChildActive
                                    ? "bg-white/12 text-white"
                                    : "bg-slate-50 text-slate-500"
                                }`}
                              >
                                <MenuItemIcon icon={child.icon} className="h-3.5 w-3.5" />
                              </span>
                              <span className="font-medium tracking-tight">
                                {child.label}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
}
