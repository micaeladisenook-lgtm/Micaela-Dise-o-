"use client";
import { useMemo, useState } from "react";
import { Check, Truck, Store, Gift } from "lucide-react";
import AvisoTexto from "@/components/AvisoTexto";
import { useFormulario } from "@/lib/useFormulario";
import { enviarPedidoPublico } from "./acciones";
import { pesos } from "@/lib/formato";
import { prendasDelProducto, esAccesorio, PROVINCIAS_AR } from "@/lib/prendasProducto";

type Comp = { componenteId: string; cantidad: number; aEleccion: boolean; componente: { id: string; nombre: string; colores: string[]; talles: string[] } };
type P = {
  id: string; nombre: string; tipo: string; precio: number | null; precioAnterior: number | null; descripcion: string | null;
  colores: string[]; talles: string[]; componentes: Comp[];
};

const TIPOS: [string, string][] = [["BOX", "Boxes"], ["KIT", "Kits"], ["SUELTO", "Prendas sueltas"]];
const UBICACIONES = ["Espalda", "Adelante", "Lado del corazón", "Pantuflas", "Antifaz", "Otro lugar"];
const CORREOS = ["Correo Argentino", "Andreani", "Vía Cargo", "Motomensajería", "Me da igual, recomiéndenme"];

function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: React.ReactNode; ayuda?: string }) {
  return (
    <div>
      <label className="etiqueta">{etiqueta}</label>
      {children}
      {ayuda && <p className="ayuda">{ayuda}</p>}
    </div>
  );
}

