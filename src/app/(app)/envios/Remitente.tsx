"use client";
import { useState } from "react";
import { useFormulario } from "@/lib/useFormulario";
import { guardarRemitente } from "./paqar";

type R = Record<string, string>;

export default function Remitente({ datos }: { datos: R }) {
  const [abierto, setAbierto] = useState(false);
  const [e, onSubmit, p] = useFormulario(guardarRemitente, null);
  const completo = !!(datos.calle && datos.altura && datos.localidad);
  return (
    <div className="mt-3">
      <button type="button" onClick={() => setAbierto(!abierto)} className="text-sm text-acento hover:underline">
        {abierto ? "Ocultar" : completo ? "Editar" : "Completar"} datos del remitente (para Correo Argentino)
      </button>
      {abierto && (
        <form onSubmit={onSubmit} className="grid sm:grid-cols-3 gap-2 mt-2">
          <input name="nombre" className="campo sm:col-span-3" placeholder="Nombre o razón social" defaultValue={datos.nombre ?? "Micaela Diseño"} />
          <input name="calle" className="campo sm:col-span-2" placeholder="Calle" defaultValue={datos.calle ?? ""} />
          <input name="altura" className="campo" placeholder="Altura" inputMode="numeric" defaultValue={datos.altura ?? ""} />
          <input name="localidad" className="campo" placeholder="Localidad" defaultValue={datos.localidad ?? "González Catán"} />
          <input name="provincia" className="campo" placeholder="Provincia" defaultValue={datos.provincia ?? "Buenos Aires"} />
          <input name="telefono" className="campo" placeholder="Teléfono" inputMode="tel" defaultValue={datos.telefono ?? ""} />
          <input name="email" className="campo sm:col-span-2" placeholder="Email" defaultValue={datos.email ?? ""} />
          <div className="flex items-center gap-3">
            <button className="btn-suave min-h-11" disabled={p}>{p ? "Guardando…" : "Guardar"}</button>
            {e?.ok && <span className="text-xs text-estado-listo-txt">{e.ok}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
