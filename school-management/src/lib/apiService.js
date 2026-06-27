import { redirectToLoginIfUnauthorized } from "./authRedirect";

const BASE_URL ="/api/"

const defaultHeaders = () => ({
  "Content-Type": "application/json",
});

function getAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }
  hydrateTokensFromUrl();
  return getStoredAccessToken();
}

function buildAuthHeaders(accessToken = "") {
  const token = accessToken || getAccessToken();
  return {
    ...defaultHeaders(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function getApiErrorMessage(response, fallbackMessage) {
  try {
    const errorBody = await response.json();

    const extractMessage = (value) => {
      if (!value) {
        return "";
      }
      if (typeof value === "string") {
        return value.trim();
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          const nested = extractMessage(item);
          if (nested) {
            return nested;
          }
        }
        return "";
      }
      if (typeof value === "object") {
        if (value.detail) {
          return extractMessage(value.detail);
        }
        if (value.error) {
          return extractMessage(value.error);
        }
        if (Array.isArray(value.non_field_errors)) {
          return extractMessage(value.non_field_errors);
        }

        const entries = Object.entries(value);
        for (const [, item] of entries) {
          const nested = extractMessage(item);
          if (nested) {
            return nested;
          }
        }
      }
      return "";
    };

    return extractMessage(errorBody) || fallbackMessage;
  } catch (_error) {
    return fallbackMessage;
  }
}

let refreshInFlight = null;

function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("token") ||
    ""
  );
}

function getStoredRefreshToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return (
    localStorage.getItem("refresh_token") ||
    localStorage.getItem("refresh") ||
    ""
  );
}

function persistTokens({ accessToken = "", refreshToken = "" } = {}) {
  if (typeof window === "undefined") {
    return;
  }
  if (accessToken) {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("access", accessToken);
    localStorage.setItem("token", accessToken);
  }
  if (refreshToken) {
    localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("refresh", refreshToken);
  }
}

function clearTokens() {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem("access_token");
  localStorage.removeItem("access");
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("refresh");
}

function hydrateTokensFromUrl() {
  if (typeof window === "undefined") {
    return;
  }
  const params = new URLSearchParams(window.location.search || "");
  const accessToken =
    params.get("access_token") || params.get("access") || "";
  const refreshToken =
    params.get("refresh_token") || params.get("refresh") || "";
  if (accessToken || refreshToken) {
    persistTokens({ accessToken, refreshToken });
  }
}

async function refreshAccessToken() {
  if (typeof window === "undefined") {
    throw new Error("Cannot refresh token on server side");
  }

  hydrateTokensFromUrl();

  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      redirectToLoginIfUnauthorized(401);
      throw new Error("No refresh token found");
    }

    const response = await fetch(`${BASE_URL}auth/token/refresh/`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      redirectToLoginIfUnauthorized(response.status);
      throw new Error("Session expired. Please login again.");
    }

    const data = await response.json();
    const newAccessToken = data.access || "";
    const newRefreshToken = data.refresh || refreshToken;

    if (!newAccessToken) {
      throw new Error("Token refresh failed");
    }

    persistTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    return newAccessToken;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function authorizedFetch(
  path,
  { method = "GET", body = null, accessToken = "", queryParams = {} } = {},
) {
  let initialToken = accessToken || getAccessToken();
  if (!initialToken && getStoredRefreshToken()) {
    initialToken = await refreshAccessToken();
  }
  if (!initialToken) {
    throw new Error("No access token found");
  }

  const execute = async (token) => {
    const [rawPath, rawQuery = ""] = String(path || "").split("?");
    const normalizedPath = rawPath.endsWith("/") ? rawPath : `${rawPath}/`;
    const params = new URLSearchParams(rawQuery);

    Object.entries(queryParams || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }
      params.set(key, String(value));
    });

    params.set("access_token", token);

    return fetch(`${BASE_URL}${normalizedPath}?${params.toString()}`, {
      method,
      headers: buildAuthHeaders(token),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  };

  let response = await execute(initialToken);
  if (response.status !== 401 && response.status !== 403) {
    return response;
  }

  const refreshedToken = await refreshAccessToken();
  response = await execute(refreshedToken);
  if (response.status === 401 || response.status === 403) {
    redirectToLoginIfUnauthorized(response.status);
  }
  return response;
}

