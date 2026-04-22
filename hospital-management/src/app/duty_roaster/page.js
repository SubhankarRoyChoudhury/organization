import { Suspense } from "react";
import DutyRosterPageClient from "./DutyRosterPageClient";

export default function DutyRosterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 px-6 py-8 text-sm text-slate-600">
          Loading duty roster...
        </div>
      }
    >
      <DutyRosterPageClient />
    </Suspense>
  );
}
