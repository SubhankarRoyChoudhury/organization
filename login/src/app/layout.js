import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "../components/sidebar";
import Header from "../components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Organization",
  description: "Organization Login",
  icons: {
    icon: "/login/owlhealth.png",
    shortcut: "/login/owlhealth.png",
    apple: "/login/owlhealth.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Header
          hideOnPaths={[
            "/",
            "/login",
            "/forgot_password",
            "/reset_password",
            "/create-organization",
          ]}
        />
        <Suspense fallback={null}>
          <Sidebar showOnlyOnHome />
        </Suspense>
        <div className="app-shell min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
