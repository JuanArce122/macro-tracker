import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Cleanup automático del DOM después de cada test
afterEach(() => {
  cleanup();
});
