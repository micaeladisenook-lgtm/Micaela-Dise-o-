import { usuarioActual } from "@/lib/auth";
import { exportarTodo } from "@/lib/copia";
import { registrar } from "@/lib/registro";

// Descarga de la copia de seguridad completa (solo administradora)
export async function GET() {
  const u = await usuarioActual();
  if (!u || u.rol !== "ADMIN") return new Response("No autorizado", { status: 403 });
  const copia = await exportarTodo();
  await registrar(u.id, "Descargó copia de seguridad", "Sistema");
  const nombre = `micaela-diseno-copia-${new Date().toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(copia), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${nombre}"` },
  });
}
