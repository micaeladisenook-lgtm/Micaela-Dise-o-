"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirPermiso, requerirPermiso } from "@/lib/acceso";
import { requerirAdmin } from "@/lib/auth";
import { registrar } from "@/lib/registro";
import { cotizarPedido } from "@/lib/cotizador";
import { pesos } from "@/lib/formato";

export async function cotizarEnvio(pedidoId: string, cpDestino: string) {
  await requerirPermiso("ver_pedidos");
  return cotizarPedido(pedidoId, cpDestino);
}

export async function elegirEnvio(pedidoId: string, opcion: { empresa: string; servicio: string; precio: number }, sumarAlTotal: boolean) {
  const u = await exigirPermiso("crear_pedidos");
  if (!opcion.precio || opcion.precio < 0) return { error: "Falta el precio del envío." };
  const forma = `${opcion.empresa}${opcion.servicio && opcion.servicio !== "—" && opcion.servicio !== "Cotización manual" ? ` · ${opcion.servicio}` : ""}`;
  const p = await db.pedido.findUniqueOrThrow({ where: { id: pedidoId }, include: { items: true } });
  await db.$transaction(async (tx) => {
    // se reemplaza un envío cargado antes (si lo había)
    const previo = p.items.find((i) => !i.productoId && i.nombre.startsWith("Envío "));
    if (previo) await tx.pedidoItem.delete({ where: { id: previo.id } });
    if (sumarAlTotal) {
      await tx.pedidoItem.create({ data: { pedidoId, nombre: `Envío ${forma}`, precioUnitario: opcion.precio, cantidad: 1, orden: 999 } });
    }
    const items = await tx.pedidoItem.findMany({ where: { pedidoId } });
    const total = items.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0);
    await tx.pedido.update({ where: { id: pedidoId }, data: { formaEnvio: forma, costoEnvio: opcion.precio, envio: true, total, modificadoPorId: u.id } });
  });
  await registrar(u.id, "Eligió envío", "Pedido", pedidoId, `N° ${p.numero} · ${forma} · ${pesos(opcion.precio)}${sumarAlTotal ? " (sumado al total)" : ""}`);
  revalidatePath("/envios");
  revalidatePath(`/pedidos/${pedidoId}`);
  return { ok: `Envío elegido: ${forma} · ${pesos(opcion.precio)}${sumarAlTotal ? " (sumado al total del pedido)" : ""}.` };
}

export async function guardarCpOrigen(_prev: { ok?: string; error?: string } | null, f: FormData) {
  const u = await requerirAdmin();
  const cp = String(f.get("cp") ?? "").replace(/\D/g, "");
  if (cp.length < 4) return { error: "Escribí un código postal válido." };
  await db.configuracion.upsert({ where: { clave: "cp_origen" }, update: { valor: cp }, create: { clave: "cp_origen", valor: cp } });
  await registrar(u.id, "Cambió el código postal de origen", "Sistema", null, cp);
  revalidatePath("/envios");
  return { ok: "Guardado." };
}
