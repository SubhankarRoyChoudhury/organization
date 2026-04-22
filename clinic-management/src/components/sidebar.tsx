"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CircleDollarSign,
  FilePlus2,
  LayoutGrid,
  HeartPulse,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Stethoscope,
} from "lucide-react";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/patients", label: "Patients", icon: HeartPulse },
  { href: "/doctors", label: "Doctors", icon: Stethoscope },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/prescription", label: "Prescription", icon: FilePlus2 },
  { href: "/billing", label: "Billing", icon: CircleDollarSign },
];

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`relative z-20 h-full min-h-0 overflow-visible rounded-[30px] border border-[#1f3d47] bg-[linear-gradient(180deg,#0f1720_0%,#11242d_100%)] p-4 shadow-[0_28px_90px_rgba(8,15,26,0.28)] ${
        collapsed ? "lg:px-3" : ""
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_48%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_42%)]"
      />
      <div className="relative z-10 flex h-full flex-col">
        <div
          className={`relative border-b border-white/10 pb-4 ${
            collapsed ? "flex justify-center" : "flex items-center justify-between gap-3"
          }`}
        >
          {collapsed ? null : (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-teal-300/70">
                Workspace
              </p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">
                Clinic management
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="group relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-slate-200 transition-colors hover:bg-white/12"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
            {collapsed ? (
              <span className="pointer-events-none absolute left-full top-1/2 z-[60] ml-3 -translate-y-1/2 rounded-xl bg-slate-900 px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                Expand sidebar
              </span>
            ) : null}
          </button>
        </div>

        <div
          className={`relative mt-4 rounded-2xl border border-white/10 bg-white/6 text-sm text-slate-300 ${
            collapsed
              ? "group relative flex h-11 items-center justify-center"
              : "flex items-center gap-3 px-3 py-2"
          }`}
        >
          <Search className="h-4 w-4" />
          {collapsed ? (
            <span className="pointer-events-none absolute left-full top-1/2 z-[60] ml-3 -translate-y-1/2 rounded-xl bg-slate-900 px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              Search
            </span>
          ) : (
            <span className="text-slate-400">Search workspace</span>
          )}
        </div>

        <nav className="mt-5 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative rounded-2xl text-sm transition-all ${
                  active
                    ? "bg-[linear-gradient(135deg,rgba(20,184,166,0.2)_0%,rgba(14,165,233,0.16)_100%)] text-white shadow-[inset_0_0_0_1px_rgba(94,234,212,0.16)]"
                    : "text-slate-300 hover:bg-white/6 hover:text-white"
                } ${collapsed ? "flex h-12 items-center justify-center px-0" : "flex items-center justify-between px-3 py-3"}`}
                title={collapsed ? item.label : undefined}
              >
                <span className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      active ? "bg-white/10 text-teal-200" : "bg-white/6 text-slate-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {collapsed ? null : (
                    <span
                      className={`font-medium tracking-[-0.01em] ${
                        active ? "text-white" : "text-slate-100"
                      }`}
                    >
                      {item.label}
                    </span>
                  )}
                </span>
                {!collapsed ? (
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      active ? "bg-teal-300" : "bg-transparent"
                    }`}
                  />
                ) : null}
                {collapsed ? (
                  <span className="pointer-events-none absolute left-full top-1/2 z-[60] ml-3 -translate-y-1/2 rounded-xl bg-slate-900 px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {item.label}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div
          className={`relative mt-auto rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_100%)] ${
            collapsed ? "group relative flex justify-center p-3" : "p-4"
          }`}
        >
          {collapsed ? null : (
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Schema</p>
          )}
          <div className={`flex ${collapsed ? "justify-center" : "mt-3 items-center gap-3"}`}>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] text-sm font-semibold text-white">
              ER
            </div>
            {collapsed ? (
              <span className="pointer-events-none absolute left-full top-1/2 z-[60] ml-3 -translate-y-1/2 rounded-xl bg-slate-900 px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                Entity relations
              </span>
            ) : (
              <div>
                <p className="text-sm font-semibold text-white">Entity relations</p>
                <p className="text-xs text-slate-400">1:1 users, 1:M appointments</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
