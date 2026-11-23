import Encabezado from "@/components/Encabezado";
import FormPedido from "../FormPedido";
import { datosFormularioPedido } from "@/lib/datosPedido";

import { db } from "@/lib/db";
import { requerirPermiso } from "@/lib/acceso";

export default async function NuevoPedidoPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const u = await requerirPermiso("crear_pedidos");
  const { cliente } = await searchParams;
  const datos = await datosFormularioPedido();
  const c = cliente ? await db.cliente.findUnique({ where: { id: cliente } }) : null;
  return (
    <>
      <Encabezado titulo="Nuevo pedido" subtitulo="Completá los pasos. El resumen y el mensaje de WhatsApp se arman solos." />
      <FormPedido
        {...datos}
        usuarioId={u.id}
        inicial={c ? {
          cliente: { id: c.id, numero: c.numero, nombre: c.nombre, telefono: c.telefono ?? "", instagram: c.instagram ?? "", email: c.email ?? "" },
          direccionEnvio: c.direccion ?? "", localidad: c.localidad ?? "", provincia: c.provincia ?? "", codigoPostal: c.codigoPostal ?? "", entreCalles: c.entreCalles ?? "",
        } : undefined}
      />
    </>
  );
}
