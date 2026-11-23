"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

import { registrar } from "@/lib/registro";
import { leerPesos, pesos } from "@/lib/formato";
import { leerFecha } from "@/lib/pedidos";
import { exigirPermiso } from "@/lib/acceso";

export async function crearGasto(_prev: { ok?: string; error?: string } | null, f: FormData) {
  const u = await exigirPermiso("ver_gastos");
  const monto = leerPesos(String(f.get("monto") ?? ""));
  const categoria = String(f.get("categoria") ?? "").trim();
  if (!monto) return { error: "Poné el monto." };
  if (!categoria) return { error: "Elegí la categoría." };
  const g = await db.gasto.create({
    data: {
      monto, categoria,
      fecha: leerFecha(f.get("fecha")) ?? new Date(),
      descripcion: String(f.get("descripcion") ?? "").trim() || null,
      medio: String(f.get("medio") ?? "").trim() || null,
      tallerId: String(f.get("tallerId") ?? "") || null,
      creadoPorId: u.id,
    },
  });
  await registrar(u.id, "Cargó gasto", "Gasto", g.id, `${categoria} · ${pesos(monto)}`);
  revalidatePath("/gastos");
  revalidatePath("/");
  return { ok: `Gasto de ${pesos(monto)} cargado.` };
}

export async function borrarGasto(id: string) {
  const u = await exigirPermiso("ver_gastos");
  const g = await db.gasto.delete({ where: { id } });
  await registrar(u.id, "Borró gasto", "Gasto", id, `${g.categoria} · ${pesos(g.monto)}`);
  revalidatePath("/gastos");
}
