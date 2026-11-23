"use client";
import { useEffect, useRef, useState } from "react";
import { useFormulario } from "@/lib/useFormulario";
import { subirDiseno } from "./acciones";

// Achica la foto antes de subirla (así ocupa poco lugar y carga rápido en el celular)
async function achicar(archivo: File, max = 1400): Promise<File> {
  if (!archivo.type.startsWith("image/") || archivo.type === "image/svg+xml") return archivo;
  const bmp = await createImageBitmap(archivo);
  const escala = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * escala);
  canvas.height = Math.round(bmp.height * escala);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob: Blob = await new Promise((r) => canvas.toBlob((b) => r(b!), "image/jpeg", 0.85));
  return new File([blob], archivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

export default function SubirDiseno({ productos }: { productos: { id: string; nombre: string }[] }) {
  const [estado, onSubmit, enviando] = useFormulario(subirDiseno, null);
  const [vista, setVista] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (estado?.ok) { formRef.current?.reset(); setVista(null); }
  }, [estado]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <div>
        <span className="etiqueta">Foto *</span>
        <label htmlFor="imagen" className="btn-suave">{vista ? "Cambiar foto" : "Elegir foto"}</label>
        <input ref={inputRef} id="imagen" name="imagen" type="file" accept="image/*" required
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return setVista(null);
            const chico = await achicar(f);
            const dt = new DataTransfer();
            dt.items.add(chico);
            inputRef.current!.files = dt.files;
            setVista(URL.createObjectURL(chico));
          }} />
        {vista && <img src={vista} alt="Vista previa" className="mt-3 w-32 h-32 object-cover rounded-xl border border-borde" />}
      </div>
      <div>
        <label className="etiqueta" htmlFor="nombre-d">Nombre *</label>
        <input id="nombre-d" name="nombre" className="campo" placeholder="Ej: Nombre en cursiva con corona" required />
      </div>
      <div>
        <label className="etiqueta" htmlFor="categoria">Tipo de diseño</label>
        <select id="categoria" name="categoria" className="campo" defaultValue="BORDADO">
          <option value="BORDADO">Modelo de bordado</option>
          <option value="COLOR">Color</option>
          <option value="PRODUCTO">Producto / modelo</option>
        </select>
      </div>
      <div>
        <label className="etiqueta" htmlFor="productoId">Producto (opcional)</label>
        <select id="productoId" name="productoId" className="campo" defaultValue="">
          <option value="">Sirve para cualquier producto</option>
          {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>
      <div>
        <label className="etiqueta" htmlFor="descripcion-d">Descripción (opcional)</label>
        <input id="descripcion-d" name="descripcion" className="campo" placeholder="Ej: hilo dorado, letra cursiva" />
      </div>
      {estado?.error && <p className="text-sm text-estado-alerta-txt bg-estado-alerta rounded-xl px-3 py-2">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-estado-listo-txt bg-estado-listo rounded-xl px-3 py-2">{estado.ok}</p>}
      <button className="btn-primario w-full" disabled={enviando}>{enviando ? "Subiendo…" : "Agregar a la galería"}</button>
    </form>
  );
}
