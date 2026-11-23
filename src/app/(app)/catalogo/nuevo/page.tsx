import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import ProductoForm from "../ProductoForm";
import { crearProducto } from "../acciones";
import { db } from "@/lib/db";

import { requerirPermiso } from "@/lib/acceso";

export default async function NuevoProductoPage() {
  await requerirPermiso("editar_precios");
  const sueltos = await db.producto.findMany({ where: { tipo: "SUELTO" }, orderBy: [{ orden: "asc" }, { nombre: "asc" }], select: { id: true, nombre: true } });
  return (
    <>
      <Encabezado titulo="Nuevo producto"><Link href="/catalogo" className="btn-suave">Volver</Link></Encabezado>
      <div className="tarjeta p-5 md:p-6 max-w-3xl"><ProductoForm accion={crearProducto} sueltos={sueltos} /></div>
    </>
  );
}
