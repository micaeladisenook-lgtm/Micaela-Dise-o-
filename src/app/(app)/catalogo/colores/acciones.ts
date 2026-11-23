"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { registrar } from "@/lib/registro";
import { exigirPermiso } from "@/lib/acceso";
import { guardarImagen, borrarImagen } from "@/lib/archivos";
import { coloresDelCatalogo, TELAS } from "@/lib/colores";

export async function subirFotoColor(color: string, tela: string, fd: FormData): Promise<{ ok?: true; error?: string }> {
  const u = await exigirPermiso("gestionar_disenos");
  if (!(TELAS as readonly string[]).includes(tela) || !(await coloresDelCatalogo()).includes(color)) return { error: "Color no encontrado." };
  const archivo = fd.get("foto");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elegí una foto." };
  let imagen: string;
  try { imagen = await guardarImagen(archivo, { permitirSvg: false }); } catch (e) { return { error: (e as Error).message }; }
  const antes = await db.fotoColor.findUnique({ where: { color_tela: { color, tela } } });
  await db.fotoColor.upsert({ where: { color_tela: { color, tela } }, update: { imagen }, create: { color, tela, imagen } });
  if (antes) await borrarImagen(antes.imagen);
  await registrar(u.id, antes ? "Cambió foto de color" : "Subió foto de color", "FotoColor", null, `${color} · ${tela}`);
  revalidatePath("/catalogo/colores");
  revalidatePath("/pedido");
  return { ok: true };
}

export async function borrarFotoColor(color: string, tela: string) {
  const u = await exigirPermiso("gestionar_disenos");
  const f = await db.fotoColor.delete({ where: { color_tela: { color, tela } } }).catch(() => null);
  if (!f) return;
  await borrarImagen(f.imagen);
  await registrar(u.id, "Borró foto de color", "FotoColor", null, `${color} · ${tela}`);
  revalidatePath("/catalogo/colores");
}
