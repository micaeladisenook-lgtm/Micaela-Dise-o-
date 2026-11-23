import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "./db";
import { usuarioActual, requerirUsuario } from "./auth";
import { PERMISOS, PERMISOS_INICIALES, type ClavePermiso } from "./permisos";

export const permisosDeRol = cache(async (rol: string): Promise<Set<string>> => {
  if (rol === "ADMIN") return new Set(PERMISOS.map((p) => p.clave));
  const guardados = await db.permiso.findMany({ where: { rol: rol as "VENDEDOR" | "TALLER" } });
  const base = new Set<string>(PERMISOS_INICIALES[rol as "VENDEDOR" | "TALLER"] ?? []);
  for (const g of guardados) {
    if (g.permitido) base.add(g.clave);
    else base.delete(g.clave);
  }
  return base;
});

export async function puede(clave: ClavePermiso) {
  const u = await usuarioActual();
  if (!u) return false;
  return (await permisosDeRol(u.rol)).has(clave);
}

// Para páginas: si no tiene permiso, lo manda a su inicio
export async function requerirPermiso(clave: ClavePermiso) {
  const u = await requerirUsuario();
  const p = await permisosDeRol(u.rol);
  if (!p.has(clave)) redirect(await inicioDe(u.rol, "?sin-permiso=1"));
  return u;
}

// Para acciones: corta con error si no tiene permiso
export async function exigirPermiso(clave: ClavePermiso) {
  const u = await requerirUsuario();
  if (!(await permisosDeRol(u.rol)).has(clave)) throw new Error("No tenés permiso para hacer esto.");
  return u;
}

export async function inicioDe(rol: string, sufijo = "") {
  const p = await permisosDeRol(rol);
  if (p.has("ver_panel")) return "/" + sufijo;
  if (rol === "TALLER" || p.has("ver_talleres")) return "/talleres" + sufijo;
  if (p.has("ver_pedidos")) return "/pedidos" + sufijo;
  return "/cuenta" + sufijo;
}
