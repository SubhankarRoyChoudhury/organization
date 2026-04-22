"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";

type WorkspaceShellProps = {
  children: React.ReactNode;
};

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <main className="clinic-noise relative h-screen w-screen overflow-hidden p-3 sm:p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.1),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.08),transparent_26%)]"
      />
      <div
        className={`relative grid h-full gap-3 sm:gap-4 ${
          collapsed
            ? "lg:grid-cols-[88px_minmax(0,1fr)]"
            : "lg:grid-cols-[268px_minmax(0,1fr)]"
        }`}
      >
        <div className="relative z-20 h-full min-h-0">
          <Sidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed((value) => !value)}
          />
        </div>
        <div className="relative z-0 min-h-0 overflow-auto">{children}</div>
      </div>
    </main>
  );
}
