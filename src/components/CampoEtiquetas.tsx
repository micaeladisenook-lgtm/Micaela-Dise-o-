"use client";
import { useState } from "react";
import { X } from "lucide-react";

// Campo para cargar una lista (colores, talles) como "chips"
export default function CampoEtiquetas({
  nombre, inicial = [], placeholder,
}: { nombre: string; inicial?: string[]; placeholder?: string }) {
  const [items, setItems] = useState<string[]>(inicial);
  const [texto, setTexto] = useState("");

  function agregar() {
    const nuevos = texto.split(",").map((s) => s.trim()).filter(Boolean);
    if (nuevos.length) setItems((prev) => [...prev, ...nuevos.filter((n) => !prev.includes(n))]);
    setTexto("");
  }

  return (
    <div>
      <input type="hidden" name={nombre} value={items.join(",")} />
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((it) => (
          <span key={it} className="chip bg-acento-suave text-acento-oscuro text-sm py-1.5 pl-3 pr-1.5">
            {it}
            <button type="button" onClick={() => setItems(items.filter((x) => x !== it))} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/70 cursor-pointer" aria-label={`Quitar ${it}`}>
              <X size={14} />
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-texto-2">Sin opciones cargadas</span>}
      </div>
      <div className="flex gap-2">
        <input
          className="campo"
          value={texto}
          placeholder={placeholder}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); agregar(); }
          }}
        />
        <button type="button" onClick={agregar} className="btn-suave">Agregar</button>
      </div>
    </div>
  );
}
