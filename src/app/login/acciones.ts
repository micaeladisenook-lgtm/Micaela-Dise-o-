"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { iniciarSesion, cerrarSesion } from "@/lib/auth";
import { inicioDe } from "@/lib/acceso";

export async function entrar(_prev: string | null, form: FormData): Promise<string | null> {
  const login = String(form.get("login") ?? "").trim().toLowerCase();
  const clave = String(form.get("clave") ?? "");
  if (!login || !clave) return "Completá usuario y contraseña.";
  const u = await db.usuario.findUnique({ where: { login } });
  if (!u || !u.activo || !(await bcrypt.compare(clave, u.passwordHash))) {
    return "Usuario o contraseña incorrectos.";
  }
  await iniciarSesion(u.id);
  await db.usuario.update({ where: { id: u.id }, data: { ultimoAcceso: new Date() } });
  if (u.debeCambiarClave) redirect("/cuenta?cambiar=1");
  redirect(await inicioDe(u.rol));
}

export async function salir() {
  await cerrarSesion();
  redirect("/login");
}
