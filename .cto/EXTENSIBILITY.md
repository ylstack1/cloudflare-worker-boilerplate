# EXTENSIBILITY GUIDE

**Version:** 1.0.0  
**Last Updated:** 2025-12-13  
**Package:** @edge-manifest/generators

## OVERVIEW

EDGE-MANIFEST's generator system is designed to be fully extensible. Users can create custom generators to support any framework, database, UI library, or custom use case without modifying the core system.

## PLUGIN SYSTEM ARCHITECTURE

### Core Concepts

1. **Generator Plugin Interface** - A standard interface all generators must implement
2. **Registry** - A global registry that manages all registered generators
3. **Lifecycle** - Register → Validate → Generate → Output

### Plugin Interface

```typescript
export interface GeneratorPlugin {
  name: string;                    // Unique identifier for the generator
  description?: string;            // Optional description
  outputPath: string;              // Where the generated code should be written
  validate?(manifest: EdgeManifest): boolean;  // Optional validation
  generate(manifest: EdgeManifest, options?: Record<string, unknown>): Promise<string | Record<string, string>>;
}
```

## CREATING A CUSTOM GENERATOR

### Step 1: Define Your Generator

```typescript
import type { GeneratorPlugin, EdgeManifest } from '@edge-manifest/generators';

const myGenerator: GeneratorPlugin = {
  name: 'my-custom-generator',
  description: 'Generates custom code for my use case',
  outputPath: 'output/my-code.ts',
  
  // Optional: Validate manifest before generation
  validate(manifest: EdgeManifest): boolean {
    // Return false to skip generation
    return manifest.entities.length > 0;
  },
  
  // Required: Generate code from manifest
  async generate(manifest: EdgeManifest, options?: Record<string, unknown>): Promise<string> {
    let code = '// Generated Code\n\n';
    
    for (const entity of manifest.entities) {
      code += `export class ${entity.name} {\n`;
      
      for (const field of entity.fields) {
        code += `  ${field.name}: ${mapFieldType(field.kind)};\n`;
      }
      
      code += '}\n\n';
    }
    
    return code;
  }
};

function mapFieldType(kind: string): string {
  switch (kind) {
    case 'string': return 'string';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    default: return 'any';
  }
}
```

### Step 2: Register Your Generator

```typescript
import { registerGenerator } from '@edge-manifest/generators';

registerGenerator(myGenerator);
```

### Step 3: Run Your Generator

```typescript
import { runGenerator } from '@edge-manifest/generators';
import manifest from './manifest.json';

const output = await runGenerator('my-custom-generator', manifest);
console.log(output);
```

## REAL-WORLD EXAMPLES

### Example 1: GraphQL Schema Generator

```typescript
const graphqlGenerator: GeneratorPlugin = {
  name: 'graphql-schema',
  description: 'Generates GraphQL schema from manifest',
  outputPath: 'schema.graphql',
  
  async generate(manifest: EdgeManifest): Promise<string> {
    let schema = '';
    
    for (const entity of manifest.entities) {
      schema += `type ${entity.name} {\n`;
      
      for (const field of entity.fields) {
        if (field.kind === 'relation') continue;
        
        const gqlType = mapToGraphQLType(field);
        const required = field.required ? '!' : '';
        schema += `  ${field.name}: ${gqlType}${required}\n`;
      }
      
      schema += '}\n\n';
    }
    
    return schema;
  }
};

function mapToGraphQLType(field: ManifestField): string {
  switch (field.kind) {
    case 'id':
    case 'uuid':
      return 'ID';
    case 'string':
      return 'String';
    case 'number':
      return 'Float';
    case 'boolean':
      return 'Boolean';
    case 'date':
      return 'DateTime';
    default:
      return 'String';
  }
}
```

### Example 2: Prisma Schema Generator

```typescript
const prismaGenerator: GeneratorPlugin = {
  name: 'prisma-schema',
  description: 'Generates Prisma schema from manifest',
  outputPath: 'prisma/schema.prisma',
  
  async generate(manifest: EdgeManifest): Promise<string> {
    let schema = `// Prisma schema generated from EDGE-MANIFEST\n\n`;
    schema += `datasource db {\n  provider = "sqlite"\n  url = env("DATABASE_URL")\n}\n\n`;
    schema += `generator client {\n  provider = "prisma-client-js"\n}\n\n`;
    
    for (const entity of manifest.entities) {
      schema += `model ${entity.name} {\n`;
      
      for (const field of entity.fields) {
        if (field.kind === 'relation') continue;
        
        const prismaType = mapToPrismaType(field);
        const required = field.required ? '' : '?';
        const unique = field.unique ? ' @unique' : '';
        const id = field.kind === 'id' ? ' @id @default(uuid())' : '';
        
        schema += `  ${field.name} ${prismaType}${required}${id}${unique}\n`;
      }
      
      schema += `  createdAt DateTime @default(now())\n`;
      schema += `  updatedAt DateTime @updatedAt\n`;
      schema += `}\n\n`;
    }
    
    return schema;
  }
};