function Seccion({ n, titulo, children, ayuda }: { n: number; titulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <section className="tarjeta p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="w-8 h-8 shrink-0 rounded-full bg-acento text-white flex items-center justify-center text-sm font-semibold">{n}</span>
        <div>
          <h2 className="text-2xl leading-8">{titulo}</h2>
          {ayuda && <p className="text-xs text-texto-2">{ayuda}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

const opcion = "rounded-xl border border-borde min-h-11 flex items-center gap-2 px-3 cursor-pointer has-[:checked]:border-acento has-[:checked]:bg-acento-suave/50";

export default function FormPublico({ productos, precioBordadoExtra, avisoEnvio = "", avisoPedido = "" }: { productos: P[]; precioBordadoExtra: number; avisoEnvio?: string; avisoPedido?: string }) {
  const [estado, onSubmit, enviando] = useFormulario(enviarPedidoPublico, null);
  const [pid, setPid] = useState("");
  const [eleccion, setEleccion] = useState("");
  const [colores, setColores] = useState<Record<number, string>>({});
  const [mismoColor, setMismoColor] = useState(true);
  const [evento, setEvento] = useState("no");
  const [envio, setEnvio] = useState("envio");
  const [extra, setExtra] = useState(false);
  const p = productos.find((x) => x.id === pid);
  const prendas = useMemo(() => (p ? prendasDelProducto(p, eleccion || null) : []), [p, eleccion]);
  const opciones = p?.componentes.filter((c) => c.aEleccion) ?? [];
  const elegibles = prendas.map((pr, i) => ({ ...pr, i })).filter((pr) => !esAccesorio(pr.nombre));
  const regalos = prendas.filter((pr) => esAccesorio(pr.nombre));

  const elegirProducto = (id: string) => { setPid(id); setEleccion(""); setColores({}); };
  const elegirColor = (i: number, c: string) => setColores((prev) => {
    const n = { ...prev, [i]: c };
    // "mismo color para todo": copia el color a las otras prendas que lo tengan disponible
    if (mismoColor && i === elegibles[0]?.i) for (const pr of elegibles.slice(1)) if (!pr.colores.length || pr.colores.includes(c)) n[pr.i] = c;
    return n;
  });

  if (estado?.ok) {
    return (
      <div className="tarjeta p-8 text-center">
        <p className="titulo text-4xl italic text-acento">¡Gracias!</p>
        <p className="mt-3">Recibimos tu pedido{estado.numero ? <> (N° <strong>{estado.numero}</strong>)</> : null}.</p>
        <p className="text-sm text-texto-2 mt-2">En breve te escribimos por WhatsApp para confirmar los detalles, pasarte el costo del envío y coordinar la seña 💕</p>
      </div>
    );
  }

  const subtotal = (p?.precio ?? 0) + (extra ? precioBordadoExtra : 0);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="text" name="sitio" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <Seccion n={1} titulo="Tus datos">
        <Campo etiqueta="Nombre y apellido *"><input name="nombre" className="campo" required autoComplete="name" /></Campo>
        <Campo etiqueta="WhatsApp *" ayuda="Con código de área, ej: 11 2345 6789"><input name="telefono" className="campo" inputMode="tel" required autoComplete="tel" /></Campo>
        <div className="grid sm:grid-cols-2 gap-3">
          <Campo etiqueta="Instagram (opcional)"><input name="instagram" className="campo" placeholder="@usuario" autoCapitalize="none" /></Campo>
          <Campo etiqueta="Email (opcional)"><input name="email" type="email" className="campo" autoComplete="email" /></Campo>
        </div>
      </Seccion>

      <Seccion n={2} titulo="Elegí tu box o producto">
        <input type="hidden" name="productoId" value={pid} />
        {TIPOS.map(([tipo, titulo]) => {
          const lista = productos.filter((x) => x.tipo === tipo);
          if (!lista.length) return null;
          return (
            <div key={tipo}>
              <p className="text-xs font-semibold uppercase tracking-wide text-texto-2 mb-1.5">{titulo}</p>
              <div className="space-y-2">
                {lista.map((x) => {
                  const on = x.id === pid;
                  return (
                    <button key={x.id} type="button" onClick={() => elegirProducto(x.id)} aria-pressed={on}
                      className={`w-full text-left rounded-xl border p-3 flex gap-3 cursor-pointer transition-colors ${on ? "border-acento bg-acento-suave/50" : "border-borde bg-white hover:border-acento"}`}>
                      <span className={`w-5 h-5 mt-0.5 shrink-0 rounded-full border-2 flex items-center justify-center ${on ? "border-acento bg-acento text-white" : "border-borde"}`}>{on && <Check size={12} strokeWidth={3} />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="font-medium">{x.nombre}</span>
                          <span className="text-right shrink-0">
                            {x.precioAnterior && <span className="text-xs text-texto-2 line-through mr-1">{pesos(x.precioAnterior)}</span>}
                            <span className="font-semibold">{x.precio ? pesos(x.precio) : "Consultar"}</span>
                          </span>
                        </span>
                        {x.descripcion && <span className="block text-xs text-texto-2 mt-0.5">{x.descripcion}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Seccion>

      {p && (
        <Seccion n={3} titulo="Personalizá cada prenda" ayuda={`Elegí el color y el talle de cada cosa que trae tu ${p.tipo === "BOX" ? "box" : "pedido"}.`}>
          {opciones.length > 0 && (
            <Campo etiqueta="¿Qué preferís? *">
              <div className="grid gap-2">
                {opciones.map((o) => (
                  <label key={o.componenteId} className={opcion}>
                    <input type="radio" name="eleccion" value={o.componenteId} checked={(eleccion || opciones[0].componenteId) === o.componenteId}
                      onChange={() => { setEleccion(o.componenteId); setColores({}); }} className="accent-acento w-4 h-4" />
                    {o.componente.nombre}
                  </label>
                ))}
              </div>
            </Campo>
          )}
          {elegibles.length > 1 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={mismoColor} onChange={(e) => setMismoColor(e.target.checked)} className="w-5 h-5 accent-acento" />
              Quiero todo del mismo color
            </label>
          )}
          <div className="space-y-3">
            {elegibles.map((pr, k) => (
              <div key={`${pr.productoId}-${pr.i}`} className="rounded-xl border border-borde p-3 bg-white">
                <p className="font-medium mb-2">{pr.nombre}{elegibles.filter((x) => x.nombre === pr.nombre).length > 1 ? ` ${elegibles.filter((x, j) => x.nombre === pr.nombre && j <= k).length}` : ""}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Campo etiqueta="Color *">
                    {pr.colores.length ? (
                      <select name={`color_${pr.i}`} className="campo" required value={colores[pr.i] ?? ""} onChange={(e) => elegirColor(pr.i, e.target.value)}>
                        <option value="">Elegí…</option>
                        {pr.colores.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    ) : (
                      <input name={`color_${pr.i}`} className="campo" required placeholder="¿Qué color?" value={colores[pr.i] ?? ""} onChange={(e) => elegirColor(pr.i, e.target.value)} />
                    )}
                  </Campo>
                  {pr.talles.length > 0 && (
                    <Campo etiqueta="Talle *">
                      <select name={`talle_${pr.i}`} className="campo" required defaultValue="">
                        <option value="">Elegí…</option>
                        {pr.talles.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </Campo>
                  )}
                </div>
              </div>
            ))}
          </div>
          {regalos.length > 0 && (
            <p className="text-sm text-texto-2 flex items-start gap-2"><Gift size={16} className="text-acento shrink-0 mt-0.5" /> Incluye de regalo: {[...new Set(regalos.map((r) => r.nombre))].join(", ")}</p>
          )}
          <Campo etiqueta="¿Para quién es? (opcional)" ayuda="Ej: para mí, para mi mamá, para la novia"><input name="persona" className="campo" /></Campo>
        </Seccion>
      )}

      {p && (
        <Seccion n={4} titulo="Bordado">
          <Campo etiqueta="Texto para bordar" ayuda="Ej: Mía Mis XV · Bride · tu nombre"><input name="bordado" className="campo" /></Campo>
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo etiqueta="Color del hilo">
              <div className="grid grid-cols-2 gap-2">
                {["Dorado", "Plateado"].map((h, i) => (
                  <label key={h} className={opcion}><input type="radio" name="hilo" value={h} defaultChecked={i === 0} className="accent-acento w-4 h-4" /> {h}</label>
                ))}
              </div>
            </Campo>
            <Campo etiqueta="¿Dónde va?">
              <select name="ubicacion" className="campo" defaultValue="Espalda">{UBICACIONES.map((u) => <option key={u}>{u}</option>)}</select>
            </Campo>
          </div>
          <Campo etiqueta="¿Dónde va exactamente? (opcional)" ayuda="Ej: centrado en la espalda · en la pantufla derecha · chiquito en el bolsillo">
            <textarea name="bordadoDetalle" rows={2} className="campo py-2.5" />
          </Campo>
          <label className="flex items-center gap-3 rounded-xl border border-borde p-3 cursor-pointer min-h-11">
            <input type="checkbox" className="w-5 h-5 accent-acento" checked={extra} onChange={(e) => setExtra(e.target.checked)} />
            <span className="text-sm">Quiero un bordado extra en otro lugar (+{pesos(precioBordadoExtra)})</span>
          </label>
          {extra && (
            <div className="grid grid-cols-[1fr_140px] gap-2">
              <input name="bordadoExtra" className="campo" placeholder="Texto del bordado extra" />
              <select name="ubicacionExtra" className="campo"><option>Adelante</option><option>Pantuflas</option><option>Antifaz</option><option>Otro lugar</option></select>
            </div>
          )}
        </Seccion>
      )}

      <Seccion n={p ? 5 : 3} titulo="Evento y fecha">
        <Campo etiqueta="¿Es para un evento?">
          <select name="evento" className="campo" value={evento} onChange={(e) => setEvento(e.target.value)}>
            <option value="no">No</option>
            <option value="XV">Sí, quince años</option>
            <option value="Boda">Sí, boda / despedida</option>
            <option value="Cumpleaños">Sí, cumpleaños</option>
            <option value="otro">Otro</option>
          </select>
        </Campo>
        {evento === "otro" && <input name="eventoOtro" className="campo" placeholder="¿Qué evento?" />}
        <div className="grid sm:grid-cols-2 gap-3">
          {evento !== "no" && <Campo etiqueta="Fecha del evento"><input type="date" name="fechaEvento" className="campo" /></Campo>}
          <Campo etiqueta="¿Para qué fecha lo necesitás?"><input type="date" name="fechaNecesita" className="campo" /></Campo>
        </div>
      </Seccion>

      <Seccion n={p ? 6 : 4} titulo="Entrega" ayuda="No hace falta cotizar: te pasamos el costo del envío por WhatsApp.">
        <AvisoTexto texto={avisoEnvio} />
        <div className="grid grid-cols-2 gap-2">
          {([["envio", "Envío", Truck], ["retira", "Retiro", Store]] as const).map(([v, t, Icono]) => (
            <label key={v} className={opcion}>
              <input type="radio" name="envio" value={v} checked={envio === v} onChange={() => setEnvio(v)} className="accent-acento w-4 h-4" /> <Icono size={16} className="text-acento" /> {t}
            </label>
          ))}
        </div>
        {envio === "envio" ? (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <Campo etiqueta="¿Quién lo recibe? *"><input name="recibe" className="campo" required placeholder="Nombre y apellido" autoComplete="name" /></Campo>
              <Campo etiqueta="DNI de quien recibe *" ayuda="Lo pide el correo"><input name="dni" className="campo" required inputMode="numeric" /></Campo>
            </div>
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <Campo etiqueta="Calle y número *"><input name="direccion" className="campo" required placeholder="Ej: Av. Rivadavia 1234" autoComplete="street-address" /></Campo>
              <Campo etiqueta="Piso / depto"><input name="pisoDepto" className="campo" placeholder="3° B" /></Campo>
            </div>
            <Campo etiqueta="Entre calles" ayuda="Ayuda al repartidor a encontrar la casa"><input name="entreCalles" className="campo" placeholder="Ej: entre Av. Cabildo y Amenábar" /></Campo>
            <div className="grid sm:grid-cols-3 gap-3">
              <Campo etiqueta="Localidad *"><input name="localidad" className="campo" required autoComplete="address-level2" /></Campo>
              <Campo etiqueta="Provincia *">
                <select name="provincia" className="campo" required defaultValue=""><option value="">Elegí…</option>{PROVINCIAS_AR.map((x) => <option key={x}>{x}</option>)}</select>
              </Campo>
              <Campo etiqueta="Código postal *"><input name="codigoPostal" className="campo" required inputMode="numeric" autoComplete="postal-code" /></Campo>
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
        ) : (
          <p className="text-sm text-texto-2">Te escribimos para coordinar día y horario de retiro.</p>
        )}
        <Campo etiqueta="Detalles extras (opcional)" ayuda="Ubicación exacta del bordado, tipografía, tamaño, colores especiales, algo para la tarjeta…"><textarea name="comentarios" rows={3} className="campo py-2.5" /></Campo>
      </Seccion>

      {p && (
        <section className="tarjeta p-5 text-sm space-y-1">
          <h2 className="text-xl mb-1">Resumen</h2>
          <p className="flex justify-between gap-2"><span>{p.nombre}</span><span>{p.precio ? pesos(p.precio) : "A consultar"}</span></p>
          {extra && <p className="flex justify-between gap-2"><span>Bordado extra</span><span>{pesos(precioBordadoExtra)}</span></p>}
          <p className="flex justify-between gap-2 text-texto-2"><span>Envío</span><span>{envio === "envio" ? "te lo pasamos por WhatsApp" : "retiro sin cargo"}</span></p>
          <p className="flex justify-between gap-2 font-semibold border-t border-borde pt-2 mt-2"><span>Total{envio === "envio" ? " (sin envío)" : ""}</span><span>{pesos(subtotal)}</span></p>
        </section>
      )}

      {p && (
        <>
          <AvisoTexto texto={avisoPedido} />
          {avisoPedido.trim() && (
            <label className="flex items-start gap-3 rounded-xl border border-borde bg-white p-3 cursor-pointer has-[:checked]:border-acento">
              <input type="checkbox" name="acepto" required className="w-5 h-5 mt-0.5 shrink-0 accent-acento" />
              <span className="text-sm">Verifiqué talles, colores, bordados, modelos y cantidades, y estoy de acuerdo.</span>
            </label>
          )}
        </>
      )}
      {estado?.error && <p className="text-sm text-estado-alerta-txt bg-estado-alerta rounded-xl px-4 py-3">{estado.error}</p>}
      <button className="btn-primario w-full text-base min-h-12" disabled={enviando || !p}>{enviando ? "Enviando…" : p ? "Enviar pedido" : "Elegí un producto para continuar"}</button>
      <p className="text-xs text-center text-texto-2">Envíos a todo el país 📦</p>
    </form>
  );
}
