import { Suspense } from "react";

import ChainControlPage from "@/components/ChainControlPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-amber-50" />
      }
    >
      <ChainControlPage />
    </Suspense>
  );
}
