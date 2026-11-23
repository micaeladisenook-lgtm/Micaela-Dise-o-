import { timingSafeEqual } from "crypto";
import { exportarTodo } from "@/lib/copia";
import { subirASupabase, usaSupabase, cabecerasSupabase } from "@/lib/archivos";

// Copia automática diaria: la llama GitHub Actions con una clave secreta.
// Guarda el archivo en el bucket privado "copias" de Supabase y borra las de más de 30 días.
export async function POST(req: Request) {
  const clave = process.env.COPIA_TOKEN ?? "";
  const enviada = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!clave || enviada.length !== clave.length || !timingSafeEqual(Buffer.from(enviada), Buffer.from(clave))) {
    return new Response("No autorizado", { status: 401 });
  }
  if (!usaSupabase()) return new Response("Falta configurar Supabase", { status: 500 });
  const copia = await exportarTodo();
  const nombre = `copia-${new Date().toISOString().slice(0, 10)}.json`;
  await subirASupabase("copias", nombre, JSON.stringify(copia), "application/json");

  // borrar copias viejas
  const base = process.env.SUPABASE_URL;
  const lista = await fetch(`${base}/storage/v1/object/list/copias`, {
    method: "POST", headers: cabecerasSupabase({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefix: "", limit: 1000 }),
  }).then((r) => r.json()).catch(() => []) as { name: string }[];
  const limite = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const viejas = lista.map((x) => x.name).filter((n) => /^copia-\d{4}-\d{2}-\d{2}\.json$/.test(n) && n.slice(6, 16) < limite);
  if (viejas.length) {
    await fetch(`${base}/storage/v1/object/copias`, {
      method: "DELETE", headers: cabecerasSupabase({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefixes: viejas }),
    });
  }
  return Response.json({ ok: true, archivo: nombre, borradas: viejas.length });
}
