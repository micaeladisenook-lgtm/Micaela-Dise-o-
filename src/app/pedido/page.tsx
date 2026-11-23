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
  const avisos = await db.plantilla.findMany({ where: { clave: { in: ["aviso_envio", "aviso_pedido"] } } });
  const aviso = (k: string) => avisos.find((a) => a.clave === k)?.texto ?? "";
  const extra = await db.producto.findFirst({ where: { tipo: "ADICIONAL", nombre: { contains: "Bordado", mode: "insensitive" } } });
  const datos = productos.map((p) => ({
    id: p.id, nombre: p.nombre, tipo: p.tipo, precio: p.precio, precioAnterior: p.precioAnterior, descripcion: p.descripcion,
    colores: p.colores, talles: p.talles,
    componentes: p.componentes.map((c) => ({
      componenteId: c.componenteId, cantidad: c.cantidad, aEleccion: c.aEleccion,
      componente: { id: c.componente.id, nombre: c.componente.nombre, colores: c.componente.colores, talles: c.componente.talles },
    })),
  }));
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-xl mx-auto">
        <header className="text-center mb-6">
          <p className="titulo text-5xl italic text-acento leading-none">Micaela Diseño</p>
          <p className="text-xs uppercase tracking-[0.25em] text-texto-2 mt-3">Hacé tu pedido</p>
          <p className="text-sm text-texto-2 mt-3">Elegí tu box, personalizalo y completá los datos de envío. Te escribimos por WhatsApp para confirmar, pasarte el costo del envío y coordinar la seña 💕</p>
        </header>
        <FormPublico productos={datos} precioBordadoExtra={extra?.precio ?? 10000} avisoEnvio={aviso("aviso_envio")} avisoPedido={aviso("aviso_pedido")} />
      </div>
    </main>
  );
}