function mapToPrismaType(field: ManifestField): string {
  switch (field.kind) {
    case 'id':
    case 'uuid':
    case 'string':
      return 'String';
    case 'number':
      return 'Float';
    case 'boolean':
      return 'Boolean';
    case 'date':
      return 'DateTime';
    case 'json':
      return 'Json';
    default:
      return 'String';
  }
}
```

### Example 3: React Admin Generator

```typescript
const reactAdminGenerator: GeneratorPlugin = {
  name: 'react-admin',
  description: 'Generates React Admin components',
  outputPath: 'src/admin',
  
  async generate(manifest: EdgeManifest): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    
    for (const entity of manifest.entities) {
      const entityLower = entity.name.toLowerCase();
      
      // Generate list component
      files[`${entityLower}/List.tsx`] = generateListComponent(entity);
      
      // Generate create component
      files[`${entityLower}/Create.tsx`] = generateCreateComponent(entity);
      
      // Generate edit component
      files[`${entityLower}/Edit.tsx`] = generateEditComponent(entity);
    }
    
    return files;
  }
};

function generateListComponent(entity: ManifestEntity): string {
  const entityName = entity.name;
  const fields = entity.fields
    .filter(f => f.kind !== 'relation')
    .slice(0, 5);
  
  return `import { List, Datagrid, TextField } from 'react-admin';

export const ${entityName}List = () => (
  <List>
    <Datagrid>
      ${fields.map(f => `<TextField source="${f.name}" />`).join('\n      ')}
    </Datagrid>
  </List>
);`;
}

function generateCreateComponent(entity: ManifestEntity): string {
  const entityName = entity.name;
  const fields = entity.fields
    .filter(f => f.kind !== 'relation' && f.kind !== 'id');
  
  return `import { Create, SimpleForm, TextInput, NumberInput, BooleanInput } from 'react-admin';

export const ${entityName}Create = () => (
  <Create>
    <SimpleForm>
      ${fields.map(f => {
        const input = f.kind === 'number' ? 'NumberInput' : 
                     f.kind === 'boolean' ? 'BooleanInput' : 'TextInput';
        return `<${input} source="${f.name}" />`;
      }).join('\n      ')}
    </SimpleForm>
  </Create>
);`;
}

