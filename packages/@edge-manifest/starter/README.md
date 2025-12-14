# @edge-manifest/starter

Cloudflare Worker template for EDGE-MANIFEST - a manifest-driven backend generator.

## Quick Start

### 1. Setup Environment

```bash
# Copy environment variables template
cp .dev.vars.example .dev.vars

# Edit .dev.vars with your configuration
# At minimum, set JWT_SECRET
```

### 2. Run Locally

```bash
# Install dependencies (from project root)
bun install

# Build packages
bun run build

# Start development server
cd packages/@edge-manifest/starter
bun run dev
```

The server will start at `http://localhost:7860`

### 3. Test API

```bash
# Health check
curl http://localhost:7860/health

# Ready check
curl http://localhost:7860/ready

# Login (returns JWT token)
curl -X POST http://localhost:7860/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Use token for authenticated requests
TOKEN="your-token-here"
curl http://localhost:7860/api/entity \
  -H "Authorization: Bearer $TOKEN"
```

## Configuration

### Environment Variables

Set in `.dev.vars` for local development or as Cloudflare Worker environment variables for production:

- `JWT_SECRET` - Secret key for JWT token generation (required)
- `EDGE_MANIFEST` or `MANIFEST` - JSON string of manifest configuration (optional)

### Manifest Configuration

You can configure the manifest in three ways:

#### 1. Environment Variable

```bash
# In .dev.vars
EDGE_MANIFEST='{"id":"app","name":"My App","version":"1.0.0","entities":[...]}'
```

#### 2. Manifest File

```bash
# Copy an example manifest
cp ../../examples/config-example-1-todo.manifest.json manifest.json

# Load it in your code or via environment
EDGE_MANIFEST="$(cat manifest.json)" bun run dev
```

#### 3. Default Manifest

If no manifest is provided, a default health-check-only manifest is used.

## Cloudflare Bindings

The worker supports the following Cloudflare bindings (configure in `wrangler.toml`):

### D1 Database (Enabled by default)

```toml
[[d1_databases]]
binding = "DB"
database_name = "edge-manifest-db"
database_id = "local-db-id"
```

**Local Development:**
- Wrangler automatically creates a local SQLite database in `.wrangler/state/v3/d1/`
- No setup required for local development

**Production:**
```bash
# Create D1 database
wrangler d1 create edge-manifest-db

# Update wrangler.toml with the database_id from output
# Deploy worker
wrangler deploy
```

### KV Namespace (Optional)

For key-value storage, uncomment in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "KV"
id = "your-kv-namespace-id"
```

**Setup:**
```bash
# Create KV namespace
wrangler kv:namespace create "KV"

# Create preview namespace for dev
wrangler kv:namespace create "KV" --preview
```

### R2 Bucket (Optional)

For object storage, uncomment in `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "R2"
bucket_name = "edge-manifest-bucket"
```

**Setup:**
```bash
# Create R2 bucket
wrangler r2 bucket create edge-manifest-bucket
```

### Other Bindings

See `wrangler.toml` for templates for:
- Durable Objects
- AI (Cloudflare AI)
- Analytics Engine
- Queues
- Hyperdrive
- Vectorize
- Browser Rendering
- Service Bindings

## Development Workflow

### Local Development

```bash
# Start dev server with hot reload
bun run dev

# View logs in terminal
# Database stored in .wrangler/state/v3/d1/
```

### Testing

```bash
# Run unit tests
bun run test

# Run tests with coverage
bun test --coverage

# Type check
bun run typecheck
```

### Building

```bash
# Build TypeScript
bun run build

# Output in dist/
```

## Deployment

### Prerequisites

1. Cloudflare account
2. Wrangler CLI installed
3. Authenticated with Cloudflare (`wrangler login`)

### Deploy Steps

```bash
# 1. Create D1 database (if not exists)
wrangler d1 create edge-manifest-db

