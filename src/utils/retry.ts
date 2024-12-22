interface RetryOptions {
  /** Maximum number of attempts before giving up */
  maxAttempts: number;
  /** Initial delay in milliseconds between retry attempts */
  initialDelay: number;
  /** Maximum delay in milliseconds between retry attempts */
  maxDelay: number;
}

/**
 * Executes an async operation with exponential backoff retry logic
 * @param operation - The async function to execute with retry logic
 * @param options - Retry configuration options
 * @returns Promise resolving to the operation result
 * @throws Last encountered error after all retry attempts fail
 * 
 * @example
 * const result = await withRetry(
 *   async () => await fetchData(),
 *   { maxAttempts: 3, initialDelay: 1000, maxDelay: 10000 }
 * );
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
  }
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === options.maxAttempts) {
        throw lastError;
      }
      
      // Calculate delay using exponential backoff with a maximum limit
      // Formula: min(initialDelay * 2^(attempt-1), maxDelay)
      const delay = Math.min(
        options.initialDelay * Math.pow(2, attempt - 1),
        options.maxDelay
      );
      
      console.trace(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached due to the throw above
  throw lastError;
} 