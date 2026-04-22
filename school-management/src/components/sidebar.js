"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getCurrentSchoolInfo } from "../lib/apiService";

const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: "dashboard",
  },
  // {
  //   id: "account-management",
  //   label: "Account Management",
  //   href: "/accounts-management/",
  //   icon: "account-management",
  //   external: true,
  // },
  // {
  //   id: "payroll",
  //   label: "Payroll",
  //   href: "/vidya-payroll-management/dashboard/",
  //   icon: "payroll",
  //   external: true,
  // },
  {
    id: "academic",
    label: "Academic",
    icon: "academic",
    children: [

      {
        id: "academic-year",
        label: "Academic Year",
        href: "/academic/academic-year",
        icon: "academic-year",
      },

      {
        id: "subject",
        label: "Subject",
        href: "/academic/subject_list",
        icon: "classes",
      },
      {
        id: "classes",
        label: "Class",
        href: "/academic/classes",
        icon: "classes",
      },
      {
        id: "sections",
        label: "Section",
        href: "/academic/sections",
        icon: "classes",
      },
      {
        id: "fees",
        label: "Fees",
        href: "/academic/fees",
        icon: "timetable",
      },
      // {
      //   id: "timetable",
      //   label: "Timetable",
      //   href: "/academic/timetable",
      //   icon: "timetable",
      // },
      {
        id: "exams",
        label: "Exams",
        icon: "exams",
        subChildren: [
          {
            id: "exam-type",
            label: "Exam Type",
            href: "/academic/exams/exam-type",
            icon: "exams",
          },
          {
            id: "exam-schedule",
            label: "Exam Schedule",
            href: "/academic/exams/exam-schedule",
            icon: "timetable",
          },
          {
            id: "exam-marks",
            label: "Exam Marks & Result",
            href: "/academic/exams/exam-marks",
            icon: "students",
          },
          // {
          //   id: "exam-results",
          //   label: "Exam Results",
          //   href: "/academic/exams/exam-result",
          //   icon: "students",
          // },
        ],
      },
    ],
  },
  {
    id: "students",
    label: "Students",
    icon: "students",
    children: [
      {
        id: "all_students",
        label: "All Students",
        href: "/students",
        icon: "all_students",
      },
      {
        id: "student-academic-record",
        label: "Student Academic Record",
        href: "/academic/student-academic-record",
        icon: "student-academic-record",
      },

      {
        id: "student-fees-collection",
        label: "Student Fees Collection",
        href: "/academic/student-fees-collection",
        icon: "student-academic-record",
      },
      // {
      //   id: "admissions",
      //   label: "Admissions",
      //   href: "/",
      //   icon: "admissions",
      // },
      // {
      //   id: "attendance",
      //   label: "Attendance",
      //   href: "/dashboard?view=attendance",
      //   icon: "attendance",
      // },
    ],
  },
  {
    id: "staff",
    label: " School Staff",
    icon: "staff",
    children: [
      {
        id: "teachers",
        label: "Teachers",
        href: "/teachers",
        icon: "teachers",
      },
      {
        id: "non_teaching",
        label: "Non-Teaching",
        href: "/non-teaching",
        icon: "non_teaching",
      },

    ],
  },
  // {
  //   id: "reports",
  //   label: "Reports",
  //   icon: "reports",
  //   children: [
  //     {
  //       id: "performance",
  //       label: "Performance",
  //       href: "/dashboard?view=performance",
  //       icon: "performance",
  //     },
  //     {
  //       id: "fees",
  //       label: "Fee Reports",
  //       href: "/dashboard?view=fees",
  //       icon: "fees",
  //     },
  //     {
  //       id: "inventory",
  //       label: "Inventory",
  //       href: "/dashboard?view=inventory",
  //       icon: "inventory",
  //     },
  //   ],
  // },
];

