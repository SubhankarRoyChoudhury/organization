"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  Building2,
  Stethoscope,
  X,
  ClipboardList,
  Activity,
  BedDouble,
  Bed,
  Calendar,
  Receipt,
  Ambulance,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { get_Hospital_User_Login_Details } from "@/app/api/apiService";

export default function Sidebar({ isOpen, onClose, isDesktop }) {
  const [openMenu, setOpenMenu] = useState(null);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [userAffiliation, setUserAffiliation] = useState(null);
  const [userSummary, setUserSummary] = useState("");
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  const formatRoleLabel = (value) => {
    if (!value) return "";
    const raw = String(value).trim();
    if (!raw) return "";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  // useEffect(() => {
  //   const fetchUserRole = async () => {
  //     try {
  //       const username = localStorage.getItem("username");
  //       const isSuperuser = localStorage.getItem("is_superuser") === "true";

  //       if (isSuperuser) {
  //         setUserRole("superuser");
  //         setUserAffiliation("Super Admin");
  //         setLoading(false);
  //         return;
  //       }

  //       if (username) {
  //         const userDetails = await get_Hospital_User_Login_Details(username);
  //         const normalizedRole = userDetails?.role
  //           ? userDetails.role.toLowerCase()
  //           : "admin";
  //         setUserRole(normalizedRole);
  //         if (userDetails?.role) {
  //           localStorage.setItem("role", normalizedRole);
  //         }

  //         const affiliation =
  //           userDetails?.department ||
  //           userDetails?.administration_type ||
  //           userDetails?.doctor_type ||
  //           null;
  //         setUserAffiliation(affiliation);
  //       } else {
  //         setUserRole("admin");
  //         setUserAffiliation(null);
  //       }
  //     } catch {
  //       setUserRole("admin");
  //       setUserAffiliation(null);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchUserRole();
  // }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const username = localStorage.getItem("username");
        const isSuperuser = localStorage.getItem("is_superuser") === "true";

        if (isSuperuser) {
          setUserRole("superuser");
          setUserAffiliation("Super Admin");
          setUserSummary("Super Admin");
          setLoading(false);
          return;
        }

        if (username) {
          const userDetails = await get_Hospital_User_Login_Details(username);

          const roles = userDetails?.user?.roles || [];
          const adminRole =
            userDetails?.user?.is_admin === true ||
            userDetails?.user?.is_owner === true ||
            (Array.isArray(userDetails?.companies) &&
              userDetails.companies.some(
                (company) =>
                  company?.is_admin === true || company?.is_owner === true,
              ));
          setUserRoles(roles);
          setIsAdminRole(adminRole);

          // Existing: doctor / administration
          const normalizedRole = userDetails?.user?.role
            ? userDetails?.user?.role.toLowerCase()
            : "Admin";

          setUserRole(normalizedRole);

          if (userDetails?.user?.roles) {
            localStorage.setItem("role", normalizedRole);
          }

          const affiliation =
            userDetails?.department ||
            userDetails?.administration_type ||
            userDetails?.doctor_type ||
            null;
          setUserAffiliation(affiliation);
          const departmentLabel =
            userDetails?.user?.department_name ||
            userDetails?.department_name ||
            userDetails?.department?.name ||
            userDetails?.department ||
            "";
          const doctorTypeLabel =
            userDetails?.user?.doctor_type_name ||
            userDetails?.doctor_type_name ||
            userDetails?.doctor_type?.name ||
            userDetails?.doctor_type ||
            "";
          const administrationTypeLabel =
            userDetails?.user?.administration_type_name ||
            userDetails?.administration_type_name ||
            userDetails?.administration_type?.name ||
            userDetails?.administration_type ||
            "";

          const roleLabel = formatRoleLabel(
            userDetails?.user?.role ||
              userDetails?.role ||
              normalizedRole ||
              "",
          );
          const summaryParts = [
            roleLabel,
            departmentLabel,
            doctorTypeLabel,
            administrationTypeLabel,
          ].filter(Boolean);
          setUserSummary(summaryParts.join(" • "));
        } else {
          setUserRole("admin");
          setUserAffiliation(null);
          setUserSummary("");
        }
      } catch {
        setUserRole("admin");
        setUserAffiliation(null);
        setUserSummary("");
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const toggleSubmenu = (submenuKey) => {
    setOpenSubmenu(openSubmenu === submenuKey ? null : submenuKey);
  };

  // Menus same as before...
  const superuserMenu = [
    {
      title: "Admin Dashboard",
      icon: <LayoutDashboard size={18} />,
      path: "/admin_dashboard",
    },
    // {
    //   title: "Time Slot",
    //   icon: <LayoutDashboard size={18} />,
    //   path: "/admin_dashboard",
    // },
    {
      title: "Doctor",
      icon: <Stethoscope size={18} />,
      submenu: [
        { name: "Doctor List", path: "/admin_dashboard/doctor_list" },
        {
          name: "Doctor Schedule List ",
          submenu: [
            {
              name: "Doctor Schedule",
              icon: <Settings size={18} />,
              path: "/admin_dashboard/doctor_schedule_list/doctor_schedule",
            },
            // {
            //   name: "All Doctor Schedule List",
            //   path: "/admin_dashboard/doctor_schedule_list/all_doctor_schedule_list",
            // },
          ],
        },
      ],
    },
    {
      title: "Non Doctor & Administrator",
      icon: <UserCog size={18} />,
      submenu: [
        {
          name: "List of Adm",
          path: "/admin_dashboard/administration_list",
        },
      ],
    },

    {
      title: "Nurse and Other Staff",
      icon: <UserCog size={18} />,
      submenu: [
        {
          name: "List of Staff",
          path: "/admin_dashboard/staff_list",
        },
      ],
    },

    {
      title: "Duty Roaster",
      icon: <LayoutDashboard size={18} />,
      path: "/duty_roaster",
    },
    // {
    //   title: "Nurse Attendance",
    //   icon: <ClipboardList size={18} />,
    //   path: "/admin_dashboard/nurse-attendance",
    // },
    // {
    //   title: "Doctor Schedule List",
    //   icon: <Calendar size={18} />,
    //   submenu: [
    //     {
    //       name: "Doctor Schedule",
    //       icon: <Settings size={18} />,
    //       path: "/admin_dashboard/doctor_schedule_list/doctor_schedule",
    //     },
    //     // {
    //     //   name: "All Doctor Schedule List",
    //     //   path: "/admin_dashboard/doctor_schedule_list/all_doctor_schedule_list",
    //     // },
    //   ],
    // },

    {
      title: "Patient List",
      icon: <Users size={18} />,
      path: "/admin_dashboard/patient_list",
    },
    {
      title: "Delist List",
      icon: <Users size={18} />,
      path: "/admin_dashboard/delist_list",
    },
    // {
    //   title: "IPD Section",
    //   icon: <BedDouble size={18} />,
    //   submenu: [
    //     {
    //       name: "Rate Chart",
    //       path: "/admin_dashboard/ipd-admin/rate-chart",
    //     },
    //     {
    //       name: "Room",
    //       path: "/admin_dashboard/ipd-admin/room",
    //     },
    //     {
    //       name: "Bed",
    //       path: "/admin_dashboard/ipd-admin/bed",
    //     },
    //     {
    //       name: "Ward",
    //       path: "/admin_dashboard/ipd-admin/ward",
    //     },
    //   ],
    // },

    {
      title: "Setup",
      icon: <Stethoscope size={18} />,
      submenu: [
        {
          name: "Doctor Time Slot List",
          path: "/admin_dashboard/doctor_time_slot_list",
        },
        {
          name: "Doctor Department",
          submenu: [
            {
              name: "Department List",
              path: "/admin_dashboard/department_list",
            },
            {
              name: "Doctor Type List",
              path: "/admin_dashboard/doctor_type_list",
            },
            {
              name: "Doctor Fees",
              path: "/admin_dashboard/doctor-fees",
            },
          ],
        },
        {
          name: "Adm Department",
          submenu: [
            {
              name: "Administration Department",
              path: "/admin_dashboard/administration_type_list",
            },
          ],
        },
        {
          name: "Staff Department Section",
          submenu: [
            {
              name: "Staff Department ",
              path: "/admin_dashboard/staff_list/staff_dept",
            },
            {
              name: "Staff Job Title",
              path: "/admin_dashboard/staff_list/staff_job_title",
            },
          ],
        },
        {
          name: "IPD Room & Bed ",
          submenu: [
            {
              name: "Insuarance Company",
              path: "/admin_dashboard/ipd-admin/insuarance_list",
            },
            {
              name: "Rate Chart",
              path: "/admin_dashboard/ipd-admin/rate-chart",
            },
            {
              name: "Room",
              path: "/admin_dashboard/ipd-admin/room",
            },
            {
              name: "Bed",
              path: "/admin_dashboard/ipd-admin/bed",
            },
            {
              name: "Ward",
              path: "/admin_dashboard/ipd-admin/ward",
            },
          ],
        },
      ],
    },
  ];

  const adminMenu = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard size={18} />,
      path: "/administration_dashboard",
    },
    {
      title: "Duty Roaster",
      icon: <LayoutDashboard size={18} />,
      path: "/duty_roaster",
    },
    {
      title: "Patient List",
      icon: <Users size={18} />,
      path: "/admin_dashboard/patient_list",
    },
    {
      title: "OPD Management",
      icon: <Stethoscope size={18} />,
      submenu: [
        { name: "OPD Bookings", path: "/opd-booking" },
        {
          name: "OPD Patient Records",
          path: "/admin_dashboard/opd_patient_list",
        },
      ],
    },
    {
      title: "IPD Management",
      icon: <BedDouble size={18} />,
      submenu: [
        { name: "IPD Bookings", path: "/administration_dashboard/ipd-booking" },
        {
          name: "IPD Patient List",
          path: "/administration_dashboard/ipd-patient-list",
        },
      ],
    },

    {
      title: "Emergency",
      icon: <Ambulance size={18} />,
      submenu: [
        {
          name: "Emergency Bookings",
          path: "/administration_dashboard/emergency-booking",
        },
      ],
    },
    {
      title: "Biling",
      icon: <Receipt size={18} />,
      submenu: [
        {
          name: "IPD Payment",
          path: "/administration_dashboard/billing",
        },

        {
          name: "IPD Payment List",
          path: "/administration_dashboard/ipd-payment-list",
        },
      ],
    },

    // {
    //   title: "Staff & Users",
    //   icon: <Users size={18} />,
    //   submenu: [
    //     { name: "Add Staff", path: "#" },
    //     { name: "Manage Roles", path: "#" },
    //     { name: "Attendance", path: "#" },
    //   ],
    // },
    {
      title: "Doctor Schedule List",
      icon: <Calendar size={18} />,
      submenu: [
        {
          name: "Doctor Schedule",
          icon: <Settings size={18} />,
          path: "/admin_dashboard/doctor_schedule_list/doctor_schedule",
        },
        // {
        //   name: "All Doctor Schedule List",
        //   path: "/admin_dashboard/doctor_schedule_list/all_doctor_schedule_list",
        // },
      ],
    },
    {
      title: "Reports",
      icon: <FileText size={18} />,
      submenu: [
        { name: "Daily Reports", path: "#" },
        { name: "Monthly Reports", path: "#" },
      ],
    },

    {
      title: "IPD Section",
      icon: <Bed size={18} />,
      submenu: [
        {
          name: "Insuarance Company",
          path: "/admin_dashboard/ipd-admin/insuarance_list",
        },
        {
          name: "Rate Chart",
          path: "/admin_dashboard/ipd-admin/rate-chart",
        },
        {
          name: "Room",
          path: "/admin_dashboard/ipd-admin/room",
        },
        {
          name: "Bed",
          path: "/admin_dashboard/ipd-admin/bed",
        },
        {
          name: "Ward",
          path: "/admin_dashboard/ipd-admin/ward",
        },
      ],
    },
  ];

  const doctorMenu = [
    {
      title: "Doctor Dashboard",
      icon: <LayoutDashboard size={18} />,
      path: "/doctor_dashboard",
    },
    // { title: "My Appointments", icon: <Calendar size={18} />, path: "#" },
    {
      title: "OPD Patient Records",
      icon: <FileText size={18} />,
      path: "/doctor_dashboard/patient_record",
    },
    {
      title: "IPD Admit Patient Records",
      icon: <FileText size={18} />,
      path: "/doctor_dashboard/ipd_admit_patient_record",
    },
    {
      title: "Emergency List",
      icon: <FileText size={18} />,
      path: "/doctor_dashboard/emergency_list",
    },
    // { title: "Settings", icon: <Settings size={18} />, path: "#" },
  ];

  // const menuItems =
  //   userRole === "superuser"
  //     ? superuserMenu
  //     : userRole === "doctor"
  //     ? doctorMenu
  //     : adminMenu;

  const menuItems = isAdminRole
    ? superuserMenu
    : userRoles.includes("administration")
      ? adminMenu
      : userRoles.includes("doctor")
        ? doctorMenu
        : adminMenu;

  const activeSubPath = useMemo(() => {
    if (!pathname) return null;
    const candidates = menuItems
      .flatMap(
        (item) =>
          item.submenu?.flatMap(
            (sub) => sub.submenu?.map((child) => child.path) || sub.path,
          ) || [],
      )
      .filter(
        (path) =>
          path && (pathname === path || pathname.startsWith(`${path}/`)),
      );
    if (!candidates.length) return null;
    return candidates.sort((a, b) => b.length - a.length)[0];
  }, [menuItems, pathname]);

  const activeParent = useMemo(() => {
    if (!pathname) return null;
    const match = menuItems.find((item) =>
      item.submenu?.some(
        (sub) =>
          sub.path === activeSubPath ||
          sub.submenu?.some((child) => child.path === activeSubPath),
      ),
    );
    return match?.title || null;
  }, [menuItems, pathname, activeSubPath]);

  const activeSubmenuKey = useMemo(() => {
    if (!activeSubPath) return null;
    const parent = menuItems.find((item) =>
      item.submenu?.some(
        (sub) =>
          sub.path === activeSubPath ||
          sub.submenu?.some((child) => child.path === activeSubPath),
      ),
    );
    if (!parent) return null;
    const subMatch = parent.submenu?.find(
      (sub) =>
        sub.submenu?.some((child) => child.path === activeSubPath) ||
        sub.path === activeSubPath,
    );
    if (!subMatch?.submenu) return null;
    return `${parent.title}::${subMatch.name}`;
  }, [menuItems, activeSubPath]);

  const activeItemPath = useMemo(() => {
    if (!pathname) return null;
    const candidates = menuItems
      .filter((item) => !item.submenu && item.path && item.path !== "#")
      .map((item) => item.path)
      .filter((path) => {
        if (pathname === path) return true;
        if (activeSubPath) return false;
        return pathname.startsWith(`${path}/`);
      });
    if (!candidates.length) return null;
    return candidates.sort((a, b) => b.length - a.length)[0];
  }, [menuItems, pathname, activeSubPath]);

  const isItemActive = (path) => path && path === activeItemPath;
  const isSubItemActive = (path, submenu = []) =>
    (path && path === activeSubPath) ||
    submenu.some((child) => child.path === activeSubPath);
  const isNestedItemActive = (path) => path && path === activeSubPath;

  useEffect(() => {
    if (!activeParent) return;
    setOpenMenu((prev) => prev || activeParent);
  }, [activeParent]);

  useEffect(() => {
    if (!activeSubmenuKey) return;
    setOpenSubmenu((prev) => prev || activeSubmenuKey);
  }, [activeSubmenuKey]);

  if (loading)
    return (
      <aside className="w-64 h-screen bg-blue-800 text-white flex items-center justify-center">
        Loading...
      </aside>
    );

  return (
    <>
      {/* Overlay only for mobile */}
      {!isDesktop && isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-30 transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:static top-[64px] left-0 h-[calc(100vh-64px)] w-64 
        bg-gradient-to-b from-[#0d47a1] via-[#1976d2] to-[#42a5f5] text-white 
        flex flex-col shadow-xl z-40 transform transition-transform duration-300
        ${
          isDesktop
            ? "translate-x-0"
            : isOpen
              ? "translate-x-0"
              : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5 font-semibold text-xl border-b border-blue-300 bg-white/10 backdrop-blur-sm flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏥</span>
            <span className="text-sm font-semibold tracking-wide text-white/90">
              {userSummary ||
                (Array.isArray(userRoles) && userRoles.length
                  ? userRoles.map(formatRoleLabel).join(" • ")
                  : userRole === "superuser"
                    ? "Super Admin"
                    : userRole === "doctor"
                      ? "Doctor Portal"
                      : "MedCare Administration")}
            </span>
          </div>
          {!isDesktop && (
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto">
          <ul className="p-3 space-y-1">
            {menuItems.map((item, index) => (
              <li key={index}>
                {item.submenu ? (
                  <>
                    {(() => {
                      const isParentActive =
                        activeParent === item.title ||
                        item.submenu?.some((sub) => sub.path === pathname);
                      return (
                        <button
                          onClick={() => toggleMenu(item.title)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${
                            openMenu === item.title || isParentActive
                              ? "bg-white/20 shadow-inner"
                              : "hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="bg-white/20 p-1.5 rounded-md">
                              {item.icon}
                            </div>
                            <span className="text-sm font-medium tracking-wide text-left">
                              {item.title}
                            </span>
                          </div>
                          {openMenu === item.title ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </button>
                      );
                    })()}

                    {openMenu === item.title && (
                      <ul className="ml-9 mt-1 space-y-1 overflow-hidden animate-slide-down">
                        {item.submenu.map((sub, subIndex) => {
                          const isSubActive = isSubItemActive(
                            sub.path,
                            sub.submenu || [],
                          );
                          const submenuKey = `${item.title}::${sub.name}`;
                          return (
                            <li key={subIndex}>
                              {sub.submenu ? (
                                <>
                                  <button
                                    onClick={() => toggleSubmenu(submenuKey)}
                                    className={`w-full flex items-center justify-between text-sm px-2 py-1.5 rounded-md transition-all duration-200 ${
                                      isSubActive
                                        ? "bg-white/30 text-white font-semibold ring-1 ring-white/30"
                                        : "hover:bg-white/10"
                                    }`}
                                  >
                                    <span className="text-left">
                                      {sub.name}
                                    </span>
                                    {openSubmenu === submenuKey ? (
                                      <ChevronDown size={14} />
                                    ) : (
                                      <ChevronRight size={14} />
                                    )}
                                  </button>
                                  {openSubmenu === submenuKey && (
                                    <ul className="ml-4 mt-1 space-y-1 overflow-hidden animate-slide-down">
                                      {sub.submenu.map((child, childIndex) => {
                                        const isChildActive =
                                          isNestedItemActive(child.path);
                                        return (
                                          <li key={childIndex}>
                                            <Link
                                              href={child.path}
                                              onClick={
                                                !isDesktop ? onClose : undefined
                                              }
                                              className={`block text-sm px-2 py-1.5 rounded-md transition-all duration-200 ${
                                                isChildActive
                                                  ? "bg-white/40 text-white font-semibold ring-1 ring-white/30"
                                                  : "hover:bg-white/10"
                                              }`}
                                            >
                                              {child.name}
                                            </Link>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                </>
                              ) : (
                                <Link
                                  href={sub.path}
                                  onClick={!isDesktop ? onClose : undefined}
                                  className={`block text-sm px-2 py-1.5 rounded-md transition-all duration-200 ${
                                    isSubActive
                                      ? "bg-white/30 text-white font-semibold ring-1 ring-white/30"
                                      : "hover:bg-white/10"
                                  }`}
                                >
                                  {sub.name}
                                </Link>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.path}
                    onClick={() => {
                      if (!isDesktop) onClose?.();
                      setOpenMenu(null);
                    }}
                    className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 space-x-3 ${
                      isItemActive(item.path)
                        ? "bg-white/20 shadow-inner"
                        : "hover:bg-white/10"
                    }`}
                  >
                    <div className="bg-white/20 p-1.5 rounded-md">
                      {item.icon}
                    </div>
                    <span className="text-sm font-medium tracking-wide">
                      {item.title}
                    </span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        {/* <div className="p-4 border-t border-blue-300 bg-white/10 backdrop-blur-sm">
          <button
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/20 transition-all duration-200"
            onClick={() => {
              localStorage.clear();
              window.location.href = "/login";
            }}
          >
            <LogOut size={16} />
            <span className="font-medium text-sm tracking-wide">Logout</span>
          </button>
        </div> */}
      </aside>
    </>
  );
}
