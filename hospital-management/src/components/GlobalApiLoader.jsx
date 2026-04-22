"use client";

import { useEffect, useState } from "react";
import {
  getPendingApiRequests,
  subscribeApiLoading,
} from "@/app/api/loadingTracker";

export default function GlobalApiLoader() {
  const [pending, setPending] = useState(() => getPendingApiRequests());

  useEffect(() => {
    return subscribeApiLoading(setPending);
  }, []);

  if (pending <= 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/25 backdrop-blur-[1px]">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-5 shadow-xl">
        <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-700 animate-spin" />
        <p className="text-sm font-medium text-slate-700">Loading...</p>
      </div>
    </div>
  );
}
