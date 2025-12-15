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

1. **Copy an example manifest into the repo root:**
   ```bash
   cp examples/config-example-1-todo.manifest.json manifest.json
   ```

2. **Generate artifacts and start the dev server:**
   ```bash
   pnpm generate
   pnpm dev
   ```

3. **Test the API:**
   ```bash
   # Health check
   curl http://127.0.0.1:8787/api/health

   # Create an entity (routes are lowercased + pluralized)
   curl -X POST http://127.0.0.1:8787/api/todolists \
     -H "Content-Type: application/json" \
     -d '{"title":"My First List","description":"Getting started"}'
   ```

### Using Different Examples

Simply copy a different example to test:

```bash
# Test Blog example
cp examples/config-example-2-blog.manifest.json manifest.json
pnpm generate && pnpm dev

# Test E-commerce example
cp examples/config-example-3-ecommerce.manifest.json manifest.json
pnpm generate && pnpm dev
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
