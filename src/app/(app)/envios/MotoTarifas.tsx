"use client";
import { useMemo, useState, useTransition } from "react";
import { Bike, Search, Trash2 } from "lucide-react";
import { useFormulario } from "@/lib/useFormulario";
import { pesos } from "@/lib/formato";
import { agregarTarifaMoto, aumentarTarifasMoto, borrarTarifaMoto, guardarTarifaMoto } from "./moto";

type T = { id: string; zona: string; localidad: string; precio: number };
const ORDEN = ["CABA", "Zona Oeste", "Zona Sur", "Zona Norte"];
const sinTilde = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

export default function MotoTarifas({ tarifas, esAdmin }: { tarifas: T[]; esAdmin: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [busca, setBusca] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pend, start] = useTransition();
  const [e, onAgregar, pa] = useFormulario(agregarTarifaMoto, null);
  const [zonaAum, setZonaAum] = useState("");
  const [porc, setPorc] = useState("");

  const zonas = useMemo(() => [...new Set(tarifas.map((t) => t.zona))].sort((a, b) => (ORDEN.indexOf(a) + 99) % 99 - (ORDEN.indexOf(b) + 99) % 99 || a.localeCompare(b)), [tarifas]);
  const filtradas = tarifas.filter((t) => !busca || sinTilde(t.localidad).includes(sinTilde(busca)));
  const correr = (f: () => Promise<{ ok?: string; error?: string }>) => start(async () => setMsg(await f()));

  return (
    <section className="tarjeta p-5 mb-5">
      <button type="button" onClick={() => setAbierto(!abierto)} className="w-full flex items-center justify-between gap-3 min-h-11 text-left">
        <span className="flex items-center gap-2 font-medium"><Bike size={18} className="text-acento" /> Motomensajería · lista de precios</span>
        <span className="text-sm text-acento">{abierto ? "Ocultar" : `Ver ${tarifas.length} localidades`}</span>
      </button>
      {abierto && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-2" />
              <input value={busca} onChange={(ev) => setBusca(ev.target.value)} placeholder="Buscar localidad o barrio" className="campo pl-9 w-64" />
            </label>
            {msg?.ok && <span className="text-xs text-estado-listo-txt">{msg.ok}</span>}
            {msg?.error && <span className="text-xs text-estado-alerta-txt">{msg.error}</span>}
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {zonas.map((z) => {
              const filas = filtradas.filter((t) => t.zona === z);
              if (!filas.length) return null;
              return (
                <div key={z}>
                  <p className="font-titulo text-lg text-acento mb-1">{z}</p>
                  <ul className="text-sm divide-y divide-borde">
                    {filas.map((t) => (
                      <li key={t.id} className="flex items-center gap-2 py-1">
                        <span className="flex-1">{t.localidad}</span>
                        {esAdmin ? (
                          <>
                            <input defaultValue={t.precio} inputMode="numeric" aria-label={`Precio ${t.localidad}`} className="campo w-24 min-h-9 px-2 text-right"
                              onBlur={(ev) => { const v = ev.target.value.replace(/\D/g, ""); if (v && Number(v) !== t.precio) correr(() => guardarTarifaMoto(t.id, v)); }} />
                            <button type="button" disabled={pend} aria-label={`Borrar ${t.localidad}`} onClick={() => confirm(`¿Borrar ${t.localidad}?`) && correr(() => borrarTarifaMoto(t.id))} className="p-2 text-texto-2 hover:text-estado-alerta-txt"><Trash2 size={14} /></button>
                          </>
                        ) : <span className="font-medium">{pesos(t.precio)}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {esAdmin && (
            <div className="grid lg:grid-cols-2 gap-4 pt-2 border-t border-borde">
              <form onSubmit={onAgregar} className="space-y-2">
                <p className="font-medium text-sm">Agregar localidad</p>
                <div className="flex flex-wrap gap-2">
                  <input name="localidad" placeholder="Localidad o barrio" className="campo flex-1 min-w-40" />
                  <input name="zona" list="zonas-moto" placeholder="Zona" className="campo w-36" />
                  <datalist id="zonas-moto">{zonas.map((z) => <option key={z} value={z} />)}</datalist>
                  <input name="precio" inputMode="numeric" placeholder="$ precio" className="campo w-28" />
                  <button className="btn-suave min-h-11" disabled={pa}>{pa ? "…" : "Agregar"}</button>
                </div>
                {e?.ok && <p className="text-xs text-estado-listo-txt">{e.ok}</p>}
                {e?.error && <p className="text-xs text-estado-alerta-txt">{e.error}</p>}
              </form>
              <div className="space-y-2">
                <p className="font-medium text-sm">Aumentar precios</p>
                <div className="flex flex-wrap gap-2">
                  <select value={zonaAum} onChange={(ev) => setZonaAum(ev.target.value)} className="campo w-44">
                    <option value="">Todas las zonas</option>
                    {zonas.map((z) => <option key={z}>{z}</option>)}
                  </select>
                  <input value={porc} onChange={(ev) => setPorc(ev.target.value)} inputMode="decimal" placeholder="%" className="campo w-20" />
                  <button type="button" className="btn-suave min-h-11" disabled={pend || !porc}
                    onClick={() => { const n = Number(porc.replace(",", ".")); if (confirm(`¿Aplicar ${n}% a ${zonaAum || "todas las zonas"}?`)) correr(() => aumentarTarifasMoto(zonaAum, n)); }}>Aplicar</button>
                </div>
                <p className="text-xs text-texto-2">Se redondea a $100. Para bajar, usá un número negativo.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
