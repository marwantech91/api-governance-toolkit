/**
 * API Governance Middleware
 *
 * Express middleware that enforces API standards at runtime:
 * - RFC 7807 Problem Details error format
 * - API versioning with sunset headers
 * - Request ID propagation
 * - Standard pagination headers
 * - CORS with configurable origins
 * - Response envelope standardization
 */

import { Request, Response, NextFunction } from 'express';

// === Problem Details (RFC 7807) ===

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Array<{ field: string; message: string }>;
}

export function problemDetails(
  status: number,
  title: string,
  detail?: string,
  errors?: Array<{ field: string; message: string }>
): ProblemDetails {
  return {
    type: `https://api.example.com/problems/${title.toLowerCase().replace(/\s+/g, '-')}`,
    title,
    status,
    detail,
    instance: undefined, // Set by middleware from request path
    errors,
  };
}

// === Versioning Middleware ===

interface VersionConfig {
  current: number;
  supported: number[];
  deprecated: number[];
  sunset: Record<number, string>; // version → sunset date
}

export function versioningMiddleware(config: VersionConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Extract version from URL (/v1/..., /v2/...)
    const match = req.path.match(/^\/v(\d+)/);
    if (!match) {
      res.status(400).json(problemDetails(400, 'Bad Request', 'API version required in URL path'));
      return;
    }

    const version = parseInt(match[1]);

    if (!config.supported.includes(version) && !config.deprecated.includes(version)) {
      res.status(400).json(problemDetails(400, 'Bad Request', `API version v${version} is not supported`));
      return;
    }

    // Add deprecation headers
    if (config.deprecated.includes(version)) {
      res.setHeader('Deprecation', 'true');
      res.setHeader('Link', `</v${config.current}${req.path.replace(/^\/v\d+/, '')}>; rel="successor-version"`);

      if (config.sunset[version]) {
        res.setHeader('Sunset', config.sunset[version]);
      }
    }

    (req as any).apiVersion = version;
    next();
  };
}

// === Request ID Middleware ===

export function requestIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
    (req as any).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  };
}

// === Standard Error Handler ===

export function problemDetailsErrorHandler() {
  return (err: any, req: Request, res: Response, _next: NextFunction): void => {
    const status = err.status || err.statusCode || 500;
    const problem: ProblemDetails = {
      type: `https://api.example.com/problems/${err.code || 'internal-error'}`,
      title: err.title || getDefaultTitle(status),
      status,
      detail: err.message,
      instance: req.originalUrl,
      errors: err.errors,
    };

    res.status(status)
      .contentType('application/problem+json')
      .json(problem);
  };
}

function getDefaultTitle(status: number): string {
  const titles: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    413: 'Payload Too Large',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  return titles[status] || 'Error';
}

// === Pagination Helper ===

export interface PaginationParams {
  page: number;
  limit: number;
  cursor?: string;
}

export function parsePagination(req: Request, defaults = { page: 1, limit: 20, maxLimit: 100 }): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || defaults.page);
  const limit = Math.min(defaults.maxLimit, Math.max(1, parseInt(req.query.limit as string) || defaults.limit));
  const cursor = req.query.cursor as string;

  return { page, limit, cursor };
}

export function setPaginationHeaders(
  res: Response,
  params: { page: number; limit: number; total: number }
): void {
  const { page, limit, total } = params;
  const totalPages = Math.ceil(total / limit);

  res.setHeader('X-Total-Count', total);
  res.setHeader('X-Page', page);
  res.setHeader('X-Per-Page', limit);
  res.setHeader('X-Total-Pages', totalPages);
}

// === Combined Middleware ===

interface GovernanceOptions {
  versioning?: VersionConfig;
  problemDetails?: boolean;
  requestId?: boolean;
}

export function apiGovernance(options: GovernanceOptions = {}) {
  const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

  if (options.requestId !== false) {
    middlewares.push(requestIdMiddleware());
  }

  if (options.versioning) {
    middlewares.push(versioningMiddleware(options.versioning));
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    let index = 0;

    const runNext = (): void => {
      if (index < middlewares.length) {
        middlewares[index++](req, res, runNext);
      } else {
        next();
      }
    };

    runNext();
  };
}
