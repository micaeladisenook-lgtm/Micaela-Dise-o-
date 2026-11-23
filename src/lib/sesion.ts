// Funciones de sesión que también pueden correr en el "middleware" (sin base de datos)
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_SESION = "md_sesion";

function clave() {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto) throw new Error("Falta SESSION_SECRET en el archivo .env");
  return new TextEncoder().encode(secreto);
}

export type DatosSesion = { uid: string };

export async function firmarSesion(datos: DatosSesion) {
  return new SignJWT(datos)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(clave());
}

export async function leerSesion(token: string | undefined): Promise<DatosSesion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave());
    return typeof payload.uid === "string" ? { uid: payload.uid } : null;
  } catch {
    return null;
  }
}
