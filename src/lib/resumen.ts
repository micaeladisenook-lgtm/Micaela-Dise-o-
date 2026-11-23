import "server-only";
import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { db } from "./db";

// Cada pedido tiene un código secreto para su link público de resumen
export async function tokenDePedido(pedidoId: string) {
  const p = await db.pedido.findUniqueOrThrow({ where: { id: pedidoId }, select: { tokenPublico: true } });
  if (p.tokenPublico) return p.tokenPublico;
  const token = randomBytes(12).toString("base64url");
  await db.pedido.update({ where: { id: pedidoId }, data: { tokenPublico: token } });
  return token;
}

export async function urlBase() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function linkResumen(pedidoId: string) {
  return `${await urlBase()}/c/${await tokenDePedido(pedidoId)}`;
}

export const includeResumen = {
  cliente: true,
  pagos: { orderBy: { fecha: "asc" as const } },
  items: { orderBy: { orden: "asc" as const }, include: { prendas: { orderBy: { orden: "asc" as const } } } },
};

export async function pedidoPorToken(token: string) {
  if (!/^[\w-]{10,40}$/.test(token)) return null;
  return db.pedido.findUnique({ where: { tokenPublico: token }, include: includeResumen });
}

// Link para que la clienta complete colores, talles, bordado y envío de SU pedido
export async function linkCompletar(pedidoId: string) {
  const p = await db.pedido.findUniqueOrThrow({ where: { id: pedidoId }, select: { tokenCompletar: true } });
  let token = p.tokenCompletar;
  if (!token) {
    token = randomBytes(18).toString("base64url");
    await db.pedido.update({ where: { id: pedidoId }, data: { tokenCompletar: token } });
  }
  return `${await urlBase()}/completar/${token}`;
}
