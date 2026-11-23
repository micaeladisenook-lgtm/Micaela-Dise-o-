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

export type ResumenMP = {
  disponible: number | null;
  aLiberar: number | null;
  total: number | null;
  cobros: { id: string; monto: number; estado: string; fecha: string | null; detalle: string; pedidoId: string | null }[];
  errorSaldo?: string;
};

async function mp(path: string) {
  const r = await fetch(`https://api.mercadopago.com${path}`, { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

// Saldo de la cuenta y últimos cobros
export async function resumenMercadoPago(): Promise<ResumenMP> {
  const cobrosP = mp("/v1/payments/search?sort=date_created&criteria=desc&limit=6")
    .then((d) =>
      (d.results ?? []).map((p: Record<string, unknown>) => ({
        id: String(p.id),
        monto: Math.round(Number(p.transaction_amount) || 0),
        estado: String(p.status ?? ""),
        fecha: (p.date_approved as string) ?? (p.date_created as string) ?? null,
        detalle: String(p.description ?? (p.payer as { email?: string } | undefined)?.email ?? "Pago"),
        pedidoId: (p.external_reference as string) || null,
      })),
    )
    .catch(() => []);
  let disponible: number | null = null;
  let aLiberar: number | null = null;
  let total: number | null = null;
  let errorSaldo: string | undefined;
  try {
    const yo = await mp("/users/me");
    const s = await mp(`/users/${yo.id}/mercadopago_account/balance`);
    disponible = Math.round(Number(s.available_balance) || 0);
    aLiberar = Math.round(Number(s.unavailable_balance) || 0);
    total = Math.round(Number(s.total_amount) || disponible + aLiberar);
  } catch (e) {
    errorSaldo = `Mercado Pago no devolvió el saldo (${(e as Error).message}).`;
  }
  return { disponible, aLiberar, total, cobros: await cobrosP, errorSaldo };
}
