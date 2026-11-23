"use client";
import { Check } from "lucide-react";
import { TIPOGRAFIAS } from "@/lib/tipografias";

// Elegir una de las tipografías mirando cómo queda el texto del bordado
export default function SelectorTipografia({ name, valor, onChange, texto }: {
  name?: string; valor: string; onChange: (v: string) => void; texto?: string;
}) {
  const muestra = texto?.trim() || "Mía Mis XV";
  return (
    <fieldset>
      <legend className="text-[11px] text-texto-2 mb-1">Tipografía {valor ? <span className="text-texto font-medium">· {valor}</span> : null}</legend>
      {name && <input type="hidden" name={name} value={valor} />}
      <div className="grid grid-cols-2 gap-2">
        {TIPOGRAFIAS.map((t) => {
          const on = t.nombre === valor;
          return (
            <button key={t.nombre} type="button" onClick={() => onChange(on ? "" : t.nombre)} aria-pressed={on}
              className={`relative text-left rounded-xl border-2 px-3 py-2.5 bg-white cursor-pointer transition-colors ${on ? "border-acento bg-acento-suave/40" : "border-borde hover:border-acento/50"}`}>
              {on && <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-acento text-white flex items-center justify-center"><Check size={12} strokeWidth={3} /></span>}
              <span className="block truncate leading-tight min-h-[1.6em]" style={{ fontFamily: t.fuente, fontSize: t.tamano }}>{muestra}</span>
              <span className="block text-xs font-medium mt-1">{t.nombre}</span>
              <span className="block text-[10px] text-texto-2">{t.estilo}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
