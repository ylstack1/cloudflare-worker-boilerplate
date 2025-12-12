# AI Agent Rules & Guidelines for EDGE-MANIFEST
*Updated: December 12, 2024*

## 🎯 REAL BACKEND FOCUS

### MANDATORY: WORKING CODE ONLY
- ✅ **ALL tasks must produce WORKING code, not placeholders**
- ✅ **If manifest.json defines an entity, the system MUST generate real CRUD operations**
- ✅ **D1 queries are REAL, not stubbed**
- ✅ **API routes accept real requests and return real data**
- ✅ **Tests prove functionality works end-to-end**
- ✅ **Every feature must be testable and tested**

### NEVER PRODUCE
- ❌ Placeholder implementations
- ❌ Stub functions that return fake data
- ❌ "TODO" comments in production code
- ❌ Incomplete features that "will be filled in later"
- ❌ Code that passes tests but doesn't actually work
- ❌ Mock implementations that don't connect to real services

### ALWAYS VERIFY
- ✅ Database queries execute against real D1
- ✅ API endpoints respond with actual data
- ✅ Authentication works with real tokens
- ✅ File operations actually read/write
- ✅ External API calls succeed
- ✅ Error handling is tested with real errors

---

## 🔄 TASK HANDLING RULES

### SUCCESS PATH
If a task **PASSES** (all tests pass, code works, requirements met):

1. **Commit changes** to feature branch
2. **Update progress** in `.cto/Tasks/PHASE_X.md`
3. **Create/update** `.cto/Progress/{feature}.md`
4. **Mark task** as COMPLETED
5. **Document** what was accomplished

