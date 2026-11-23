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

// La fecha que guía la producción: la del evento (si no hay, la de entrega)
export function fechaGuia(p: { fechaEvento: Date | null; fechaEntrega: Date | null }) {
  return p.fechaEvento ?? p.fechaEntrega;
}

// Fecha de hoy en Buenos Aires, a mediodía
export function hoyAR() {
  const s = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  return new Date(`${s}T12:00:00-03:00`);
}

// Semana de lunes a domingo que contiene la fecha (desplazada n semanas)
export function semana(base: Date = hoyAR(), n = 0) {
  const d = new Date(base);
  const diaSemana = new Date(d.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })).getDay(); // 0 = domingo
  const desdeLunes = (diaSemana + 6) % 7;
  const lunes = new Date(d.getTime() - desdeLunes * 864e5 + n * 7 * 864e5);
  const s = lunes.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  const inicio = new Date(`${s}T00:00:00-03:00`);
  const fin = new Date(inicio.getTime() + 7 * 864e5 - 1);
  return { inicio, fin };
}

export function enSemana(d: Date | null, sem: { inicio: Date; fin: Date }) {
  return !!d && d >= sem.inicio && d <= sem.fin;
}

// ¿Está atrasado? (la fecha guía ya pasó y todavía no se entregó ni canceló)
export function atrasado(p: { estado: string; fechaEntrega: Date | null; fechaEvento?: Date | null }) {
  const guia = fechaGuia({ fechaEvento: p.fechaEvento ?? null, fechaEntrega: p.fechaEntrega });
  if (!guia || p.estado === "ENTREGADO" || p.estado === "CANCELADO") return false;
  return guia.getTime() < hoyAR().getTime() - 12 * 3600e3; // antes de hoy a las 00:00
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
  linkPago?: string | null;
};

export function textoEntrega(p: Pick<PedidoTexto, "envio" | "formaEnvio" | "direccionEnvio" | "localidad" | "fechaEntrega"> & { entreCalles?: string | null; provincia?: string | null; codigoPostal?: string | null }) {
  const como = p.envio ? (p.formaEnvio || "Envío") : "Retira";
  const donde = [p.direccionEnvio, p.entreCalles ? `entre ${p.entreCalles.replace(/^entre\s+/i, "")}` : null, p.localidad, p.provincia, p.codigoPostal ? `CP ${p.codigoPostal}` : null].filter(Boolean).join(", ");
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
    link_pago: p.linkPago ? `💳 Podés pagar con Mercado Pago acá: ${p.linkPago}` : "",
    link_resumen: "",
    ...extra,
  };
  return plantilla
    .replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Si la plantilla no menciona el link del resumen, se agrega al final
export function conLinkResumen(plantilla: string) {
  return plantilla.includes("{link_resumen}") ? plantilla : `${plantilla.trim()}\n\n📄 Resumen de tu compra (para ver o descargar en PDF): {link_resumen}`;
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
  { clave: "{link_pago}", texto: "Link de Mercado Pago" },
  { clave: "{link_resumen}", texto: "Link al resumen de compra (se descarga en PDF)" },
  { clave: "{link_completar}", texto: "Link para que la clienta complete colores, talles, bordado y envío" },
  { clave: "{forma_envio}", texto: "Forma de envío (solo aviso de envío)" },
  { clave: "{seguimiento}", texto: "N° de seguimiento (solo aviso de envío)" },
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
