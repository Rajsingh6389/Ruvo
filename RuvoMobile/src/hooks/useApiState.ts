import { useCallback, useEffect, useRef, useState } from 'react';
import { useNetworkStatus } from './useNetworkStatus';

/** The seven states every API-driven screen must be able to represent (§10). */
export type ApiStatus =
  /** Mounted, nothing requested yet. */
  | 'INITIAL'
  /** First load, no data to show yet -- render a skeleton. */
  | 'LOADING'
  /** Loaded and non-empty. */
  | 'SUCCESS'
  /** Loaded successfully, but there is nothing to show. */
  | 'EMPTY'
  /** The request failed and there is no data to fall back on. */
  | 'ERROR'
  /** Reloading with data already on screen -- the existing data stays visible. */
  | 'REFRESHING'
  /** No connectivity. Any previously loaded data is kept. */
  | 'OFFLINE';

export type ApiState<T> = {
  status: ApiStatus;
  data: T | null;
  /** Safe, human-readable message. Never a raw backend exception. */
  error: string | null;
  /** True while a pull-to-refresh is in flight -- bind to RefreshControl. */
  isRefreshing: boolean;
  /** True during any request, first load or refresh. */
  isBusy: boolean;
  /** Pull-to-refresh. Keeps current data visible; ignores overlapping calls. */
  refresh: () => Promise<void>;
  /** Retry after a failure. Shows the loading state again. */
  retry: () => Promise<void>;
  /** Replace data locally, e.g. after a mutation, without a round trip. */
  setData: (next: T | null | ((prev: T | null) => T | null)) => void;
};

type Options<T> = {
  /**
   * Decides the EMPTY state. Defaults to "null/undefined, or an empty array".
   * Pass this when a successful response can be structurally non-empty but still
   * have nothing to render (e.g. `{ orders: [] }`).
   */
  isEmpty?: (data: T) => boolean;
  /** Re-run when any of these change. Same semantics as a `useEffect` dep list. */
  deps?: ReadonlyArray<unknown>;
  /** Skip fetching until true -- for requests that need an id or auth first. */
  enabled?: boolean;
  /** Override the user-facing failure message. */
  errorMessage?: string;
};

const defaultIsEmpty = (data: unknown): boolean => {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data)) return data.length === 0;
  return false;
};

/**
 * Turn a raw thrown value into something safe to show a user.
 *
 * Backend stack traces, SQL fragments and Java exception class names must never
 * reach the UI (§10), so anything that looks like one is replaced with the
 * generic fallback. Short, sentence-like messages are allowed through, since
 * those are usually deliberate validation text from our own API.
 */
export const toUserMessage = (error: unknown, fallback: string): string => {
  const raw =
    typeof error === 'string'
      ? error
      : error instanceof Error
      ? error.message
      : typeof (error as { message?: unknown })?.message === 'string'
      ? String((error as { message: string }).message)
      : '';

  const message = raw.trim();
  if (!message) return fallback;

  const looksInternal =
    message.length > 160 ||
    /\bat [\w$.]+\(/.test(message) ||                                    // stack frame
    (/(Exception|Throwable|Error:)/.test(message) && /\b(java|org|com)\./.test(message)) ||
    /\b(SQL|JDBC|Hibernate|NullPointer|500 Internal)\b/i.test(message) ||
    message.startsWith('{') ||                                           // raw JSON body
    message.startsWith('<');                                             // HTML error page

  return looksInternal ? fallback : message;
};

/**
 * Data fetching with the full §10 state set, no external dependency.
 *
 * Two rules it enforces so screens cannot get them wrong:
 * - **Data is never cleared to show a loading or error state.** A refresh that
 *   fails leaves the last good data on screen with the error surfaced separately,
 *   so a flaky network cannot blank a working page (§11, §22).
 * - **Overlapping requests are dropped**, so a repeated pull-to-refresh fires
 *   once (§11).
 */
export function useApiState<T>(fetcher: () => Promise<T>, options: Options<T> = {}): ApiState<T> {
  const { isEmpty = defaultIsEmpty, deps = [], enabled = true, errorMessage } = options;

  const [data, setDataState] = useState<T | null>(null);
  const [status, setStatus] = useState<ApiStatus>('INITIAL');
  const [error, setError] = useState<string | null>(null);

  const { isOffline } = useNetworkStatus();

  // Kept in refs so `run` stays referentially stable: screens pass it straight to
  // RefreshControl and to child components, which would otherwise re-render on
  // every state change here.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const isEmptyRef = useRef(isEmpty);
  isEmptyRef.current = isEmpty;

  const errorMessageRef = useRef(errorMessage);
  errorMessageRef.current = errorMessage;

  const inFlight = useRef(false);
  const mounted = useRef(true);
  const hasData = useRef(false);
  // Mirrors `data` so `setData` can resolve an updater function without calling
  // setState from inside another setState updater (updaters must stay pure).
  const dataRef = useRef<T | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const settle = useCallback((next: T) => {
    hasData.current = true;
    dataRef.current = next;
    setDataState(next);
    setError(null);
    setStatus(isEmptyRef.current(next) ? 'EMPTY' : 'SUCCESS');
  }, []);

  const run = useCallback(
    async (mode: 'load' | 'refresh') => {
      // §11: a second pull while one is already running must not fire again.
      if (inFlight.current) return;
      inFlight.current = true;

      // Only a first load may show a skeleton. A refresh keeps the current data
      // and status visible so the screen never blanks mid-request.
      if (mode === 'load' && !hasData.current) {
        setStatus('LOADING');
      } else {
        setStatus('REFRESHING');
      }

      try {
        const result = await fetcherRef.current();
        if (!mounted.current) return;
        settle(result);
      } catch (err) {
        if (!mounted.current) return;

        const message = toUserMessage(err, errorMessageRef.current ?? 'Something went wrong. Please try again.');
        setError(message);

        // Data already on screen outlives a failed refresh -- it is stale, not
        // wrong, and blanking it would be a worse experience than showing it.
        setStatus(hasData.current ? 'SUCCESS' : 'ERROR');
      } finally {
        inFlight.current = false;
      }
    },
    [settle],
  );

  const refresh = useCallback(() => run('refresh'), [run]);
  const retry = useCallback(() => run('load'), [run]);

  const setData = useCallback((next: T | null | ((prev: T | null) => T | null)) => {
    const resolved =
      typeof next === 'function' ? (next as (p: T | null) => T | null)(dataRef.current) : next;

    dataRef.current = resolved;
    hasData.current = resolved !== null && resolved !== undefined;
    setDataState(resolved);

    if (hasData.current) {
      setStatus(isEmptyRef.current(resolved as T) ? 'EMPTY' : 'SUCCESS');
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void run('load');
    // `run` is stable; `deps` is the caller's declared trigger list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  // OFFLINE is derived rather than stored: connectivity can change without any
  // request, and it must not overwrite a real ERROR the user still needs to see.
  const effectiveStatus: ApiStatus =
    isOffline && !hasData.current && status !== 'LOADING' && status !== 'REFRESHING' ? 'OFFLINE' : status;

  return {
    status: effectiveStatus,
    data,
    error,
    isRefreshing: status === 'REFRESHING',
    isBusy: status === 'LOADING' || status === 'REFRESHING',
    refresh,
    retry,
    setData,
  };
}
