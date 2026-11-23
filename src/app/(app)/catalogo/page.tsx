import Link from "next/link";
import { FileDown, Pencil } from "lucide-react";
import Encabezado from "@/components/Encabezado";
import Pestanas from "./Pestanas";
import { db } from "@/lib/db";
import { usuarioActual } from "@/lib/auth";
import { pesos } from "@/lib/formato";
import { NOMBRE_TIPO, ORDEN_TIPOS } from "@/lib/catalogo";

export default async function CatalogoPage() {
  const u = await usuarioActual();
  const esAdmin = u?.rol === "ADMIN";
  const productos = await db.producto.findMany({
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    include: { componentes: { include: { componente: true } } },
  });

  return (
    <>
      <Encabezado titulo="Catálogo y precios" subtitulo="Productos, boxes, kits y sus variantes">
        <Link href="/lista-precios" target="_blank" className="btn-secundario"><FileDown size={18} /> Lista de precios PDF</Link>
        {esAdmin && <Link href="/catalogo/precios" className="btn-secundario">Editar precios</Link>}
        {esAdmin && <Link href="/catalogo/nuevo" className="btn-primario">+ Nuevo producto</Link>}
      </Encabezado>
      <Pestanas activa="productos" />

      <div className="space-y-8">
        {ORDEN_TIPOS.map((tipo) => {
          const lista = productos.filter((p) => p.tipo === tipo);
          if (!lista.length) return null;
          return (
            <section key={tipo}>
              <h2 className="text-2xl mb-3">{NOMBRE_TIPO[tipo]}</h2>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {lista.map((p) => (
                  <article key={p.id} className={`tarjeta p-5 flex flex-col ${p.activo ? "" : "opacity-60"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-xl leading-tight">{p.nombre}</h3>
                      <p className={`text-lg font-semibold whitespace-nowrap ${p.precio == null ? "text-texto-2 text-sm font-normal" : "text-acento"}`}>
                        {p.tipo === "ADICIONAL" && p.precio != null ? "+" : ""}{pesos(p.precio)}
                      </p>
                    </div>
                    {p.descripcion && <p className="text-sm text-texto-2 mt-1">{p.descripcion}</p>}
                    {!p.activo && <p className="chip bg-menu text-texto-2 mt-2 self-start">Inactivo</p>}

                    {p.componentes.length > 0 && (
                      <ul className="mt-3 text-sm space-y-0.5">
                        {p.componentes.map((c) => (
                          <li key={c.id} className="text-texto">
                            • {c.cantidad > 1 ? `${c.cantidad} × ` : ""}{c.componente.nombre}
                            {c.opcional && <span className="text-texto-2"> (opcional)</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {p.colores.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-texto-2 mb-1">Colores</p>
                        <div className="flex flex-wrap gap-1">
                          {p.colores.map((c) => <span key={c} className="chip bg-menu text-texto">{c}</span>)}
                        </div>
                      </div>
                    )}
                    {p.talles.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-texto-2 mb-1">Talles</p>
                        <div className="flex flex-wrap gap-1">
                          {p.talles.map((t) => <span key={t} className="chip border border-borde text-texto">{t}</span>)}
                        </div>
                      </div>
                    )}
                    {esAdmin && (
                      <div className="mt-auto pt-4">
                        <Link href={`/catalogo/${p.id}`} className="btn-suave min-h-10 px-4"><Pencil size={15} /> Editar</Link>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
