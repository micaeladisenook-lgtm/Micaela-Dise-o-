import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FormCompletar from "../FormCompletar";
import { pedidoParaCompletar } from "../datos";
import { db } from "@/lib/db";
import { fecha, pesos } from "@/lib/formato";
import { pagado, saldo } from "@/lib/pedidos";

export const metadata: Metadata = { title: "Completá tu pedido · Micaela Diseño", robots: { index: false } };
export const dynamic = "force-dynamic";

const fechaInput = (d: Date | null) => (d ? d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }) : "");

export default async function CompletarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const datos = await pedidoParaCompletar(token);
  if (!datos) notFound();
  const avisos = await db.plantilla.findMany({ where: { clave: { in: ["aviso_envio", "aviso_pedido"] } } });
  const aviso = (k: string) => avisos.find((a) => a.clave === k)?.texto ?? "";
  const { p, items } = datos;
  const nombre = p.cliente.nombre.split(" ")[0];
  const cerrado = p.estado === "CANCELADO" || p.estado === "ENTREGADO";

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-xl mx-auto">
        <header className="text-center mb-6">
          <p className="titulo text-5xl italic text-acento leading-none">Micaela Diseño</p>
          <p className="text-xs uppercase tracking-[0.25em] text-texto-2 mt-3">Pedido N° {p.numero}</p>
        </header>

        {p.datosCompletadosEn || cerrado ? (
          <div className="tarjeta p-8 text-center">
            <p className="titulo text-4xl italic text-acento">{cerrado ? "Link cerrado" : `¡Gracias, ${nombre}!`}</p>
            <p className="mt-3">{cerrado ? "Este pedido ya no se puede modificar desde acá." : `Ya recibimos los datos de tu pedido (el ${fecha(p.datosCompletadosEn!)}).`}</p>
            <p className="text-sm text-texto-2 mt-2">Si necesitás cambiar algo, escribinos por WhatsApp 💕</p>
          </div>
        ) : (
          <>
            <section className="tarjeta p-5 mb-5">
              <p className="text-lg">¡Hola {nombre}! 💕</p>
              <p className="text-sm text-texto-2 mt-1">Completá los colores, talles, el bordado y los datos de envío para que empecemos a preparar tu pedido.</p>
              <div className="mt-3 pt-3 border-t border-borde text-sm space-y-0.5">
                {p.items.map((i) => <p key={i.id} className="flex justify-between gap-2"><span>{i.cantidad > 1 ? `${i.cantidad}× ` : ""}{i.nombre}</span><span>{pesos(i.precioUnitario * Math.max(1, i.cantidad))}</span></p>)}
                {p.costoEnvio ? <p className="flex justify-between gap-2"><span>Envío</span><span>{pesos(p.costoEnvio)}</span></p> : null}
                <p className="flex justify-between gap-2 font-semibold pt-1"><span>Total</span><span>{pesos(p.total)}</span></p>
                <p className="flex justify-between gap-2 text-estado-listo-txt"><span>Abonado</span><span>{pesos(pagado(p.pagos))}</span></p>
                {saldo(p.total, p.pagos) > 0 && <p className="flex justify-between gap-2 text-texto-2"><span>Saldo</span><span>{pesos(saldo(p.total, p.pagos))}</span></p>}
              </div>
            </section>
            <FormCompletar
              token={token}
              items={items}
              envioInicial={{
                envio: p.envio,
                direccion: p.direccionEnvio ?? p.cliente.direccion ?? "",
                entreCalles: p.entreCalles ?? p.cliente.entreCalles ?? "",
                localidad: p.localidad ?? p.cliente.localidad ?? "",
                provincia: p.provincia ?? p.cliente.provincia ?? "",
                codigoPostal: p.codigoPostal ?? p.cliente.codigoPostal ?? "",
                dni: p.cliente.dni ?? "",
                recibe: p.cliente.nombre,
              }}
              fechaEvento={fechaInput(p.fechaEvento)}
              conEvento={!!p.evento || !!p.fechaEvento}
              avisoEnvio={aviso("aviso_envio")}
              avisoPedido={aviso("aviso_pedido")}
            />
          </>
        )}
      </div>
    </main>
  );
}
