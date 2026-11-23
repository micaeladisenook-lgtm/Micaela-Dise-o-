import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "./db";
import { usuarioActual, requerirUsuario } from "./auth";
import { PERMISOS, PERMISOS_INICIALES, resolverPermisos, type ClavePermiso } from "./permisos";

type Quien = { id: string; rol: string };

// Permisos de un rol (sin las personalizaciones de cada usuario)
export const permisosDeRol = cache(async (rol: string): Promise<Set<string>> => {
  if (rol === "ADMIN") return new Set(PERMISOS.map((p) => p.clave));
  const guardados = await db.permiso.findMany({ where: { rol: rol as "VENDEDOR" | "TALLER" } });
  return resolverPermisos(PERMISOS_INICIALES[rol as "VENDEDOR" | "TALLER"] ?? [], guardados);
});

// Permisos reales de un usuario: los de su rol + lo que se le haya personalizado a él/ella
export const permisosDeUsuario = cache(async (id: string, rol: string): Promise<Set<string>> => {
  const base = await permisosDeRol(rol);
  if (rol === "ADMIN") return base;
  const propios = await db.permisoUsuario.findMany({ where: { usuarioId: id } });
  if (!propios.length) return base;
  const res = new Set(base);
  for (const p of propios) {
    if (p.permitido) res.add(p.clave);
    else res.delete(p.clave);
  }
  return res;
});

export const permisosDe = (u: Quien) => permisosDeUsuario(u.id, u.rol);

const tieneAlguno = (p: Set<string>, clave: ClavePermiso | ClavePermiso[]) =>
  (Array.isArray(clave) ? clave : [clave]).some((c) => p.has(c));

export async function puede(clave: ClavePermiso | ClavePermiso[]) {
  const u = await usuarioActual();
  if (!u) return false;
  return tieneAlguno(await permisosDe(u), clave);
}

// Para páginas: si no tiene permiso (alguno de los indicados), lo manda a su inicio
export async function requerirPermiso(clave: ClavePermiso | ClavePermiso[]) {
  const u = await requerirUsuario();
  if (!tieneAlguno(await permisosDe(u), clave)) redirect(await inicioDe(u, "?sin-permiso=1"));
  return u;
}

// Para acciones: corta con error si no tiene permiso (alguno de los indicados)
export async function exigirPermiso(clave: ClavePermiso | ClavePermiso[]) {
  const u = await requerirUsuario();
  if (!tieneAlguno(await permisosDe(u), clave)) throw new Error("No tenés permiso para hacer esto.");
  return u;
}

export async function inicioDe(u: Quien, sufijo = "") {
  const p = await permisosDe(u);
  if (p.has("ver_panel")) return "/" + sufijo;
  if (u.rol === "TALLER" || p.has("ver_talleres")) return "/talleres" + sufijo;
  if (p.has("ver_pedidos")) return "/pedidos" + sufijo;
  return "/cuenta" + sufijo;
}
