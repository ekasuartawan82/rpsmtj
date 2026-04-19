import { requireAnyRole } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import { exportRpsHtml } from "@/services/rps/export";
import type { RpsDocumentActorRole } from "@/services/rps/export/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireAnyRole(["dosen", "koordinator_rmk", "kaprodi"]);
    const { id } = await context.params;
    const rpsId = ensureRecordId(id);

    const html = await exportRpsHtml(rpsId, {
      actorUserId: session.user.id,
      actorRole: session.user.role as RpsDocumentActorRole,
    });

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 422) {
      // RPS belum approved — tampilkan halaman info
      return new Response(
        `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RPS belum siap cetak</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f7; }
    .card { background: white; border-radius: 20px; padding: 48px; max-width: 480px;
            text-align: center; box-shadow: 0 12px 40px rgba(0,0,0,.08); }
    h1 { font-size: 22px; font-weight: 700; color: #1d1d1f; margin: 0 0 12px; }
    p  { font-size: 14px; color: #6e6e73; line-height: 1.6; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>RPS Belum Siap Cetak</h1>
    <p>Dokumen RPS hanya dapat dicetak setelah berstatus <strong>Approved</strong>.<br>
       Ajukan RPS melalui alur persetujuan terlebih dahulu.</p>
  </div>
</body>
</html>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    return handleRouteError(error);
  }
}
