"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

import { registrar } from "@/lib/registro";
import { exigirPermiso } from "@/lib/acceso";

export async function guardarPlantilla(clave: string, _prev: { ok?: string; error?: string } | null, form: FormData) {
  const u = await exigirPermiso("editar_mensajes");
  const texto = String(form.get("texto") ?? "").trim();
  if (!texto) return { error: "El mensaje no puede quedar vacío." };
  const p = await db.plantilla.update({ where: { clave }, data: { texto } });
  await registrar(u.id, "Editó mensaje de WhatsApp", "Plantilla", clave, p.titulo);
  revalidatePath("/pedidos/mensajes");
  return { ok: "Mensaje guardado." };
}
