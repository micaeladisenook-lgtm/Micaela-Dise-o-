"use client";
import { useEffect, useRef } from "react";
import { useFormulario } from "@/lib/useFormulario";
import { registrarPago } from "./acciones";
import { MEDIOS, NOMBRE_MEDIO } from "@/lib/pedidos";

export default function FormPago({ pedidoId, saldo, hoy }: { pedidoId: string; saldo: number; hoy: string }) {
  const [estado, onSubmit, enviando] = useFormulario(registrarPago.bind(null, pedidoId), null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado?.ok) ref.current?.reset(); }, [estado]);
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-2">$</span>
          <input name="monto" inputMode="numeric" className="campo pl-7" placeholder={saldo ? saldo.toLocaleString("es-AR") : "Monto"} required />
        </div>
        <select name="medio" className="campo" defaultValue="TRANSFERENCIA">
          {MEDIOS.map((m) => <option key={m} value={m}>{NOMBRE_MEDIO[m]}</option>)}
        </select>
        <input name="fecha" type="date" defaultValue={hoy} className="campo" />
        <input name="nota" className="campo" placeholder="Nota (opcional)" />
      </div>
      {estado?.error && <p className="text-sm text-estado-alerta-txt">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-estado-listo-txt">{estado.ok}</p>}
      <button className="btn-primario w-full" disabled={enviando}>{enviando ? "Guardando…" : "Registrar pago"}</button>
    </form>
  );
}
