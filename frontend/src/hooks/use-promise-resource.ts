"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type LoadOptions = { silent?: boolean };

/**
 * Shared list/resource loader:
 * - `isLoading` only on first paint (no blank UI on refresh)
 * - `refresh()` is silent once data exists
 * - `apply` / `setData` updates from mutation Promise results immediately
 */
export function usePromiseResource<T>({
  load,
  initial,
  errorMessage,
  enabled = true,
}: {
  load: () => Promise<T>;
  initial: T;
  errorMessage: string;
  enabled?: boolean;
}) {
  const [data, setDataState] = useState<T>(initial);
  const [isLoading, setIsLoading] = useState(Boolean(enabled));
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);
  const initialRef = useRef(initial);
  initialRef.current = initial;

  const loadFromServer = useCallback(
    async (options?: LoadOptions) => {
      if (!enabled) {
        setDataState(initialRef.current);
        setIsLoading(false);
        setIsFetching(false);
        hasLoadedRef.current = false;
        return;
      }

      const requestId = ++requestIdRef.current;
      const silent = options?.silent === true && hasLoadedRef.current;

      if (!hasLoadedRef.current && !silent) {
        setIsLoading(true);
      } else {
        setIsFetching(true);
      }
      setError(null);

      try {
        const next = await load();
        if (requestId !== requestIdRef.current) return;
        startTransition(() => {
          setDataState(next);
          setError(null);
        });
        hasLoadedRef.current = true;
      } catch {
        if (requestId !== requestIdRef.current) return;
        setError(errorMessage);
        if (!hasLoadedRef.current) {
          setDataState(initialRef.current);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    },
    [enabled, errorMessage, load],
  );

  useEffect(() => {
    void loadFromServer();
  }, [loadFromServer]);

  const refresh = useCallback(async () => {
    await loadFromServer({ silent: true });
  }, [loadFromServer]);

  const setData = useCallback((next: T | ((previous: T) => T)) => {
    startTransition(() => {
      setDataState((previous) =>
        typeof next === "function" ?
          (next as (previous: T) => T)(previous)
        : next,
      );
    });
  }, []);

  return {
    data,
    setData,
    isLoading,
    isFetching,
    error,
    refresh,
  };
}