function generateEditComponent(entity: ManifestEntity): string {
  return `// Similar to Create component but with Edit wrapper`;
}
```

### Example 4: API Documentation Generator

```typescript
const apiDocsGenerator: GeneratorPlugin = {
  name: 'api-docs',
  description: 'Generates API documentation in Markdown',
  outputPath: 'docs/api.md',
  
  async generate(manifest: EdgeManifest): Promise<string> {
    let docs = `# ${manifest.name} API Documentation\n\n`;
    docs += `Version: ${manifest.version}\n\n`;
    docs += `## Entities\n\n`;
    
    for (const entity of manifest.entities) {
      const entityLower = entity.name.toLowerCase();
      docs += `### ${entity.name}\n\n`;
      
      // Fields documentation
      docs += `#### Fields\n\n`;
      docs += `| Field | Type | Required | Unique |\n`;
      docs += `|-------|------|----------|--------|\n`;
      
      for (const field of entity.fields) {
        if (field.kind === 'relation') continue;
        docs += `| ${field.name} | ${field.kind} | ${field.required ? 'Yes' : 'No'} | ${field.unique ? 'Yes' : 'No'} |\n`;
      }
      
      docs += `\n#### Endpoints\n\n`;
      docs += `- \`GET /api/${entityLower}s\` - List all ${entity.name}s\n`;
      docs += `- \`POST /api/${entityLower}s\` - Create a ${entity.name}\n`;
      docs += `- \`GET /api/${entityLower}s/:id\` - Get a ${entity.name} by ID\n`;
      docs += `- \`PATCH /api/${entityLower}s/:id\` - Update a ${entity.name}\n`;
      docs += `- \`DELETE /api/${entityLower}s/:id\` - Delete a ${entity.name}\n\n`;
    }
    
    return docs;
  }
};
```

### Example 5: Test Generator

```typescript
const testGenerator: GeneratorPlugin = {
  name: 'api-tests',
  description: 'Generates API test suites',
  outputPath: 'tests/api',
  
  async generate(manifest: EdgeManifest): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    
    for (const entity of manifest.entities) {
      const entityLower = entity.name.toLowerCase();
      
      files[`${entityLower}.test.ts`] = `import { describe, it, expect } from 'vitest';
import { app } from '../src/app';

describe('${entity.name} API', () => {
  it('should list ${entityLower}s', async () => {
    const response = await app.handle(
      new Request('http://localhost/api/${entityLower}s')
    );
    expect(response.status).toBe(200);
  });
  
  it('should create a ${entityLower}', async () => {
    const response = await app.handle(
      new Request('http://localhost/api/${entityLower}s', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ /* test data */ })
      })
    );
    expect(response.status).toBe(200);
  });
  
  // Add more tests...
});`;
    }
    
    return files;
  }
};
```

## ADVANCED FEATURES

### Validation

```typescript
const myGenerator: GeneratorPlugin = {
  name: 'my-generator',
  outputPath: 'output.ts',
  
  validate(manifest: EdgeManifest): boolean {
    // Ensure manifest has required properties
    if (!manifest.entities || manifest.entities.length === 0) {
      console.error('No entities found in manifest');
      return false;
    }
    
    // Validate entity names
    for (const entity of manifest.entities) {
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(entity.name)) {
        console.error(`Invalid entity name: ${entity.name}`);
        return false;
      }
    }
    
    return true;
  },
  
  async generate(manifest: EdgeManifest): Promise<string> {
    // Generation logic...
    return '';
  }
};
```

### Options Support

```typescript
const myGenerator: GeneratorPlugin = {
  name: 'my-generator',
  outputPath: 'output.ts',
  
  async generate(
    manifest: EdgeManifest,
    options?: Record<string, unknown>
  ): Promise<string> {
    const useTypeScript = options?.typescript !== false;
    const indent = options?.indent || 2;
    
    let code = '';
    if (useTypeScript) {
      code += '// TypeScript code\n';
    } else {
      code += '// JavaScript code\n';
    }
    
    // Use options to customize generation...
    return code;
  }
};

// Use with options
await runGenerator('my-generator', manifest, {
  typescript: true,
  indent: 4
});
```

### Multiple File Output

```typescript
const myGenerator: GeneratorPlugin = {
  name: 'my-generator',
  outputPath: 'output/',
  
  async generate(manifest: EdgeManifest): Promise<Record<string, string>> {
    return {
      'models/user.ts': '// User model code',
      'models/post.ts': '// Post model code',
      'index.ts': '// Index file'
    };
  }
};
```

## REGISTRY API

### Register a Generator

```typescript
import { registerGenerator } from '@edge-manifest/generators';

