/**
 * Common API types for SmartMedi AI
 */

// Standard API response wrapper
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  timestamp?: string;
  metadata?: {
    count?: number;
    page?: number;
    totalPages?: number;
    totalCount?: number;
  };
}

// Error response type
export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: Record<string, any>;
}

// Pagination params
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

// Sorting params
export interface SortParams {
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// API request options that combine pagination and sorting
export interface RequestOptions extends PaginationParams, SortParams {
  filter?: Record<string, any>;
  include?: string[];
  fields?: string[];
}

// Cache control options
export enum CacheStrategy {
  DEFAULT = 'default',
  NO_CACHE = 'no-cache',
  FORCE_CACHE = 'force-cache',
  ONLY_IF_CACHED = 'only-if-cached',
  RELOAD = 'reload'
}

// API request status tracking
export enum RequestStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

// HTTP status codes with descriptions
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
} 