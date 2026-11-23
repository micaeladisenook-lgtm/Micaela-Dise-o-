"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { useFormulario } from "@/lib/useFormulario";
import { guardarItem, moverStock, agregarConsumo, borrarConsumo, crearTelasPorColor } from "./acciones";

export const CATEGORIAS = ["Telas", "Hilos", "Cajas y packaging", "Tarjetas", "Accesorios", "Producto terminado", "Otros"];

type Item = { id: string; nombre: string; categoria: string; tipo: string; color: string | null; talle: string | null; tela: string | null; unidad: string; minimo: number; productoId: string | null; activo: boolean } | null;
type Op = { id: string; nombre: string };

function Mensaje({ estado }: { estado: { ok?: string; error?: string } | null }) {
  if (estado?.error) return <p className="text-sm text-estado-alerta-txt">{estado.error}</p>;
  if (estado?.ok) return <p className="text-sm text-estado-listo-txt">{estado.ok}</p>;
  return null;
}

export function FormItem({ item, productos, colores }: { item: Item; productos: Op[]; colores: string[] }) {
  const [estado, onSubmit, enviando] = useFormulario(guardarItem.bind(null, item?.id ?? null), null);
  const [tipo, setTipo] = useState(item?.tipo ?? "INSUMO");
  const [cat, setCat] = useState(item?.categoria ?? "Telas");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado?.ok && !item) ref.current?.reset(); }, [estado, item]);
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[["INSUMO", "Insumo"], ["PRODUCTO", "Producto terminado"]].map(([v, t]) => (
          <label key={v} className={`btn text-xs px-2 cursor-pointer ${tipo === v ? "bg-acento text-white" : "bg-white border border-borde"}`}>
            <input type="radio" name="tipo" value={v} checked={tipo === v} onChange={() => { setTipo(v); if (v === "PRODUCTO") setCat("Producto terminado"); }} className="sr-only" />{t}
          </label>
        ))}
      </div>
      <div><label className="etiqueta">Nombre *</label><input name="nombre" className="campo" defaultValue={item?.nombre} placeholder={tipo === "PRODUCTO" ? "Ej: Bata satén lista" : "Ej: Cajas de regalo"} required /></div>
      <div><label className="etiqueta">Categoría</label>
        <select name="categoria" className="campo" value={cat} onChange={(e) => setCat(e.target.value)}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      {(cat === "Telas" || tipo === "PRODUCTO") && (
        <div className="grid grid-cols-2 gap-2">
          {cat === "Telas" && <div><label className="etiqueta">Tela</label><select name="tela" className="campo" defaultValue={item?.tela ?? "Satén"}><option>Satén</option><option>Plush</option></select></div>}
          <div><label className="etiqueta">Color</label><select name="color" className="campo" defaultValue={item?.color ?? ""}><option value="">—</option>{colores.map((c) => <option key={c}>{c}</option>)}</select></div>
          {tipo === "PRODUCTO" && <div><label className="etiqueta">Talle</label><input name="talle" className="campo" defaultValue={item?.talle ?? ""} /></div>}
        </div>
      )}
      {tipo === "PRODUCTO" && (
        <div><label className="etiqueta">Producto del catálogo</label>
          <select name="productoId" className="campo" defaultValue={item?.productoId ?? ""}><option value="">—</option>{productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
          <p className="ayuda">Si hay stock, se descuenta solo al vender esa prenda con ese color (y talle).</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div><label className="etiqueta">Unidad</label><select name="unidad" className="campo" defaultValue={item?.unidad ?? (cat === "Telas" ? "metros" : "unidades")}><option>unidades</option><option>metros</option><option>conos</option><option>paquetes</option></select></div>
        <div><label className="etiqueta">Avisar si baja de</label><input name="minimo" inputMode="decimal" className="campo" defaultValue={item?.minimo ?? ""} placeholder="0" /></div>
      </div>
      {!item && <div><label className="etiqueta">Cantidad actual</label><input name="cantidad" inputMode="decimal" className="campo" placeholder="0" /></div>}
      {item && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="activo" defaultChecked={item.activo} className="w-5 h-5 accent-acento" /> Activo</label>}
      <Mensaje estado={estado} />
      <button className="btn-primario w-full" disabled={enviando}>{enviando ? "Guardando…" : item ? "Guardar cambios" : "Agregar"}</button>
    </form>
  );
}

export function FormMovimiento({ id, unidad }: { id: string; unidad: string }) {
  const [estado, onSubmit, enviando] = useFormulario(moverStock.bind(null, id), null);
  const [tipo, setTipo] = useState("entrada");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado?.ok) ref.current?.reset(); }, [estado]);
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-2">
      <div className="grid grid-cols-3 gap-1">
        {[["entrada", "+ Entrada"], ["salida", "− Salida"], ["ajuste", "Contar"]].map(([v, t]) => (
          <label key={v} className={`btn text-xs px-1 min-h-10 cursor-pointer ${tipo === v ? "bg-acento text-white" : "bg-white border border-borde"}`}>
            <input type="radio" name="tipo" value={v} checked={tipo === v} onChange={() => setTipo(v)} className="sr-only" />{t}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_1fr] gap-2">
        <input name="cantidad" inputMode="decimal" className="campo" placeholder={tipo === "ajuste" ? `Hay (${unidad})` : `Cantidad (${unidad})`} required />
        <input name="motivo" className="campo" placeholder="Motivo (opc.)" />
      </div>
      <Mensaje estado={estado} />
      <button className="btn-secundario w-full" disabled={enviando}>{enviando ? "Guardando…" : "Registrar"}</button>
    </form>
  );
}

export function FormConsumo({ productos, insumos }: { productos: Op[]; insumos: Op[] }) {
  const [estado, onSubmit, enviando] = useFormulario(agregarConsumo, null);
  return (
    <form onSubmit={onSubmit} className="grid sm:grid-cols-[1fr_1fr_110px_auto] gap-2 items-start">
      <select name="productoId" className="campo" required defaultValue=""><option value="" disabled>Producto…</option>{productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
      <select name="origen" className="campo" required defaultValue="">
        <option value="" disabled>Usa…</option>
        <optgroup label="Tela del color de la prenda"><option value="tela:Satén">Satén (según color)</option><option value="tela:Plush">Plush (según color)</option></optgroup>
        <optgroup label="Insumo fijo">{insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}</optgroup>
      </select>
      <input name="cantidad" inputMode="decimal" className="campo" placeholder="Cantidad" required />
      <button className="btn-primario" disabled={enviando}>Agregar</button>
      <div className="sm:col-span-4"><Mensaje estado={estado} /></div>
    </form>
  );
}

export function BorrarConsumo({ id }: { id: string }) {
  const [p, start] = useTransition();
  return <button disabled={p} onClick={() => start(() => borrarConsumo(id))} className="w-8 h-8 rounded-full inline-flex items-center justify-center text-texto-2 hover:bg-estado-alerta cursor-pointer" title="Quitar"><X size={14} /></button>;
}

export function BotonTelas({ tela }: { tela: string }) {
  const [p, start] = useTransition();
  return <button disabled={p} onClick={() => start(() => crearTelasPorColor(tela))} className="btn-suave min-h-10 px-4 text-xs">{p ? "Creando…" : `Crear ${tela} en todos los colores`}</button>;
}
