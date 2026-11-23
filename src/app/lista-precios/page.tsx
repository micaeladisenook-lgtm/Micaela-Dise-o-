import Link from "next/link";
import BotonImprimir from "./BotonImprimir";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { fecha, pesos } from "@/lib/formato";
import { NOMBRE_TIPO, ORDEN_TIPOS } from "@/lib/catalogo";

export const metadata = { title: "Lista de precios · Micaela Diseño" };

export default async function ListaPreciosPage() {
  await requerirUsuario();
  const productos = await db.producto.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });
  return (
    <div className="min-h-screen bg-fondo print:bg-white py-6 px-4">
      <div className="no-imprimir max-w-[800px] mx-auto mb-4 flex flex-wrap items-center gap-3">
        <BotonImprimir />
        <Link href="/catalogo" className="btn-suave">Volver al catálogo</Link>
        <p className="text-xs text-texto-2 basis-full">
          Al tocar &quot;Descargar PDF&quot; se abre la ventana de impresión: elegí <strong>&quot;Guardar como PDF&quot;</strong> como destino.
        </p>
      </div>

      <article className="bg-white max-w-[800px] mx-auto p-8 md:p-12 border border-borde rounded-tarjeta print:border-0 print:p-0 print:rounded-none">
        <header className="text-center border-b border-borde pb-6 mb-8">
          <p className="titulo text-5xl italic text-acento">Micaela Diseño</p>
          <p className="text-xs uppercase tracking-[0.25em] text-texto-2 mt-2">Lista de precios</p>
          <p className="text-xs text-texto-2 mt-1">Vigente al {fecha(new Date())}</p>
        </header>

        {ORDEN_TIPOS.map((tipo) => {
          const lista = productos.filter((p) => p.tipo === tipo);
          if (!lista.length) return null;
          return (
            <section key={tipo} className="mb-8 break-inside-avoid">
              <h2 className="text-2xl text-acento mb-3">{NOMBRE_TIPO[tipo]}</h2>
              <div className="divide-y divide-borde">
                {lista.map((p) => (
                  <div key={p.id} className="py-3 flex items-baseline justify-between gap-6 break-inside-avoid">
                    <div>
                      <p className="font-medium">{p.nombre}</p>
                      {p.descripcion && <p className="text-sm text-texto-2">{p.descripcion}</p>}
                      {p.colores.length > 0 && <p className="text-xs text-texto-2 mt-0.5">Colores: {p.colores.join(", ")}</p>}
                      {p.talles.length > 0 && <p className="text-xs text-texto-2">Talles: {p.talles.join(", ")}</p>}
                    </div>
                    <p className="font-semibold whitespace-nowrap">
                      {p.precio == null ? <span className="text-sm font-normal text-texto-2">Consultar</span> : `${p.tipo === "ADICIONAL" ? "+" : ""}${pesos(p.precio)}`}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
        <footer className="text-center text-xs text-texto-2 border-t border-borde pt-6">
          Precios en pesos argentinos. Sujetos a modificación sin previo aviso.
        </footer>
      </article>
    </div>
  );
}
