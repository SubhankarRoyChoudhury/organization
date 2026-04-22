"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function AppPermissionGate({ appName, children }) {
  const [permission, setPermission] = useState(null);
  const [dialog, setDialog] = useState({
    open: false,
    permissionKey: "can_access",
  });

  const resolvedAppName = useMemo(
    () => String(appName || "this app"),
    [appName],
  );

  const hasPermission = (permissionKey) => {
    if (!permission) {
      return true;
    }
    const normalizedKey = normalize(permissionKey);
    return Boolean(permission?.[normalizedKey]);
  };

  useEffect(() => {
    const loadPermissions = async () => {
      const permissions = getStoredPermissions();
      const matched = permissions.find(
        (item) => normalize(item?.name) === normalize(appName),
      );
      if (matched) {
        setPermission(matched);
        return;
      }
      const username =
        typeof window !== "undefined"
          ? localStorage.getItem("username")
          : null;
      if (!username) {
        setPermission(null);
        return;
      }
      try {
        const details = await get_Hospital_User_Login_Details(username);
        const freshPermissions = details?.app_permissions || [];
        if (Array.isArray(freshPermissions)) {
          localStorage.setItem(
            "app_permissions",
            JSON.stringify(freshPermissions),
          );
          const freshMatch = freshPermissions.find(
            (item) => normalize(item?.name) === normalize(appName),
          );
          setPermission(freshMatch || null);
          return;
        }
      } catch (error) {
        console.error("Failed to load app permissions:", error);
      }
      setPermission(null);
    };

    loadPermissions();
  }, [appName]);

  useEffect(() => {
    if (permission && permission.can_access === false) {
      setDialog({ open: true, permissionKey: "can_access" });
    }
  }, [permission]);

  useEffect(() => {
    if (!permission) {
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
  }, [permission]);

  return (
    <>
      {children}
      <Dialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-lg overflow-hidden border border-blue-100 bg-white/95 p-0">
          <div className="relative">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full border border-blue-100 bg-white/90 p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-700"
              onClick={() => setDialog((prev) => ({ ...prev, open: false }))}
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
                    {permissionLabelMap[dialog.permissionKey] || "access"}{" "}
                    permission for {resolvedAppName}. Please contact your
                    administrator to request access.
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
