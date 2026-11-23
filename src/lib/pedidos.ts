import { fecha, pesos } from "./formato";

export const ESTADOS = ["NUEVO", "EN_PRODUCCION", "LISTO", "ENTREGADO", "CANCELADO"] as const;
export type Estado = (typeof ESTADOS)[number];

export const NOMBRE_ESTADO: Record<string, string> = {
  NUEVO: "Nuevo",
  EN_PRODUCCION: "En producción",
  LISTO: "Listo",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export const COLOR_ESTADO: Record<string, string> = {
  NUEVO: "bg-estado-nuevo text-estado-nuevo-txt",
  EN_PRODUCCION: "bg-estado-produccion text-estado-produccion-txt",
  LISTO: "bg-estado-listo text-estado-listo-txt",
  ENTREGADO: "bg-estado-entregado text-estado-entregado-txt",
  CANCELADO: "bg-white text-texto-2 border border-borde line-through",
};

export const NOMBRE_TIPO_PEDIDO: Record<string, string> = {
  INDIVIDUAL: "Individual",
  BOX: "Box de regalo",
  EVENTO: "Evento / grupal",
};

export const MEDIOS = ["TRANSFERENCIA", "EFECTIVO", "TARJETA", "MERCADO_PAGO", "OTRO"] as const;
export const NOMBRE_MEDIO: Record<string, string> = {
  TRANSFERENCIA: "Transferencia",
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  MERCADO_PAGO: "Mercado Pago",
  OTRO: "Otro",
};

export const EVENTOS = ["XV", "Boda", "Despedida", "Cumpleaños", "Regalo", "Otro"];
export const FORMAS_ENVIO = ["Correo Argentino", "Motomensajería", "Andreani", "Retira", "Otro"];
export const UBICACIONES = ["Espalda", "Adelante", "Lado del corazón", "Pantuflas", "Antifaz"];
export const HILOS = ["Dorado", "Plateado", "Blanco", "Negro", "Otro"];

type PagoLike = { monto: number };
export function pagado(pagos: PagoLike[]) {
  return pagos.reduce((s, p) => s + p.monto, 0);
}
export function saldo(total: number, pagos: PagoLike[]) {
  return Math.max(0, total - pagado(pagos));
}

// ¿Está atrasado? (fecha de entrega pasada y todavía no entregado/cancelado)
export function atrasado(p: { estado: string; fechaEntrega: Date | null }) {
  if (!p.fechaEntrega || p.estado === "ENTREGADO" || p.estado === "CANCELADO") return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return p.fechaEntrega < hoy;
}

type ItemTexto = {
  nombre: string; cantidad: number; persona: string | null; bordadoTexto: string | null;
  bordadoUbicacion: string | null; hilo: string | null;
  prendas: { nombre: string; color: string | null; talle: string | null }[];
};

export function detalleItem(i: ItemTexto, conViñeta = true): string {
  const lineas: string[] = [];
  const cab = `${conViñeta ? "• " : ""}${i.cantidad > 1 ? `${i.cantidad} × ` : ""}${i.nombre}${i.persona ? ` (${i.persona})` : ""}`;
  lineas.push(cab);
  for (const p of i.prendas) {
    const partes = [p.color, p.talle ? `talle ${p.talle}` : null].filter(Boolean).join(", ");
    lineas.push(`   – ${p.nombre}${partes ? `: ${partes}` : ""}`);
  }
  if (i.bordadoTexto) {
    const extra = [i.bordadoUbicacion, i.hilo ? `hilo ${i.hilo.toLowerCase()}` : null].filter(Boolean).join(", ");
    lineas.push(`   – Bordado: "${i.bordadoTexto}"${extra ? ` (${extra})` : ""}`);
  }
  return lineas.join("\n");
}

type PedidoTexto = {
  numero: number; total: number; fechaEvento: Date | null; fechaEntrega: Date | null;
  envio: boolean; formaEnvio: string | null; direccionEnvio: string | null; localidad: string | null;
  cliente: { nombre: string };
  items: ItemTexto[];
  pagos: PagoLike[];
};

export function textoEntrega(p: Pick<PedidoTexto, "envio" | "formaEnvio" | "direccionEnvio" | "localidad" | "fechaEntrega">) {
  const como = p.envio ? (p.formaEnvio || "Envío") : "Retira";
  const donde = [p.direccionEnvio, p.localidad].filter(Boolean).join(", ");
  const cuando = p.fechaEntrega ? ` · ${fecha(p.fechaEntrega)}` : "";
  return `${como}${donde ? ` a ${donde}` : ""}${cuando}`;
}

// Reemplaza {variables} de las plantillas de WhatsApp con los datos del pedido
export function armarMensaje(plantilla: string, p: PedidoTexto, extra: Record<string, string> = {}) {
  const sal = saldo(p.total, p.pagos);
  const vars: Record<string, string> = {
    nombre: p.cliente.nombre.split(" ")[0],
    nombre_completo: p.cliente.nombre,
    pedido: String(p.numero),
    detalle: p.items.map((i) => detalleItem(i)).join("\n"),
    total: pesos(p.total),
    pagado: pesos(pagado(p.pagos)),
    saldo: pesos(sal),
    saldo_texto: sal > 0 ? `Recordá que queda un saldo de ${pesos(sal)}. ` : "",
    fecha_evento: p.fechaEvento ? fecha(p.fechaEvento) : "a confirmar",
    fecha_entrega: p.fechaEntrega ? fecha(p.fechaEntrega) : "a confirmar",
    entrega: textoEntrega(p),
    link_pago: "",
    ...extra,
  };
  return plantilla
    .replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const VARIABLES_PLANTILLA: { clave: string; texto: string }[] = [
  { clave: "{nombre}", texto: "Nombre de la clienta" },
  { clave: "{nombre_completo}", texto: "Nombre y apellido" },
  { clave: "{pedido}", texto: "Número de pedido" },
  { clave: "{detalle}", texto: "Lista de productos con color, talle y bordado" },
  { clave: "{total}", texto: "Total del pedido" },
  { clave: "{pagado}", texto: "Lo que ya pagó" },
  { clave: "{saldo}", texto: "Saldo pendiente" },
  { clave: "{saldo_texto}", texto: "Frase de saldo (vacía si no debe nada)" },
  { clave: "{fecha_evento}", texto: "Fecha del evento" },
  { clave: "{fecha_entrega}", texto: "Fecha de entrega" },
  { clave: "{entrega}", texto: "Cómo y dónde se entrega" },
  { clave: "{link_pago}", texto: "Link de Mercado Pago (Etapa 3)" },
  { clave: "{taller}", texto: "Nombre del taller (solo mensaje de taller)" },
  { clave: "{semana}", texto: "Semana (solo mensaje de taller)" },
  { clave: "{trabajos}", texto: "Lista de trabajos (solo mensaje de taller)" },
];

// Para convertir "2026-12-06" (input date) en fecha a mediodía (evita corrimientos de zona horaria)
export function leerFecha(v: FormDataEntryValue | string | null | undefined): Date | null {
  const s = String(v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return new Date(`${s}T12:00:00-03:00`);
}
export function fechaInput(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}
