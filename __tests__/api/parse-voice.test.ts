import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted ANTES de los imports
const { generateContent } = vi.hoisted(() => {
  process.env.PARSE_VOICE_TIMEOUT_MS = "120";
  return { generateContent: vi.fn() };
});

vi.mock("@google/generative-ai", () => {
  class GoogleGenerativeAI {
    getGenerativeModel() {
      return { generateContent };
    }
  }
  return { GoogleGenerativeAI };
});

// Mock auth — siempre autenticado
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "1", email: "x@x.com" } }),
}));

// Mock matchFoods — no queremos tocar Prisma en tests del endpoint
vi.mock("@/lib/voice/match-foods", async () => {
  const actual = await vi.importActual<typeof import("@/lib/voice/match-foods")>(
    "@/lib/voice/match-foods"
  );
  return {
    ...actual,
    matchFoods: vi.fn().mockImplementation(async (items) =>
      items.map((it: { nombre: string; cantidad: number; unidad: string; confianza: number }) => ({
        ...it,
        foodId: null,
        weightG: 0,
        calorias: 0,
        proteina: 0,
        carbs: 0,
        grasa: 0,
      }))
    ),
  };
});

import { POST } from "@/app/api/parse-voice/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/parse-voice", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/parse-voice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza body sin transcript (400)", async () => {
    const res = await POST(makeRequest({}) as never);
    expect(res.status).toBe(400);
  });

  it("rechaza transcript vacío", async () => {
    const res = await POST(makeRequest({ transcript: "" }) as never);
    expect(res.status).toBe(400);
  });

  it("retorna items vacíos cuando Gemini detecta nada", async () => {
    generateContent.mockResolvedValueOnce({
      response: { text: () => `{ "items": [] }` },
    });
    const res = await POST(makeRequest({ transcript: "hola mundo" }) as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toEqual([]);
    expect(data.message).toBeDefined();
  });

  it("parsea correctamente cuando Gemini retorna items válidos", async () => {
    generateContent.mockResolvedValueOnce({
      response: {
        text: () => `{
          "items": [
            { "nombre": "Huevo", "cantidad": 2, "unidad": "unidad", "confianza": 0.95 },
            { "nombre": "Arepa", "cantidad": 1, "unidad": "unidad", "confianza": 0.9 }
          ]
        }`,
      },
    });
    const res = await POST(makeRequest({ transcript: "dos huevos con una arepa" }) as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items.length).toBe(2);
    expect(data.items[0].nombre).toBe("Huevo");
  });

  it("sanea items con unidad inválida", async () => {
    generateContent.mockResolvedValueOnce({
      response: {
        text: () => `{
          "items": [
            { "nombre": "Pollo", "cantidad": 100, "unidad": "kilogramos", "confianza": 1 },
            { "nombre": "Arroz", "cantidad": 50, "unidad": "g", "confianza": 1 }
          ]
        }`,
      },
    });
    const res = await POST(makeRequest({ transcript: "x" }) as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    // Sólo el item con unidad válida pasa
    expect(data.items.length).toBe(1);
    expect(data.items[0].nombre).toBe("Arroz");
  });

  it("limpia el wrapping ```json del response", async () => {
    generateContent.mockResolvedValueOnce({
      response: {
        text: () => "```json\n" + JSON.stringify({
          items: [{ nombre: "Arepa", cantidad: 1, unidad: "unidad", confianza: 1 }],
        }) + "\n```",
      },
    });
    const res = await POST(makeRequest({ transcript: "x" }) as never);
    expect(res.status).toBe(200);
  });

  it("retorna 502 cuando Gemini retorna JSON inválido", async () => {
    generateContent.mockResolvedValueOnce({
      response: { text: () => "esto no es json para nada" },
    });
    const res = await POST(makeRequest({ transcript: "x" }) as never);
    expect(res.status).toBe(502);
  });

  it("retorna 504 con code:timeout cuando Gemini tarda demasiado", async () => {
    generateContent.mockReturnValueOnce(new Promise(() => { /* never resolves */ }));
    const res = await POST(makeRequest({ transcript: "x" }) as never);
    expect(res.status).toBe(504);
    const data = await res.json();
    expect(data.code).toBe("timeout");
  });

  it("rechaza transcript > 2000 chars", async () => {
    const long = "a".repeat(2001);
    const res = await POST(makeRequest({ transcript: long }) as never);
    expect(res.status).toBe(400);
  });

  it("descarta items con cantidad inválida (NaN, negativo, 0)", async () => {
    generateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify({
          items: [
            { nombre: "A", cantidad: 0, unidad: "g", confianza: 1 },
            { nombre: "B", cantidad: -5, unidad: "g", confianza: 1 },
            { nombre: "C", cantidad: "abc", unidad: "g", confianza: 1 },
            { nombre: "D", cantidad: 10, unidad: "g", confianza: 1 },
          ],
        }),
      },
    });
    const res = await POST(makeRequest({ transcript: "x" }) as never);
    const data = await res.json();
    expect(data.items.length).toBe(1);
    expect(data.items[0].nombre).toBe("D");
  });
});
