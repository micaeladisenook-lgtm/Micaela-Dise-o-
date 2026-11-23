"use client";
import { useState } from "react";
import { Truck, Store } from "lucide-react";
import { useFormulario } from "@/lib/useFormulario";
import { completarDatos, subirFotoCompletar, type EstadoCompletar } from "./acciones";
import BordadoUbicacion from "@/app/(app)/pedidos/BordadoUbicacion";
import AvisoTexto from "@/components/AvisoTexto";
import { PROVINCIAS_AR, telaDe } from "@/lib/prendasProducto";
import SelectorColor from "@/components/SelectorColor";

type Prenda = { id: string; nombre: string; color: string | null; talle: string | null; colores: string[]; talles: string[] };
type Item = {
  id: string; nombre: string; persona: string | null; bordadoTexto: string | null; bordadoUbicacion: string | null;
  bordadoDetalle: string | null; bordadoFotos: string[]; hilo: string | null; prendas: Prenda[]; conBordado: boolean;
};
type Envio = { envio: boolean; direccion: string; entreCalles: string; localidad: string; provincia: string; codigoPostal: string; dni: string; recibe: string };

const UBICACIONES = ["Espalda", "Adelante", "Lado del corazón", "Pantuflas", "Antifaz", "Otro lugar"];
const CORREOS = ["Correo Argentino", "Andreani", "Vía Cargo", "Motomensajería", "Me da igual, recomiéndenme"];
const opcion = "rounded-xl border border-borde min-h-11 flex items-center gap-2 px-3 cursor-pointer has-[:checked]:border-acento has-[:checked]:bg-acento-suave/50";

function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: React.ReactNode; ayuda?: string }) {
  return <div><label className="etiqueta">{etiqueta}</label>{children}{ayuda && <p className="ayuda">{ayuda}</p>}</div>;
}

