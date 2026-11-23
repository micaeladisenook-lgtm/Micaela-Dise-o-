"use server";
import { requerirAdmin } from "@/lib/auth";
import { restaurarTodo } from "@/lib/copia";

export async function restaurarCopia(_prev: { ok?: string; error?: string } | null, f: FormData) {
  await requerirAdmin();
  if (String(f.get("confirmar") ?? "").trim().toUpperCase() !== "RESTAURAR") return { error: 'Escribí RESTAURAR para confirmar.' };
  const archivo = f.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elegí el archivo de la copia (.json)." };
  try {
    await restaurarTodo(JSON.parse(await archivo.text()));
  } catch (e) {
    return { error: (e as Error).message };
  }
  return { ok: "¡Copia restaurada! Volvé a iniciar sesión con tus datos de la copia." };
}
