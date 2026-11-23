"use client";
import { useFormulario } from "@/lib/useFormulario";

import { entrar } from "./acciones";

export default function LoginPage() {
  const [error, onSubmit, enviando] = useFormulario(entrar, null);
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="titulo text-4xl italic">Micaela Diseño</p>
          <p className="text-texto-2 text-sm mt-1">Sistema de gestión</p>
        </div>
        <form onSubmit={onSubmit} className="tarjeta p-6 space-y-4">
          <div>
            <label className="etiqueta" htmlFor="login">Usuario</label>
            <input id="login" name="login" className="campo" autoComplete="username" autoCapitalize="none" required />
          </div>
          <div>
            <label className="etiqueta" htmlFor="clave">Contraseña</label>
            <input id="clave" name="clave" type="password" className="campo" autoComplete="current-password" required />
          </div>
          {error && <p className="text-sm text-estado-alerta-txt bg-estado-alerta rounded-xl px-3 py-2">{error}</p>}
          <button className="btn-primario w-full" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
