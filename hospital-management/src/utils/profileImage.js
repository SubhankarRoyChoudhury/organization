import { environment } from "@/environments/environments";

const isAbsoluteUrl = (value) =>
  /^https?:\/\//i.test(value || "") || /^data:/i.test(value || "");

const stripApiMediaPrefix = (value) => {
  if (!value) return value;
  return value
    .replace(
      /^(https?:\/\/[^/]+)\/api\/(media\/.*)$/i,
      (_match, origin, rest) => `${origin}/${rest}`
    )
    .replace(/^\/api\/(media\/.*)$/i, "/$1")
    .replace(/^api\/(media\/.*)$/i, "/$1");
};

const getApiBase = () => {
  const rawBase = environment.base_url?.trim();
  if (!rawBase) {
    return "/api";
  }
  const withoutTrailingSlash = rawBase.replace(/\/+$/, "");
  if (!withoutTrailingSlash) {
    return "/api";
  }
  return withoutTrailingSlash;
};

const buildUrlFromBase = (relativePath) => {
  const apiBase = getApiBase();
  if (isAbsoluteUrl(apiBase)) {
    const baseWithSlash = apiBase.endsWith("/") ? apiBase : `${apiBase}/`;
    return new URL(relativePath, baseWithSlash).toString();
  }
  const baseWithLeading = apiBase.startsWith("/")
    ? apiBase
    : `/${apiBase}`;
  return `${baseWithLeading}/${relativePath}`.replace(/\/{2,}/g, "/");
};

export const formatProfileImage = (profilePath) => {
  if (!profilePath) {
    return "/default_user.png";
  }

  const stripped = stripApiMediaPrefix(profilePath);

  if (isAbsoluteUrl(stripped)) {
    return stripped;
  }

  let normalized = stripped.trim();
  if (!normalized) {
    return "/default_user.png";
  }
  normalized = normalized.replace(/^\/+/, "");
  normalized = normalized.replace(/^api\//i, "");
  return buildUrlFromBase(normalized);
};
