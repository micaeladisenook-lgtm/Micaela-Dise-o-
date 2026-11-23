"use client";
import { useMemo, useState } from "react";
import { Check, Truck, Store, Gift, Plus, Pencil, Trash2, PackageCheck } from "lucide-react";
import AvisoTexto from "@/components/AvisoTexto";
import { useFormulario } from "@/lib/useFormulario";
import { enviarPedidoPublico, subirFotoPublica } from "./acciones";
import BordadoUbicacion from "@/app/(app)/pedidos/BordadoUbicacion";
import SelectorTipografia from "@/components/SelectorTipografia";
import { pesos } from "@/lib/formato";
import { prendasDelProducto, esAccesorio, telaDe, PROVINCIAS_AR } from "@/lib/prendasProducto";
import SelectorColor from "@/components/SelectorColor";

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

// Un box que la clienta arma y confirma (puede agregar varios al mismo pedido)
type Box = {
  productoId: string; eleccion: string; colores: Record<number, string>; talles: Record<number, string>; mismoColor: boolean;
  persona: string; bordado: string; tipografia: string; hilo: string; ubicacion: string; bordadoDetalle: string; fotos: string[];
  extras: string; conExtra: boolean; bordadoExtra: string; ubicacionExtra: string;
};
const boxVacio = (): Box => ({
  productoId: "", eleccion: "", colores: {}, talles: {}, mismoColor: true, persona: "", bordado: "", tipografia: "", hilo: "Dorado",
  ubicacion: "Espalda", bordadoDetalle: "", fotos: [], extras: "", conExtra: false, bordadoExtra: "", ubicacionExtra: "Adelante",
});

// Lo que falta completar en un box (vacío = listo para confirmar)
function faltaEnBox(b: Box, productos: P[]): string | null {
  const p = productos.find((x) => x.id === b.productoId);
  if (!p) return "Elegí un box o producto.";
  for (const pr of prendasDelProducto(p, b.eleccion || null).map((x, i) => ({ ...x, i })).filter((x) => !esAccesorio(x.nombre))) {
    if (!b.colores[pr.i]) return `Elegí el color de: ${pr.nombre}.`;
    if (pr.talles.length && !b.talles[pr.i]) return `Elegí el talle de: ${pr.nombre}.`;
  }
  if (b.conExtra && !b.bordadoExtra.trim()) return "Escribí el texto del bordado extra (o destildalo).";
  return null;
}

