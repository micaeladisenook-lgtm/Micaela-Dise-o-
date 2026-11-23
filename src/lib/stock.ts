import "server-only";
import { db } from "./db";

// Devuelve al stock lo que se había descontado por un pedido
export async function revertirConsumo(pedidoId: string, usuarioId: string | null, motivo = "Devolución") {
  const movs = await db.movimientoStock.findMany({ where: { pedidoId, cantidad: { lt: 0 } } });
  const ya = await db.movimientoStock.findMany({ where: { pedidoId, cantidad: { gt: 0 } } });
  const neto = new Map<string, number>();
  for (const m of [...movs, ...ya]) neto.set(m.itemId, (neto.get(m.itemId) ?? 0) + m.cantidad);
  for (const [itemId, n] of neto) {
    if (n >= 0) continue;
    await db.$transaction([
      db.itemStock.update({ where: { id: itemId }, data: { cantidad: { increment: -n } } }),
      db.movimientoStock.create({ data: { itemId, cantidad: -n, motivo, pedidoId, usuarioId } }),
    ]);
  }
}

// Descuenta del stock los insumos y productos terminados que usa un pedido
export async function aplicarConsumo(pedidoId: string, usuarioId: string | null) {
  const p = await db.pedido.findUnique({
    where: { id: pedidoId },
    include: { items: { include: { prendas: true } } },
  });
  if (!p) return;
  await revertirConsumo(pedidoId, usuarioId, `Ajuste por cambio en pedido N° ${p.numero}`);
  if (p.estado === "CANCELADO") return;

  const ids = new Set<string>();
  for (const it of p.items) {
    if (it.productoId) ids.add(it.productoId);
    for (const pr of it.prendas) if (pr.productoId) ids.add(pr.productoId);
  }
  const consumos = await db.consumoProducto.findMany({ where: { productoId: { in: [...ids] } } });
  const telas = await db.itemStock.findMany({ where: { categoria: "Telas", activo: true } });
  const terminados = await db.itemStock.findMany({ where: { tipo: "PRODUCTO", activo: true, cantidad: { gt: 0 } } });

  const descontar = new Map<string, number>();
  const sumar = (id: string, n: number) => descontar.set(id, (descontar.get(id) ?? 0) + n);
  const igual = (a?: string | null, b?: string | null) => (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

  for (const it of p.items) {
    const n = Math.max(1, it.cantidad);
    for (const c of consumos.filter((c) => c.productoId === it.productoId && c.itemId)) sumar(c.itemId!, c.cantidad * n);
    for (const pr of it.prendas) {
      // ¿hay una prenda terminada en stock con ese color y talle? se usa esa
      const lista = terminados.find((s) => s.productoId === pr.productoId && igual(s.color, pr.color) && (!s.talle || igual(s.talle, pr.talle)));
      if (lista) { sumar(lista.id, n); continue; }
      for (const c of consumos.filter((c) => c.productoId === pr.productoId)) {
        if (c.itemId) sumar(c.itemId, c.cantidad * n);
        else if (c.tela && pr.color) {
          const tela = telas.find((t) => igual(t.tela, c.tela) && igual(t.color, pr.color));
          if (tela) sumar(tela.id, c.cantidad * n);
        }
      }
    }
  }
  for (const [itemId, cant] of descontar) {
    await db.$transaction([
      db.itemStock.update({ where: { id: itemId }, data: { cantidad: { decrement: cant } } }),
      db.movimientoStock.create({ data: { itemId, cantidad: -cant, motivo: `Pedido N° ${p.numero}`, pedidoId, usuarioId } }),
    ]);
  }
}
