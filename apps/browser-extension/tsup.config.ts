import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    background: "src/background.ts",
    content: "src/content.ts",
    options: "src/options.ts",
  },
  outDir: "dist",
  format: ["iife"],
  splitting: false,
  sourcemap: false,
  clean: true,
  target: "es2022",
  noExternal: [/.*/],
});
