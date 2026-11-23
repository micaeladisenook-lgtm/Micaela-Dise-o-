import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import Pestanas from "../Pestanas";
import SubirDiseno from "./SubirDiseno";
import BorrarDiseno from "./BorrarDiseno";
import { db } from "@/lib/db";
import { NOMBRE_CATEGORIA_DISENO } from "@/lib/catalogo";
import type { CategoriaDiseno } from "@prisma/client";
import { requerirPermiso } from "@/lib/acceso";

const CATS = ["BORDADO", "COLOR", "PRODUCTO"] as const;

export default async function GaleriaPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  await requerirPermiso("ver_catalogo");
  const { cat } = await searchParams;
  const filtro = CATS.includes(cat as never) ? (cat as CategoriaDiseno) : undefined;
  const [disenos, productos, conteos] = await Promise.all([
    db.diseno.findMany({ where: filtro ? { categoria: filtro } : {}, include: { producto: true }, orderBy: { creadoEn: "desc" } }),
    db.producto.findMany({ where: { activo: true }, orderBy: [{ orden: "asc" }, { nombre: "asc" }], select: { id: true, nombre: true } }),
    db.diseno.groupBy({ by: ["categoria"], _count: true }),
  ]);
  const cuenta = (c: string) => conteos.find((x) => x.categoria === c)?._count ?? 0;
  const total = conteos.reduce((s, x) => s + x._count, 0);
  const chip = (on: boolean) => `min-h-11 px-4 inline-flex items-center gap-2 rounded-full text-sm border ${on ? "bg-acento text-white border-acento" : "bg-white border-borde hover:border-acento"}`;

  return (
    <>
      <Encabezado titulo="Catálogo y precios" subtitulo="Fotos de productos, colores y bordados para elegir al cargar un pedido" />
      <Pestanas activa="disenos" />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <Link href="/catalogo/disenos" className={chip(!filtro)}>Todos <span className="opacity-70">{total}</span></Link>
            {CATS.map((c) => (
              <Link key={c} href={`/catalogo/disenos?cat=${c}`} className={chip(filtro === c)}>
                {NOMBRE_CATEGORIA_DISENO[c]} <span className="opacity-70">{cuenta(c)}</span>
              </Link>
            ))}
          </div>
          {disenos.length === 0 ? (
            <div className="tarjeta p-8 text-center text-texto-2">Todavía no hay fotos en esta categoría.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {disenos.map((d) => (
                <figure key={d.id} className="tarjeta overflow-hidden group relative">
                  <img src={d.imagen} alt={d.nombre} className="w-full aspect-square object-cover bg-menu" loading="lazy" />
                  <figcaption className="p-3">
                    <p className="text-sm font-medium leading-tight">{d.nombre}</p>
                    <p className="text-xs text-texto-2 mt-0.5">
                      {NOMBRE_CATEGORIA_DISENO[d.categoria]}{d.producto ? ` · ${d.producto.nombre}` : ""}
                    </p>
                    {d.descripcion && <p className="text-xs text-texto-2 mt-0.5">{d.descripcion}</p>}
                  </figcaption>
                  <div className="absolute top-2 right-2"><BorrarDiseno id={d.id} nombre={d.nombre} /></div>
                </figure>
              ))}
            </div>
          )}
        </div>
        <aside className="tarjeta p-5 lg:sticky lg:top-6">
          <h2 className="text-2xl mb-3">Agregar foto</h2>
          <SubirDiseno productos={productos} />
        </aside>
      </div>
    </>
  );
}
