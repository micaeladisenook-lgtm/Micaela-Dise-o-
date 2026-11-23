"use client";
import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, Trash2, RefreshCw } from "lucide-react";
import { subirFotoColor, borrarFotoColor } from "./acciones";

async function achicar(archivo: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(archivo);
    const escala = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * escala);
    c.height = Math.round(bmp.height * escala);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], "color.jpg", { type: "image/jpeg" }) : archivo;
  } catch { return archivo; }
}

export default function CeldaColor({ color, tela, imagen, puedeEditar }: { color: string; tela: string; imagen: string | null; puedeEditar: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [, start] = useTransition();

  async function elegir(f: File | undefined) {
    if (!f) return;
    setError(""); setSubiendo(true);
    const fd = new FormData();
    fd.set("foto", await achicar(f));
    const r = await subirFotoColor(color, tela, fd).catch(() => ({ error: "No se pudo subir." }));
    if (r.error) setError(r.error);
    setSubiendo(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="relative">
      <button type="button" disabled={!puedeEditar || subiendo} onClick={() => input.current?.click()}
        aria-label={imagen ? `Cambiar foto de ${color} (${tela})` : `Subir foto de ${color} (${tela})`}
        className={`w-full aspect-square rounded-xl overflow-hidden border flex items-center justify-center ${imagen ? "border-borde" : "border-dashed border-borde bg-white text-texto-2"} ${puedeEditar ? "cursor-pointer hover:border-acento" : "cursor-default"}`}>
        {subiendo ? <Loader2 size={20} className="animate-spin" /> : imagen ? <img src={imagen} alt={`${color} ${tela}`} className="w-full h-full object-cover" /> : (
          <span className="flex flex-col items-center gap-1 text-[11px]"><Camera size={18} /> {puedeEditar ? "Subir" : "Sin foto"}</span>
        )}
      </button>
      {imagen && puedeEditar && !subiendo && (
        <div className="absolute top-1 right-1 flex gap-1">
          <span className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-texto-2 pointer-events-none"><RefreshCw size={12} /></span>
          <button type="button" aria-label={`Borrar foto de ${color} (${tela})`} onClick={() => { if (confirm(`¿Borrar la foto de ${color} (${tela})?`)) start(() => borrarFotoColor(color, tela)); }}
            className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-texto-2 hover:text-estado-alerta-txt cursor-pointer"><Trash2 size={13} /></button>
        </div>
      )}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => elegir(e.target.files?.[0])} />
      {error && <p className="text-[11px] text-estado-alerta-txt mt-1">{error}</p>}
    </div>
  );
}
