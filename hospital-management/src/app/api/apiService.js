import axios from "axios";
import { environment } from "@/environments/environments";
import { useRouter } from "next/router";
import Router from "next/router";
import { redirectToLoginIfUnauthorized } from "./authRedirect";
import { beginApiRequest, endApiRequest } from "./loadingTracker";

const AUTH_INTERCEPTOR_KEY = "__HM_AUTH_INTERCEPTOR__";
const FETCH_TRACKER_KEY = "__HM_FETCH_TRACKER__";

const handleFetchUnauthorized = (response) => {
  if (!response) {
    return false;
  }
  if (response.status === 401 || response.status === 403) {
    redirectToLoginIfUnauthorized(response.status);
    return true;
  }
  return false;
};

const ensureAuthInterceptor = () => {
  if (typeof window === "undefined") {
    return;
  }
  if (window[AUTH_INTERCEPTOR_KEY]) {
    return;
  }
  axios.interceptors.request.use(
    (config) => {
      beginApiRequest();
      config.__hmTracked = true;
      return config;
    },
    (error) => Promise.reject(error),
  );
  axios.interceptors.response.use(
    (response) => {
      if (response?.config?.__hmTracked) {
        endApiRequest();
      }
      return response;
    },
    (error) => {
      if (error?.config?.__hmTracked) {
        endApiRequest();
      }
      redirectToLoginIfUnauthorized(error.response?.status);
      return Promise.reject(error);
    },
  );
  window[AUTH_INTERCEPTOR_KEY] = true;
};

const ensureFetchTracker = () => {
  if (typeof window === "undefined") {
    return;
  }
  if (window[FETCH_TRACKER_KEY]) {
    return;
  }
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    beginApiRequest();
    try {
      return await originalFetch(...args);
    } finally {
      endApiRequest();
    }
  };
  window[FETCH_TRACKER_KEY] = true;
};

ensureAuthInterceptor();
ensureFetchTracker();

// const BASE_URL = environment.base_url;
const BASE_URL = "/api/";

export function userLogin(username, password) {
  const loginData = new URLSearchParams({
    username, // Ensure 'username' is used as the key
    password, // Ensure 'password' is correct
    grant_type: "password",
    client_id: environment.client_id,
    client_secret: environment.client_secret,
  });

  return axios
    .post(`${BASE_URL}hospital_accounts/o/token/`, loginData.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })
    .then((response) => {
      // console.log("Login successful:", response.data);
      localStorage.setItem("access_token", response.data.access_token);
      localStorage.setItem("refresh_token", response.data.refresh_token);
      return response.data;
    })
    .catch((error) => {
      console.error("Error in login function:", error.response?.data || error);
      throw error;
    });
}

export const logoutUser = async () => {
  const payload = {
    username:
      typeof window !== "undefined" ? localStorage.getItem("username") : null,
    access_token:
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null,
    refresh_token:
      typeof window !== "undefined"
        ? localStorage.getItem("refresh_token")
        : null,
  };

  return axios
    .post(`${BASE_URL}hospital_accounts/logout/`, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error revoking tokens during logout:",
        error.response?.data || error,
      );
      throw error;
    });
};

// export function get_Hospital_User_Login_Details(username, companyId) {
//   const access_token = localStorage.getItem("access_token");
//   const params = new URLSearchParams({ access_token });
//   if (companyId) {
//     params.set("company_id", companyId);
//   }
//   // if (!access_token) {
//   //   Router.push("/login");
//   //   return Promise.reject("Access token is missing.");
//   // }

//   return axios
//     .get(
//       `${BASE_URL}hospital_accounts/get-logged-in-hospital-user/${username}?${params.toString()}`
//     )
//     .then((response) => {
//       return response.data; // Return the fetched data
//     })
//     .catch((error) => {
//       const status = error.response?.status;
//       if (status === 401) {
//         Router.push("/login"); // Use Router.push directly to navigate
//       } else if (status === 404) {
//         console.warn("Hospital user details not found for:", username);
//         return null;
//       }
//       console.error(
//         "Error fetching hospital user details:",
//         error.response?.data || error
//       );
//       throw error;
//     });
// }

