# Quick Start Guide

Get the EDGE-MANIFEST worker running in 5 minutes.

## Prerequisites

- [Bun](https://bun.sh) installed (`bun --version`)
- Terminal access

## Steps

### 1. Install Dependencies

From the project root:

```bash
cd /home/engine/project  # or wherever you cloned the repo
bun install
```

### 2. Build Packages

```bash
bun run build
```

This builds all packages in the correct order (core first, then others).

### 3. Setup Environment

```bash
cd packages/@edge-manifest/starter

# Copy environment template
cp .dev.vars.example .dev.vars

# Edit .dev.vars if needed (optional - defaults work for local dev)
```

The default `.dev.vars` includes:
- `JWT_SECRET` - For authentication (auto-generated secure secret)

### 4. Start Dev Server

```bash
bun run dev
```

You should see:
```
⛅️ wrangler 4.x.x
Ready on http://localhost:7860
```

### 5. Test It Works

Open a new terminal and test:

```bash
# Health check
curl http://localhost:7860/health

# Expected: {"status":"ok"}
```

## What You Get

With the default configuration:
- ✅ HTTP server on http://localhost:7860
- ✅ Health endpoints: `/health`, `/ready`
- ✅ Auth endpoints: `/auth/login`, `/auth/refresh`
- ✅ Local D1 SQLite database (auto-created in `.wrangler/state/`)
- ✅ JWT authentication ready
- ✅ CRUD API endpoints (based on manifest)

## Next Steps

### Add a Manifest

The worker uses a default manifest. To use a custom one:

#### Option 1: Environment Variable

```bash
# In .dev.vars
EDGE_MANIFEST='{"id":"app","name":"My App","version":"1.0.0","entities":[]}'
```

#### Option 2: Use Example Config

```bash
# Copy an example manifest
cp ../../examples/config-example-1-todo.manifest.json manifest.json

# Load it when starting dev server
EDGE_MANIFEST="$(cat manifest.json)" bun run dev
```

#### Option 3: Update .dev.vars

```bash
# In .dev.vars, add:
EDGE_MANIFEST={"id":"todo-app","name":"Todo App","version":"1.0.0","entities":[...]}
```

### Test Authentication

```bash
# 1. Login
curl -X POST http://localhost:7860/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Response includes: {"token":"eyJ...","expiresIn":3600}

# 2. Use token for API requests
TOKEN="eyJhbGc..."  # from login response
curl http://localhost:7860/api/entity \
  -H "Authorization: Bearer $TOKEN"
```

### Use Example Configs

Try the pre-built examples:

```bash
# Todo App
cp ../../examples/config-example-1-todo.manifest.json manifest.json
EDGE_MANIFEST="$(cat manifest.json)" bun run dev

# Blog Platform
cp ../../examples/config-example-2-blog.manifest.json manifest.json
EDGE_MANIFEST="$(cat manifest.json)" bun run dev

# E-Commerce Store
cp ../../examples/config-example-3-ecommerce.manifest.json manifest.json
EDGE_MANIFEST="$(cat manifest.json)" bun run dev
```

## Troubleshooting

### Port 7860 already in use

Change the port in `wrangler.toml`:

```toml
[dev]
port = 8787  # or any other port
```

### Build errors

```bash
# Clean and rebuild
cd /home/engine/project
rm -rf packages/*/dist
bun run build
```

### Module not found

```bash
# Make sure dependencies are installed
bun install

# Rebuild all packages
bun run build
```

### Database errors

The local D1 database is auto-created in `.wrangler/state/v3/d1/`.

To reset:
```bash
rm -rf .wrangler/state
# Restart dev server
bun run dev
```

## Production Deployment

See [README.md](./README.md) for full deployment instructions.

Quick version:

```bash
# 1. Login to Cloudflare
bun x wrangler login

# 2. Create D1 database
bun x wrangler d1 create edge-manifest-db

# 3. Update wrangler.toml with database_id

# 4. Set secrets
bun x wrangler secret put JWT_SECRET

# 5. Deploy
bun x wrangler deploy
```

## Learn More

- Full documentation: [README.md](./README.md)
- Example configs: [../../examples/](../../examples/)
- Project docs: [../../README.md](../../README.md)
- Validation report: [../../.cto/PRODUCTION_VALIDATION_REPORT.md](../../.cto/PRODUCTION_VALIDATION_REPORT.md)
