"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requerirAdmin } from "@/lib/auth";
import { registrar } from "@/lib/registro";
import { actualizarEstadoPorTareas } from "@/lib/produccion";
import type { FuncionTaller } from "@prisma/client";
import { exigirPermiso } from "@/lib/acceso";

export async function marcarTarea(id: string, terminada: boolean) {
  const u = await exigirPermiso("marcar_tareas");
  const t = await db.tarea.findUniqueOrThrow({ where: { id }, include: { pedido: true, taller: true } });
  if (u.rol === "TALLER" && u.tallerId !== t.tallerId) return;
  await db.tarea.update({ where: { id }, data: { terminada, terminadaEn: terminada ? new Date() : null, terminadaPorId: terminada ? u.id : null } });
  await registrar(u.id, terminada ? "Marcó tarea terminada" : "Desmarcó tarea", "Pedido", t.pedidoId, `N° ${t.pedido.numero} · ${t.taller.nombre}: ${t.prenda}${t.color ? ` ${t.color}` : ""}`);
  await actualizarEstadoPorTareas(t.pedidoId, u.id);
  revalidatePath("/talleres");
  revalidatePath(`/pedidos/${t.pedidoId}`);
}

export async function guardarTaller(id: string | null, _prev: { ok?: string; error?: string } | null, form: FormData) {
  const u = await requerirAdmin();
  const nombre = String(form.get("nombre") ?? "").trim();
  if (!nombre) return { error: "Poné un nombre." };
  const data = {
    nombre,
    especialidad: String(form.get("especialidad") ?? "").trim() || null,
    telefono: String(form.get("telefono") ?? "").trim() || null,
    funcion: String(form.get("funcion") ?? "OTRO") as FuncionTaller,
    activo: form.get("activo") === "on",
  };
  const t = id ? await db.taller.update({ where: { id }, data }) : await db.taller.create({ data });
  await registrar(u.id, id ? "Modificó taller" : "Creó taller", "Taller", t.id, t.nombre);
  revalidatePath("/talleres");
  return { ok: "Taller guardado." };
}