export function get_Hospital_User_Login_Details(username) {
  const access_token = localStorage.getItem("access_token");

  return axios
    .post(`${BASE_URL}authentication/user_info/`, {
      access_token,
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

export function getCompanyUserDetailsByUsername(username) {
  if (!username) {
    return Promise.reject(new Error("username is required"));
  }
  return axios
    .get(
      `${BASE_URL}account/getCompanyUserDetailsbyusername/${encodeURIComponent(
        username,
      )}/`,
    )
    .then((response) => response.data?.details || [])
    .catch((error) => {
      console.error(
        "Error fetching CompanyUser details:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getAllActiveCompanyUser(company_id) {
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (company_id) params.append("company_id", company_id);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}account/getAllActiveCompanyUser/${query}`, {
      headers: access_token
        ? {
            Authorization: `Bearer ${access_token}`,
          }
        : undefined,
    })
    .then((response) => response.data?.response || response.data || [])
    .catch((error) => {
      console.error(
        "Error fetching active company users:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getCurrentUser() {
  const access_token = localStorage.getItem("access_token");
  const company_id = localStorage.getItem("company_id");

  if (!access_token) {
    console.error("No access token found, cannot fetch current user.");
    return Promise.resolve(null);
  }

  return axios
    .get(`${BASE_URL}account/getCurrentUser/`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      params: {
        access_token,
        ...(company_id ? { company_id } : {}),
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        return null;
      }
      console.error(
        "Error fetching current user:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getAppAccessMatrix(accessFor, id) {
  const access_token = localStorage.getItem("access_token");
  if (!accessFor || !id) {
    return Promise.resolve([]);
  }
  return axios
    .get(`${BASE_URL}account/getAppAccessMatrix/${accessFor}/${id}/`, {
      headers: access_token
        ? {
            Authorization: `Bearer ${access_token}`,
          }
        : undefined,
    })
    .then((response) => response.data?.response || response.data || [])
    .catch((error) => {
      console.error(
        "Error fetching access matrix:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateAppAccessControl(payload) {
  const access_token = localStorage.getItem("access_token");
  return axios
    .post(`${BASE_URL}account/updateAppAccessControl/`, payload, {
      headers: access_token
        ? {
            Authorization: `Bearer ${access_token}`,
          }
        : undefined,
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating access control:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getDoctorCompaniesByEmail(username) {
  const access_token = localStorage.getItem("access_token");
  return axios
    .get(
      `${BASE_URL}hospital_accounts/doctor-companies/${username}?access_token=${access_token}`,
    )
    .then((response) => response.data || [])
    .catch((error) => {
      console.error(
        "Error fetching doctor companies:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getAllDepartment(company_id) {
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (Number.isInteger(Number(company_id))) {
    params.append("company_id", Number(company_id));
  }
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/departments_list/${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error retrieving departments:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getApprovedDepartments(company_id) {
  return getAllDepartment(company_id).then((departments) => {
    if (!Array.isArray(departments)) {
      return [];
    }
    return departments.filter((department) => department?.is_approve);
  });
}

export function createDepartment(payload, company_id) {
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  return axios
    .post(`${BASE_URL}hospital_management/create_department/`, body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating department:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateDepartment(id, payload, company_id) {
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  const query = company_id ? `?company_id=${company_id}` : "";
  return axios
    .patch(`${BASE_URL}hospital_management/departments/${id}/${query}`, body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating department:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function deleteDepartment(id, company_id) {
  const query = company_id ? `?company_id=${company_id}` : "";
  return axios
    .delete(`${BASE_URL}hospital_management/departments/${id}/${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error deleting department:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getAllStaffDepartments(company_id) {
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (Number.isInteger(Number(company_id))) {
    params.append("company_id", Number(company_id));
  }
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/staff_departments_list/${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error retrieving staff departments:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function fetchStaffDepartment(company_id) {
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (Number.isInteger(Number(company_id))) {
    params.append("company_id", Number(company_id));
  }
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/staff_departments_list/${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching staff departments:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getApprovedStaffDepartments(company_id) {
  return getAllStaffDepartments(company_id).then((departments) => {
    if (!Array.isArray(departments)) {
      return [];
    }
    return departments.filter((department) => department?.is_approve);
  });
}

export function createStaffDepartment(payload, company_id) {
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  return axios
    .post(`${BASE_URL}hospital_management/create_staff_department/`, body, {
      headers: {
        "Content-Type": "application/json",
      },
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

export function updateStaffDepartment(id, payload, company_id) {
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  const query = company_id ? `?company_id=${company_id}` : "";
  return axios
    .patch(
      `${BASE_URL}hospital_management/staff_departments/${id}/${query}`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating staff department:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function deleteStaffDepartment(id, company_id) {
  const query = company_id ? `?company_id=${company_id}` : "";
  return axios
    .delete(`${BASE_URL}hospital_management/staff_departments/${id}/${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error deleting staff department:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getAllStaffJobTitles(company_id) {
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (Number.isInteger(Number(company_id))) {
    params.append("company_id", Number(company_id));
  }
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/staff_job_titles_list/${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error retrieving staff job titles:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getApprovedStaffJobTitles(company_id) {
  return getAllStaffJobTitles(company_id).then((titles) => {
    if (!Array.isArray(titles)) {
      return [];
    }
    return titles.filter((title) => title?.is_approve);
  });
}

export function createStaffJobTitle(payload, company_id) {
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  return axios
    .post(`${BASE_URL}hospital_management/create_staff_job_title/`, body, {
      headers: {
        "Content-Type": "application/json",
      },
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

export function updateStaffJobTitle(id, payload, company_id) {
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  const query = company_id ? `?company_id=${company_id}` : "";
  return axios
    .patch(
      `${BASE_URL}hospital_management/staff_job_titles/${id}/${query}`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating staff job title:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function deleteStaffJobTitle(id, company_id) {
  const query = company_id ? `?company_id=${company_id}` : "";
  return axios
    .delete(`${BASE_URL}hospital_management/staff_job_titles/${id}/${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error deleting staff job title:",
        error.response?.data || error,
      );
      throw error;
    });
}
export function getAllDoctorType(company_id) {
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (company_id) params.append("company_id", company_id);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/doctor_type_list/${query}`)
    .then((response) => {
      // console.log("Active schools retrieved:", response.data);
      return response.data; // Return the list of active schools
    })
    .catch((error) => {
      console.error(
        "Error retrieving active schools:",
        error.response?.data || error,
      );
      throw error; // Propagate the error to be handled by the caller
    });
}

export function getApprovedDoctorTypes(company_id) {
  return getAllDoctorType(company_id).then((types) => {
    if (!Array.isArray(types)) {
      return [];
    }
    return types.filter((doctorType) => doctorType?.is_approve);
  });
}

export function createDoctorType(payload, company_id) {
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  return axios
    .post(`${BASE_URL}hospital_management/create_doctor_type/`, body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating doctor type:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateDoctorType(id, payload, company_id) {
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  const query = company_id ? `?company_id=${company_id}` : "";
  return axios
    .patch(`${BASE_URL}hospital_management/doctor_type/${id}/${query}`, body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating doctor type:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function deleteDoctorType(id, company_id) {
  const query = company_id ? `?company_id=${company_id}` : "";
  return axios
    .delete(`${BASE_URL}hospital_management/doctor_type/${id}/${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error deleting doctor type:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getDoctorFees(company_id) {
  if (!company_id) {
    return Promise.resolve([]);
  }
  const params = new URLSearchParams({ company_id });
  const query = params.toString();
  return axios
    .get(`${BASE_URL}hospital_management/doctor-fees/?${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching doctor fees:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createDoctorFees(payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  return axios
    .post(`${BASE_URL}hospital_management/doctor-fees/`, body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating doctor fees:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateDoctorFees(id, payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  const query = company_id ? `?company_id=${company_id}` : "";
  return axios
    .patch(`${BASE_URL}hospital_management/doctor-fees/${id}/${query}`, body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating doctor fees:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function delistDoctorFees(id, company_id, delisted_by = "") {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const body = delisted_by ? { delisted_by } : {};
  const query = company_id ? `?company_id=${company_id}` : "";
  return axios
    .delete(`${BASE_URL}hospital_management/doctor-fees/${id}/${query}`, {
      data: body,
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error delisting doctor fees:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getRateCharts(company_id) {
  if (!company_id) {
    return Promise.resolve([]);
  }
  const params = new URLSearchParams({ company_id });
  const query = params.toString();
  return axios
    .get(`${BASE_URL}hospital_management/rate-charts/?${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching rate charts:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createRateChart(payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  if (payload instanceof FormData) {
    if (
      payload.has("insurance_provider") &&
      !payload.has("insuarance_provider")
    ) {
      payload.append(
        "insuarance_provider",
        payload.get("insurance_provider"),
      );
    }
    if (!payload.has("companies")) {
      payload.append("companies", String(company_id));
    }
    if (!payload.has("company_id")) {
      payload.append("company_id", String(company_id));
    }
    return axios
      .post(`${BASE_URL}hospital_management/rate-charts/`, payload)
      .then((response) => response.data)
      .catch((error) => {
        console.error(
          "Error creating rate chart:",
          error.response?.data || error,
        );
        throw error;
      });
  }
  const body = {
    ...payload,
    companies: company_id,
    company_id,
  };
  if (body.insurance_provider && !body.insuarance_provider) {
    body.insuarance_provider = body.insurance_provider;
  }
  return axios
    .post(`${BASE_URL}hospital_management/rate-charts/`, body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating rate chart:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateRateChart(id, payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  if (!id) {
    return Promise.reject(new Error("id is required"));
  }
  const body = {
    ...payload,
    company_id,
  };
  if (body.insurance_provider && !body.insuarance_provider) {
    body.insuarance_provider = body.insurance_provider;
  }
  return axios
    .patch(
      `${BASE_URL}hospital_management/rate-charts/${id}/?company_id=${company_id}`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating rate chart:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getInsuaranceProviders(company_id, options = {}) {
  if (!company_id) {
    return Promise.resolve([]);
  }
  const params = new URLSearchParams({ company_id });
  if (options.activeOnly) {
    params.append("active_only", "1");
  }
  const query = params.toString();
  return axios
    .get(`${BASE_URL}hospital_management/insuarance-providers/?${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching insuarance providers:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createInsuaranceProvider(payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const body = {
    ...payload,
    companies: company_id,
    company_id,
  };
  return axios
    .post(`${BASE_URL}hospital_management/insuarance-providers/`, body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating insuarance provider:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateInsuaranceProvider(id, payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  if (!id) {
    return Promise.reject(new Error("id is required"));
  }
  const body = {
    ...payload,
    company_id,
  };
  return axios
    .patch(
      `${BASE_URL}hospital_management/insuarance-providers/${id}/?company_id=${company_id}`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating insuarance provider:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function delistInsuaranceProvider(id, company_id, delisted_by = "") {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  if (!id) {
    return Promise.reject(new Error("id is required"));
  }
  const body = {};
  if (delisted_by) {
    body.delisted_by = delisted_by;
  }
  return axios
    .delete(
      `${BASE_URL}hospital_management/insuarance-providers/${id}/?company_id=${company_id}`,
      { data: body },
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error delisting insuarance provider:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getDutyRoasters(company_id, params = {}) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const access_token = localStorage.getItem("access_token");
  const queryParams = new URLSearchParams();
  queryParams.append("company_id", company_id);
  if (access_token) queryParams.append("access_token", access_token);
  if (params.start_date) queryParams.append("start_date", params.start_date);
  if (params.end_date) queryParams.append("end_date", params.end_date);
  if (params.staff_id) queryParams.append("staff_id", params.staff_id);
  const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/duty-roasters/${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching duty roasters:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createDutyRoaster(payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  return axios
    .post(`${BASE_URL}hospital_management/duty-roasters/`, body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating duty roaster:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateDutyRoaster(id, payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  if (!id) {
    return Promise.reject(new Error("id is required"));
  }
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  return axios
    .patch(`${BASE_URL}hospital_management/duty-roasters/${id}/`, body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating duty roaster:",
        error.response?.data || error,
      );
      throw error;
    });
}
export function getAllAdministratorType(company_id) {
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (company_id) params.append("company_id", company_id);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/administrator_type_list/${query}`)
    .then((response) => {
      // console.log("Active schools retrieved:", response.data);
      return response.data; // Return the list of active schools
    })
    .catch((error) => {
      console.error(
        "Error retrieving active schools:",
        error.response?.data || error,
      );
      throw error; // Propagate the error to be handled by the caller
    });
}

export function getApprovedAdministratorTypes(company_id) {
  return getAllAdministratorType(company_id).then((types) => {
    if (!Array.isArray(types)) {
      return [];
    }
    return types.filter((administratorType) => administratorType?.is_approve);
  });
}

export function createAdministrationType(payload, company_id) {
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  return axios
    .post(`${BASE_URL}hospital_management/create_administration_type/`, body, {
      headers: {
        "Content-Type": "application/json",
      },
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

export function updateAdministrationType(id, payload, company_id) {
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  const query = company_id ? `?company_id=${company_id}` : "";
  return axios
    .patch(
      `${BASE_URL}hospital_management/administrator_type/${id}/${query}`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating administration type:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function deleteAdministrationType(id, company_id) {
  const query = company_id ? `?company_id=${company_id}` : "";
  return axios
    .delete(`${BASE_URL}hospital_management/administrator_type/${id}/${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error deleting administration type:",
        error.response?.data || error,
      );
      throw error;
    });
}

// export function createNewDoctor(formData) {
//   // console.log("Payload to be sent: ", formData); // Log the payload to check what is being sent
//   // const access_token = localStorage.getItem("access_token");
//   return axios
//     .post(`${BASE_URL}hospital_management/create-doctor/`, formData, {
//       headers: {
//         "Content-Type": "application/json", // Updated Content-Type to application/json
//       },
//     })
//     .then((response) => {
//       // console.log("New Student Created:", response.data);
//       return response.data;
//     })
//     .catch((error) => {
//       console.error(
//         "Error creating a new user:",
//         error.response?.data || error
//       );
//       throw error;
//     });
// }

export const createNewDoctorWithSchedule = async (values, company_id) => {
  if (!company_id) {
    throw new Error("company_id is required to create a doctor.");
  }

  const body = new FormData();
  body.append("company", company_id);
  body.append("company_id", company_id);

  const entries = {
    full_name: values.full_name ?? values.name,
    email: values.email,
    phone: values.phone ?? values.mobile,
    role: values.role,
    department: values.department,
    doctor_type: values.doctor_type,
    password: values.password || "abc123",
    association_type: values.association_type,
    medical_council_registration: values.medical_council_registration,
    whatsapp_number: values.whatsapp_number,
    created_by: values.created_by,
  };

  Object.entries(entries).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      body.append(key, value);
    }
  });

  const slots = values.available_day_slots || {};
  body.append("available_day_slots", JSON.stringify(slots));

  const scheduleRows = Array.isArray(values.schedule_rows)
    ? values.schedule_rows
        .map((row) => {
          if (!row?.day) return null;
          const rawSlots = Array.isArray(row.time_slots)
            ? row.time_slots
            : row.time_slot !== undefined && row.time_slot !== null
              ? [row.time_slot]
              : [];
          const slotIds = rawSlots
            .map((slot) => Number(slot))
            .filter((slot) => Number.isFinite(slot));
          if (!slotIds.length) return null;
          return {
            day: row.day,
            time_slots: slotIds,
            is_available:
              row.is_available === undefined ? true : Boolean(row.is_available),
            association_type: row.association_type,
          };
        })
        .filter(Boolean)
    : [];
  if (scheduleRows.length) {
    body.append("schedule_rows", JSON.stringify(scheduleRows));
  }

  if (values.profile_image) {
    body.append("profile_image", values.profile_image);
  }

  const query = new URLSearchParams({ company_id: company_id }).toString();
  const response = await fetch(
    `${BASE_URL}hospital_management/create-doctor-with-schedule/?${query}`,
    {
      method: "POST",
      body,
    },
  );
  if (handleFetchUnauthorized(response)) {
    throw new Error("Unauthorized");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Doctor signup error payload:", data);
    const message = data?.error || data?.errors || response.statusText;
    const error = new Error(message || "Failed to create doctor");
    error.response = { data };
    throw error;
  }
  return data;
};

export function getAllDoctors(company_id, role = "doctor") {
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (company_id) params.append("company_id", company_id);
  if (role) params.append("role", role);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/doctor-list/${query}`)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.error("Error retrieving doctors:", error.response?.data || error);
      throw error;
    });
}

export function getDoctorsByOpd(opdId, company_id) {
  if (!opdId || !company_id) {
    return Promise.resolve([]);
  }
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  params.append("company_id", company_id);
  params.append("opd_id", opdId);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/doctor-list/by-opd/${query}`)
    .then((response) => response.data || [])
    .catch((error) => {
      console.error(
        "Error retrieving doctors by OPD:",
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
    .then((response) => {
      const data = response.data;
      const payload = data?.response;
      if (payload?.status === false) {
        console.warn(
          "Image upload responded with status=false:",
          payload?.msg || payload,
        );
      }
      return data;
    })
    .catch((error) => {
      console.error("Error uploading image:", error.response?.data || error);
      throw error;
    });
}

export function createOpdTicketBooking(payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  return axios
    .post(`${BASE_URL}hospital_management/opd-ticket-bookings/`, body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating OPD ticket booking:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getOpdTicketBookings(company_id) {
  if (!company_id) {
    return Promise.resolve([]);
  }
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  params.append("company_id", company_id);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/opd-ticket-bookings/${query}`)
    .then((response) => response.data || [])
    .catch((error) => {
      console.error(
        "Error retrieving OPD ticket bookings:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getOpdTicketBookingsPaged(company_id, options = {}) {
  if (!company_id) {
    return Promise.resolve([]);
  }
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  params.append("company_id", company_id);
  if (options.search) params.append("search", options.search);
  if (options.patient_id) params.append("patient_id", options.patient_id);
  if (options.limit) params.append("limit", options.limit);
  if (options.page) params.append("page", options.page);
  if (options.includeCount) params.append("include_count", "1");
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/opd-ticket-bookings/${query}`)
    .then((response) => response.data || [])
    .catch((error) => {
      console.error(
        "Error retrieving OPD ticket bookings:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateOpdTicketBooking(id, payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const body = {
    ...payload,
  };
  const query = company_id ? `?company_id=${company_id}` : "";
  return axios
    .patch(
      `${BASE_URL}hospital_management/opd-ticket-bookings/${id}/${query}`,
      body,
      {
        headers: { "Content-Type": "application/json" },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating OPD ticket booking:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function deleteOpdTicketBooking(id, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const query = company_id ? `?company_id=${company_id}` : "";
  return axios
    .delete(`${BASE_URL}hospital_management/opd-ticket-bookings/${id}/${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error deleting OPD ticket booking:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createPatientRecord(payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const body = {
    ...payload,
    companies: company_id,
    company_id,
  };
  return axios
    .post(`${BASE_URL}hospital_management/patients/`, body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating patient record:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updatePatientRecord(id, payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  if (!id) {
    return Promise.reject(new Error("patient id is required"));
  }
  const body = {
    ...payload,
    companies: company_id,
    company_id,
  };
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  params.append("company_id", company_id);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .patch(`${BASE_URL}hospital_management/patients/${id}/${query}`, body, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating patient record:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function delistPatientRecord(id, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  if (!id) {
    return Promise.reject(new Error("patient id is required"));
  }
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  params.append("company_id", company_id);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .delete(`${BASE_URL}hospital_management/patients/${id}/${query}`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error delisting patient:", error.response?.data || error);
      throw error;
    });
}

export function getPatients(company_id, options = {}) {
  if (!company_id) {
    return Promise.resolve([]);
  }
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  params.append("company_id", company_id);
  if (options.search) {
    params.append("search", options.search);
  }
  if (options.limit) {
    params.append("limit", options.limit);
  }
  if (options.page) {
    params.append("page", options.page);
  }
  if (options.includeCount) {
    params.append("include_count", "1");
  }
  if (options.includeIndex) {
    params.append("include_index", "1");
  }
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/patients/${query}`)
    .then((response) => response.data || [])
    .catch((error) => {
      console.error(
        "Error retrieving patients:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getPatient(id, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  if (!id) {
    return Promise.reject(new Error("patient id is required"));
  }
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  params.append("company_id", company_id);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/patients/${id}/${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error retrieving patient:", error.response?.data || error);
      throw error;
    });
}

export function getEmergencyVisits(company_id) {
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (company_id) params.append("company_id", company_id);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/emergency-visits/${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error retrieving emergency visits:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getEmergencyVisit(id, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  if (!id) {
    return Promise.reject(new Error("emergency visit id is required"));
  }
  return axios
    .get(
      `${BASE_URL}hospital_management/emergency-visits/${id}/?company_id=${company_id}`,
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error retrieving emergency visit:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createEmergencyVisit(payload, company_id) {
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  return axios
    .post(`${BASE_URL}hospital_management/emergency-visits/`, body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating emergency visit:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateEmergencyVisit(id, payload, company_id) {
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  return axios
    .patch(`${BASE_URL}hospital_management/emergency-visits/${id}/`, body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating emergency visit:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createBedRecord(payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const body = {
    ...payload,
    companies: company_id,
    company_id,
  };
  return axios
    .post(`${BASE_URL}hospital_management/beds/`, body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating patient record:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getBeds(company_id, options = {}) {
  if (!company_id) {
    return Promise.resolve([]);
  }
  const params = new URLSearchParams({ company_id });
  if (options.roomId) {
    params.append("room_id", options.roomId);
  }
  if (options.availableOnly) {
    params.append("available_only", "true");
  }
  const query = params.toString();
  return axios
    .get(`${BASE_URL}hospital_management/beds/?${query}`)
    .then((res) => res.data)
    .catch((err) => {
      console.error("Error fetching beds:", err.response?.data || err);
      throw err;
    });
}

export function updateBedRecord(id, payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  if (!id) {
    return Promise.reject(new Error("id is required"));
  }
  const body = {
    ...payload,
    company_id,
  };
  return axios
    .patch(
      `${BASE_URL}hospital_management/beds/${id}/?company_id=${company_id}`,
      body,
      { headers: { "Content-Type": "application/json" } },
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error updating bed:", error.response?.data || error);
      throw error;
    });
}

export function getWards(company_id) {
  if (!company_id) {
    return Promise.resolve([]);
  }
  return axios
    .get(`${BASE_URL}hospital_management/wards/?company_id=${company_id}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error fetching wards:", error.response?.data || error);
      throw error;
    });
}

export function createWardRecord(payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const body = {
    ...payload,
    companies: company_id,
    company_id,
  };
  return axios
    .post(`${BASE_URL}hospital_management/wards/`, body, {
      headers: { "Content-Type": "application/json" },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error creating ward:", error.response?.data || error);
      throw error;
    });
}

export function updateWardRecord(id, payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  if (!id) {
    return Promise.reject(new Error("id is required"));
  }
  const body = {
    ...payload,
    company_id,
  };
  return axios
    .patch(
      `${BASE_URL}hospital_management/wards/${id}/?company_id=${company_id}`,
      body,
      { headers: { "Content-Type": "application/json" } },
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error updating ward:", error.response?.data || error);
      throw error;
    });
}

export function getRooms(company_id, options = {}) {
  if (!company_id) {
    return Promise.resolve([]);
  }
  const params = new URLSearchParams({ company_id });
  if (options.wardId) {
    params.append("ward_id", options.wardId);
  }
  const query = params.toString();
  return axios
    .get(`${BASE_URL}hospital_management/rooms/?${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error fetching rooms:", error.response?.data || error);
      throw error;
    });
}

export function getIpdBookings(company_id, options = {}) {
  if (!company_id) {
    return Promise.resolve([]);
  }
  const params = new URLSearchParams({ company_id });
  if (options.patient_id) params.append("patient_id", options.patient_id);
  const query = params.toString();
  return axios
    .get(`${BASE_URL}hospital_management/ipd-bookings/?${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching IPD bookings:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getIpdBooking(id, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  return axios
    .get(
      `${BASE_URL}hospital_management/ipd-bookings/${id}/?company_id=${company_id}`,
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching IPD booking:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createIpdBooking(payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  if (body.policy_amount === "" || body.policy_amount === undefined) {
    body.policy_amount = null;
  }
  if (body.insurance_provider === "") {
    body.insurance_provider = null;
  }
  return axios
    .post(`${BASE_URL}hospital_management/ipd-bookings/`, body, {
      headers: { "Content-Type": "application/json" },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating IPD booking:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getIpdPayments(company_id, options = {}) {
  if (!company_id) {
    return Promise.resolve([]);
  }
  const params = new URLSearchParams({ company_id });
  if (options.ipd_booking) {
    params.append("ipd_booking_id", options.ipd_booking);
  }
  const query = params.toString();
  return axios
    .get(`${BASE_URL}hospital_management/ipd-payments/?${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching IPD payments:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getIpdBillings(company_id, options = {}) {
  if (!company_id) {
    return Promise.resolve([]);
  }
  const params = new URLSearchParams({ company_id });
  if (options.ipd_booking) {
    params.append("ipd_booking_id", options.ipd_booking);
  }
  const query = params.toString();
  return axios
    .get(`${BASE_URL}hospital_management/ipd-billings/?${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error fetching IPD billings:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createIpdBilling(payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  return axios
    .post(`${BASE_URL}hospital_management/ipd-billings/`, body, {
      headers: { "Content-Type": "application/json" },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating IPD billing:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateIpdBilling(id, payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  if (!id) {
    return Promise.reject(new Error("id is required"));
  }
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  return axios
    .patch(`${BASE_URL}hospital_management/ipd-billings/${id}/`, body, {
      headers: { "Content-Type": "application/json" },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating IPD billing:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createIpdPayment(payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  return axios
    .post(`${BASE_URL}hospital_management/ipd-payments/`, body, {
      headers: { "Content-Type": "application/json" },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error creating IPD payment:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateIpdPayment(id, payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  if (!id) {
    return Promise.reject(new Error("id is required"));
  }
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  return axios
    .patch(`${BASE_URL}hospital_management/ipd-payments/${id}/`, body, {
      headers: { "Content-Type": "application/json" },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating IPD payment:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function updateIpdBooking(id, payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const body = {
    ...payload,
    company_id,
  };
  if (body.policy_amount === "" || body.policy_amount === undefined) {
    body.policy_amount = null;
  }
  if (body.insurance_provider === "") {
    body.insurance_provider = null;
  }
  return axios
    .patch(
      `${BASE_URL}hospital_management/ipd-bookings/${id}/?company_id=${company_id}`,
      body,
      {
        headers: { "Content-Type": "application/json" },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating IPD booking:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createRoomRecord(payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const body = {
    ...payload,
    companies: company_id,
    company_id,
  };
  return axios
    .post(`${BASE_URL}hospital_management/rooms/`, body, {
      headers: { "Content-Type": "application/json" },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error creating room:", error.response?.data || error);
      throw error;
    });
}

export function updateRoomRecord(id, payload, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  if (!id) {
    return Promise.reject(new Error("id is required"));
  }
  const body = {
    ...payload,
    company_id,
  };
  return axios
    .patch(
      `${BASE_URL}hospital_management/rooms/${id}/?company_id=${company_id}`,
      body,
      { headers: { "Content-Type": "application/json" } },
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error updating room:", error.response?.data || error);
      throw error;
    });
}

export function getOpdTicketBooking(id, company_id) {
  if (!company_id) {
    return Promise.reject(new Error("company_id is required"));
  }
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  params.append("company_id", company_id);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/opd-ticket-bookings/${id}/${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error retrieving OPD ticket booking:",
        error.response?.data || error,
      );
      throw error;
    });
}

export async function updateDoctor(id, payload, company_id) {
  if (!company_id) {
    throw new Error("company_id is required to update a doctor.");
  }
  const query = company_id ? `?company_id=${company_id}` : "";
  const url = `${BASE_URL}hospital_management/doctor/${id}/${query}`;
  const hasFile = payload.profile_image instanceof File;

  if (hasFile) {
    const formData = new FormData();
    formData.append("company", company_id);
    Object.entries(payload).forEach(([key, value]) => {
      if (key === "profile_image") {
        if (value) formData.append("profile_image", value);
        return;
      }
      if (value === undefined || value === null || value === "") return;
      formData.append(key, value);
    });

    const response = await fetch(url, { method: "PATCH", body: formData });
    if (handleFetchUnauthorized(response)) {
      throw new Error("Unauthorized");
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error || data?.errors || response.statusText;
      const error = new Error(message || "Failed to update doctor.");
      error.response = { data };
      throw error;
    }
    return data;
  }

  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  delete body.profile_image;

  return axios
    .patch(url, body, {
      headers: { "Content-Type": "application/json" },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error updating doctor:", error.response?.data || error);
      throw error;
    });
}

function setDoctorApprovalStatus(doctorId, isApprove, company_id) {
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (company_id) params.append("company_id", company_id);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  const url = `${BASE_URL}hospital_management/doctor/${doctorId}/approve/${query}`;

  return axios
    .post(url, { is_approve: isApprove })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating doctor approval status:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function approveDoctor(doctorId, company_id) {
  return setDoctorApprovalStatus(doctorId, true, company_id);
}

export function upholdDoctor(doctorId, company_id) {
  return setDoctorApprovalStatus(doctorId, false, company_id);
}

export function deleteDoctor(id, company_id) {
  if (!company_id) {
    throw new Error("company_id is required to delete a doctor.");
  }
  const params = new URLSearchParams();
  params.append("company_id", company_id);
  const access_token = localStorage.getItem("access_token");
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .delete(`${BASE_URL}hospital_management/doctor/${id}/${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error deleting doctor:", error.response?.data || error);
      throw error;
    });
}

export function createNewDoctor(formData, company_id) {
  if (!company_id) {
    throw new Error("company_id is required to create a doctor.");
  }
  const payload = {
    password: "abc123",
    association_type: null,
    medical_council_registration: "",
    available_day_slots: {},
    ...formData,
    company: company_id,
    company_id,
  };
  return axios
    .post(
      `${BASE_URL}hospital_management/create-doctor-with-schedule/`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error creating doctor:", error.response?.data || error);
      throw error;
    });
}

export async function createNewAdministration(formData, company_id) {
  if (!company_id) {
    throw new Error("company_id is required to create an administration user.");
  }

  const body = new FormData();
  body.append("company", company_id);
  body.append("company_id", company_id);

  const entries = {
    full_name: formData.full_name ?? formData.name,
    email: formData.email,
    phone: formData.phone ?? formData.mobile,
    whatsapp_number: formData.whatsapp_number,
    created_by: formData.created_by,
    role: formData.role,
    administration_type: formData.administration_type,
    job_title: formData.job_title,
    staff_department: formData.staff_department,
    staff_job_title: formData.staff_job_title,
    password: formData.password || "abc123",
  };

  Object.entries(entries).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      body.append(key, value);
    }
  });

  if (formData.profile_image) {
    body.append("profile_image", formData.profile_image);
  }

  const query = new URLSearchParams({ company_id: company_id }).toString();
  const response = await fetch(
    `${BASE_URL}hospital_management/create-administration/?${query}`,
    {
      method: "POST",
      body,
    },
  );
  if (handleFetchUnauthorized(response)) {
    throw new Error("Unauthorized");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Administration signup error payload:", data);
    const message = data?.error || data?.errors || response.statusText;
    const error = new Error(message || "Failed to create administration user");
    error.response = { data };
    throw error;
  }
  return data;
}

export async function updateAdministration(id, payload, company_id) {
  if (!company_id) {
    throw new Error("company_id is required to update an administration user.");
  }
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (company_id) params.append("company_id", company_id);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  const url = `${BASE_URL}hospital_management/administration/${id}/${query}`;
  const hasFile = payload.profile_image instanceof File;

  if (hasFile) {
    const formData = new FormData();
    formData.append("company", company_id);
    formData.append("company_id", company_id);

    Object.entries(payload).forEach(([key, value]) => {
      if (key === "profile_image") {
        if (value) {
          formData.append("profile_image", value);
        }
        return;
      }
      if (value === undefined || value === null || value === "") return;
      formData.append(key, value);
    });

    const response = await fetch(url, {
      method: "PATCH",
      body: formData,
    });
    if (handleFetchUnauthorized(response)) {
      throw new Error("Unauthorized");
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error || data?.errors || response.statusText;
      const error = new Error(message || "Failed to update administration.");
      error.response = { data };
      throw error;
    }
    return data;
  }

  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  delete body.profile_image;

  return axios
    .patch(url, body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating administration:",
        error.response?.data || error,
      );
      throw error;
    });
}

export async function updateStaff(id, payload, company_id) {
  if (!company_id) {
    throw new Error("company_id is required to update a staff user.");
  }
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (company_id) params.append("company_id", company_id);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  const url = `${BASE_URL}hospital_management/staff/${id}/${query}`;
  const hasFile = payload.profile_image instanceof File;

  if (hasFile) {
    const formData = new FormData();
    formData.append("company", company_id);
    formData.append("company_id", company_id);

    Object.entries(payload).forEach(([key, value]) => {
      if (key === "profile_image") {
        if (value) {
          formData.append("profile_image", value);
        }
        return;
      }
      if (value === undefined || value === null || value === "") return;
      formData.append(key, value);
    });

    const response = await fetch(url, {
      method: "PATCH",
      body: formData,
    });
    if (handleFetchUnauthorized(response)) {
      throw new Error("Unauthorized");
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error || data?.errors || response.statusText;
      const error = new Error(message || "Failed to update staff.");
      error.response = { data };
      throw error;
    }
    return data;
  }

  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  delete body.profile_image;

  return axios
    .patch(url, body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error updating staff:", error.response?.data || error);
      throw error;
    });
}

export function deleteAdministration(id, company_id) {
  if (!company_id) {
    throw new Error("company_id is required to delete an administration user.");
  }
  const params = new URLSearchParams();
  params.append("company_id", company_id);
  const access_token = localStorage.getItem("access_token");
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .delete(`${BASE_URL}hospital_management/administration/${id}/${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error deleting administration:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function deleteStaff(id, company_id) {
  if (!company_id) {
    throw new Error("company_id is required to delete a staff user.");
  }
  const params = new URLSearchParams();
  params.append("company_id", company_id);
  const access_token = localStorage.getItem("access_token");
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .delete(`${BASE_URL}hospital_management/staff/${id}/${query}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error("Error deleting staff:", error.response?.data || error);
      throw error;
    });
}

export function getAllAdministrations(company_id, role = "administration") {
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (company_id) params.append("company_id", company_id);
  if (role) params.append("role", role);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/administration-list/${query}`)
    .then((response) => {
      // console.log("Active schools retrieved:", response.data);
      return response.data; // Return the list of active schools
    })
    .catch((error) => {
      console.error(
        "Error retrieving active schools:",
        error.response?.data || error,
      );
      throw error; // Propagate the error to be handled by the caller
    });
}

export function getAllStaff(company_id, role = "staff") {
  return getAllAdministrations(company_id, role);
}

export function getDelistedCompanyUsers(company_id, role = "") {
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (company_id) params.append("company_id", company_id);
  if (role) params.append("role", role);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/delisted-company-users/${query}`)
    .then((response) => response.data || [])
    .catch((error) => {
      console.error(
        "Error retrieving delisted company users:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function restoreDelistedCompanyUser(id, company_id) {
  if (!id) {
    throw new Error("id is required to restore a user.");
  }
  if (!company_id) {
    throw new Error("company_id is required to restore a user.");
  }
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  params.append("company_id", company_id);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .post(
      `${BASE_URL}hospital_management/delisted-company-users/${id}/restore/${query}`,
    )
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error restoring delisted user:",
        error.response?.data || error,
      );
      throw error;
    });
}

function setAdministrationApprovalStatus(
  administrationId,
  isApprove,
  companyId,
) {
  const access_token = localStorage.getItem("access_token");
  const url = `${BASE_URL}hospital_management/administration/${administrationId}/approve/`;
  const params = {};
  if (access_token) params.access_token = access_token;
  if (companyId) params.company_id = companyId;
  const config = Object.keys(params).length ? { params } : {};
  const payload = {
    is_approve: isApprove,
  };
  if (companyId) {
    payload.company = companyId;
    payload.company_id = companyId;
  }

  return axios
    .post(url, payload, config)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating administration approval status:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function approveAdministration(administrationId, companyId) {
  return setAdministrationApprovalStatus(administrationId, true, companyId);
}

export function upholdAdministration(administrationId, companyId) {
  return setAdministrationApprovalStatus(administrationId, false, companyId);
}

function setStaffApprovalStatus(staffId, isApprove, companyId) {
  const access_token = localStorage.getItem("access_token");
  const url = `${BASE_URL}hospital_management/staff/${staffId}/approve/`;
  const params = {};
  if (access_token) params.access_token = access_token;
  if (companyId) params.company_id = companyId;
  const config = Object.keys(params).length ? { params } : {};
  const payload = {
    is_approve: isApprove,
  };
  if (companyId) {
    payload.company = companyId;
    payload.company_id = companyId;
  }

  return axios
    .post(url, payload, config)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error updating staff approval status:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function approveStaff(staffId, companyId) {
  return setStaffApprovalStatus(staffId, true, companyId);
}

export function upholdStaff(staffId, companyId) {
  return setStaffApprovalStatus(staffId, false, companyId);
}

export function ensureStaffLogin(staffId, companyId, email) {
  if (!staffId) {
    throw new Error("staffId is required to create login access.");
  }
  const access_token = localStorage.getItem("access_token");
  const url = `${BASE_URL}hospital_management/staff/${staffId}/ensure-login/`;
  const params = {};
  if (access_token) params.access_token = access_token;
  if (companyId) params.company_id = companyId;
  const config = Object.keys(params).length ? { params } : {};
  const payload = {};
  if (companyId) {
    payload.company = companyId;
    payload.company_id = companyId;
  }
  const trimmedEmail = String(email || "").trim();
  if (trimmedEmail) {
    payload.email = trimmedEmail;
  }

  return axios
    .post(url, payload, config)
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "Error ensuring staff login access:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function getAllTimeSlots(company_id) {
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (company_id) params.append("company_id", company_id);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/time-slots/${query}`)
    .then((response) => {
      const payload = response?.data;
      if (Array.isArray(payload)) {
        return payload;
      }
      if (Array.isArray(payload?.data)) {
        return payload.data;
      }
      return [];
    })
    .catch((error) => {
      console.error(
        "Error fetching time slots:",
        error.response?.data || error,
      );
      throw error;
    });
}

export function createTimeSlot(payload, company_id) {
  const access_token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (company_id) params.append("company_id", company_id);
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .post(`${BASE_URL}hospital_management/time-slots/${query}`, payload)
    .then((response) => response?.data?.data || response?.data)
    .catch((error) => {
      console.error(
        "Error creating time slot:",
        error.response?.data || error,
      );
      throw error;
    });
}

/* ============================
   ✅ Get All Doctor Schedules (or filter)
   ============================ */
export const getAllDoctorSchedules = async (
  company_id,
  doctorId = null,
  day = null,
) => {
  if (!company_id) {
    return Promise.reject(
      new Error("company_id is required to fetch doctor schedules."),
    );
  }
  const params = new URLSearchParams();
  params.append("company_id", company_id);
  if (doctorId) params.append("doctor_id", doctorId);
  if (day) params.append("day", day);
  const access_token = localStorage.getItem("access_token");
  if (access_token) params.append("access_token", access_token);
  const query = params.toString() ? `?${params.toString()}` : "";
  return axios
    .get(`${BASE_URL}hospital_management/doctor-schedules/${query}`)
    .then((response) => {
      const payload = response?.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.results)) return payload.results;
      return [];
    })
    .catch((error) => {
      console.error(
        "Error fetching doctor schedules:",
        error.response?.data || error,
      );
      throw error;
    });
};

export const updateDoctorSchedule = async (scheduleId, company_id, payload) => {
  if (!scheduleId) {
    throw new Error("scheduleId is required to update doctor schedule.");
  }
  if (!company_id) {
    throw new Error("company_id is required to update doctor schedule.");
  }

  const body = {
    ...payload,
    company: company_id,
    company_id,
  };

  const query = new URLSearchParams({ company_id }).toString();

  const response = await fetch(
    `${BASE_URL}hospital_management/doctor-schedules/${scheduleId}/?${query}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (handleFetchUnauthorized(response)) {
    throw new Error("Unauthorized");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error || data?.errors || response.statusText;
    const error = new Error(message || "Failed to update doctor schedule");
    error.response = { data };
    throw error;
  }
  return data;
};

export const createDoctorSchedule = async (company_id, payload) => {
  if (!company_id) {
    throw new Error("company_id is required to create doctor schedule.");
  }
  const body = {
    ...payload,
    company: company_id,
    company_id,
  };
  const query = new URLSearchParams({ company_id }).toString();
  const response = await fetch(
    `${BASE_URL}hospital_management/doctor-schedules/?${query}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (handleFetchUnauthorized(response)) {
    throw new Error("Unauthorized");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error || data?.errors || response.statusText;
    const error = new Error(message || "Failed to create doctor schedule");
    error.response = { data };
    throw error;
  }
  return data;
};

const getVoucherAccessToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return (
    localStorage.getItem("access_token") || sessionStorage.getItem("access_token")
  );
};

const encodeVoucherFormPayload = (payload) => {
  const params = new URLSearchParams();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  return params.toString();
};

export const getReceiptVoucherDebitAccounts = async () => {
  const body = encodeVoucherFormPayload({
    access_token: getVoucherAccessToken() || undefined,
  });

  const response = await axios.post(
    `${BASE_URL}voucher_api/getAllAccountNameDebit/Receipt`,
    body,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  );

  return response?.data?.response || [];
};

export const getReceiptVoucherCreditAccounts = async () => {
  const body = encodeVoucherFormPayload({
    access_token: getVoucherAccessToken() || undefined,
    cr_acnt: "",
  });

  const response = await axios.post(
    `${BASE_URL}voucher_api/getAllAccountNameCredit/Receipt`,
    body,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  );

  return response?.data?.response || [];
};

export const generateReceiptVoucherId = async (company_id) => {
  if (!company_id) {
    throw new Error("company_id is required to generate voucher id.");
  }
  const voucherToken = `${company_id}-rv-`;
  const body = encodeVoucherFormPayload({
    access_token: getVoucherAccessToken() || undefined,
  });
  const response = await axios.post(
    `${BASE_URL}voucher_api/generateVoucherId/${voucherToken}`,
    body,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  );
  return response?.data || "";
};

export const createReceiptVoucher = async ({
  company_id,
  voucher_id,
  voucher_table_id,
  transaction_id,
  voucher_date,
  amount,
  dr_account_name_id,
  cr_account_name_id,
  description,
  payment_mode,
  reference_no,
  created_by,
}) => {
  const amountValue = Number(amount) || 0;
  const transactionDescription =
    description?.trim() || `Receipt via ${payment_mode || "ONLINE"}`;

  const voucherPayload = {
    id: voucher_table_id ? Number(voucher_table_id) : null,
    company_id: Number(company_id),
    voucher_type: "Receipt",
    voucher_id: voucher_id || null,
    voucher_no: null,
    voucher_source: "un_linked",
    voucher_date,
    paid_from_account_name_id: Number(cr_account_name_id),
    payment_mode: payment_mode || "ONLINE",
    total_amount: amountValue,
    note: description || null,
    reference_no: reference_no || "",
    created_by: created_by || "Web User",
    created_on: new Date().toISOString(),
  };

  const transactionPayload = {
    ...(transaction_id ? { id: Number(transaction_id) } : {}),
    company_id: Number(company_id),
    voucher_id: voucher_id || null,
    dr_account_name_id: Number(dr_account_name_id),
    dr_amount: amountValue,
    cr_account_name_id: Number(cr_account_name_id),
    cr_amount: amountValue,
    description: transactionDescription,
  };
  const transactions = [transactionPayload];

  const body = encodeVoucherFormPayload({
    access_token: getVoucherAccessToken() || undefined,
    new_voucher: JSON.stringify(voucherPayload),
    saved_transactions: JSON.stringify(transactions),
    reason: "Created from IPD payment list",
  });

  const response = await axios.post(
    `${BASE_URL}voucher_api/addNewVoucher/`,
    body,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  );

  return response?.data;
};

export const getReceiptVoucherDetailsWithTransaction = async (
  voucher_table_id,
) => {
  if (!voucher_table_id) {
    throw new Error("voucher_table_id is required.");
  }
  const body = encodeVoucherFormPayload({
    access_token: getVoucherAccessToken() || undefined,
    voucher_table_id: Number(voucher_table_id),
  });

  const response = await axios.post(
    `${BASE_URL}voucher_api/getVoucherDetailsWithTransaction/`,
    body,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  );

  const payload = response?.data?.response || {};
  return {
    voucher: payload?.voucher || null,
    transactions: Array.isArray(payload?.transactions)
      ? payload.transactions
      : [],
  };
};
