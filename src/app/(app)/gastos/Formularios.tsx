"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { useFormulario } from "@/lib/useFormulario";
import { crearGasto, borrarGasto } from "./acciones";

export const CATEGORIAS_GASTO = ["Telas", "Talleres", "Envíos", "Packaging", "Publicidad", "Insumos", "Hilos y bordado", "Servicios y comisiones", "Otros"];

export function FormGasto({ talleres, hoy }: { talleres: { id: string; nombre: string }[]; hoy: string }) {
  const [estado, onSubmit, enviando] = useFormulario(crearGasto, null);
  const [cat, setCat] = useState("Telas");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado?.ok) { ref.current?.reset(); setCat("Telas"); } }, [estado]);
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div><label className="etiqueta">Fecha</label><input type="date" name="fecha" defaultValue={hoy} className="campo" /></div>
        <div><label className="etiqueta">Monto *</label>
          <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-2">$</span><input name="monto" inputMode="numeric" className="campo pl-7" required /></div>
        </div>
      </div>
      <div><label className="etiqueta">Categoría</label>
        <select name="categoria" className="campo" value={cat} onChange={(e) => setCat(e.target.value)}>{CATEGORIAS_GASTO.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      {cat === "Talleres" && (
        <div><label className="etiqueta">Taller</label><select name="tallerId" className="campo"><option value="">—</option>{talleres.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
      )}
      <div><label className="etiqueta">Detalle</label><input name="descripcion" className="campo" placeholder="Ej: 20 m satén rosa viejo" /></div>
      <div><label className="etiqueta">Medio de pago</label><select name="medio" className="campo"><option value="">—</option><option>Transferencia</option><option>Efectivo</option><option>Tarjeta</option><option>Mercado Pago</option></select></div>
      {estado?.error && <p className="text-sm text-estado-alerta-txt">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-estado-listo-txt">{estado.ok}</p>}
      <button className="btn-primario w-full" disabled={enviando}>{enviando ? "Guardando…" : "Cargar gasto"}</button>
    </form>
  );
}

export function BorrarGasto({ id }: { id: string }) {
  const [p, start] = useTransition();
  return <button disabled={p} onClick={() => confirm("¿Borrar este gasto?") && start(() => borrarGasto(id))} className="w-8 h-8 rounded-full inline-flex items-center justify-center text-texto-2 hover:bg-estado-alerta cursor-pointer" title="Borrar"><X size={14} /></button>;
}
