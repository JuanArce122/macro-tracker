import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Env vars dummy para módulos que las validan al instanciarse (ej. getGemini
// lanza si GEMINI_API_KEY no está definida). Los tests mockean el SDK,
// así que el valor real no importa.
process.env.GEMINI_API_KEY ??= "test-key";

// Cleanup automático del DOM después de cada test
afterEach(() => {
  cleanup();
});
