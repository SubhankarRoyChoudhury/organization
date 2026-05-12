"use client";

export const COMPANY_LOCALE_STORAGE_KEYS = {
  language: "company_locale_language",
  currencyCode: "company_locale_currency_code",
  dateFormat: "company_locale_date_format",
};

const LEGACY_KEYS = {
  language: "language",
  currencyCode: "currency_code",
  dateFormat: "date_format",
};

export const DEFAULT_COMPANY_LOCALE = {
  language: "en-IN",
  currencyCode: "INR",
  dateFormat: "DD MMM, YYYY",
};

const getLocalStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
};

const getSessionStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage;
};

const readStoredValue = (primary, legacy) => {
  const local = getLocalStorage();
  const session = getSessionStorage();
  const fromLocal = String(local?.getItem(primary) || local?.getItem(legacy) || "").trim();
  if (fromLocal) {
    return fromLocal;
  }
  return String(session?.getItem(primary) || session?.getItem(legacy) || "").trim();
};

const writeStoredValue = (primary, legacy, value) => {
  const local = getLocalStorage();
  const session = getSessionStorage();
  if (local) {
    local.setItem(primary, value);
    local.setItem(legacy, value);
  }
  if (session) {
    session.setItem(primary, value);
    session.setItem(legacy, value);
  }
};

const sanitizeLanguage = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return DEFAULT_COMPANY_LOCALE.language;
  }
  return normalized;
};

const sanitizeCurrencyCode = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    return DEFAULT_COMPANY_LOCALE.currencyCode;
  }
  return normalized;
};

const sanitizeDateFormat = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return DEFAULT_COMPANY_LOCALE.dateFormat;
  }
  return normalized;
};

const mergeLocale = (base, overrides = {}) => ({
  language: sanitizeLanguage(overrides.language || base.language),
  currencyCode: sanitizeCurrencyCode(overrides.currencyCode || base.currencyCode),
  dateFormat: sanitizeDateFormat(overrides.dateFormat || base.dateFormat),
});

export const getStoredLocaleSettings = () => {
  const stored = {
    language: sanitizeLanguage(
      readStoredValue(COMPANY_LOCALE_STORAGE_KEYS.language, LEGACY_KEYS.language),
    ),
    currencyCode: sanitizeCurrencyCode(
      readStoredValue(COMPANY_LOCALE_STORAGE_KEYS.currencyCode, LEGACY_KEYS.currencyCode),
    ),
    dateFormat: sanitizeDateFormat(
      readStoredValue(COMPANY_LOCALE_STORAGE_KEYS.dateFormat, LEGACY_KEYS.dateFormat),
    ),
  };
  return mergeLocale(DEFAULT_COMPANY_LOCALE, stored);
};

export const resolveLocaleSettings = (overrides = {}) =>
  mergeLocale(getStoredLocaleSettings(), overrides);

export const persistLocaleSettings = (values = {}) => {
  const next = resolveLocaleSettings(values);
  writeStoredValue(
    COMPANY_LOCALE_STORAGE_KEYS.language,
    LEGACY_KEYS.language,
    next.language,
  );
  writeStoredValue(
    COMPANY_LOCALE_STORAGE_KEYS.currencyCode,
    LEGACY_KEYS.currencyCode,
    next.currencyCode,
  );
  writeStoredValue(
    COMPANY_LOCALE_STORAGE_KEYS.dateFormat,
    LEGACY_KEYS.dateFormat,
    next.dateFormat,
  );
  return next;
};

const pickLocaleFromRecord = (record) => {
  if (!record || typeof record !== "object") {
    return null;
  }

  const language = String(record.language || record.locale || record.language_code || "").trim();
  const currencyCode = String(
    record.currency_code || record.currencyCode || record.currency || "",
  ).trim();
  const dateFormat = String(record.date_format || record.dateFormat || "").trim();

  if (!language && !currencyCode && !dateFormat) {
    return null;
  }

  return {
    language: sanitizeLanguage(language),
    currencyCode: sanitizeCurrencyCode(currencyCode),
    dateFormat: sanitizeDateFormat(dateFormat),
  };
};

export const extractLocaleSettingsFromPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidates = [
    payload,
    payload.companyInfo,
    payload.company_info,
    payload.company,
    payload.company_details,
    payload.organization,
    payload.organization_info,
  ];

  const response = payload.response;
  if (response && typeof response === "object") {
    candidates.push(
      response,
      response.companyInfo,
      response.company_info,
      response.company,
      response.company_details,
      response.organization_info,
    );
  }

  for (const candidate of candidates) {
    const picked = pickLocaleFromRecord(candidate);
    if (picked) {
      return picked;
    }
  }

  return null;
};

export const syncLocaleSettingsFromPayload = (payload) => {
  const extracted = extractLocaleSettingsFromPayload(payload);
  if (!extracted) {
    return getStoredLocaleSettings();
  }
  return persistLocaleSettings(extracted);
};

const toValidDate = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const formatByPattern = (date, pattern, language) => {
  const day = String(date.getDate()).padStart(2, "0");
  const monthNumber = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const yearShort = year.slice(-2);
  const monthShort = new Intl.DateTimeFormat(language, { month: "short" }).format(date);
  const monthLong = new Intl.DateTimeFormat(language, { month: "long" }).format(date);

  return pattern
    .replace(/YYYY/g, year)
    .replace(/YY/g, yearShort)
    .replace(/MMMM/g, monthLong)
    .replace(/MMM/g, monthShort)
    .replace(/MM/g, monthNumber)
    .replace(/DD/g, day);
};

export const formatDateValue = (value, options = {}) => {
  if (value === null || value === undefined || value === "") {
    return options.fallback ?? "-";
  }

  const parsed = toValidDate(value);
  if (!parsed) {
    return typeof value === "string" ? value : options.fallback ?? "-";
  }

  const locale = resolveLocaleSettings(options.locale);
  const dateText = formatByPattern(
    parsed,
    sanitizeDateFormat(options.dateFormat || locale.dateFormat),
    sanitizeLanguage(locale.language),
  );

  if (!options.includeTime) {
    return dateText;
  }

  const timeText = new Intl.DateTimeFormat(locale.language, {
    hour: "2-digit",
    minute: "2-digit",
    ...(options.includeSeconds ? { second: "2-digit" } : {}),
  }).format(parsed);

  return `${dateText}, ${timeText}`;
};

export const formatDateTimeValue = (value, options = {}) =>
  formatDateValue(value, { ...options, includeTime: true });

export const formatCurrencyValue = (value, options = {}) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) {
    return options.fallback ?? "0";
  }

  const locale = resolveLocaleSettings(options.locale);
  const currencyCode = sanitizeCurrencyCode(options.currencyCode || locale.currencyCode);

  try {
    return new Intl.NumberFormat(locale.language, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: options.minimumFractionDigits,
      maximumFractionDigits: options.maximumFractionDigits,
      useGrouping: options.useGrouping ?? true,
    }).format(numeric);
  } catch (_error) {
    return new Intl.NumberFormat(DEFAULT_COMPANY_LOCALE.language, {
      style: "currency",
      currency: DEFAULT_COMPANY_LOCALE.currencyCode,
      minimumFractionDigits: options.minimumFractionDigits,
      maximumFractionDigits: options.maximumFractionDigits,
      useGrouping: options.useGrouping ?? true,
    }).format(numeric);
  }
};

export const formatNumberValue = (value, options = {}) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) {
    return options.fallback ?? "0";
  }

  const locale = resolveLocaleSettings(options.locale);
  return new Intl.NumberFormat(locale.language, {
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
    useGrouping: options.useGrouping ?? true,
  }).format(numeric);
};

export const toDateInputValue = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const plain = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (plain) {
      return `${plain[1]}-${plain[2]}-${plain[3]}`;
    }
  }

  const parsed = toValidDate(value);
  if (!parsed) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
};

export const clearStoredLocaleSettings = () => {
  const local = getLocalStorage();
  const session = getSessionStorage();

  if (local) {
    Object.values(COMPANY_LOCALE_STORAGE_KEYS).forEach((key) =>
      local.removeItem(key),
    );
  }

  if (session) {
    Object.values(COMPANY_LOCALE_STORAGE_KEYS).forEach((key) =>
      session.removeItem(key),
    );
  }
};
