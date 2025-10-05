/// <reference types="@types/emscripten" />

interface ModuleExtraOptions {
  FS: typeof FS;
  ENV: Record<string, string>;
  preInit: (m: Module) => void;
  preRun: (m: Module) => void;
  postRun: (m: Module) => void;

  stdin: () => number | undefined | null;
  stdout: (byte: number) => void;
  stderr: (byte: number) => void;

  onExit: (code: number) => void;
  onAbort: (what: string) => void;
}

type Module = Omit<EmscriptenModule, keyof ModuleExtraOptions> &
  ModuleExtraOptions;
declare const factory: (options: Partial<Module>) => Promise<Module>;
export default factory;
