"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { registrar } from "@/lib/registro";
import { actualizarEstadoPorTareas } from "@/lib/produccion";
import type { EtapaTarea, FuncionTaller } from "@prisma/client";
import { exigirPermiso } from "@/lib/acceso";
import { NOMBRE_ETAPA } from "@/lib/etapas";

// Mueve un trabajo a una columna del tablero (Recibido → En producción → Listo para entregar)
export async function moverTarea(id: string, etapa: EtapaTarea) {
  const u = await exigirPermiso("marcar_tareas");
  const t = await db.tarea.findUniqueOrThrow({ where: { id }, include: { pedido: true, taller: true } });
  if (u.rol === "TALLER" && u.tallerId !== t.tallerId) return;
  if (t.etapa === etapa) return;
  const terminada = etapa === "LISTO";
  await db.tarea.update({
    where: { id },
    data: { etapa, terminada, ...(terminada !== t.terminada ? { terminadaEn: terminada ? new Date() : null, terminadaPorId: terminada ? u.id : null } : {}) },
  });
  await registrar(u.id, `Pasó tarea a «${NOMBRE_ETAPA[etapa]}»`, "Pedido", t.pedidoId, `N° ${t.pedido.numero} · ${t.taller.nombre}: ${t.prenda}${t.color ? ` ${t.color}` : ""}`);
  if (terminada !== t.terminada) await actualizarEstadoPorTareas(t.pedidoId, u.id);
  revalidatePath("/talleres");
  revalidatePath(`/pedidos/${t.pedidoId}`);
}

// Casilla de la ficha del pedido: tildar = listo; destildar = vuelve a "En producción"
export async function marcarTarea(id: string, terminada: boolean) {
  await moverTarea(id, terminada ? "LISTO" : "EN_PRODUCCION");
}

export async function guardarTaller(id: string | null, _prev: { ok?: string; error?: string } | null, form: FormData) {
  const u = await exigirPermiso("editar_talleres");
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
