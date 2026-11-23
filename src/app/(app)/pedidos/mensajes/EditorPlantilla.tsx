"use client";
import { useFormulario } from "@/lib/useFormulario";
import { guardarPlantilla } from "./acciones";

export default function EditorPlantilla({ clave, titulo, texto, puedeEditar }: { clave: string; titulo: string; texto: string; puedeEditar: boolean }) {
  const [estado, onSubmit, enviando] = useFormulario(guardarPlantilla.bind(null, clave), null);
  return (
    <form onSubmit={onSubmit} className="tarjeta p-5">
      <h2 className="text-2xl mb-3">{titulo}</h2>
      <textarea name="texto" rows={10} defaultValue={texto} readOnly={!puedeEditar} className="campo py-3 font-mono text-[13px] leading-relaxed" />
      {puedeEditar && (
        <div className="flex items-center gap-3 mt-3">
          <button className="btn-primario" disabled={enviando}>{enviando ? "Guardando…" : "Guardar"}</button>
          {estado?.ok && <span className="text-sm text-estado-listo-txt">{estado.ok}</span>}
          {estado?.error && <span className="text-sm text-estado-alerta-txt">{estado.error}</span>}
        </div>
      )}
    </form>
  );
}
