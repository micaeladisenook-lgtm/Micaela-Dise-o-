"use client";
import { useState, useTransition } from "react";
import { MessageCircle, Copy, ExternalLink, CheckCircle2, RotateCcw, Clock } from "lucide-react";
import IconoInstagram from "@/components/IconoInstagram";
import { linkWhatsApp, linkInstagram } from "@/lib/formato";
import { reabrirLinkCompletar } from "./acciones";

export default function LinkCompletar({ pedidoId, link, mensaje, telefono, instagram, completadoEl, puedeReabrir }: {
  pedidoId: string; link: string; mensaje: string; telefono: string | null; instagram: string | null; completadoEl: string | null; puedeReabrir: boolean;
}) {
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendiente, start] = useTransition();
  const wa = linkWhatsApp(telefono, mensaje);
  const ig = linkInstagram(instagram);
  const copiar = async (texto: string, msg: string) => {
    try { await navigator.clipboard.writeText(texto); setAviso(msg); } catch { setAviso("No se pudo copiar automáticamente."); }
    setTimeout(() => setAviso(null), 6000);
  };

  if (completadoEl) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-estado-listo-txt bg-estado-listo rounded-xl px-3 py-2 flex items-center gap-2"><CheckCircle2 size={16} /> La clienta completó sus datos el {completadoEl}. El link quedó cerrado.</p>
        {puedeReabrir && (
          <button type="button" disabled={pendiente} onClick={() => start(() => reabrirLinkCompletar(pedidoId))} className="btn-suave w-full">
            <RotateCcw size={15} /> {pendiente ? "Habilitando…" : "Volver a habilitar el link (para que corrija algo)"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-texto-2 flex items-center gap-1.5"><Clock size={13} /> Todavía no completó sus datos.</p>
      {wa ? <a href={wa} target="_blank" className="btn-primario w-full"><MessageCircle size={16} /> Enviar link por WhatsApp</a>
        : <span className="btn bg-fondo text-texto-2 w-full text-xs cursor-not-allowed"><MessageCircle size={16} /> Enviar por WhatsApp (sin WhatsApp cargado)</span>}
      {ig && (
        <button type="button" onClick={() => { copiar(mensaje, "Mensaje copiado: pegalo en el chat de Instagram que se abrió."); window.open(ig, "_blank"); }} className="btn-secundario w-full">
          <IconoInstagram size={16} /> Enviar por Instagram
        </button>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => copiar(link, "Link copiado.")} className="btn-suave px-3"><Copy size={15} /> Copiar link</button>
        <a href={link} target="_blank" className="btn-suave px-3"><ExternalLink size={15} /> Ver cómo lo ve</a>
      </div>
      {aviso && <p className="text-xs text-estado-listo-txt">{aviso}</p>}
    </div>
  );
}
