"use client";
import { Check } from "lucide-react";

// Elegir color mirando la foto de la tela. Los colores sin foto se muestran solo con el nombre.
export default function SelectorColor({ name, colores, fotos, valor, onChange }: {
  name: string; colores: string[]; fotos: Record<string, string>; valor: string; onChange: (c: string) => void;
}) {
  const elegida = valor && fotos[valor];
  return (
    <fieldset>
      <legend className="etiqueta flex items-center gap-2">
        Color * {valor && <span className="font-normal text-texto">· {valor}</span>}
      </legend>
      {elegida && <img src={elegida} alt={`Color ${valor}`} className="w-full max-h-40 object-cover rounded-xl border border-borde mb-2" />}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
        {colores.map((c, i) => {
          const on = c === valor;
          return (
            <label key={c} className="cursor-pointer group">
              <input type="radio" name={name} value={c} checked={on} onChange={() => onChange(c)} required={i === 0} className="sr-only peer" />
              <span className={`relative block aspect-square rounded-lg overflow-hidden border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-acento ${on ? "border-acento" : "border-borde group-hover:border-acento/50"}`}>
                {fotos[c] ? <img src={fotos[c]} alt="" loading="lazy" className="w-full h-full object-cover" /> : (
                  <span className="w-full h-full bg-menu flex items-center justify-center text-[9px] text-texto-2/80 italic">sin foto</span>
                )}
                {on && <span className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-acento text-white flex items-center justify-center"><Check size={12} strokeWidth={3} /></span>}
              </span>
              <span className={`block text-[10px] text-center mt-0.5 leading-tight truncate ${on ? "font-semibold text-acento" : "text-texto-2"}`}>{c}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
