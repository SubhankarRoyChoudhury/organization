"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import {
  getOrganizationHospitals,
  getOrganizations,
  getCompanyInfo,
  delistCompany,
} from "@/app/api/apiService";
import CreateCompanyDialog from "@/components/ui/create-company-dialog";

const formatDateForInput = (value) => {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
    return "";
  }
  try {
    return new Date(value).toISOString().split("T")[0];
  } catch (_error) {
    return "";
  }
};

export default function OrganizationAdminHospitalListPage() {
  const router = useRouter();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const createCompanyDialogRef = useRef(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionMessageTone, setActionMessageTone] = useState("error");
  const [loadingCompanyId, setLoadingCompanyId] = useState(null);
  const [deletingCompanyId, setDeletingCompanyId] = useState(null);

  const loadHospitals = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getOrganizationHospitals();
      setHospitals(Array.isArray(response?.hospitals) ? response.hospitals : []);
    } catch (err) {
      setError("Unable to load the hospital list.");
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHospitals();
  }, [loadHospitals]);

  useEffect(() => {
    let mounted = true;
    const loadOrganizations = async () => {
      try {
        setIsLoadingOrganizations(true);
        const response = await getOrganizations();
        if (!mounted) {
          return;
        }
        setOrganizations(Array.isArray(response) ? response : []);
      } catch (_err) {
        if (mounted) {
          setOrganizations([]);
        }
      } finally {
        if (mounted) {
          setIsLoadingOrganizations(false);
        }
      }
    };

    loadOrganizations();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!event.target?.closest("[data-action-menu]")) {
        setActionMenuOpenId(null);
        setActionMenuPosition(null);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    if (!actionMenuOpenId) {
      return undefined;
    }
    const closeMenu = () => {
      setActionMenuOpenId(null);
      setActionMenuPosition(null);
    };
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [actionMenuOpenId]);

  const toggleActionMenu = (hospitalId, event) => {
    const rect = event?.currentTarget?.getBoundingClientRect?.() || null;
    setActionMenuOpenId((prev) => {
      if (prev === hospitalId) {
        setActionMenuPosition(null);
        return null;
      }
      if (!rect) {
        setActionMenuPosition(null);
        return hospitalId;
      }
      const menuWidth = 160;
      const padding = 12;
      const left = Math.max(
        padding,
        Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - padding),
      );
      setActionMenuPosition({
        top: rect.bottom + 8,
        left,
      });
      return hospitalId;
    });
  };

  const handleEditHospital = async (hospital) => {
    setActionMessage("");
    setActionMenuOpenId(null);
    setActionMenuPosition(null);
    const identifierCandidates = [
      hospital.id ? String(hospital.id) : null,
      hospital.company_id ? String(hospital.company_id) : null,
    ].filter(Boolean);
    if (!identifierCandidates.length) {
      setActionMessageTone("error");
      setActionMessage("Unable to determine the selected company.");
      return;
    }

    setLoadingCompanyId(hospital.id);
    let companyInfoPayload = null;
    let companyUsername = "";
    let companyPayload = null;
    for (const candidate of identifierCandidates) {
      try {
        const companyInfoResponse = await getCompanyInfo(candidate, undefined, {
          byCompanyId: true,
        });
        companyInfoPayload =
          companyInfoResponse?.response?.company_info ||
          companyInfoResponse?.response?.companyInfo ||
          null;
        companyPayload = companyInfoResponse?.response?.company || null;
        companyUsername = companyInfoResponse?.response?.company?.username || "";
        break;
      } catch (infoError) {
        console.error("Unable to load company info for", candidate, infoError);
      }
    }

    setLoadingCompanyId(null);

    const initialValues = {
      id: companyInfoPayload?.id || "",
      company_id: companyInfoPayload?.company_id || hospital.company_id || "",
      organization_id:
        companyInfoPayload?.organization_id || hospital.company_id || "",
      company_name:
        companyInfoPayload?.company_name || hospital.company_name || "",
      location:
        companyInfoPayload?.location ||
        companyPayload?.location ||
        hospital.location ||
        "",
      district:
        companyInfoPayload?.district ||
        companyPayload?.district ||
        hospital.district ||
        "",
      school_code:
        companyInfoPayload?.school_code ||
        companyPayload?.school_code ||
        hospital.school_code ||
        "",
      start_date: formatDateForInput(
        companyInfoPayload?.start_date ||
          companyPayload?.start_date ||
          hospital.start_date,
      ),
      admin_name:
        companyInfoPayload?.admin_name || hospital.admin_name || "",
      username:
        companyInfoPayload?.username ||
        companyUsername ||
        hospital.username ||
        "",
      email: companyInfoPayload?.email || hospital.email || "",
      phone_number: companyInfoPayload?.mobile_no || "",
      address: companyInfoPayload?.address || "",
      city: companyInfoPayload?.city || "",
      state: companyInfoPayload?.head_office_state || "",
      country: companyInfoPayload?.country || "",
      pin: companyInfoPayload?.pin || "",
      main_group:
        hospital.main_group ||
        companyPayload?.main_group ||
        companyInfoPayload?.main_group ||
        "Swasthya",
      sub_group:
        hospital.sub_group ||
        companyPayload?.sub_group ||
        companyInfoPayload?.sub_group ||
        "Hospital",
      school_category:
        hospital.school_category ||
        companyPayload?.school_category ||
        companyInfoPayload?.school_category ||
        "",
    };

    createCompanyDialogRef.current?.open({
      initialValues,
      mode: "update",
    });
  };

  const handleDeleteHospital = async (hospital) => {
    setActionMessage("");
    setActionMenuOpenId(null);
    setActionMenuPosition(null);
    const identifier = hospital.company_id || hospital.id;
    if (!identifier) {
      setActionMessageTone("error");
      setActionMessage("Unable to determine the selected company.");
      return;
    }

    setDeletingCompanyId(hospital.id);
    try {
      await delistCompany({ company_id: identifier });
      setActionMessageTone("success");
      setActionMessage("Company delisted successfully.");
      await loadHospitals();
    } catch (deleteError) {
      console.error("Unable to delete company:", deleteError);
      setActionMessageTone("error");
      setActionMessage(
        deleteError.response?.data?.error ||
          deleteError.response?.data?.detail ||
          "Unable to delete the company.",
      );
    } finally {
      setDeletingCompanyId(null);
    }
  };

  const openCompanyAccountDialogWithOrganizationName = (
    name,
    mainCategory,
    subCategory = "",
  ) => {
    setActionMessage("");
    createCompanyDialogRef.current?.open({
      organizationName: name,
      mainCategory,
      subCategory,
      mode: "create",
    });
  };

  const renderTable = () => {
    if (loading) {
      return <p className="text-sm text-slate-500">Loading hospitals...</p>;
    }
    if (error) {
      return <p className="text-sm font-medium text-rose-600">{error}</p>;
    }
    if (hospitals.length === 0) {
      return <p className="text-sm text-slate-500">No hospitals found.</p>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Sl. No.</th>
              <th className="px-3 py-3">Hospital</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Location</th>
              <th className="px-3 py-3">Admin</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">UserId</th>
              <th className="px-3 py-3">Address</th>
              <th className="px-3 py-3">District</th>
              <th className="px-3 py-3">City</th>
              <th className="px-3 py-3">State</th>
              <th className="px-3 py-3">Approved</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {hospitals.map((hospital, index) => (
              <tr
                key={hospital.id}
                className="border-b border-slate-100 last:border-b-0"
              >
                <td className="px-3 py-3 font-medium text-slate-900">
                  {index + 1}
                </td>
                <td className="px-3 py-3 font-medium text-slate-900">
                  {hospital.company_name || "—"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {hospital.school_category || hospital.sub_group || "—"}
                </td>
                <td className="px-3 py-3 font-medium text-slate-900">
                  {hospital.location || "—"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {hospital.admin_name || "—"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {hospital.email || "—"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {hospital.username || "—"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {hospital.address || "—"}
                </td>
                <td className="px-3 py-3 font-medium text-slate-900">
                  {hospital.district || "—"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {hospital.city || "—"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {hospital.state || hospital.head_office_state || "—"}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      hospital.is_approved
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {hospital.is_approved ? "Yes" : "Pending"}
                  </span>
                </td>
                <td className="px-3 py-3 text-right text-slate-600">
                  <div
                    className="relative inline-flex justify-end"
                    data-action-menu="true"
                  >
                    <button
                      type="button"
                      onClick={(event) => toggleActionMenu(hospital.id, event)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {actionMenuOpenId === hospital.id && actionMenuPosition && (
                      <div
                        className="fixed z-[90] w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left text-sm shadow-lg"
                        style={{
                          top: `${actionMenuPosition.top}px`,
                          left: `${actionMenuPosition.left}px`,
                        }}
                        data-action-menu="true"
                      >
                        <button
                          type="button"
                          onClick={() => handleEditHospital(hospital)}
                          disabled={loadingCompanyId === hospital.id}
                          className="w-full px-4 py-2 text-left font-medium text-slate-700 transition hover:bg-slate-50 disabled:text-slate-400"
                        >
                          {loadingCompanyId === hospital.id ? "Loading..." : "Edit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHospital(hospital)}
                          disabled={deletingCompanyId === hospital.id}
                          className="w-full px-4 py-2 text-left font-medium text-rose-600 transition hover:bg-slate-50 disabled:text-rose-200"
                        >
                          {deletingCompanyId === hospital.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <main className="min-h-screen bg-slate-50 py-10">
        <div className="w-full space-y-6 px-4 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Hospital List
                </h1>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/category/swasthya")}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                >
                  Back to Swasthya
                </button>
                <button
                  className="super-button is-secondary rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  type="button"
                  onClick={() =>
                    openCompanyAccountDialogWithOrganizationName(
                      "Swasthya",
                      "Swasthya",
                      "Hospital",
                    )
                  }
                >
                  Create Hospital
                </button>
              </div>
            </div>
            {actionMessage && (
              <p
                className={`text-sm font-medium ${
                  actionMessageTone === "success"
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {actionMessage}
              </p>
            )}
          </header>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
            <div className="mt-2">{renderTable()}</div>
          </section>
        </div>
      </main>
      <CreateCompanyDialog
        ref={createCompanyDialogRef}
        organizations={organizations}
        isLoadingOrganizations={isLoadingOrganizations}
        onSuccess={loadHospitals}
      />
    </>
  );
}
