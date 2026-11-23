"use client";
import { useFormulario } from "@/lib/useFormulario";
import { useState } from "react";
import CampoEtiquetas from "@/components/CampoEtiquetas";
import type { EstadoForm } from "./acciones";

type Producto = {
  nombre: string; tipo: string; descripcion: string | null; precio: number | null;
  colores: string[]; talles: string[]; activo: boolean; orden: number;
  componentes: { componenteId: string; cantidad: number; opcional: boolean }[];
};
type Opcion = { id: string; nombre: string };

export default function ProductoForm({
  accion, producto, sueltos,
}: {
  accion: (prev: EstadoForm, form: FormData) => Promise<EstadoForm>;
  producto?: Producto;
  sueltos: Opcion[];
}) {
  const [estado, onSubmit, enviando] = useFormulario(accion, null);
  const [tipo, setTipo] = useState(producto?.tipo ?? "SUELTO");
  const comp = new Map((producto?.componentes ?? []).map((c) => [c.componenteId, c]));
  const [elegidos, setElegidos] = useState<Set<string>>(new Set(comp.keys()));

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-[1fr_220px] gap-4">
        <div>
          <label className="etiqueta" htmlFor="nombre">Nombre *</label>
          <input id="nombre" name="nombre" className="campo" defaultValue={producto?.nombre} required />
        </div>
        <div>
          <label className="etiqueta" htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" className="campo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="SUELTO">Producto suelto</option>
            <option value="BOX">Box de regalo</option>
            <option value="KIT">Kit</option>
            <option value="ADICIONAL">Adicional (ej. bordado)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="etiqueta" htmlFor="descripcion">Descripción / qué incluye</label>
        <textarea id="descripcion" name="descripcion" rows={2} className="campo py-2.5" defaultValue={producto?.descripcion ?? ""} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="etiqueta" htmlFor="precio">Precio</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-2">$</span>
            <input id="precio" name="precio" className="campo pl-7" inputMode="numeric" placeholder="A definir"
              defaultValue={producto?.precio != null ? producto.precio.toLocaleString("es-AR") : ""} />
          </div>
          <p className="ayuda">Dejalo vacío si el precio está &quot;a definir&quot;.</p>
        </div>
        <div>
          <label className="etiqueta" htmlFor="orden">Orden en la lista</label>
          <input id="orden" name="orden" type="number" className="campo" defaultValue={producto?.orden ?? 0} />
          <p className="ayuda">Los números más chicos aparecen primero.</p>
        </div>
      </div>

      {tipo !== "ADICIONAL" && tipo !== "BOX" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <span className="etiqueta">Colores</span>
            <CampoEtiquetas nombre="colores" inicial={producto?.colores} placeholder="Ej: Rosa palo" />
          </div>
          <div>
            <span className="etiqueta">Talles</span>
            <CampoEtiquetas nombre="talles" inicial={producto?.talles} placeholder="Ej: M" />
          </div>
        </div>
      )}

      {(tipo === "BOX" || tipo === "KIT") && (
        <div>
          <span className="etiqueta">Prendas que incluye</span>
          <p className="ayuda mb-2 mt-0">Al cargar un pedido, se va a pedir color y talle de cada prenda marcada.</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {sueltos.map((s) => {
              const on = elegidos.has(s.id);
              const c = comp.get(s.id);
              return (
                <div key={s.id} className={`rounded-xl border p-3 ${on ? "border-acento bg-acento-suave/40" : "border-borde"}`}>
                  <label className="flex items-center gap-2 cursor-pointer min-h-8">
                    <input type="checkbox" name="componente" value={s.id} checked={on} className="w-5 h-5 accent-acento"
                      onChange={(e) => {
                        const n = new Set(elegidos);
                        if (e.target.checked) n.add(s.id); else n.delete(s.id);
                        setElegidos(n);
                      }} />
                    <span className="text-sm font-medium">{s.nombre}</span>
                  </label>
                  {on && (
                    <div className="flex items-center gap-4 mt-2 pl-7 text-sm">
                      <label className="flex items-center gap-1.5">
                        Cant.
                        <input type="number" min={1} name={`cantidad_${s.id}`} defaultValue={c?.cantidad ?? 1} className="campo w-16 min-h-9 px-2" />
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" name={`opcional_${s.id}`} defaultChecked={c?.opcional} className="w-4 h-4 accent-acento" />
                        Opcional
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" name="activo" defaultChecked={producto?.activo ?? true} className="w-5 h-5 accent-acento" />
        <span className="text-sm">Activo (se muestra en la lista de precios y al cargar pedidos)</span>
      </label>

      {estado?.error && <p className="text-sm text-estado-alerta-txt bg-estado-alerta rounded-xl px-3 py-2">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-estado-listo-txt bg-estado-listo rounded-xl px-3 py-2">{estado.ok}</p>}
      <button className="btn-primario" disabled={enviando}>{enviando ? "Guardando…" : "Guardar producto"}</button>
    </form>
  );
}
