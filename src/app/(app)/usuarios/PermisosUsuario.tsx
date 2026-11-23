"use client";
import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useFormulario } from "@/lib/useFormulario";
import { guardarPermisosUsuario, type EstadoUsuario } from "./acciones";

type P = { clave: string; grupo: string; texto: string; ayuda?: string };

// Editor de permisos de una persona: arranca con los de su rol y se puede prender o apagar cada uno
export default function PermisosUsuario({ id, permisos, delRol, actuales, nombreRol }: {
  id: string; permisos: P[]; delRol: string[]; actuales: string[]; nombreRol: string;
}) {
  const [e, onSubmit, pendiente] = useFormulario(guardarPermisosUsuario.bind(null, id) as (prev: EstadoUsuario, f: FormData) => Promise<EstadoUsuario>, null);
  const [on, setOn] = useState(() => new Set(actuales));
  const rol = useMemo(() => new Set(delRol), [delRol]);
  const grupos = useMemo(() => [...new Set(permisos.map((p) => p.grupo))], [permisos]);
  const distintos = permisos.filter((p) => on.has(p.clave) !== rol.has(p.clave)).length;

  const poner = (claves: string[], valor: boolean) => setOn((s) => {
    const n = new Set(s);
    for (const c of claves) { if (valor) n.add(c); else n.delete(c); }
    return n;
  });

  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <p className="text-sm text-texto-2">
          Arranca con los permisos de <strong className="text-texto">{nombreRol}</strong>. Lo que cambies acá vale solo para esta persona.
          {distintos > 0 && <span className="ml-1 chip bg-acento-suave text-acento-oscuro">{distintos} personalizado{distintos === 1 ? "" : "s"}</span>}
        </p>
        {distintos > 0 && (
          <button type="button" onClick={() => setOn(new Set(rol))} className="btn-suave min-h-10 px-3 text-sm"><RotateCcw size={14} /> Volver a los del rol</button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3 items-start">
        {grupos.map((g) => {
          const lista = permisos.filter((p) => p.grupo === g);
          const todos = lista.every((p) => on.has(p.clave));
          const ninguno = lista.every((p) => !on.has(p.clave));
          return (
            <fieldset key={g} className="rounded-2xl border border-borde bg-white p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <legend className="font-semibold">{g}</legend>
                <div className="flex gap-1 text-xs">
                  <button type="button" disabled={todos} onClick={() => poner(lista.map((p) => p.clave), true)} className="px-2 py-1 rounded-full hover:bg-menu disabled:opacity-40 cursor-pointer disabled:cursor-default">Todo</button>
                  <button type="button" disabled={ninguno} onClick={() => poner(lista.map((p) => p.clave), false)} className="px-2 py-1 rounded-full hover:bg-menu disabled:opacity-40 cursor-pointer disabled:cursor-default">Nada</button>
                </div>
              </div>
              <ul className="divide-y divide-borde">
                {lista.map((p) => {
                  const activo = on.has(p.clave);
                  const propio = activo !== rol.has(p.clave);
                  return (
                    <li key={p.clave}>
                      <label className="flex items-start gap-3 py-2 cursor-pointer">
                        <input type="checkbox" name={p.clave} checked={activo} onChange={(ev) => poner([p.clave], ev.target.checked)} className="w-5 h-5 mt-0.5 shrink-0 accent-acento cursor-pointer" />
                        <span className="min-w-0 text-sm">
                          <span className={activo ? "" : "text-texto-2"}>{p.texto}</span>
                          {propio && <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-acento">{activo ? "agregado" : "quitado"}</span>}
                          {p.ayuda && <span className="block text-xs text-texto-2">{p.ayuda}</span>}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4 sticky bottom-0 bg-fondo/95 backdrop-blur py-3 -mx-1 px-1">
        <button className="btn-primario" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar permisos"}</button>
        {e?.error && <p className="text-sm text-estado-alerta-txt">{e.error}</p>}
        {e?.ok && <p className="text-sm text-estado-listo-txt">{e.ok}</p>}
      </div>
    </form>
  );
}
