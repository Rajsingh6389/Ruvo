import { useSyncExternalStore } from 'react';

type Listener = () => void;

let offline = false;
let consecutiveFailures = 0;
const listeners = new Set<Listener>();

/** One failed request is not an outage; two in a row is worth surfacing. */
const FAILURE_THRESHOLD = 2;

const emit = () => {
  listeners.forEach(listener => listener());
};

const setOffline = (next: boolean) => {
  if (offline === next) return;
  offline = next;
  emit();
};

/**
 * Report a request that failed at the transport layer -- no response arrived at
 * all (DNS failure, connection refused, no route to host).
 *
 * An HTTP 4xx or 5xx is NOT a network failure: the server answered, so it must
 * surface as an ERROR state on the screen, never as "you're offline".
 */
export const reportNetworkFailure = () => {
  consecutiveFailures += 1;
  if (consecutiveFailures >= FAILURE_THRESHOLD) setOffline(true);
};

/** Report any request that came back with a response, whatever its status. */
export const reportNetworkSuccess = () => {
  consecutiveFailures = 0;
  setOffline(false);
};

let monitorInstalled = false;

/**
 * Wrap the global `fetch` once so every existing call site reports its transport
 * outcome without being rewritten individually. Call this once, from App.tsx,
 * before the first render.
 *
 * A deliberate abort is treated as neither success nor failure: request
 * cancellation is not evidence of an outage, and a real loss of connectivity
 * throws its own error here regardless. Requests made through axios (currently
 * only shop image upload) bypass this wrapper, since axios uses XHR on RN.
 */
export const installNetworkMonitor = () => {
  if (monitorInstalled) return;
  monitorInstalled = true;

  // Reached through globalThis rather than `global` so this compiles the same
  // way whether or not the app pulls in Node's ambient types.
  const scope = globalThis as unknown as { fetch: typeof fetch };
  const originalFetch = scope.fetch;
  if (typeof originalFetch !== 'function') return;

  scope.fetch = async (...args: Parameters<typeof originalFetch>) => {
    try {
      const response = await originalFetch(...args);
      reportNetworkSuccess();
      return response;
    } catch (error: any) {
      if (error?.name !== 'AbortError') reportNetworkFailure();
      throw error;
    }
  };
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => offline;

/**
 * App-wide connectivity, derived from real request outcomes rather than a
 * background poll -- so it costs no battery and cannot claim an outage while
 * requests are in fact succeeding.
 *
 * If link-level detection is ever needed (aeroplane mode with no request in
 * flight), swap the store for `@react-native-community/netinfo` behind this
 * same hook signature.
 */
export const useNetworkStatus = (): { isOffline: boolean } => {
  const isOffline = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { isOffline };
};
