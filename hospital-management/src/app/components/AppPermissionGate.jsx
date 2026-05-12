"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, X } from "lucide-react";
import { get_Hospital_User_Login_Details } from "@/app/api/apiService";

const permissionLabelMap = {
  can_access: "access",
  can_add: "add",
  can_edit: "edit",
  can_delete: "delete",
  can_print: "print",
};

const normalize = (value) => String(value || "").trim().toLowerCase();
const normalizePath = (value) => {
  const path = String(value || "").trim().replace(/\/+$/, "");
  return path || "/";
};
const isDashboardPath = (pathname) => {
  const normalizedPath = normalizePath(pathname);
  return (
    normalizedPath.endsWith("/administration_dashboard") ||
    normalizedPath.endsWith("/admin_dashboard")
  );
};
const hasAdminKeyword = (value) => {
  const text = normalize(value).replace(/[_-]+/g, " ");
  return (
    text === "admin" ||
    text === "super admin" ||
    text === "superuser" ||
    text === "company admin" ||
    text === "company_admin" ||
    text.includes("admin group") ||
    text.includes("company admin group")
  );
};

const inferPermissionKey = (label) => {
  const text = normalize(label);
  if (!text) {
    return null;
  }
  if (text.includes("print")) {
    return "can_print";
  }
  if (text.includes("delete") || text.includes("remove")) {
    return "can_delete";
  }
  if (text.includes("edit") || text.includes("update")) {
    return "can_edit";
  }
  if (
    text.includes("add") ||
    text.includes("new") ||
    text.includes("create")
  ) {
    return "can_add";
  }
  return null;
};

const getStoredPermissions = () => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem("app_permissions");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to parse app_permissions:", error);
    return [];
  }
};

const resolveAdminFromStorage = () => {
  if (typeof window === "undefined") {
    return false;
  }
  const isSuperuser = localStorage.getItem("is_superuser") === "true";
  const isAdmin = localStorage.getItem("is_admin") === "true";
  const isOwner = localStorage.getItem("is_owner") === "true";
  if (isSuperuser || isAdmin || isOwner) {
    return true;
  }
  const roleSources = [
    localStorage.getItem("role"),
    localStorage.getItem("roles"),
    localStorage.getItem("user_role"),
    localStorage.getItem("user_roles"),
    localStorage.getItem("user_type"),
    localStorage.getItem("group"),
    localStorage.getItem("group_name"),
  ];
  return roleSources.some((value) => hasAdminKeyword(value));
};

const resolveAdminFromDetails = (details) => {
  const resolvedUser = details?.user ?? details ?? {};
  const roleSources = [
    resolvedUser?.role,
    details?.role,
    resolvedUser?.user_type,
    details?.user_type,
  ];
  const roleAssignments = [
    ...(Array.isArray(resolvedUser?.roles) ? resolvedUser.roles : []),
    ...(Array.isArray(details?.roles) ? details.roles : []),
  ].map((entry) => String(entry?.name ?? entry ?? "").toLowerCase().trim());
  const companyAdminFlags = Array.isArray(details?.companies)
    ? details.companies.some(
        (company) =>
          company?.is_admin === true || company?.is_owner === true,
      )
    : details?.companies?.is_admin === true || details?.companies?.is_owner === true;
  const isSuperuser =
    details?.is_superuser === true ||
    resolvedUser?.is_superuser === true ||
    localStorage.getItem("is_superuser") === "true";
  const hasAdminFlags =
    resolvedUser?.is_admin === true ||
    resolvedUser?.is_owner === true ||
    details?.is_admin === true ||
    details?.is_owner === true;

  return (
    isSuperuser ||
    hasAdminFlags ||
    companyAdminFlags ||
    roleSources.some((value) => hasAdminKeyword(value)) ||
    roleAssignments.some((value) => hasAdminKeyword(value))
  );
};

