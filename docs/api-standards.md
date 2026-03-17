# API Design Standards

## 1. URL Structure

```
https://api.example.com/v{version}/{resource}
```

- Use **kebab-case** for multi-word resources: `/user-profiles`
- Use **plural nouns** for collections: `/users`, not `/user`
- Nest related resources max 2 levels: `/users/{id}/orders`
- No verbs in URLs — use HTTP methods instead

## 2. HTTP Methods

| Method | Usage | Idempotent |
|--------|-------|------------|
| GET | Read resource(s) | Yes |
| POST | Create resource | No |
| PUT | Full replace | Yes |
| PATCH | Partial update | No |
| DELETE | Remove resource | Yes |

## 3. Status Codes

| Code | When |
|------|------|
| 200 | Successful read or update |
| 201 | Resource created |
| 204 | Successful delete (no body) |
| 400 | Validation error, malformed request |
| 401 | Missing or invalid auth |
| 403 | Valid auth, insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (duplicate, stale update) |
| 422 | Business logic rejection |
| 429 | Rate limited |
| 500 | Unexpected server error |

## 4. Error Format (RFC 7807)

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Request body contains invalid fields",
  "instance": "/v1/users",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

## 5. Pagination

### Cursor-based (recommended for large/dynamic datasets)
```
GET /v1/orders?cursor=abc123&limit=20
```

### Offset-based (simple, for small/static datasets)
```
GET /v1/products?page=2&limit=20
```

Response headers:
- `X-Total-Count`: Total items
- `X-Page`: Current page
- `X-Per-Page`: Items per page
- `X-Total-Pages`: Total pages

## 6. Versioning

- URL-based: `/v1/users`, `/v2/users`
- Deprecated versions return `Deprecation: true` header
- `Sunset` header indicates when a version will be removed
- Minimum 6-month deprecation window

## 7. Security

- All endpoints require authentication unless explicitly public
- Use Bearer JWT for user auth
- Use API keys for service-to-service auth
- Never expose internal IDs or stack traces in errors
- Rate limit all endpoints (100 req/min default)
