"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { registrar } from "@/lib/registro";
import { exigirPermiso } from "@/lib/acceso";

export type EstadoRespuesta = { ok?: string; error?: string } | null;

export async function guardarRespuesta(clave: string | null, _prev: EstadoRespuesta, f: FormData): Promise<EstadoRespuesta> {
  const u = await exigirPermiso("editar_mensajes");
  const titulo = String(f.get("titulo") ?? "").trim();
  const texto = String(f.get("texto") ?? "").trim();
  if (!titulo) return { error: "Poné un título (ej: Precios)." };
  if (!texto) return { error: "El texto no puede quedar vacío." };
  if (clave) {
    if (!clave.startsWith("rr_")) return { error: "Respuesta no encontrada." };
    await db.plantilla.update({ where: { clave }, data: { titulo, texto } });
    await registrar(u.id, "Editó respuesta rápida", "Plantilla", clave, titulo);
  } else {
    const nueva = `rr_${Date.now()}`;
    await db.plantilla.create({ data: { clave: nueva, titulo, texto } });
    await registrar(u.id, "Creó respuesta rápida", "Plantilla", nueva, titulo);
  }
  revalidatePath("/respuestas");
  return { ok: "Guardada." };
}

export async function borrarRespuesta(clave: string) {
  const u = await exigirPermiso("editar_mensajes");
  if (!clave.startsWith("rr_")) return;
  const p = await db.plantilla.delete({ where: { clave } });
  await registrar(u.id, "Borró respuesta rápida", "Plantilla", clave, p.titulo);
  revalidatePath("/respuestas");
}
