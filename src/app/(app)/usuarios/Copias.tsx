"use client";
import { Download } from "lucide-react";
import { useFormulario } from "@/lib/useFormulario";
import { restaurarCopia } from "./copia";

export default function Copias({ automaticas }: { automaticas: boolean }) {
  const [e, onSubmit, p] = useFormulario(restaurarCopia, null);
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-3 text-sm">
        <p>{automaticas ? "✅ Se guarda una copia automática todas las noches (se conservan 30 días)." : "Las copias automáticas se activan al publicar."}</p>
        <a href="/api/copia" className="btn-secundario"><Download size={16} /> Descargar copia ahora</a>
        <p className="text-xs text-texto-2">Es un archivo con todos los datos (clientas, pedidos, pagos, stock, gastos, usuarios). Guardalo en un lugar seguro: tiene datos personales.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-2 rounded-xl border border-estado-alerta-txt/30 p-4">
        <p className="text-sm font-medium">Restaurar desde una copia</p>
        <p className="text-xs text-texto-2">⚠️ Reemplaza TODOS los datos actuales por los de la copia.</p>
        <input type="file" name="archivo" accept=".json,application/json" className="block text-sm" />
        <input name="confirmar" className="campo" placeholder='Escribí RESTAURAR para confirmar' autoCapitalize="characters" />
        {e?.error && <p className="text-sm text-estado-alerta-txt">{e.error}</p>}
        {e?.ok && <p className="text-sm text-estado-listo-txt">{e.ok} <a href="/login" className="underline">Ir a iniciar sesión</a></p>}
        <button className="btn-peligro" disabled={p}>{p ? "Restaurando…" : "Restaurar"}</button>
      </form>
    </div>
  );
}
