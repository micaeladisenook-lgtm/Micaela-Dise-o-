"use client";
import { useState, useTransition } from "react";
import { Copy, Pencil, Truck, Printer, Undo2, MessageCircle } from "lucide-react";
import { useFormulario } from "@/lib/useFormulario";
import { guardarDatosEnvio, marcarDespachado, deshacerDespacho } from "./acciones";
import { FORMAS_ENVIO } from "@/lib/pedidos";

type D = { nombre: string; dni: string | null; telefono: string | null; direccion: string | null; entreCalles: string | null; localidad: string | null; provincia: string | null; codigoPostal: string | null };

export function Acciones({ id, datos, copiar, formaEnvio, despachado, avisoWa }: {
  id: string; datos: D; copiar: string; formaEnvio: string | null; despachado: boolean; avisoWa: string | null;
}) {
  const [modo, setModo] = useState<"" | "editar" | "despachar">("");
  const [copiado, setCopiado] = useState(false);
  const [e1, onEditar, p1] = useFormulario(guardarDatosEnvio.bind(null, id), null);
  const [e2, onDespachar, p2] = useFormulario(marcarDespachado.bind(null, id), null);
  const [p3, start] = useTransition();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secundario min-h-10 px-3" onClick={async () => { await navigator.clipboard.writeText(copiar); setCopiado(true); setTimeout(() => setCopiado(false), 2500); }}>
          <Copy size={15} /> {copiado ? "¡Copiado!" : "Copiar datos"}
        </button>
        <a href={`/imprimir-rotulos?ids=${id}`} target="_blank" className="btn-suave min-h-10 px-3"><Printer size={15} /> Rótulo</a>
        {!despachado && <button type="button" className="btn-suave min-h-10 px-3" onClick={() => setModo(modo === "editar" ? "" : "editar")}><Pencil size={15} /> Editar datos</button>}
        {!despachado && <button type="button" className="btn-primario min-h-10 px-3" onClick={() => setModo(modo === "despachar" ? "" : "despachar")}><Truck size={15} /> Despachar</button>}
        {despachado && avisoWa && <a href={avisoWa} target="_blank" className="btn-secundario min-h-10 px-3"><MessageCircle size={15} /> Avisar envío</a>}
        {despachado && <button type="button" disabled={p3} className="btn-suave min-h-10 px-3" onClick={() => confirm("¿Volver este pedido a pendiente de envío?") && start(() => deshacerDespacho(id))}><Undo2 size={15} /> Deshacer</button>}
      </div>

      {modo === "editar" && (
        <form onSubmit={onEditar} className="grid sm:grid-cols-2 gap-2 rounded-xl bg-fondo p-3">
          <select name="formaEnvio" className="campo" defaultValue={formaEnvio ?? ""}>
            <option value="">Forma de envío…</option>{FORMAS_ENVIO.filter((x) => x !== "Retira").map((x) => <option key={x}>{x}</option>)}
          </select>
          <input name="telefono" className="campo" placeholder="Teléfono" defaultValue={datos.telefono ?? ""} />
          <input name="direccion" className="campo sm:col-span-2" placeholder="Calle, número, piso/depto" defaultValue={datos.direccion ?? ""} />
          <input name="entreCalles" className="campo sm:col-span-2" placeholder="Entre calles" defaultValue={datos.entreCalles ?? ""} />
          <input name="localidad" className="campo" placeholder="Localidad" defaultValue={datos.localidad ?? ""} />
          <input name="provincia" className="campo" placeholder="Provincia" defaultValue={datos.provincia ?? ""} />
          <input name="codigoPostal" className="campo" placeholder="Código postal" inputMode="numeric" defaultValue={datos.codigoPostal ?? ""} />
          <input name="dni" className="campo" placeholder="DNI" inputMode="numeric" defaultValue={datos.dni ?? ""} />
          <div className="sm:col-span-2 flex items-center gap-3">
            <button className="btn-primario min-h-10" disabled={p1}>{p1 ? "Guardando…" : "Guardar"}</button>
            {e1?.ok && <span className="text-sm text-estado-listo-txt">{e1.ok}</span>}
          </div>
        </form>
      )}
      {modo === "despachar" && (
        <form onSubmit={onDespachar} className="grid sm:grid-cols-2 gap-2 rounded-xl bg-fondo p-3">
          <input name="seguimiento" className="campo" placeholder="N° de seguimiento (opcional)" />
          <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-2">$</span><input name="costoEnvio" className="campo pl-7" inputMode="numeric" placeholder="Costo del envío (opc.)" /></div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button className="btn-primario min-h-10" disabled={p2}>{p2 ? "Guardando…" : "Marcar como despachado"}</button>
            {e2?.ok && <span className="text-sm text-estado-listo-txt">{e2.ok}</span>}
          </div>
          <p className="sm:col-span-2 text-xs text-texto-2">El pedido pasa a &quot;Entregado&quot; y vas a poder avisarle a la clienta por WhatsApp con el seguimiento.</p>
        </form>
      )}
    </div>
  );
}