export default function AppPermissionGate({ appName, children }) {
  const pathname = usePathname();
  const [permission, setPermission] = useState(null);
  const [isPrivilegedUser, setIsPrivilegedUser] = useState(false);
  const [dialog, setDialog] = useState({
    open: false,
    permissionKey: "can_access",
  });

  const resolvedAppName = useMemo(
    () => String(appName || "this app"),
    [appName],
  );
  const isDashboardRoute = useMemo(
    () => isDashboardPath(pathname),
    [pathname],
  );

  const hasPermission = (permissionKey) => {
    if (isPrivilegedUser) {
      return true;
    }
    if (!permission) {
      return true;
    }
    const normalizedKey = normalize(permissionKey);
    return Boolean(permission?.[normalizedKey]);
  };

  useEffect(() => {
    const loadPermissions = async () => {
      const adminFromStorage = resolveAdminFromStorage();
      if (adminFromStorage) {
        setIsPrivilegedUser(true);
        setPermission(null);
        return;
      }

      const permissions = getStoredPermissions();
      const username =
        typeof window !== "undefined"
          ? localStorage.getItem("username")
          : null;

      let details = null;
      if (!username) {
        const matched = permissions.find(
          (item) => normalize(item?.name) === normalize(appName),
        );
        setIsPrivilegedUser(false);
        setPermission(matched || null);
        return;
      }

      try {
        details = await get_Hospital_User_Login_Details(username);
      } catch (error) {
        console.error("Failed to load app permissions:", error);
      }

      if (details && resolveAdminFromDetails(details)) {
        setIsPrivilegedUser(true);
        setPermission(null);
        return;
      }

      setIsPrivilegedUser(false);
      const freshPermissions = details?.app_permissions || [];
      if (Array.isArray(freshPermissions)) {
        localStorage.setItem(
          "app_permissions",
          JSON.stringify(freshPermissions),
        );
        const freshMatch = freshPermissions.find(
          (item) => normalize(item?.name) === normalize(appName),
        );
        if (freshMatch) {
          setPermission(freshMatch);
          return;
        }
      }

      const matched = permissions.find(
        (item) => normalize(item?.name) === normalize(appName),
      );
      setPermission(matched || null);
    };

    loadPermissions();
  }, [appName]);

  useEffect(() => {
    if (isPrivilegedUser || isDashboardRoute || !permission) {
      return;
    }

    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const actionNode = target.closest("[data-requires-permission]");
      const rawKey = actionNode?.getAttribute("data-requires-permission");
      const fallbackNode = actionNode || target.closest("button, a");
      const inferredKey = rawKey
        ? null
        : inferPermissionKey(
            fallbackNode?.getAttribute("aria-label") ||
              fallbackNode?.getAttribute("title") ||
              fallbackNode?.textContent,
          );
      const permissionKey = rawKey
        ? rawKey.startsWith("can_")
          ? rawKey
          : `can_${rawKey}`
        : inferredKey;
      if (!permissionKey) {
        return;
      }
      if (hasPermission(permissionKey)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setDialog({ open: true, permissionKey });
    };

    const handleSubmit = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const rawKey = target.getAttribute("data-requires-permission");
      const permissionKey = rawKey
        ? rawKey.startsWith("can_")
          ? rawKey
          : `can_${rawKey}`
        : inferPermissionKey(
            target.getAttribute("aria-label") ||
              target.getAttribute("title") ||
              target.textContent,
          );
      if (!permissionKey) {
        return;
      }
      if (hasPermission(permissionKey)) {
        return;
      }
      event.preventDefault();
      setDialog({ open: true, permissionKey });
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, [permission, isPrivilegedUser, isDashboardRoute]);

  const mustShowAccessDialog =
    !isDashboardRoute &&
    !isPrivilegedUser &&
    permission &&
    permission.can_access === false;
  const dialogOpen = mustShowAccessDialog || dialog.open;
  const activePermissionKey = mustShowAccessDialog
    ? "can_access"
    : dialog.permissionKey;

  return (
    <>
      {children}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (mustShowAccessDialog && !open) {
            return;
          }
          setDialog((prev) => ({ ...prev, open }));
        }}
      >
        <DialogContent className="max-w-lg overflow-hidden border border-blue-100 bg-white/95 p-0">
          <div className="relative">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full border border-blue-100 bg-white/90 p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-700"
              onClick={() => {
                if (!mustShowAccessDialog) {
                  setDialog((prev) => ({ ...prev, open: false }));
                }
              }}
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="bg-gradient-to-br from-[#0ea5a5]/15 via-white to-[#3b82f6]/15 px-6 pb-4 pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-md">
                  <Shield className="h-6 w-6 text-[#0ea5a5]" />
                </div>
                <div className="space-y-2">
                  <DialogTitle className="text-xl text-gray-900">
                    Permission required
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-600">
                    You do not have{" "}
                    {permissionLabelMap[activePermissionKey] || "access"}{" "}
                    permission for {resolvedAppName}. Please contact your
                    administrator.
                  </DialogDescription>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
