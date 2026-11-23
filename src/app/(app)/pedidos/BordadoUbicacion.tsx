"use client";
import { useRef, useState } from "react";
import { Camera, X, Loader2, MapPin } from "lucide-react";
import { subirFotoBordado } from "./acciones";

const MAX_FOTOS = 6;

// Achica la foto del celular (suelen pesar varios MB) antes de subirla
async function achicar(archivo: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type) && !/heic|heif/i.test(archivo.type)) return archivo;
  try {
    const bmp = await createImageBitmap(archivo);
    const escala = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * escala);
    c.height = Math.round(bmp.height * escala);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], "bordado.jpg", { type: "image/jpeg" }) : archivo;
  } catch {
    return archivo;
  }
}

export default function BordadoUbicacion({ detalle, fotos, onChange, puedeSubir = true }: {
  detalle: string;
  fotos: string[];
  puedeSubir?: boolean;
  onChange: (v: { bordadoDetalle?: string; bordadoFotos?: string[] }) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(0);
  const [error, setError] = useState("");

  async function elegir(lista: FileList | null) {
    if (!lista?.length) return;
    setError("");
    const archivos = [...lista].slice(0, MAX_FOTOS - fotos.length);
    setSubiendo(archivos.length);
    const nuevas: string[] = [];
    for (const a of archivos) {
      const fd = new FormData();
      fd.set("foto", await achicar(a));
      const r = await subirFotoBordado(fd).catch(() => ({ error: "No se pudo subir la foto." }));
      if ("url" in r) nuevas.push(r.url);
      else setError(r.error);
      setSubiendo((n) => n - 1);
    }
    if (nuevas.length) onChange({ bordadoFotos: [...fotos, ...nuevas] });
    if (input.current) input.current.value = "";
  }

  return (
    <div className="rounded-xl border border-dashed border-borde bg-acento-suave/40 p-3 space-y-2">
      <p className="text-sm font-medium flex items-center gap-1.5"><MapPin size={15} className="text-acento" /> ¿Dónde va exactamente el bordado?</p>
      <textarea
        className="campo min-h-16"
        rows={2}
        placeholder="Ej: centrado en la espalda, 5 cm debajo del cuello · en la pantufla derecha, sobre el empeine · bolsillo del pijama"
        value={detalle}
        onChange={(e) => onChange({ bordadoDetalle: e.target.value })}
      />
      <div className="flex flex-wrap items-center gap-2">
        {fotos.map((u) => (
          <div key={u} className="relative">
            <a href={u} target="_blank"><img src={u} alt="Referencia del bordado" className="w-16 h-16 rounded-lg object-cover border border-borde bg-white" /></a>
            {puedeSubir && <button type="button" aria-label="Quitar foto" onClick={() => onChange({ bordadoFotos: fotos.filter((x) => x !== u) })}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-borde flex items-center justify-center text-texto-2 hover:text-estado-alerta-txt cursor-pointer shadow-sm">
              <X size={13} />
            </button>}
          </div>
        ))}
        {Array.from({ length: subiendo }, (_, i) => (
          <div key={`s${i}`} className="w-16 h-16 rounded-lg border border-borde bg-white flex items-center justify-center text-texto-2"><Loader2 size={18} className="animate-spin" /></div>
        ))}
        {puedeSubir && fotos.length + subiendo < MAX_FOTOS && (
          <button type="button" onClick={() => input.current?.click()} disabled={subiendo > 0} className="btn-suave min-h-10 px-3 text-sm">
            <Camera size={16} /> {fotos.length ? "Agregar otra foto" : "Agregar foto de referencia"}
          </button>
        )}
        <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => elegir(e.target.files)} />
      </div>
      {error && <p className="text-xs text-estado-alerta-txt">{error}</p>}
      <p className="text-[11px] text-texto-2">Sacá una foto o elegila de la galería (ej: la prenda con una marca o un dibujo de dónde va). Hasta 6 fotos. La ve el taller de bordado.</p>
    </div>
  );
}
