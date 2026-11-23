import Link from "next/link";
import { notFound } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import FormPedido from "../../FormPedido";
import { datosFormularioPedido, includePedidoCompleto } from "@/lib/datosPedido";

import { db } from "@/lib/db";
import { fechaInput } from "@/lib/pedidos";
import type { PedidoForm } from "../../tipos";
import { requerirPermiso, permisosDe } from "@/lib/acceso";

export default async function EditarPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await requerirPermiso("editar_pedidos");
  const permisos = await permisosDe(u);
  const { id } = await params;
  const p = await db.pedido.findUnique({ where: { id }, include: includePedidoCompleto });
  if (!p) notFound();
  const datos = await datosFormularioPedido();
  const inicial: PedidoForm = {
    cliente: { id: p.cliente.id, numero: p.cliente.numero, nombre: p.cliente.nombre, telefono: p.cliente.telefono ?? "", instagram: p.cliente.instagram ?? "", email: p.cliente.email ?? "" },
    tipo: p.tipo,
    items: p.items.map((i) => ({
      key: i.id, productoId: i.productoId, nombre: i.nombre, persona: i.persona ?? "", cantidad: i.cantidad,
      precioUnitario: i.precioUnitario, bordadoTexto: i.bordadoTexto ?? "", bordadoUbicacion: i.bordadoUbicacion ?? "",
      bordadoDetalle: i.bordadoDetalle ?? "", bordadoFotos: i.bordadoFotos ?? [], bordadoTipografia: i.bordadoTipografia ?? "",
      hilo: i.hilo ?? "", notas: i.notas ?? "",
      prendas: i.prendas.map((pr) => ({ productoId: pr.productoId, nombre: pr.nombre, color: pr.color ?? "", talle: pr.talle ?? "", bordada: pr.bordada })),
      eleccionId: i.prendas.find((pr) => datos.productos.find((x) => x.id === i.productoId)?.componentes.some((c) => c.aEleccion && c.componente.id === pr.productoId))?.productoId ?? null,
    })),
    disenos: p.disenos.map((d) => d.disenoId),
    fechaEvento: fechaInput(p.fechaEvento), evento: p.evento ?? "", eventoDetalle: p.eventoDetalle ?? "",
    fechaEntrega: fechaInput(p.fechaEntrega), envio: p.envio, formaEnvio: p.formaEnvio ?? "",
    direccionEnvio: p.direccionEnvio ?? "", localidad: p.localidad ?? "", provincia: p.provincia ?? "", codigoPostal: p.codigoPostal ?? "", entreCalles: p.entreCalles ?? "", prioridad: p.prioridad,
    notas: p.notas ?? "", vendedorId: p.vendedorId ?? u.id, estado: p.estado, sena: 0, medioSena: "TRANSFERENCIA",
  };
  return (
    <>
      <Encabezado titulo={`Editar pedido N° ${p.numero}`} subtitulo={p.cliente.nombre}>
        <Link href={`/pedidos/${p.id}`} className="btn-suave">Cancelar</Link>
      </Encabezado>
      <FormPedido {...datos} puedeFotos={permisos.has("subir_fotos_bordado")} puedeEstado={permisos.has("cambiar_estado")} usuarioId={u.id} inicial={inicial} pedidoId={p.id} numero={p.numero} />
    </>
  );
}
