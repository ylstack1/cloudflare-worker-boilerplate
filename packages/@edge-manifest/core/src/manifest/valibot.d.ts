export type PathItem = {
  key: string | number;
};
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
type ParseResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
    };
export type Schema<T> = {
  _parse: (input: unknown, ctx: ParseContext) => ParseResult<T>;
};
type OptionalSchema<T> = Schema<T> & {
  _optional: true;
};
type PipeAction<T> = {
  _apply: (value: T, ctx: ParseContext) => ParseResult<T>;
};
export declare function safeParse<T>(schema: Schema<T>, input: unknown): SafeParseResult<T>;
export declare function string(): Schema<string>;
export declare function boolean(): Schema<boolean>;
export declare function unknown(): Schema<unknown>;
export declare function literal<const T extends string>(value: T): Schema<T>;
export declare function union<const T extends readonly Schema<unknown>[]>(schemas: T): Schema<unknown>;
export declare function optional<T>(schema: Schema<T>): OptionalSchema<T>;
export declare function array<T>(itemSchema: Schema<T>): Schema<T[]>;
export declare function record<T>(keySchema: Schema<string>, valueSchema: Schema<T>): Schema<Record<string, T>>;
export declare function object<const TShape extends Record<string, Schema<unknown>>>(
  shape: TShape,
): Schema<{
  [K in keyof TShape]: unknown;
}>;
export declare function pipe<T>(schema: Schema<T>, ...actions: PipeAction<T>[]): Schema<T>;
export declare function minLength<
  T extends {
    length: number;
  },
>(min: number, message?: string): PipeAction<T>;
//# sourceMappingURL=valibot.d.ts.map
