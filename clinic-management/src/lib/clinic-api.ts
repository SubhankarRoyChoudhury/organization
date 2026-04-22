"use client";

type RequestMethod = "GET" | "POST" | "PUT" | "DELETE";

type ClinicFetchOptions = {
  method?: RequestMethod;
  body?: unknown;
  search?: string;
};

function getStoredCompanyId() {
  if (typeof window === "undefined") {
    return "";
  }

  return String(
    localStorage.getItem("selected_company_id") ||
      localStorage.getItem("company_id") ||
      "",
  ).trim();
}

function getAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return String(localStorage.getItem("access_token") || "").trim();
}

export function getClinicCompanyId() {
  return getStoredCompanyId();
}

export async function clinicFetch<T>(
  path: string,
  { method = "GET", body, search }: ClinicFetchOptions = {},
): Promise<T> {
  const companyId = getStoredCompanyId();
  if (!companyId) {
    throw new Error("Missing company context.");
  }

  const params = new URLSearchParams();
  params.set("company_id", companyId);
  if (search) {
    params.set("search", search);
  }

  const accessToken = getAccessToken();
  const response = await fetch(`/api/clinic-management/${path}?${params.toString()}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = "Request failed.";
    try {
      const payload = await response.json();
      message =
        payload?.detail ||
        payload?.error ||
        payload?.company_id?.[0] ||
        Object.values(payload || {}).flat()[0] ||
        message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(String(message));
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatCurrency(value?: number | string | null) {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

export function toDateTimeInputValue(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const timezoneOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - timezoneOffset * 60000);
  return localDate.toISOString().slice(0, 16);
}

export function toDateInputValue(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}
