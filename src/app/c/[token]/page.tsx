import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BotonImprimir from "@/components/BotonImprimir";
import { pedidoPorToken } from "@/lib/resumen";
import { fecha, pesos } from "@/lib/formato";
import { pagado, saldo, textoEntrega, NOMBRE_ESTADO } from "@/lib/pedidos";

export const metadata: Metadata = { title: "Resumen de tu compra · Micaela Diseño", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ResumenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await pedidoPorToken(token);
  if (!p) notFound();
  const sal = saldo(p.total, p.pagos);
  return (
    <main className="min-h-screen py-8 px-4 print:p-0 print:bg-white">
      <div className="max-w-xl mx-auto">
        <div className="no-imprimir flex flex-wrap gap-2 justify-center mb-4">
          <a href={`/c/${token}/pdf`} className="btn-primario">Descargar PDF</a>
          <BotonImprimir texto="Imprimir" />
        </div>
        <article className="tarjeta p-6 md:p-8 print:border-0">
          <header className="text-center border-b border-borde pb-5 mb-5">
            <p className="titulo text-4xl italic text-acento">Micaela Diseño</p>
            <p className="text-xs uppercase tracking-[0.25em] text-texto-2 mt-2">Resumen de tu compra</p>
          </header>
          <div className="flex justify-between text-sm mb-5">
            <div>
              <p className="text-texto-2">Clienta</p>
              <p className="font-medium">{p.cliente.nombre}</p>
            </div>
            <div className="text-right">
              <p className="text-texto-2">Pedido N° {p.numero}</p>
              <p>{fecha(p.fechaPedido)}</p>
              <p className="text-xs text-texto-2">Estado: {NOMBRE_ESTADO[p.estado]}</p>
            </div>
          </div>
          <div className="divide-y divide-borde">
            {p.items.map((i) => (
              <div key={i.id} className="py-3">
                <div className="flex justify-between gap-3">
                  <p className="font-medium">{i.cantidad > 1 ? `${i.cantidad} × ` : ""}{i.nombre}{i.persona && <span className="text-texto-2 font-normal"> · {i.persona}</span>}</p>
                  <p className="whitespace-nowrap">{i.precioUnitario ? pesos(i.precioUnitario * i.cantidad) : ""}</p>
                </div>
                {i.prendas.map((pr) => (
                  <p key={pr.id} className="text-sm text-texto-2">– {pr.nombre}{pr.color ? `: ${pr.color}` : ""}{pr.talle ? ` · talle ${pr.talle}` : ""}</p>
                ))}
                {i.bordadoTexto && <p className="text-sm text-texto-2">– Bordado: “{i.bordadoTexto}”{i.bordadoUbicacion ? ` · ${i.bordadoUbicacion}` : ""}{i.hilo ? ` · hilo ${i.hilo.toLowerCase()}` : ""}</p>}
              </div>
            ))}
          </div>
          <div className="border-t-2 border-texto mt-2 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-base"><span>Total</span><strong>{pesos(p.total)}</strong></div>
            <div className="flex justify-between"><span>Abonado</span><span>{pesos(pagado(p.pagos))}</span></div>
            <div className="flex justify-between font-medium text-acento"><span>Saldo</span><span>{sal > 0 ? pesos(sal) : "Pagado ✓"}</span></div>
          </div>
          <div className="mt-5 rounded-xl bg-fondo p-4 text-sm space-y-1">
            {p.fechaEvento && <p><span className="text-texto-2">Evento:</span> {fecha(p.fechaEvento)}</p>}
            <p><span className="text-texto-2">Entrega:</span> {textoEntrega(p)}</p>
          </div>
          <p className="text-center text-xs text-texto-2 mt-6">¡Gracias por elegirnos! 💕 Ante cualquier duda escribinos por WhatsApp o Instagram.</p>
        </article>
      </div>
    </main>
  );
}