export default function FormCompletar({ token, items, envioInicial, fechaEvento, conEvento, avisoEnvio, avisoPedido, fotosColores }: {
  token: string; items: Item[]; envioInicial: Envio; fechaEvento: string; conEvento: boolean; avisoEnvio: string; avisoPedido: string; fotosColores: Record<string, Record<string, string>>;
}) {
  const [ubic, setUbic] = useState<Record<string, { bordadoDetalle: string; bordadoFotos: string[] }>>(
    () => Object.fromEntries(items.map((i) => [i.id, { bordadoDetalle: i.bordadoDetalle ?? "", bordadoFotos: i.bordadoFotos ?? [] }])),
  );
  const subir = (fd: FormData) => subirFotoCompletar(token, fd);
  const [estado, onSubmit, enviando] = useFormulario(completarDatos.bind(null, token) as (prev: EstadoCompletar, f: FormData) => Promise<EstadoCompletar>, null);
  const [envio, setEnvio] = useState(envioInicial.envio ? "envio" : "retira");
  const todas = items.flatMap((i) => i.prendas);
  const [colores, setColores] = useState<Record<string, string>>(() => Object.fromEntries(todas.map((pr) => [pr.id, pr.color ?? ""])));
  const [mismoColor, setMismoColor] = useState(todas.length > 1 && todas.every((pr) => !pr.color));
  const ubicacionesDe = (u: string | null) => (u && !UBICACIONES.includes(u) ? [u, ...UBICACIONES] : UBICACIONES);

  const elegirColor = (id: string, c: string) => setColores((prev) => {
    const n = { ...prev, [id]: c };
    if (mismoColor && id === todas[0]?.id) for (const pr of todas.slice(1)) if (!pr.colores.length || pr.colores.includes(c)) n[pr.id] = c;
    return n;
  });

  if (estado?.ok) {
    return (
      <div className="tarjeta p-8 text-center">
        <p className="titulo text-4xl italic text-acento">¡Listo!</p>
        <p className="mt-3">Recibimos los datos de tu pedido.</p>
        <p className="text-sm text-texto-2 mt-2">Ya empezamos a prepararlo. Cualquier novedad te escribimos por WhatsApp 💕</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {items.map((it) => (
        <section key={it.id} className="tarjeta p-5 space-y-4">
          <h2 className="text-2xl">{it.nombre}</h2>
          {todas.length > 1 && it === items.find((x) => x.prendas.length) && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={mismoColor} onChange={(e) => setMismoColor(e.target.checked)} className="w-5 h-5 accent-acento" /> Quiero todo del mismo color
            </label>
          )}
          {it.prendas.map((pr) => (
            <div key={pr.id} className="rounded-xl border border-borde p-3 bg-white">
              <p className="font-medium mb-2">{pr.nombre}</p>
              {pr.colores.length > 0 && Object.keys(fotosColores[telaDe(pr.nombre)] ?? {}).length > 0 ? (
                <div className="space-y-3">
                  {pr.talles.length > 0 && (
                    <Campo etiqueta="Talle *">
                      <select name={`talle_${pr.id}`} className="campo" required defaultValue={pr.talle && pr.talles.includes(pr.talle) ? pr.talle : ""}>
                        <option value="">Elegí…</option>{pr.talles.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </Campo>
                  )}
                  <SelectorColor name={`color_${pr.id}`} colores={pr.colores} fotos={fotosColores[telaDe(pr.nombre)] ?? {}} valor={colores[pr.id] ?? ""} onChange={(c) => elegirColor(pr.id, c)} />
                </div>
              ) : (
              <div className="grid grid-cols-2 gap-2">
                <Campo etiqueta="Color *">
                  {pr.colores.length ? (
                    <select name={`color_${pr.id}`} className="campo" required value={colores[pr.id] ?? ""} onChange={(e) => elegirColor(pr.id, e.target.value)}>
                      <option value="">Elegí…</option>{pr.colores.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  ) : <input name={`color_${pr.id}`} className="campo" required value={colores[pr.id] ?? ""} onChange={(e) => elegirColor(pr.id, e.target.value)} placeholder="¿Qué color?" />}
                </Campo>
                {pr.talles.length > 0 && (
                  <Campo etiqueta="Talle *">
                    <select name={`talle_${pr.id}`} className="campo" required defaultValue={pr.talle && pr.talles.includes(pr.talle) ? pr.talle : ""}>
                      <option value="">Elegí…</option>{pr.talles.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </Campo>
                )}
              </div>
              )}
            </div>
          ))}
          {it.conBordado && (
            <div className="space-y-3 pt-1">
              <p className="font-medium">Bordado</p>
              <Campo etiqueta="Texto para bordar" ayuda="Ej: Mía Mis XV · Bride · tu nombre"><input name={`bordado_${it.id}`} className="campo" defaultValue={it.bordadoTexto ?? ""} /></Campo>
              <div className="grid sm:grid-cols-2 gap-3">
                <Campo etiqueta="Color del hilo">
                  <div className="grid grid-cols-2 gap-2">
                    {["Dorado", "Plateado"].map((h) => <label key={h} className={opcion}><input type="radio" name={`hilo_${it.id}`} value={h} defaultChecked={(it.hilo ?? "Dorado") === h} className="accent-acento w-4 h-4" /> {h}</label>)}
                  </div>
                </Campo>
                <Campo etiqueta="¿Dónde va?">
                  <select name={`ubicacion_${it.id}`} className="campo" defaultValue={it.bordadoUbicacion || "Espalda"}>{ubicacionesDe(it.bordadoUbicacion).map((u) => <option key={u}>{u}</option>)}</select>
                </Campo>
              </div>
              <input type="hidden" name={`detalle_${it.id}`} value={ubic[it.id]?.bordadoDetalle ?? ""} />
              <input type="hidden" name={`fotos_${it.id}`} value={JSON.stringify(ubic[it.id]?.bordadoFotos ?? [])} />
              <BordadoUbicacion
                detalle={ubic[it.id]?.bordadoDetalle ?? ""}
                fotos={ubic[it.id]?.bordadoFotos ?? []}
                subir={subir}
                textoBoton="Subir foto o logo"
                ayuda="Si tenés un logo, un diseño o una foto de cómo lo querés, subila acá (JPG o PNG, hasta 6)."
                onChange={(v) => setUbic((prev) => ({ ...prev, [it.id]: { ...prev[it.id], ...v } }))}
              />
              {it.prendas.length > 0 && <Campo etiqueta="¿Para quién es? (opcional)"><input name={`persona_${it.id}`} className="campo" defaultValue={it.persona ?? ""} /></Campo>}
              <Campo etiqueta="Detalles extras de este box (opcional)" ayuda="Tipografía, tamaño del bordado, colores especiales, algo para la tarjeta, medidas…">
                <textarea name={`extras_${it.id}`} rows={3} className="campo py-2.5" />
              </Campo>
            </div>
          )}
        </section>
      ))}

      {conEvento && (
        <section className="tarjeta p-5">
          <Campo etiqueta="Fecha del evento"><input type="date" name="fechaEvento" className="campo" defaultValue={fechaEvento} /></Campo>
        </section>
      )}

      <section className="tarjeta p-5 space-y-4">
        <div>
          <h2 className="text-2xl">Entrega</h2>
          <p className="text-xs text-texto-2">No hace falta cotizar: si falta, te pasamos el costo del envío por WhatsApp.</p>
        </div>
        <AvisoTexto texto={avisoEnvio} />
        <div className="grid grid-cols-2 gap-2">
          {([["envio", "Envío", Truck], ["retira", "Retiro", Store]] as const).map(([v, t, Icono]) => (
            <label key={v} className={opcion}><input type="radio" name="envio" value={v} checked={envio === v} onChange={() => setEnvio(v)} className="accent-acento w-4 h-4" /> <Icono size={16} className="text-acento" /> {t}</label>
          ))}
        </div>
        {envio === "envio" ? (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <Campo etiqueta="¿Quién lo recibe? *"><input name="recibe" className="campo" required defaultValue={envioInicial.recibe} /></Campo>
              <Campo etiqueta="DNI de quien recibe *" ayuda="Lo pide el correo"><input name="dni" className="campo" required inputMode="numeric" defaultValue={envioInicial.dni} /></Campo>
            </div>
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <Campo etiqueta="Calle y número *"><input name="direccion" className="campo" required defaultValue={envioInicial.direccion} autoComplete="street-address" /></Campo>
              <Campo etiqueta="Piso / depto"><input name="pisoDepto" className="campo" placeholder="3° B" /></Campo>
            </div>
            <Campo etiqueta="Entre calles"><input name="entreCalles" className="campo" defaultValue={envioInicial.entreCalles} /></Campo>
            <div className="grid sm:grid-cols-3 gap-3">
              <Campo etiqueta="Localidad *"><input name="localidad" className="campo" required defaultValue={envioInicial.localidad} /></Campo>
              <Campo etiqueta="Provincia *">
                <select name="provincia" className="campo" required defaultValue={PROVINCIAS_AR.includes(envioInicial.provincia) ? envioInicial.provincia : ""}>
                  <option value="">Elegí…</option>{PROVINCIAS_AR.map((x) => <option key={x}>{x}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Código postal *"><input name="codigoPostal" className="campo" required inputMode="numeric" defaultValue={envioInicial.codigoPostal} /></Campo>
            </div>
            <Campo etiqueta="¿Cómo preferís que te llegue?">
              <div className="grid sm:grid-cols-2 gap-2">
                {CORREOS.map((c, i) => <label key={c} className={opcion}><input type="radio" name="formaPreferida" value={c} defaultChecked={i === CORREOS.length - 1} className="accent-acento w-4 h-4" /> {c}</label>)}
              </div>
            </Campo>
            <Campo etiqueta="Aclaraciones para el envío (opcional)" ayuda="Horarios para recibir, timbre, portería, si va a una sucursal del correo…">
              <textarea name="indicaciones" rows={2} className="campo py-2.5" />
            </Campo>
          </>
        ) : <p className="text-sm text-texto-2">Te escribimos para coordinar día y horario de retiro.</p>}
      </section>

      <section className="tarjeta p-5 space-y-2">
        <h2 className="text-2xl">Comentarios</h2>
        <p className="text-xs text-texto-2">Algo más que quieras contarnos sobre tu pedido (opcional).</p>
        <textarea name="extras" rows={3} className="campo py-2.5" aria-label="Comentarios" />
      </section>

      <AvisoTexto texto={avisoPedido} />
      {avisoPedido.trim() && (
        <label className="flex items-start gap-3 rounded-xl border border-borde bg-white p-3 cursor-pointer has-[:checked]:border-acento">
          <input type="checkbox" name="acepto" required className="w-5 h-5 mt-0.5 shrink-0 accent-acento" />
          <span className="text-sm">Verifiqué talles, colores, bordados, modelos y cantidades, y estoy de acuerdo.</span>
        </label>
      )}
      {estado?.error && <p className="text-sm text-estado-alerta-txt bg-estado-alerta rounded-xl px-4 py-3">{estado.error}</p>}
      <button className="btn-primario w-full text-base min-h-12" disabled={enviando}>{enviando ? "Enviando…" : "Enviar mis datos"}</button>
      <p className="text-xs text-center text-texto-2">Una vez enviados, si necesitás cambiar algo escribinos por WhatsApp.</p>
    </form>
  );
}
