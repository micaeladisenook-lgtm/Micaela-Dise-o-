import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import Encabezado from "@/components/Encabezado";
import { FormItem, FormConsumo, BorrarConsumo, BotonTelas } from "./Formularios";
import { db } from "@/lib/db";

import { requerirPermiso, permisosDeRol } from "@/lib/acceso";

const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

export default async function StockPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const u = await requerirPermiso("ver_stock");
  const esAdmin = u.rol === "ADMIN";
  const editar = (await permisosDeRol(u.rol)).has("editar_stock");
  const { tab = "insumos" } = await searchParams;
  const [items, productos, consumos, bata] = await Promise.all([
    db.itemStock.findMany({ orderBy: [{ categoria: "asc" }, { nombre: "asc" }] }),
    db.producto.findMany({ where: { activo: true }, orderBy: [{ tipo: "asc" }, { orden: "asc" }], select: { id: true, nombre: true } }),
    db.consumoProducto.findMany({ include: { producto: true, item: true } }),
    db.producto.findFirst({ where: { nombre: { startsWith: "Bata diseñada de satén" } } }),
  ]);
  const bajos = items.filter((i) => i.activo && i.minimo > 0 && i.cantidad <= i.minimo);
  const lista = items.filter((i) => (tab === "productos" ? i.tipo === "PRODUCTO" : i.tipo === "INSUMO"));
  const categorias = [...new Set(lista.map((i) => i.categoria))];
  const chip = (on: boolean) => `min-h-11 px-5 inline-flex items-center rounded-full text-sm ${on ? "bg-white border border-borde font-medium text-acento" : "text-texto-2 hover:text-texto"}`;

  return (
    <>
      <Encabezado titulo="Stock" subtitulo="Insumos y productos terminados. Al vender se descuenta solo lo que configures en “Consumo por producto”." />
      {bajos.length > 0 && (
        <div className="rounded-tarjeta bg-estado-alerta text-estado-alerta-txt p-4 mb-5 flex gap-3">
          <AlertTriangle size={20} className="shrink-0" />
          <p><strong>Stock bajo:</strong> {bajos.map((b) => `${b.nombre} (${fmt(b.cantidad)} ${b.unidad})`).join(" · ")}</p>
        </div>
      )}
      <div className="inline-flex gap-1 bg-menu rounded-full p-1 mb-5 flex-wrap">
        <Link href="/stock" className={chip(tab === "insumos")}>Insumos</Link>
        <Link href="/stock?tab=productos" className={chip(tab === "productos")}>Productos terminados</Link>
        <Link href="/stock?tab=consumos" className={chip(tab === "consumos")}>Consumo por producto</Link>
      </div>

      {tab === "consumos" ? (
        <section className="tarjeta p-5 max-w-4xl">
          <h2 className="text-2xl mb-1">Qué usa cada producto</h2>
          <p className="text-sm text-texto-2 mb-4">Ejemplo: cada box usa 1 caja y 1 tarjeta; cada bata de satén usa 2,5 metros de satén del color elegido. Se descuenta solo al cargar el pedido y se devuelve si se cancela.</p>
          {consumos.length === 0 ? <p className="text-sm text-texto-2 mb-4">Todavía no hay consumos cargados.</p> : (
            <ul className="divide-y divide-borde mb-4">
              {consumos.sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre)).map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <span><strong>{c.producto.nombre}</strong> usa {fmt(c.cantidad)} {c.item ? `${c.item.unidad} de ${c.item.nombre}` : `metros de ${c.tela} del color elegido`}</span>
                  {esAdmin && <BorrarConsumo id={c.id} />}
                </li>
              ))}
            </ul>
          )}
          {esAdmin && <FormConsumo productos={productos} insumos={items.filter((i) => i.tipo === "INSUMO" && i.categoria !== "Telas").map((i) => ({ id: i.id, nombre: i.nombre }))} />}
        </section>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          <div className="space-y-5">
            {lista.length === 0 && (
              <div className="tarjeta p-8 text-center text-texto-2">
                {tab === "productos" ? "No hay productos terminados cargados. Si tenés batas o pantuflas ya hechas, agregalas acá." : "Todavía no hay insumos cargados."}
              </div>
            )}
            {categorias.map((cat) => (
              <section key={cat} className="tarjeta overflow-hidden">
                <h2 className="text-xl px-5 pt-4 pb-2">{cat}</h2>
                <table className="tabla w-full">
                  <thead><tr><th>Ítem</th><th className="text-right!">Cantidad</th><th className="text-right! hidden sm:table-cell">Mínimo</th><th></th></tr></thead>
                  <tbody>
                    {lista.filter((i) => i.categoria === cat).map((i) => {
                      const bajo = i.minimo > 0 && i.cantidad <= i.minimo;
                      return (
                        <tr key={i.id} className={i.activo ? "" : "opacity-50"}>
                          <td><Link href={`/stock/${i.id}`} className="font-medium hover:text-acento">{i.nombre}</Link>{i.talle && <span className="text-texto-2"> · {i.talle}</span>}</td>
                          <td className={`text-right whitespace-nowrap ${bajo ? "text-estado-alerta-txt font-semibold" : i.cantidad < 0 ? "text-estado-alerta-txt" : ""}`}>{fmt(i.cantidad)} <span className="text-texto-2 font-normal text-xs">{i.unidad}</span></td>
                          <td className="text-right text-texto-2 hidden sm:table-cell">{i.minimo ? fmt(i.minimo) : "—"}</td>
                          <td className="text-right">{bajo && <span className="chip bg-estado-alerta text-estado-alerta-txt">bajo</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
          <aside className="space-y-4 lg:sticky lg:top-6">
            {editar && <div className="tarjeta p-5">
              <h2 className="text-2xl mb-3">Agregar</h2>
              <FormItem item={null} productos={productos} colores={bata?.colores ?? []} />
            </div>}
            {esAdmin && tab === "insumos" && (
              <div className="tarjeta p-5 space-y-2">
                <p className="text-sm">Atajo: crear una fila de tela por cada color del catálogo.</p>
                <div className="flex flex-wrap gap-2"><BotonTelas tela="Satén" /><BotonTelas tela="Plush" /></div>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
