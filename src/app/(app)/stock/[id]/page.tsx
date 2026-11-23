import Link from "next/link";
import { notFound } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import BotonBorrar from "@/components/BotonBorrar";
import { FormItem, FormMovimiento } from "../Formularios";
import { borrarItem } from "../acciones";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { fechaHora } from "@/lib/formato";

export default async function ItemStockPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await requerirUsuario();
  const { id } = await params;
  const it = await db.itemStock.findUnique({ where: { id }, include: { movimientos: { orderBy: { fecha: "desc" }, take: 50, include: { pedido: true } } } });
  if (!it) notFound();
  const [productos, bata, usuarios] = await Promise.all([
    db.producto.findMany({ where: { activo: true }, select: { id: true, nombre: true } }),
    db.producto.findFirst({ where: { nombre: { startsWith: "Bata diseñada de satén" } } }),
    db.usuario.findMany({ select: { id: true, nombre: true } }),
  ]);
  const quien = (uid: string | null) => usuarios.find((x) => x.id === uid)?.nombre ?? "Sistema";
  return (
    <>
      <Encabezado titulo={it.nombre} subtitulo={`${it.categoria} · hay ${it.cantidad.toLocaleString("es-AR")} ${it.unidad}`}>
        <Link href={it.tipo === "PRODUCTO" ? "/stock?tab=productos" : "/stock"} className="btn-suave">Volver</Link>
      </Encabezado>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <section className="tarjeta p-5">
          <h2 className="text-2xl mb-3">Movimientos</h2>
          {it.movimientos.length === 0 ? <p className="text-sm text-texto-2">Sin movimientos.</p> : (
            <ul className="divide-y divide-borde text-sm">
              {it.movimientos.map((m) => (
                <li key={m.id} className="flex justify-between gap-3 py-2">
                  <span>{m.pedido ? <Link href={`/pedidos/${m.pedidoId}`} className="text-acento hover:underline">{m.motivo}</Link> : m.motivo}<span className="block text-xs text-texto-2">{fechaHora(m.fecha)} · {quien(m.usuarioId)}</span></span>
                  <span className={`font-medium whitespace-nowrap ${m.cantidad < 0 ? "text-estado-alerta-txt" : "text-estado-listo-txt"}`}>{m.cantidad > 0 ? "+" : ""}{m.cantidad.toLocaleString("es-AR")} {it.unidad}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className="space-y-4">
          <div className="tarjeta p-5"><h2 className="text-xl mb-3">Entrada / salida</h2><FormMovimiento id={it.id} unidad={it.unidad} /></div>
          <div className="tarjeta p-5"><h2 className="text-xl mb-3">Datos</h2><FormItem item={it} productos={productos} colores={bata?.colores ?? []} /></div>
          {u.rol === "ADMIN" && <BotonBorrar accion={borrarItem.bind(null, it.id)} texto="Borrar ítem" confirmacion={`¿Borrar "${it.nombre}" y su historial?`} />}
        </aside>
      </div>
    </>
  );
}
