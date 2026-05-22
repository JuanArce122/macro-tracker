import { ZodError, ZodSchema } from "zod";
import { NextRequest } from "next/server";

/**
 * Helper para validar el body JSON de una request con un schema Zod.
 *
 * Uso típico:
 *
 *   const parsed = await validateBody(req, MealCreateSchema);
 *   if (!parsed.ok) return parsed.response;
 *   const data = parsed.data; // tipado
 *
 * Retorna en formato discriminated union para forzar al caller a manejar el error.
 */
export type ValidateResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

export async function validateBody<T>(
  req: NextRequest | Request,
  schema: ZodSchema<T>
): Promise<ValidateResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: "Body JSON inválido" },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: Response.json(
        {
          error: "Datos inválidos",
          issues: formatZodIssues(result.error),
        },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: result.data };
}

/**
 * Convierte errores Zod a un formato compacto para clientes.
 *
 *   [{ path: "weightG", message: "Debe ser mayor o igual a 0" }]
 */
export function formatZodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
