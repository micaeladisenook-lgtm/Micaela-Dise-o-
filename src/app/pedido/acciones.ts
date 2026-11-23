"use server";
import { db } from "@/lib/db";
import { registrar } from "@/lib/registro";
import { clientePorTelefono, normalizarInstagram } from "@/lib/clientes";
import { leerFecha } from "@/lib/pedidos";
import { pesos } from "@/lib/formato";
import { generarTareas } from "@/lib/produccion";
import { aplicarConsumo } from "@/lib/stock";
import { prendasDelProducto, esAccesorio } from "@/lib/prendasProducto";
import { guardarImagen, esUrlPropia } from "@/lib/archivos";
import { tipografiaValida } from "@/lib/tipografias";

export type EstadoPublico = { error?: string; ok?: boolean; numero?: number } | null;

const t = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// Foto o archivo de referencia que sube la clienta en el formulario (solo imágenes, hasta 8 MB)
export async function subirFotoPublica(fd: FormData): Promise<{ url: string } | { error: string }> {
  const archivo = fd.get("foto");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elegí una foto." };
  try {
    return { url: await guardarImagen(archivo, { permitirSvg: false }) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}


type BoxForm = {
  productoId?: unknown; eleccion?: unknown; colores?: Record<string, unknown>; talles?: Record<string, unknown>; persona?: unknown;
  bordado?: unknown; tipografia?: unknown; hilo?: unknown; ubicacion?: unknown; bordadoDetalle?: unknown; fotos?: unknown;
  extras?: unknown; conExtra?: unknown; bordadoExtra?: unknown; ubicacionExtra?: unknown;
};
const txt = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
type PrendaNueva = { productoId: string; nombre: string; color: string | null; talle: string | null; orden: number };
type ItemNuevo = {
  productoId: string | null; nombre: string; precioUnitario: number; orden: number; bordadoTexto: string | null;
  hilo: string | null; bordadoUbicacion: string; bordadoDetalle: string | null; bordadoTipografia: string | null; bordadoFotos: string[];
  notas: string | null; persona: string | null; prendas: { create: PrendaNueva[] };
};

export async function enviarPedidoPublico(_prev: EstadoPublico, f: FormData): Promise<EstadoPublico> {
  if (t(f, "sitio")) return { ok: true }; // trampa para robots: campo oculto
  if ((await db.plantilla.findUnique({ where: { clave: "aviso_pedido" } }))?.texto.trim() && f.get("acepto") !== "on") {
    return { error: "Tildá que verificaste talles, colores, bordados, modelos y cantidades." };
  }
  const nombre = t(f, "nombre");
  const telefono = t(f, "telefono");
  if (nombre.length < 3) return { error: "Escribí tu nombre y apellido." };
  if (telefono.replace(/\D/g, "").length < 8) return { error: "Escribí tu WhatsApp con código de área (ej: 11 2345 6789)." };
  // Boxes que armó y confirmó la clienta (pueden ser varios)
  let boxes: BoxForm[];
  try {
    const v = JSON.parse(String(f.get("boxes") ?? "[]"));
    boxes = Array.isArray(v) ? v.slice(0, 15) : [];
  } catch { boxes = []; }
  if (!boxes.length) return { error: "Confirmá al menos un box." };
  const productos = await db.producto.findMany({
    where: { id: { in: boxes.map((b) => String(b?.productoId ?? "")) }, activo: true },
    include: { componentes: { include: { componente: true }, orderBy: { id: "asc" } } },
  });
  const extraProd = await db.producto.findFirst({ where: { tipo: "ADICIONAL", nombre: { contains: "Bordado", mode: "insensitive" } } });
  const items: ItemNuevo[] = [];
  for (const [n, b] of boxes.entries()) {
    const producto = productos.find((x) => x.id === b?.productoId);
    if (!producto) return { error: `El box ${n + 1} no es válido: volvé a elegirlo.` };
    const lista = prendasDelProducto(producto, txt(b.eleccion) || null);
    const prendas = lista.map((pr, k) => {
      const accesorio = esAccesorio(pr.nombre);
      let color = accesorio ? null : txt(b.colores?.[k], 60) || null;
      if (color && pr.colores.length && !pr.colores.includes(color)) color = null;
      let talle = accesorio ? null : txt(b.talles?.[k], 30) || null;
      if (talle && !pr.talles.includes(talle)) talle = null;
      return { productoId: pr.productoId, nombre: pr.nombre, color, talle, orden: k };
    });
    const falta = producto.talleColorOpcional ? -1 : lista.findIndex((pr, k) => !esAccesorio(pr.nombre) && (!prendas[k].color || (pr.talles.length > 0 && !prendas[k].talle)));
    if (falta >= 0) return { error: `Box ${n + 1}: falta el color o el talle de ${lista[falta].nombre}.` };
    const hilo = txt(b.hilo, 30) || null;
    items.push({
      productoId: producto.id, nombre: producto.nombre, precioUnitario: producto.precio ?? 0, orden: items.length,
      bordadoTexto: txt(b.bordado) || null, hilo, bordadoUbicacion: txt(b.ubicacion, 60) || "Espalda",
      bordadoDetalle: txt(b.bordadoDetalle, 500) || null, persona: txt(b.persona, 80) || null,
      bordadoFotos: (Array.isArray(b.fotos) ? b.fotos : []).filter((u): u is string => typeof u === "string" && esUrlPropia(u)).slice(0, 6),
      notas: txt(b.extras, 1500) || null, bordadoTipografia: tipografiaValida(txt(b.tipografia, 40)),
      prendas: { create: prendas },
    });
    if (b.conExtra && txt(b.bordadoExtra)) {
      items.push({
        productoId: extraProd?.id ?? null, nombre: extraProd?.nombre ?? "Bordado extra", precioUnitario: extraProd?.precio ?? 10000, orden: items.length,
        bordadoTexto: txt(b.bordadoExtra), hilo, bordadoUbicacion: txt(b.ubicacionExtra, 60) || "Adelante",
        bordadoDetalle: null, bordadoFotos: [], notas: null, persona: txt(b.persona, 80) || null, bordadoTipografia: tipografiaValida(txt(b.tipografia, 40)),
        prendas: { create: [] },
      });
    }
  }

  const envio = t(f, "envio") !== "retira";
  if (envio) {
    for (const [k, msj] of [["recibe", "quién lo recibe"], ["dni", "el DNI de quien recibe"], ["direccion", "la calle y el número"], ["localidad", "la localidad"], ["provincia", "la provincia"], ["codigoPostal", "el código postal"]] as const) {
      if (!t(f, k)) return { error: `Para el envío falta ${msj}.` };
    }
  }
  const dni = t(f, "dni").replace(/\D/g, "") || null;
  const direccion = [t(f, "direccion"), t(f, "pisoDepto")].filter(Boolean).join(", ") || null;

  // Clienta: si ya existe ese WhatsApp, se usa su ficha (y se completan los datos que le falten, sin pisar nada)
  let cliente = await clientePorTelefono(telefono);
  const datosCliente = {
    instagram: normalizarInstagram(t(f, "instagram")), email: t(f, "email") || null,
    direccion: envio ? direccion : null, localidad: envio ? t(f, "localidad") || null : null,
    provincia: envio ? t(f, "provincia") || null : null, codigoPostal: envio ? t(f, "codigoPostal") || null : null,
    dni: envio ? dni : null, entreCalles: envio ? t(f, "entreCalles") || null : null,
  };
  if (!cliente) {
    cliente = await db.cliente.create({ data: { nombre, telefono, ...datosCliente } });
    await registrar(null, "Creó clienta", "Cliente", cliente.id, `N° ${cliente.numero} · ${cliente.nombre} (formulario público)`);
  } else {
    const faltan = Object.fromEntries(Object.entries(datosCliente).filter(([k, v]) => v && !cliente![k as keyof typeof datosCliente]));
    if (Object.keys(faltan).length) await db.cliente.update({ where: { id: cliente.id }, data: faltan });
  }

  const total = items.reduce((s, i) => s + i.precioUnitario, 0);
  const evento = t(f, "evento");
  const preferida = t(f, "formaPreferida");
  const notas = [
    envio && t(f, "recibe") ? `Recibe: ${t(f, "recibe")}${dni ? ` (DNI ${dni})` : ""}` : null,
    envio && preferida ? `Prefiere envío por: ${preferida}` : null,
    envio && t(f, "indicaciones") ? `Aclaraciones para el envío: ${t(f, "indicaciones")}` : null,
    t(f, "comentarios") ? `Comentarios: ${t(f, "comentarios")}` : null,
  ].filter(Boolean).join("\n") || null;

  const p = await db.pedido.create({
    data: {
      clienteId: cliente.id,
      tipo: productos.some((x) => x.tipo === "BOX") ? "BOX" : "INDIVIDUAL",
      estado: "NUEVO",
      origen: "FORMULARIO",
      evento: evento && evento !== "no" ? (evento === "otro" ? t(f, "eventoOtro") || "Otro" : evento) : null,
      fechaEvento: leerFecha(t(f, "fechaEvento")),
      fechaEntrega: leerFecha(t(f, "fechaNecesita")),
      envio,
      formaEnvio: envio ? (preferida && !/igual/i.test(preferida) ? preferida : "A coordinar") : "Retira",
      direccionEnvio: envio ? direccion : null,
      localidad: envio ? t(f, "localidad") || null : null,
      provincia: envio ? t(f, "provincia") || null : null,
      codigoPostal: envio ? t(f, "codigoPostal") || null : null,
      entreCalles: envio ? t(f, "entreCalles") || null : null,
      notas,
      total,
      items: { create: items },
    },
  });
  await registrar(null, "Pedido desde formulario público", "Pedido", p.id, `N° ${p.numero} · ${cliente.nombre} · ${pesos(total)}`);
  await generarTareas(p.id);
  await aplicarConsumo(p.id, null);
  return { ok: true, numero: p.numero };
}
