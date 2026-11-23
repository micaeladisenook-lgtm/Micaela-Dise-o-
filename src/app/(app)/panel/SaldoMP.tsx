"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { leerMercadoPago } from "./mp";
import { pesos, fechaHora } from "@/lib/formato";

const ESTADOS: Record<string, string> = {
  approved: "Aprobado", pending: "Pendiente", in_process: "En proceso", rejected: "Rechazado", refunded: "Devuelto", cancelled: "Cancelado",
};

export default function SaldoMP() {
  const [r, setR] = useState<Awaited<ReturnType<typeof leerMercadoPago>> | null>(null);
  const [cargando, setCargando] = useState(false);
  const actualizar = useCallback(async () => {
    setCargando(true);
    try { setR(await leerMercadoPago()); } catch { /* se reintenta en el próximo minuto */ } finally { setCargando(false); }
  }, []);
  useEffect(() => {
    actualizar();
    const t = setInterval(actualizar, 60_000);
    return () => clearInterval(t);
  }, [actualizar]);

  return (
    <section className="tarjeta p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl">Mercado Pago</h2>
        <button onClick={actualizar} disabled={cargando} title="Actualizar" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-menu cursor-pointer">
          <RefreshCw size={16} className={cargando ? "animate-spin" : ""} />
        </button>
      </div>
      {!r ? <p className="text-sm text-texto-2">Cargando…</p> : !r.configurado ? (
        <p className="text-sm text-texto-2">Falta conectar tu cuenta de Mercado Pago (se carga la clave en Netlify).</p>
      ) : (
        <>
          {r.datos?.disponible != null ? (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><p className="text-xs text-texto-2">Disponible</p><p className="titulo text-3xl text-estado-listo-txt">{pesos(r.datos.disponible)}</p></div>
              <div><p className="text-xs text-texto-2">A liberar</p><p className="titulo text-3xl">{pesos(r.datos.aLiberar)}</p></div>
            </div>
          ) : <p className="text-xs text-estado-produccion-txt mb-2">{r.datos?.errorSaldo}</p>}
          <p className="text-xs font-semibold uppercase tracking-wide text-texto-2 mb-1">Últimos cobros</p>
          {r.datos?.cobros.length ? (
            <ul className="text-sm divide-y divide-borde">
              {r.datos.cobros.map((c) => (
                <li key={c.id} className="flex justify-between gap-2 py-1.5">
                  <span className="min-w-0 truncate">
                    {c.pedidoId ? <Link href={`/pedidos/${c.pedidoId}`} className="hover:text-acento">{c.detalle}</Link> : c.detalle}
                    <span className="block text-[11px] text-texto-2">{c.fecha ? fechaHora(c.fecha) : ""} · {ESTADOS[c.estado] ?? c.estado}</span>
                  </span>
                  <span className={`whitespace-nowrap font-medium ${c.estado === "approved" ? "" : "text-texto-2"}`}>{pesos(c.monto)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-texto-2">Sin cobros recientes.</p>}
          <p className="text-[11px] text-texto-2 mt-2">Se actualiza solo cada minuto · {fechaHora(r.hora)}</p>
        </>
      )}
    </section>
  );
}
