"use client";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Check, Clock, Undo2, Inbox, Scissors, PackageCheck } from "lucide-react";
import { moverTarea } from "./acciones";
import { ETAPAS, NOMBRE_ETAPA, siguienteEtapa, etapaAnterior, type Etapa } from "@/lib/etapas";

export type Tarjeta = {
  id: string;
  etapa: Etapa;
  prenda: string;
  color: string | null;
  talle: string | null;
  bordado: string | null;
  detalle: string | null;
  pedidoId: string;
  numero: number;
  cliente: string;
  evento: string | null;
  atrasada: boolean;
  prioridad: boolean;
  espera: string | null; // nombre del taller del paso anterior, si todavía no terminó
  disenos: { id: string; imagen: string; nombre: string }[];
};

const ESTILO: Record<Etapa, { icono: typeof Inbox; cabeza: string; fondo: string; casilla: string }> = {
  RECIBIDO: { icono: Inbox, cabeza: "bg-estado-nuevo text-estado-nuevo-txt", fondo: "bg-estado-nuevo/40", casilla: "hover:border-estado-nuevo-txt" },
  EN_PRODUCCION: { icono: Scissors, cabeza: "bg-estado-produccion text-estado-produccion-txt", fondo: "bg-estado-produccion/40", casilla: "hover:border-estado-produccion-txt" },
  LISTO: { icono: PackageCheck, cabeza: "bg-estado-listo text-estado-listo-txt", fondo: "bg-estado-listo/40", casilla: "" },
};

const AYUDA: Record<Etapa, string> = {
  RECIBIDO: "Tildá cuando empiecen a trabajarlo",
  EN_PRODUCCION: "Tildá cuando esté terminado",
  LISTO: "Listo para retirar del taller",
};

export default function TableroTaller({ tarjetas }: { tarjetas: Tarjeta[] }) {
  const [, start] = useTransition();
  const [lista, mover] = useOptimistic(tarjetas, (actual: Tarjeta[], m: { id: string; etapa: Etapa }) =>
    actual.map((t) => (t.id === m.id ? { ...t, etapa: m.etapa } : t)),
  );
  const pasarA = (id: string, etapa: Etapa) => start(async () => { mover({ id, etapa }); await moverTarea(id, etapa); });

  return (
    <div className="grid md:grid-cols-3 gap-3">
      {ETAPAS.map((etapa) => {
        const propias = lista.filter((t) => t.etapa === etapa);
        const E = ESTILO[etapa];
        return (
          <div key={etapa} className={`rounded-2xl ${E.fondo} p-2 min-w-0`}>
            <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${E.cabeza}`}>
              <p className="font-semibold text-sm flex items-center gap-1.5"><E.icono size={16} /> {NOMBRE_ETAPA[etapa]}</p>
              <span className="text-sm font-semibold">{propias.length}</span>
            </div>
            <p className="text-[11px] text-texto-2 px-1 pt-1.5">{AYUDA[etapa]}</p>
            {propias.length === 0 ? (
              <p className="text-xs text-texto-2 text-center py-6">Nada por acá</p>
            ) : (
              <ul className="space-y-2 mt-1.5">
                {propias.map((t) => <Ficha key={t.id} t={t} onMover={pasarA} />)}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Ficha({ t, onMover }: { t: Tarjeta; onMover: (id: string, e: Etapa) => void }) {
  const sig = siguienteEtapa(t.etapa);
  const ant = etapaAnterior(t.etapa);
  const listo = t.etapa === "LISTO";
  return (
    <li className={`bg-white rounded-xl border p-2.5 flex gap-2.5 ${t.atrasada && !listo ? "border-estado-alerta-txt/50" : "border-borde"}`}>
      <button
        type="button"
        onClick={() => (sig ? onMover(t.id, sig) : ant && onMover(t.id, ant))}
        aria-label={sig ? `Pasar a «${NOMBRE_ETAPA[sig]}»` : `Volver a «${NOMBRE_ETAPA[ant!]}»`}
        title={sig ? `Pasar a «${NOMBRE_ETAPA[sig]}»${t.espera ? ` (todavía falta ${t.espera}, pero podés pasarla igual)` : ""}` : `Destildar: vuelve a «${NOMBRE_ETAPA[ant!]}»`}
        className={`w-11 h-11 shrink-0 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-colors ${listo ? "bg-estado-listo-txt border-estado-listo-txt text-white" : `bg-white border-borde ${ESTILO[t.etapa].casilla}`}`}
      >
        {listo && <Check size={20} strokeWidth={3} />}
      </button>
      <div className="min-w-0 text-sm flex-1">
        <div className="flex flex-wrap gap-1 mb-0.5">
          {t.prioridad && <span className="text-[10px] font-bold uppercase tracking-wide bg-acento text-white rounded px-1.5 py-0.5">Prioridad</span>}
          {t.atrasada && !listo && <span className="text-[10px] font-bold uppercase tracking-wide bg-estado-alerta text-estado-alerta-txt rounded px-1.5 py-0.5">Atrasada</span>}
        </div>
        <p className="font-medium leading-snug">
          {t.prenda}{t.color ? ` · ${t.color}` : ""}{t.talle ? ` · talle ${t.talle}` : ""}
        </p>
        {t.bordado && <p className="text-acento-oscuro text-xs mt-0.5">Bordado: {t.bordado}</p>}
        {t.detalle && <p className="text-texto-2 text-xs mt-0.5">{t.detalle}</p>}
        <p className="text-xs text-texto-2 mt-0.5">
          <Link href={`/pedidos/${t.pedidoId}`} className="text-acento hover:underline">N° {t.numero}</Link> · {t.cliente}
          {t.evento ? ` · evento ${t.evento}` : " · sin fecha"}
        </p>
        {t.espera && !listo && <p className="text-xs text-estado-produccion-txt flex items-center gap-1 mt-0.5"><Clock size={12} /> Espera a {t.espera}</p>}
        {t.bordado && t.disenos.length > 0 && (
          <div className="flex gap-1 mt-1">{t.disenos.map((d) => <img key={d.id} src={d.imagen} alt={d.nombre} title={d.nombre} className="w-10 h-10 rounded-lg object-cover border border-borde" />)}</div>
        )}
        {ant && !listo && (
          <button type="button" onClick={() => onMover(t.id, ant)} className="mt-1 text-[11px] text-texto-2 hover:text-acento flex items-center gap-1 cursor-pointer">
            <Undo2 size={11} /> Volver a «{NOMBRE_ETAPA[ant]}»
          </button>
        )}
      </div>
    </li>
  );
}
