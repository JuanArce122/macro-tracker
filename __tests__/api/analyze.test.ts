import { describe, it, expect, vi, beforeEach } from "vitest";

// Forzar timeout corto ANTES de que se importe el route.
// vi.hoisted garantiza que esto corre antes de los imports estáticos.
const { generateContent } = vi.hoisted(() => {
  process.env.ANALYZE_TIMEOUT_MS = "120";
  return { generateContent: vi.fn() };
});

// Mock del SDK. Usamos `class` en lugar de vi.fn().mockImplementation()
// porque el route lo invoca con `new`.
vi.mock("@google/generative-ai", () => {
  class GoogleGenerativeAI {
    getGenerativeModel() {
      return { generateContent };
    }
  }
  return { GoogleGenerativeAI };
});

import { POST } from "@/app/api/analyze/route";

const mockedGenerate = generateContent;

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 400 cuando no se envía imageBase64", async () => {
    const res = await POST(makeRequest({}) as never);
    expect(res.status).toBe(400);
  });

  it("retorna 200 con el JSON de Gemini cuando responde a tiempo", async () => {
    const fakeResponse = {
      nombre_plato: "Pollo con arroz",
      items: [{ nombre: "Pollo", unidades: 1, peso_g: 100, calorias: 165, proteina_g: 31, carbs_g: 0, grasa_g: 3.6, confianza: 0.95 }],
    };
    mockedGenerate.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(fakeResponse) },
    });

    const res = await POST(makeRequest({ imageBase64: "abc" }) as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.nombre_plato).toBe("Pollo con arroz");
    expect(data.items.length).toBe(1);
  });

  it("retorna 504 con code:timeout cuando Gemini tarda más del límite", async () => {
    // Gemini "cuelga" más allá de TIMEOUT_MS (120ms en test)
    mockedGenerate.mockReturnValueOnce(new Promise(() => {
      // never resolves
    }));

    const res = await POST(makeRequest({ imageBase64: "abc" }) as never);
    expect(res.status).toBe(504);
    const data = await res.json();
    expect(data.code).toBe("timeout");
    expect(data.error).toMatch(/tardó demasiado/i);
  });

  it("retorna 500 cuando Gemini retorna JSON inválido", async () => {
    mockedGenerate.mockResolvedValueOnce({
      response: { text: () => "esto no es json" },
    });

    const res = await POST(makeRequest({ imageBase64: "abc" }) as never);
    expect(res.status).toBe(500);
  });

  it("limpia el wrapping ```json del response de Gemini", async () => {
    const fakeJson = { nombre_plato: "X", items: [] };
    mockedGenerate.mockResolvedValueOnce({
      response: { text: () => "```json\n" + JSON.stringify(fakeJson) + "\n```" },
    });

    const res = await POST(makeRequest({ imageBase64: "abc" }) as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.nombre_plato).toBe("X");
  });
});
