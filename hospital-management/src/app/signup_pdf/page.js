"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getApprovedDepartments,
  getApprovedDoctorTypes,
  getAllTimeSlots,
} from "@/app/api/apiService";

function DoctorSignupPdfContent() {
  const searchParams = useSearchParams();
  const prefillParam = searchParams?.get("prefill");
  const companyIdParam = searchParams?.get("company_id");
  const autoPrint = searchParams?.get("auto_print") === "true";

  const prefill = useMemo(() => {
    if (!prefillParam) return null;
    try {
      return JSON.parse(prefillParam);
    } catch (error) {
      console.error("Failed to parse prefill JSON:", error);
      return null;
    }
  }, [prefillParam]);

  const [departments, setDepartments] = useState([]);
  const [doctorTypes, setDoctorTypes] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [isReadyToPrint, setIsReadyToPrint] = useState(false);

  const companyId = useMemo(() => {
    if (!companyIdParam) return null;
    const num = Number(companyIdParam);
    if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
      return null;
    }
    return num;
  }, [companyIdParam]);

  useEffect(() => {
    if (!companyId) {
      setIsReadyToPrint(true);
      return;
    }
    let isActive = true;
    const load = async () => {
      try {
        const [deptData, typeData, slotData] = await Promise.all([
          getApprovedDepartments(companyId),
          getApprovedDoctorTypes(companyId),
          getAllTimeSlots(companyId),
        ]);
        if (!isActive) return;
        setDepartments(Array.isArray(deptData) ? deptData : []);
        setDoctorTypes(Array.isArray(typeData) ? typeData : []);
        setTimeSlots(Array.isArray(slotData) ? slotData : []);
      } catch (error) {
        if (!isActive) return;
        setDepartments([]);
        setDoctorTypes([]);
        setTimeSlots([]);
      } finally {
        if (!isActive) return;
        setIsReadyToPrint(true);
      }
    };
    load();
    return () => {
      isActive = false;
    };
  }, [companyId]);

  useEffect(() => {
    if (!isReadyToPrint || !autoPrint) return;
    const timer = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(timer);
  }, [isReadyToPrint, autoPrint]);

  useEffect(() => {
    const name = String(prefill?.fullName || "Doctor").trim();
    if (name) {
      document.title = name;
    }
  }, [prefill]);

  const slotLabelMap = useMemo(() => {
    const map = new Map();
    timeSlots.forEach((slot) => {
      const display =
        slot.display_time ||
        `${slot.start_time ?? ""} - ${slot.end_time ?? ""}`.trim();
      map.set(String(slot.id), display || `Slot #${slot.id}`);
    });
    return map;
  }, [timeSlots]);

  const availableDaySlots = prefill?.availableDaySlots || {};
  const availableDaySlotLabels = prefill?.availableDaySlotLabels || {};
  const availableDays = Object.keys(availableDaySlots || {});

  const departmentName = useMemo(() => {
    if (prefill?.departmentName) return prefill.departmentName;
    if (!prefill?.department) return "";
    const match = departments.find(
      (dept) => String(dept.id) === String(prefill.department),
    );
    return match?.name || String(prefill.department);
  }, [departments, prefill]);

  const doctorTypeName = useMemo(() => {
    if (prefill?.doctorTypeName) return prefill.doctorTypeName;
    if (!prefill?.doctorType) return "";
    const match = doctorTypes.find(
      (type) => String(type.id) === String(prefill.doctorType),
    );
    return match?.name || String(prefill.doctorType);
  }, [doctorTypes, prefill]);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#e1f5ff] via-white to-[#d7f1ff] flex items-center justify-center px-4 sm:px-6 lg:px-12 py-6 sm:py-10 print-container">
      <div className="relative max-w-3xl lg:max-w-4xl w-full">
        <div className="absolute -top-20 -left-16 w-44 h-44 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-8 w-56 h-56 rounded-full bg-teal-200/40 blur-3xl" />

        <div className="relative bg-gradient-to-br from-blue-100 via-white to-teal-100 p-[1.5px] rounded-[28px] lg:rounded-[36px] shadow-2xl">
          <div className="relative bg-white/92 backdrop-blur-md rounded-[27px] lg:rounded-[35px] overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -right-32 h-56 w-56 rounded-full bg-teal-200/45 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-40 -translate-x-1/2 bg-blue-200/35 blur-3xl" />

            <div className="relative px-6 sm:px-10 lg:px-12 py-8 sm:py-10 flex flex-col justify-center gap-5 sm:gap-7">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Doctor Signup PDF
                </span>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={prefill?.fullName || ""}
                      readOnly
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 sm:py-3 text-sm text-gray-900 outline-none bg-white/70"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Email
                    </label>
                    <input
                      type="email"
                      value={prefill?.email || ""}
                      readOnly
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 sm:py-3 text-sm text-gray-900 outline-none bg-white/70"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={prefill?.phone || ""}
                      readOnly
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 sm:py-3 text-sm text-gray-900 outline-none bg-white/70"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500">
                      WhatsApp Number
                    </label>
                    <input
                      type="text"
                      value={prefill?.whatsappNumber || ""}
                      readOnly
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 sm:py-3 text-sm text-gray-900 outline-none bg-white/70"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Association Type
                    </label>
                    <input
                      type="text"
                      value={prefill?.associationType || ""}
                      readOnly
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 sm:py-3 text-sm text-gray-900 outline-none bg-white/70"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Medical Council Registration
                    </label>
                    <input
                      type="text"
                      value={prefill?.medicalCouncilRegistration || ""}
                      readOnly
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 sm:py-3 text-sm text-gray-900 outline-none bg-white/70"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Department
                    </label>
                    <input
                      type="text"
                      value={departmentName}
                      readOnly
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 sm:py-3 text-sm text-gray-900 outline-none bg-white/70"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Doctor Type
                    </label>
                    <input
                      type="text"
                      value={doctorTypeName}
                      readOnly
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 sm:py-3 text-sm text-gray-900 outline-none bg-white/70"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <label className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Available Days & Time Slots
                  </label>
                  {availableDays.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 text-sm text-gray-600">
                      No schedule selected.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {availableDays.map((day) => {
                        const slots = Array.isArray(availableDaySlots?.[day])
                          ? availableDaySlots[day]
                          : [];
                        const labels = Array.isArray(availableDaySlotLabels?.[day])
                          ? availableDaySlotLabels[day]
                          : null;
                        return (
                          <div
                            key={day}
                            className="rounded-2xl border border-gray-200 bg-white/70 px-4 py-3"
                          >
                            <p className="text-sm font-semibold text-gray-700">
                              {day}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {slots.map((slotId, index) => (
                                <span
                                  key={`${day}-${slotId}`}
                                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                                >
                                  {labels?.[index] ||
                                    slotLabelMap.get(String(slotId)) ||
                                    `Slot #${slotId}`}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print-container {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function DoctorSignupPdfPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-[#e1f5ff] via-white to-[#d7f1ff] flex items-center justify-center px-4 sm:px-6 lg:px-12 py-6 sm:py-10">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Loading...
          </div>
        </div>
      }
    >
      <DoctorSignupPdfContent />
    </Suspense>
  );
}
