"use client";
import { useState } from "react";
import { useFormulario } from "@/lib/useFormulario";
import { enviarPedidoPublico } from "./acciones";
import { pesos } from "@/lib/formato";

type P = {
  id: string; nombre: string; precio: number | null; descripcion: string | null; colores: string[];
  tallesBata: string[]; tallesPantu: string[]; tallesOtro: string[]; opciones: { id: string; nombre: string }[];
};

function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: React.ReactNode; ayuda?: string }) {
  return (
    <div>
      <label className="etiqueta">{etiqueta}</label>
      {children}
      {ayuda && <p className="ayuda">{ayuda}</p>}
    </div>
  );
}

export default function FormPublico({ productos, precioBordadoExtra }: { productos: P[]; precioBordadoExtra: number }) {
  const [estado, onSubmit, enviando] = useFormulario(enviarPedidoPublico, null);
  const [pid, setPid] = useState("");
  const [evento, setEvento] = useState("no");
  const [envio, setEnvio] = useState("envio");
  const [extra, setExtra] = useState(false);
  const p = productos.find((x) => x.id === pid);

  if (estado?.ok) {
    return (
      <div className="tarjeta p-8 text-center">
        <p className="titulo text-4xl italic text-acento">¡Gracias!</p>
        <p className="mt-3">Recibimos tu pedido{estado.numero ? <> (N° <strong>{estado.numero}</strong>)</> : null}.</p>
        <p className="text-sm text-texto-2 mt-2">En breve te escribimos por WhatsApp para confirmar los detalles y la seña.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="text" name="sitio" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <section className="tarjeta p-5 space-y-4">
        <h2 className="text-2xl">Tus datos</h2>
        <Campo etiqueta="Nombre y apellido *"><input name="nombre" className="campo" required autoComplete="name" /></Campo>
        <Campo etiqueta="WhatsApp *" ayuda="Con código de área, ej: 11 2345 6789"><input name="telefono" className="campo" inputMode="tel" required autoComplete="tel" /></Campo>
        <Campo etiqueta="Instagram (opcional)"><input name="instagram" className="campo" placeholder="@usuario" autoCapitalize="none" /></Campo>
      </section>

      <section className="tarjeta p-5 space-y-4">
        <h2 className="text-2xl">Tu pedido</h2>
        <Campo etiqueta="Producto *">
          <select name="productoId" className="campo" required value={pid} onChange={(e) => setPid(e.target.value)}>
            <option value="">Elegí…</option>
            {productos.map((x) => <option key={x.id} value={x.id}>{x.nombre}{x.precio ? ` — ${pesos(x.precio)}` : ""}</option>)}
          </select>
        </Campo>
        {p?.descripcion && <p className="text-sm text-texto-2 -mt-2">{p.descripcion}</p>}
        {p && p.opciones.length > 0 && (
          <Campo etiqueta="¿Qué preferís?">
            <select name="eleccion" className="campo">{p.opciones.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select>
          </Campo>
        )}
        {p && p.colores.length > 0 && (
          <Campo etiqueta="Color">
            <select name="color" className="campo"><option value="">Elegí…</option>{p.colores.map((c) => <option key={c}>{c}</option>)}</select>
          </Campo>
        )}
        {p && (p.tallesBata.length > 0 || p.tallesPantu.length > 0 || p.tallesOtro.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {p.tallesBata.length > 0 && <Campo etiqueta="Talle de bata"><select name="talleBata" className="campo"><option value="">—</option>{p.tallesBata.map((t) => <option key={t}>{t}</option>)}</select></Campo>}
            {p.tallesPantu.length > 0 && <Campo etiqueta="Talle de pantufla"><select name="tallePantu" className="campo"><option value="">—</option>{p.tallesPantu.map((t) => <option key={t}>{t}</option>)}</select></Campo>}
            {p.tallesOtro.length > 0 && <Campo etiqueta="Talle pijama / camisolín"><select name="talleOtro" className="campo"><option value="">—</option>{p.tallesOtro.map((t) => <option key={t}>{t}</option>)}</select></Campo>}
          </div>
        )}
        <Campo etiqueta="Texto para bordar" ayuda="Ej: Mía Mis XV · Bride · tu nombre">
          <input name="bordado" className="campo" />
        </Campo>
        <Campo etiqueta="Color del hilo">
          <div className="grid grid-cols-2 gap-2">
            {["Dorado", "Plateado"].map((h, i) => (
              <label key={h} className="rounded-xl border border-borde min-h-11 flex items-center gap-2 px-3 cursor-pointer has-[:checked]:border-acento has-[:checked]:bg-acento-suave/50">
                <input type="radio" name="hilo" value={h} defaultChecked={i === 0} className="accent-acento w-4 h-4" /> {h}
              </label>
            ))}
          </div>
        </Campo>
        <label className="flex items-center gap-3 rounded-xl border border-borde p-3 cursor-pointer min-h-11">
          <input type="checkbox" className="w-5 h-5 accent-acento" checked={extra} onChange={(e) => setExtra(e.target.checked)} />
          <span className="text-sm">Quiero un bordado extra (+{pesos(precioBordadoExtra)})</span>
        </label>
        {extra && (
          <div className="grid grid-cols-[1fr_130px] gap-2">
            <input name="bordadoExtra" className="campo" placeholder="Texto del bordado extra" />
            <select name="ubicacionExtra" className="campo"><option>Adelante</option><option>Pantuflas</option><option>Otro lugar</option></select>
          </div>
        )}
      </section>

      <section className="tarjeta p-5 space-y-4">
        <h2 className="text-2xl">Evento y entrega</h2>
        <Campo etiqueta="¿Es para un evento?">
          <select name="evento" className="campo" value={evento} onChange={(e) => setEvento(e.target.value)}>
            <option value="no">No</option>
            <option value="XV">Sí, quince años</option>
            <option value="Boda">Sí, boda / despedida</option>
            <option value="otro">Otro</option>
          </select>
        </Campo>
        {evento === "otro" && <input name="eventoOtro" className="campo" placeholder="¿Qué evento?" />}
        {evento !== "no" && <Campo etiqueta="Fecha del evento"><input type="date" name="fechaEvento" className="campo" /></Campo>}
        <Campo etiqueta="¿Para qué fecha lo necesitás?"><input type="date" name="fechaNecesita" className="campo" /></Campo>
        <Campo etiqueta="¿Envío o retiro?">
          <div className="grid grid-cols-2 gap-2">
            {[["envio", "Envío"], ["retira", "Retiro"]].map(([v, t]) => (
              <label key={v} className="rounded-xl border border-borde min-h-11 flex items-center gap-2 px-3 cursor-pointer has-[:checked]:border-acento has-[:checked]:bg-acento-suave/50">
                <input type="radio" name="envio" value={v} checked={envio === v} onChange={() => setEnvio(v)} className="accent-acento w-4 h-4" /> {t}
              </label>
            ))}
          </div>
        </Campo>
        {envio === "envio" && (
          <>
            <Campo etiqueta="Dirección"><input name="direccion" className="campo" placeholder="Calle, número, piso/depto" autoComplete="street-address" /></Campo>
            <Campo etiqueta="Entre calles" ayuda="Ayuda al repartidor a encontrar la casa"><input name="entreCalles" className="campo" placeholder="Ej: entre Av. Cabildo y Amenábar" /></Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Localidad"><input name="localidad" className="campo" /></Campo>
              <Campo etiqueta="Provincia"><input name="provincia" className="campo" /></Campo>
              <Campo etiqueta="Código postal"><input name="codigoPostal" className="campo" inputMode="numeric" /></Campo>
              <Campo etiqueta="DNI (para el correo)"><input name="dni" className="campo" inputMode="numeric" /></Campo>
            </div>
          </>
        )}
        <Campo etiqueta="Comentarios"><textarea name="comentarios" rows={3} className="campo py-2.5" placeholder="Medidas especiales, dudas, detalles…" /></Campo>
      </section>

      {estado?.error && <p className="text-sm text-estado-alerta-txt bg-estado-alerta rounded-xl px-4 py-3">{estado.error}</p>}
      <button className="btn-primario w-full text-base min-h-12" disabled={enviando}>{enviando ? "Enviando…" : "Enviar pedido"}</button>
      <p className="text-xs text-center text-texto-2">Envíos a todo el país 📦</p>
    </form>
  );
}
