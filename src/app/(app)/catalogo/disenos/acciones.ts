"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

import { registrar } from "@/lib/registro";
import { guardarImagen, borrarImagen } from "@/lib/archivos";
import type { CategoriaDiseno } from "@prisma/client";
import { exigirPermiso } from "@/lib/acceso";

export type EstadoForm = { error?: string; ok?: string } | null;

export async function subirDiseno(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await exigirPermiso("ver_catalogo");
  const nombre = String(form.get("nombre") ?? "").trim();
  const categoria = String(form.get("categoria") ?? "BORDADO") as CategoriaDiseno;
  const productoId = String(form.get("productoId") ?? "") || null;
  const descripcion = String(form.get("descripcion") ?? "").trim() || null;
  const archivo = form.get("imagen");
  if (!nombre) return { error: "Poné un nombre al diseño." };
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elegí una foto." };
  let imagen: string;
  try {
    imagen = await guardarImagen(archivo);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const d = await db.diseno.create({ data: { nombre, categoria, productoId, descripcion, imagen } });
  await registrar(u.id, "Subió diseño", "Diseno", d.id, nombre);
  revalidatePath("/catalogo/disenos");
  return { ok: `"${nombre}" se agregó a la galería.` };
}

export async function borrarDiseno(id: string) {
  const u = await exigirPermiso("ver_catalogo");
  const d = await db.diseno.delete({ where: { id } });
  await borrarImagen(d.imagen);
  await registrar(u.id, "Borró diseño", "Diseno", id, d.nombre);
  revalidatePath("/catalogo/disenos");
}
