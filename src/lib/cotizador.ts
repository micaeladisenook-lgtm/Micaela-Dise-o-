import "server-only";
import { db } from "./db";

// ─────────────────────────────────────────────────────────────────────────────
// Cotizador de envíos: Correo Argentino (MiCorreo), Andreani y Vía Cargo.
// Las credenciales se cargan como variables en Netlify (nunca en el código):
//   Correo Argentino: CORREO_AR_USUARIO, CORREO_AR_CLAVE, CORREO_AR_CUSTOMER_ID
//   Andreani:         ANDREANI_USUARIO, ANDREANI_CLAVE, ANDREANI_CONTRATO_DOMICILIO,
//                     ANDREANI_CONTRATO_SUCURSAL (opcional), ANDREANI_CLIENTE
//   Vía Cargo:        no publica API → cotización manual desde su web.
// ─────────────────────────────────────────────────────────────────────────────

export type Bulto = { gramos: number; alto: number; ancho: number; largo: number; valor: number; nombre: string };
export type Opcion = {
  empresa: "Correo Argentino" | "Andreani" | "Vía Cargo";
  servicio: string;
  precio: number | null;
  plazo: string | null;
  aviso?: string; // no configurado, error, o cotización manual
  linkManual?: string;
};

const PAQUETE_POR_DEFECTO = { gramos: 1000, alto: 7, ancho: 22, largo: 33 };

export async function cpOrigen() {
  return (await db.configuracion.findUnique({ where: { clave: "cp_origen" } }))?.valor ?? null;
}

// Un bulto por cada producto del pedido (multiplicado por la cantidad)
export async function bultosDePedido(pedidoId: string): Promise<Bulto[]> {
  const p = await db.pedido.findUniqueOrThrow({
    where: { id: pedidoId },
    include: { items: { include: { producto: true } } },
  });
  const bultos: Bulto[] = [];
  for (const it of p.items) {
    const pr = it.producto;
    if (pr?.tipo === "ADICIONAL") continue;
    const base = pr?.pesoGramos
      ? { gramos: pr.pesoGramos, alto: pr.altoCm ?? 7, ancho: pr.anchoCm ?? 22, largo: pr.largoCm ?? 33 }
      : PAQUETE_POR_DEFECTO;
    for (let i = 0; i < Math.max(1, it.cantidad); i++) bultos.push({ ...base, valor: it.precioUnitario, nombre: it.nombre });
  }
  return bultos;
}

const sinConfigurar = (empresa: Opcion["empresa"], que: string): Opcion => ({
  empresa, servicio: "—", precio: null, plazo: null, aviso: `Falta conectar ${que}.`,
});

// ── Correo Argentino (API MiCorreo) ─────────────────────────────────────────
async function correoArgentino(origen: string, destino: string, bultos: Bulto[]): Promise<Opcion[]> {
  const usuario = process.env.CORREO_AR_USUARIO, clave = process.env.CORREO_AR_CLAVE, cliente = process.env.CORREO_AR_CUSTOMER_ID;
  if (!usuario || !clave || !cliente) return [sinConfigurar("Correo Argentino", "la cuenta MiCorreo")];
  const base = process.env.CORREO_AR_URL ?? "https://api.correoargentino.com.ar/micorreo/v1";
  try {
    const t = await fetch(`${base}/token`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${usuario}:${clave}`).toString("base64")}` }, cache: "no-store" });
    if (!t.ok) throw new Error(`no se pudo iniciar sesión (${t.status})`);
    const { token } = await t.json();
    // se cotiza cada bulto y se suman (domicilio "D" y sucursal "S")
    const totales = new Map<string, { precio: number; plazo: string | null; servicio: string }>();
    for (const b of bultos) {
      const r = await fetch(`${base}/rates`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: cliente, postalCodeOrigin: origen, postalCodeDestination: destino,
          dimensions: { weight: b.gramos, height: Math.ceil(b.alto), width: Math.ceil(b.ancho), length: Math.ceil(b.largo) },
        }),
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`no devolvió tarifas (${r.status})`);
      const d = await r.json();
      for (const rate of d.rates ?? []) {
        const clave = String(rate.deliveredType ?? rate.productType ?? rate.productName);
        const ant = totales.get(clave);
        const plazo = rate.deliveryTimeMin && rate.deliveryTimeMax ? `${rate.deliveryTimeMin} a ${rate.deliveryTimeMax} días hábiles` : null;
        const servicio = rate.deliveredType === "S" ? "A sucursal" : rate.deliveredType === "D" ? "A domicilio" : String(rate.productName ?? "Envío");
        totales.set(clave, { precio: (ant?.precio ?? 0) + Number(rate.price || 0), plazo: plazo ?? ant?.plazo ?? null, servicio });
      }
    }
    if (!totales.size) return [{ empresa: "Correo Argentino", servicio: "—", precio: null, plazo: null, aviso: "No ofrece envío a ese código postal." }];
    return [...totales.values()].map((v) => ({ empresa: "Correo Argentino" as const, servicio: v.servicio, precio: Math.round(v.precio), plazo: v.plazo }));
  } catch (e) {
    return [{ empresa: "Correo Argentino", servicio: "—", precio: null, plazo: null, aviso: `Error de Correo Argentino: ${(e as Error).message}.` }];
  }
}

