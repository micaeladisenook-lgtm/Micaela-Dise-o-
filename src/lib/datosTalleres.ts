import "server-only";
import { db } from "./db";
import { fechaGuia, semana, hoyAR } from "./pedidos";
import { fecha } from "./formato";
import { vistaTarea, itemDeTarea } from "./vistaTaller";

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
      pedido: {
        select: {
          id: true, numero: true, fechaEvento: true, fechaEntrega: true, prioridad: true, estado: true, disenos: { include: { diseno: true } },
          items: { select: { orden: true, nombre: true, persona: true, bordadoTexto: true, bordadoUbicacion: true, hilo: true, notas: true } },
        },
      },
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

// Una línea por trabajo para el WhatsApp del taller (solo lo que le toca, sin datos de la clienta)
export function lineaTarea(t: TareaSemana) {
  const v = vistaTarea(t.taller.funcion, t, itemDeTarea(t.clave, t.pedido.items));
  return [
    `• N° ${t.pedido.numero}`,
    `${v.accion}: ${v.prenda}`,
    ...v.datos.map((d) => `${d.etiqueta.toLowerCase()} ${d.valor}`),
    ...v.notas,
    fechasTexto(t.pedido),
    t.pedido.prioridad ? "PRIORIDAD" : null,
  ].filter(Boolean).join(" · ");
}

export function fechasTexto(p: { fechaEntrega: Date | null; fechaEvento: Date | null }) {
  return [p.fechaEntrega ? `entrega ${fecha(p.fechaEntrega)}` : null, p.fechaEvento ? `evento ${fecha(p.fechaEvento)}` : null].filter(Boolean).join(" · ") || "sin fecha";
}
