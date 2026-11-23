import "server-only";
import { db } from "@/lib/db";
import { esAccesorio } from "@/lib/prendasProducto";

// Pedido del link para completar, con lo que la clienta puede elegir en cada prenda
export async function pedidoParaCompletar(token: string) {
  if (!token || token.length < 16) return null;
  const p = await db.pedido.findUnique({
    where: { tokenCompletar: token },
    include: {
      cliente: true, pagos: true,
      items: { orderBy: { orden: "asc" }, include: { prendas: { orderBy: { orden: "asc" } } } },
    },
  });
  if (!p) return null;
  const ids = [...new Set(p.items.flatMap((i) => i.prendas.map((pr) => pr.productoId)).filter((x): x is string => !!x))];
  const productos = new Map((await db.producto.findMany({ where: { id: { in: ids } }, select: { id: true, colores: true, talles: true } })).map((x) => [x.id, x]));
  const items = p.items
    .map((i) => ({
      id: i.id, nombre: i.nombre, persona: i.persona, bordadoTexto: i.bordadoTexto, bordadoUbicacion: i.bordadoUbicacion,
      bordadoDetalle: i.bordadoDetalle, bordadoFotos: i.bordadoFotos, bordadoTipografia: i.bordadoTipografia, hilo: i.hilo,
      prendas: i.prendas.filter((pr) => !esAccesorio(pr.nombre)).map((pr) => {
        const prod = pr.productoId ? productos.get(pr.productoId) : undefined;
        return { id: pr.id, nombre: pr.nombre, color: pr.color, talle: pr.talle, colores: prod?.colores ?? [], talles: prod?.talles ?? [] };
      }),
      // los adicionales sin prendas solo se muestran si son de bordado
      conBordado: i.prendas.length > 0 || !!i.bordadoTexto || /bordado/i.test(i.nombre),
    }))
    .filter((i) => i.prendas.length > 0 || i.conBordado);
  return { p, items };
}
