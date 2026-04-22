import axios from "axios";
import { environment } from "@/environments/environments";
import Router from "next/router";

const BASE_URL = environment.base_url;
const AUTH_INTERCEPTOR_KEY = "__LOGIN_AUTH_INTERCEPTOR__";

const notifyLogout = () => {
  try {
    const access_token = localStorage.getItem("access_token");
    if (!access_token) {
      return;
    }

    const url = `${BASE_URL}auth/logout/`;
    const payload = JSON.stringify({ access_token });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch (error) {
    console.error("Logout tracking failed:", error);
  }
};

export const clearLoginSession = () => {
  if (typeof window === "undefined") {
    return;
  }
  notifyLogout();
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("username");
  localStorage.removeItem("email");
  localStorage.removeItem("phone_number");
  localStorage.removeItem("is_superuser");
  localStorage.removeItem("session_user_type");
  localStorage.removeItem("company_id");
  localStorage.removeItem("organization_id");
  localStorage.removeItem("selected_organization_name");
  localStorage.removeItem("selected_company_name");
  localStorage.removeItem("pending_company_logo_id");
  localStorage.removeItem("expiry_dialog_shown");
  localStorage.removeItem("company_options");
  localStorage.removeItem("company_main_group");
  localStorage.removeItem("company_sub_group");
  window.dispatchEvent(new Event("session-context-changed"));
};

const redirectToLoginIfUnauthorized = (status) => {
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
  clearLoginSession();
  window.location.href = "/login";
};

const ensureAuthInterceptor = () => {
  if (typeof window === "undefined") {
    return;
  }
  if (window[AUTH_INTERCEPTOR_KEY]) {
    return;
  }
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      redirectToLoginIfUnauthorized(error.response?.status);
      return Promise.reject(error);
    },
  );
  window[AUTH_INTERCEPTOR_KEY] = true;
};

ensureAuthInterceptor();

export function userLogin(login, password) {
  return axios
    .post(`${BASE_URL}auth/login/`, {
      login: String(login || "").trim(),
      password,
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error in login function:", error.response?.data || error);
      throw error;
    });
}

