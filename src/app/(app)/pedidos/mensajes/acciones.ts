"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requerirAdmin } from "@/lib/auth";
import { registrar } from "@/lib/registro";

export async function guardarPlantilla(clave: string, _prev: { ok?: string; error?: string } | null, form: FormData) {
  const u = await requerirAdmin();
  const texto = String(form.get("texto") ?? "").trim();
  if (!texto) return { error: "El mensaje no puede quedar vacío." };
  const p = await db.plantilla.update({ where: { clave }, data: { texto } });
  await registrar(u.id, "Editó mensaje de WhatsApp", "Plantilla", clave, p.titulo);
  revalidatePath("/pedidos/mensajes");
  return { ok: "Mensaje guardado." };
}