const sidebarRoutePrefixes = Array.from(
  new Set(
    menuItems.flatMap((item) => {
      const collectRoutePrefixes = (entries = []) =>
        entries.flatMap((entry) => {
          const ownHref = String(entry.href || "").split("?")[0];
          const nestedRoutes = entry.subChildren
            ? collectRoutePrefixes(entry.subChildren)
            : [];
          return ownHref ? [ownHref, ...nestedRoutes] : nestedRoutes;
        });

      return item.children
        ? collectRoutePrefixes(item.children)
        : [String(item.href || "").split("?")[0]];
    }),
  ),
).filter(Boolean);

const normalizedSidebarRoutePrefixes = sidebarRoutePrefixes
  .map((prefix) => String(prefix || "").replace(/\/+$/, "") || "/")
  .sort((a, b) => b.length - a.length);

const collapsibleMenuIds = menuItems
  .filter((item) => item.children)
  .map((item) => item.id);

const getSubMenuState = (openId = null) =>
  collapsibleMenuIds.reduce((state, id) => {
    state[id] = id === openId;
    return state;
  }, {});

const getNestedSubMenuState = (openId = null) =>
  ["exams"].reduce((state, id) => {
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

const resolveSidebarPath = (pathname) => {
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

function CloseIcon({ animated = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition-transform duration-300 ease-out ${
        animated ? "rotate-90 scale-110" : "rotate-0 scale-100"
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        className={`origin-center transition-all duration-300 ease-out ${
          animated ? "opacity-100" : "opacity-100"
        }`}
        d="M6 6l12 12"
      />
      <path
        className={`origin-center transition-all duration-300 ease-out ${
          animated ? "opacity-100" : "opacity-100"
        }`}
        d="M18 6 6 18"
      />
    </svg>
  );
}

function SchoolLogoCircle() {
  return (
    <span className="relative inline-flex h-10 w-10 min-h-10 min-w-10 shrink-0 aspect-square overflow-hidden rounded-full border border-sky-200 bg-white shadow-sm">
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

function UserAvatar({ name = "" }) {
  const initial = String(name || "U").trim().charAt(0).toUpperCase() || "U";
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-800">
      {initial}
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
    case "account-management":
      return (
        <svg
          viewBox="0 0 24 24"
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 7h16v10H4zM8 11h8M8 15h5" />
          <path d="M16.5 4.5v5M14 7h5" />
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

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profileMenuRef = useRef(null);
  const sidebarPathname = resolveSidebarPath(pathname);
  const activeSubMenuId =
    menuItems.find((item) =>
      item.children?.some((child) =>
        isHrefMatch(child.href, sidebarPathname, searchParams),
      ),
    )?.id || null;
  const activeNestedSubMenuId =
    menuItems
      .find((item) =>
        item.children?.some((child) =>
          child.subChildren?.some((subChild) =>
            isHrefMatch(subChild.href, sidebarPathname, searchParams),
          ),
        ),
      )
      ?.children?.find((child) =>
        child.subChildren?.some((subChild) =>
          isHrefMatch(subChild.href, sidebarPathname, searchParams),
        ),
      )?.id || null;
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState(() =>
    getSubMenuState(activeSubMenuId || "academic"),
  );
  const [openNestedSubMenus, setOpenNestedSubMenus] = useState(() =>
    getNestedSubMenuState(activeNestedSubMenuId),
  );
  const [sidebarSchoolName, setSidebarSchoolName] = useState("School Suite");
  const [sidebarLocationName, setSidebarLocationName] = useState("");
  const [sidebarSchoolCode, setSidebarSchoolCode] = useState("");
  const [sidebarUserName, setSidebarUserName] = useState("User");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCloseIconAnimating, setIsCloseIconAnimating] = useState(false);
  const closeSidebarTimerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    getCurrentSchoolInfo()
      .then((data) => {
        if (!mounted || !data) {
          return;
        }
        const schoolMeta = data.company || data.school || {};
        setSidebarUserName(data.username || "User");
        setSidebarSchoolName(
          String(schoolMeta.name || "").trim() || "School Suite",
        );
        setSidebarLocationName(
          String(schoolMeta.location_name || schoolMeta.location || "").trim(),
        );
        setSidebarSchoolCode(String(schoolMeta.school_code || "").trim());
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (closeSidebarTimerRef.current) {
        window.clearTimeout(closeSidebarTimerRef.current);
      }
    };
  }, []);

  const isSidebarRoute = Boolean(
    sidebarPathname &&
    normalizedSidebarRoutePrefixes.some(
      (prefix) =>
        sidebarPathname === prefix || sidebarPathname.startsWith(`${prefix}/`),
    ),
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }
    if (!isSidebarRoute) {
      document.body.classList.remove("school-sidebar-collapsed");
      return undefined;
    }
    document.body.classList.toggle(
      "school-sidebar-collapsed",
      isDesktopCollapsed,
    );
    return () => {
      document.body.classList.remove("school-sidebar-collapsed");
    };
  }, [isSidebarRoute, isDesktopCollapsed]);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return undefined;
    }
    const handleClickOutside = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    if (normalizePath(pathname) !== "/school-management") {
      return undefined;
    }

    window.history.pushState({ schoolBackGuard: true }, "", window.location.href);
    const handlePopState = () => {
      window.location.replace("/");
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pathname]);

  if (!isSidebarRoute) {
    return null;
  }

  const toggleSubMenu = (id) => {
    setOpenSubMenus((prev) => {
      const nextOpenId = prev[id] ? null : id;
      if (nextOpenId !== "academic") {
        setOpenNestedSubMenus(getNestedSubMenuState(null));
      }
      return getSubMenuState(nextOpenId);
    });
  };

  const openMenuAndExpandSidebar = (id) => {
    if (isDesktopCollapsed) {
      setIsDesktopCollapsed(false);
      setOpenSubMenus(getSubMenuState(id));
      setOpenNestedSubMenus(
        getNestedSubMenuState(id === "academic" ? activeNestedSubMenuId : null),
      );
      return;
    }
    toggleSubMenu(id);
  };

  const toggleNestedSubMenu = (id) => {
    setOpenNestedSubMenus((prev) => getNestedSubMenuState(prev[id] ? null : id));
  };

  const isHrefActive = (href) => {
    return isHrefMatch(href, sidebarPathname, searchParams);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("access");
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("refresh");
      localStorage.removeItem("username");
    }
    setIsProfileMenuOpen(false);
    setIsMobileOpen(false);
    window.location.replace("/");
  };

  const handleMobileClose = () => {
    if (typeof window === "undefined") {
      setIsMobileOpen(false);
      return;
    }
    if (closeSidebarTimerRef.current) {
      window.clearTimeout(closeSidebarTimerRef.current);
    }
    setIsCloseIconAnimating(true);
    closeSidebarTimerRef.current = window.setTimeout(() => {
      setIsMobileOpen(false);
      setIsCloseIconAnimating(false);
      closeSidebarTimerRef.current = null;
    }, 180);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileOpen((prev) => !prev)}
        className="fixed left-4 top-[84px] z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm lg:hidden"
        aria-label={isMobileOpen ? "Close sidebar menu" : "Open sidebar menu"}
      >
        <MenuDotsIcon />
      </button>

      <button
        type="button"
        onClick={() => setIsDesktopCollapsed((prev) => !prev)}
        className={`fixed top-[84px] z-50 hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm transition-all lg:inline-flex ${
          isDesktopCollapsed ? "left-[5.5rem]" : "left-[17rem]"
        }`}
        aria-label={
          isDesktopCollapsed ? "Open desktop sidebar" : "Close desktop sidebar"
        }
      >
        <PanelArrowIcon collapsed={isDesktopCollapsed} />
      </button>

      {isMobileOpen ? (
        <button
          type="button"
          className="fixed inset-x-0 bottom-0 top-[74px] z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close sidebar backdrop"
        />
      ) : null}

      <aside
        className={`fixed left-0 top-[74px] z-50 flex h-[calc(100dvh-74px)] w-72 flex-col border-r border-slate-200 bg-white px-4 pb-6 pt-5 shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition-all duration-300 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${isDesktopCollapsed ? "lg:w-20 lg:px-3" : "lg:w-72 lg:px-4"}`}
      >
        <div
          className={`mb-6 flex items-center gap-3 border-b border-slate-200 pb-4 ${
            isDesktopCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          <div
            className={`flex items-center justify-center ${isDesktopCollapsed ? "" : "gap-3"}`}
          >
            {/* <SchoolLogoCircle /> */}
            {!isDesktopCollapsed ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                  {sidebarSchoolName}
                </p>
                {sidebarLocationName || sidebarSchoolCode ? (
                  <div className="mt-1 text-[14px] font-medium text-slate-500">
                    {sidebarLocationName ? (
                      <p><span className="font-semibold text-slate-500">Location&nbsp;:&nbsp;</span>{sidebarLocationName}</p>
                    ) : null}
                    {sidebarSchoolCode ? <p>
                      <span className="font-semibold text-slate-500">Code&nbsp;:&nbsp;</span>{sidebarSchoolCode}</p>  : null}
                  </div>
                ) : null}
                {/* <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  Navigation
                </h2> */}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-white text-slate-700 shadow-[0_1px_4px_rgba(15,23,42,0.14)] transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 active:scale-95 lg:hidden"
            onClick={handleMobileClose}
            aria-label="Close sidebar"
          >
            <CloseIcon animated={isCloseIconAnimating} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
          {menuItems.map((item) => {
            if (!item.children) {
              const isActive = isHrefActive(item.href);
              const itemClassName = `flex items-center rounded-lg text-sm font-medium transition ${
                isDesktopCollapsed
                  ? "justify-center px-2 py-2.5"
                  : "gap-3 px-3 py-2"
              } ${
                isActive
                  ? "bg-sky-100 text-sky-800"
                  : "text-slate-700 hover:bg-slate-100"
              }`;

              if (item.external) {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    title={isDesktopCollapsed ? item.label : undefined}
                    aria-label={item.label}
                    className={itemClassName}
                  >
                    <MenuItemIcon icon={item.icon} />
                    {!isDesktopCollapsed ? <span>{item.label}</span> : null}
                  </a>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  title={isDesktopCollapsed ? item.label : undefined}
                  aria-label={item.label}
                  className={itemClassName}
                >
                  <MenuItemIcon icon={item.icon} />
                  {!isDesktopCollapsed ? <span>{item.label}</span> : null}
                </Link>
              );
            }

            const isOpen = Boolean(openSubMenus[item.id]);
            const hasActiveChild = item.children.some((child) =>
              child.subChildren
                ? child.subChildren.some((subChild) =>
                    isHrefActive(subChild.href),
                  )
                : isHrefActive(child.href),
            );
            return (
              <div
                key={item.id}
                className={`rounded-lg ${
                  isDesktopCollapsed
                    ? "border border-transparent"
                    : "border border-slate-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => openMenuAndExpandSidebar(item.id)}
                  title={isDesktopCollapsed ? item.label : undefined}
                  aria-label={item.label}
                  aria-expanded={isOpen}
                  className={`flex w-full items-center text-left text-sm font-semibold transition ${
                    isDesktopCollapsed
                      ? "justify-center rounded-lg px-2 py-2.5"
                      : "justify-between px-3 py-2"
                  } ${
                    hasActiveChild
                      ? "bg-sky-100 text-sky-800"
                      : "text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex items-center ${isDesktopCollapsed ? "" : "gap-3"}`}
                  >
                    <MenuItemIcon icon={item.icon} />
                    {!isDesktopCollapsed ? <span>{item.label}</span> : null}
                  </span>
                  {!isDesktopCollapsed ? <ChevronIcon open={isOpen} /> : null}
                </button>

                {isOpen && !isDesktopCollapsed ? (
                  <div className="ml-5 space-y-1 border-t border-slate-200 px-2 py-2">
                    {item.children.map((child) => {
                      const hasSubChildren =
                        Array.isArray(child.subChildren) &&
                        child.subChildren.length > 0;
                      const isChildActive = hasSubChildren
                        ? child.subChildren.some((subChild) =>
                            isHrefActive(subChild.href),
                          )
                        : isHrefActive(child.href);
                      const isNestedOpen = Boolean(openNestedSubMenus[child.id]);
                      return (
                        <div key={child.id} className="space-y-1">
                          {hasSubChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleNestedSubMenu(child.id)}
                              className={` flex w-[calc(100%-0.5rem)] items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
                                isChildActive
                                  ? "bg-sky-100 text-sky-800"
                                  : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                              }`}
                              aria-label={`Toggle ${child.label} submenu`}
                              aria-expanded={isNestedOpen}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <MenuItemIcon icon={child.icon} />
                                <span>{child.label}</span>
                              </span>
                              <ChevronIcon open={isNestedOpen} />
                            </button>
                          ) : (
                            child.external ? (
                              <a
                                href={child.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                                  isChildActive
                                    ? "bg-sky-100 text-sky-800"
                                    : "text-slate-600 hover:bg-sky-50 hover:text-slate-700"
                                }`}
                              >
                                <MenuItemIcon icon={child.icon} />
                                <span>{child.label}</span>
                              </a>
                            ) : (
                              <Link
                                href={child.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                                  isChildActive
                                    ? "bg-sky-100 text-sky-800"
                                    : "text-slate-600 hover:bg-sky-50 hover:text-slate-700"
                                }`}
                              >
                                <MenuItemIcon icon={child.icon} />
                                <span>{child.label}</span>
                              </Link>
                            )
                          )}

                          {hasSubChildren && isNestedOpen ? (
                            <div className="ml-0  space-y-1 border-t border-slate-200 px-2 py-2">
                              {child.subChildren.map((subChild) => {
                                const isSubChildActive = isHrefActive(subChild.href);
                                return (
                                  <Link
                                    key={subChild.id}
                                    href={subChild.href}
                                    onClick={() => setIsMobileOpen(false)}
                                    className={`ml-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                                      isSubChildActive
                                        ? "bg-sky-100 text-sky-800"
                                        : "text-slate-500 hover:bg-sky-50 hover:text-sky-700"
                                    }`}
                                  >
                                    <MenuItemIcon
                                      icon={subChild.icon}
                                    />
                                    <span>{subChild.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        {/* <div
          ref={profileMenuRef}
          className={`relative mt-4 border-t border-slate-200 pt-4 ${
            isDesktopCollapsed ? "flex justify-center" : ""
          }`}
        >
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            className={`flex w-full items-center rounded-lg border border-slate-200 bg-white text-left transition hover:bg-slate-50 ${
              isDesktopCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
            }`}
            title={isDesktopCollapsed ? sidebarUserName : undefined}
            aria-label="Open user menu"
            aria-expanded={isProfileMenuOpen}
          >
            <UserAvatar name={sidebarUserName} />
            {!isDesktopCollapsed ? (
              <span className="truncate text-sm font-medium text-slate-800">
                {sidebarUserName}
              </span>
            ) : null}
          </button>

          {isProfileMenuOpen ? (
            <div
              className={`absolute z-20 min-w-[9rem] rounded-lg border border-slate-200 bg-white p-1 shadow-lg ${
                isDesktopCollapsed
                  ? "bottom-full left-full mb-2 ml-2"
                  : "bottom-full right-0 mb-2"
              }`}
            >
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                Logout
              </button>
            </div>
          ) : null}
        </div> */}
      </aside>
    </>
  );
}
