import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import ClienteForm from "../ClienteForm";
import { crearCliente } from "../acciones";
import { db } from "@/lib/db";
import { requerirPermiso } from "@/lib/acceso";

export default async function NuevaClientaPage() {
  await requerirPermiso("editar_clientes");
  const ultimo = await db.cliente.aggregate({ _max: { numero: true } });
  const proximo = (ultimo._max.numero ?? 0) + 1;
  return (
    <>
      <Encabezado titulo="Nueva clienta" subtitulo={`Se le va a asignar el número N° ${proximo} automáticamente.`}>
        <Link href="/clientes" className="btn-suave">Volver</Link>
      </Encabezado>
      <div className="tarjeta p-5 md:p-6 max-w-2xl">
        <ClienteForm accion={crearCliente} textoBoton="Guardar clienta" />
      </div>
    </>
  );
}
