import "server-only";
import { db } from "./db";

export function digitosTel(tel: string | null | undefined) {
  return (tel ?? "").replace(/\D/g, "");
}

// Busca una clienta por los últimos 8 dígitos del teléfono
export async function clientePorTelefono(tel: string | null | undefined) {
  const d = digitosTel(tel).slice(-8);
  if (d.length < 8) return null;
  const candidatas = await db.cliente.findMany({ where: { telefono: { contains: d.slice(-4) } } });
  return candidatas.find((c) => digitosTel(c.telefono).endsWith(d)) ?? null;
}

export function normalizarInstagram(ig: string | null | undefined) {
  const v = (ig ?? "").trim();
  if (!v) return null;
  return "@" + v.replace(/^@+/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "");
}
