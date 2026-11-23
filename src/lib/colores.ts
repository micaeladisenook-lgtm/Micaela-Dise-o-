import "server-only";
import { db } from "./db";

export const TELAS = ["Satén", "Plush"] as const;
export type Tela = (typeof TELAS)[number];


// Todos los colores que usan los productos, en el orden en que están cargados
export async function coloresDelCatalogo() {
  const productos = await db.producto.findMany({ where: { activo: true }, select: { colores: true }, orderBy: { orden: "asc" } });
  const vistos = new Set<string>();
  for (const p of [...productos].sort((a, b) => b.colores.length - a.colores.length)) for (const c of p.colores) vistos.add(c);
  return [...vistos];
}

// { "Satén": { "Rosa viejo": url, … }, "Plush": { … } }
export async function fotosDeColores(): Promise<Record<string, Record<string, string>>> {
  const fotos = await db.fotoColor.findMany();
  const r: Record<string, Record<string, string>> = { "Satén": {}, Plush: {} };
  for (const f of fotos) (r[f.tela] ??= {})[f.color] = f.imagen;
  return r;
}
