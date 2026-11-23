import "server-only";
import { db } from "./db";
import { bultosDePedido } from "./cotizador";
import { datosEnvio } from "./envios";

// ─────────────────────────────────────────────────────────────────────────────
// Correo Argentino · API Paq.ar 2.0 (alta de envíos, rótulo oficial, cancelación)
// Credenciales (se gestionan con el área Comercial de Correo Argentino) en Netlify:
//   PAQAR_API_KEY, PAQAR_AGREEMENT, PAQAR_SERVICE_TYPE (por defecto "CP"), PAQAR_URL (opcional)
// ─────────────────────────────────────────────────────────────────────────────

const URL_PROD = "https://api.correoargentino.com.ar/paqar/v1";

export function paqarConfigurado() {
  return !!(process.env.PAQAR_API_KEY && process.env.PAQAR_AGREEMENT);
}

function cabeceras() {
  return { Authorization: `Apikey ${process.env.PAQAR_API_KEY}`, agreement: String(process.env.PAQAR_AGREEMENT), "Content-Type": "application/json" };
}
const base = () => (process.env.PAQAR_URL ?? URL_PROD).replace(/\/$/, "");

// Códigos de provincia de Correo Argentino
const PROVINCIAS: [RegExp, string][] = [
  [/caba|capital federal|ciudad aut|c\.?a\.?b\.?a/, "C"],
  [/salta/, "A"], [/buenos aires|bs\.? ?as|pba|provincia de bs/, "B"], [/san luis/, "D"], [/entre r/, "E"],
  [/la rioja/, "F"], [/santiago del estero/, "G"], [/chaco/, "H"], [/san juan/, "J"], [/catamarca/, "K"],
  [/la pampa/, "L"], [/mendoza/, "M"], [/misiones/, "N"], [/formosa/, "P"], [/neuqu/, "Q"], [/r[ií]o negro/, "R"],
  [/santa fe/, "S"], [/tucum/, "T"], [/chubut/, "U"], [/tierra del fuego/, "V"], [/corrientes/, "W"],
  [/c[oó]rdoba/, "X"], [/jujuy/, "Y"], [/santa cruz/, "Z"],
];
export function codigoProvincia(texto: string | null | undefined): string | null {
  const t = (texto ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  for (const [re, c] of PROVINCIAS) if (re.test(t)) return c;
  return null;
}

// "Av. Cabildo 1234 piso 3 depto B" → calle, altura, piso, depto
export function partirDireccion(dir: string | null | undefined) {
  const s = (dir ?? "").replace(/\s+/g, " ").trim();
  // "Calle 509 N° 2170" / "Calle 12 nro 345": la altura es la que sigue a N° / nro / número
  const conNro = s.match(/^(.*?)\s*(?:N[°ºo]\.?|nro\.?|n[uú]mero)\s*(\d{1,6})\b(.*)$/i);
  const m = conNro ?? s.match(/^(.*?\D)\s*(\d{1,6})\b(.*)$/);
  if (!m) return null;
  const resto = m[3];
  const pegado = resto.match(/^\s*(\d{1,2})\s*([A-Za-z])\b/); // "9A" → piso 9, depto A
  const piso = resto.match(/(?:piso|p\.)\s*(\w+)/i)?.[1] ?? resto.match(/\b(\d{1,2})\s*[°º]/)?.[1] ?? pegado?.[1] ?? "";
  const depto = resto.match(/(?:depto|dpto|dto|departamento|dep\.)\s*(\w+)/i)?.[1] ?? pegado?.[2]?.toUpperCase() ?? "";
  return { calle: m[1].replace(/[,\s]+$/, "").trim(), altura: m[2], piso, depto };
}

const telefonoPartido = (tel: string | null) => {
  const d = (tel ?? "").replace(/\D/g, "").replace(/^54/, "").replace(/^9/, "");
  return d.length >= 8 ? { area: d.slice(0, d.length - 8), numero: d.slice(-8) } : { area: "", numero: d };
};

async function remitente() {
  const filas = await db.configuracion.findMany({ where: { clave: { startsWith: "remitente_" } } });
  const v = Object.fromEntries(filas.map((f) => [f.clave.replace("remitente_", ""), f.valor]));
  const cp = (await db.configuracion.findUnique({ where: { clave: "cp_origen" } }))?.valor ?? "";
  return { nombre: v.nombre ?? "Micaela Diseño", calle: v.calle ?? "", altura: v.altura ?? "", localidad: v.localidad ?? "", provincia: v.provincia ?? "Buenos Aires", telefono: v.telefono ?? "", email: v.email ?? "", cp };
}

export async function faltantesPaqar(pedidoId: string) {
  const p = await db.pedido.findUniqueOrThrow({ where: { id: pedidoId }, include: { cliente: true } });
  const d = datosEnvio(p);
  const r = await remitente();
  const falta: string[] = [];
  if (!r.calle || !r.altura || !r.localidad || !r.cp) falta.push("datos del remitente (Envíos → Configuración)");
  if (!partirDireccion(d.direccion)) falta.push("calle y altura de la clienta");
  if (!d.localidad) falta.push("localidad");
  if (!codigoProvincia(d.provincia)) falta.push("provincia");
  if (!d.codigoPostal) falta.push("código postal");
  return falta;
}

// Da de alta el envío en Correo Argentino y devuelve el número de seguimiento
export async function crearEnvioPaqar(pedidoId: string) {
  if (!paqarConfigurado()) throw new Error("Falta conectar Paq.ar (acuerdo y API-Key).");
  const falta = await faltantesPaqar(pedidoId);
  if (falta.length) throw new Error(`Falta: ${falta.join(", ")}.`);
  const p = await db.pedido.findUniqueOrThrow({ where: { id: pedidoId }, include: { cliente: true } });
  const d = datosEnvio(p);
  const dir = partirDireccion(d.direccion)!;
  const r = await remitente();
  const rdir = { calle: r.calle, altura: r.altura };
  const tel = telefonoPartido(d.telefono);
  const rtel = telefonoPartido(r.telefono);

  // Paq.ar toma un solo paquete por orden: peso total y la caja más grande
  const bultos = await bultosDePedido(pedidoId);
  const gramos = Math.min(99999, bultos.reduce((s, b) => s + b.gramos, 0) || 1000);
  const caja = bultos.reduce((m, b) => (b.alto * b.ancho * b.largo > m.alto * m.ancho * m.largo ? b : m), bultos[0] ?? { alto: 7, ancho: 22, largo: 33, valor: 0, gramos, nombre: "" });
  const valor = Math.max(1, Math.round(p.total || bultos.reduce((s, b) => s + b.valor, 0)));
  const fecha = new Date(p.fechaPedido.getTime() - 3 * 3600e3).toISOString().slice(0, 19) + "-03:00";

  const cuerpo = {
    sellerId: String(process.env.PAQAR_AGREEMENT),
    order: {
      senderData: {
        businessName: r.nombre, name: r.nombre, areaCodeCellphone: rtel.area, cellphoneNumber: rtel.numero, email: r.email,
        address: { streetName: rdir.calle, streetNumber: rdir.altura, cityName: r.localidad, floor: "", department: "", state: codigoProvincia(r.provincia) ?? "B", zipCode: r.cp },
      },
      shippingData: {
        name: d.nombre, areaCodeCellphone: tel.area, cellphoneNumber: tel.numero, email: p.cliente.email ?? "",
        observation: d.entreCalles ? `Entre calles: ${d.entreCalles}` : "",
        address: { streetName: dir.calle, streetNumber: dir.altura, cityName: d.localidad, floor: dir.piso, department: dir.depto, state: codigoProvincia(d.provincia), zipCode: (d.codigoPostal ?? "").replace(/\D/g, "") },
      },
      parcels: [{
        dimensions: { height: String(Math.ceil(caja.alto)), width: String(Math.ceil(caja.ancho)), depth: String(Math.ceil(caja.largo)) },
        productWeight: String(gramos), productCategory: "Indumentaria", declaredValue: String(valor),
      }],
      deliveryType: "homeDelivery",
      agencyId: "",
      saleDate: fecha,
      serviceType: process.env.PAQAR_SERVICE_TYPE ?? "CP",
      shipmentClientId: `MD-${p.numero}`,
    },
  };
  const res = await fetch(`${base()}/orders`, { method: "POST", headers: cabeceras(), body: JSON.stringify(cuerpo), cache: "no-store" });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Correo Argentino rechazó el envío (${res.status}${datos?.message ? `: ${datos.message}` : ""}).`);
  const tn = datos?.trackingNumber ?? datos?.order?.trackingNumber ?? datos?.data?.trackingNumber;
  if (!tn) throw new Error("Correo Argentino no devolvió el número de seguimiento.");
  return String(tn);
}

// Rótulo oficial (PDF 10×15) de un envío ya generado
export async function rotuloPaqar(trackingNumber: string) {
  const res = await fetch(`${base()}/labels?labelFormat=10x15`, {
    method: "POST", headers: cabeceras(), body: JSON.stringify([{ sellerId: String(process.env.PAQAR_AGREEMENT), trackingNumber }]), cache: "no-store",
  });
  const datos = await res.json().catch(() => null);
  const r = Array.isArray(datos) ? datos[0] : null;
  if (!res.ok || !r?.fileBase64 || String(r.result ?? "OK").startsWith("ERROR")) throw new Error(r?.result ?? `No se pudo obtener el rótulo (${res.status}).`);
  return { pdf: Buffer.from(r.fileBase64, "base64"), nombre: String(r.fileName ?? r.filename ?? `rotulo-${trackingNumber}.pdf`) };
}

export async function cancelarEnvioPaqar(trackingNumber: string) {
  const res = await fetch(`${base()}/orders/${encodeURIComponent(trackingNumber)}/cancel`, { method: "PATCH", headers: cabeceras(), cache: "no-store" });
  if (!res.ok) throw new Error(`Correo Argentino no pudo cancelar el envío (${res.status}).`);
}
