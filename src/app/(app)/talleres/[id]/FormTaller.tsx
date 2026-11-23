"use client";
import { useFormulario } from "@/lib/useFormulario";
import { guardarTaller } from "../acciones";

type T = { id: string; nombre: string; especialidad: string | null; telefono: string | null; funcion: string; activo: boolean } | null;

export default function FormTaller({ taller }: { taller: T }) {
  const [estado, onSubmit, enviando] = useFormulario(guardarTaller.bind(null, taller?.id ?? null), null);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div><label className="etiqueta">Nombre</label><input name="nombre" className="campo" defaultValue={taller?.nombre} required /></div>
      <div><label className="etiqueta">Qué hace</label><input name="especialidad" className="campo" defaultValue={taller?.especialidad ?? ""} /></div>
      <div><label className="etiqueta">WhatsApp</label><input name="telefono" className="campo" inputMode="tel" defaultValue={taller?.telefono ?? ""} placeholder="11 2345 6789" /></div>
      <div>
        <label className="etiqueta">Paso de producción que hace</label>
        <select name="funcion" className="campo" defaultValue={taller?.funcion ?? "OTRO"}>
          <option value="CONFECCION_ROPA">Confección de batas y pijamas</option>
          <option value="BORDADO">Bordado</option>
          <option value="CONFECCION_PANTU">Confección de pantuflas</option>
          <option value="PEGADO_PANTU">Pegado de pantuflas</option>
          <option value="OTRO">Otro</option>
        </select>
        <p className="ayuda">Las tareas se asignan solas según este paso.</p>
      </div>
      <label className="flex items-center gap-2"><input type="checkbox" name="activo" defaultChecked={taller?.activo ?? true} className="w-5 h-5 accent-acento" /> Activo</label>
      {estado?.error && <p className="text-sm text-estado-alerta-txt">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-estado-listo-txt">{estado.ok}</p>}
      <button className="btn-primario" disabled={enviando}>{enviando ? "Guardando…" : "Guardar"}</button>
    </form>
  );
}
