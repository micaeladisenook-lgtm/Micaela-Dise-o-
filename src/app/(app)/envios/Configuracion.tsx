"use client";
import { useFormulario } from "@/lib/useFormulario";
import { guardarCpOrigen } from "./cotizar";
import Remitente from "./Remitente";

export default function Configuracion({ cp, estado, esAdmin, remitente }: { cp: string | null; estado: { empresa: string; ok: boolean; nota: string }[]; esAdmin: boolean; remitente: Record<string, string> }) {
  const [e, onSubmit, p] = useFormulario(guardarCpOrigen, null);
  return (
    <section className="tarjeta p-5 mb-5 grid md:grid-cols-[260px_1fr] gap-5">
      <form onSubmit={onSubmit} className="space-y-2">
        <p className="font-medium">Código postal de origen</p>
        <div className="flex gap-2">
          <input name="cp" defaultValue={cp ?? ""} inputMode="numeric" className="campo w-28" readOnly={!esAdmin} />
          {esAdmin && <button className="btn-suave min-h-11 px-4" disabled={p}>{p ? "…" : "Guardar"}</button>}
        </div>
        {e?.ok && <p className="text-xs text-estado-listo-txt">{e.ok}</p>}
        {e?.error && <p className="text-xs text-estado-alerta-txt">{e.error}</p>}
      </form>
      <div>
        <p className="font-medium mb-2">Cotización automática</p>
        <ul className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2 text-sm">
          {estado.map((x) => (
            <li key={x.empresa} className={`rounded-xl px-3 py-2 ${x.ok ? "bg-estado-listo text-estado-listo-txt" : "bg-fondo text-texto-2"}`}>
              <strong>{x.empresa}</strong><span className="block text-xs">{x.nota}</span>
            </li>
          ))}
        </ul>
        {esAdmin && <Remitente datos={remitente} />}
      </div>
    </section>
  );
}
