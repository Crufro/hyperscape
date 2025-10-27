/**
 * Request deduplication utility
 * Prevents duplicate concurrent requests by sharing promises
 */

export interface DeduplicationStats {
  totalRequests: number
  deduplicated: number
  hitRate: number
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<unknown>>()
  private stats = {
    totalRequests: 0,
    deduplicated: 0
  }

  /**
   * Generate a cache key from request parameters
   */
  generateKey(url: string, method: string, body?: BodyInit | null): string {
    const bodyStr = body ? JSON.stringify(body) : ''
    return `${method}:${url}:${bodyStr}`
  }

  /**
   * Deduplicate a request by sharing the promise if an identical request is in flight
   * For Response objects, returns a clone to avoid body stream consumption issues
   */
  async deduplicate<T>(key: string, executor: () => Promise<T>): Promise<T> {
    this.stats.totalRequests++

    // Check if there's already a pending request with this key
    const existing = this.pendingRequests.get(key)
    if (existing) {
      this.stats.deduplicated++
      const result = await existing
      // If result is a Response, clone it to avoid body stream issues
      if (result instanceof Response) {
        return result.clone() as T
      }
      return result as T
    }

    // Execute the request and cache the promise
    const promise = executor()
    this.pendingRequests.set(key, promise)

    try {
      const result = await promise
      // If result is a Response, clone it to avoid body stream issues
      if (result instanceof Response) {
        return result.clone() as T
      }
      return result
    } finally {
      // Clean up after the request completes
      this.pendingRequests.delete(key)
    }
  }

  /**
   * Get deduplication statistics
   */
  getStats(): DeduplicationStats {
    return {
      totalRequests: this.stats.totalRequests,
      deduplicated: this.stats.deduplicated,
      hitRate: this.stats.totalRequests > 0
        ? Math.round((this.stats.deduplicated / this.stats.totalRequests) * 100)
        : 0
    }
  }

  /**
   * Reset statistics counters
   */
  resetStats(): void {
    this.stats.totalRequests = 0
    this.stats.deduplicated = 0
  }

  /**
   * Get count of currently pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size
  }
}

// Export a singleton instance
export const requestDeduplicator = new RequestDeduplicator()
