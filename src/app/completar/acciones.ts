"use server";
import { db } from "@/lib/db";
import { registrar } from "@/lib/registro";
import { leerFecha } from "@/lib/pedidos";
import { generarTareas } from "@/lib/produccion";
import { aplicarConsumo } from "@/lib/stock";
import { pedidoParaCompletar } from "./datos";
import { guardarImagen, esUrlPropia } from "@/lib/archivos";
import { tipografiaValida } from "@/lib/tipografias";

export type EstadoCompletar = { error?: string; ok?: boolean } | null;
const hayAvisoPedido = async () => !!(await db.plantilla.findUnique({ where: { clave: "aviso_pedido" } }))?.texto.trim();
const t = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const fotosDe = (f: FormData, id: string) => {
  try {
    const v = JSON.parse(String(f.get(`fotos_${id}`) ?? "[]"));
    return Array.isArray(v) ? v.filter((u): u is string => typeof u === "string" && esUrlPropia(u)).slice(0, 6) : [];
  } catch { return []; }
};

// Foto o logo de referencia que sube la clienta desde su link (solo con un link válido y abierto)
export async function subirFotoCompletar(token: string, fd: FormData): Promise<{ url: string } | { error: string }> {
  const datos = await pedidoParaCompletar(token);
  if (!datos || datos.p.datosCompletadosEn || datos.p.estado === "CANCELADO" || datos.p.estado === "ENTREGADO") return { error: "Este link ya no está disponible." };
  const archivo = fd.get("foto");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elegí una foto." };
  try {
    return { url: await guardarImagen(archivo, { permitirSvg: false }) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function completarDatos(token: string, _prev: EstadoCompletar, f: FormData): Promise<EstadoCompletar> {
  const datos = await pedidoParaCompletar(token);
  if (!datos) return { error: "Este link no es válido. Escribinos por WhatsApp." };
  const { p, items } = datos;
  const itemsBase = new Map(p.items.map((i) => [i.id, i.notas]));
  if (p.datosCompletadosEn) return { error: "Ya recibimos tus datos. Si querés cambiar algo, escribinos por WhatsApp." };
  if (p.estado === "CANCELADO" || p.estado === "ENTREGADO") return { error: "Este pedido ya no se puede modificar. Escribinos por WhatsApp." };

  if (await hayAvisoPedido() && f.get("acepto") !== "on") return { error: "Tildá que verificaste talles, colores, bordados, modelos y cantidades." };

  // Prendas: color y talle de cada una
  const prendas: { id: string; color: string; talle: string | null }[] = [];
  for (const it of items) {
    for (const pr of it.prendas) {
      const color = t(f, `color_${pr.id}`, 60);
      const talle = t(f, `talle_${pr.id}`, 30) || null;
      if (!color || (pr.colores.length && !pr.colores.includes(color))) return { error: `Elegí el color de: ${pr.nombre}.` };
      if (pr.talles.length && (!talle || !pr.talles.includes(talle))) return { error: `Elegí el talle de: ${pr.nombre}.` };
      prendas.push({ id: pr.id, color, talle: pr.talles.length ? talle : talle || pr.talle });
    }
  }

  // Envío
  const envio = t(f, "envio") !== "retira";
  if (envio) {
    for (const [k, msj] of [["recibe", "quién lo recibe"], ["dni", "el DNI de quien recibe"], ["direccion", "la calle y el número"], ["localidad", "la localidad"], ["provincia", "la provincia"], ["codigoPostal", "el código postal"]] as const) {
      if (!t(f, k)) return { error: `Para el envío falta ${msj}.` };
    }
  }
  const dni = t(f, "dni").replace(/\D/g, "") || null;
  const direccion = [t(f, "direccion"), t(f, "pisoDepto", 40)].filter(Boolean).join(", ") || null;
  const preferida = t(f, "formaPreferida", 60);
  const notasNuevas = [
    "— Datos completados por la clienta —",
    envio ? `Recibe: ${t(f, "recibe")}${dni ? ` (DNI ${dni})` : ""}` : "Retira",
    envio && preferida ? `Prefiere envío por: ${preferida}` : null,
    envio && t(f, "indicaciones", 500) ? `Aclaraciones para el envío: ${t(f, "indicaciones", 500)}` : null,
    t(f, "extras", 1500) ? `Comentarios: ${t(f, "extras", 1500)}` : null,
  ].filter(Boolean).join("\n");

  await db.$transaction([
    ...prendas.map((pr) => db.prendaItem.update({ where: { id: pr.id }, data: { color: pr.color, talle: pr.talle } })),
    ...items.filter((i) => i.conBordado).map((i) => db.pedidoItem.update({
      where: { id: i.id },
      data: {
        bordadoTexto: t(f, `bordado_${i.id}`) || null,
        hilo: t(f, `hilo_${i.id}`, 30) || i.hilo,
        bordadoUbicacion: t(f, `ubicacion_${i.id}`, 60) || i.bordadoUbicacion,
        bordadoDetalle: t(f, `detalle_${i.id}`, 500) || null,
        bordadoFotos: fotosDe(f, i.id),
        bordadoTipografia: tipografiaValida(t(f, `tipografia_${i.id}`, 40)),
        persona: t(f, `persona_${i.id}`, 80) || i.persona,
        ...(t(f, `extras_${i.id}`, 1500) ? { notas: [itemsBase.get(i.id), `Detalles extras: ${t(f, `extras_${i.id}`, 1500)}`].filter(Boolean).join("\n") } : {}),
      },
    })),
    db.pedido.update({
      where: { id: p.id },
      data: {
        envio,
        formaEnvio: p.costoEnvio ? p.formaEnvio : envio ? (preferida && !/igual/i.test(preferida) ? preferida : p.formaEnvio && p.formaEnvio !== "Retira" ? p.formaEnvio : "A coordinar") : "Retira",
        direccionEnvio: envio ? direccion : null,
        localidad: envio ? t(f, "localidad") : p.localidad,
        provincia: envio ? t(f, "provincia") : p.provincia,
        codigoPostal: envio ? t(f, "codigoPostal", 10) : p.codigoPostal,
        entreCalles: envio ? t(f, "entreCalles") || null : null,
        fechaEvento: leerFecha(t(f, "fechaEvento")) ?? p.fechaEvento,
        notas: [p.notas, notasNuevas].filter(Boolean).join("\n\n"),
        datosCompletadosEn: new Date(),
      },
    }),
  ]);

  // Completa los datos que le falten a la ficha de la clienta, sin pisar nada
  if (envio) {
    const c = p.cliente;
    const faltan = Object.fromEntries(Object.entries({
      direccion, localidad: t(f, "localidad"), provincia: t(f, "provincia"), codigoPostal: t(f, "codigoPostal", 10), dni, entreCalles: t(f, "entreCalles") || null,
    }).filter(([k, v]) => v && !c[k as keyof typeof c]));
    if (Object.keys(faltan).length) await db.cliente.update({ where: { id: c.id }, data: faltan });
  }

  await registrar(null, "La clienta completó sus datos", "Pedido", p.id, `N° ${p.numero} · ${p.cliente.nombre}`);
  await generarTareas(p.id);
  await aplicarConsumo(p.id, null);
  return { ok: true };
}
