import { readFile } from "fs/promises";
import path from "path";
import { CARPETA_UPLOADS } from "@/lib/archivos";

const TIPOS: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
};

export async function GET(_req: Request, { params }: { params: Promise<{ nombre: string }> }) {
  const { nombre } = await params;
  if (!/^[\w-]+\.(jpg|png|webp|svg)$/.test(nombre)) return new Response("No encontrado", { status: 404 });
  try {
    const datos = await readFile(path.join(CARPETA_UPLOADS, nombre));
    const ext = nombre.split(".").pop()!;
    return new Response(datos, {
      headers: { "Content-Type": TIPOS[ext], "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
