import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Pencil, Printer, AlertTriangle } from "lucide-react";
import Encabezado from "@/components/Encabezado";
import EstadoChip from "@/components/EstadoChip";
import BotonBorrar from "@/components/BotonBorrar";
import BotonImprimir from "@/components/BotonImprimir";
import BotonesEstado from "../BotonesEstado";
import FormPago from "../FormPago";
import BorrarPago from "../BorrarPago";
import BotonRevisado from "../BotonRevisado";
import { borrarPedido } from "../acciones";
import { db } from "@/lib/db";
import { includePedidoCompleto } from "@/lib/datosPedido";
import { usuarioActual } from "@/lib/auth";
import { fecha, fechaHora, pesos, linkWhatsApp } from "@/lib/formato";
import { armarMensaje, atrasado, pagado, saldo, textoEntrega, NOMBRE_MEDIO, NOMBRE_TIPO_PEDIDO, fechaInput } from "@/lib/pedidos";

export default async function PedidoPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ guardado?: string; aviso?: string; sinTelefono?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const p = await db.pedido.findUnique({ where: { id }, include: includePedidoCompleto });
  if (!p) notFound();
  const u = await usuarioActual();
  const [plantillas, historial] = await Promise.all([
    db.plantilla.findMany(),
    db.registro.findMany({ where: { entidad: "Pedido", entidadId: id }, include: { usuario: true }, orderBy: { fecha: "desc" }, take: 30 }),
  ]);
  const tpl = (k: string) => plantillas.find((x) => x.clave === k)?.texto ?? "";
  const sal = saldo(p.total, p.pagos);
  const wa = (k: string) => linkWhatsApp(p.cliente.telefono, armarMensaje(tpl(k), p));
  const tarde = atrasado(p);

  return (
    <>
      <Encabezado titulo={`Pedido N° ${p.numero}`} subtitulo={`${NOMBRE_TIPO_PEDIDO[p.tipo]} · cargado el ${fecha(p.fechaPedido)}${p.vendedor ? ` · vendió ${p.vendedor.nombre}` : ""}`}>
        <Link href={`/pedidos/${p.id}/editar`} className="btn-secundario"><Pencil size={16} /> Editar</Link>
        <BotonImprimir texto="Imprimir orden" icono={<Printer size={16} />} />
      </Encabezado>

      {sp.guardado && <p className="mb-3 text-sm text-estado-listo-txt bg-estado-listo rounded-xl px-4 py-3">¡Pedido guardado!</p>}
      {sp.aviso && <p className="mb-3 text-sm text-estado-produccion-txt bg-estado-produccion rounded-xl px-4 py-3">{sp.aviso}</p>}
      {sp.sinTelefono && <p className="mb-3 text-sm text-estado-alerta-txt bg-estado-alerta rounded-xl px-4 py-3">La clienta no tiene WhatsApp cargado, por eso no se abrió el mensaje. Agregalo en su ficha.</p>}
      {p.revisar && (
        <div className="mb-3 text-sm text-estado-produccion-txt bg-estado-produccion rounded-xl px-4 py-3 flex flex-wrap items-center gap-2 justify-between">
          <span className="flex gap-2"><AlertTriangle size={18} className="shrink-0" /> <span><strong>Revisar (importado):</strong> {p.revisar}. Si hace falta, corregilo con &quot;Editar&quot; o registrá el pago.</span></span>
          <BotonRevisado id={p.id} />
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <div className="space-y-5 min-w-0">
          <section className="tarjeta p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <EstadoChip estado={p.estado} atrasado={tarde} />
                {tarde && <EstadoChip estado={p.estado} />}
                {p.prioridad && <span className="chip bg-acento text-white">Prioridad</span>}
              </div>
            </div>
            <div className="no-imprimir"><BotonesEstado pedidoId={p.id} estado={p.estado} /></div>
          </section>

          <section className="tarjeta p-5">
            <h2 className="text-2xl mb-1">Clienta</h2>
            <Link href={`/clientes/${p.cliente.id}`} className="font-medium hover:text-acento">{p.cliente.nombre}</Link>
            <span className="text-sm text-texto-2"> · N° {p.cliente.numero}</span>
            <p className="text-sm text-texto-2">{[p.cliente.telefono ?? "sin teléfono", p.cliente.instagram].filter(Boolean).join(" · ")}</p>
          </section>

          <section className="tarjeta p-5">
            <h2 className="text-2xl mb-3">Productos</h2>
            <div className="divide-y divide-borde">
              {p.items.map((i) => (
                <div key={i.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex justify-between gap-3">
                    <p className="font-medium">{i.cantidad > 1 ? `${i.cantidad} × ` : ""}{i.nombre}{i.persona && <span className="text-texto-2 font-normal"> · para {i.persona}</span>}</p>
                    <p className="whitespace-nowrap">{pesos(i.precioUnitario * i.cantidad)}</p>
                  </div>
                  {i.prendas.length > 0 && (
                    <ul className="text-sm mt-1 space-y-0.5">
                      {i.prendas.map((pr) => (
                        <li key={pr.id}>– {pr.nombre}: <strong>{pr.color || "color s/d"}</strong>{pr.talle ? <> · talle <strong>{pr.talle}</strong></> : null}</li>
                      ))}
                    </ul>
                  )}
                  {i.bordadoTexto && (
                    <p className="text-sm mt-1">– Bordado: <strong>&quot;{i.bordadoTexto}&quot;</strong>{i.bordadoUbicacion ? ` · ${i.bordadoUbicacion}` : ""}{i.hilo ? ` · hilo ${i.hilo.toLowerCase()}` : ""}</p>
                  )}
                  {i.notas && <p className="text-sm text-texto-2 mt-1 whitespace-pre-line">Nota: {i.notas}</p>}
                </div>
              ))}
            </div>
            {p.disenos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Diseños elegidos</p>
                <div className="flex flex-wrap gap-2">
                  {p.disenos.map(({ diseno: d }) => (
                    <figure key={d.id} className="w-28">
                      <img src={d.imagen} alt={d.nombre} className="w-28 h-28 object-cover rounded-xl border border-borde" />
                      <figcaption className="text-xs mt-1">{d.nombre}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="tarjeta p-5 grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-texto-2">Evento</p>
              <p className="font-medium">{[p.evento, p.eventoDetalle].filter(Boolean).join(" · ") || "—"}</p>
              <p>{p.fechaEvento ? fecha(p.fechaEvento) : "Sin fecha"}</p>
            </div>
            <div>
              <p className="text-texto-2">Entrega</p>
              <p className="font-medium">{p.fechaEntrega ? fecha(p.fechaEntrega) : "Sin fecha"}</p>
              <p>{textoEntrega({ ...p, fechaEntrega: null })}</p>
            </div>
            {p.notas && (
              <div className="sm:col-span-2">
                <p className="text-texto-2">Notas</p>
                <p className="whitespace-pre-line">{p.notas}</p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="tarjeta p-5">
            <h2 className="text-2xl mb-3">Pagos</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-base"><span>Total</span><strong>{pesos(p.total)}</strong></div>
              <div className="flex justify-between"><span>Pagado</span><span>{pesos(pagado(p.pagos))}</span></div>
              <div className={`flex justify-between font-medium ${sal > 0 ? "text-estado-alerta-txt" : "text-estado-listo-txt"}`}><span>Saldo</span><span>{sal > 0 ? pesos(sal) : "Pagado ✓"}</span></div>
            </div>
            {p.pagos.length > 0 && (
              <ul className="mt-3 border-t border-borde pt-3 space-y-1 text-sm">
                {p.pagos.map((pg) => (
                  <li key={pg.id} className="flex items-center justify-between gap-2">
                    <span>{fecha(pg.fecha)} · {NOMBRE_MEDIO[pg.medio]}{pg.esSena ? " · seña" : ""}{pg.nota ? <span className="text-texto-2"> · {pg.nota}</span> : null}</span>
                    <span className="flex items-center gap-1 whitespace-nowrap">{pesos(pg.monto)}{u?.rol === "ADMIN" && <BorrarPago id={pg.id} />}</span>
                  </li>
                ))}
              </ul>
            )}
            {sal > 0 && <div className="mt-4 no-imprimir"><FormPago pedidoId={p.id} saldo={sal} hoy={fechaInput(new Date())} /></div>}
          </section>

          <section className="tarjeta p-5 no-imprimir">
            <h2 className="text-2xl mb-3">WhatsApp</h2>
            {p.cliente.telefono ? (
              <div className="space-y-2">
                <a href={wa("confirmacion")!} target="_blank" className="btn-secundario w-full"><MessageCircle size={16} /> Confirmación del pedido</a>
                {sal > 0 && <a href={wa("saldo")!} target="_blank" className="btn-secundario w-full"><MessageCircle size={16} /> Recordar saldo</a>}
                <a href={wa("listo")!} target="_blank" className="btn-secundario w-full"><MessageCircle size={16} /> Avisar que está listo</a>
              </div>
            ) : (
              <p className="text-sm text-texto-2">La clienta no tiene WhatsApp cargado. <Link href={`/clientes/${p.cliente.id}`} className="text-acento underline">Agregalo en su ficha</Link>.</p>
            )}
          </section>

          <section className="tarjeta p-5 no-imprimir">
            <h2 className="text-2xl mb-3">Historial</h2>
            <ul className="text-sm space-y-2">
              {historial.map((r) => (
                <li key={r.id}>
                  <p><strong>{r.usuario?.nombre ?? "Sistema"}</strong> · {r.accion.toLowerCase()}</p>
                  {r.detalle && <p className="text-texto-2 text-xs">{r.detalle}</p>}
                  <p className="text-texto-2 text-xs">{fechaHora(r.fecha)}</p>
                </li>
              ))}
              {historial.length === 0 && <li className="text-texto-2">{p.origen === "IMPORTADO" ? "Importado desde las planillas." : p.origen === "FORMULARIO" ? "Llegó desde el formulario público." : "Sin cambios registrados."}</li>}
            </ul>
          </section>

          {u?.rol === "ADMIN" && (
            <div className="no-imprimir">
              <BotonBorrar accion={borrarPedido.bind(null, p.id)} texto="Borrar pedido" confirmacion={`¿Borrar el pedido N° ${p.numero}? Se borran también sus pagos. Si solo no va, mejor marcalo como Cancelado.`} />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
