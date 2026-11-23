"use client";
import Link from "next/link";
import { useFormulario } from "@/lib/useFormulario";
import { cambiarMiClave } from "../usuarios/acciones";

export default function FormClave() {
  const [e, onSubmit, p] = useFormulario(cambiarMiClave, null);
  if (e?.ok) return <p className="text-estado-listo-txt bg-estado-listo rounded-xl px-4 py-3">{e.ok} <Link href="/" className="underline">Ir al inicio</Link></p>;
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div><label className="etiqueta">Contraseña actual (o la provisoria)</label><input type="password" name="actual" className="campo" autoComplete="current-password" required /></div>
      <div><label className="etiqueta">Contraseña nueva (mínimo 8 caracteres)</label><input type="password" name="nueva" className="campo" autoComplete="new-password" required /></div>
      <div><label className="etiqueta">Repetí la contraseña nueva</label><input type="password" name="repetir" className="campo" autoComplete="new-password" required /></div>
      {e?.error && <p className="text-sm text-estado-alerta-txt">{e.error}</p>}
      <button className="btn-primario" disabled={p}>{p ? "Guardando…" : "Cambiar contraseña"}</button>
    </form>
  );
}
