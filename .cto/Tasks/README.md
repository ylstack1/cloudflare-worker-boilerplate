# How to Use Task Tracking
*Updated: December 12, 2024*

## Overview
This task tracking system provides complete visibility into the EDGE-MANIFEST project's progress, ensuring all work is properly documented, tracked, and completed.

## Structure
```
.cto/
├── Tasks/           # Phase-level task organization
├── Progress/        # Detailed feature progress
├── Failures/        # Failed task documentation
├── STATE.md         # Current project state
├── CHECKLIST.md     # Master task checklist
└── RULES_FOR_AI.md  # Development guidelines
```

## Task Categories

### Tasks/
- **PHASE_1_FOUNDATION.md** - Currently in progress
- **PHASE_2_BACKEND_REAL.md** - Next phase (real backend)
- **PHASE_3_GENERATORS.md** - Code generation
- **PHASE_4_ADMIN_SDK.md** - Admin UI + SDK
- **README.md** - This file

### Progress/
- **manifest-validator.md** - Status of Valibot validation
- **config-parser.md** - Status of ConfigParser class
- **d1-drizzle-handler.md** - Status of D1 handler
- **elysia-bootstrap.md** - Upcoming Elysia work

### Failures/
- **/{task-name}.md** - Documented failures with analysis

## Usage for AI Agents

### Starting a New Task
1. **Check current state** in `.cto/STATE.md`
2. **Review checklist** in `.cto/CHECKLIST.md`
3. **Find next available task** in relevant phase file
4. **Create branch** following naming convention
5. **Update progress file** with IN PROGRESS status

### Completing a Task
1. **Ensure all quality gates pass**
   - Tests: `pnpm test` (all pass)
   - TypeScript: `pnpm typecheck` (no errors)
   - Linting: `pnpm lint` (no warnings)
   - Coverage: Verify 80%+ if required
2. **Commit to feature branch**
3. **Update progress file** to COMPLETED
4. **Update phase file** with completion
5. **Update master checklist** if needed

### Handling Failures
1. **DO NOT commit** broken code to main
2. **Keep branch alive** for retry
3. **Create failure file** in `.cto/Failures/`
4. **Document** what went wrong and needed fixes
5. **Update progress file** to FAILED
6. **Identify dependencies** and next steps

## Success Tracking

### Quality Gates
- ✅ **Tests Pass**: All tests run successfully
- ✅ **TypeScript Clean**: No compilation errors
- ✅ **Linting Clean**: No style warnings
- ✅ **Coverage**: Meets requirements (80%+)
- ✅ **Real Functionality**: Code actually works
- ✅ **Documentation**: JSDoc and comments complete

### Progress Indicators
- **IN PROGRESS**: Currently being worked on
- **COMPLETED**: All requirements met, tests pass
- **FAILED**: Blocking issues, needs retry
- **BLOCKED**: Dependent on other work
- **SKIPPED**: Not required for current phase

## Regular Maintenance

### Weekly Reviews
1. **Check STATE.md** for overall progress
2. **Review FAILURES** for retry candidates
3. **Update NEXT_STEPS** based on current state
4. **Validate phase readiness**

### Each Task Completion
1. **Update relevant progress file**
2. **Check master checklist**
3. **Verify no regressions**
4. **Document lessons learned**

### Phase Transitions
1. **Validate all tasks complete**
2. **Update phase status**
3. **Plan next phase tasks**
4. **Update overall STATE.md**

## File Templates

### Progress File Template
```markdown
## {Feature Name}
**Status**: IN PROGRESS / COMPLETED / FAILED
**Branch**: feat/{feature-name}
**PR**: #{number}
**Tests**: ✅ {count} passing
**Coverage**: ✅ {percentage}%
**TypeScript**: ✅ Clean
**Linting**: ✅ Clean

### What's Done
- [x] Implementation complete
- [x] Tests written and passing
- [x] TypeScript passes
- [x] Linting clean
- [x] Documentation complete
- [x] Real functionality verified

### What's Missing
- [ ] None (completed)

### Last Update
- {date}: {brief description of completion}
```

### Failure File Template
```markdown
# {Task Name} - FAILURE ANALYSIS

## What Went Wrong
{description of the failure>

## What Was Attempted
- Step 1: {what was done}
- Step 2: {what was tried}
- Step 3: {investigation performed}

## Root Cause
{technical explanation of why it failed>

## Fix Required
{what needs to be fixed to succeed>

## Next Steps
1. {immediate action}
2. {dependencies to resolve}
3. {retry strategy}

## Files Affected
- {list of files that need work}

## Branch Status
- Branch: feat/{task-name}
- Status: Alive for retry
- Last Commit: {hash and message}
```

## Integration with Development Workflow

### Before Starting Work
1. **Read relevant task file**
2. **Check current status**
3. **Verify prerequisites**
4. **Understand success criteria**

### During Development
1. **Update progress file** with changes
2. **Run quality gates frequently**
3. **Document any issues**
4. **Keep branch up to date**

### After Completion
1. **Final quality gate check**
2. **Update all relevant files**
3. **Prepare for review**
4. **Plan next task**

## Best Practices

### For AI Agents
- **Always verify** current state before starting
- **Document thoroughly** what was done
- **Run all quality gates** before marking complete
- **Be honest** about failures and blockers
- **Focus on real functionality** over placeholders

### For Human Reviewers
- **Check progress files** for accuracy
- **Verify quality gates** before approving
- **Review failure analysis** for learning
- **Update STATE.md** for major changes
- **Maintain checklist currency**

---

This task tracking system ensures every piece of work is visible, trackable, and high-quality. Use it to maintain project momentum and quality standards.