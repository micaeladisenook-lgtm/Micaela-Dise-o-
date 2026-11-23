"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirPermiso } from "@/lib/acceso";
import { registrar } from "@/lib/registro";
import { leerPesos, pesos } from "@/lib/formato";

type Estado = { ok?: string; error?: string } | null;
const t = (f: FormData, k: string) => String(f.get(k) ?? "").trim() || null;

export async function guardarDatosEnvio(pedidoId: string, _prev: Estado, f: FormData): Promise<Estado> {
  const u = await exigirPermiso("crear_pedidos");
  const p = await db.pedido.update({
    where: { id: pedidoId },
    data: {
      formaEnvio: t(f, "formaEnvio"), direccionEnvio: t(f, "direccion"), entreCalles: t(f, "entreCalles"),
      localidad: t(f, "localidad"), provincia: t(f, "provincia"), codigoPostal: t(f, "codigoPostal"),
      modificadoPorId: u.id,
    },
  });
  // la ficha de la clienta también se completa
  const c = await db.cliente.findUniqueOrThrow({ where: { id: p.clienteId } });
  await db.cliente.update({
    where: { id: c.id },
    data: {
      dni: t(f, "dni")?.replace(/\D/g, "") || c.dni,
      telefono: t(f, "telefono") || c.telefono,
      direccion: c.direccion || p.direccionEnvio, entreCalles: c.entreCalles || p.entreCalles,
      localidad: c.localidad || p.localidad, provincia: c.provincia || p.provincia, codigoPostal: c.codigoPostal || p.codigoPostal,
    },
  });
  await registrar(u.id, "Editó datos de envío", "Pedido", pedidoId, `N° ${p.numero}`);
  revalidatePath("/envios");
  return { ok: "Datos guardados." };
}

export async function marcarDespachado(pedidoId: string, _prev: Estado, f: FormData): Promise<Estado> {
  const u = await exigirPermiso("crear_pedidos");
  const costo = leerPesos(String(f.get("costoEnvio") ?? ""));
  const p = await db.pedido.update({
    where: { id: pedidoId },
    data: { despachadoEn: new Date(), numeroSeguimiento: t(f, "seguimiento"), costoEnvio: costo, estado: "ENTREGADO", modificadoPorId: u.id },
  });
  await registrar(u.id, "Despachó pedido", "Pedido", pedidoId, `N° ${p.numero}${p.numeroSeguimiento ? ` · seguimiento ${p.numeroSeguimiento}` : ""}${costo ? ` · envío ${pesos(costo)}` : ""}`);
  revalidatePath("/envios");
  revalidatePath("/pedidos");
  return { ok: "¡Despachado!" };
}

export async function deshacerDespacho(pedidoId: string) {
  const u = await exigirPermiso("crear_pedidos");
  const p = await db.pedido.update({ where: { id: pedidoId }, data: { despachadoEn: null, estado: "LISTO", modificadoPorId: u.id } });
  await registrar(u.id, "Deshizo despacho", "Pedido", pedidoId, `N° ${p.numero}`);
  revalidatePath("/envios");
}
