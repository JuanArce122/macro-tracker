import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["__tests__/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts", "app/**/*.{ts,tsx}"],
      exclude: ["app/generated/**", "**/*.d.ts", "**/types.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
