import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { withRetry } from '../utils/retry';

describe('withRetry', () => {
  // Mock console.trace to avoid cluttering test output
  beforeEach(() => {
    vi.spyOn(console, 'trace').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Mock timer functions
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should succeed on first attempt if operation succeeds', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    
    const result = await withRetry(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed on second attempt', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce('success');
    
    const resultPromise = withRetry(operation, {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
    });
    
    // Fast-forward through the delay
    await vi.runAllTimersAsync();
    
    const result = await resultPromise;
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should respect maxAttempts and throw after all attempts fail', async () => {
    const error = new Error('Persistent failure');
    const operation = vi.fn().mockRejectedValue(error);
    
    const resultPromise = withRetry(operation, {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
    });
    
    // Fast-forward through all delays
    await vi.runAllTimersAsync();
    
    await expect(resultPromise).rejects.toThrow('Persistent failure');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should implement exponential backoff', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Failure'))
      .mockRejectedValueOnce(new Error('Failure'))
      .mockRejectedValueOnce(new Error('Failure'));
    
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    
    const resultPromise = withRetry(operation, {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
    });
    
    // Fast-forward through all delays
    await vi.runAllTimersAsync();
    
    await expect(resultPromise).rejects.toThrow('Failure');
    
    // Check that setTimeout was called with exponentially increasing delays
    expect(setTimeoutSpy).toHaveBeenCalledTimes(2); // 2 retries
    expect(setTimeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 1000); // 1st retry
    expect(setTimeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 2000); // 2nd retry
  });

  it('should respect maxDelay limit', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Failure'));
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    
    const resultPromise = withRetry(operation, {
      maxAttempts: 3,
      initialDelay: 5000,
      maxDelay: 8000,
    });
    
    // Fast-forward through all delays
    await vi.runAllTimersAsync();
    
    await expect(resultPromise).rejects.toThrow('Failure');
    
    // Second retry should be capped at maxDelay
    expect(setTimeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 5000); // 1st retry
    expect(setTimeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 8000); // 2nd retry (capped)
  });

  it('should use default options if none provided', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Failure'));
    
    const resultPromise = withRetry(operation);
    
    // Fast-forward through all delays
    await vi.runAllTimersAsync();
    
    await expect(resultPromise).rejects.toThrow('Failure');
    expect(operation).toHaveBeenCalledTimes(3); // default maxAttempts
  });

  it('should convert non-Error throws to Error objects', async () => {
    const operation = vi.fn().mockRejectedValue('string error');
    
    const resultPromise = withRetry(operation, {
      maxAttempts: 1,
      initialDelay: 1000,
      maxDelay: 10000,
    });
    
    await expect(resultPromise).rejects.toBeInstanceOf(Error);
    await expect(resultPromise).rejects.toThrow('string error');
  });
}); 