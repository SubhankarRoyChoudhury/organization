"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AcademicTimetable() {
  const router = useRouter();
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(true);

  return (
    <main className="dashboard-shell h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full w-full flex-col px-3 pb-4 pt-16 sm:px-6 lg:px-8 lg:pt-8">
        <section className="shrink-0 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-700 via-cyan-700 to-teal-700 px-4 py-5 text-white shadow-[0_16px_34px_rgba(14,116,144,0.25)] sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-wide sm:text-2xl">Timetable</h1>
          </div>
        </section>
      </div>

      {isComingSoonOpen ? (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/55 backdrop-blur-[1px]"
            onClick={() => setIsComingSoonOpen(false)}
            aria-label="Close coming soon dialog"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
            <h2 className="text-xl font-semibold text-slate-900">Coming Soon</h2>
            <p className="mt-2 text-sm text-slate-600">
              The Timetable module is under development and will be available soon.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="inline-flex h-10 min-w-[96px] items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
