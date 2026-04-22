"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, LogOut, Home } from "lucide-react";
import {
  get_Hospital_User_Login_Details,
  getCurrentUser,
  logoutUser as revokeTokens,
} from "@/app/api/apiService";
import { formatProfileImage } from "@/utils/profileImage";
// import { useRouter } from "next/router";
import { useRouter } from "next/navigation";

export default function Header({ onToggleSidebar }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [loggedInDetails, setLoggedInDetails] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [error, setError] = useState(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState("");

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch logged-in details
  useEffect(() => {
    const username = localStorage.getItem("username");
    if (username) fetchUserDetails(username);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateSelectedCompany = () => {
      setSelectedCompanyName(
        localStorage.getItem("selected_company_name") || "",
      );
    };
    updateSelectedCompany();
    window.addEventListener("storage", updateSelectedCompany);
    return () => window.removeEventListener("storage", updateSelectedCompany);
  }, []);

  const fetchUserDetails = async (username) => {
    try {
      const [data, currentUser] = await Promise.all([
        get_Hospital_User_Login_Details(username),
        getCurrentUser(),
      ]);
      console.log("Logged Details ===>>>", data);
      console.log("currentUser Details ===>>>", currentUser);
      setLoggedInDetails(data);
      setCurrentUser(currentUser);
      setAvatarUrl(currentUser?.user?.image_url || "");
      setCompanyLogoUrl(
        currentUser?.companyInfo?.company_thumbnail_image_url || "",
      );

      setError(null);
    } catch (error) {
      console.error("Error fetching user:", error);
      setError("Failed to fetch user details.");
    }
  };
  const buildInitialsAvatar = (name) => {
    if (!name) return "";
    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk.charAt(0).toUpperCase())
      .join("");
    return initials;
  };

  // const renderUserInfo = () => {
  //   if (!loggedInDetails) return "Super Admin";

  //   const { role, full_name, department, doctor_type, administration_type } =
  //     loggedInDetails;

  //   if (role === "doctor") {
  //     return <>{full_name}</>;
  //   }

  //   if (role === "administration") {
  //     return <>{full_name}</>;
  //   }

  //   return full_name || "Unknown User";
  // };

  const renderUserInfo = () => {
    const userDetails = currentUser?.user || {};
    const fallbackDetails = loggedInDetails || {};

    if (!currentUser && !loggedInDetails) return "Super Admin";

    const { role, full_name, user_type, admin_user_name, name, username } = {
      ...fallbackDetails,
      ...userDetails,
    };

    // ================================
    //  NEW — Company Admin Case
    // ================================
    if (user_type === "company_admin") {
      return <>{admin_user_name || name || username || "Company Admin"}</>;
    }

    if (role === "doctor") {
      return <>{full_name || name || username}</>;
    }

    if (role === "administration") {
      return <>{full_name || name || username}</>;
    }

    return full_name || name || username || "Unknown User";
  };

  const profileImageSrc = loggedInDetails?.profile_image
    ? formatProfileImage(loggedInDetails.profile_image)
    : "";
  const resolvedAvatarUrl = avatarUrl || profileImageSrc;
  const company_logo = companyLogoUrl;

  const logout = async () => {
    try {
      await revokeTokens();
    } catch (logoutError) {
      console.error("Failed to revoke tokens during logout:", logoutError);
    } finally {
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }
      window.location.href = "/login";
    }
  };

  return (
    <header className="bg-white shadow flex items-center justify-between px-6 py-3 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden text-gray-700 hover:text-blue-600 transition"
        >
          <Menu size={24} />
        </button>

        <div className="flex items-center gap-2">
          {company_logo ? (
            <img
              src={company_logo}
              alt="Admin"
              className="w-10 h-10 rounded-full border object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full border bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold uppercase">
              {buildInitialsAvatar(
                loggedInDetails?.full_name ||
                  loggedInDetails?.admin_user_name ||
                  "A",
              )}
            </div>
          )}
          {/* <img
            src="https://cdn-icons-png.flaticon.com/512/2966/2966484.png"
            alt="Hospital logo"
            className="h-8 w-8 rounded-full object-cover"
          /> */}
          <h1 className="text-lg font-semibold text-gray-800">
            {selectedCompanyName ||
              loggedInDetails?.companies?.[0]?.company_name ||
              loggedInDetails?.companies?.[0]?.company_name ||
              "Hospital Scheduling"}
          </h1>
          {/* <button
            type="button"
            onClick={() => window.location.replace("/home")}
            className="text-gray-600 hover:text-blue-600 transition cursor-pointer"
            aria-label="Go to home"
          >
            <Home size={20} />
          </button> */}
        </div>
      </div>

      {/* Right section */}
      <div className="relative" ref={menuRef}>
        <div
          className="flex items-center space-x-3 cursor-pointer select-none"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span className="text-gray-600 hidden sm:block">
            {renderUserInfo()}
          </span>
          {resolvedAvatarUrl ? (
            <img
              src={resolvedAvatarUrl}
              alt="Admin"
              className="w-10 h-10 rounded-full border object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full border bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold uppercase">
              {buildInitialsAvatar(
                loggedInDetails?.full_name ||
                  loggedInDetails?.admin_user_name ||
                  "A",
              )}
            </div>
          )}
        </div>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-md py-1 z-50">
            {/* <button
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                router.push("/documentation");
              }}
              className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 transition text-sm"
            >
              <LogOut size={16} className="mr-2 text-gray-600" />
              Documentation
            </button> */}
            <button
              onClick={(e) => {
                e.preventDefault();
                window.location.replace("/login/home");
              }}
              className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 transition text-sm"
            >
              <Home size={16} className="mr-2 text-gray-600" />
              Home
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                logout();
              }}
              className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 transition text-sm"
            >
              <LogOut size={16} className="mr-2 text-gray-600" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