### FAILURE PATH
If a task **FAILS** (tests don't pass, features broken, requirements not met):

1. **DO NOT commit** broken code to main
2. **Keep branch alive** for retry
3. **Create** `.cto/Failures/{task-name}.md` with:
   - What went wrong
   - What was attempted
   - What fix is needed
   - Next steps required
4. **Update** `.cto/Tasks/PHASE_X.md` with FAILED status
5. **Document** blockers and dependencies

### FAILURE DEFINITIONS
Only fail entire build if:
- ❌ Core manifest system broken
- ❌ D1 queries non-functional  
- ❌ Package can't be imported
- ❌ Tests don't run at all
- ❌ TypeScript compilation fails completely
- ❌ Runtime errors in core functionality

### ACCEPTABLE TEMPORARY STATES
These do NOT require task failure:
- ⚠️ Missing CLI implementation (Phase 2 work)
- ⚠️ Skeleton SDK package (future work)
- ⚠️ Incomplete admin UI (future work)
- ⚠️ Peer dependency warnings (cosmetic)
- ⚠️ Missing documentation (can be added later)

---

## 📋 TASK TRACKING IN CODE

### Format for Feature Progress
Every feature must have a tracking file: `.cto/Progress/{feature}.md`

```markdown
## {Feature Name}
**Status**: IN PROGRESS / COMPLETED / FAILED  
**Branch**: feat/{feature-name}  
**PR**: #{number}  
**Tests**: ✅ 90% coverage  
**Build**: ✅ Passes  

### What's Done
- [x] src/ files created
- [x] Functions implemented  
- [x] Tests written
- [x] TypeScript passes
- [x] No Node.js APIs
- [x] JSDoc comments

### What's Missing
- [ ] None (completed)

### Last Update
- {date}: {brief note}
```

### Branch Naming Convention
- `feat/{feature-name}` - New features
- `fix/{issue-name}` - Bug fixes
- `test/{feature}` - Test additions
- `docs/{change-type}` - Documentation
- `refactor/{area}` - Code improvements

---

## 📝 COMMIT MESSAGE FORMAT

### Standard Format
```
<type>: {feature-name} - Add {what it does}

{optional detailed description}

BREAKING CHANGE: {description if breaking}
```

### Type Categories
- `feat`: New features
- `fix`: Bug fixes
- `test`: Test additions/modifications
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `chore`: Build process, dependencies
- `perf`: Performance improvements
- `style`: Code style (formatting, etc.)

### Examples
```bash
feat: manifest-validator - Add Valibot-based validation with error formatting

feat: config-parser - Implement ConfigParser class with runtime overrides

fix: starter-typebox - Resolve Elysia import compatibility issue

test: d1-handler - Add comprehensive test suite with mocking

docs: setup-guide - Add installation and usage instructions
```

---

## 🔍 CODE QUALITY REQUIREMENTS

### MANDATORY CHECKS
Before marking any task complete:

1. **TypeScript Strict Mode**
   ```bash
   pnpm typecheck
   # Must pass with no errors
   ```

2. **Linting**
   ```bash
   pnpm lint
   # Must pass with no warnings
   ```

3. **Tests**
   ```bash
   pnpm test
   # All tests must pass
   ```

4. **Coverage**
   ```bash
   pnpm test --coverage
   # Must meet 80% minimum
   ```

5. **Build**
   ```bash
   pnpm build
   # All packages must build
   ```

### PROHIBITED PATTERNS
```javascript
// ❌ NEVER DO THIS
export function getUser(id) {
  return { id, name: "John Doe" }; // FAKE DATA
}

// ✅ ALWAYS DO THIS  
export function getUser(id) {
  return db.select().from(users).where(eq(users.id, id));
}
```

```javascript
// ❌ NEVER DO THIS
export async function createUser(data) {
  // Mock implementation
  return { success: true };
}

// ✅ ALWAYS DO THIS
export async function createUser(data) {
  const result = await db.insert(users).values(data).returning();
  return result[0];
}
```

---

## 🗂️ FILE ORGANIZATION RULES

### Core Package Structure
```
packages/@edge-manifest/core/src/
├── manifest/
│   ├── validator.ts      # validateManifest()
│   ├── schema.ts         # Valibot schemas
│   ├── types.ts          # Type definitions
│   └── valibot.ts        # Valibot utilities
├── config/
│   └── config-parser.ts  # ConfigParser class
├── db/
│   └── d1-handler.ts     # createD1RequestHandler()
└── index.ts              # Main exports
```

### Test Organization
```
packages/@edge-manifest/core/tests/
├── manifest-validator.test.ts
├── config-parser.test.ts
├── d1-handler.test.ts
├── fixtures/
│   ├── valid-manifest.json
│   └── invalid-manifest.json
└── index.test.ts
```

### Naming Conventions
- **Files**: kebab-case (`config-parser.ts`)
- **Classes**: PascalCase (`ConfigParser`)
- **Functions**: camelCase (`loadFromFile`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Types/Interfaces**: PascalCase (`EdgeManifest`)

---

## 🧪 TESTING REQUIREMENTS

### Test Coverage Minimums
- **Core functionality**: 90%+ coverage
- **Error handling**: 100% coverage of error paths
- **Edge cases**: All documented edge cases tested
- **Integration**: Real D1/database testing where possible

### Test Types Required
1. **Unit Tests**: Individual functions/classes
2. **Integration Tests**: Component interactions
3. **Error Tests**: All error paths covered
4. **Type Tests**: TypeScript strict mode validation

### Test Naming
```typescript
describe('ConfigParser', () => {
  describe('loadFromFile', () => {
    it('should load and parse valid manifest file', () => {})
    it('should throw error for invalid JSON', () => {})
    it('should throw error for missing file', () => {})
  })
})
```

---

## 🔧 ENVIRONMENT & DEPENDENCIES

### Web Standards Only
- ✅ **Web APIs**: fetch, URL, crypto, etc.
- ✅ **D1 Database**: Real Cloudflare D1
- ✅ **Environment Variables**: Real env vars
- ✅ **File System**: Only with proper guards

### Prohibited Dependencies
- ❌ **Node.js modules**: fs, path, crypto, etc.
- ❌ **bcryptjs**: Use @noble/hashes instead
- ❌ **jsonwebtoken**: Use jose instead
- ❌ **express**: Use Elysia instead
- ❌ **heavy-frameworks**: Keep bundle small

### Environment Detection
```typescript
// ✅ CORRECT: Environment-aware code
export function readFile(path: string): Promise<string> {
  if (typeof globalThis !== 'undefined' && 'fetch' in globalThis) {
    // Workers environment - need custom loader
    throw new Error('File loading not available in Workers');
  }
  
  if (typeof process !== 'undefined' && process.versions?.node) {
    // Node.js environment
    const { readFile } = await import('node:fs/promises');
    return readFile(path, 'utf-8');
  }
  
  throw new Error('Unsupported environment');
}
```

---

## 📊 PERFORMANCE REQUIREMENTS

### Bundle Size Limits
- **Core package**: <50KB uncompressed
- **Starter bundle**: <1MB gzipped
- **Total monorepo**: <5MB total

### Performance Metrics
- **Cold start**: <50ms
- **Generation time**: <5 seconds
- **Test execution**: <10 seconds
- **Build time**: <30 seconds

### Monitoring
```typescript
// ✅ Monitor performance
export function generateSchema(manifest: EdgeManifest) {
  const start = performance.now();
  const result = _generateSchema(manifest);
  const end = performance.now();
  
  console.log(`Schema generation took ${end - start}ms`);
  return result;
}
```

---

## 🚨 ERROR HANDLING RULES

### Never Silent Failures
```typescript
// ❌ BAD: Silent failure
export function parseConfig(data: unknown) {
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// ✅ GOOD: Structured error handling
export function parseConfig(data: unknown): EdgeManifest {
  const result = safeParse(edgeManifestSchema, data);
  if (!result.success) {
    throw new Error(formatManifestError(result.issues));
  }
  return result.output;
}
```

### Error Context
```typescript
// ✅ Always provide context
try {
  return await db.insert(users).values(userData);
} catch (error) {
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    throw new Error(`User with email ${userData.email} already exists`);
  }
  throw new Error(`Failed to create user: ${error.message}`);
}
```

---

## 📈 SUCCESS METRICS

### Phase Completion Criteria
- ✅ All tests pass (100%)
- ✅ 80%+ test coverage verified
- ✅ TypeScript strict mode passes
- ✅ No lint errors or warnings
- ✅ Bundle size within limits
- ✅ Performance benchmarks met
- ✅ Documentation updated
- ✅ Real functionality verified

### Quality Gates
Every commit must pass:
- [ ] Tests run successfully
- [ ] TypeScript compiles without errors
- [ ] Linting passes cleanly
- [ ] No console.log in production code
- [ ] No Node.js APIs in runtime code
- [ ] JSDoc on all public APIs
- [ ] Error handling tested

---

## 🎯 PHASE-SPECIFIC FOCUS

### Phase 1 (Current): Foundation
- ✅ Infrastructure setup
- ✅ Core functionality
- ✅ Test infrastructure
- ⚠️ Fix remaining issues

### Phase 2: Real Backend
- 🚧 **Focus**: Working backend implementation
- 🚧 **No placeholders**: Everything must work end-to-end
- 🚧 **Real data**: Actual database operations
- 🚧 **Real APIs**: Functional REST endpoints

### Phase 3: Generators
- 🚧 **Focus**: Code generation from manifests
- 🚧 **Real generation**: Working generators, not stubs
- 🚧 **Test generation**: Generated code must be testable

### Phase 4: Admin + SDK
- 🚧 **Focus**: Complete admin interface and SDK
- 🚧 **Real UI**: Working admin interface
- 🚧 **Real SDK**: Functional client library

---

## 🔄 CONTINUOUS IMPROVEMENT

### Regular Reviews
- **Weekly**: Review progress and blockers
- **Each phase**: Validate readiness for next phase
- **Each task**: Document lessons learned

### Rule Evolution
- Rules may be updated based on project needs
- Breaking changes must be documented
- Always prioritize working code over theoretical perfection

---

*These rules ensure consistent, high-quality development across all AI agents and human contributors.*