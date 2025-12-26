"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

const GA_ID = "G-9EZFQCP5X1";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const hasTrackedInitial = React.useRef(false);

  React.useEffect(() => {
    if (!hasTrackedInitial.current) {
      hasTrackedInitial.current = true;
      return;
    }

    const pagePath = search ? `${pathname}?${search}` : pathname;
    if (typeof window.gtag === "function") {
      window.gtag("config", GA_ID, { page_path: pagePath });
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(["config", GA_ID, { page_path: pagePath }]);
  }, [pathname, search]);

  return null;
}
