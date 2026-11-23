import type { Metadata } from "next";
import FormPublico from "./FormPublico";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Hacé tu pedido · Micaela Diseño",
  description: "Batas de satén, pantuflas bordadas, pijamas y boxes de regalo personalizados.",
};
export const dynamic = "force-dynamic";

export default async function PedidoPublicoPage() {
  const productos = await db.producto.findMany({
    where: { activo: true, enListaPrecios: true, tipo: { not: "ADICIONAL" } },
    orderBy: [{ tipo: "asc" }, { orden: "asc" }],
    include: { componentes: { include: { componente: true }, orderBy: { id: "asc" } } },
  });
  const extra = await db.producto.findFirst({ where: { tipo: "ADICIONAL", nombre: { contains: "Bordado", mode: "insensitive" } } });
  const datos = productos.map((p) => {
    const base = p.componentes[0]?.componente ?? p;
    return {
      id: p.id, nombre: p.nombre, precio: p.precio, descripcion: p.descripcion,
      colores: base.colores.length ? base.colores : p.colores,
      tallesBata: p.componentes.find((c) => /bata/i.test(c.componente.nombre))?.componente.talles ?? (/bata/i.test(p.nombre) ? p.talles : []),
      tallesPantu: p.componentes.find((c) => /pantu/i.test(c.componente.nombre))?.componente.talles ?? [],
      tallesOtro: p.componentes.find((c) => !/bata|pantu|antifaz|scrunchie/i.test(c.componente.nombre))?.componente.talles ?? [],
      opciones: p.componentes.filter((c) => c.aEleccion).map((c) => ({ id: c.componenteId, nombre: c.componente.nombre })),
    };
  });
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-md mx-auto">
        <header className="text-center mb-6">
          <p className="titulo text-5xl italic text-acento leading-none">Micaela Diseño</p>
          <p className="text-xs uppercase tracking-[0.25em] text-texto-2 mt-3">Hacé tu pedido</p>
          <p className="text-sm text-texto-2 mt-3">Completá tus datos y te escribimos por WhatsApp para confirmar y coordinar el pago 💕</p>
        </header>
        <FormPublico productos={datos} precioBordadoExtra={extra?.precio ?? 10000} />
      </div>
    </main>
  );
}