function EditorBox({ box, setBox, productos, fotosColores, precioBordadoExtra, numero }: {
  box: Box; setBox: (cambios: Partial<Box>) => void; productos: P[]; fotosColores: Record<string, Record<string, string>>; precioBordadoExtra: number; numero: number;
}) {
  const p = productos.find((x) => x.id === box.productoId);
  const prendas = useMemo(() => (p ? prendasDelProducto(p, box.eleccion || null) : []), [p, box.eleccion]);
  const opciones = p?.componentes.filter((c) => c.aEleccion) ?? [];
  const elegibles = prendas.map((pr, i) => ({ ...pr, i })).filter((pr) => !esAccesorio(pr.nombre));
  const regalos = prendas.filter((pr) => esAccesorio(pr.nombre));
  const elegirColor = (i: number, c: string) => {
    const n = { ...box.colores, [i]: c };
    if (box.mismoColor && i === elegibles[0]?.i) for (const pr of elegibles.slice(1)) if (!pr.colores.length || pr.colores.includes(c)) n[pr.i] = c;
    setBox({ colores: n });
  };
  const talle = (pr: { i: number; talles: string[] }) => pr.talles.length > 0 && (
    <Campo etiqueta="Talle *">
      <select className="campo" value={box.talles[pr.i] ?? ""} onChange={(e) => setBox({ talles: { ...box.talles, [pr.i]: e.target.value } })}>
        <option value="">Elegí…</option>
        {pr.talles.map((t) => <option key={t}>{t}</option>)}
      </select>
    </Campo>
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="font-medium mb-2">Box {numero}: elegí cuál querés</p>
        {TIPOS.map(([tipo, titulo]) => {
          const lista = productos.filter((x) => x.tipo === tipo);
          if (!lista.length) return null;
          return (
            <div key={tipo} className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-texto-2 mb-1.5">{titulo}</p>
              <div className="space-y-2">
                {lista.map((x) => {
                  const on = x.id === box.productoId;
                  return (
                    <button key={x.id} type="button" onClick={() => setBox({ productoId: x.id, eleccion: "", colores: {}, talles: {} })} aria-pressed={on}
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
      </div>

      {p && (
        <div className="space-y-4">
          <p className="font-medium">Personalizá cada prenda</p>
          {opciones.length > 0 && (
            <Campo etiqueta="¿Qué preferís? *">
              <div className="grid gap-2">
                {opciones.map((o) => {
                  const on = (box.eleccion || opciones[0].componenteId) === o.componenteId;
                  return (
                    <button key={o.componenteId} type="button" onClick={() => setBox({ eleccion: o.componenteId, colores: {}, talles: {} })}
                      className={`${opcion} ${on ? "border-acento bg-acento-suave/50" : ""}`}>
                      <span className={`w-4 h-4 rounded-full border-2 ${on ? "border-acento bg-acento" : "border-borde"}`} /> {o.componente.nombre}
                    </button>
                  );
                })}
              </div>
            </Campo>
          )}
          {elegibles.length > 1 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={box.mismoColor} onChange={(e) => setBox({ mismoColor: e.target.checked })} className="w-5 h-5 accent-acento" />
              Quiero todo del mismo color
            </label>
          )}
          <div className="space-y-3">
            {elegibles.map((pr, k) => (
              <div key={`${pr.productoId}-${pr.i}`} className="rounded-xl border border-borde p-3 bg-white">
                <p className="font-medium mb-2">{pr.nombre}{elegibles.filter((x) => x.nombre === pr.nombre).length > 1 ? ` ${elegibles.filter((x, j) => x.nombre === pr.nombre && j <= k).length}` : ""}</p>
                {pr.colores.length > 0 && Object.keys(fotosColores[telaDe(pr.nombre)] ?? {}).length > 0 ? (
                  <div className="space-y-3">
                    {talle(pr)}
                    <SelectorColor name={`b${numero}_color_${pr.i}`} colores={pr.colores} fotos={fotosColores[telaDe(pr.nombre)] ?? {}} valor={box.colores[pr.i] ?? ""} onChange={(c) => elegirColor(pr.i, c)} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Campo etiqueta="Color *">
                      {pr.colores.length ? (
                        <select className="campo" value={box.colores[pr.i] ?? ""} onChange={(e) => elegirColor(pr.i, e.target.value)}>
                          <option value="">Elegí…</option>
                          {pr.colores.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      ) : (
                        <input className="campo" placeholder="¿Qué color?" value={box.colores[pr.i] ?? ""} onChange={(e) => elegirColor(pr.i, e.target.value)} />
                      )}
                    </Campo>
                    {talle(pr)}
                  </div>
                )}
              </div>
            ))}
          </div>
          {regalos.length > 0 && (
            <p className="text-sm text-texto-2 flex items-start gap-2"><Gift size={16} className="text-acento shrink-0 mt-0.5" /> Incluye de regalo: {[...new Set(regalos.map((r) => r.nombre))].join(", ")}</p>
          )}
          <Campo etiqueta="¿Para quién es? (opcional)" ayuda="Ej: para mí, para mi mamá, para la novia"><input className="campo" value={box.persona} onChange={(e) => setBox({ persona: e.target.value })} /></Campo>

          <p className="font-medium pt-2">Bordado</p>
          <Campo etiqueta="Texto para bordar" ayuda="Ej: Mía Mis XV · Bride · tu nombre"><input className="campo" value={box.bordado} onChange={(e) => setBox({ bordado: e.target.value })} /></Campo>
          <SelectorTipografia valor={box.tipografia} texto={box.bordado} onChange={(v) => setBox({ tipografia: v })} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo etiqueta="Color del hilo">
              <div className="grid grid-cols-2 gap-2">
                {["Dorado", "Plateado"].map((h) => (
                  <button key={h} type="button" onClick={() => setBox({ hilo: h })} className={`${opcion} ${box.hilo === h ? "border-acento bg-acento-suave/50" : ""}`}>
                    <span className={`w-4 h-4 rounded-full border-2 ${box.hilo === h ? "border-acento bg-acento" : "border-borde"}`} /> {h}
                  </button>
                ))}
              </div>
            </Campo>
            <Campo etiqueta="¿Dónde va?">
              <select className="campo" value={box.ubicacion} onChange={(e) => setBox({ ubicacion: e.target.value })}>{UBICACIONES.map((u) => <option key={u}>{u}</option>)}</select>
            </Campo>
          </div>
          <BordadoUbicacion
            detalle={box.bordadoDetalle}
            fotos={box.fotos}
            subir={subirFotoPublica}
            textoBoton="Subir foto o archivo"
            ayuda="Si tenés un logo, un diseño o una foto de cómo lo querés, subila acá (JPG o PNG, hasta 6)."
            onChange={(v) => setBox({ ...(v.bordadoDetalle !== undefined ? { bordadoDetalle: v.bordadoDetalle } : {}), ...(v.bordadoFotos ? { fotos: v.bordadoFotos } : {}) })}
          />
          <Campo etiqueta="Detalles extras de este box (opcional)" ayuda="Tamaño del bordado, colores especiales, algo para la tarjeta, medidas…">
            <textarea rows={3} className="campo py-2.5" value={box.extras} onChange={(e) => setBox({ extras: e.target.value })} />
          </Campo>
          <label className="flex items-center gap-3 rounded-xl border border-borde p-3 cursor-pointer min-h-11">
            <input type="checkbox" className="w-5 h-5 accent-acento" checked={box.conExtra} onChange={(e) => setBox({ conExtra: e.target.checked })} />
            <span className="text-sm">Quiero un bordado extra en otro lugar (+{pesos(precioBordadoExtra)})</span>
          </label>
          {box.conExtra && (
            <div className="grid grid-cols-[1fr_140px] gap-2">
              <input className="campo" placeholder="Texto del bordado extra" value={box.bordadoExtra} onChange={(e) => setBox({ bordadoExtra: e.target.value })} />
              <select className="campo" value={box.ubicacionExtra} onChange={(e) => setBox({ ubicacionExtra: e.target.value })}><option>Adelante</option><option>Pantuflas</option><option>Antifaz</option><option>Otro lugar</option></select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Resumen corto de un box confirmado
function ResumenBox({ box, productos }: { box: Box; productos: P[] }) {
  const p = productos.find((x) => x.id === box.productoId);
  if (!p) return null;
  const prendas = prendasDelProducto(p, box.eleccion || null).map((x, i) => ({ ...x, i })).filter((x) => !esAccesorio(x.nombre));
  return (
    <div className="text-sm space-y-0.5">
      {prendas.map((pr) => <p key={pr.i} className="text-texto-2">– {pr.nombre}: <span className="text-texto">{[box.colores[pr.i], box.talles[pr.i] ? `talle ${box.talles[pr.i]}` : null].filter(Boolean).join(", ")}</span></p>)}
      {box.bordado && <p className="text-texto-2">– Bordado: <span className="text-texto">&quot;{box.bordado}&quot;{[box.ubicacion, box.hilo && `hilo ${box.hilo.toLowerCase()}`, box.tipografia && `letra ${box.tipografia}`].filter(Boolean).length ? ` (${[box.ubicacion, box.hilo && `hilo ${box.hilo.toLowerCase()}`, box.tipografia && `letra ${box.tipografia}`].filter(Boolean).join(", ")})` : ""}</span></p>}
      {box.conExtra && box.bordadoExtra && <p className="text-texto-2">– Bordado extra: <span className="text-texto">&quot;{box.bordadoExtra}&quot; ({box.ubicacionExtra})</span></p>}
      {box.persona && <p className="text-texto-2">– Para: <span className="text-texto">{box.persona}</span></p>}
      {box.fotos.length > 0 && <p className="text-texto-2">– {box.fotos.length} foto{box.fotos.length > 1 ? "s" : ""} de referencia</p>}
    </div>
  );
}

export default function FormPublico({ productos, precioBordadoExtra, avisoEnvio = "", avisoPedido = "", fotosColores = {} }: { productos: P[]; precioBordadoExtra: number; avisoEnvio?: string; avisoPedido?: string; fotosColores?: Record<string, Record<string, string>> }) {
  const [estado, onSubmit, enviando] = useFormulario(enviarPedidoPublico, null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [editando, setEditando] = useState<Box | null>(boxVacio());
  const [indiceEdicion, setIndiceEdicion] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [errorBox, setErrorBox] = useState<string | null>(null);
  const [evento, setEvento] = useState("no");
  const [envio, setEnvio] = useState("envio");

  const precioBox = (b: Box) => (productos.find((x) => x.id === b.productoId)?.precio ?? 0) + (b.conExtra ? precioBordadoExtra : 0);
  const nombreBox = (b: Box) => productos.find((x) => x.id === b.productoId)?.nombre ?? "";
  const total = boxes.reduce((s, b) => s + precioBox(b), 0);

  const confirmarBox = () => {
    if (!editando) return;
    const falta = faltaEnBox(editando, productos);
    if (falta) { setErrorBox(falta); return; }
    const n = indiceEdicion === null ? boxes.length + 1 : indiceEdicion + 1;
    setBoxes((bs) => (indiceEdicion === null ? [...bs, editando] : bs.map((b, i) => (i === indiceEdicion ? editando : b))));
    setEditando(null); setIndiceEdicion(null); setErrorBox(null);
    setAviso(`¡Box ${n} confirmado! ✓ Si querés, agregá otro box; si no, seguí con los datos de entrega.`);
    setTimeout(() => document.getElementById("tu-pedido")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const nuevoBox = () => { setEditando(boxVacio()); setIndiceEdicion(null); setAviso(null); setErrorBox(null); };
  const editarBox = (i: number) => { setEditando({ ...boxes[i] }); setIndiceEdicion(i); setAviso(null); setErrorBox(null); };
  const quitarBox = (i: number) => { if (confirm(`¿Quitar el box ${i + 1} (${nombreBox(boxes[i])})?`)) { setBoxes((bs) => bs.filter((_, j) => j !== i)); setAviso(null); } };
  const cancelarEdicion = () => { setEditando(null); setIndiceEdicion(null); setErrorBox(null); };

  if (estado?.ok) {
    return (
      <div className="tarjeta p-8 text-center">
        <p className="titulo text-4xl italic text-acento">¡Gracias!</p>
        <p className="mt-3">Recibimos tu pedido{estado.numero ? <> (N° <strong>{estado.numero}</strong>)</> : null}.</p>
        <p className="text-sm text-texto-2 mt-2">En breve te escribimos por WhatsApp para confirmar los detalles, pasarte el costo del envío y coordinar la seña 💕</p>
      </div>
    );
  }

  const listo = boxes.length > 0 && !editando;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="text" name="sitio" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <input type="hidden" name="boxes" value={JSON.stringify(boxes)} />

      <Seccion n={1} titulo="Tus datos">
        <Campo etiqueta="Nombre y apellido *"><input name="nombre" className="campo" required autoComplete="name" /></Campo>
        <Campo etiqueta="WhatsApp *" ayuda="Con código de área, ej: 11 2345 6789"><input name="telefono" className="campo" inputMode="tel" required autoComplete="tel" /></Campo>
        <div className="grid sm:grid-cols-2 gap-3">
          <Campo etiqueta="Instagram (opcional)"><input name="instagram" className="campo" placeholder="@usuario" autoCapitalize="none" /></Campo>
          <Campo etiqueta="Email (opcional)"><input name="email" type="email" className="campo" autoComplete="email" /></Campo>
        </div>
      </Seccion>

      <section id="tu-pedido" className="tarjeta p-5 space-y-4 scroll-mt-4">
        <div className="flex items-start gap-3">
          <span className="w-8 h-8 shrink-0 rounded-full bg-acento text-white flex items-center justify-center text-sm font-semibold">2</span>
          <div>
            <h2 className="text-2xl leading-8">Tu pedido</h2>
            <p className="text-xs text-texto-2">Armá tu box y confirmalo. Si querés más de uno, después podés agregar otro.</p>
          </div>
        </div>

        {aviso && <p className="text-sm text-estado-listo-txt bg-estado-listo rounded-xl px-3 py-2.5 flex items-start gap-2"><PackageCheck size={18} className="shrink-0" /> {aviso}</p>}

        {boxes.map((b, i) => indiceEdicion === i ? null : (
          <div key={i} className="rounded-xl border border-estado-listo-txt/30 bg-white p-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-medium flex items-center gap-1.5"><Check size={16} className="text-estado-listo-txt" /> Box {i + 1}: {nombreBox(b)}</p>
              <p className="font-semibold shrink-0">{pesos(precioBox(b))}</p>
            </div>
            <ResumenBox box={b} productos={productos} />
            {!editando && (
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => editarBox(i)} className="btn-suave min-h-9 px-3 text-xs"><Pencil size={13} /> Editar</button>
                <button type="button" onClick={() => quitarBox(i)} className="btn-suave min-h-9 px-3 text-xs"><Trash2 size={13} /> Quitar</button>
              </div>
            )}
          </div>
        ))}

        {editando ? (
          <div className="rounded-xl border-2 border-acento/40 bg-fondo p-3 sm:p-4">
            <EditorBox box={editando} setBox={(c) => setEditando((e) => (e ? { ...e, ...c } : e))} productos={productos} fotosColores={fotosColores}
              precioBordadoExtra={precioBordadoExtra} numero={indiceEdicion === null ? boxes.length + 1 : indiceEdicion + 1} />
            {errorBox && <p className="text-sm text-estado-alerta-txt bg-estado-alerta rounded-xl px-3 py-2 mt-4">{errorBox}</p>}
            <div className="flex flex-wrap gap-2 mt-4">
              <button type="button" onClick={confirmarBox} className="btn-primario flex-1 min-h-12"><Check size={18} /> {indiceEdicion === null ? "Confirmar este box" : "Guardar cambios del box"}</button>
              {(boxes.length > 0 || indiceEdicion !== null) && <button type="button" onClick={cancelarEdicion} className="btn-suave min-h-12 px-4">Cancelar</button>}
            </div>
          </div>
        ) : (
          <button type="button" onClick={nuevoBox} className="btn-secundario w-full min-h-12"><Plus size={18} /> Agregar otro box</button>
        )}
      </section>

      {boxes.length > 0 && (
        <>
          <Seccion n={3} titulo="Evento y fecha">
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

          <Seccion n={4} titulo="Entrega" ayuda="No hace falta cotizar: te pasamos el costo del envío por WhatsApp.">
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
            <Campo etiqueta="Comentarios (opcional)" ayuda="Algo más que quieras contarnos sobre tu pedido"><textarea name="comentarios" rows={3} className="campo py-2.5" /></Campo>
          </Seccion>

          <section className="tarjeta p-5 text-sm space-y-1">
            <h2 className="text-xl mb-1">Resumen</h2>
            {boxes.map((b, i) => (
              <div key={i}>
                <p className="flex justify-between gap-2"><span>Box {i + 1}: {nombreBox(b)}</span><span>{productos.find((x) => x.id === b.productoId)?.precio ? pesos(productos.find((x) => x.id === b.productoId)!.precio!) : "A consultar"}</span></p>
                {b.conExtra && <p className="flex justify-between gap-2 text-texto-2"><span className="pl-3">+ Bordado extra</span><span>{pesos(precioBordadoExtra)}</span></p>}
              </div>
            ))}
            <p className="flex justify-between gap-2 text-texto-2"><span>Envío</span><span>{envio === "envio" ? "te lo pasamos por WhatsApp" : "retiro sin cargo"}</span></p>
            <p className="flex justify-between gap-2 font-semibold border-t border-borde pt-2 mt-2"><span>Total{envio === "envio" ? " (sin envío)" : ""}</span><span>{pesos(total)}</span></p>
          </section>

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
      {editando && boxes.length > 0 && <p className="text-xs text-center text-texto-2">Confirmá o cancelá el box que estás armando para poder enviar el pedido.</p>}
      <button className="btn-primario w-full text-base min-h-12" disabled={enviando || !listo}>
        {enviando ? "Enviando…" : !boxes.length ? "Confirmá tu box para continuar" : editando ? "Terminá el box que estás armando" : `Enviar pedido (${boxes.length} box${boxes.length > 1 ? "es" : ""})`}
      </button>
      <p className="text-xs text-center text-texto-2">Envíos a todo el país 📦</p>
    </form>
  );
}
