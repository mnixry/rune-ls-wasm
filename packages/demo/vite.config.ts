import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import reactCompiler from "babel-plugin-react-compiler";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [
    react({
      babel: {
        plugins: [reactCompiler],
      },
    }),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  worker: {
    format: "es",
  },
});
