"use client";
import { useEffect, useState } from "react";
import { Copy, Check, Pencil, Plus, Trash2, X, Search } from "lucide-react";
import { useFormulario } from "@/lib/useFormulario";
import { guardarRespuesta, borrarRespuesta, type EstadoRespuesta } from "./acciones";

type R = { clave: string; titulo: string; texto: string };

const AYUDA_VARIABLES = [
  ["{precios}", "la lista de precios actual del catálogo"],
  ["{formulario}", "el link al formulario para hacer el pedido"],
];

function reemplazar(texto: string, variables: Record<string, string>) {
  return Object.entries(variables).reduce((t, [k, v]) => t.split(k).join(v), texto);
}

function Editor({ r, onCerrar }: { r: R | null; onCerrar: () => void }) {
  const [e, onSubmit, p] = useFormulario(
    guardarRespuesta.bind(null, r?.clave ?? null) as (prev: EstadoRespuesta, f: FormData) => Promise<EstadoRespuesta>, null,
  );
  useEffect(() => { if (e?.ok) onCerrar(); }, [e, onCerrar]);
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input name="titulo" className="campo" placeholder="Título (ej: Precios)" defaultValue={r?.titulo} autoFocus />
      <textarea name="texto" className="campo min-h-48 py-2.5" defaultValue={r?.texto} placeholder="Escribí la respuesta…" />
      <p className="text-[11px] text-texto-2">Se reemplazan solas: {AYUDA_VARIABLES.map(([k, t]) => <span key={k} className="mr-2"><code className="bg-menu rounded px-1 text-acento-oscuro">{k}</code> {t}</span>)}</p>
      {e?.error && <p className="text-sm text-estado-alerta-txt">{e.error}</p>}
      <div className="flex gap-2">
        <button className="btn-primario min-h-10 px-4" disabled={p}>{p ? "Guardando…" : "Guardar"}</button>
        <button type="button" onClick={onCerrar} className="btn-suave min-h-10 px-4"><X size={15} /> Cancelar</button>
      </div>
    </form>
  );
}

function Tarjeta({ r, variables, puedeEditar }: { r: R; variables: Record<string, string>; puedeEditar: boolean }) {
  const [copiado, setCopiado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [verTodo, setVerTodo] = useState(false);
  const final = reemplazar(r.texto, variables);
  const largo = final.length > 280;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(final);
    } catch {
      // navegadores viejos: copiar con un campo oculto
      const ta = document.createElement("textarea");
      ta.value = final;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <article className="tarjeta p-4 flex flex-col">
      {editando ? <Editor r={r} onCerrar={() => setEditando(false)} /> : (
        <>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h2 className="text-xl leading-tight">{r.titulo}</h2>
            {puedeEditar && (
              <div className="flex shrink-0">
                <button type="button" onClick={() => setEditando(true)} aria-label={`Editar ${r.titulo}`} className="w-9 h-9 rounded-full flex items-center justify-center text-texto-2 hover:bg-menu hover:text-acento cursor-pointer"><Pencil size={15} /></button>
                <button type="button" aria-label={`Borrar ${r.titulo}`} onClick={() => { if (confirm(`¿Borrar la respuesta "${r.titulo}"?`)) borrarRespuesta(r.clave); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-texto-2 hover:bg-estado-alerta hover:text-estado-alerta-txt cursor-pointer"><Trash2 size={15} /></button>
              </div>
            )}
          </div>
          <p className={`text-sm whitespace-pre-line text-texto flex-1 ${largo && !verTodo ? "line-clamp-6" : ""}`}>{final}</p>
          {largo && <button type="button" onClick={() => setVerTodo(!verTodo)} className="text-xs text-acento self-start mt-1 cursor-pointer hover:underline">{verTodo ? "Ver menos" : "Ver todo"}</button>}
          <button type="button" onClick={copiar} className={`mt-3 min-h-11 ${copiado ? "btn-suave text-estado-listo-txt" : "btn-primario"}`}>
            {copiado ? <><Check size={16} /> ¡Copiado! Pegalo en el chat</> : <><Copy size={16} /> Copiar</>}
          </button>
        </>
      )}
    </article>
  );
}

export default function Respuestas({ respuestas, variables, puedeEditar }: { respuestas: R[]; variables: Record<string, string>; puedeEditar: boolean }) {
  const [nueva, setNueva] = useState(false);
  const [q, setQ] = useState("");
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const lista = respuestas.filter((r) => !q || norm(`${r.titulo} ${r.texto}`).includes(norm(q)));
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="campo pl-9" placeholder="Buscar (ej: talles, envío, seña)" />
        </div>
        {puedeEditar && !nueva && <button type="button" onClick={() => setNueva(true)} className="btn-secundario"><Plus size={16} /> Nueva respuesta</button>}
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
        {nueva && <div className="tarjeta p-4"><Editor r={null} onCerrar={() => setNueva(false)} /></div>}
        {lista.map((r) => <Tarjeta key={r.clave} r={r} variables={variables} puedeEditar={puedeEditar} />)}
      </div>
      {lista.length === 0 && <p className="text-sm text-texto-2 text-center py-8">No hay respuestas que coincidan.</p>}
    </div>
  );
}
