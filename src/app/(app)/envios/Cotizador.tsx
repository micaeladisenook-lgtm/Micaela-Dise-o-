"use client";
import { useState, useTransition } from "react";
import { Calculator, ExternalLink, Package } from "lucide-react";
import { cotizarEnvio, elegirEnvio } from "./cotizar";
import { pesos } from "@/lib/formato";

type Resultado = Awaited<ReturnType<typeof cotizarEnvio>>;

export default function Cotizador({ pedidoId, cpInicial }: { pedidoId: string; cpInicial: string | null }) {
  const [cp, setCp] = useState(cpInicial ?? "");
  const [res, setRes] = useState<Resultado | null>(null);
  const [sumar, setSumar] = useState(true);
  const [manual, setManual] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [cotizando, startC] = useTransition();
  const [eligiendo, startE] = useTransition();

  const cotizar = () => { setMsg(null); startC(async () => setRes(await cotizarEnvio(pedidoId, cp))); };
  const elegir = (empresa: string, servicio: string, precio: number) =>
    startE(async () => setMsg(await elegirEnvio(pedidoId, { empresa, servicio, precio }, sumar)));

  return (
    <div className="rounded-xl bg-fondo p-3 space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-texto-2">CP de destino
          <input value={cp} onChange={(e) => setCp(e.target.value)} inputMode="numeric" className="campo mt-1 w-32" placeholder="1428" />
        </label>
        <button type="button" onClick={cotizar} disabled={cotizando} className="btn-primario min-h-11"><Calculator size={16} /> {cotizando ? "Cotizando…" : "Cotizar"}</button>
      </div>

      {res?.error && <p className="text-sm text-estado-alerta-txt">{res.error}</p>}
      {res && !res.error && (
        <>
          <p className="text-xs text-texto-2 flex items-center gap-1"><Package size={13} /> {res.bultos.length} paquete(s) · {(res.bultos.reduce((s, b) => s + b.gramos, 0) / 1000).toString().replace(".", ",")} kg · desde CP {res.origen} a CP {res.destino}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {res.opciones.map((o, i) => (
                  <tr key={i} className="border-b border-borde last:border-0">
                    <td className="py-2 pr-2 font-medium whitespace-nowrap">{o.empresa}</td>
                    <td className="py-2 pr-2">{o.servicio}{o.plazo && <span className="block text-xs text-texto-2">{o.plazo}</span>}{o.aviso && <span className="block text-xs text-estado-produccion-txt">{o.aviso}</span>}</td>
                    <td className="py-2 pr-2 text-right whitespace-nowrap font-semibold">{o.precio != null ? pesos(o.precio) : ""}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {o.precio != null && <button type="button" disabled={eligiendo} onClick={() => elegir(o.empresa, o.servicio, o.precio!)} className="btn-secundario min-h-9 px-3 text-xs">Elegir</button>}
                      {o.linkManual && (
                        <span className="inline-flex items-center gap-1">
                          <a href={o.linkManual} target="_blank" className="btn-suave min-h-9 px-3 text-xs"><ExternalLink size={13} /> Cotizar</a>
                          <input value={manual} onChange={(e) => setManual(e.target.value)} inputMode="numeric" placeholder="$ precio" className="campo w-24 min-h-9 px-2 text-xs" />
                          <button type="button" disabled={eligiendo || !manual} onClick={() => elegir(o.empresa, o.servicio, parseInt(manual.replace(/\D/g, "")) || 0)} className="btn-secundario min-h-9 px-3 text-xs">Elegir</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={sumar} onChange={(e) => setSumar(e.target.checked)} className="w-4 h-4 accent-acento" /> Sumar el costo del envío al total del pedido (lo paga la clienta)</label>
        </>
      )}
      {msg?.ok && <p className="text-sm text-estado-listo-txt">{msg.ok}</p>}
      {msg?.error && <p className="text-sm text-estado-alerta-txt">{msg.error}</p>}
    </div>
  );
}
