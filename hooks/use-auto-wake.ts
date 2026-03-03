import { useEffect, useState } from "react";
import { performAutoWake, quickHealthCheck } from "@/lib/auto-wake";

interface UseAutoWakeState {
  isReconnecting: boolean;
  hasCheckedHealth: boolean;
  serverIsHealthy: boolean;
}

/**
 * Hook that handles auto-wake logic on app startup
 * Checks if server is healthy, and if not, triggers wake-up with retry logic
 * 
 * Returns state that can be used to show a reconnection overlay
 */
export function useAutoWake() {
  const [state, setState] = useState<UseAutoWakeState>({
    isReconnecting: false,
    hasCheckedHealth: false,
    serverIsHealthy: true, // Assume healthy by default
  });

  useEffect(() => {
    let isMounted = true;

    async function checkAndWake() {
      try {
        // Quick check first
        const isHealthy = await quickHealthCheck();

        if (!isMounted) return;

        if (isHealthy) {
          // Server is already healthy
          setState({
            isReconnecting: false,
            hasCheckedHealth: true,
            serverIsHealthy: true,
          });
        } else {
          // Server is down, trigger auto-wake
          setState({
            isReconnecting: true,
            hasCheckedHealth: true,
            serverIsHealthy: false,
          });

          // Perform auto-wake with retries
          const result = await performAutoWake();

          if (!isMounted) return;

          setState({
            isReconnecting: false,
            hasCheckedHealth: true,
            serverIsHealthy: result.isHealthy,
          });
        }
      } catch (error) {
        if (!isMounted) return;
        // On error, assume server is healthy to avoid blocking the app
        setState({
          isReconnecting: false,
          hasCheckedHealth: true,
          serverIsHealthy: true,
        });
      }
    }

    checkAndWake();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
