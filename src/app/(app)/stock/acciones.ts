"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { registrar } from "@/lib/registro";
import type { TipoStock } from "@prisma/client";
import { exigirPermiso } from "@/lib/acceso";

type Estado = { ok?: string; error?: string } | null;
const num = (v: FormDataEntryValue | null) => {
  const n = parseFloat(String(v ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};
const txt = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;

export async function guardarItem(id: string | null, _prev: Estado, f: FormData): Promise<Estado> {
  const u = await exigirPermiso("editar_stock");
  const nombre = txt(f.get("nombre"));
  const categoria = txt(f.get("categoria"));
  if (!nombre || !categoria) return { error: "Completá nombre y categoría." };
  const data = {
    nombre, categoria,
    tipo: (String(f.get("tipo") ?? "INSUMO") as TipoStock),
    color: txt(f.get("color")), talle: txt(f.get("talle")), tela: txt(f.get("tela")),
    unidad: txt(f.get("unidad")) ?? "unidades",
    minimo: Math.max(0, num(f.get("minimo")) || 0),
    productoId: txt(f.get("productoId")),
    activo: id ? f.get("activo") === "on" : true,
  };
  if (id) {
    await db.itemStock.update({ where: { id }, data });
    await registrar(u.id, "Modificó ítem de stock", "Stock", id, nombre);
    revalidatePath("/stock");
    return { ok: "Guardado." };
  }
  const inicial = num(f.get("cantidad")) || 0;
  const it = await db.itemStock.create({ data: { ...data, cantidad: inicial } });
  if (inicial) await db.movimientoStock.create({ data: { itemId: it.id, cantidad: inicial, motivo: "Stock inicial", usuarioId: u.id } });
  await registrar(u.id, "Creó ítem de stock", "Stock", it.id, `${nombre} (${inicial} ${data.unidad})`);
  revalidatePath("/stock");
  return { ok: `"${nombre}" agregado.` };
}

export async function moverStock(id: string, _prev: Estado, f: FormData): Promise<Estado> {
  const u = await exigirPermiso("editar_stock");
  const cant = num(f.get("cantidad"));
  const tipo = String(f.get("tipo"));
  if (!cant || cant <= 0) return { error: "Poné una cantidad." };
  const it = await db.itemStock.findUniqueOrThrow({ where: { id } });
  let delta = cant;
  if (tipo === "salida") delta = -cant;
  if (tipo === "ajuste") delta = cant - it.cantidad;
  const motivo = txt(f.get("motivo")) ?? (tipo === "entrada" ? "Compra / ingreso" : tipo === "salida" ? "Salida manual" : "Conteo / ajuste");
  await db.$transaction([
    db.itemStock.update({ where: { id }, data: { cantidad: { increment: delta } } }),
    db.movimientoStock.create({ data: { itemId: id, cantidad: delta, motivo, usuarioId: u.id } }),
  ]);
  await registrar(u.id, "Movió stock", "Stock", id, `${it.nombre}: ${delta > 0 ? "+" : ""}${delta} ${it.unidad} (${motivo})`);
  revalidatePath("/stock");
  revalidatePath(`/stock/${id}`);
  return { ok: "Listo." };
}

export async function borrarItem(id: string) {
  const u = await exigirPermiso("administrar_stock");
  const it = await db.itemStock.delete({ where: { id } });
  await registrar(u.id, "Borró ítem de stock", "Stock", id, it.nombre);
  revalidatePath("/stock");
  redirect("/stock");
}

export async function crearTelasPorColor(tela: string) {
  const u = await exigirPermiso("administrar_stock");
  const colores = (await db.producto.findFirst({ where: { nombre: { startsWith: "Bata diseñada de satén" } } }))?.colores ?? [];
  let n = 0;
  for (const color of colores) {
    const existe = await db.itemStock.findFirst({ where: { categoria: "Telas", tela, color } });
    if (existe) continue;
    await db.itemStock.create({ data: { tipo: "INSUMO", categoria: "Telas", tela, color, nombre: `${tela} ${color}`, unidad: "metros" } });
    n++;
  }
  await registrar(u.id, "Creó telas por color", "Stock", null, `${tela}: ${n} colores`);
  revalidatePath("/stock");
}

export async function agregarConsumo(_prev: Estado, f: FormData): Promise<Estado> {
  const u = await exigirPermiso("administrar_stock");
  const productoId = txt(f.get("productoId"));
  const origen = String(f.get("origen") ?? "");
  const cantidad = num(f.get("cantidad"));
  if (!productoId || !origen || !cantidad || cantidad <= 0) return { error: "Completá producto, insumo y cantidad." };
  const data = origen.startsWith("tela:") ? { tela: origen.slice(5) } : { itemId: origen };
  await db.consumoProducto.create({ data: { productoId, cantidad, ...data } });
  await registrar(u.id, "Agregó consumo de insumo", "Stock", productoId, `${cantidad} de ${origen.replace("tela:", "tela ")}`);
  revalidatePath("/stock");
  return { ok: "Consumo agregado." };
}

export async function borrarConsumo(id: string) {
  await exigirPermiso("administrar_stock");
  await db.consumoProducto.delete({ where: { id } });
  revalidatePath("/stock");
}
