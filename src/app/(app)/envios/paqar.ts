"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirPermiso } from "@/lib/acceso";
import { registrar } from "@/lib/registro";
import { crearEnvioPaqar } from "@/lib/paqar";

export async function generarEnvioCorreo(pedidoId: string): Promise<{ ok?: string; error?: string }> {
  const u = await exigirPermiso("gestionar_envios");
  try {
    const tn = await crearEnvioPaqar(pedidoId);
    const p = await db.pedido.update({
      where: { id: pedidoId },
      data: { numeroSeguimiento: tn, formaEnvio: "Correo Argentino", envio: true, modificadoPorId: u.id },
    });
    await registrar(u.id, "Generó envío en Correo Argentino", "Pedido", pedidoId, `N° ${p.numero} · seguimiento ${tn}`);
    revalidatePath("/envios");
    revalidatePath(`/pedidos/${pedidoId}`);
    return { ok: `Envío generado. N° de seguimiento: ${tn}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const CAMPOS = ["nombre", "calle", "altura", "localidad", "provincia", "telefono", "email"] as const;

export async function guardarRemitente(_prev: { ok?: string; error?: string } | null, f: FormData) {
  const u = await exigirPermiso("configurar_envios");
  for (const c of CAMPOS) {
    const valor = String(f.get(c) ?? "").trim();
    await db.configuracion.upsert({ where: { clave: `remitente_${c}` }, update: { valor }, create: { clave: `remitente_${c}`, valor } });
  }
  await registrar(u.id, "Actualizó datos del remitente", "Sistema");
  revalidatePath("/envios");
  return { ok: "Datos del remitente guardados." };
}
