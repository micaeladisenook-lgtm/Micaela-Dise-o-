import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import FormPrecios from "./FormPrecios";
import { db } from "@/lib/db";

import { NOMBRE_TIPO, ORDEN_TIPOS } from "@/lib/catalogo";
import { requerirPermiso } from "@/lib/acceso";

export default async function EditarPreciosPage() {
  await requerirPermiso("editar_precios");
  const productos = await db.producto.findMany({ orderBy: [{ orden: "asc" }, { nombre: "asc" }] });
  const grupos = ORDEN_TIPOS.map((t) => ({
    titulo: NOMBRE_TIPO[t],
    filas: productos.filter((p) => p.tipo === t).map(({ id, nombre, tipo, precio }) => ({ id, nombre, tipo, precio })),
  })).filter((g) => g.filas.length);
  return (
    <>
      <Encabezado titulo="Editar precios" subtitulo="Cambiá los precios que quieras y tocá Guardar. Queda registrado quién los cambió.">
        <Link href="/catalogo" className="btn-suave">Volver</Link>
      </Encabezado>
      <FormPrecios grupos={grupos} />
    </>
  );
}
