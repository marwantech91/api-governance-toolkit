import {
  problemDetails,
  parsePagination,
  setPaginationHeaders,
  versioningMiddleware,
  requestIdMiddleware,
} from '../src/index';

describe('problemDetails', () => {
  it('creates RFC 7807 compliant error', () => {
    const problem = problemDetails(404, 'Not Found', 'Resource does not exist');

    expect(problem.status).toBe(404);
    expect(problem.title).toBe('Not Found');
    expect(problem.detail).toBe('Resource does not exist');
    expect(problem.type).toContain('not-found');
  });

  it('includes validation errors when provided', () => {
    const errors = [{ field: 'email', message: 'Invalid email format' }];
    const problem = problemDetails(422, 'Validation Error', 'Invalid input', errors);

    expect(problem.errors).toHaveLength(1);
    expect(problem.errors![0].field).toBe('email');
  });
});

describe('parsePagination', () => {
  const mockReq = (query: Record<string, string>) => ({ query } as any);

  it('uses defaults when no params provided', () => {
    const result = parsePagination(mockReq({}));
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('parses page and limit from query', () => {
    const result = parsePagination(mockReq({ page: '3', limit: '50' }));
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('clamps limit to maxLimit', () => {
    const result = parsePagination(mockReq({ limit: '500' }));
    expect(result.limit).toBe(100);
  });

  it('enforces minimum page of 1', () => {
    const result = parsePagination(mockReq({ page: '-5' }));
    expect(result.page).toBe(1);
  });
});

describe('setPaginationHeaders', () => {
  it('sets correct pagination headers', () => {
    const headers: Record<string, string> = {};
    const res = { setHeader: (k: string, v: any) => { headers[k] = String(v); } } as any;

    setPaginationHeaders(res, { page: 2, limit: 10, total: 55 });

    expect(headers['X-Total-Count']).toBe('55');
    expect(headers['X-Page']).toBe('2');
    expect(headers['X-Per-Page']).toBe('10');
    expect(headers['X-Total-Pages']).toBe('6');
    expect(headers['X-Has-Previous']).toBe('true');
    expect(headers['X-Has-Next']).toBe('true');
  });
});

describe('versioningMiddleware', () => {
  const config = {
    current: 2,
    supported: [2],
    deprecated: [1],
    sunset: { 1: '2026-06-01' },
  };

  const createMocks = (path: string) => {
    const req = { path } as any;
    const headers: Record<string, string> = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: (k: string, v: string) => { headers[k] = v; },
      _headers: headers,
    } as any;
    const next = jest.fn();
    return { req, res, next };
  };

  it('passes through supported versions', () => {
    const { req, res, next } = createMocks('/v2/users');
    versioningMiddleware(config)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.apiVersion).toBe(2);
  });

  it('rejects unversioned paths', () => {
    const { req, res, next } = createMocks('/users');
    versioningMiddleware(config)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('adds deprecation headers for deprecated versions', () => {
    const { req, res, next } = createMocks('/v1/users');
    versioningMiddleware(config)(req, res, next);
    expect(res._headers['Deprecation']).toBe('true');
    expect(res._headers['Sunset']).toBe('2026-06-01');
  });
});

describe('requestIdMiddleware', () => {
  it('generates request ID when not provided', () => {
    const headers: Record<string, string> = {};
    const req = { headers: {} } as any;
    const res = { setHeader: (k: string, v: string) => { headers[k] = v; } } as any;
    const next = jest.fn();

    requestIdMiddleware()(req, res, next);

    expect(headers['X-Request-Id']).toBeDefined();
    expect(req.requestId).toBeDefined();
    expect(next).toHaveBeenCalled();
  });

  it('uses existing request ID from header', () => {
    const headers: Record<string, string> = {};
    const req = { headers: { 'x-request-id': 'custom-123' } } as any;
    const res = { setHeader: (k: string, v: string) => { headers[k] = v; } } as any;
    const next = jest.fn();

    requestIdMiddleware()(req, res, next);

    expect(headers['X-Request-Id']).toBe('custom-123');
  });
});