registerGenerator(myGenerator);
```

### Get a Generator

```typescript
import { getGenerator } from '@edge-manifest/generators';

const generator = getGenerator('my-generator');
if (generator) {
  const output = await generator.generate(manifest);
}
```

### List All Generators

```typescript
import { listGenerators } from '@edge-manifest/generators';

const names = listGenerators();
console.log('Available generators:', names);
```

### Run a Generator

```typescript
import { runGenerator } from '@edge-manifest/generators';

const output = await runGenerator('my-generator', manifest, options);
```

### Run All Generators

```typescript
import { runAllGenerators } from '@edge-manifest/generators';

const outputs = await runAllGenerators(manifest, options);
// outputs = { 'generator1': 'code...', 'generator2': 'code...' }
```

### Unregister a Generator

```typescript
import { unregisterGenerator } from '@edge-manifest/generators';

unregisterGenerator('my-generator');
```

## BEST PRACTICES

### 1. Naming Conventions

```typescript
// Good: Descriptive, lowercase with hyphens
name: 'prisma-schema'
name: 'graphql-resolvers'
name: 'react-admin-pages'

// Bad: Vague, mixed case
name: 'gen1'
name: 'MyGenerator'
```

### 2. Validation

Always validate the manifest before generation:

```typescript
validate(manifest: EdgeManifest): boolean {
  // Check for required properties
  if (!manifest.entities) return false;
  
  // Check entity structure
  for (const entity of manifest.entities) {
    if (!entity.name || !entity.fields) return false;
  }
  
  return true;
}
```

### 3. Error Handling

```typescript
async generate(manifest: EdgeManifest): Promise<string> {
  try {
    // Generation logic
    return generatedCode;
  } catch (error) {
    console.error(`Error generating code: ${error}`);
    throw error;
  }
}
```

### 4. Code Quality

Generate clean, formatted code:

```typescript
async generate(manifest: EdgeManifest): Promise<string> {
  let code = '';
  
  // Add header
  code += '// Auto-generated code\n';
  code += '// Do not edit manually\n\n';
  
  // Add imports
  code += 'import { Thing } from \'./thing\';\n\n';
  
  // Use proper indentation
  code += 'export class MyClass {\n';
  code += '  constructor() {\n';
  code += '    // ...\n';
  code += '  }\n';
  code += '}\n';
  
  return code;
}
```

### 5. Documentation

Document your generator:

```typescript
const myGenerator: GeneratorPlugin = {
  name: 'my-generator',
  description: 'Generates X from Y for Z use case. Supports A, B, and C.',
  outputPath: 'output/file.ts',
  // ...
};
```

## PUBLISHING GENERATORS

### As NPM Package

```bash
npm init @edge-manifest/generator-<name>
```

```json
{
  "name": "@edge-manifest/generator-prisma",
  "version": "1.0.0",
  "main": "dist/index.js",
  "peerDependencies": {
    "@edge-manifest/generators": "^0.0.1"
  }
}
```

```typescript
// index.ts
import type { GeneratorPlugin } from '@edge-manifest/generators';

export const prismaGenerator: GeneratorPlugin = {
  // ...
};
```

### Usage by Others

```typescript
import { registerGenerator } from '@edge-manifest/generators';
import { prismaGenerator } from '@edge-manifest/generator-prisma';

registerGenerator(prismaGenerator);
```

## COMMUNITY GENERATORS

Encourage users to create and share generators:
- Publish to npm with `@edge-manifest/generator-*` naming
- Share in community discussions
- Submit to official registry (if one exists)

Example community generators:
- `@edge-manifest/generator-fastify` - Fastify API
- `@edge-manifest/generator-nextjs` - Next.js pages
- `@edge-manifest/generator-vue` - Vue 3 components
- `@edge-manifest/generator-angular` - Angular modules

---

**Plugin System Status:** ✅ Production Ready  
**Extensibility:** Unlimited  
**Community:** Open for contributions
