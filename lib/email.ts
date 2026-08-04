import { Resend } from "resend";

// Lazy: `new Resend(undefined)` lanza al instanciar. Inicializar a nivel
// de módulo rompe el build de Vercel cuando RESEND_API_KEY no está
// presente en el entorno (ej. previews sin secrets de prod). La
// inicialización tardía mueve esa restricción al primer call real.
let cached: Resend | null = null;
function getResend(): Resend {
  if (!cached) {
    cached = new Resend(process.env.RESEND_API_KEY);
  }
  return cached;
}

/**
 * Remitente verificado. Falla ruidosamente si no está configurado — así una
 * mala config se ve en los logs en vez de "entregar" silenciosamente al sandbox
 * onboarding@resend.dev (que solo llega al dueño de la cuenta de Resend) (I5).
 */
function getFromEmail(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL no configurada. Usa un dominio verificado en Resend.");
  }
  return from;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const { error } = await getResend().emails.send({
    from: getFromEmail(),
    to,
    subject: "Recupera tu contraseña — Macro Tracker",
    html: buildResetEmail(resetUrl),
  });

  if (error) throw new Error(error.message);
}

/**
 * Envía el snapshot de exportación al usuario antes de eliminar su cuenta (HU-10, GDPR).
 *
 * `exportUrl` es un link público de Vercel Blob con tiempo de vida limitado.
 * Se envía como link y no como adjunto porque el JSON puede pesar varios MB.
 */
export async function sendAccountDeletionExport(to: string, exportUrl: string) {
  const { error } = await getResend().emails.send({
    from: getFromEmail(),
    to,
    subject: "Tus datos exportados — Macro Tracker",
    html: buildDeletionExportEmail(exportUrl),
  });

  if (error) throw new Error(error.message);
}

function buildResetEmail(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recupera tu contraseña</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:24px;border:1px solid #e5e7eb;overflow:hidden;">

          <!-- Header verde -->
          <tr>
            <td style="background:#10b981;padding:32px 32px 28px;text-align:center;">
              <div style="width:52px;height:52px;background:rgba(255,255,255,0.2);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                <span style="color:white;font-size:24px;font-weight:900;line-height:52px;display:block;">M</span>
              </div>
              <p style="margin:0;color:white;font-size:20px;font-weight:700;">Macro Tracker</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Recupera tu contraseña</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si fuiste tú, haz clic en el botón de abajo.
              </p>

              <!-- Botón CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;background:#10b981;color:white;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:14px;">
                      Restablecer contraseña
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Aviso de expiración -->
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#6b7280;">
                  ⏱ Este enlace expira en <strong>15 minutos</strong>.
                </p>
              </div>

              <!-- Fallback URL -->
              <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
              <p style="margin:0;font-size:12px;color:#10b981;word-break:break-all;">${resetUrl}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">
                Si no solicitaste este cambio, puedes ignorar este email. Tu contraseña no se modificará.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildDeletionExportEmail(exportUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tus datos — Macro Tracker</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:24px;border:1px solid #e5e7eb;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#10b981;padding:32px 32px 28px;text-align:center;">
              <div style="width:52px;height:52px;background:rgba(255,255,255,0.2);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                <span style="color:white;font-size:24px;font-weight:900;line-height:52px;display:block;">M</span>
              </div>
              <p style="margin:0;color:white;font-size:20px;font-weight:700;">Macro Tracker</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Tus datos antes de la eliminación</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                Eliminaste tu cuenta de Macro Tracker. Antes de borrar todo, generamos un archivo JSON con tu historial completo (cumplimiento GDPR/LGPD).
              </p>

              <!-- Botón CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a href="${exportUrl}"
                       style="display:inline-block;background:#10b981;color:white;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:14px;">
                      Descargar mis datos (JSON)
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Aviso de expiración -->
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#6b7280;">
                  ⏱ Este enlace estará disponible <strong>por tiempo limitado</strong>. Descarga el archivo cuanto antes y guárdalo en un lugar seguro.
                </p>
              </div>

              <!-- Fallback URL -->
              <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
              <p style="margin:0;font-size:12px;color:#10b981;word-break:break-all;">${exportUrl}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">
                Gracias por usar Macro Tracker. Tu información ya fue eliminada permanentemente.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
