import "server-only";
import { db } from "./db";
import type { FuncionTaller } from "@prisma/client";

export const NOMBRE_FUNCION: Record<string, string> = {
  CONFECCION_ROPA: "Confección",
  BORDADO: "Bordado",
  CONFECCION_PANTU: "Confección de pantuflas",
  PEGADO_PANTU: "Pegado de pantuflas",
  OTRO: "Otro",
};

type Paso = { funcion: FuncionTaller; detalle?: string };

function tipoPrenda(nombre: string) {
  if (/pantu/i.test(nombre)) return "PANTU";
  if (/antifaz/i.test(nombre)) return "ANTIFAZ";
  if (/scrunchie|tarjeta|caja/i.test(nombre)) return "NADA";
  return "ROPA";
}

// Recorrido de cada prenda por los talleres:
// ropa: Gery confecciona → Héctor borda · pantuflas: Héctor borda → Richard confecciona → Pedro pega
function pasosDe(tipo: string, bordada: boolean): Paso[] {
  if (tipo === "ROPA") return [{ funcion: "CONFECCION_ROPA" }, ...(bordada ? [{ funcion: "BORDADO" as const }] : [])];
  if (tipo === "PANTU") return [...(bordada ? [{ funcion: "BORDADO" as const, detalle: "Bordado de pantufla" }] : []), { funcion: "CONFECCION_PANTU" }, { funcion: "PEGADO_PANTU" }];
  if (tipo === "ANTIFAZ") return bordada ? [{ funcion: "BORDADO", detalle: "Bordado de antifaz" }] : [];
  return [];
}

// Arma (o actualiza) las tareas de los talleres para un pedido, conservando lo ya terminado
export async function generarTareas(pedidoId: string) {
  const p = await db.pedido.findUnique({
    where: { id: pedidoId },
    include: { items: { orderBy: { orden: "asc" }, include: { prendas: { orderBy: { orden: "asc" } } } }, tareas: true },
  });
  if (!p) return;
  if (p.estado === "CANCELADO") {
    await db.tarea.deleteMany({ where: { pedidoId, terminada: false } });
    return;
  }
  if (p.estado === "ENTREGADO") return;
  const talleres = await db.taller.findMany({ where: { activo: true } });
  const tallerDe = (f: FuncionTaller) => talleres.find((t) => t.funcion === f);

  const deseadas: { clave: string; tallerId: string; paso: number; prenda: string; color: string | null; talle: string | null; bordado: string | null; detalle: string | null }[] = [];
  for (const it of p.items) {
    const bordadoTxt = it.bordadoTexto
      ? `"${it.bordadoTexto}"${it.bordadoUbicacion ? ` · ${it.bordadoUbicacion}` : ""}${it.hilo ? ` · hilo ${it.hilo.toLowerCase()}` : ""}`
      : null;
    const hayBata = it.prendas.some((pr) => /bata/i.test(pr.nombre));
    for (let q = 0; q < Math.max(1, it.cantidad); q++) {
      const prendas = it.prendas.length ? it.prendas : [];
      if (prendas.length === 0 && it.bordadoTexto) {
        // adicional de bordado (ej: bordado extra)
        const t = tallerDe("BORDADO");
        if (t) deseadas.push({ clave: `${it.orden}.${q}-x-BORDADO`, tallerId: t.id, paso: 1, prenda: it.nombre, color: null, talle: null, bordado: bordadoTxt, detalle: it.persona ? `Para ${it.persona}` : null });
        continue;
      }
      prendas.forEach((pr, k) => {
        const tipo = tipoPrenda(pr.nombre);
        // en los boxes con bata, el pijama/camisolín va sin bordar (salvo que la ubicación lo diga)
        const esPijama = tipo === "ROPA" && !/bata/i.test(pr.nombre);
        const bordada = !!it.bordadoTexto && pr.bordada &&
          (!esPijama || !hayBata || /pijama|camis/i.test(`${it.bordadoUbicacion ?? ""} ${it.bordadoTexto ?? ""}`));
        pasosDe(tipo, bordada).forEach((paso, n) => {
          const t = tallerDe(paso.funcion);
          if (!t) return;
          deseadas.push({
            clave: `${it.orden}.${q}-${k}-${paso.funcion}`, tallerId: t.id, paso: n + 1,
            prenda: pr.nombre, color: pr.color, talle: pr.talle,
            bordado: paso.funcion === "BORDADO" ? bordadoTxt : null,
            detalle: [paso.detalle, it.persona ? `Para ${it.persona}` : null, it.notas && paso.funcion !== "BORDADO" ? it.notas.split("\n")[0] : null].filter(Boolean).join(" · ") || null,
          });
        });
      });
    }
  }

  const claves = new Set(deseadas.map((d) => d.clave));
  await db.$transaction([
    db.tarea.deleteMany({ where: { pedidoId, clave: { notIn: [...claves] } } }),
    ...deseadas.map((d) =>
      db.tarea.upsert({
        where: { pedidoId_clave: { pedidoId, clave: d.clave } },
        update: { tallerId: d.tallerId, paso: d.paso, prenda: d.prenda, color: d.color, talle: d.talle, bordado: d.bordado, detalle: d.detalle },
        create: { pedidoId, ...d },
      }),
    ),
  ]);
}

// Mueve el estado del pedido según cómo vienen las tareas
export async function actualizarEstadoPorTareas(pedidoId: string, usuarioId: string | null) {
  const p = await db.pedido.findUnique({ where: { id: pedidoId }, include: { tareas: true } });
  if (!p || p.tareas.length === 0) return null;
  const hechas = p.tareas.filter((t) => t.terminada).length;
  let nuevo: "EN_PRODUCCION" | "LISTO" | null = null;
  if (hechas === p.tareas.length && (p.estado === "NUEVO" || p.estado === "EN_PRODUCCION")) nuevo = "LISTO";
  else if (hechas > 0 && hechas < p.tareas.length && (p.estado === "NUEVO" || p.estado === "LISTO")) nuevo = "EN_PRODUCCION";
  if (nuevo) {
    await db.pedido.update({ where: { id: pedidoId }, data: { estado: nuevo, modificadoPorId: usuarioId } });
    await db.registro.create({
      data: { usuarioId, accion: "Cambió estado (automático)", entidad: "Pedido", entidadId: pedidoId, detalle: `N° ${p.numero} · ${nuevo === "LISTO" ? "todas las tareas terminadas → Listo" : "→ En producción"}` },
    });
  }
  return nuevo;
}

// ¿Esta tarea ya se puede hacer? (los pasos anteriores de la misma prenda están terminados)
export function bloqueadaPor<T extends { clave: string; paso: number; terminada: boolean; taller?: { nombre: string } | null }>(t: T, todas: T[]) {
  const base = t.clave.split("-").slice(0, 2).join("-");
  const previa = todas.filter((x) => x.clave.split("-").slice(0, 2).join("-") === base && x.paso < t.paso && !x.terminada);
  return previa.length ? previa[previa.length - 1] : null;
}
