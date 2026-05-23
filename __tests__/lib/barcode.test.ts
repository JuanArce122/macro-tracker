import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isValidBarcode,
  normalizeBarcode,
  matchesRegion,
  fetchFromOFF,
  normalizeOFFProduct,
} from "@/lib/barcode";

describe("isValidBarcode", () => {
  it("acepta EAN-13 (13 dígitos)", () => {
    expect(isValidBarcode("7702049000123")).toBe(true);
  });

  it("acepta EAN-8 (8 dígitos)", () => {
    expect(isValidBarcode("12345670")).toBe(true);
  });

  it("acepta UPC-A (12 dígitos)", () => {
    expect(isValidBarcode("012345678901")).toBe(true);
  });

  it("rechaza menos de 8 dígitos", () => {
    expect(isValidBarcode("1234567")).toBe(false);
    expect(isValidBarcode("1")).toBe(false);
    expect(isValidBarcode("")).toBe(false);
  });

  it("rechaza más de 13 dígitos", () => {
    expect(isValidBarcode("12345678901234")).toBe(false);
  });

  it("rechaza caracteres no numéricos", () => {
    expect(isValidBarcode("ABCD1234")).toBe(false);
    expect(isValidBarcode("1234 5678")).toBe(false);
    expect(isValidBarcode("12345-678")).toBe(false);
  });
});

describe("normalizeBarcode", () => {
  it("recorta espacios laterales", () => {
    expect(normalizeBarcode("  7702049000123  ")).toBe("7702049000123");
  });

  it("normaliza UPC-A de 11 dígitos agregando leading zero", () => {
    // Algunos scanners reportan UPC-A sin el dígito 0 inicial
    expect(normalizeBarcode("12345678901")).toBe("012345678901");
  });

  it("no toca un EAN-13 válido", () => {
    expect(normalizeBarcode("7702049000123")).toBe("7702049000123");
  });

  it("retorna el input sin cambios si no es numérico (validación es separada)", () => {
    expect(normalizeBarcode("abc")).toBe("abc");
  });
});

describe("matchesRegion", () => {
  it("matchea Colombia con CO", () => {
    expect(matchesRegion(["en:colombia"], "CO")).toBe(true);
  });

  it("matchea con prefix 'es:'", () => {
    expect(matchesRegion(["es:colombia", "en:mexico"], "CO")).toBe(true);
  });

  it("es case-insensitive", () => {
    expect(matchesRegion(["EN:COLOMBIA"], "co")).toBe(true);
  });

  it("retorna false si no hay match", () => {
    expect(matchesRegion(["en:france"], "CO")).toBe(false);
  });

  it("retorna false si no hay countryCode", () => {
    expect(matchesRegion(["en:colombia"], null)).toBe(false);
  });

  it("retorna false si countriesTags es undefined", () => {
    expect(matchesRegion(undefined, "CO")).toBe(false);
  });
});

describe("normalizeOFFProduct", () => {
  it("convierte un producto OFF válido", () => {
    const result = normalizeOFFProduct({
      product_name: "Coca-Cola 250ml",
      nutriments: {
        "energy-kcal_100g": 42,
        proteins_100g: 0,
        carbohydrates_100g: 10.6,
        fat_100g: 0,
      },
    });
    expect(result).toEqual({
      nombre: "Coca-Cola 250ml",
      cal: 42,
      p: 0,
      c: 10.6,
      f: 0,
    });
  });

  it("retorna null si falta product_name", () => {
    expect(normalizeOFFProduct({ nutriments: { "energy-kcal_100g": 100 } })).toBeNull();
  });

  it("retorna null si no tiene datos nutricionales útiles (cal=0 y prot=0)", () => {
    expect(normalizeOFFProduct({
      product_name: "Agua",
      nutriments: { "energy-kcal_100g": 0, proteins_100g: 0 },
    })).toBeNull();
  });

  it("rechaza valores imposibles (>1000 kcal/100g)", () => {
    expect(normalizeOFFProduct({
      product_name: "Glitch",
      nutriments: { "energy-kcal_100g": 5000, proteins_100g: 10 },
    })).toBeNull();
  });

  it("redondea valores a 1 decimal", () => {
    const result = normalizeOFFProduct({
      product_name: "X",
      nutriments: { "energy-kcal_100g": 42.456, proteins_100g: 3.789, carbohydrates_100g: 0, fat_100g: 0 },
    });
    expect(result?.cal).toBe(42.5);
    expect(result?.p).toBe(3.8);
  });
});

describe("fetchFromOFF", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna el JSON cuando OFF responde 200 con producto", async () => {
    const offResponse = {
      status: 1,
      product: { product_name: "Test", nutriments: { "energy-kcal_100g": 100 } },
    };
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => offResponse,
    } as Response)));

    const data = await fetchFromOFF("7702049000123");
    expect(data?.status).toBe(1);
    expect(data?.product?.product_name).toBe("Test");
  });

  it("retorna null cuando OFF responde 404", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      json: async () => ({}),
    } as Response)));

    const data = await fetchFromOFF("0000000000000");
    expect(data).toBeNull();
  });

  it("retorna null si fetch lanza", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }));
    const data = await fetchFromOFF("7702049000123");
    expect(data).toBeNull();
  });
});
