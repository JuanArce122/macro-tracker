import { describe, it, expect } from "vitest";
import {
  LAC_COUNTRIES,
  getCountryByCode,
  isValidCountryCode,
  REGION_FLAGS,
} from "@/lib/regions";

describe("LAC_COUNTRIES", () => {
  it("includes Colombia first (HU-12 D5)", () => {
    expect(LAC_COUNTRIES[0].code).toBe("CO");
    expect(LAC_COUNTRIES[0].name).toBe("Colombia");
  });

  it("all codes are ISO 3166-1 alpha-2 (2 uppercase chars)", () => {
    for (const country of LAC_COUNTRIES) {
      expect(country.code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("all countries have a flag emoji", () => {
    for (const country of LAC_COUNTRIES) {
      expect(country.flag).not.toBe("");
      expect(country.flag.length).toBeGreaterThan(0);
    }
  });

  it("includes the core LATAM markets", () => {
    const codes = LAC_COUNTRIES.map((c) => c.code);
    expect(codes).toContain("CO");
    expect(codes).toContain("MX");
    expect(codes).toContain("AR");
    expect(codes).toContain("PE");
    expect(codes).toContain("CL");
  });
});

describe("getCountryByCode", () => {
  it("returns Colombia for 'CO'", () => {
    const c = getCountryByCode("CO");
    expect(c?.name).toBe("Colombia");
  });

  it("returns null for unknown code", () => {
    expect(getCountryByCode("XX")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(getCountryByCode(null)).toBeNull();
  });
});

describe("isValidCountryCode", () => {
  it("accepts CO", () => {
    expect(isValidCountryCode("CO")).toBe(true);
  });

  it("rejects unknown codes", () => {
    expect(isValidCountryCode("XX")).toBe(false);
  });

  it("rejects null and empty", () => {
    expect(isValidCountryCode(null)).toBe(false);
    expect(isValidCountryCode("")).toBe(false);
  });

  it("is case sensitive (requires uppercase)", () => {
    expect(isValidCountryCode("co")).toBe(false);
  });
});

describe("REGION_FLAGS", () => {
  it("maps CO to Colombian flag", () => {
    expect(REGION_FLAGS.CO).toBe("🇨🇴");
  });

  it("maps LAC to a generic latam flag", () => {
    expect(REGION_FLAGS.LAC).toBeDefined();
  });
});
