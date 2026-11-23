"use client";
import { useFormulario } from "@/lib/useFormulario";
import type { EstadoForm } from "./acciones";

type Cliente = {
  nombre: string; telefono: string | null; instagram: string | null;
  email: string | null; direccion: string | null; notas: string | null;
  localidad?: string | null; provincia?: string | null; codigoPostal?: string | null; dni?: string | null; entreCalles?: string | null;
};

export default function ClienteForm({
  accion, cliente, textoBoton = "Guardar",
}: {
  accion: (prev: EstadoForm, form: FormData) => Promise<EstadoForm>;
  cliente?: Cliente;
  textoBoton?: string;
}) {
  const [estado, onSubmit, enviando] = useFormulario(accion, null);
  const repetido = estado?.error?.startsWith("Ya existe");

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="confirmarRepetido" value={repetido ? "1" : "0"} />
      <div>
        <label className="etiqueta" htmlFor="nombre">Nombre y apellido *</label>
        <input id="nombre" name="nombre" className="campo" defaultValue={cliente?.nombre} required />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="etiqueta" htmlFor="telefono">Teléfono / WhatsApp</label>
          <input id="telefono" name="telefono" className="campo" inputMode="tel" placeholder="11 2345 6789" defaultValue={cliente?.telefono ?? ""} />
        </div>
        <div>
          <label className="etiqueta" htmlFor="instagram">Instagram</label>
          <input id="instagram" name="instagram" className="campo" placeholder="@usuario" autoCapitalize="none" defaultValue={cliente?.instagram ?? ""} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="etiqueta" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="campo" autoCapitalize="none" defaultValue={cliente?.email ?? ""} />
        </div>
        <div>
          <label className="etiqueta" htmlFor="direccion">Dirección</label>
          <input id="direccion" name="direccion" className="campo" placeholder="Calle, número, piso/depto" defaultValue={cliente?.direccion ?? ""} />
        </div>
      </div>
      <div>
        <label className="etiqueta" htmlFor="entreCalles">Entre calles</label>
        <input id="entreCalles" name="entreCalles" className="campo" placeholder="Ej: entre Av. Cabildo y Amenábar" defaultValue={cliente?.entreCalles ?? ""} />
      </div>
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="sm:col-span-2">
          <label className="etiqueta" htmlFor="localidad">Localidad</label>
          <input id="localidad" name="localidad" className="campo" defaultValue={cliente?.localidad ?? ""} />
        </div>
        <div>
          <label className="etiqueta" htmlFor="provincia">Provincia</label>
          <input id="provincia" name="provincia" className="campo" defaultValue={cliente?.provincia ?? ""} />
        </div>
        <div>
          <label className="etiqueta" htmlFor="codigoPostal">Código postal</label>
          <input id="codigoPostal" name="codigoPostal" className="campo" inputMode="numeric" defaultValue={cliente?.codigoPostal ?? ""} />
        </div>
      </div>
      <div className="sm:w-1/2">
        <label className="etiqueta" htmlFor="dni">DNI (para envíos)</label>
        <input id="dni" name="dni" className="campo" inputMode="numeric" defaultValue={cliente?.dni ?? ""} />
      </div>
      <div>
        <label className="etiqueta" htmlFor="notas">Notas</label>
        <textarea id="notas" name="notas" rows={3} className="campo py-2.5" placeholder="Preferencias, talles habituales, etc." defaultValue={cliente?.notas ?? ""} />
      </div>
      {estado?.error && <p className="text-sm text-estado-alerta-txt bg-estado-alerta rounded-xl px-3 py-2">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-estado-listo-txt bg-estado-listo rounded-xl px-3 py-2">{estado.ok}</p>}
      <button className="btn-primario" disabled={enviando}>{enviando ? "Guardando…" : textoBoton}</button>
    </form>
  );
}
