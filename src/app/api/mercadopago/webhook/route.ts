import { db } from "@/lib/db";
import { registrar } from "@/lib/registro";
import { pesos } from "@/lib/formato";

// Mercado Pago avisa acá cuando alguien paga un link. Consultamos el pago a Mercado Pago
// (así no se puede falsificar) y, si está aprobado, lo registramos en el pedido.
export async function POST(req: Request) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return new Response("ok");
  const url = new URL(req.url);
  const cuerpo = await req.json().catch(() => ({}));
  const tipo = cuerpo?.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const id = cuerpo?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");
  if (tipo !== "payment" || !id) return new Response("ok");

  const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(id))}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return new Response("ok");
  const pago = await r.json();
  if (pago.status !== "approved" || !pago.external_reference) return new Response("ok");
  const pedido = await db.pedido.findUnique({ where: { id: String(pago.external_reference) } });
  if (!pedido) return new Response("ok");
  const marca = `Mercado Pago #${pago.id}`;
  if (await db.pago.findFirst({ where: { pedidoId: pedido.id, nota: marca } })) return new Response("ok");
  const monto = Math.round(Number(pago.transaction_amount) || 0);
  await db.pago.create({ data: { pedidoId: pedido.id, monto, medio: "MERCADO_PAGO", nota: marca, fecha: new Date(pago.date_approved ?? Date.now()) } });
  await registrar(null, "Pago recibido por Mercado Pago", "Pedido", pedido.id, `N° ${pedido.numero} · ${pesos(monto)}`);
  return new Response("ok");
}
