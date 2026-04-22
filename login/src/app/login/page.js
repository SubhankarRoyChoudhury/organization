"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginPage from "../page";

export default function LoginRoutePage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const hash = window.location.hash || "";
    if (hash.startsWith("#/reset_password")) {
      const queryIndex = hash.indexOf("?");
      const query = queryIndex >= 0 ? hash.slice(queryIndex + 1) : "";
      if (query) {
        router.replace(`/reset_password?${query}`);
      } else {
        router.replace("/reset_password");
      }
    }
  }, [router]);

  return <LoginPage />;
}
