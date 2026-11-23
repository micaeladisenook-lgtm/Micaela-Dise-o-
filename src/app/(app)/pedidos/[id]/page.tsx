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
import LinkPago from "../LinkPago";
import EnviarResumen from "../EnviarResumen";
import LinkCompletar from "../LinkCompletar";
import { tipografia } from "@/lib/tipografias";
import Cotizador from "../../envios/Cotizador";
import { linkResumen, linkCompletar } from "@/lib/resumen";
import CasillaTarea from "../../talleres/CasillaTarea";
import { bloqueadaPor, NOMBRE_FUNCION } from "@/lib/produccion";
import { mercadoPagoConfigurado } from "@/lib/mercadopago";
import { borrarPedido } from "../acciones";
import { db } from "@/lib/db";
import { includePedidoCompleto } from "@/lib/datosPedido";

import { fecha, fechaHora, pesos, linkWhatsApp } from "@/lib/formato";
import { armarMensaje, conLinkResumen, atrasado, pagado, saldo, textoEntrega, NOMBRE_MEDIO, NOMBRE_TIPO_PEDIDO, fechaInput } from "@/lib/pedidos";
import { requerirPermiso, permisosDe } from "@/lib/acceso";

export default async function PedidoPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ guardado?: string; aviso?: string; sinTelefono?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const p = await db.pedido.findUnique({ where: { id }, include: includePedidoCompleto });
  if (!p) notFound();
  const u = await requerirPermiso("ver_pedidos");
  const permisos = await permisosDe(u);
  const [plantillas, historial] = await Promise.all([
    db.plantilla.findMany(),
    db.registro.findMany({ where: { entidad: "Pedido", entidadId: id }, include: { usuario: true }, orderBy: { fecha: "desc" }, take: 30 }),
  ]);
  const tpl = (k: string) => plantillas.find((x) => x.clave === k)?.texto ?? "";
  const sal = saldo(p.total, p.pagos);
  const resumen = await linkResumen(p.id);
  const completar = await linkCompletar(p.id);
  const wa = (k: string) => linkWhatsApp(p.cliente.telefono, armarMensaje(k === "confirmacion" ? conLinkResumen(tpl(k)) : tpl(k), p, { link_resumen: resumen }));
  const tarde = atrasado(p);

  return (
    <>
      <Encabezado titulo={`Pedido N° ${p.numero}`} subtitulo={`${NOMBRE_TIPO_PEDIDO[p.tipo]} · cargado el ${fecha(p.fechaPedido)}${p.vendedor ? ` · vendió ${p.vendedor.nombre}` : ""}`}>
        {permisos.has("editar_pedidos") && <Link href={`/pedidos/${p.id}/editar`} className="btn-secundario"><Pencil size={16} /> Editar</Link>}
        <BotonImprimir texto="Imprimir orden" icono={<Printer size={16} />} />
      </Encabezado>

      {sp.guardado && <p className="mb-3 text-sm text-estado-listo-txt bg-estado-listo rounded-xl px-4 py-3">¡Pedido guardado!</p>}
      {sp.aviso && <p className="mb-3 text-sm text-estado-produccion-txt bg-estado-produccion rounded-xl px-4 py-3">{sp.aviso}</p>}
      {sp.sinTelefono && <p className="mb-3 text-sm text-estado-alerta-txt bg-estado-alerta rounded-xl px-4 py-3">La clienta no tiene WhatsApp cargado, por eso no se abrió el mensaje. Agregalo en su ficha.</p>}
      {p.revisar && (
        <div className="mb-3 text-sm text-estado-produccion-txt bg-estado-produccion rounded-xl px-4 py-3 flex flex-wrap items-center gap-2 justify-between">
          <span className="flex gap-2"><AlertTriangle size={18} className="shrink-0" /> <span><strong>Revisar (importado):</strong> {p.revisar}. Si hace falta, corregilo con &quot;Editar&quot; o registrá el pago.</span></span>
          {permisos.has("editar_pedidos") && <BotonRevisado id={p.id} />}
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
            {permisos.has("cambiar_estado") && <div className="no-imprimir"><BotonesEstado pedidoId={p.id} estado={p.estado} /></div>}
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
                  {i.bordadoTipografia && (
                    <p className="text-sm mt-1">– Tipografía: <strong>{i.bordadoTipografia}</strong>
                      {i.bordadoTexto && tipografia(i.bordadoTipografia) && <span className="ml-2 text-acento-oscuro" style={{ fontFamily: tipografia(i.bordadoTipografia)!.fuente, fontSize: tipografia(i.bordadoTipografia)!.tamano }}>{i.bordadoTexto}</span>}
                    </p>
                  )}
                  {i.bordadoDetalle && <p className="text-sm mt-1">– Dónde va exactamente: <strong>{i.bordadoDetalle}</strong></p>}
                  {i.bordadoFotos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">{i.bordadoFotos.map((u) => <a key={u} href={u} target="_blank"><img src={u} alt="Dónde va el bordado" className="w-16 h-16 rounded-lg object-cover border border-borde" /></a>)}</div>
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

          {p.tareas.length > 0 && (
            <section className="tarjeta p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl">Producción</h2>
                <span className="text-sm text-texto-2">{p.tareas.filter((t) => t.terminada).length} de {p.tareas.length} tareas terminadas</span>
              </div>
              <div className="h-2 rounded-full bg-menu overflow-hidden mb-3"><div className="h-full bg-estado-listo-txt" style={{ width: `${(100 * p.tareas.filter((t) => t.terminada).length) / p.tareas.length}%` }} /></div>
              <ul className="divide-y divide-borde">
                {p.tareas.map((t) => {
                  const previa = bloqueadaPor(t, p.tareas);
                  return (
                    <li key={t.id} className="flex items-center gap-3 py-2">
                      <CasillaTarea id={t.id} terminada={t.terminada} bloqueada={!!previa} />
                      <div className="text-sm min-w-0">
                        <p className={t.terminada ? "line-through text-texto-2" : ""}><strong>{t.taller.nombre}</strong> · {NOMBRE_FUNCION[t.taller.funcion]} · {t.prenda}{t.color ? ` ${t.color}` : ""}{t.talle ? ` · ${t.talle}` : ""}</p>
                        {previa && !t.terminada && <p className="text-xs text-estado-produccion-txt">Espera a {previa.taller.nombre}</p>}
                        {t.terminada && t.terminadaEn && <p className="text-xs text-texto-2">Terminada el {fecha(t.terminadaEn)}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

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
            {p.envio && p.estado !== "ENTREGADO" && p.estado !== "CANCELADO" && permisos.has("gestionar_envios") && (
              <div className="sm:col-span-2 no-imprimir">
                <p className="text-texto-2 mb-1">Cotizar envío {p.costoEnvio ? <span className="text-texto">· elegido: {p.formaEnvio} {pesos(p.costoEnvio)}</span> : null}</p>
                <Cotizador pedidoId={p.id} cpInicial={p.codigoPostal ?? p.cliente.codigoPostal} localidadInicial={p.localidad ?? p.cliente.localidad} />
              </div>
            )}
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
              <div className={`flex justify-between font-medium ${sal > 0 || p.total === 0 ? "text-estado-alerta-txt" : "text-estado-listo-txt"}`}><span>Saldo</span><span>{p.total === 0 ? "Sin precio" : sal > 0 ? pesos(sal) : "Pagado ✓"}</span></div>
            </div>
            {p.pagos.length > 0 && (
              <ul className="mt-3 border-t border-borde pt-3 space-y-1 text-sm">
                {p.pagos.map((pg) => (
                  <li key={pg.id} className="flex items-center justify-between gap-2">
                    <span>{fecha(pg.fecha)} · {NOMBRE_MEDIO[pg.medio]}{pg.esSena ? " · seña" : ""}{pg.nota ? <span className="text-texto-2"> · {pg.nota}</span> : null}</span>
                    <span className="flex items-center gap-1 whitespace-nowrap">{pesos(pg.monto)}{permisos.has("borrar_pagos") && <BorrarPago id={pg.id} />}</span>
                  </li>
                ))}
              </ul>
            )}
            {sal > 0 && permisos.has("registrar_pagos") && <div className="mt-4 no-imprimir"><FormPago pedidoId={p.id} saldo={sal} hoy={fechaInput(new Date())} /></div>}
            {sal > 0 && permisos.has("links_pago") && (
              <div className="mt-4 pt-4 border-t border-borde no-imprimir">
                <p className="text-sm font-medium mb-2">Link de Mercado Pago</p>
                <LinkPago pedidoId={p.id} total={p.total} saldo={sal} linkActual={p.linkPago} montoActual={p.linkPagoMonto}
                  telefono={p.cliente.telefono} configurado={mercadoPagoConfigurado()}
                  mensajeSaldo={armarMensaje(tpl("saldo"), { ...p, linkPago: null }, { link_pago: "__LINK__" })} />
              </div>
            )}
          </section>

          {p.estado !== "CANCELADO" && p.estado !== "ENTREGADO" && (
            <section className="tarjeta p-5 no-imprimir">
              <h2 className="text-2xl mb-1">Datos para completar</h2>
              <p className="text-xs text-texto-2 mb-3">Link para que la clienta complete los colores, talles, el bordado y los datos de envío de este pedido (ideal después de que abona).</p>
              <LinkCompletar pedidoId={p.id} link={completar} mensaje={armarMensaje(tpl("completar") || "¡Hola {nombre}! Completá los datos de tu pedido N° {pedido} acá: {link_completar}", p, { link_completar: completar })}
                telefono={p.cliente.telefono} instagram={p.cliente.instagram}
                completadoEl={p.datosCompletadosEn ? fecha(p.datosCompletadosEn) : null} puedeReabrir={permisos.has("editar_pedidos")} />
            </section>
          )}

          <section className="tarjeta p-5 no-imprimir">
            <h2 className="text-2xl mb-1">Resumen para la clienta</h2>
            <p className="text-xs text-texto-2 mb-3">Detalle de la compra con link y PDF para descargar.</p>
            <EnviarResumen link={resumen} asunto={`Tu pedido N° ${p.numero} en Micaela Diseño`}
              mensaje={armarMensaje(conLinkResumen(tpl("confirmacion")), p, { link_resumen: resumen })}
              telefono={p.cliente.telefono} email={p.cliente.email} instagram={p.cliente.instagram} />
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

          {permisos.has("borrar_pedidos") && (
            <div className="no-imprimir">
              <BotonBorrar accion={borrarPedido.bind(null, p.id)} texto="Borrar pedido" confirmacion={`¿Borrar el pedido N° ${p.numero}? Se borran también sus pagos. Si solo no va, mejor marcalo como Cancelado.`} />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
