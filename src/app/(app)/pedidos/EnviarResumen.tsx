"use client";
import { useState } from "react";
import { MessageCircle, Mail, Copy, FileText, ExternalLink } from "lucide-react";
import IconoInstagram from "@/components/IconoInstagram";
import { linkWhatsApp, linkInstagram } from "@/lib/formato";

export default function EnviarResumen({
  link, mensaje, asunto, telefono, email, instagram,
}: { link: string; mensaje: string; asunto: string; telefono: string | null; email: string | null; instagram: string | null }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const wa = linkWhatsApp(telefono, mensaje);
  const ig = linkInstagram(instagram);
  const mail = email ? `mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}` : null;

  const copiar = async (texto: string, msg: string) => {
    try { await navigator.clipboard.writeText(texto); setAviso(msg); } catch { setAviso("No se pudo copiar automáticamente."); }
    setTimeout(() => setAviso(null), 6000);
  };

  const Boton = ({ href, onClick, icono, texto, falta }: { href?: string | null; onClick?: () => void; icono: React.ReactNode; texto: string; falta: string }) =>
    href || onClick ? (
      <a href={href ?? undefined} onClick={onClick} target={href ? "_blank" : undefined} className="btn-secundario w-full cursor-pointer">{icono} {texto}</a>
    ) : (
      <span className="btn bg-fondo text-texto-2 w-full cursor-not-allowed text-xs" title={falta}>{icono} {texto} <span className="font-normal">({falta})</span></span>
    );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <a href={link} target="_blank" className="btn-suave px-3"><ExternalLink size={15} /> Ver</a>
        <a href={`${link}/pdf`} target="_blank" className="btn-suave px-3"><FileText size={15} /> PDF</a>
      </div>
      <Boton href={wa} icono={<MessageCircle size={16} />} texto="Enviar por WhatsApp" falta="sin WhatsApp" />
      <Boton href={mail} icono={<Mail size={16} />} texto="Enviar por mail" falta="sin email" />
      <Boton
        onClick={ig ? () => { copiar(mensaje, "Mensaje copiado: pegalo en el chat de Instagram que se abrió."); window.open(ig, "_blank"); } : undefined}
        icono={<IconoInstagram size={16} />} texto="Enviar por Instagram" falta="sin Instagram"
      />
      <button type="button" onClick={() => copiar(link, "Link copiado.")} className="btn-suave w-full"><Copy size={15} /> Copiar link</button>
      {aviso && <p className="text-xs text-estado-listo-txt">{aviso}</p>}
      <p className="text-[11px] text-texto-2">Instagram no deja escribir el mensaje automáticamente: lo copiamos y solo tenés que pegarlo.</p>
    </div>
  );
}
