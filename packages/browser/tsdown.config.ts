import path from "node:path";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/index.ts",
  dts: true,
  external: [/^\.\/lib/],
  format: "esm",
  copy: ["rune_languageserver.js", "rune_languageserver.wasm"].map((file) => ({
    from: path.resolve(import.meta.dirname, "../../result/lib", file),
    to: path.resolve(import.meta.dirname, "dist/lib", file),
  })),
  clean: true,
});
