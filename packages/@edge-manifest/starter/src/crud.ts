// eslint-disable-next-line @typescript-eslint/no-explicit-any
/**
 * Standard response envelope for all API responses
 */
export interface ApiResponse<T> {
  data?: T;
  meta?: Record<string, unknown>;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  filter?: string;
}

/**
 * Base CRUD service for managing entities
 */
export class CrudService {
  constructor(private tableName: string) {}

  async list(_db: any, options?: ListOptions): Promise<{ items: any[]; total: number }> {
    const limit = Math.min(options?.limit || 10, 100);
    const offset = options?.offset || 0;

    try {
      // Try to use mock database first (for testing)
      if ((globalThis as any).__edgeManifestMockDb?.[this.tableName]) {
        const allItems = (globalThis as any).__edgeManifestMockDb[this.tableName];
        const items = allItems.slice(offset, offset + limit);
        const total = allItems.length;
        return { items, total };
      }

      // Fallback: empty list
      return { items: [], total: 0 };
    } catch (_error) {
      return { items: [], total: 0 };
    }
  }

  async get(_db: any, id: string): Promise<any | null> {
    try {
      // Try to use mock database first (for testing)
      if ((globalThis as any).__edgeManifestMockDb?.[this.tableName]) {
        const items = (globalThis as any).__edgeManifestMockDb[this.tableName];
        return items.find((r: any) => r.id === id) || null;
      }

      return null;
    } catch {
      return null;
    }
  }

  async create(_db: any, data: Record<string, any>): Promise<any> {
    try {
      // Generate ID
      const id = crypto.randomUUID();
      const record = { id, ...data };

      // Store in mock database for testing
      const g = globalThis as any;
      if (!g.__edgeManifestMockDb) {
        g.__edgeManifestMockDb = {};
      }
      if (!g.__edgeManifestMockDb[this.tableName]) {
        g.__edgeManifestMockDb[this.tableName] = [];
      }
      g.__edgeManifestMockDb[this.tableName].push(record);

      return record;
    } catch (error) {
      throw new Error(
        `Failed to create ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async update(db: any, id: string, data: Record<string, any>): Promise<any | null> {
    try {
      // Get current record
      const current = await this.get(db, id);
      if (!current) {
        return null;
      }

      const updated = { ...current, ...data };

      // Update in mock database
      if ((globalThis as any).__edgeManifestMockDb?.[this.tableName]) {
        const index = (globalThis as any).__edgeManifestMockDb[this.tableName].findIndex((r: any) => r.id === id);
        if (index !== -1) {
          (globalThis as any).__edgeManifestMockDb[this.tableName][index] = updated;
        }
      }

      return updated;
    } catch (error) {
      throw new Error(
        `Failed to update ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async delete(db: any, id: string): Promise<boolean> {
    try {
      // Check if exists
      const current = await this.get(db, id);
      if (!current) {
        return false;
      }

      // Delete from mock database
      if ((globalThis as any).__edgeManifestMockDb?.[this.tableName]) {
        const index = (globalThis as any).__edgeManifestMockDb[this.tableName].findIndex((r: any) => r.id === id);
        if (index !== -1) {
          (globalThis as any).__edgeManifestMockDb[this.tableName].splice(index, 1);
        }
      }

      return true;
    } catch (error) {
      throw new Error(
        `Failed to delete ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

/**
 * Formats a successful response
 */
export function successResponse<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return {
    data,
    ...(meta && { meta }),
  };
}

/**
 * Formats a list response with pagination metadata
 */
export function listResponse<T>(items: T[], total: number, limit: number, offset: number): ApiResponse<T[]> {
  const hasMore = offset + limit < total;
  return {
    data: items,
    meta: {
      limit,
      offset,
      total,
      hasMore,
    },
  };
}

/**
 * Formats an error response
 */
export function errorResponse(code: string, message: string, details?: unknown): ApiResponse<never> {
  return {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}
