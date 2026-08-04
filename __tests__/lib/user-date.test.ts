import { describe, it, expect } from "vitest";
import {
  getUserToday,
  todayInTz,
  tzForCountry,
  todayLocalClient,
  DEFAULT_TZ,
} from "@/lib/user-date";

describe("user-date", () => {
  // 2026-08-04T02:00:00Z = 2026-08-03 21:00 en Bogotá (UTC-5).
  const nightInColombia = new Date("2026-08-04T02:00:00.000Z");

  it("getUserToday(CO) devuelve el día LOCAL, no el UTC (regresión bug nocturno)", () => {
    expect(getUserToday({ countryCode: "CO" }, nightInColombia)).toBe("2026-08-03");
  });

  it("el mismo instante en UTC sería el día siguiente", () => {
    expect(todayInTz("UTC", nightInColombia)).toBe("2026-08-04");
  });

  it("tzForCountry cae al default (Bogotá) para null/desconocido", () => {
    expect(tzForCountry(null)).toBe(DEFAULT_TZ);
    expect(tzForCountry("XX")).toBe(DEFAULT_TZ);
    expect(tzForCountry("MX")).toBe("America/Mexico_City");
  });

  it("todayInTz respeta husos distintos en el mismo instante", () => {
    // Bogotá aún es día 3; Madrid (CEST, UTC+2) ya es día 4.
    expect(todayInTz("America/Bogota", nightInColombia)).toBe("2026-08-03");
    expect(todayInTz("Europe/Madrid", nightInColombia)).toBe("2026-08-04");
  });

  it("todayLocalClient formatea YYYY-MM-DD desde componentes locales", () => {
    const d = new Date(2026, 0, 5, 10, 0, 0); // 2026-01-05 local
    expect(todayLocalClient(d)).toBe("2026-01-05");
  });
});
