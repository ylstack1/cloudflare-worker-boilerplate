# EDGE-MANIFEST Example Configurations

This directory contains example manifest configurations that demonstrate the capabilities of EDGE-MANIFEST for different application types.

## Examples

### 1. Todo App (`config-example-1-todo.manifest.json`)
A simple todo list application with two entities:
- **TodoList**: Main list container
- **Todo**: Individual todo items linked to lists

**Features demonstrated:**
- Basic CRUD operations
- Foreign key relationships (Todo → TodoList)
- Boolean fields with defaults
- Optional date fields

### 2. Blog Platform (`config-example-2-blog.manifest.json`)
A blogging platform with authors, posts, and comments:
- **Author**: User accounts with unique emails
- **Post**: Blog posts by authors
- **Comment**: Comments on posts by authors

**Features demonstrated:**
- Multiple entity relationships
- Unique constraints (email, slug)
- Boolean flags (published, approved)
- Optional timestamps (publishedAt)

### 3. E-Commerce Store (`config-example-3-ecommerce.manifest.json`)
An e-commerce platform with stores, products, customers, and orders:
- **Store**: Store information with unique slug
- **Product**: Products belonging to stores
- **Customer**: Customer accounts
- **Order**: Customer orders from stores

**Features demonstrated:**
- Complex multi-entity relationships
- Numeric fields (price, stock, total)
- String status fields
- Scalability (designed for 100+ products)

## Testing These Examples

### Quick Start

1. **Copy manifest to starter package:**
   ```bash
   cp examples/config-example-1-todo.manifest.json packages/@edge-manifest/starter/manifest.json
   ```

2. **Start dev server:**
   ```bash
   cd packages/@edge-manifest/starter
   EDGE_MANIFEST="$(cat manifest.json)" bun run dev
   ```

3. **Test the API:**
   ```bash
   # Health check
   curl http://localhost:7860/health
   
   # Login
   curl -X POST http://localhost:7860/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   
   # Create entity (use token from login)
   curl -X POST http://localhost:7860/api/TodoList \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"title":"My First List","description":"Getting started"}'
   ```

### Using Different Examples

Simply copy a different example to test:

```bash
# Test Blog example
cp examples/config-example-2-blog.manifest.json packages/@edge-manifest/starter/manifest.json
cd packages/@edge-manifest/starter && bun run dev

# Test E-commerce example
cp examples/config-example-3-ecommerce.manifest.json packages/@edge-manifest/starter/manifest.json
cd packages/@edge-manifest/starter && bun run dev
```

## Validation

All examples have been validated to:
- ✅ Be valid JSON
- ✅ Conform to EDGE-MANIFEST schema
- ✅ Generate valid TypeScript types
- ✅ Generate valid Drizzle ORM schemas
- ✅ Generate working CRUD API endpoints
- ✅ Support proper validation and error handling

## Next Steps

After testing these examples, you can:
1. Create your own custom manifest
2. Deploy to Cloudflare Workers
3. Extend with custom generators
4. Add custom API logic
5. Integrate with frontend frameworks