export async function uploadImageFromAnyWhere(file, username, companyId) {
  const formData = new FormData();
  formData.append("file", file);
  if (username) {
    formData.append("username", username);
  }
  if (companyId) {
    formData.append("company_id", companyId);
    formData.append("cid", companyId);
  }
  const accessToken = getAccessToken();
  if (accessToken) {
    formData.append("access_token", accessToken);
  }

  const response = await fetch("/api/shared_api/uploadImageFromAnyWhere/", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, "Unable to upload image"));
  }

  const data = await response.json();
  if (data?.response?.status === false) {
    throw new Error(data?.response?.msg || "Unable to upload image");
  }
  return data;
}

export function extractAttachmentIdFromUploadResponse(uploadResponse) {
  const candidates = [
    uploadResponse?.response?.file?.id,
    uploadResponse?.response?.file?.attachment_id,
    uploadResponse?.response?.attachment_id,
    uploadResponse?.response?.id,
    uploadResponse?.attachment_id,
    uploadResponse?.id,
    uploadResponse?.file?.id,
    uploadResponse?.file?.attachment_id,
  ];

  for (const candidate of candidates) {
    const numericId = Number(candidate);
    if (Number.isFinite(numericId) && numericId > 0) {
      return numericId;
    }
  }

  return null;
}

export async function getAttachmentsWithIDs(attachmentIds, accessTokenFromSubmit = "") {
  const response = await authorizedFetch("shared_api/getAttachmentsWithIDs", {
    method: "POST",
    body: {
      attachment_ids: JSON.stringify(attachmentIds || []),
    },
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(response, "Unable to fetch attachment preview"),
    );
  }

  return response.json();
}

export async function getCurrentSchoolInfo() {
  if (typeof window === "undefined") {
    return null;
  }

  const response = await authorizedFetch("account/companies/school-info");

  if (!response.ok) {
    throw new Error("Unable to fetch school info");
  }

  return response.json();
}

export async function getAllActiveCompanyUser() {
  const response = await authorizedFetch("account/getAllActiveCompanyUser");

  if (!response.ok) {
    throw new Error("Unable to fetch company users");
  }

  return response.json();
}

export async function getAllCountries() {
  const response = await authorizedFetch("shared_api/getAllCountries");

  if (!response.ok) {
    throw new Error("Unable to fetch countries");
  }

  return response.json();
}

export async function getAllStates(countryCode) {
  const normalizedCountryCode = String(countryCode || "").trim();
  if (!normalizedCountryCode) {
    throw new Error("Country code is required");
  }

  const response = await authorizedFetch(
    `shared_api/getAllStates/${normalizedCountryCode}`,
  );

  if (!response.ok) {
    throw new Error("Unable to fetch states");
  }

  return response.json();
}

export async function getCompanyTeacherCount() {
  const response = await authorizedFetch("account/companies/teacher-count");

  if (!response.ok) {
    throw new Error("Unable to fetch teacher count");
  }

  return response.json();
}

export async function getCompanyStudentCount() {
  const response = await authorizedFetch("account/companies/student-count");

  if (!response.ok) {
    throw new Error("Unable to fetch student count");
  }

  return response.json();
}

export async function getAcademicYearList() {
  const response = await authorizedFetch("school-management/academic-year-list");

  if (!response.ok) {
    throw new Error("Unable to fetch academic year list");
  }

  return response.json();
}

