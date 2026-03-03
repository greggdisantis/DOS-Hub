/**
 * Auto-wake health check system
 * Automatically wakes up the backend server if it's hibernating
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:3000";
const HEALTH_CHECK_ENDPOINT = `${API_BASE_URL}/api/health`;

interface HealthCheckResult {
  isHealthy: boolean;
  attempts: number;
  totalTime: number;
}

/**
 * Check if the backend server is healthy
 */
async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(HEALTH_CHECK_ENDPOINT, {
      method: "GET",
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Trigger a wake-up request to the server
 * This is a simple GET request that forces the server to wake up
 */
async function triggerWakeUp(): Promise<void> {
  try {
    await fetch(HEALTH_CHECK_ENDPOINT, {
      method: "GET",
      timeout: 3000,
    });
  } catch (error) {
    // Expected to fail if server is still hibernating
    // The request itself triggers the wake-up process
  }
}

/**
 * Perform auto-wake with exponential backoff retry logic
 * Returns true if server became healthy, false if it remained down
 */
export async function performAutoWake(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  let attempts = 0;
  const maxAttempts = 12; // Up to ~30 seconds with exponential backoff
  let isHealthy = false;

  // First, trigger the wake-up
  await triggerWakeUp();

  // Then retry with exponential backoff
  for (attempts = 1; attempts <= maxAttempts; attempts++) {
    // Exponential backoff: 500ms, 1s, 2s, 4s, etc.
    const delayMs = Math.min(500 * Math.pow(2, attempts - 1), 5000);

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    // Check health
    if (await checkHealth()) {
      isHealthy = true;
      break;
    }
  }

  const totalTime = Date.now() - startTime;

  return {
    isHealthy,
    attempts,
    totalTime,
  };
}

/**
 * Quick health check without retry
 * Used to detect if server is already down
 */
export async function quickHealthCheck(): Promise<boolean> {
  return checkHealth();
}
