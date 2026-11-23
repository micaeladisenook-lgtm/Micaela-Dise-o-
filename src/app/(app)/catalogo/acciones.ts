"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

import { registrar } from "@/lib/registro";
import { leerPesos, pesos } from "@/lib/formato";
import type { TipoProducto } from "@prisma/client";
import { exigirPermiso } from "@/lib/acceso";

export type EstadoForm = { error?: string; ok?: string } | null;

function num(v: FormDataEntryValue | null): number | null {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function leer(form: FormData) {
  const lista = (k: string) => String(form.get(k) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return {
    nombre: String(form.get("nombre") ?? "").trim(),
    tipo: String(form.get("tipo") ?? "SUELTO") as TipoProducto,
    descripcion: String(form.get("descripcion") ?? "").trim() || null,
    precio: leerPesos(String(form.get("precio") ?? "")),
    precioAnterior: leerPesos(String(form.get("precioAnterior") ?? "")),
    enListaPrecios: form.get("enListaPrecios") === "on",
    colores: lista("colores"),
    talles: lista("talles"),
    activo: form.get("activo") === "on",
    pesoGramos: num(form.get("pesoKg")) != null ? Math.round(num(form.get("pesoKg"))! * 1000) : null,
    altoCm: num(form.get("altoCm")),
    anchoCm: num(form.get("anchoCm")),
    largoCm: num(form.get("largoCm")),
    orden: parseInt(String(form.get("orden") ?? "0"), 10) || 0,
  };
}

function leerComponentes(form: FormData) {
  return form.getAll("componente").map(String).map((cid) => ({
    componenteId: cid,
    cantidad: Math.max(1, parseInt(String(form.get(`cantidad_${cid}`) ?? "1"), 10) || 1),
    opcional: form.get(`opcional_${cid}`) === "on",
    aEleccion: form.get(`eleccion_${cid}`) === "on",
  }));
}

function revalidar() {
  revalidatePath("/catalogo");
  revalidatePath("/lista-precios");
}

export async function crearProducto(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await exigirPermiso("editar_precios");
  const datos = leer(form);
  if (!datos.nombre) return { error: "El nombre es obligatorio." };
  const p = await db.producto.create({
    data: { ...datos, componentes: { create: leerComponentes(form) } },
  });
  await registrar(u.id, "Creó producto", "Producto", p.id, `${p.nombre} · ${pesos(p.precio)}`);
  revalidar();
  redirect("/catalogo");
}

export async function actualizarProducto(id: string, _prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await exigirPermiso("editar_precios");
  const datos = leer(form);
  if (!datos.nombre) return { error: "El nombre es obligatorio." };
  const antes = await db.producto.findUniqueOrThrow({ where: { id } });
  await db.$transaction([
    db.componenteBox.deleteMany({ where: { boxId: id } }),
    db.producto.update({ where: { id }, data: { ...datos, componentes: { create: leerComponentes(form) } } }),
  ]);
  const cambioPrecio = antes.precio !== datos.precio ? ` · precio ${pesos(antes.precio)} → ${pesos(datos.precio)}` : "";
  await registrar(u.id, "Modificó producto", "Producto", id, `${datos.nombre}${cambioPrecio}`);
  revalidar();
  return { ok: "Cambios guardados." };
}

export async function borrarProducto(id: string) {
  const u = await exigirPermiso("editar_precios");
  const p = await db.producto.delete({ where: { id } });
  await registrar(u.id, "Borró producto", "Producto", id, p.nombre);
  revalidar();
  redirect("/catalogo");
}

export async function guardarPrecios(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await exigirPermiso("editar_precios");
  const productos = await db.producto.findMany();
  const cambios: string[] = [];
  for (const p of productos) {
    const campo = form.get(`precio_${p.id}`);
    if (campo === null) continue;
    const nuevo = leerPesos(String(campo));
    if (nuevo !== p.precio) {
      await db.producto.update({ where: { id: p.id }, data: { precio: nuevo } });
      cambios.push(`${p.nombre}: ${pesos(p.precio)} → ${pesos(nuevo)}`);
    }
  }
  if (cambios.length === 0) return { ok: "No había cambios para guardar." };
  await registrar(u.id, "Actualizó precios", "Producto", null, cambios.join(" | "));
  revalidar();
  return { ok: `Listo: se actualizaron ${cambios.length} precio${cambios.length === 1 ? "" : "s"}.` };
}