export async function createAcademicYearList(payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch("school-management/academic-year-list", {
    method: "POST",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    let detail = "Unable to create academic year";
    try {
      const errorBody = await response.json();
      detail =
        errorBody?.detail ||
        errorBody?.error ||
        (Array.isArray(errorBody?.non_field_errors)
          ? errorBody.non_field_errors[0]
          : null) ||
        detail;
    } catch (_error) {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function updateAcademicYearList(academicYearId, payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(
    `school-management/academic-year-list/${academicYearId}`,
    {
      method: "PUT",
      body: payload,
      accessToken: accessTokenFromSubmit,
    },
  );

  if (!response.ok) {
    let detail = "Unable to update academic year";
    try {
      const errorBody = await response.json();
      detail =
        errorBody?.detail ||
        errorBody?.error ||
        (Array.isArray(errorBody?.non_field_errors)
          ? errorBody.non_field_errors[0]
          : null) ||
        detail;
    } catch (_error) {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function delistAcademicYearList(academicYearId, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(
    `school-management/academic-year-list/${academicYearId}`,
    {
      method: "DELETE",
      accessToken: accessTokenFromSubmit,
    },
  );

  if (!response.ok) {
    throw new Error("Unable to delete academic year");
  }
}

export async function getClassList() {
  const response = await authorizedFetch("school-management/class-list");

  if (!response.ok) {
    throw new Error("Unable to fetch class list");
  }

  return response.json();
}

export async function createClassList(payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch("school-management/class-list", {
    method: "POST",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error("Unable to create class");
  }

  return response.json();
}

export async function updateClassList(classId, payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/class-list/${classId}`, {
    method: "PUT",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error("Unable to update class");
  }

  return response.json();
}

export async function delistClassList(classId, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/class-list/${classId}`, {
    method: "DELETE",
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error("Unable to delist class");
  }
}

export async function getClassFeeStructureList() {
  const response = await authorizedFetch("school-management/class-fee-structure-list");

  if (!response.ok) {
    throw new Error("Unable to fetch class fee structure list");
  }

  return response.json();
}

export async function createClassFeeStructure(payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch("school-management/class-fee-structure-list", {
    method: "POST",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(response, "Unable to create class fee structure"),
    );
  }

  return response.json();
}

export async function getClassFeeStructureById(feeId) {
  const response = await authorizedFetch(`school-management/class-fee-structure-list/${feeId}`);

  if (!response.ok) {
    throw new Error("Unable to fetch class fee structure");
  }

  return response.json();
}

export async function updateClassFeeStructure(feeId, payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/class-fee-structure-list/${feeId}`, {
    method: "PUT",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(response, "Unable to update class fee structure"),
    );
  }

  return response.json();
}

export async function delistClassFeeStructure(feeId, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/class-fee-structure-list/${feeId}`, {
    method: "DELETE",
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error("Unable to delist class fee structure");
  }
}

export async function getStudentFeesCollectionList() {
  const response = await authorizedFetch("school-management/student-fees-collection-list");

  if (!response.ok) {
    throw new Error("Unable to fetch student fees collection list");
  }

  return response.json();
}

export async function getStudentFeesCollectionHistory(studentAcademicRecordId) {
  const normalizedId = Number.parseInt(String(studentAcademicRecordId ?? ""), 10);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    throw new Error("Invalid student academic record id");
  }

  const response = await authorizedFetch(
    `school-management/student-fees-collection-list?student_academic_rcord_id=${normalizedId}`,
  );

  if (!response.ok) {
    throw new Error("Unable to fetch student fees payment history");
  }

  return response.json();
}

export async function createStudentFeesCollection(payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch("school-management/student-fees-collection-list", {
    method: "POST",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(response, "Unable to create student fees collection"),
    );
  }

  return response.json();
}

export async function getStudentFeesCollectionById(collectionId) {
  const response = await authorizedFetch(
    `school-management/student-fees-collection-list/${collectionId}`,
  );

  if (!response.ok) {
    throw new Error("Unable to fetch student fees collection record");
  }

  return response.json();
}

export async function updateStudentFeesCollection(
  collectionId,
  payload,
  accessTokenFromSubmit = "",
) {
  const response = await authorizedFetch(
    `school-management/student-fees-collection-list/${collectionId}`,
    {
      method: "PUT",
      body: payload,
      accessToken: accessTokenFromSubmit,
    },
  );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(response, "Unable to update student fees collection"),
    );
  }

  return response.json();
}

export async function delistStudentFeesCollection(
  collectionId,
  accessTokenFromSubmit = "",
) {
  const response = await authorizedFetch(
    `school-management/student-fees-collection-list/${collectionId}`,
    {
      method: "DELETE",
      accessToken: accessTokenFromSubmit,
    },
  );

  if (!response.ok) {
    throw new Error("Unable to delist student fees collection");
  }
}

export async function getSectionList() {
  const response = await authorizedFetch("school-management/section-list");

  if (!response.ok) {
    throw new Error("Unable to fetch section list");
  }

  return response.json();
}

export async function createSectionList(payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch("school-management/section-list", {
    method: "POST",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error("Unable to create section");
  }

  return response.json();
}

export async function updateSectionList(sectionId, payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/section-list/${sectionId}`, {
    method: "PUT",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error("Unable to update section");
  }

  return response.json();
}

export async function delistSectionList(sectionId, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/section-list/${sectionId}`, {
    method: "DELETE",
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error("Unable to delist section");
  }
}

export async function getSubjectList() {
  const response = await authorizedFetch("school-management/subject-list");

  if (!response.ok) {
    throw new Error("Unable to fetch subject list");
  }

  return response.json();
}

export async function getSubjectListById(subjectId) {
  const response = await authorizedFetch(`school-management/subject-list/${subjectId}`);

  if (!response.ok) {
    throw new Error("Unable to fetch subject");
  }

  return response.json();
}

export async function createSubjectList(payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch("school-management/subject-list", {
    method: "POST",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    let detail = "Unable to create subject";
    try {
      const errorBody = await response.json();
      detail =
        errorBody?.detail ||
        errorBody?.error ||
        (Array.isArray(errorBody?.non_field_errors)
          ? errorBody.non_field_errors[0]
          : null) ||
        detail;
    } catch (_error) {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function updateSubjectList(subjectId, payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/subject-list/${subjectId}`, {
    method: "PUT",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    let detail = "Unable to update subject";
    try {
      const errorBody = await response.json();
      detail =
        errorBody?.detail ||
        errorBody?.error ||
        (Array.isArray(errorBody?.non_field_errors)
          ? errorBody.non_field_errors[0]
          : null) ||
        detail;
    } catch (_error) {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function delistSubjectList(subjectId, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/subject-list/${subjectId}`, {
    method: "DELETE",
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error("Unable to delist subject");
  }
}

export async function getExamTypeList({ page, pageSize } = {}) {
  const response = await authorizedFetch("school-management/exam-type-list", {
    queryParams: {
      page,
      page_size: pageSize,
    },
  });

  if (!response.ok) {
    throw new Error("Unable to fetch exam type list");
  }

  return response.json();
}

export async function getExamTypeListById(examTypeId) {
  const response = await authorizedFetch(`school-management/exam-type-list/${examTypeId}`);

  if (!response.ok) {
    throw new Error("Unable to fetch exam type");
  }

  return response.json();
}

export async function createExamTypeList(payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch("school-management/exam-type-list", {
    method: "POST",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    let detail = "Unable to create exam type";
    try {
      const errorBody = await response.json();
      detail =
        errorBody?.detail ||
        errorBody?.error ||
        (Array.isArray(errorBody?.non_field_errors)
          ? errorBody.non_field_errors[0]
          : null) ||
        detail;
    } catch (_error) {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function updateExamTypeList(examTypeId, payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/exam-type-list/${examTypeId}`, {
    method: "PUT",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    let detail = "Unable to update exam type";
    try {
      const errorBody = await response.json();
      detail =
        errorBody?.detail ||
        errorBody?.error ||
        (Array.isArray(errorBody?.non_field_errors)
          ? errorBody.non_field_errors[0]
          : null) ||
        detail;
    } catch (_error) {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function delistExamTypeList(examTypeId, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/exam-type-list/${examTypeId}`, {
    method: "DELETE",
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error("Unable to delist exam type");
  }
}

export async function getExamScheduleList() {
  const response = await authorizedFetch("school-management/exam-schedule-list");

  if (!response.ok) {
    throw new Error("Unable to fetch exam schedule list");
  }

  return response.json();
}

export async function createExamScheduleList(payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch("school-management/exam-schedule-list", {
    method: "POST",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    let detail = "Unable to create exam schedule";
    try {
      const errorBody = await response.json();
      detail =
        errorBody?.detail ||
        errorBody?.error ||
        (Array.isArray(errorBody?.non_field_errors)
          ? errorBody.non_field_errors[0]
          : null) ||
        detail;
    } catch (_error) {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function updateExamScheduleList(examScheduleId, payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/exam-schedule-list/${examScheduleId}`, {
    method: "PUT",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    let detail = "Unable to update exam schedule";
    try {
      const errorBody = await response.json();
      detail =
        errorBody?.detail ||
        errorBody?.error ||
        (Array.isArray(errorBody?.non_field_errors)
          ? errorBody.non_field_errors[0]
          : null) ||
        detail;
    } catch (_error) {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function delistExamScheduleList(examScheduleId, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/exam-schedule-list/${examScheduleId}`, {
    method: "DELETE",
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error("Unable to delist exam schedule");
  }
}

export async function getStudentExamMarksList() {
  const response = await authorizedFetch("school-management/student-exam-marks-list");

  if (!response.ok) {
    throw new Error("Unable to fetch student exam marks list");
  }

  return response.json();
}

export async function createStudentExamMarksList(payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch("school-management/student-exam-marks-list", {
    method: "POST",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    let detail = "Unable to create student exam marks";
    try {
      const errorBody = await response.json();
      const extractMessage = (value) => {
        if (!value) {
          return "";
        }
        if (typeof value === "string") {
          return value.trim();
        }
        if (Array.isArray(value)) {
          for (const item of value) {
            const nested = extractMessage(item);
            if (nested) {
              return nested;
            }
          }
          return "";
        }
        if (typeof value === "object") {
          if (value.detail) {
            return extractMessage(value.detail);
          }
          if (value.error) {
            return extractMessage(value.error);
          }
          if (Array.isArray(value.non_field_errors)) {
            return extractMessage(value.non_field_errors);
          }
          for (const [, nestedValue] of Object.entries(value)) {
            const nested = extractMessage(nestedValue);
            if (nested) {
              return nested;
            }
          }
        }
        return "";
      };

      detail = extractMessage(errorBody) || detail;
    } catch (_error) {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function updateStudentExamMarksList(markId, payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/student-exam-marks-list/${markId}`, {
    method: "PUT",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    let detail = "Unable to update student exam marks";
    try {
      const errorBody = await response.json();
      detail =
        errorBody?.detail ||
        errorBody?.error ||
        (Array.isArray(errorBody?.non_field_errors)
          ? errorBody.non_field_errors[0]
          : null) ||
        detail;
    } catch (_error) {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function delistStudentExamMarksList(markId, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/student-exam-marks-list/${markId}`, {
    method: "DELETE",
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error("Unable to delete student exam marks");
  }
}

export async function getTeacherList() {
  const response = await authorizedFetch("school-management/teacher-list");

  if (!response.ok) {
    throw new Error("Unable to fetch teacher list");
  }

  return response.json();
}

export async function sendOrganizationEmailOtp(email) {
  const response = await fetch(`${BASE_URL}auth/organizations/email-otp/`, {
    method: "POST",
    headers: defaultHeaders(),
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(response, "Unable to send OTP"),
    );
  }

  return response.json();
}

export async function verifyOrganizationEmailOtp(email, otp) {
  const response = await fetch(`${BASE_URL}auth/organizations/email-otp/verify/`, {
    method: "POST",
    headers: defaultHeaders(),
    body: JSON.stringify({ email, otp }),
  });

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(response, "Unable to verify OTP"),
    );
  }

  return response.json();
}

export async function createTeacherList(payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch("school-management/teacher-list", {
    method: "POST",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(response, "Unable to create teacher"),
    );
  }

  return response.json();
}

export async function updateTeacherList(teacherId, payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/teacher-list/${teacherId}`, {
    method: "PUT",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(response, "Unable to update teacher"),
    );
  }

  return response.json();
}

export async function delistTeacherList(teacherId, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/teacher-list/${teacherId}`, {
    method: "DELETE",
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error("Unable to delete teacher");
  }
}

export async function getNonTeachingStaffList() {
  const response = await authorizedFetch("school-management/non-teaching-staff-list");

  if (!response.ok) {
    throw new Error("Unable to fetch non-teaching staff list");
  }

  return response.json();
}

export async function createNonTeachingStaffList(payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch("school-management/non-teaching-staff-list", {
    method: "POST",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    let detail = "Unable to create non-teaching staff";
    try {
      const errorBody = await response.json();
      detail =
        errorBody?.detail ||
        errorBody?.error ||
        (Array.isArray(errorBody?.non_field_errors)
          ? errorBody.non_field_errors[0]
          : null) ||
        detail;
    } catch (_error) {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function updateNonTeachingStaffList(staffId, payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/non-teaching-staff-list/${staffId}`, {
    method: "PUT",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    let detail = "Unable to update non-teaching staff";
    try {
      const errorBody = await response.json();
      detail =
        errorBody?.detail ||
        errorBody?.error ||
        (Array.isArray(errorBody?.non_field_errors)
          ? errorBody.non_field_errors[0]
          : null) ||
        detail;
    } catch (_error) {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function delistNonTeachingStaffList(staffId, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/non-teaching-staff-list/${staffId}`, {
    method: "DELETE",
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error("Unable to delete non-teaching staff");
  }
}

export async function getStudentList({ page, pageSize, search } = {}) {
  const response = await authorizedFetch("school-management/student-list", {
    queryParams: {
      page,
      page_size: pageSize,
      search,
    },
  });

  if (!response.ok) {
    throw new Error("Unable to fetch student list");
  }

  return response.json();
}

export async function getStudentListById(studentId) {
  const response = await authorizedFetch(`school-management/student-list/${studentId}`);

  if (!response.ok) {
    throw new Error("Unable to fetch student details");
  }

  return response.json();
}

export async function createStudentList(payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch("school-management/student-list", {
    method: "POST",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    let detail = "Unable to create student";
    try {
      const errorBody = await response.json();
      detail =
        errorBody?.detail ||
        errorBody?.error ||
        (Array.isArray(errorBody?.non_field_errors)
          ? errorBody.non_field_errors[0]
          : null) ||
        detail;
    } catch (_error) {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function updateStudentList(studentId, payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/student-list/${studentId}`, {
    method: "PUT",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    let detail = "Unable to update student";
    try {
      const errorBody = await response.json();
      detail =
        errorBody?.detail ||
        errorBody?.error ||
        (Array.isArray(errorBody?.non_field_errors)
          ? errorBody.non_field_errors[0]
          : null) ||
        detail;
    } catch (_error) {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function delistStudentList(studentId, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/student-list/${studentId}`, {
    method: "DELETE",
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error("Unable to delete student");
  }
}

export async function getStudentAcademicRecordList() {
  const response = await authorizedFetch("school-management/student-academic-record-list");

  if (!response.ok) {
    throw new Error("Unable to fetch student academic record list");
  }

  return response.json();
}

export async function createStudentAcademicRecordList(payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch("school-management/student-academic-record-list", {
    method: "POST",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    let detail = "Unable to create student academic record";
    try {
      const errorBody = await response.json();
      detail =
        errorBody?.detail ||
        errorBody?.error ||
        (Array.isArray(errorBody?.non_field_errors)
          ? errorBody.non_field_errors[0]
          : null) ||
        detail;
    } catch (_error) {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function updateStudentAcademicRecordList(recordId, payload, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/student-academic-record-list/${recordId}`, {
    method: "PUT",
    body: payload,
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    let detail = "Unable to update student academic record";
    try {
      const errorBody = await response.json();
      detail =
        errorBody?.detail ||
        errorBody?.error ||
        (Array.isArray(errorBody?.non_field_errors)
          ? errorBody.non_field_errors[0]
          : null) ||
        detail;
    } catch (_error) {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function delistStudentAcademicRecordList(recordId, accessTokenFromSubmit = "") {
  const response = await authorizedFetch(`school-management/student-academic-record-list/${recordId}`, {
    method: "DELETE",
    accessToken: accessTokenFromSubmit,
  });

  if (!response.ok) {
    throw new Error("Unable to delete student academic record");
  }
}

function getVoucherAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    ""
  );
}

function encodeVoucherFormPayload(payload) {
  const params = new URLSearchParams();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  return params.toString();
}

async function postVoucherForm(path, payload) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(getVoucherAccessToken()
        ? { Authorization: `Bearer ${getVoucherAccessToken()}` }
        : {}),
    },
    body: encodeVoucherFormPayload(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      data?.msg ||
      data?.response ||
      data?.error ||
      response.statusText ||
      "Voucher request failed";
    const error = new Error(message);
    error.response = { data };
    throw error;
  }
  return data;
}

export async function getReceiptVoucherDebitAccounts() {
  const response = await postVoucherForm("voucher_api/getAllAccountNameDebit/Receipt", {
    access_token: getVoucherAccessToken() || undefined,
  });
  return response?.response || [];
}

export async function getReceiptVoucherCreditAccounts() {
  const response = await postVoucherForm("voucher_api/getAllAccountNameCredit/Receipt", {
    access_token: getVoucherAccessToken() || undefined,
    cr_acnt: "",
  });
  return response?.response || [];
}

export async function generateReceiptVoucherId(companyId) {
  if (!companyId) {
    throw new Error("company_id is required to generate voucher id.");
  }
  const voucherToken = `${companyId}-rv-`;
  const response = await postVoucherForm(`voucher_api/generateVoucherId/${voucherToken}`, {
    access_token: getVoucherAccessToken() || undefined,
  });
  return response || "";
}

export async function createReceiptVoucher(payload) {
  const amountValue = Number(payload?.amount) || 0;
  const transactionDescription =
    String(payload?.description || "").trim() ||
    `Receipt via ${payload?.payment_mode || "ONLINE"}`;
  const voucherPayload = {
    id: payload?.voucher_table_id ? Number(payload.voucher_table_id) : null,
    company_id: Number(payload?.company_id),
    voucher_type: "Receipt",
    voucher_id: payload?.voucher_id || null,
    voucher_no: null,
    voucher_source: "un_linked",
    voucher_date: payload?.voucher_date,
    paid_from_account_name_id: Number(payload?.cr_account_name_id),
    payment_mode: payload?.payment_mode || "ONLINE",
    total_amount: amountValue,
    note: payload?.description || null,
    reference_no: payload?.reference_no || "",
    created_by: payload?.created_by || "Web User",
    created_on: new Date().toISOString(),
  };

  const transactionPayload = {
    ...(payload?.transaction_id ? { id: Number(payload.transaction_id) } : {}),
    company_id: Number(payload?.company_id),
    voucher_id: payload?.voucher_id || null,
    dr_account_name_id: Number(payload?.dr_account_name_id),
    dr_amount: amountValue,
    cr_account_name_id: Number(payload?.cr_account_name_id),
    cr_amount: amountValue,
    description: transactionDescription,
  };

  return postVoucherForm("voucher_api/addNewVoucher/", {
    access_token: getVoucherAccessToken() || undefined,
    new_voucher: JSON.stringify(voucherPayload),
    saved_transactions: JSON.stringify([transactionPayload]),
    reason: "Created from student fees collection",
  });
}
