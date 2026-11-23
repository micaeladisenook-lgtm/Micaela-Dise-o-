import "server-only";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Fotos de la galería:
// - publicada: se guardan en Supabase Storage (bucket público "disenos")
// - en desarrollo: en la carpeta "uploads"
export const CARPETA_UPLOADS = path.join(process.cwd(), "uploads");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = "disenos";

const TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/svg+xml": "svg" };

export function usaSupabase() {
  return !!(SUPABASE_URL && SUPABASE_KEY);
}

export async function subirASupabase(bucket: string, nombre: string, datos: Buffer | string, tipo: string) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${nombre}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY!, "Content-Type": tipo, "x-upsert": "true" },
    body: typeof datos === "string" ? datos : new Uint8Array(datos),
  });
  if (!r.ok) throw new Error(`No se pudo guardar el archivo (${r.status}).`);
}

export async function guardarImagen(archivo: File): Promise<string> {
  const ext = TIPOS[archivo.type];
  if (!ext) throw new Error("Formato de imagen no permitido (usá JPG, PNG o WEBP)");
  if (archivo.size > 8 * 1024 * 1024) throw new Error("La imagen pesa más de 8 MB");
  const nombre = `${randomUUID()}.${ext}`;
  const datos = Buffer.from(await archivo.arrayBuffer());
  if (usaSupabase()) {
    await subirASupabase(BUCKET, nombre, datos, archivo.type);
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${nombre}`;
  }
  await mkdir(CARPETA_UPLOADS, { recursive: true });
  await writeFile(path.join(CARPETA_UPLOADS, nombre), datos);
  return `/api/archivos/${nombre}`;
}

export async function borrarImagen(url: string) {
  const nombre = url.split("/").pop();
  if (!nombre || nombre.includes("..")) return;
  if (url.startsWith("http") && usaSupabase()) {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${nombre}`, { method: "DELETE", headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY! } }).catch(() => {});
    return;
  }
  try { await unlink(path.join(CARPETA_UPLOADS, nombre)); } catch {}
}
