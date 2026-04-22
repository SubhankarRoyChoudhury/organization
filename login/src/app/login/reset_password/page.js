"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LegacyLoginResetPasswordRouteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    if (query) {
      router.replace(`/reset_password?${query}`);
      return;
    }
    router.replace("/reset_password");
  }, [router, searchParams]);

  return null;
}

export default function LegacyLoginResetPasswordRoute() {
  return (
    <Suspense fallback={null}>
      <LegacyLoginResetPasswordRouteContent />
    </Suspense>
  );
}
