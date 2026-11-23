"use client";
import { useState, useTransition } from "react";
import { Copy, CreditCard, MessageCircle } from "lucide-react";
import { generarLinkPago } from "./acciones";
import { pesos, linkWhatsApp } from "@/lib/formato";

export default function LinkPago({
  pedidoId, total, saldo, linkActual, montoActual, telefono, mensajeSaldo, configurado,
}: {
  pedidoId: string; total: number; saldo: number; linkActual: string | null; montoActual: number | null;
  telefono: string | null; mensajeSaldo: string; configurado: boolean;
}) {
  const [p, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState(linkActual);
  const [monto, setMonto] = useState(montoActual);
  const [copiado, setCopiado] = useState(false);

  if (!configurado) {
    return <p className="text-sm text-texto-2">Para generar links de pago hay que conectar tu cuenta de Mercado Pago (lo hacemos al publicar).</p>;
  }
  const generar = (m: number) => {
    setError(null);
    start(async () => {
      const r = await generarLinkPago(pedidoId, m);
      if (r.ok) { setLink(r.link); setMonto(m); } else setError(r.error);
    });
  };
  const wa = link ? linkWhatsApp(telefono, mensajeSaldo.replace("__LINK__", `💳 Podés pagar ${pesos(monto ?? 0)} con Mercado Pago acá: ${link}`)) : null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {saldo > 0 && <button className="btn-secundario px-3" disabled={p} onClick={() => generar(saldo)}><CreditCard size={15} /> Saldo {pesos(saldo)}</button>}
        {saldo !== total && <button className="btn-secundario px-3" disabled={p} onClick={() => generar(total)}><CreditCard size={15} /> Total {pesos(total)}</button>}
      </div>
      {p && <p className="text-sm text-texto-2">Generando link…</p>}
      {error && <p className="text-sm text-estado-alerta-txt">{error}</p>}
      {link && (
        <div className="rounded-xl bg-fondo border border-borde p-3 text-sm space-y-2">
          <p>Link por <strong>{pesos(monto ?? 0)}</strong>:</p>
          <p className="break-all text-xs text-texto-2">{link}</p>
          <div className="flex gap-2">
            <button className="btn-suave min-h-10 px-3 flex-1" onClick={() => { navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}>
              <Copy size={14} /> {copiado ? "¡Copiado!" : "Copiar"}
            </button>
            {wa && <a href={wa} target="_blank" className="btn-primario min-h-10 px-3 flex-1"><MessageCircle size={14} /> Enviar</a>}
          </div>
        </div>
      )}
    </div>
  );
}
