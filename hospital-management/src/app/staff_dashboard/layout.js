"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function StaffLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop)
        setSidebarOpen(true); // open by default
      else setSidebarOpen(false); // closed by default
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Header */}
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar (overlay style — no ghost gap) */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isDesktop={isDesktop}
        />

        {/* Overlay for mobile */}
        {!isDesktop && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content always full width */}
        <main className="flex-1 overflow-y-auto transition-all duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
