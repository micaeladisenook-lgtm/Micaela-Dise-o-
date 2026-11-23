import "server-only";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Por ahora las fotos se guardan en la carpeta "uploads".
// Al publicar, esto se cambia para guardarlas en Supabase Storage.
export const CARPETA_UPLOADS = path.join(process.cwd(), "uploads");

const TIPOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export async function guardarImagen(archivo: File): Promise<string> {
  const ext = TIPOS[archivo.type];
  if (!ext) throw new Error("Formato de imagen no permitido (usá JPG, PNG o WEBP)");
  if (archivo.size > 8 * 1024 * 1024) throw new Error("La imagen pesa más de 8 MB");
  await mkdir(CARPETA_UPLOADS, { recursive: true });
  const nombre = `${randomUUID()}.${ext}`;
  await writeFile(path.join(CARPETA_UPLOADS, nombre), Buffer.from(await archivo.arrayBuffer()));
  return `/api/archivos/${nombre}`;
}

export async function borrarImagen(url: string) {
  const nombre = url.split("/").pop();
  if (!nombre || nombre.includes("..")) return;
  try {
    await unlink(path.join(CARPETA_UPLOADS, nombre));
  } catch {}
}
