import type { EdgeManifest } from '../manifest/types';
export interface RuntimeOverrides {
  defaultRegion?: string;
  generatorFlags?: Record<string, boolean>;
  [key: string]: unknown;
}
export interface ConfigParserOptions {
  runtimeOverrides?: RuntimeOverrides;
}
export interface LoadOptions extends ConfigParserOptions {
  sourcePath?: string;
}
export interface ConfigParserResult extends EdgeManifest {
  _meta: {
    sourcePath?: string;
    runtimeOverrides?: RuntimeOverrides;
    loadedAt: Date;
  };
}
export interface FileLoader {
  readFile(path: string): Promise<string>;
}
export declare class ConfigParser {
  private _config?;
  private readonly loader;
  constructor(loader?: FileLoader);
  loadFromFile(path: string, options?: ConfigParserOptions): Promise<ConfigParserResult>;
  loadFromObject(manifestLike: unknown, options?: LoadOptions): ConfigParserResult;
  getConfig(): ConfigParserResult | undefined;
  private mergeWithOverrides;
}
//# sourceMappingURL=config-parser.d.ts.map
