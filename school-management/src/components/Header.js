"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getAllActiveCompanyUser,
  getAttachmentsWithIDs,
  getCurrentSchoolInfo,
} from "../lib/apiService";

const studentMenuItems = [
  { label: "Home", href: "/#home", color: "text-[#98b34a]", active: true },
  // { label: "Dashboard", href: "/dashboard", color: "text-[#5c40c8]" },
  { label: "About", href: "/#about", color: "text-[#df4f7e]" },
  { label: "Facilities", href: "/#facilities", color: "text-[#57c5c7]" },
  { label: "Blog", href: "/#blog", color: "text-[#9fb549]" },
  { label: "Contact", href: "/#contact", color: "text-[#5c40c8]" },
];
const SIDEBAR_TOGGLE_EVENT = "school-sidebar-toggle";

function LogoMark() {
  return (
    <span className="relative h-10 w-10 overflow-hidden rounded-[7px] border border-[#d7d7d7] bg-[#f7f7f7] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <span className="absolute bottom-[5px] left-[5px] h-[16px] w-[7px] rounded-sm bg-[#2fc5de]" />
      <span className="absolute bottom-[5px] left-[14px] h-[20px] w-[7px] rounded-sm bg-[#6d9ce6]" />
      <span className="absolute bottom-[5px] left-[23px] h-[14px] w-[7px] rounded-sm bg-[#8bcf54]" />
      <span className="absolute bottom-[5px] left-[31px] h-[18px] w-[5px] rounded-sm bg-[#f2be3d]" />
      <span className="absolute left-[15px] top-[4px] h-0 w-0 border-x-[6px] border-b-[8px] border-x-transparent border-b-[#ff7d63]" />
      <span className="absolute left-[17px] top-[9px] h-[7px] w-[3px] rounded-sm bg-[#ffd15c]" />
    </span>
  );
}

function getActiveHashFromLocation() {
  if (typeof window === "undefined") {
    return "#home";
  }
  const currentHash = String(window.location.hash || "").trim().toLowerCase();
  return currentHash || "#home";
}

function getHashFromHref(href) {
  const hrefValue = String(href || "").trim().toLowerCase();
  const hashIndex = hrefValue.indexOf("#");
  if (hashIndex === -1) {
    return "#home";
  }
  const extracted = hrefValue.slice(hashIndex);
  return extracted || "#home";
}

function getUnderlineClass(colorClassName) {
  const normalized = String(colorClassName || "").trim().toLowerCase();
  if (normalized === "text-[#98b34a]") return "bg-[#98b34a]";
  if (normalized === "text-[#df4f7e]") return "bg-[#df4f7e]";
  if (normalized === "text-[#57c5c7]") return "bg-[#57c5c7]";
  if (normalized === "text-[#9fb549]") return "bg-[#9fb549]";
  if (normalized === "text-[#5c40c8]") return "bg-[#5c40c8]";
  return "bg-[#98b34a]";
}

const isAbsoluteUrl = (value) =>
  /^https?:\/\//i.test(value || "") || /^data:/i.test(value || "");

function buildAttachmentPreviewUrl(attachment) {
  const rawValue =
    attachment?.base_64_image ||
    attachment?.url ||
    attachment?.image_url ||
    "";

  if (!rawValue) {
    return "";
  }
  if (isAbsoluteUrl(rawValue)) {
    return rawValue;
  }

  const normalized = String(rawValue).replace(/^\/+/, "");
  if (!normalized) {
    return "";
  }
  if (normalized.startsWith("media/")) {
    return `/${normalized}`;
  }
  return `/media/${normalized}`;
}

function NavLinks({
  items = [],
  activeHash = "#home",
  mobile = false,
  onClick,
  onTabClick,
  isOpen = false,
}) {
  return (
    <ul
      className={
        mobile
          ? "flex list-none flex-col gap-1.5 p-3"
          : "hidden list-none items-center gap-5 p-0 md:flex lg:gap-6"
      }
    >
      {items.map((item, index) => {
        const itemHash = getHashFromHref(item.href);
        const isActiveTab = itemHash === String(activeHash || "#home").toLowerCase();
        const linkBase = mobile
          ? "relative flex min-h-[44px] items-center rounded-md border border-[#e5e5e5] bg-white px-3.5 text-sm font-semibold no-underline"
          : "relative inline-flex items-center text-[13px] font-semibold no-underline";

        return (
          <li
            key={`${mobile ? "m" : "d"}-${item.label}`}
            className={
              mobile
                ? `transition-all duration-400 ease-out ${
                    isOpen
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-0"
                  }`
                : ""
            }
            style={
              mobile
                ? {
                    transitionDelay: isOpen ? `${70 + index * 55}ms` : "0ms",
                  }
                : undefined
            }
          >
            {item.href.startsWith("/") ? (
              <Link
                href={item.href}
                className={`${linkBase} ${item.color}`}
                onClick={() => {
                  onTabClick?.(itemHash);
                  onClick?.();
                }}
              >
                {item.label}
                {isActiveTab && !mobile ? (
                  <span
                    className={`absolute -bottom-3 left-1/2 h-[2px] w-9 -translate-x-1/2 rounded ${getUnderlineClass(item.color)}`}
                  />
                ) : null}
              </Link>
            ) : (
              <a
                href={item.href}
                className={`${linkBase} ${item.color}`}
                onClick={() => {
                  onTabClick?.(itemHash);
                  onClick?.();
                }}
              >
                {item.label}
                {isActiveTab && !mobile ? (
                  <span
                    className={`absolute -bottom-3 left-1/2 h-[2px] w-9 -translate-x-1/2 rounded ${getUnderlineClass(item.color)}`}
                  />
                ) : null}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function Header({
  hideOnLogin = false,
  hideOnRegister = false,
  hideOnDashboard = false,
  showOnlyOnHome = false,
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeHash, setActiveHash] = useState("#home");
  const [schoolInfo, setSchoolInfo] = useState({
    username: "",
    schoolName: "",
    locationName: "",
    role: "",
    is_head_master:"",
    name:"",
  });
  const [userAttachmentPreview, setUserAttachmentPreview] = useState("");
  const userMenuRef = useRef(null);
  const pathname = usePathname();
  const isHomeRoute = pathname === "/";

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("access");
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("refresh");
      localStorage.removeItem("username");
    }
    setUserMenuOpen(false);
    window.location.replace("/");
  };

  const handleSidebarToggle = () => {
    if (typeof window === "undefined") {
      return;
    }
    window.dispatchEvent(new CustomEvent(SIDEBAR_TOGGLE_EVENT));
  };

  useEffect(() => {
    let mounted = true;

    getCurrentSchoolInfo()
      .then((data) => {
        console.log("data=======>>>", data);
        if (!mounted || !data) {
          return;
        }
        setSchoolInfo({
          username: data.username || "",
          schoolName: data.school?.name || data.company?.name || "",
          locationName:
            data.school?.location_name ||
            data.school?.location ||
            data.school?.city ||
            data.company?.location_name ||
            data.company?.location ||
            data.company?.city ||
            "",
          role: data.role || "",
          is_head_master: data.is_head_master || "",
          name: data.name || "",
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
    if (!schoolInfo.username) {
      setUserAttachmentPreview("");
      return undefined;
    }

    let mounted = true;
    getAllActiveCompanyUser()
      .then((data) => {
        if (!mounted) {
          return;
        }

        const users = Array.isArray(data?.response) ? data.response : [];
        const currentUser = users.find(
          (item) =>
            String(item?.username || "").trim().toLowerCase() ===
            String(schoolInfo.username || "").trim().toLowerCase(),
        );
        const attachmentId = Number(currentUser?.attachment_id || 0);
        if (!Number.isFinite(attachmentId) || attachmentId <= 0) {
          setUserAttachmentPreview("");
          return;
        }

        return getAttachmentsWithIDs([attachmentId]).then((attachmentData) => {
          if (!mounted) {
            return;
          }
          const attachment = Array.isArray(attachmentData?.response)
            ? attachmentData.response[0]
            : null;
          const nextPreview = buildAttachmentPreviewUrl(attachment);
          setUserAttachmentPreview(String(nextPreview || ""));
        });
      })
      .catch(() => {
        if (mounted) {
          setUserAttachmentPreview("");
        }
      });

    return () => {
      mounted = false;
    };
  }, [schoolInfo.username]);

  useEffect(() => {
    const syncActiveHash = () => {
      setActiveHash(getActiveHashFromLocation());
    };

    syncActiveHash();
    window.addEventListener("hashchange", syncActiveHash);
    return () => {
      window.removeEventListener("hashchange", syncActiveHash);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!(event.target instanceof Node)) {
        return;
      }
      if (!userMenuRef.current?.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  if (showOnlyOnHome && !isHomeRoute) {
    return null;
  }

  const shouldHideLoginRoute =
    hideOnLogin && (pathname === "/login" || pathname.startsWith("/login/"));
  const shouldHideRegisterRoute =
    hideOnRegister &&
    (pathname === "/register" || pathname.startsWith("/register/"));
  const shouldHideDashboardRoute =
    hideOnDashboard &&
    (pathname === "/dashboard" || pathname.startsWith("/dashboard/"));
  const normalizedRole = String(schoolInfo.role || "").trim().toLowerCase();
  const visibleMenuItems =
    normalizedRole === "student" ? studentMenuItems : [];
  const roleLabel = (schoolInfo.role || "Admin").toString();
  const userDesignation = schoolInfo.is_head_master
    ? "Head Master"
    : `${roleLabel.charAt(0).toUpperCase()}${roleLabel.slice(1)}`;
  const userFallbackInitial = String(schoolInfo.name || schoolInfo.username || "U")
    .trim()
    .charAt(0)
    .toUpperCase() || "U";

  if (
    shouldHideLoginRoute ||
    shouldHideRegisterRoute ||
    shouldHideDashboardRoute
  ) {
    return null;
  }

  return (
    <header className="fixed inset-x-0 top-0 z-[80] border-y border-[#d9d9d9] bg-[#efefef]">
      <div className="mx-auto flex h-[74px] w-full items-center justify-between px-3 md:px-5 lg:px-6">
        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={handleSidebarToggle}
            aria-label="Toggle sidebar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-3 no-underline">
          {/* <LogoMark /> */}
          <span className="flex flex-col text-[#202020]">
            <span className="text-[14px] md:text-[24px] font-semibold leading-none tracking-[-0.01em]">
              {schoolInfo.schoolName ? `${schoolInfo.schoolName}` : ""}
            </span>
            {schoolInfo.locationName ? (
              
              <span className="mt-1 text-[11px] font-medium leading-none text-[#000000] md:text-[13px]">
                Location&nbsp;:&nbsp;(&nbsp;{schoolInfo.locationName}&nbsp;)
              </span>
            ) : null}
          </span>
          </Link>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <NavLinks
            items={visibleMenuItems}
            activeHash={activeHash}
            onTabClick={setActiveHash}
          />
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="hidden items-center gap-2 rounded-xl border border-[#d0d5dd] bg-white px-3 py-2 text-left shadow-sm transition hover:bg-[#f8fafc] md:inline-flex"
          >
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#f2f4f7] text-[11px] font-semibold text-[#475467]">
              {userAttachmentPreview ? (
                <img
                  src={userAttachmentPreview}
                  alt="Logged in user"
                  className="h-10 w-10 object-cover"
                />
              ) : (
                userFallbackInitial
              )}
            </span>
            <div className="leading-tight">
              <p className="text-base font-semibold text-[#1d2939]">
                {schoolInfo.name || "User"}
                
              </p>
              <p className="text-[12px] font-semibold text-[#1d2939]">
                {userDesignation ? ` ${userDesignation}` : ""}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#cfcfcf] bg-white text-[#585858] shadow-sm transition-colors duration-200 hover:bg-white/80 md:hidden"
            aria-label="Open user menu"
            aria-expanded={userMenuOpen}
          >
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#f2f4f7] text-[10px] font-semibold text-[#475467]">
              {userAttachmentPreview ? (
                <img
                  src={userAttachmentPreview}
                  alt="Logged in user"
                  className="h-8 w-8 object-cover"
                />
              ) : (
                userFallbackInitial
              )}
            </span>
          </button>

          {userMenuOpen ? (
            <div className="absolute right-0 top-[calc(100%+8px)] z-[90] w-[280px] rounded-2xl border border-[#d0d5dd] bg-[#f2f4f7] p-3 shadow-[0_18px_40px_rgba(15,23,42,0.24)]">
              <div className="rounded-xl border border-[#d0d5dd] bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#f2f4f7] text-[11px] font-semibold text-[#475467]">
                    {userAttachmentPreview ? (
                      <img
                        src={userAttachmentPreview}
                        alt="Logged in user"
                        className="h-8 w-8 object-cover"
                      />
                    ) : (
                      userFallbackInitial
                    )}
                  </span>
                  <div>
                    <p className="text-[16px] font-semibold leading-none text-[#1d2939]">
                      {schoolInfo.name || "User"}
                    </p>
                    <p className="text-[12px]  leading-none text-[#1d2939]">
                    
                      {schoolInfo.username || "User"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#dbeafe] px-2.5 py-1 text-xs font-semibold uppercase text-[#155eef]">
                    {(schoolInfo.role || "Admin").toString()}
                  </span>
                  {/* <span className="rounded-full bg-[#dbeafe] px-2.5 py-1 text-xs font-semibold uppercase text-[#155eef]">
                    {userDesignation}
                  </span> */}
                  {/* <span className="rounded-full bg-[#eaecf0] px-2.5 py-1 text-xs font-semibold uppercase text-[#344054]">
                    Organization User
                  </span> */}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-[#1570ef] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#175cd3]"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
