export type PathItem = { key: string | number };

export type Issue = {
  message: string;
  path: PathItem[];
};

export type SafeParseSuccess<T> = {
  success: true;
  output: T;
};

export type SafeParseFailure = {
  success: false;
  issues: Issue[];
};

export type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseFailure;

type ParseContext = {
  path: PathItem[];
  issues: Issue[];
};

type ParseResult<T> = { ok: true; value: T } | { ok: false };

export type Schema<T> = {
  _parse: (input: unknown, ctx: ParseContext) => ParseResult<T>;
};

type OptionalSchema<T> = Schema<T> & { _optional: true };

type PipeAction<T> = {
  _apply: (value: T, ctx: ParseContext) => ParseResult<T>;
};

function addIssue(ctx: ParseContext, message: string, path: PathItem[] = ctx.path): void {
  ctx.issues.push({ message, path: [...path] });
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

export function safeParse<T>(schema: Schema<T>, input: unknown): SafeParseResult<T> {
  const ctx: ParseContext = { path: [], issues: [] };
  const result = schema._parse(input, ctx);

  if (result.ok) {
    return { success: true, output: result.value };
  }

  return { success: false, issues: ctx.issues };
}

export function string(): Schema<string> {
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

export function boolean(): Schema<boolean> {
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

export function unknown(): Schema<unknown> {
  return {
    _parse(input) {
      return { ok: true, value: input };
    },
  };
}

export function literal<const T extends string>(value: T): Schema<T> {
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

export function union<const T extends readonly Schema<unknown>[]>(schemas: T): Schema<unknown> {
  return {
    _parse(input, ctx) {
      let bestIssues: Issue[] | null = null;

      for (const schema of schemas) {
        const fork: ParseContext = { path: [...ctx.path], issues: [] };
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

export function optional<T>(schema: Schema<T>): OptionalSchema<T> {
  return {
    _optional: true,
    _parse(input, ctx) {
      if (input === undefined) return { ok: true, value: undefined as unknown as T };
      return schema._parse(input, ctx);
    },
  };
}

export function array<T>(itemSchema: Schema<T>): Schema<T[]> {
  return {
    _parse(input, ctx) {
      if (!Array.isArray(input)) {
        addIssue(ctx, 'Expected an array');
        return { ok: false };
      }

      const out: T[] = [];
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

export function record<T>(keySchema: Schema<string>, valueSchema: Schema<T>): Schema<Record<string, T>> {
  return {
    _parse(input, ctx) {
      if (!isPlainObject(input)) {
        addIssue(ctx, 'Expected an object');
        return { ok: false };
      }

      const out: Record<string, T> = {};
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

export function object<const TShape extends Record<string, Schema<unknown>>>(
  shape: TShape,
): Schema<{ [K in keyof TShape]: unknown }> {
  return {
    _parse(input, ctx) {
      if (!isPlainObject(input)) {
        addIssue(ctx, 'Expected an object');
        return { ok: false };
      }

      const out: Record<string, unknown> = {};
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

export function pipe<T>(schema: Schema<T>, ...actions: PipeAction<T>[]): Schema<T> {
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

export function minLength<T extends { length: number }>(
  min: number,
  message = `Expected at least ${min} item(s)`,
): PipeAction<T> {
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
