// Type declarations for modules without type definitions

declare module "better-sqlite3" {
  import type { Database as BetterSqlite3Database } from "better-sqlite3";

  interface DatabaseOptions {
    readonly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
    verbose?: (message: string, ...additionalArgs: unknown[]) => void;
  }

  interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  interface Statement<BindParameters extends unknown[] | {} = unknown[]> {
    run(...params: BindParameters[]): RunResult;
    get(...params: BindParameters[]): unknown;
    all(...params: BindParameters[]): unknown[];
    iterate(...params: BindParameters[]): IterableIterator<unknown>;
  }

  interface DatabaseInstance {
    prepare<BindParameters extends unknown[] | {} = unknown[]>(
      source: string,
    ): Statement<BindParameters>;
    exec(source: string): this;
    close(): this;
    pragma(source: string, options?: { simple?: boolean }): unknown;
    transaction<F extends (...args: unknown[]) => unknown>(fn: F): F;
  }

  interface DatabaseConstructor {
    new (
      filename: string | Buffer,
      options?: DatabaseOptions,
    ): DatabaseInstance;
    (filename: string | Buffer, options?: DatabaseOptions): DatabaseInstance;
  }

  const Database: DatabaseConstructor;
  export default Database;
  export type { DatabaseInstance as Database };
}
