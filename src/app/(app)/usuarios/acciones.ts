"use server";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requerirAdmin, requerirUsuario, NOMBRE_ROL } from "@/lib/auth";
import { registrar } from "@/lib/registro";
import { PERMISOS } from "@/lib/permisos";
import type { Rol } from "@prisma/client";

export type EstadoUsuario = { ok?: string; error?: string; clave?: string; login?: string; nombre?: string } | null;

function claveTemporal() {
  const letras = "abcdefghjkmnpqrstuvwxyz";
  const s = Array.from({ length: 4 }, () => letras[randomInt(letras.length)]).join("");
  return `${s}-${randomInt(1000, 9999)}`;
}
const limpioLogin = (s: string) => s.trim().toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9._-]/g, "");

export async function invitarUsuario(_prev: EstadoUsuario, f: FormData): Promise<EstadoUsuario> {
  const admin = await requerirAdmin();
  const nombre = String(f.get("nombre") ?? "").trim();
  const login = limpioLogin(String(f.get("login") ?? ""));
  const rol = String(f.get("rol") ?? "VENDEDOR") as Rol;
  const tallerId = String(f.get("tallerId") ?? "") || null;
  if (!nombre || login.length < 3) return { error: "Completá el nombre y un usuario de al menos 3 letras (sin espacios)." };
  if (rol === "TALLER" && !tallerId) return { error: "Elegí a qué taller pertenece." };
  if (await db.usuario.findUnique({ where: { login } })) return { error: `Ya existe el usuario "${login}".` };
  const clave = claveTemporal();
  const u = await db.usuario.create({
    data: { nombre, login, rol, tallerId: rol === "TALLER" ? tallerId : null, passwordHash: await bcrypt.hash(clave, 10), debeCambiarClave: true },
  });
  await registrar(admin.id, "Creó usuario", "Usuario", u.id, `${nombre} (${login}) · ${NOMBRE_ROL[rol]}`);
  revalidatePath("/usuarios");
  return { ok: "Usuario creado.", clave, login, nombre };
}

export async function editarUsuario(id: string, _prev: EstadoUsuario, f: FormData): Promise<EstadoUsuario> {
  const admin = await requerirAdmin();
  const u = await db.usuario.findUniqueOrThrow({ where: { id } });
  const rol = String(f.get("rol") ?? u.rol) as Rol;
  const activo = f.get("activo") === "on";
  const tallerId = String(f.get("tallerId") ?? "") || null;
  if (id === admin.id && (rol !== "ADMIN" || !activo)) return { error: "No podés quitarte a vos misma el rol de administradora ni desactivarte." };
  if (rol === "TALLER" && !tallerId) return { error: "Elegí a qué taller pertenece." };
  const nombre = String(f.get("nombre") ?? "").trim() || u.nombre;
  await db.usuario.update({ where: { id }, data: { nombre, rol, activo, tallerId: rol === "TALLER" ? tallerId : null } });
  const cambios = [u.rol !== rol ? `rol ${NOMBRE_ROL[u.rol]} → ${NOMBRE_ROL[rol]}` : null, u.activo !== activo ? (activo ? "activado" : "desactivado") : null].filter(Boolean).join(" · ");
  await registrar(admin.id, "Modificó usuario", "Usuario", id, `${nombre}${cambios ? ` · ${cambios}` : ""}`);
  revalidatePath("/usuarios");
  return { ok: "Cambios guardados." };
}

export async function restablecerClave(id: string): Promise<EstadoUsuario> {
  const admin = await requerirAdmin();
  const clave = claveTemporal();
  const u = await db.usuario.update({ where: { id }, data: { passwordHash: await bcrypt.hash(clave, 10), debeCambiarClave: true } });
  await registrar(admin.id, "Restableció contraseña", "Usuario", id, u.nombre);
  return { ok: "Contraseña nueva generada.", clave, login: u.login, nombre: u.nombre };
}

export async function guardarPermisos(_prev: EstadoUsuario, f: FormData): Promise<EstadoUsuario> {
  const admin = await requerirAdmin();
  const cambios: string[] = [];
  for (const rol of ["VENDEDOR", "TALLER"] as const) {
    for (const p of PERMISOS) {
      const permitido = f.get(`${rol}:${p.clave}`) === "on";
      const antes = await db.permiso.findUnique({ where: { rol_clave: { rol, clave: p.clave } } });
      await db.permiso.upsert({ where: { rol_clave: { rol, clave: p.clave } }, update: { permitido }, create: { rol, clave: p.clave, permitido } });
      if (!antes || antes.permitido !== permitido) cambios.push(`${NOMBRE_ROL[rol]}: ${permitido ? "+" : "−"} ${p.texto}`);
    }
  }
  if (cambios.length) await registrar(admin.id, "Cambió permisos", "Permisos", null, cambios.slice(0, 20).join(" | "));
  revalidatePath("/", "layout");
  return { ok: cambios.length ? "Permisos guardados." : "No había cambios." };
}

export async function cambiarMiClave(_prev: EstadoUsuario, f: FormData): Promise<EstadoUsuario> {
  const u = await requerirUsuario();
  const actual = String(f.get("actual") ?? "");
  const nueva = String(f.get("nueva") ?? "");
  if (!(await bcrypt.compare(actual, u.passwordHash))) return { error: "La contraseña actual no es correcta." };
  if (nueva.length < 8) return { error: "La nueva contraseña tiene que tener al menos 8 caracteres." };
  if (nueva !== String(f.get("repetir") ?? "")) return { error: "Las dos contraseñas nuevas no coinciden." };
  await db.usuario.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(nueva, 10), debeCambiarClave: false } });
  await registrar(u.id, "Cambió su contraseña", "Usuario", u.id);
  return { ok: "¡Listo! Tu contraseña quedó cambiada." };
}
