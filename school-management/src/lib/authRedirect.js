export const redirectToLoginIfUnauthorized = (status) => {
  if (typeof window === "undefined") {
    return;
  }
  if (status !== 401 && status !== 403) {
    return;
  }
  const pathname = window.location?.pathname || "";
  if (pathname === "/login" || pathname === "/login/") {
    return;
  }
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("username");
  localStorage.removeItem("is_superuser");
  localStorage.removeItem("app_permissions");
  localStorage.removeItem("company_id");
  window.location.href = "/login";
};
