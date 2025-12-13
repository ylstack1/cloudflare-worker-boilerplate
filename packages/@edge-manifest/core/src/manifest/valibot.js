function addIssue(ctx, message, path = ctx.path) {
  ctx.issues.push({ message, path: [...path] });
}
function isPlainObject(input) {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}
export function safeParse(schema, input) {
  const ctx = { path: [], issues: [] };
  const result = schema._parse(input, ctx);
  if (result.ok) {
    return { success: true, output: result.value };
  }
  return { success: false, issues: ctx.issues };
}
export function string() {
  return {
    _parse(input, ctx) {
      if (typeof input !== 'string') {
        addIssue(ctx, 'Expected a string');
        return { ok: false };
      }
      return { ok: true, value: input };
    },
  };
}
export function boolean() {
  return {
    _parse(input, ctx) {
      if (typeof input !== 'boolean') {
        addIssue(ctx, 'Expected a boolean');
        return { ok: false };
      }
      return { ok: true, value: input };
    },
  };
}
export function unknown() {
  return {
    _parse(input) {
      return { ok: true, value: input };
    },
  };
}
export function literal(value) {
  return {
    _parse(input, ctx) {
      if (input !== value) {
        addIssue(ctx, `Expected ${JSON.stringify(value)}`);
        return { ok: false };
      }
      return { ok: true, value };
    },
  };
}
export function union(schemas) {
  return {
    _parse(input, ctx) {
      let bestIssues = null;
      for (const schema of schemas) {
        const fork = { path: [...ctx.path], issues: [] };
        const result = schema._parse(input, fork);
        if (result.ok) {
          return { ok: true, value: result.value };
        }
        if (!bestIssues || fork.issues.length > bestIssues.length) {
          bestIssues = fork.issues;
        }
      }
      if (bestIssues && bestIssues.length > 0) {
        ctx.issues.push(...bestIssues);
      } else {
        addIssue(ctx, 'Value does not match any union variant');
      }
      return { ok: false };
    },
  };
}
export function optional(schema) {
  return {
    _optional: true,
    _parse(input, ctx) {
      if (input === undefined) return { ok: true, value: undefined };
      return schema._parse(input, ctx);
    },
  };
}
export function array(itemSchema) {
  return {
    _parse(input, ctx) {
      if (!Array.isArray(input)) {
        addIssue(ctx, 'Expected an array');
        return { ok: false };
      }
      const out = [];
      for (let i = 0; i < input.length; i++) {
        ctx.path.push({ key: i });
        const result = itemSchema._parse(input[i], ctx);
        ctx.path.pop();
        if (result.ok) out.push(result.value);
      }
      return ctx.issues.length > 0 ? { ok: false } : { ok: true, value: out };
    },
  };
}
export function record(keySchema, valueSchema) {
  return {
    _parse(input, ctx) {
      if (!isPlainObject(input)) {
        addIssue(ctx, 'Expected an object');
        return { ok: false };
      }
      const out = {};
      for (const [key, value] of Object.entries(input)) {
        ctx.path.push({ key });
        const keyResult = keySchema._parse(key, ctx);
        const valueResult = valueSchema._parse(value, ctx);
        ctx.path.pop();
        if (keyResult.ok && valueResult.ok) {
          out[keyResult.value] = valueResult.value;
        }
      }
      return ctx.issues.length > 0 ? { ok: false } : { ok: true, value: out };
    },
  };
}
export function object(shape) {
  return {
    _parse(input, ctx) {
      if (!isPlainObject(input)) {
        addIssue(ctx, 'Expected an object');
        return { ok: false };
      }
      const out = {};
      for (const [key, schema] of Object.entries(shape)) {
        const hasKey = Object.hasOwn(input, key);
        if (!hasKey) {
          if ('_optional' in schema) continue;
          ctx.issues.push({ message: 'Missing required property', path: [...ctx.path, { key }] });
          continue;
        }
        ctx.path.push({ key });
        const result = schema._parse(input[key], ctx);
        ctx.path.pop();
        if (result.ok) {
          out[key] = result.value;
        }
      }
      return ctx.issues.length > 0 ? { ok: false } : { ok: true, value: out };
    },
  };
}
export function pipe(schema, ...actions) {
  return {
    _parse(input, ctx) {
      const base = schema._parse(input, ctx);
      if (!base.ok) return { ok: false };
      let current = base.value;
      for (const action of actions) {
        const next = action._apply(current, ctx);
        if (!next.ok) return { ok: false };
        current = next.value;
      }
      return { ok: true, value: current };
    },
  };
}
export function minLength(min, message = `Expected at least ${min} item(s)`) {
  return {
    _apply(value, ctx) {
      if (value.length < min) {
        addIssue(ctx, message);
        return { ok: false };
      }
      return { ok: true, value };
    },
  };
}
//# sourceMappingURL=valibot.js.map
