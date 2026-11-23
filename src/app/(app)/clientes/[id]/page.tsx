import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import Encabezado from "@/components/Encabezado";
import ClienteForm from "../ClienteForm";
import BotonBorrar from "@/components/BotonBorrar";
import { actualizarCliente, borrarCliente } from "../acciones";
import { db } from "@/lib/db";

import { fecha, linkWhatsApp, pesos, linkInstagram } from "@/lib/formato";
import IconoInstagram from "@/components/IconoInstagram";
import { saldo } from "@/lib/pedidos";
import EstadoChip from "@/components/EstadoChip";
import { requerirPermiso, permisosDe } from "@/lib/acceso";

export default async function FichaClientaPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ creada?: string }> }) {
  const { id } = await params;
  const { creada } = await searchParams;
  const c = await db.cliente.findUnique({ where: { id }, include: { creadoPor: true, pedidos: { orderBy: { fechaPedido: "desc" }, include: { pagos: { select: { monto: true } }, items: { select: { nombre: true } } } } } });
  if (!c) notFound();
  const u = await requerirPermiso("ver_clientes");
  const permisos = await permisosDe(u);
  const puedeBorrar = permisos.has("borrar_clientes");
  const wa = linkWhatsApp(c.telefono, `¡Hola ${c.nombre.split(" ")[0]}! Te escribimos de Micaela Diseño 🌸`);

  return (
    <>
      <Encabezado titulo={c.nombre} subtitulo={`Clienta N° ${c.numero} · alta el ${fecha(c.creadoEn)}${c.creadoPor ? ` por ${c.creadoPor.nombre}` : ""}`}>
        {wa && (
          <a href={wa} target="_blank" className="btn-secundario"><MessageCircle size={18} /> WhatsApp</a>
        )}
        {linkInstagram(c.instagram) && (
          <a href={linkInstagram(c.instagram)!} target="_blank" className="btn-secundario"><IconoInstagram /> Instagram</a>
        )}
        <Link href="/clientes" className="btn-suave">Volver</Link>
      </Encabezado>

      {creada && (
        <p className="mb-4 text-sm text-estado-listo-txt bg-estado-listo rounded-xl px-4 py-3 max-w-2xl">
          ¡Listo! La clienta quedó guardada con el número <strong>N° {c.numero}</strong>.
        </p>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <section className="tarjeta p-5 md:p-6">
          <h2 className="text-2xl mb-4">Datos</h2>
          {permisos.has("editar_clientes") ? <ClienteForm accion={actualizarCliente.bind(null, c.id)} cliente={c} textoBoton="Guardar cambios" /> : (
            <dl className="text-sm space-y-1">
              {([["Nombre", c.nombre], ["WhatsApp", c.telefono], ["Instagram", c.instagram], ["Email", c.email]] as const).filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="inline text-texto-2">{k}: </dt><dd className="inline">{v}</dd></div>)}
            </dl>
          )}
        </section>

        <div className="space-y-6">
          <section className="tarjeta p-5 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl">Historial de pedidos</h2>
              <Link href={`/pedidos/nuevo?cliente=${c.id}`} className="btn-primario min-h-10 px-4">+ Pedido</Link>
            </div>
            {c.pedidos.length === 0 ? (
              <p className="text-sm text-texto-2">Todavía no tiene pedidos.</p>
            ) : (
              <>
                <p className="text-sm text-texto-2 mb-2">{c.pedidos.length} pedido{c.pedidos.length === 1 ? "" : "s"} · total comprado {pesos(c.pedidos.filter((p) => p.estado !== "CANCELADO").reduce((s, p) => s + p.total, 0))}</p>
                <ul className="divide-y divide-borde">
                  {c.pedidos.map((p) => {
                    const s = saldo(p.total, p.pagos);
                    return (
                      <li key={p.id}>
                        <Link href={`/pedidos/${p.id}`} className="block py-3 hover:text-acento">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">N° {p.numero} <span className="text-texto-2 font-normal text-sm">· {fecha(p.fechaPedido)}</span></span>
                            <EstadoChip estado={p.estado} />
                          </div>
                          <p className="text-sm text-texto-2 truncate">{p.items.map((i) => i.nombre).join(", ")}</p>
                          <p className="text-sm">{pesos(p.total)}{s > 0 && <span className="text-estado-alerta-txt font-medium"> · debe {pesos(s)}</span>}</p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
          {puedeBorrar && (
            <section className="tarjeta p-5 md:p-6">
              <h2 className="text-xl mb-2">Zona peligrosa</h2>
              <BotonBorrar accion={borrarCliente.bind(null, c.id)} texto="Borrar clienta" confirmacion={`¿Seguro que querés borrar a ${c.nombre}? No se puede deshacer.`} />
            </section>
          )}
        </div>
      </div>
    </>
  );
}
