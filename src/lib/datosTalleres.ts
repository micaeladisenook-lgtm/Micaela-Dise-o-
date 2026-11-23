import "server-only";
import { db } from "./db";
import { fechaGuia, semana, hoyAR } from "./pedidos";
import { fecha } from "./formato";

export async function tareasDeSemana(base: Date, tallerId?: string) {
  const sem = semana(base);
  const esActual = semana(hoyAR()).inicio.getTime() === sem.inicio.getTime();
  const tareas = await db.tarea.findMany({
    where: {
      ...(tallerId ? { tallerId } : {}),
      pedido: { estado: { in: ["NUEVO", "EN_PRODUCCION", "LISTO"] } },
    },
    include: {
      taller: true,
      pedido: { select: { id: true, numero: true, fechaEvento: true, fechaEntrega: true, prioridad: true, estado: true, cliente: { select: { nombre: true } }, disenos: { include: { diseno: true } } } },
    },
    orderBy: [{ pedido: { numero: "asc" } }, { clave: "asc" }],
  });
  const todasPorPedido = new Map<string, typeof tareas>();
  // necesitamos todas las tareas del pedido (de todos los talleres) para saber si una está bloqueada
  const pedidoIds = [...new Set(tareas.map((t) => t.pedidoId))];
  const completas = await db.tarea.findMany({ where: { pedidoId: { in: pedidoIds } }, include: { taller: true } });
  for (const t of completas) todasPorPedido.set(t.pedidoId, [...(todasPorPedido.get(t.pedidoId) ?? []), t as (typeof tareas)[number]]);

  const grupo = (t: (typeof tareas)[number]) => {
    const g = fechaGuia(t.pedido);
    if (!g) return esActual ? "sinFecha" : null;
    if (g >= sem.inicio && g <= sem.fin) return "semana";
    if (g < sem.inicio && !t.terminada && esActual) return "atrasadas";
    return null;
  };
  const conGrupo = tareas
    .map((t) => ({ ...t, grupo: grupo(t), todas: todasPorPedido.get(t.pedidoId) ?? [] }))
    .filter((t) => t.grupo)
    .sort((a, b) => (fechaGuia(a.pedido)?.getTime() ?? 9e15) - (fechaGuia(b.pedido)?.getTime() ?? 9e15) || a.pedido.numero - b.pedido.numero);
  return { sem, tareas: conGrupo, esActual };
}

export type TareaSemana = Awaited<ReturnType<typeof tareasDeSemana>>["tareas"][number];

export function lineaTarea(t: TareaSemana) {
  const g = fechaGuia(t.pedido);
  return [
    `• N° ${t.pedido.numero}`,
    t.prenda,
    t.color,
    t.talle ? `talle ${t.talle}` : null,
    t.bordado ? `bordado ${t.bordado}` : null,
    t.detalle,
    g ? `evento ${fecha(g).slice(0, 5)}` : null,
    t.pedido.prioridad ? "PRIORIDAD" : null,
  ].filter(Boolean).join(" · ");
}
