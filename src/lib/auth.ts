import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { COOKIE_SESION, firmarSesion, leerSesion } from "./sesion";

export const NOMBRE_ROL: Record<string, string> = {
  ADMIN: "Administradora",
  VENDEDOR: "Vendedor/a",
  TALLER: "Taller",
};

export const usuarioActual = cache(async () => {
  const jar = await cookies();
  const sesion = await leerSesion(jar.get(COOKIE_SESION)?.value);
  if (!sesion) return null;
  const usuario = await db.usuario.findUnique({ where: { id: sesion.uid } });
  if (!usuario || !usuario.activo) return null;
  return usuario;
});

export async function requerirUsuario() {
  const u = await usuarioActual();
  if (!u) redirect("/login");
  return u;
}

export async function requerirAdmin() {
  const u = await requerirUsuario();
  if (u.rol !== "ADMIN") redirect("/?sin-permiso=1");
  return u;
}

export async function iniciarSesion(uid: string) {
  const token = await firmarSesion({ uid });
  const jar = await cookies();
  jar.set(COOKIE_SESION, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function cerrarSesion() {
  const jar = await cookies();
  jar.delete(COOKIE_SESION);
}
