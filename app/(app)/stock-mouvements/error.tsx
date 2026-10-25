"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function StockMouvementsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <ErrorState
        title="Impossible de charger les mouvements de stock"
        digest={error.digest}
        onRetry={reset}
      />
    </div>
  );
}
