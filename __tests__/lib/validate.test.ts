import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validateBody, formatZodIssues } from "@/lib/api/validate";

const TestSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
});

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("validateBody", () => {
  it("returns ok=true with parsed data on valid input", async () => {
    const req = makeRequest({ name: "Juan", age: 30 });
    const result = await validateBody(req, TestSchema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Juan");
      expect(result.data.age).toBe(30);
    }
  });

  it("returns 400 response for invalid JSON", async () => {
    const req = makeRequest("not-json");
    const result = await validateBody(req, TestSchema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const json = await result.response.json();
      expect(json.error).toContain("JSON inválido");
    }
  });

  it("returns 400 with issues array on schema mismatch", async () => {
    const req = makeRequest({ name: "", age: -5 });
    const result = await validateBody(req, TestSchema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const json = await result.response.json();
      expect(json.error).toBe("Datos inválidos");
      expect(Array.isArray(json.issues)).toBe(true);
      expect(json.issues.length).toBeGreaterThan(0);
      expect(json.issues[0]).toHaveProperty("path");
      expect(json.issues[0]).toHaveProperty("message");
    }
  });
});

describe("formatZodIssues", () => {
  it("joins path segments with dots", () => {
    const result = TestSchema.safeParse({ name: 123, age: -1 });
    if (!result.success) {
      const issues = formatZodIssues(result.error);
      expect(issues.length).toBe(2);
      expect(issues.map((i) => i.path)).toContain("name");
      expect(issues.map((i) => i.path)).toContain("age");
    }
  });
});
