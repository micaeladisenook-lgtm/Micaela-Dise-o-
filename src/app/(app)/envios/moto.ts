"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requerirAdmin } from "@/lib/auth";
import { registrar } from "@/lib/registro";
import { pesos } from "@/lib/formato";

const precioDe = (v: unknown) => parseInt(String(v ?? "").replace(/\D/g, "")) || 0;

export async function guardarTarifaMoto(id: string, precio: string) {
  const u = await requerirAdmin();
  const p = precioDe(precio);
  if (p <= 0) return { error: "Precio inválido." };
  const t = await db.tarifaMoto.update({ where: { id }, data: { precio: p } });
  await registrar(u.id, "Cambió tarifa de motomensajería", "Sistema", null, `${t.localidad} (${t.zona}) · ${pesos(p)}`);
  revalidatePath("/envios");
  return { ok: "Guardado." };
}

export async function agregarTarifaMoto(_prev: { ok?: string; error?: string } | null, f: FormData) {
  const u = await requerirAdmin();
  const zona = String(f.get("zona") ?? "").trim();
  const localidad = String(f.get("localidad") ?? "").trim();
  const precio = precioDe(f.get("precio"));
  if (!zona || !localidad || precio <= 0) return { error: "Completá zona, localidad y precio." };
  const existe = await db.tarifaMoto.findUnique({ where: { zona_localidad: { zona, localidad } } });
  if (existe) return { error: `${localidad} ya está en ${zona}.` };
  await db.tarifaMoto.create({ data: { zona, localidad, precio } });
  await registrar(u.id, "Agregó tarifa de motomensajería", "Sistema", null, `${localidad} (${zona}) · ${pesos(precio)}`);
  revalidatePath("/envios");
  return { ok: `Agregada: ${localidad} · ${pesos(precio)}.` };
}

export async function borrarTarifaMoto(id: string) {
  const u = await requerirAdmin();
  const t = await db.tarifaMoto.delete({ where: { id } });
  await registrar(u.id, "Borró tarifa de motomensajería", "Sistema", null, `${t.localidad} (${t.zona})`);
  revalidatePath("/envios");
  return { ok: "Borrada." };
}

// Aumento por porcentaje a toda una zona (o a todas), redondeado a $100
export async function aumentarTarifasMoto(zona: string, porcentaje: number) {
  const u = await requerirAdmin();
  if (!Number.isFinite(porcentaje) || porcentaje === 0 || Math.abs(porcentaje) > 200) return { error: "Porcentaje inválido." };
  const tarifas = await db.tarifaMoto.findMany({ where: zona ? { zona } : {} });
  await db.$transaction(tarifas.map((t) => db.tarifaMoto.update({ where: { id: t.id }, data: { precio: Math.round((t.precio * (1 + porcentaje / 100)) / 100) * 100 } })));
  await registrar(u.id, "Aumentó tarifas de motomensajería", "Sistema", null, `${zona || "Todas las zonas"} · ${porcentaje}%`);
  revalidatePath("/envios");
  return { ok: `Listo: ${tarifas.length} precios actualizados (${porcentaje > 0 ? "+" : ""}${porcentaje}%).` };
}
