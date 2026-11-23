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

const fotosDelForm = (f: FormData) => {
  try {
    const v = JSON.parse(String(f.get("fotos") ?? "[]"));
    return Array.isArray(v) ? v.filter((u): u is string => typeof u === "string" && esUrlPropia(u)).slice(0, 6) : [];
  } catch { return []; }
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
  const producto = await db.producto.findFirst({
    where: { id: t(f, "productoId"), activo: true },
    include: { componentes: { include: { componente: true }, orderBy: { id: "asc" } } },
  });
  if (!producto) return { error: "Elegí un producto." };

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

  // Prendas del producto: cada una con su color y su talle (mismo orden que el formulario)
  const lista = prendasDelProducto(producto, t(f, "eleccion") || null);
  const prendas = lista.map((pr, k) => {
    const accesorio = esAccesorio(pr.nombre);
    let color = accesorio ? null : t(f, `color_${k}`).slice(0, 60) || null;
    if (color && pr.colores.length && !pr.colores.includes(color)) color = null;
    let talle = accesorio ? null : t(f, `talle_${k}`) || null;
    if (talle && !pr.talles.includes(talle)) talle = null;
    return { productoId: pr.productoId, nombre: pr.nombre, color, talle, orden: k };
  });
  const faltaColor = lista.some((pr, k) => !esAccesorio(pr.nombre) && !prendas[k].color);
  const faltaTalle = lista.some((pr, k) => !esAccesorio(pr.nombre) && pr.talles.length > 0 && !prendas[k].talle);
  if (faltaColor || faltaTalle) return { error: `Elegí ${faltaColor ? "el color" : ""}${faltaColor && faltaTalle ? " y " : ""}${faltaTalle ? "el talle" : ""} de cada prenda (paso 3).` };

  type ItemNuevo = {
    productoId: string | null; nombre: string; precioUnitario: number; orden: number; bordadoTexto: string | null;
    hilo: string | null; bordadoUbicacion: string; bordadoDetalle: string | null; bordadoTipografia: string | null; bordadoFotos: string[]; notas: string | null; persona: string | null; prendas: { create: typeof prendas };
  };
  const items: ItemNuevo[] = [{
    productoId: producto.id, nombre: producto.nombre, precioUnitario: producto.precio ?? 0, orden: 0,
    bordadoTexto: t(f, "bordado") || null, hilo: t(f, "hilo") || null, bordadoUbicacion: t(f, "ubicacion") || "Espalda",
    bordadoDetalle: t(f, "bordadoDetalle").slice(0, 500) || null, persona: t(f, "persona").slice(0, 80) || null,
    bordadoFotos: fotosDelForm(f), notas: t(f, "extrasItem").slice(0, 1500) || null, bordadoTipografia: tipografiaValida(t(f, "tipografia")),
    prendas: { create: prendas },
  }];
  if (t(f, "bordadoExtra")) {
    const extra = await db.producto.findFirst({ where: { tipo: "ADICIONAL", nombre: { contains: "Bordado", mode: "insensitive" } } });
    items.push({
      productoId: extra?.id ?? null, nombre: extra?.nombre ?? "Bordado extra", precioUnitario: extra?.precio ?? 10000, orden: 1,
      bordadoTexto: t(f, "bordadoExtra"), hilo: t(f, "hilo") || null, bordadoUbicacion: t(f, "ubicacionExtra") || "Adelante",
      bordadoDetalle: null, bordadoFotos: [], notas: null, persona: null, bordadoTipografia: tipografiaValida(t(f, "tipografia")), prendas: { create: [] },
    });
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
      tipo: producto.tipo === "BOX" ? "BOX" : "INDIVIDUAL",
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
