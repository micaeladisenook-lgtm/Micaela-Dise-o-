import { Info } from "lucide-react";

// Muestra un aviso escrito como en WhatsApp: *texto* va en negrita
export default function AvisoTexto({ texto, className = "" }: { texto: string; className?: string }) {
  if (!texto.trim()) return null;
  const partes = texto.split(/(\*[^*\n]+\*)/g);
  return (
    <div className={`text-sm bg-acento-suave/60 border border-acento/20 rounded-xl px-3 py-2.5 flex gap-2 ${className}`}>
      <Info size={16} className="text-acento shrink-0 mt-0.5" />
      <p className="whitespace-pre-line min-w-0">
        {partes.map((p, i) => (/^\*[^*\n]+\*$/.test(p) ? <strong key={i}>{p.slice(1, -1)}</strong> : p))}
      </p>
    </div>
  );
}
