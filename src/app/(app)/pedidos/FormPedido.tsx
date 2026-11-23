"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Plus, Trash2, MessageCircle, Check, Users } from "lucide-react";
import { buscarClientes, guardarPedido } from "./acciones";
import BordadoUbicacion from "./BordadoUbicacion";
import type { ClienteForm, ItemForm, PedidoForm, PrendaForm } from "./tipos";
import { pesos, linkWhatsApp } from "@/lib/formato";
import {
  armarMensaje, conLinkResumen, EVENTOS, FORMAS_ENVIO, HILOS, MEDIOS, NOMBRE_MEDIO, UBICACIONES, ESTADOS, NOMBRE_ESTADO,
} from "@/lib/pedidos";

type Prod = {
  id: string; nombre: string; tipo: string; precio: number | null; colores: string[]; talles: string[];
  componentes: {
    cantidad: number; opcional: boolean; aEleccion: boolean;
    componente: { id: string; nombre: string; colores: string[]; talles: string[] };
  }[];
};
type Dis = { id: string; nombre: string; imagen: string; categoria: string };
type Vend = { id: string; nombre: string };

let contador = 0;
const nuevaKey = () => `i${Date.now()}${contador++}`;

function prendasDe(p: Prod, eleccionId?: string | null): PrendaForm[] {
  if (p.componentes.length === 0) {
    if (p.tipo === "ADICIONAL") return [];
    return [{ productoId: p.id, nombre: p.nombre, color: "", talle: "", bordada: true }];
  }
  const fijos = p.componentes.filter((c) => !c.aEleccion);
  const opciones = p.componentes.filter((c) => c.aEleccion);
  const elegido = opciones.find((c) => c.componente.id === eleccionId) ?? opciones[0];
  return [...fijos, ...(elegido ? [elegido] : [])].flatMap((c) =>
    Array.from({ length: c.cantidad }, () => ({
      productoId: c.componente.id, nombre: c.componente.nombre, color: "", talle: "", bordada: true,
    })),
  );
}

function itemVacio(): ItemForm {
  return {
    key: nuevaKey(), productoId: null, nombre: "", persona: "", cantidad: 1, precioUnitario: 0,
    bordadoTexto: "", bordadoUbicacion: "Espalda", bordadoDetalle: "", bordadoFotos: [], hilo: "Dorado", notas: "", prendas: [], eleccionId: null,
  };
}