// ── Andreani (API de tarifas) ───────────────────────────────────────────────
async function andreani(destino: string, bultos: Bulto[]): Promise<Opcion[]> {
  const usuario = process.env.ANDREANI_USUARIO, clave = process.env.ANDREANI_CLAVE, cliente = process.env.ANDREANI_CLIENTE;
  const contratos = [
    ["A domicilio", process.env.ANDREANI_CONTRATO_DOMICILIO],
    ["A sucursal", process.env.ANDREANI_CONTRATO_SUCURSAL],
  ].filter(([, c]) => c) as [string, string][];
  if (!usuario || !clave || !cliente || !contratos.length) return [sinConfigurar("Andreani", "el contrato de Andreani")];
  const base = process.env.ANDREANI_URL ?? "https://apis.andreani.com";
  try {
    const login = await fetch(`${base}/login`, { headers: { Authorization: `Basic ${Buffer.from(`${usuario}:${clave}`).toString("base64")}` }, cache: "no-store" });
    const token = login.headers.get("x-authorization-token");
    if (!login.ok || !token) throw new Error(`no se pudo iniciar sesión (${login.status})`);
    const salida: Opcion[] = [];
    for (const [servicio, contrato] of contratos) {
      const q = new URLSearchParams({ cpDestino: destino, contrato, cliente });
      bultos.forEach((b, i) => {
        q.set(`bultos[${i}][kilos]`, String(b.gramos / 1000));
        q.set(`bultos[${i}][volumen]`, String(Math.ceil(b.alto * b.ancho * b.largo)));
        q.set(`bultos[${i}][valorDeclarado]`, String(Math.max(1, b.valor)));
      });
      const r = await fetch(`${base}/v1/tarifas?${q}`, { headers: { "x-authorization-token": token }, cache: "no-store" });
      if (!r.ok) { salida.push({ empresa: "Andreani", servicio, precio: null, plazo: null, aviso: `Andreani no cotizó (${r.status}).` }); continue; }
      const d = await r.json();
      const total = Number(d?.tarifaConIva?.total ?? d?.tarifaSinIva?.total ?? NaN);
      salida.push({ empresa: "Andreani", servicio, precio: Number.isFinite(total) ? Math.round(total) : null, plazo: null });
    }
    return salida;
  } catch (e) {
    return [{ empresa: "Andreani", servicio: "—", precio: null, plazo: null, aviso: `Error de Andreani: ${(e as Error).message}.` }];
  }
}

// ── Vía Cargo (sin API pública: cotización manual) ──────────────────────────
function viaCargo(): Opcion[] {
  return [{
    empresa: "Vía Cargo", servicio: "Cotización manual", precio: null, plazo: null,
    aviso: "Vía Cargo no tiene cotización automática: cotizá en su web y cargá el precio.",
    linkManual: "https://www.viacargo.com.ar/",
  }];
}

// Qué correos están conectados (sin mostrar ninguna clave)
export function estadoCorreos() {
  const e = process.env;
  const ca = !!(e.CORREO_AR_USUARIO && e.CORREO_AR_CLAVE && e.CORREO_AR_CUSTOMER_ID);
  const an = !!(e.ANDREANI_USUARIO && e.ANDREANI_CLAVE && e.ANDREANI_CLIENTE && (e.ANDREANI_CONTRATO_DOMICILIO || e.ANDREANI_CONTRATO_SUCURSAL));
  return [
    { empresa: "Correo Argentino", ok: ca, nota: ca ? "Conectado (MiCorreo)" : "Falta cargar las credenciales de MiCorreo" },
    { empresa: "Andreani", ok: an, nota: an ? "Conectado (contrato propio)" : "Falta cargar usuario, contrato y cliente" },
    { empresa: "Vía Cargo", ok: false, nota: "Cotización manual (no tiene API pública)" },
    {
      empresa: "Correo Arg. · despacho (Paq.ar)",
      ok: !!(e.PAQAR_API_KEY && e.PAQAR_AGREEMENT),
      nota: e.PAQAR_API_KEY && e.PAQAR_AGREEMENT ? "Conectado: genera envío, rótulo y seguimiento" : "Falta acuerdo comercial y API-Key",
    },
  ];
}

export async function cotizarPedido(pedidoId: string, cpDestino: string) {
  const origen = await cpOrigen();
  const destino = cpDestino.replace(/\D/g, "");
  const bultos = await bultosDePedido(pedidoId);
  if (!origen) return { error: "Falta el código postal de origen (Envíos → Configuración).", bultos, opciones: [] as Opcion[] };
  if (destino.length < 4) return { error: "Falta el código postal de destino de la clienta.", bultos, opciones: [] as Opcion[] };
  if (!bultos.length) return { error: "El pedido no tiene productos para enviar.", bultos, opciones: [] as Opcion[] };
  const [ca, an] = await Promise.all([correoArgentino(origen, destino, bultos), andreani(destino, bultos)]);
  const opciones = [...ca, ...an, ...viaCargo()];
  return { error: null, origen, destino, bultos, opciones };
}
