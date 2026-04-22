"use client";
// src/app/layout.js
import "./globals.css";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { I18nextProvider } from "react-i18next";
import initI18n from "./i18n/i18n";
import AppPermissionGate from "./components/AppPermissionGate";
import GlobalApiLoader from "@/components/GlobalApiLoader";
// export const metadata = {
//   title: "MedCare Hospital",
//   description: "Modern hospital management homepage",
// };

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const i18n = initI18n();

  const isStandalone = pathname?.includes("/index");

  useEffect(() => {
    document.title = "Hospital Management";
    const href = "/hospital-management/icon.png?v=2";
    const ensureLink = (rel, type) => {
      let link = document.querySelector(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      if (type) {
        link.type = type;
      }
      link.href = href;
    };
    ensureLink("icon", "image/png");
    ensureLink("shortcut icon", "image/png");
    ensureLink("apple-touch-icon");
  }, []);

  if (isStandalone) {
    return (
      <html lang="en">
        <body className={`${inter.variable} antialiased`}>
          <I18nextProvider i18n={i18n}>
            <AppPermissionGate appName="Hospital Management">
              {children}
              <GlobalApiLoader />
            </AppPermissionGate>
          </I18nextProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body
        className="antialiased bg-white text-gray-900"
        suppressHydrationWarning
      >
        <I18nextProvider i18n={i18n}>
          <AppPermissionGate appName="Hospital Management">
            {children}
            <GlobalApiLoader />
          </AppPermissionGate>
        </I18nextProvider>
      </body>
    </html>
  );
}
