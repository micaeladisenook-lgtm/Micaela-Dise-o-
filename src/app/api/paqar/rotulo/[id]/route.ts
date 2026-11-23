import { db } from "@/lib/db";
import { usuarioActual } from "@/lib/auth";
import { permisosDe } from "@/lib/acceso";
import { rotuloPaqar } from "@/lib/paqar";

// Descarga el rótulo oficial de Correo Argentino de un pedido
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await usuarioActual();
  if (!u || !(await permisosDe(u)).has("ver_envios")) return new Response("No autorizado", { status: 403 });
  const { id } = await params;
  const p = await db.pedido.findUnique({ where: { id }, select: { numeroSeguimiento: true, numero: true } });
  if (!p?.numeroSeguimiento) return new Response("El pedido no tiene envío generado en Correo Argentino.", { status: 404 });
  try {
    const { pdf, nombre } = await rotuloPaqar(p.numeroSeguimiento);
    return new Response(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nombre}"`, "Cache-Control": "no-store" },
    });
  } catch (e) {
    return new Response(`No se pudo obtener el rótulo: ${(e as Error).message}`, { status: 502 });
  }
}