# 2. Update wrangler.toml with database_id

# 3. Set production secrets
wrangler secret put JWT_SECRET
# Enter a strong secret when prompted

# 4. (Optional) Set manifest as secret or variable
wrangler secret put EDGE_MANIFEST
# Or use [vars] in wrangler.toml

# 5. Deploy
wrangler deploy
```

### Production Configuration

```toml
# wrangler.toml for production

name = "edge-manifest-worker"
main = "src/index.ts"
compatibility_date = "2025-12-13"

[[d1_databases]]
binding = "DB"
database_name = "edge-manifest-db"
database_id = "your-actual-database-id"

[vars]
# Non-secret config can go here
# SOME_PUBLIC_CONFIG = "value"
```

Set secrets via CLI (not in wrangler.toml):
```bash
wrangler secret put JWT_SECRET
wrangler secret put EDGE_MANIFEST  # if needed
```

## Project Structure

```
packages/@edge-manifest/starter/
├── src/
│   ├── app.ts           # Main application setup
│   ├── auth.ts          # JWT authentication
│   ├── crud.ts          # CRUD operations helper
│   ├── routes.ts        # Dynamic route registration
│   ├── schema.ts        # Database schema
│   ├── validators.ts    # Input validation
│   ├── index.ts         # Worker entry point
│   └── types/           # TypeScript types
│       ├── bindings.ts  # Cloudflare bindings types
│       └── index.ts     # Type exports
├── tests/               # Unit tests
├── wrangler.toml        # Cloudflare Worker config
├── .dev.vars.example    # Environment variables template
├── package.json         # Package configuration
└── README.md           # This file
```

## API Reference

### Authentication

**POST /auth/login**
```bash
curl -X POST http://localhost:7860/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Response:
# {"token":"eyJ...","expiresIn":3600}
```

**POST /auth/refresh**
```bash
curl -X POST http://localhost:7860/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"token":"eyJ..."}'

# Response:
# {"token":"eyJ...","expiresIn":3600}
```

### Health Checks

**GET /health**
```bash
curl http://localhost:7860/health
# {"status":"ok"}
```

**GET /ready**
```bash
curl http://localhost:7860/ready
# {"status":"ready"} or {"status":"not_ready","error":"..."}
```

### CRUD Endpoints

Dynamic CRUD endpoints are generated based on your manifest entities:

**POST /api/{EntityName}** - Create
**GET /api/{EntityName}** - List (with pagination)
**GET /api/{EntityName}/:id** - Get by ID
**PUT /api/{EntityName}/:id** - Full update
**PATCH /api/{EntityName}/:id** - Partial update
**DELETE /api/{EntityName}/:id** - Delete

All CRUD endpoints require JWT authentication via `Authorization: Bearer <token>` header.

## Troubleshooting

### Port already in use

```bash
# Change port in wrangler.toml
[dev]
port = 8787  # or any other available port
```

### D1 database not found

```bash
# For local dev, wrangler creates it automatically
# For production, create with:
wrangler d1 create edge-manifest-db
```

### Module not found errors

```bash
# Rebuild packages
cd ../.. # to project root
bun run build
```

### Authentication not working

1. Check JWT_SECRET is set in .dev.vars
2. Verify token is valid and not expired
3. Check Authorization header format: `Bearer <token>`

### Manifest validation errors

1. Verify manifest JSON is valid
2. Check manifest schema matches EdgeManifest type
3. Use example manifests from `examples/` folder

## Examples

See the `examples/` folder in the project root for sample manifest configurations:

- `config-example-1-todo.manifest.json` - Todo app
- `config-example-2-blog.manifest.json` - Blog platform
- `config-example-3-ecommerce.manifest.json` - E-commerce store

## Learn More

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [EDGE-MANIFEST Docs](../../README.md)

## Support

For issues and questions:
- Check project documentation
- Review examples in `examples/` folder
- See validation reports in `.cto/` folder