export function sendResetPasswordMail(userId, domain) {
  return axios
    .post(`${BASE_URL}account/sendResetPasswordMail/`, {
      user_id: userId,
      domain,
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error sending reset password mail:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getCompanyUserDetailsByUsername(username) {
  const normalizedUsername = String(username || "").trim();

  if (!normalizedUsername) {
    return Promise.resolve(null);
  }

  return axios
    .get(
      `${BASE_URL}account/getCompanyUserDetailsbyusername/${encodeURIComponent(
        normalizedUsername,
      )}/`,
    )
    .then((response) => response.data)
    .catch((error) => {
      const status = error?.response?.status;
      if (status === 400 || status === 403 || status === 404) {
        return null;
      }
      console.error(
        "Error fetching company user by username:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function checkResetPasswordToken(username, token) {
  return axios
    .get(`${BASE_URL}account/checkResetPasswordToken/`, {
      params: { username, token },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error checking reset token:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function resetUserPassword(payload) {
  return axios
    .post(`${BASE_URL}account/resetUserPassword/`, payload)
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error resetting password:", error.response?.data || error);
      throw error;
    });
}

const resolveProfileTarget = async () => {
  try {
    const currentUser = await getCurrentUserStatus();
    const userType =
      currentUser?.data?.user?.user_type ||
      currentUser?.data?.user_type ||
      "";
    const normalizedUserType = String(userType).toLowerCase();
    if (normalizedUserType.includes("company")) {
      return "company";
    }
    if (normalizedUserType.includes("organization")) {
      return "organization";
    }
  } catch (err) {
    // fall through to company
  }
  const organization_id = localStorage.getItem("organization_id");
  if (organization_id) {
    return "organization";
  }
  const company_id = localStorage.getItem("company_id");
  if (company_id) {
    return "company";
  }
  return "company";
};

export async function updateCompanyUserProfile(payload) {
  const access_token = localStorage.getItem("access_token");
  const target = await resolveProfileTarget();
  if (target === "organization") {
    return updateOrganizationUserProfile(payload);
  }
  const company_id = localStorage.getItem("company_id");

  return axios
    .post(`${BASE_URL}account/updateCompanyUserProfile/`, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      params: {
        ...(company_id ? { company_id } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating user profile:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateOrganizationUserProfile(payload) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .post(`${BASE_URL}auth/organization-users/profile/`, payload, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating organization user profile:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function uploadImageFromAnyWhere(file, username, companyId) {
  const formData = new FormData();
  formData.append("file", file);
  if (username) {
    formData.append("username", username);
  }
  if (companyId) {
    formData.append("cid", companyId);
  }

  return axios
    .post(`${BASE_URL}shared_api/uploadImageFromAnyWhere/`, formData)
    .then((response) => response.data)
    .catch((error) => {
      const status = error?.response?.status;
      const responseData = error?.response?.data;
      const isHtmlError =
        typeof responseData === "string" &&
        /<html[\s>]/i.test(responseData);
      const friendlyMessage =
        status === 413
          ? "Upload failed: the selected file is too large for the server limit."
          : error?.response?.data?.detail ||
            error?.message ||
            "Upload failed.";

      error.userFriendlyMessage = friendlyMessage;

      console.error(
        "Error uploading image:",
        isHtmlError || status === 413
          ? {
              status,
              message: friendlyMessage,
            }
          : responseData || error,
      );
      throw error;
    });
}

export async function changeUserImage(imageId) {
  const access_token = localStorage.getItem("access_token");
  const target = await resolveProfileTarget();
  if (target === "organization") {
    try {
      return await changeOrganizationUserImage(imageId);
    } catch (error) {
      if (error?.response?.status !== 404) {
        throw error;
      }
      // Fall back to company user endpoint if org route is unavailable.
    }
  }
  const company_id = localStorage.getItem("company_id");

  return axios
    .put(
      `${BASE_URL}account/changeUserImage/`,
      { image_id: imageId },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating user image:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function changeOrganizationUserImage(imageId) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .put(
      `${BASE_URL}auth/organization-users/change-image/`,
      { image_id: imageId },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating organization user image:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function get_Hospital_User_Login_Details(username) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .get(`${BASE_URL}account/legacy/current-user/`, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    })
    .then((response) => {
      console.log(response.data);

      return response.data;
    })
    .catch((error) => {
      const status = error.response?.status;
      if (status === 401) {
        Router.push("/login");
      } else if (status === 404) {
        console.warn("Hospital user details not found for:", username);
        return null;
      }
      console.error(
        "Error fetching hospital user details:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function registerHospital(userData) {
  const payload = new URLSearchParams({
    user_data: JSON.stringify(userData),
  });

  return axios
    .post(`${BASE_URL}authentication/register/`, payload.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error in register function:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function usernameExists(username) {
  return axios
    .get(`${BASE_URL}authentication/username-exists/`, {
      params: { username },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error checking username:", error.response?.data || error);
      throw error;
    });
}

export function emailExists(email) {
  return axios
    .get(`${BASE_URL}authentication/email-exists/`, {
      params: { email },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error checking email:", error.response?.data || error);
      throw error;
    });
}

// export function getCurrentUser() {
//   const access_token = localStorage.getItem("access_token");
//   const company_id = localStorage.getItem("company_id");

//   if (!access_token) {
//     console.error("No access token found, cannot fetch current user.");
//     return Promise.resolve(null);
//   }

//   return axios
//     .get(`${BASE_URL}account/getCurrentUser/`, {
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${access_token}`,
//       },
//       params: {
//         access_token,
//         ...(company_id ? { company_id } : {}),
//       },
//     })
//     .then((response) => response.data)
//     .catch((error) => {
//       const status = error.response?.status;
//       if (status === 401 || status === 403) {
//         return null;
//       }
//       console.error(
//         "Error fetching current user:",
//         error.response?.data || error,
//       );
//       throw error;
//     });
// }

export function getCurrentUserStatus() {
  const access_token = localStorage.getItem("access_token");
  const company_id = localStorage.getItem("company_id");

  if (!access_token) {
    return Promise.resolve({ data: null, status: null });
  }

  return axios
    .get(`${BASE_URL}auth/current-user/`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      params: {
        ...(company_id
          ? { company_id, organization_id: company_id }
          : {}),
      },
      validateStatus: () => true,
    })
    .then(async (response) => {
      if (response.status === 404) {
        try {
          const legacyResponse = await axios.get(
            `${BASE_URL}account/legacy/current-user/`,
            {
              headers: {
                "Content-Type": "application/json",
                ...(access_token
                  ? { Authorization: `Bearer ${access_token}` }
                  : {}),
              },
              params: {
                ...(company_id ? { company_id } : {}),
              },
              validateStatus: () => true,
            },
          );
          return {
            data:
              legacyResponse.status >= 200 && legacyResponse.status < 300
                ? legacyResponse.data
                : null,
            status: legacyResponse.status,
          };
        } catch (legacyError) {
          console.error(
            "Error fetching legacy current user status:",
            legacyError.response?.data || legacyError,
          );
          throw legacyError;
        }
      }
      if (response.status === 401 || response.status === 403) {
        redirectToLoginIfUnauthorized(response.status);
      }
      return {
        data:
          response.status >= 200 && response.status < 300
            ? response.data
            : null,
        status: response.status,
      };
    })
    .catch((error) => {
      console.error(
        "Error fetching current user status:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getSchoolLoginRouteByUsername(username) {
  const access_token = localStorage.getItem("access_token");
  const normalizedUsername = String(username || "").trim();

  if (!access_token) {
    return Promise.resolve(null);
  }

  return axios
    .get(`${BASE_URL}auth/school-login-route/`, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
      params: {
        ...(normalizedUsername ? { username: normalizedUsername } : {}),
      },
    })
    .then((response) => response.data || null)
    .catch((error) => {
      const status = error?.response?.status;
      if (status === 404 || status === 403) {
        return null;
      }
      console.error(
        "Error fetching school login route by username:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createOrganization(payload) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .post(`${BASE_URL}auth/organizations/`, payload, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating organization:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function provisionOrganization(payload) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .post(`${BASE_URL}auth/organizations/provision/`, payload, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error provisioning organization:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function sendOrganizationEmailOtp(email) {
  return axios
    .post(`${BASE_URL}auth/organizations/email-otp/`, { email }, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error sending organization email OTP:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function verifyOrganizationEmailOtp(email, otp) {
  return axios
    .post(`${BASE_URL}auth/organizations/email-otp/verify/`, { email, otp }, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error verifying organization email OTP:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function sendOrganizationInvite(payload) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .post(`${BASE_URL}auth/organizations/invite/`, payload, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error sending organization invitation:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateOrganization(organizationId, payload) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .patch(`${BASE_URL}auth/organizations/${organizationId}/`, payload, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating organization:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createCompanyAccount(payload) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .post(`${BASE_URL}account/companies/create/`, payload, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating company account:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getOrganizations() {
  const access_token = localStorage.getItem("access_token");

  return axios
    .get(`${BASE_URL}auth/organizations/`, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching organizations:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createOrganizationUser(payload) {
  const organizationId = payload?.organization_id ?? payload?.company_id;
  return axios
    .post(
      `${BASE_URL}auth/register/`,
      {
        ...payload,
        ...(organizationId ? { company_id: organizationId } : {}),
        password: payload.password || "abc123",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating organization user:",
        error.response?.data || error,
      );
      throw error;
    });
}

const withOptionalAuthHeaders = () => {
  const access_token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
  };
};

export function getDepartments(companyId) {
  return axios
    .get(`${BASE_URL}hospital/departments_list/`, {
      headers: withOptionalAuthHeaders(),
      params: { company_id: companyId },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error fetching departments:", error.response?.data || error);
      throw error;
    });
}

export function createDepartment(payload) {
  return axios
    .post(`${BASE_URL}hospital/create_department/`, payload, {
      headers: withOptionalAuthHeaders(),
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error creating department:", error.response?.data || error);
      throw error;
    });
}

export function getDoctorTypes(companyId) {
  return axios
    .get(`${BASE_URL}hospital/doctor_type_list/`, {
      headers: withOptionalAuthHeaders(),
      params: { company_id: companyId },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error fetching doctor types:", error.response?.data || error);
      throw error;
    });
}

export function createDoctorType(payload) {
  return axios
    .post(`${BASE_URL}hospital/create_doctor_type/`, payload, {
      headers: withOptionalAuthHeaders(),
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error creating doctor type:", error.response?.data || error);
      throw error;
    });
}

export function getAdministrationTypes(companyId) {
  return axios
    .get(`${BASE_URL}hospital/administrator_type_list/`, {
      headers: withOptionalAuthHeaders(),
      params: { company_id: companyId },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching administration types:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createAdministrationType(payload) {
  return axios
    .post(`${BASE_URL}hospital/create_administration_type/`, payload, {
      headers: withOptionalAuthHeaders(),
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating administration type:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getStaffDepartments(companyId) {
  return axios
    .get(`${BASE_URL}hospital/staff_departments_list/`, {
      headers: withOptionalAuthHeaders(),
      params: { company_id: companyId },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching staff departments:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createStaffDepartment(payload) {
  return axios
    .post(`${BASE_URL}hospital/create_staff_department/`, payload, {
      headers: withOptionalAuthHeaders(),
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating staff department:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getStaffJobTitles(companyId) {
  return axios
    .get(`${BASE_URL}hospital/staff_job_titles_list/`, {
      headers: withOptionalAuthHeaders(),
      params: { company_id: companyId },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching staff job titles:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createStaffJobTitle(payload) {
  return axios
    .post(`${BASE_URL}hospital/create_staff_job_title/`, payload, {
      headers: withOptionalAuthHeaders(),
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating staff job title:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createSchool(payload) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .post(`${BASE_URL}auth/schools/`, payload, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating school:",
        error.response?.data || error,
      );
      throw error;
    });
}



export function getOrganizationUserDetails(username) {
  const access_token = localStorage.getItem("access_token");
  const normalizedUsername = String(username || "").trim();

  if (!normalizedUsername) {
    return Promise.resolve(null);
  }

  if (!access_token) {
    return Promise.resolve(null);
  }

  return axios
    .get(
      `${BASE_URL}auth/organization-users/${encodeURIComponent(normalizedUsername)}/`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
        },
      },
    )
    .then((response) => response.data)
    .catch(async (error) => {
      const status = error?.response?.status;

      if (status === 404) {
        try {
          const legacyResponse = await axios.get(
            `${BASE_URL}account/legacy/company-users/${encodeURIComponent(
              normalizedUsername,
            )}/`,
            {
              headers: {
                "Content-Type": "application/json",
                ...(access_token
                  ? { Authorization: `Bearer ${access_token}` }
                  : {}),
              },
            },
          );
          const legacyDetails = Array.isArray(legacyResponse.data?.details)
            ? legacyResponse.data.details[0]
            : null;
          if (!legacyDetails) {
            return null;
          }
          return {
            ...legacyDetails,
            organization:
              legacyDetails.organization_id || legacyDetails.company_id || null,
            organization_id:
              legacyDetails.organization_id || legacyDetails.company_id || null,
            phone_number: legacyDetails.mobile || "",
            user_type: "company_user",
          };
        } catch (legacyError) {
          const legacyStatus = legacyError?.response?.status;
          if (legacyStatus === 404 || legacyStatus === 403) {
            return null;
          }
          console.error(
            "Error fetching legacy organization user details:",
            legacyError?.response?.data || legacyError,
          );
          throw legacyError;
        }
      }

      if (status === 403) {
        return null;
      }

      const responseData = error?.response?.data;
      const hasResponseData =
        responseData !== null &&
        responseData !== undefined &&
        (typeof responseData !== "object" ||
          Object.keys(responseData).length > 0);

      const formattedError = hasResponseData ? responseData : {
        message: error?.message || "Unknown error",
        status: status || null,
        url: error?.config?.url || null,
      };
      console.error(
        "Error fetching organization user details:",
        formattedError,
      );
      throw error;
    });
}

export function getOrganizationUsers(params = {}) {
  const access_token = localStorage.getItem("access_token");

  if (!access_token) {
    return Promise.resolve([]);
  }

  const normalizedParams = { ...params };
  if (
    normalizedParams.organization_id &&
    normalizedParams.company_id === undefined
  ) {
    normalizedParams.company_id = normalizedParams.organization_id;
  }

  return axios
    .get(`${BASE_URL}auth/organization-users/`, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
      params: normalizedParams,
    })
    .then((response) => (Array.isArray(response.data) ? response.data : []))
    .catch((error) => {
      console.error(
        "Error fetching organization users:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getOrganizationUsersByUsername(username) {
  const access_token = localStorage.getItem("access_token");
  const normalizedUsername = String(username || "").trim();

  if (!normalizedUsername || !access_token) {
    return Promise.resolve([]);
  }

  return axios
    .get(`${BASE_URL}auth/organization-users/`, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
      params: {
        username: normalizedUsername,
      },
    })
    .then((response) => (Array.isArray(response.data) ? response.data : []))
    .catch(async (error) => {
      const status = error?.response?.status;

      if (status === 404) {
        try {
          const legacyUserResponse = await axios.get(
            `${BASE_URL}account/legacy/company-users/${encodeURIComponent(
              normalizedUsername,
            )}/`,
            {
              headers: {
                "Content-Type": "application/json",
                ...(access_token
                  ? { Authorization: `Bearer ${access_token}` }
                  : {}),
              },
            },
          );
          const legacyCompanyResponse = await axios.get(
            `${BASE_URL}account/legacy/companies/${encodeURIComponent(
              normalizedUsername,
            )}/`,
            {
              headers: {
                "Content-Type": "application/json",
                ...(access_token
                  ? { Authorization: `Bearer ${access_token}` }
                  : {}),
              },
            },
          );

          const legacyUser = Array.isArray(legacyUserResponse.data?.details)
            ? legacyUserResponse.data.details[0]
            : null;
          const legacyCompany = legacyCompanyResponse.data || null;

          if (!legacyUser || !legacyCompany?.id) {
            return [];
          }

          return [
            {
              id: legacyUser.id,
              username: legacyUser.username,
              email: legacyUser.email,
              phone_number: legacyUser.mobile || "",
              mobile: legacyUser.mobile || "",
              organization:
                legacyCompany.organization_id || legacyCompany.id,
              organization_id:
                legacyCompany.organization_id || legacyCompany.id,
              company_id: legacyCompany.id,
              organization_name:
                legacyCompany.organization_name ||
                legacyCompany.company_name ||
                "",
              name: legacyUser.name || legacyUser.username,
              role: legacyUser.role || "",
              user_type: "company_user",
            },
          ];
        } catch (legacyError) {
          const legacyStatus = legacyError?.response?.status;
          if (legacyStatus === 404 || legacyStatus === 403) {
            return [];
          }
          console.error(
            "Error fetching legacy organization users by username:",
            legacyError.response?.data || legacyError,
          );
          throw legacyError;
        }
      }

      if (status === 403) {
        return [];
      }
      console.error(
        "Error fetching organization users by username:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getCompanyByUsername(username) {
  const access_token = localStorage.getItem("access_token");
  const normalizedUsername = String(username || "").trim();

  if (!normalizedUsername || !access_token) {
    return Promise.resolve(null);
  }

  return axios
    .get(
      `${BASE_URL}account/legacy/companies/${encodeURIComponent(
        normalizedUsername,
      )}/`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
        },
      },
    )
    .then((response) => response.data || null)
    .catch((error) => {
      const status = error?.response?.status;
      if (status === 404 || status === 403) {
        return null;
      }
      console.error(
        "Error fetching company by username:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getSchoolTeacherList() {
  const access_token = localStorage.getItem("access_token");

  if (!access_token) {
    return Promise.resolve([]);
  }

  return axios
    .get(`${BASE_URL}school-management/teacher-list/`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
    })
    .then((response) => (Array.isArray(response.data) ? response.data : []))
    .catch((error) => {
      const status = error?.response?.status;
      if (status === 404 || status === 403) {
        return [];
      }
      console.error(
        "Error fetching school teacher list:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateOrganizationUser(username, payload) {
  const access_token = localStorage.getItem("access_token");
  const normalizedUsername = String(username || "").trim();

  if (!normalizedUsername) {
    return Promise.reject(new Error("Username is required."));
  }

  return axios
    .patch(
      `${BASE_URL}auth/organization-users/${encodeURIComponent(
        normalizedUsername,
      )}/`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating organization user:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getCompanyInfo(companyId, fileId, options = {}) {
  const access_token = localStorage.getItem("access_token");
  const { byCompanyId = false } = options || {};

  const legacyRequest = () =>
    axios.get(`${BASE_URL}account/legacy/company-info/`, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
      params: {
        company_id: companyId,
        ...(fileId ? { file_id: fileId } : {}),
      },
    });

  if (byCompanyId) {
    return legacyRequest()
      .then((response) => response.data)
      .catch((error) => {
        console.error(
          "Error fetching legacy company info by company_id:",
          error.response?.data || error,
        );
        throw error;
      });
  }

  return axios
    .get(`${BASE_URL}auth/organization-info/`, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
      params: {
        organization_id: companyId,
        ...(fileId ? { file_id: fileId } : {}),
      },
    })
    .then((response) => response.data)
    .catch(async (error) => {
      const status = error?.response?.status;
      if (status === 400 || status === 403 || status === 404) {
        try {
          const legacyResponse = await legacyRequest();
          return legacyResponse.data;
        } catch (legacyError) {
          console.error(
            "Error fetching legacy company info:",
            legacyError.response?.data || legacyError,
          );
          throw legacyError;
        }
      }
      console.error(
        "Error fetching company info:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getCategoryDashboardSummary() {
  const access_token = localStorage.getItem("access_token");

  return axios
    .get(`${BASE_URL}school-management/category-dashboard-summary/`, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
      params: access_token ? { access_token } : {},
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching category dashboard summary:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateCompanyInfo(formData) {
  const access_token = localStorage.getItem("access_token");

  if (!access_token) {
    console.error("No access token found, cannot update company info.");
    return Promise.resolve(null);
  }

  const legacyRequest = () =>
    axios.patch(`${BASE_URL}account/legacy/company-info/update/`, formData, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    });

  // For school/company edit dialogs, always update against company models by company_id.
  if (formData?.company_id) {
    return legacyRequest()
      .then((response) => response.data)
      .catch((error) => {
        console.error(
          "Error updating legacy company info:",
          error.response?.data || error,
        );
        throw error;
      });
  }

  return axios
    .patch(`${BASE_URL}auth/organization-info/`, formData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
    })
    .then((response) => response.data)
    .catch(async (error) => {
      const status = error?.response?.status;
      if (status === 400 || status === 403 || status === 404) {
        try {
          const legacyResponse = await legacyRequest();
          return legacyResponse.data;
        } catch (legacyError) {
          console.error(
            "Error updating legacy company info:",
            legacyError.response?.data || legacyError,
          );
          throw legacyError;
        }
      }
      console.error(
        "Error updating company info:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getAllCountries() {
  const access_token = localStorage.getItem("access_token");

  return axios
    .get(`${BASE_URL}shared_api/getAllCountries/`, {
      headers: {
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
      params: access_token ? { access_token } : {},
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching countries:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function sendTeamInvitation(payload) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .post(`${BASE_URL}account/send_team_invitaion`, payload, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error sending team invitation:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getAllCompanies() {
  const access_token = localStorage.getItem("access_token");

  return axios
    .get(`${BASE_URL}account/getAllCompanies/`, {
      headers: {
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching company list:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getOrganizationCompanySummary(params = {}) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .get(`${BASE_URL}account/organizations/companies/summary/`, {
      headers: {
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
      params,
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching organization company summary:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getOrganizationSchools(params = {}) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .get(`${BASE_URL}account/organizations/companies/schools/`, {
      headers: {
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
      params,
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching organization school list:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getOrganizationHospitals(params = {}) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .get(`${BASE_URL}account/organizations/companies/hospitals/`, {
      headers: {
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
      params,
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching organization hospital list:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function sendRegistrationInvite(payload) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .post(`${BASE_URL}account/sendRegistrationInvite/`, payload, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error sending registration invite:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getCompaniesProfitLossSummary(params = {}) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .get(`${BASE_URL}account/companies/profit-loss-summary/`, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
      params,
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching companies profit and loss summary:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getCompanyTotalUsage(companyId) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .get(`${BASE_URL}account/company_total_usage/${companyId}/`, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching company usage:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getOrganizationTotalUsage(organizationId) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .get(`${BASE_URL}account/organization_total_usage/${organizationId}/`, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching organization usage:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getActivitySummary() {
  const access_token = localStorage.getItem("access_token");

  return axios
    .get(`${BASE_URL}account/analytics/`, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching activity summary:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function approveCompany(payload) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .post(`${BASE_URL}account/approveCompany/`, payload, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error approving company:", error.response?.data || error);
      throw error;
    });
}

export function delistCompany(payload) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .post(`${BASE_URL}account/delistCompany/`, payload, {
      headers: {
        "Content-Type": "application/json",
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error delisting company:", error.response?.data || error);
      throw error;
    });
}

export function checkEmailAlreadyExist(email) {
  const payload = new URLSearchParams();
  payload.append("form_data", JSON.stringify({ email }));

  return axios
    .post(`${BASE_URL}account/checkEmailAlreadyExist`, payload, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error checking email availability:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getAllStates(countryCode) {
  if (!countryCode) {
    return Promise.resolve({ response: [] });
  }

  const access_token = localStorage.getItem("access_token");

  return axios
    .get(`${BASE_URL}shared_api/getAllStates/${countryCode}/`, {
      headers: {
        ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      },
      params: access_token ? { access_token } : {},
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error fetching states:", error.response?.data || error);
      throw error;
    });
}

export function getOwners() {
  const access_token = localStorage.getItem("access_token");

  if (!access_token) {
    console.error("No access token found, cannot fetch owners.");
    return Promise.resolve({ response: [] });
  }

  return axios
    .get(`${BASE_URL}account/getOwners/`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      params: { access_token },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error fetching owners:", error.response?.data || error);
      throw error;
    });
}

export function addOwner(ownerData) {
  const access_token = localStorage.getItem("access_token");

  if (!access_token) {
    console.error("No access token found, cannot add owner.");
    return Promise.resolve(null);
  }

  return axios
    .post(`${BASE_URL}account/addOwner/`, ownerData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      params: { access_token },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error adding owner:", error.response?.data || error);
      throw error;
    });
}

export function updateOwner(ownerData) {
  const access_token = localStorage.getItem("access_token");

  if (!access_token) {
    console.error("No access token found, cannot update owner.");
    return Promise.resolve(null);
  }

  return axios
    .post(`${BASE_URL}account/updateOwner/`, ownerData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      params: { access_token },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error updating owner:", error.response?.data || error);
      throw error;
    });
}

export function getStatutoryRegisters() {
  const access_token = localStorage.getItem("access_token");

  if (!access_token) {
    console.error("No access token found, cannot fetch statutory registers.");
    return Promise.resolve({ response: [] });
  }

  return axios
    .get(`${BASE_URL}account/getStatutoryRegisters/`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      params: { access_token },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching statutory registers:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function addStatutoryRegister(payload) {
  const access_token = localStorage.getItem("access_token");

  if (!access_token) {
    console.error("No access token found, cannot add statutory register.");
    return Promise.resolve(null);
  }

  return axios
    .post(`${BASE_URL}account/addStatutoryRegister/`, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      params: { access_token },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error adding statutory register:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateStatutoryRegister(payload) {
  const access_token = localStorage.getItem("access_token");

  if (!access_token) {
    console.error("No access token found, cannot update statutory register.");
    return Promise.resolve(null);
  }

  return axios
    .post(`${BASE_URL}account/updateStatutoryRegister/`, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      params: { access_token },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating statutory register:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getStatutoryCustomFields() {
  const access_token = localStorage.getItem("access_token");

  if (!access_token) {
    console.error(
      "No access token found, cannot fetch statutory custom fields.",
    );
    return Promise.resolve({ response: [] });
  }

  return axios
    .get(`${BASE_URL}account/getStatutoryCustomFields/`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      params: { access_token },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching statutory custom fields:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function addStatutoryCustomField(payload) {
  const access_token = localStorage.getItem("access_token");

  if (!access_token) {
    console.error("No access token found, cannot add statutory custom field.");
    return Promise.resolve(null);
  }

  return axios
    .post(`${BASE_URL}account/addStatutoryCustomField/`, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      params: { access_token },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error adding statutory custom field:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateStatutoryCustomField(payload) {
  const access_token = localStorage.getItem("access_token");

  if (!access_token) {
    console.error(
      "No access token found, cannot update statutory custom field.",
    );
    return Promise.resolve(null);
  }

  return axios
    .post(`${BASE_URL}account/updateStatutoryCustomField/`, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      params: { access_token },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating statutory custom field:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function deleteStatutoryCustomField(payload) {
  const access_token = localStorage.getItem("access_token");

  if (!access_token) {
    console.error(
      "No access token found, cannot delete statutory custom field.",
    );
    return Promise.resolve(null);
  }

  return axios
    .post(`${BASE_URL}account/deleteStatutoryCustomField/`, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      params: { access_token },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error deleting statutory custom field:",
        error.response?.data || error,
      );
      throw error;
    });
}


export async function getCurrentSchoolInfo() {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = localStorage.getItem("access_token");
  if (!accessToken) {
    return null;
  }
  const query = accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : "";
  const response = await fetch(`${BASE_URL}account/companies/school-info/${query}`, {
    headers: {
      ...defaultHeaders(),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error("Unable to fetch school info");
  }

  return response.json();
}
