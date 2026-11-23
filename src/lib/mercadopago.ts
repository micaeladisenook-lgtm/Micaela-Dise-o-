import "server-only";

// Genera un link de pago de Mercado Pago (Checkout Pro).
// Necesita la variable MP_ACCESS_TOKEN (la "Access Token" de producción de tu cuenta de Mercado Pago).
export function mercadoPagoConfigurado() {
  return !!process.env.MP_ACCESS_TOKEN;
}

export async function crearLinkMercadoPago(opts: { titulo: string; monto: number; referencia: string; email?: string | null }) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("Mercado Pago todavía no está configurado.");
  const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ title: opts.titulo, quantity: 1, unit_price: opts.monto, currency_id: "ARS" }],
      external_reference: opts.referencia,
      statement_descriptor: "MICAELA DISENO",
      ...(process.env.APP_URL ? { notification_url: `${process.env.APP_URL.replace(/\/$/, "")}/api/mercadopago/webhook` } : {}),
      ...(opts.email ? { payer: { email: opts.email } } : {}),
    }),
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok || !datos.init_point) {
    throw new Error(`Mercado Pago no pudo crear el link (${r.status}${datos?.message ? `: ${datos.message}` : ""}).`);
  }
  return datos.init_point as string;
}
