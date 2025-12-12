declare module 'bun:sqlite' {
  export class Database {
    constructor(filename: string);

    exec(query: string): void;
    close(): void;

    prepare(query: string): {
      all: (...values: unknown[]) => unknown[];
      get: (...values: unknown[]) => unknown;
      run: (...values: unknown[]) => { changes: number | bigint; lastInsertRowid: number | bigint };
    };
  }
}
