import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const bodyFont = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Clinic Management Frontend",
  description: "Frontend concept for clinic operations, appointments, prescriptions, and billing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${displayFont.variable} h-full w-full overflow-hidden`}
    >
      <body
        suppressHydrationWarning
        className="flex h-full min-h-screen w-full flex-col overflow-hidden"
      >
        {children}
      </body>
    </html>
  );
}
