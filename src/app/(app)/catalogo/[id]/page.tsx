import Link from "next/link";
import { notFound } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import BotonBorrar from "@/components/BotonBorrar";
import ProductoForm from "../ProductoForm";
import { actualizarProducto, borrarProducto } from "../acciones";
import { db } from "@/lib/db";

import { NOMBRE_TIPO_SINGULAR } from "@/lib/catalogo";
import { requerirPermiso } from "@/lib/acceso";

export default async function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  await requerirPermiso("editar_precios");
  const { id } = await params;
  const p = await db.producto.findUnique({ where: { id }, include: { componentes: true } });
  if (!p) notFound();
  const sueltos = await db.producto.findMany({
    where: { tipo: "SUELTO", id: { not: id } },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    select: { id: true, nombre: true },
  });
  return (
    <>
      <Encabezado titulo={p.nombre} subtitulo={NOMBRE_TIPO_SINGULAR[p.tipo]}>
        <Link href="/catalogo" className="btn-suave">Volver</Link>
      </Encabezado>
      <div className="tarjeta p-5 md:p-6 max-w-3xl">
        <ProductoForm key={p.actualizadoEn.toISOString()} accion={actualizarProducto.bind(null, p.id)} producto={p} sueltos={sueltos} />
      </div>
      <div className="mt-6 max-w-3xl">
        <BotonBorrar accion={borrarProducto.bind(null, p.id)} texto="Borrar producto"
          confirmacion={`¿Seguro que querés borrar "${p.nombre}"? Si solo querés ocultarlo, mejor desmarcá "Activo".`} />
      </div>
    </>
  );
}
