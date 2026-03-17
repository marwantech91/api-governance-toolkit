# API Governance Toolkit

![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-6BA539?style=flat-square&logo=openapiinitiative)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)

Enterprise API governance framework — enforces consistent API design standards across teams. Includes linting rules, middleware, OpenAPI templates, and versioning strategy.

## Components

| Component | Description |
|-----------|-------------|
| `rules/` | Spectral-compatible linting rules for OpenAPI specs |
| `middleware/` | Express middleware for runtime API governance |
| `templates/` | OpenAPI 3.1 templates for common patterns |
| `docs/` | API design guidelines and standards |
| `examples/` | Example APIs that follow the standards |

## API Design Standards

1. **Naming**: `kebab-case` URLs, `camelCase` JSON fields
2. **Versioning**: URL-based (`/v1/`, `/v2/`) with sunset headers
3. **Pagination**: Cursor-based for large collections, offset for small
4. **Errors**: RFC 7807 Problem Details format
5. **Auth**: Bearer JWT, API keys for service-to-service
6. **Rate Limiting**: Standard headers (`X-RateLimit-*`)

## Quick Start

```bash
# Lint an OpenAPI spec
npx spectral lint api.yaml --ruleset rules/spectral.yaml

# Use middleware in Express
import { apiGovernance } from '@marwantech/api-governance-toolkit';
app.use(apiGovernance({ versioning: true, problemDetails: true }));
```

## License

MIT
