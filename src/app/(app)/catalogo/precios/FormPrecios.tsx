"use client";
import { useFormulario } from "@/lib/useFormulario";

import { guardarPrecios } from "../acciones";

type Fila = { id: string; nombre: string; tipo: string; precio: number | null };

export default function FormPrecios({ grupos }: { grupos: { titulo: string; filas: Fila[] }[] }) {
  const [estado, onSubmit, enviando] = useFormulario(guardarPrecios, null);
  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
      {grupos.map((g) => (
        <section key={g.titulo} className="tarjeta overflow-hidden">
          <h2 className="text-xl px-5 pt-4 pb-2">{g.titulo}</h2>
          {g.filas.map((f) => (
            <label key={f.id} className="flex items-center justify-between gap-4 px-5 py-2.5 border-t border-borde">
              <span className="text-sm">{f.nombre}</span>
              <span className="relative w-40 shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-2">{f.tipo === "ADICIONAL" ? "+$" : "$"}</span>
                <input name={`precio_${f.id}`} inputMode="numeric" placeholder="A definir"
                  defaultValue={f.precio != null ? f.precio.toLocaleString("es-AR") : ""}
                  className={`campo text-right ${f.tipo === "ADICIONAL" ? "pl-9" : "pl-7"}`} />
              </span>
            </label>
          ))}
        </section>
      ))}
      <div className="sticky bottom-4 tarjeta p-3 flex flex-wrap items-center gap-3 shadow-sm">
        <button className="btn-primario" disabled={enviando}>{enviando ? "Guardando…" : "Guardar precios"}</button>
        {estado?.ok && <span className="text-sm text-estado-listo-txt">{estado.ok}</span>}
        {estado?.error && <span className="text-sm text-estado-alerta-txt">{estado.error}</span>}
      </div>
    </form>
  );
}
