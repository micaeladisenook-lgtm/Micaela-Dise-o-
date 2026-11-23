"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

import { registrar } from "@/lib/registro";
import { exigirPermiso } from "@/lib/acceso";

export type EstadoForm = { error?: string; ok?: string } | null;

function leer(form: FormData) {
  const t = (k: string) => {
    const v = String(form.get(k) ?? "").trim();
    return v === "" ? null : v;
  };
  let instagram = t("instagram");
  if (instagram) instagram = "@" + instagram.replace(/^@+/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
  return {
    nombre: t("nombre") ?? "",
    telefono: t("telefono"),
    instagram,
    email: t("email")?.toLowerCase() ?? null,
    direccion: t("direccion"),
    notas: t("notas"),
  };
}

async function telefonoRepetido(telefono: string | null, excluirId?: string) {
  if (!telefono) return null;
  const digitos = telefono.replace(/\D/g, "").slice(-8);
  if (digitos.length < 8) return null;
  const todos = await db.cliente.findMany({
    where: { telefono: { not: null }, ...(excluirId ? { id: { not: excluirId } } : {}) },
    select: { id: true, numero: true, nombre: true, telefono: true },
  });
  return todos.find((c) => c.telefono!.replace(/\D/g, "").endsWith(digitos)) ?? null;
}

export async function crearCliente(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await exigirPermiso("ver_clientes");
  const datos = leer(form);
  if (!datos.nombre) return { error: "El nombre es obligatorio." };
  const repetida = await telefonoRepetido(datos.telefono);
  if (repetida && form.get("confirmarRepetido") !== "1") {
    return { error: `Ya existe la clienta N° ${repetida.numero} (${repetida.nombre}) con ese teléfono. Si igual querés crearla, volvé a tocar "Guardar".` };
  }
  const c = await db.cliente.create({ data: { ...datos, creadoPorId: u.id } });
  await registrar(u.id, "Creó clienta", "Cliente", c.id, `N° ${c.numero} · ${c.nombre}`);
  revalidatePath("/clientes");
  redirect(`/clientes/${c.id}?creada=1`);
}

export async function actualizarCliente(id: string, _prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await exigirPermiso("ver_clientes");
  const datos = leer(form);
  if (!datos.nombre) return { error: "El nombre es obligatorio." };
  const c = await db.cliente.update({ where: { id }, data: datos });
  await registrar(u.id, "Modificó clienta", "Cliente", c.id, `N° ${c.numero} · ${c.nombre}`);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: "Cambios guardados." };
}

export async function borrarCliente(id: string) {
  const u = await exigirPermiso("borrar_clientes");
  if (await db.pedido.count({ where: { clienteId: id } })) throw new Error("La clienta tiene pedidos: no se puede borrar.");
  const c = await db.cliente.delete({ where: { id } });
  await registrar(u.id, "Borró clienta", "Cliente", id, `N° ${c.numero} · ${c.nombre}`);
  revalidatePath("/clientes");
  redirect("/clientes");
}