function Paso({ n, titulo, children, ayuda }: { n: number; titulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <section className="tarjeta p-5 md:p-6">
      <div className="flex items-start gap-3 mb-4">
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

function Opciones({ valor, opciones, onChange, placeholder }: { valor: string; opciones: string[]; onChange: (v: string) => void; placeholder: string }) {
  // Lista para elegir, con la opción "Otro…" para escribir un valor distinto
  const [escribiendo, setEscribiendo] = useState(false);
  const otro = !!valor && !opciones.includes(valor);
  if (escribiendo || (otro && opciones.length === 0) || opciones.length === 0) {
    return (
      <div className="relative">
        <input className="campo pr-10" autoFocus={escribiendo} value={valor} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        {opciones.length > 0 && (
          <button type="button" title="Volver a la lista" onClick={() => { setEscribiendo(false); if (!opciones.includes(valor)) onChange(""); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-texto-2 hover:bg-menu cursor-pointer"><X size={15} /></button>
        )}
      </div>
    );
  }
  return (
    <select className="campo" value={otro ? "__actual" : valor} onChange={(e) => {
      if (e.target.value === "__otro") { setEscribiendo(true); return; }
      if (e.target.value !== "__actual") onChange(e.target.value);
    }}>
      <option value="">{placeholder}</option>
      {opciones.map((o) => <option key={o} value={o}>{o}</option>)}
      {otro && <option value="__actual">{valor}</option>}
      <option value="__otro">Otro…</option>
    </select>
  );
}

export default function FormPedido({
  productos, disenos, vendedores, usuarioId, plantilla, inicial, pedidoId, numero,
}: {
  productos: Prod[]; disenos: Dis[]; vendedores: Vend[]; usuarioId: string; plantilla: string;
  inicial?: Partial<PedidoForm>; pedidoId?: string; numero?: number;
}) {
  const router = useRouter();
  const [guardando, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const prodPrioridad = productos.find((p) => p.tipo === "ADICIONAL" && /prioridad/i.test(p.nombre));

  const [f, setF] = useState<PedidoForm>({
    cliente: { id: null, nombre: "", telefono: "", instagram: "", email: "" },
    tipo: "INDIVIDUAL",
    items: [itemVacio()],
    disenos: [],
    fechaEvento: "", evento: "", eventoDetalle: "", fechaEntrega: "",
    envio: true, formaEnvio: "Correo Argentino", direccionEnvio: "", localidad: "", provincia: "", codigoPostal: "", entreCalles: "",
    prioridad: false, notas: "", vendedorId: usuarioId, estado: "NUEVO",
    sena: 0, medioSena: "TRANSFERENCIA",
    ...inicial,
  });
  const set = <K extends keyof PedidoForm>(k: K, v: PedidoForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const setItem = (key: string, cambios: Partial<ItemForm>) =>
    setF((x) => ({ ...x, items: x.items.map((i) => (i.key === key ? { ...i, ...cambios } : i)) }));

  // ---------- Paso 1: clienta ----------
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Awaited<ReturnType<typeof buscarClientes>>>([]);
  const [nueva, setNueva] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function buscar(q: string) {
    setBusqueda(q);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => setResultados(q.trim().length >= 2 ? await buscarClientes(q) : []), 250);
  }
  function elegirCliente(c: (typeof resultados)[number]) {
    setF((x) => ({
      ...x,
      cliente: { id: c.id, numero: c.numero, nombre: c.nombre, telefono: c.telefono ?? "", instagram: c.instagram ?? "", email: c.email ?? "" },
      direccionEnvio: x.direccionEnvio || c.direccion || "",
      localidad: x.localidad || c.localidad || "",
      provincia: x.provincia || c.provincia || "",
      codigoPostal: x.codigoPostal || c.codigoPostal || "",
      entreCalles: x.entreCalles || c.entreCalles || "",
    }));
    setResultados([]); setBusqueda("");
  }
  const setCliente = (c: Partial<ClienteForm>) => set("cliente", { ...f.cliente, ...c });

  // ---------- Paso 3: productos ----------
  function elegirProducto(key: string, productoId: string) {
    const p = porId.get(productoId);
    if (!p) return setItem(key, { productoId: null, nombre: "", prendas: [], precioUnitario: 0 });
    const eleccion = p.componentes.find((c) => c.aEleccion)?.componente.id ?? null;
    setItem(key, { productoId, nombre: p.nombre, precioUnitario: p.precio ?? 0, prendas: prendasDe(p, eleccion), eleccionId: eleccion });
  }
  function cambiarEleccion(item: ItemForm, eleccionId: string) {
    const p = porId.get(item.productoId!);
    if (!p) return;
    const nuevas = prendasDe(p, eleccionId).map((pr, i) => ({ ...pr, color: item.prendas[i]?.color ?? "", talle: item.prendas[i]?.productoId === pr.productoId ? item.prendas[i].talle : "" }));
    setItem(item.key, { eleccionId, prendas: nuevas });
  }
  function setPrenda(item: ItemForm, idx: number, cambios: Partial<PrendaForm>) {
    const prendas = item.prendas.map((p, i) => (i === idx ? { ...p, ...cambios } : p));
    // Si cambia el color de la primera prenda, se copia a las demás que tenían el mismo color (o vacío)
    if (idx === 0 && cambios.color !== undefined) {
      const anterior = item.prendas[0].color;
      prendas.forEach((p, i) => { if (i > 0 && (!p.color || p.color === anterior)) p.color = cambios.color!; });
    }
    setItem(item.key, { prendas });
  }
  function talles(pr: PrendaForm) {
    return (pr.productoId && porId.get(pr.productoId)?.talles) || allTalles(pr.productoId);
  }
  function allTalles(id: string | null) {
    for (const p of productos) for (const c of p.componentes) if (c.componente.id === id) return c.componente.talles;
    return [];
  }
  function colores(pr: PrendaForm) {
    for (const p of productos) {
      if (p.id === pr.productoId) return p.colores;
      for (const c of p.componentes) if (c.componente.id === pr.productoId) return c.componente.colores;
    }
    return [];
  }
  function togglePrioridad(on: boolean) {
    setF((x) => {
      let items = x.items.filter((i) => !(prodPrioridad && i.productoId === prodPrioridad.id));
      if (on && prodPrioridad) {
        items = [...items, { ...itemVacio(), productoId: prodPrioridad.id, nombre: prodPrioridad.nombre, precioUnitario: prodPrioridad.precio ?? 0, bordadoUbicacion: "", hilo: "" }];
      }
      return { ...x, prioridad: on, items };
    });
  }

  // ---------- Pedido grupal ----------
  const [grupo, setGrupo] = useState({ productoId: "", color: "", hilo: "Dorado", ubicacion: "Espalda", lista: "" });
  function generarGrupo() {
    const p = porId.get(grupo.productoId);
    if (!p) return;
    const lineas = grupo.lista.split("\n").map((l) => l.trim()).filter(Boolean);
    const nuevos = lineas.map((l) => {
      const [texto, ...tl] = l.split(/\s*[;,\-–]\s*/);
      const eleccion = p.componentes.find((c) => c.aEleccion)?.componente.id ?? null;
      const prendas = prendasDe(p, eleccion).map((pr, i) => ({ ...pr, color: grupo.color, talle: tl[i] ?? "" }));
      return {
        ...itemVacio(), productoId: p.id, nombre: p.nombre, precioUnitario: p.precio ?? 0, persona: texto,
        bordadoTexto: texto, hilo: grupo.hilo, bordadoUbicacion: grupo.ubicacion, prendas, eleccionId: eleccion,
      };
    });
    setF((x) => ({ ...x, items: [...x.items.filter((i) => i.nombre), ...nuevos] }));
    setGrupo({ ...grupo, lista: "" });
  }

  // ---------- Totales y mensaje ----------
  const total = f.items.reduce((s, i) => s + (i.nombre ? i.precioUnitario * i.cantidad : 0), 0);
  const saldoFinal = Math.max(0, total - (pedidoId ? 0 : f.sena));
  const vistaPrevia = armarMensaje(conLinkResumen(plantilla), {
    numero: numero ?? 0,
    total,
    fechaEvento: f.fechaEvento ? new Date(f.fechaEvento + "T12:00:00-03:00") : null,
    fechaEntrega: f.fechaEntrega ? new Date(f.fechaEntrega + "T12:00:00-03:00") : null,
    envio: f.envio, formaEnvio: f.formaEnvio, direccionEnvio: f.direccionEnvio, localidad: f.localidad,
    cliente: { nombre: f.cliente.nombre || "Clienta" },
    items: f.items.filter((i) => i.nombre).map((i) => ({ ...i, persona: i.persona || null, bordadoTexto: i.bordadoTexto || null, bordadoUbicacion: i.bordadoUbicacion || null, hilo: i.hilo || null })),
    pagos: pedidoId ? [] : f.sena > 0 ? [{ monto: f.sena }] : [],
  }, { link_resumen: "(link al resumen, se crea al guardar)" }).replace(/N° 0\b/, numero ? `N° ${numero}` : "N° (se asigna al guardar)");

  function guardar(enviar: boolean) {
    setError(null);
    const ventana = enviar ? window.open("about:blank", "_blank") : null;
    start(async () => {
      const r = await guardarPedido(f, pedidoId);
      if (!r.ok) {
        ventana?.close();
        setError(r.error);
        return;
      }
      if (enviar) {
        const link = linkWhatsApp(r.telefono, r.mensaje);
        if (link && ventana) ventana.location.href = link;
        else ventana?.close();
      }
      router.push(`/pedidos/${r.id}?guardado=1${enviar && !r.telefono ? "&sinTelefono=1" : ""}${r.avisoCliente ? `&aviso=${encodeURIComponent(r.avisoCliente)}` : ""}`);
    });
  }

  const vendibles = productos.filter((p) => p.tipo !== "ADICIONAL" || !/prioridad/i.test(p.nombre));
  const grupos = [
    { t: "Boxes de regalo", l: vendibles.filter((p) => p.tipo === "BOX") },
    { t: "Batas y prendas", l: vendibles.filter((p) => p.tipo === "SUELTO") },
    { t: "Kits", l: vendibles.filter((p) => p.tipo === "KIT") },
    { t: "Adicionales", l: vendibles.filter((p) => p.tipo === "ADICIONAL") },
  ];

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
      <div className="space-y-5 min-w-0">
        {/* 1. CLIENTA */}
        <Paso n={1} titulo="Clienta" ayuda="Buscala por nombre, N° de clienta, teléfono o Instagram. Si es nueva, cargala acá mismo.">
          {f.cliente.id ? (
            <div className="rounded-xl border border-acento/40 bg-acento-suave/40 p-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{f.cliente.nombre} <span className="text-texto-2 text-sm">· N° {f.cliente.numero}</span></p>
                <p className="text-sm text-texto-2">{[f.cliente.telefono || "sin teléfono", f.cliente.instagram].filter(Boolean).join(" · ")}</p>
                {!f.cliente.telefono && (
                  <input className="campo mt-2" inputMode="tel" placeholder="Agregar WhatsApp (para enviarle la confirmación)"
                    value={f.cliente.telefono} onChange={(e) => setCliente({ telefono: e.target.value })} />
                )}
              </div>
              <button type="button" className="btn-suave min-h-10 px-4" onClick={() => setCliente({ id: null, numero: undefined, nombre: "", telefono: "", instagram: "", email: "" })}>Cambiar</button>
            </div>
          ) : nueva ? (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="etiqueta">Nombre y apellido *</label>
                  <input className="campo" value={f.cliente.nombre} onChange={(e) => setCliente({ nombre: e.target.value })} />
                </div>
                <div>
                  <label className="etiqueta">WhatsApp</label>
                  <input className="campo" inputMode="tel" placeholder="11 2345 6789" value={f.cliente.telefono} onChange={(e) => setCliente({ telefono: e.target.value })} />
                </div>
                <div>
                  <label className="etiqueta">Instagram</label>
                  <input className="campo" autoCapitalize="none" placeholder="@usuario" value={f.cliente.instagram} onChange={(e) => setCliente({ instagram: e.target.value })} />
                </div>
              </div>
              <button type="button" className="text-sm text-acento hover:underline" onClick={() => setNueva(false)}>← Buscar una clienta existente</button>
            </div>
          ) : (
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-3.5 text-texto-2" />
              <input className="campo pl-10" placeholder="Buscar clienta…" value={busqueda} onChange={(e) => buscar(e.target.value)} />
              {resultados.length > 0 && (
                <ul className="mt-2 rounded-xl border border-borde divide-y divide-borde overflow-hidden">
                  {resultados.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => elegirCliente(c)} className="w-full text-left px-4 py-3 hover:bg-fondo min-h-11 cursor-pointer">
                        <span className="font-medium">{c.nombre}</span> <span className="text-sm text-texto-2">· N° {c.numero}{c.telefono ? ` · ${c.telefono}` : ""}{c.instagram ? ` · ${c.instagram}` : ""}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {busqueda.trim().length >= 2 && resultados.length === 0 && <p className="text-sm text-texto-2 mt-2">No encontramos a nadie con &quot;{busqueda}&quot;.</p>}
              <button type="button" className="btn-secundario mt-3" onClick={() => { setNueva(true); setCliente({ nombre: busqueda }); }}>
                <Plus size={16} /> Clienta nueva
              </button>
            </div>
          )}
        </Paso>

        {/* 2. TIPO */}
        <Paso n={2} titulo="Tipo de pedido">
          <div className="grid sm:grid-cols-3 gap-2">
            {([
              ["INDIVIDUAL", "Individual", "Una o algunas prendas"],
              ["BOX", "Box de regalo", "Boxes con caja y tarjeta"],
              ["EVENTO", "Evento / grupal", "XV, bodas: varios nombres"],
            ] as const).map(([v, t, d]) => (
              <button key={v} type="button" onClick={() => set("tipo", v)}
                className={`text-left rounded-xl border p-4 min-h-11 cursor-pointer ${f.tipo === v ? "border-acento bg-acento-suave/50 ring-1 ring-acento" : "border-borde hover:border-acento/60"}`}>
                <p className="font-medium">{t}</p>
                <p className="text-xs text-texto-2">{d}</p>
              </button>
            ))}
          </div>
        </Paso>

        {/* 3. PRODUCTOS */}
        <Paso n={3} titulo="Productos" ayuda="Para cada producto elegí color, talle y bordado. El color de la primera prenda se copia a las demás (podés cambiarlo).">
          {f.tipo === "EVENTO" && (
            <div className="rounded-xl bg-menu/60 p-4 mb-4 space-y-3">
              <p className="font-medium flex items-center gap-2"><Users size={18} /> Cargar varios nombres de una vez</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <select className="campo" value={grupo.productoId} onChange={(e) => setGrupo({ ...grupo, productoId: e.target.value })}>
                  <option value="">Producto para todas…</option>
                  {grupos.map((g) => <optgroup key={g.t} label={g.t}>{g.l.filter((p) => p.tipo !== "ADICIONAL").map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</optgroup>)}
                </select>
                <Opciones valor={grupo.color} opciones={porId.get(grupo.productoId)?.colores.length ? porId.get(grupo.productoId)!.colores : (porId.get(grupo.productoId)?.componentes[0]?.componente.colores ?? [])} onChange={(v) => setGrupo({ ...grupo, color: v })} placeholder="Color para todas" />
                <Opciones valor={grupo.hilo} opciones={HILOS} onChange={(v) => setGrupo({ ...grupo, hilo: v })} placeholder="Hilo" />
                <Opciones valor={grupo.ubicacion} opciones={UBICACIONES} onChange={(v) => setGrupo({ ...grupo, ubicacion: v })} placeholder="Ubicación del bordado" />
              </div>
              <textarea className="campo py-2.5" rows={4} value={grupo.lista} onChange={(e) => setGrupo({ ...grupo, lista: e.target.value })}
                placeholder={"Un nombre por renglón. Podés agregar los talles separados por coma:\nSofi, M, 37\nMía, S, 36\nAbru, L, 38"} />
              <button type="button" className="btn-secundario" disabled={!grupo.productoId || !grupo.lista.trim()} onClick={generarGrupo}>
                Agregar {grupo.lista.split("\n").filter((l) => l.trim()).length || ""} al pedido
              </button>
            </div>
          )}

          <div className="space-y-4">
            {f.items.filter((it) => !(prodPrioridad && it.productoId === prodPrioridad.id)).map((it, n) => {
              const p = it.productoId ? porId.get(it.productoId) : undefined;
              const esAdicional = p?.tipo === "ADICIONAL";
              const opciones = p?.componentes.filter((c) => c.aEleccion) ?? [];
              return (
                <div key={it.key} className="rounded-xl border border-borde p-4">
                  <div className="flex gap-2 items-start">
                    <span className="text-xs text-texto-2 mt-3.5 w-5 shrink-0">{n + 1}.</span>
                    <div className="flex-1 grid sm:grid-cols-[1fr_90px_150px] gap-2">
                      <select className="campo" value={it.productoId ?? ""} onChange={(e) => elegirProducto(it.key, e.target.value)}>
                        <option value="">{it.nombre && !it.productoId ? it.nombre : "Elegí un producto…"}</option>
                        {grupos.map((g) => <optgroup key={g.t} label={g.t}>{g.l.map((pp) => <option key={pp.id} value={pp.id}>{pp.nombre}{pp.precio ? ` · ${pesos(pp.precio)}` : ""}</option>)}</optgroup>)}
                      </select>
                      <label className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-texto-2">Cant.</span>
                        <input type="number" min={1} className="campo pl-12" value={it.cantidad} onChange={(e) => setItem(it.key, { cantidad: Math.max(1, parseInt(e.target.value) || 1) })} />
                      </label>
                      <label className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-2">$</span>
                        <input inputMode="numeric" className="campo pl-7 text-right" value={it.precioUnitario ? it.precioUnitario.toLocaleString("es-AR") : ""} placeholder="Precio"
                          onChange={(e) => setItem(it.key, { precioUnitario: parseInt(e.target.value.replace(/\D/g, "")) || 0 })} />
                      </label>
                    </div>
                    <button type="button" title="Quitar" className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-texto-2 hover:bg-estado-alerta hover:text-estado-alerta-txt cursor-pointer"
                      onClick={() => setF((x) => ({ ...x, items: x.items.length > 1 ? x.items.filter((i) => i.key !== it.key) : [itemVacio()] }))}>
                      <Trash2 size={17} />
                    </button>
                  </div>

                  {it.nombre && !esAdicional && (
                    <div className="pl-7 mt-3 space-y-3">
                      {opciones.length > 0 && (
                        <div>
                          <span className="etiqueta">A elección</span>
                          <div className="flex flex-wrap gap-2">
                            {opciones.map((o) => (
                              <button key={o.componente.id} type="button" onClick={() => cambiarEleccion(it, o.componente.id)}
                                className={`chip text-sm py-2 px-3.5 cursor-pointer border ${it.eleccionId === o.componente.id ? "bg-acento text-white border-acento" : "bg-white border-borde"}`}>
                                {o.componente.nombre}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {it.prendas.length > 0 && (
                        <div className="space-y-2">
                          {it.prendas.map((pr, k) => (
                            <div key={k} className="grid grid-cols-[1fr] sm:grid-cols-[150px_1fr_110px] gap-2 items-center">
                              <span className="text-sm font-medium">{pr.nombre}</span>
                              <Opciones valor={pr.color} opciones={colores(pr)} onChange={(v) => setPrenda(it, k, { color: v })} placeholder="Color" />
                              <Opciones valor={pr.talle} opciones={talles(pr)} onChange={(v) => setPrenda(it, k, { talle: v })} placeholder={talles(pr).length ? "Talle" : "Talle (opc.)"} />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="grid sm:grid-cols-2 gap-2">
                        <input className="campo" placeholder="Texto del bordado (ej: Mía Mis XV)" value={it.bordadoTexto} onChange={(e) => setItem(it.key, { bordadoTexto: e.target.value })} />
                        <input className="campo" placeholder="Para quién es (opcional, ej: Mamá)" value={it.persona} onChange={(e) => setItem(it.key, { persona: e.target.value })} />
                        <Opciones valor={it.bordadoUbicacion} opciones={UBICACIONES} onChange={(v) => setItem(it.key, { bordadoUbicacion: v })} placeholder="Ubicación del bordado" />
                        <Opciones valor={it.hilo} opciones={HILOS} onChange={(v) => setItem(it.key, { hilo: v })} placeholder="Color del hilo" />
                      </div>
                      <BordadoUbicacion detalle={it.bordadoDetalle} fotos={it.bordadoFotos} onChange={(v) => setItem(it.key, v)} />
                      <input className="campo" placeholder="Notas (medidas especiales, talle distinto arriba/abajo, etc.)" value={it.notas} onChange={(e) => setItem(it.key, { notas: e.target.value })} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button type="button" className="btn-secundario mt-4" onClick={() => setF((x) => ({ ...x, items: [...x.items, itemVacio()] }))}>
            <Plus size={16} /> Agregar otro producto
          </button>
        </Paso>

        {/* 4. DISEÑOS */}
        <Paso n={4} titulo="Diseños de bordado" ayuda="Elegí fotos de la galería para que el taller vea el modelo. Se adjuntan a la orden.">
          {disenos.length === 0 ? (
            <p className="text-sm text-texto-2">Todavía no hay fotos en la galería. Podés subirlas en <Link href="/catalogo/disenos" className="text-acento underline">Catálogo → Galería de diseños</Link>.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {disenos.map((d) => {
                const on = f.disenos.includes(d.id);
                return (
                  <button key={d.id} type="button" onClick={() => set("disenos", on ? f.disenos.filter((x) => x !== d.id) : [...f.disenos, d.id])}
                    className={`relative rounded-xl overflow-hidden border-2 cursor-pointer ${on ? "border-acento" : "border-transparent"}`}>
                    <img src={d.imagen} alt={d.nombre} className="w-full aspect-square object-cover bg-menu" />
                    <span className="block text-[11px] leading-tight p-1.5 bg-white text-left">{d.nombre}</span>
                    {on && <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-acento text-white flex items-center justify-center"><Check size={14} /></span>}
                  </button>
                );
              })}
            </div>
          )}
        </Paso>

        {/* 5. ENTREGA */}
        <Paso n={5} titulo="Evento y entrega" ayuda="La producción de cada taller (Gery, Héctor, Richard y Pedro) se organiza en la Etapa 4 a partir de estos datos.">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="etiqueta">Evento</label>
              <Opciones valor={f.evento} opciones={EVENTOS} onChange={(v) => set("evento", v)} placeholder="Sin evento" />
            </div>
            <div>
              <label className="etiqueta">Fecha del evento</label>
              <input type="date" className="campo" value={f.fechaEvento} onChange={(e) => set("fechaEvento", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="etiqueta">Detalle del evento (opcional)</label>
              <input className="campo" placeholder="Ej: XV de Mía · fiesta en enero" value={f.eventoDetalle} onChange={(e) => set("eventoDetalle", e.target.value)} />
            </div>
            <div>
              <label className="etiqueta">Fecha de entrega</label>
              <input type="date" className="campo" value={f.fechaEntrega} onChange={(e) => set("fechaEntrega", e.target.value)} />
            </div>
            <div>
              <label className="etiqueta">¿Envío o retira?</label>
              <div className="grid grid-cols-2 gap-2">
                {[["Envío", true], ["Retira", false]].map(([t, v]) => (
                  <button key={String(t)} type="button" onClick={() => set("envio", v as boolean)}
                    className={`btn ${f.envio === v ? "bg-acento text-white" : "bg-white border border-borde"}`}>{t as string}</button>
                ))}
              </div>
            </div>
            {f.envio && (
              <>
                <div>
                  <label className="etiqueta">Forma de envío</label>
                  <Opciones valor={f.formaEnvio} opciones={FORMAS_ENVIO.filter((x) => x !== "Retira")} onChange={(v) => set("formaEnvio", v)} placeholder="Elegí…" />
                </div>
                <div>
                  <label className="etiqueta">Localidad / provincia</label>
                  <input className="campo" value={f.localidad} onChange={(e) => set("localidad", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="etiqueta">Dirección de envío</label>
                  <input className="campo" placeholder="Calle, número, piso/depto, entre calles" value={f.direccionEnvio} onChange={(e) => set("direccionEnvio", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="etiqueta">Entre calles</label>
                  <input className="campo" placeholder="Ej: entre Av. Cabildo y Amenábar" value={f.entreCalles} onChange={(e) => set("entreCalles", e.target.value)} />
                </div>
                <div>
                  <label className="etiqueta">Provincia</label>
                  <input className="campo" value={f.provincia} onChange={(e) => set("provincia", e.target.value)} />
                </div>
                <div>
                  <label className="etiqueta">Código postal</label>
                  <input className="campo" inputMode="numeric" value={f.codigoPostal} onChange={(e) => set("codigoPostal", e.target.value)} />
                </div>
              </>
            )}
            <label className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-borde p-3 cursor-pointer min-h-11">
              <input type="checkbox" className="w-5 h-5 accent-acento" checked={f.prioridad} onChange={(e) => togglePrioridad(e.target.checked)} />
              <span className="text-sm"><strong>Prioridad</strong> {prodPrioridad?.precio ? `(+${pesos(prodPrioridad.precio)})` : ""} — se suma al total</span>
            </label>
            <div>
              <label className="etiqueta">Vendedora</label>
              <select className="campo" value={f.vendedorId} onChange={(e) => set("vendedorId", e.target.value)}>
                {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
            </div>
            {pedidoId && (
              <div>
                <label className="etiqueta">Estado</label>
                <select className="campo" value={f.estado} onChange={(e) => set("estado", e.target.value)}>
                  {ESTADOS.map((e) => <option key={e} value={e}>{NOMBRE_ESTADO[e]}</option>)}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="etiqueta">Notas internas</label>
              <textarea rows={2} className="campo py-2.5" value={f.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Ej: despachar el miércoles, coser bata de Delfi…" />
            </div>
          </div>
        </Paso>

        {/* 6. PAGO */}
        <Paso n={6} titulo="Pago">
          {pedidoId ? (
            <p className="text-sm text-texto-2">Los pagos de un pedido ya guardado se registran desde la ficha del pedido.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="etiqueta">Seña / pago recibido</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-2">$</span>
                  <input inputMode="numeric" className="campo pl-7" value={f.sena ? f.sena.toLocaleString("es-AR") : ""} placeholder="0"
                    onChange={(e) => set("sena", parseInt(e.target.value.replace(/\D/g, "")) || 0)} />
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="button" className="chip bg-menu text-texto py-1.5 px-3 cursor-pointer" onClick={() => set("sena", Math.round(total / 2))}>50%</button>
                  <button type="button" className="chip bg-menu text-texto py-1.5 px-3 cursor-pointer" onClick={() => set("sena", total)}>Total</button>
                </div>
              </div>
              <div>
                <label className="etiqueta">Medio de pago</label>
                <select className="campo" value={f.medioSena} onChange={(e) => set("medioSena", e.target.value)}>
                  {MEDIOS.map((m) => <option key={m} value={m}>{NOMBRE_MEDIO[m]}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <button type="button" className="btn-suave" disabled title="Se activa en la Etapa 3">Generar link de Mercado Pago (Etapa 3)</button>
              </div>
            </div>
          )}
        </Paso>
      </div>

      {/* RESUMEN */}
      <aside className="xl:sticky xl:top-6 space-y-4">
        <div className="tarjeta p-5">
          <h2 className="text-2xl mb-3">Resumen</h2>
          {f.cliente.nombre && <p className="text-sm mb-2"><span className="text-texto-2">Clienta:</span> {f.cliente.nombre}</p>}
          <ul className="text-sm space-y-1 mb-4">
            {f.items.filter((i) => i.nombre).map((i) => (
              <li key={i.key} className="flex justify-between gap-3">
                <span>{i.cantidad > 1 ? `${i.cantidad} × ` : ""}{i.nombre}{i.persona ? <span className="text-texto-2"> · {i.persona}</span> : null}</span>
                <span className="whitespace-nowrap">{pesos(i.precioUnitario * i.cantidad)}</span>
              </li>
            ))}
            {!f.items.some((i) => i.nombre) && <li className="text-texto-2">Todavía no hay productos.</li>}
          </ul>
          <div className="border-t border-borde pt-3 space-y-1">
            <div className="flex justify-between text-lg"><span>Total</span><strong>{pesos(total)}</strong></div>
            {!pedidoId && <div className="flex justify-between text-sm text-texto-2"><span>Seña</span><span>{pesos(f.sena)}</span></div>}
            {!pedidoId && (
              <div className={`flex justify-between text-sm font-medium ${saldoFinal > 0 ? "text-estado-alerta-txt" : "text-estado-listo-txt"}`}>
                <span>Saldo</span><span>{pesos(saldoFinal)}</span>
              </div>
            )}
          </div>
          {error && <p className="mt-4 text-sm text-estado-alerta-txt bg-estado-alerta rounded-xl px-3 py-2">{error}</p>}
          <div className="mt-4 space-y-2">
            <button type="button" className="btn-primario w-full" disabled={guardando} onClick={() => guardar(true)}>
              <MessageCircle size={18} /> {guardando ? "Guardando…" : pedidoId ? "Guardar y enviar por WhatsApp" : "Guardar y enviar confirmación"}
            </button>
            <button type="button" className="btn-secundario w-full" disabled={guardando} onClick={() => guardar(false)}>
              {pedidoId ? "Guardar cambios" : "Guardar sin enviar"}
            </button>
          </div>
        </div>
        <div className="tarjeta p-5">
          <p className="text-sm font-medium mb-2">Vista previa del mensaje</p>
          <div className="rounded-xl bg-[#E7F7E1] p-3 text-[13px] leading-snug whitespace-pre-wrap text-[#1F2D1A] max-h-96 overflow-auto">{vistaPrevia}</div>
          <p className="ayuda">Podés cambiar este texto en Pedidos → Mensajes de WhatsApp.</p>
        </div>
      </aside>
      <div className="xl:hidden sticky bottom-0 -mx-4 px-4 py-3 bg-fondo/95 border-t border-borde flex items-center justify-between gap-3 no-imprimir">
        <span className="text-sm">Total <strong>{pesos(total)}</strong></span>
        <button type="button" className="btn-primario" disabled={guardando} onClick={() => guardar(false)}>{guardando ? "Guardando…" : "Guardar"}</button>
      </div>
    </div>
  );
}
