import { useEffect, useState } from "react";

import { ApiError } from "../api/client";

export interface ApiResource<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
}

/**
 * Fetch once on mount and expose loading / error / data.
 *
 * Deliberately small. When the team wants caching, retries, or invalidation,
 * swap this for TanStack Query — the call sites stay the same shape.
 */
export function useApiResource<T>(
  load: () => Promise<T>,
  dependencies: readonly unknown[] = [],
): ApiResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError(null);

    load()
      .then((result) => {
        if (isCurrent) {
          setData(result);
        }
      })
      .catch((caught: unknown) => {
        if (!isCurrent) {
          return;
        }
        setData(null);
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "unknown_error", String(caught)),
        );
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, error, isLoading };
}
