"use server";
import { db } from "@/lib/db";
import { registrar } from "@/lib/registro";
import { clientePorTelefono, normalizarInstagram } from "@/lib/clientes";
import { leerFecha } from "@/lib/pedidos";
import { pesos } from "@/lib/formato";
import { generarTareas } from "@/lib/produccion";
import { aplicarConsumo } from "@/lib/stock";

export type EstadoPublico = { error?: string; ok?: boolean; numero?: number } | null;

const t = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function enviarPedidoPublico(_prev: EstadoPublico, f: FormData): Promise<EstadoPublico> {
  if (t(f, "sitio")) return { ok: true }; // trampa para robots: campo oculto
  const nombre = t(f, "nombre");
  const telefono = t(f, "telefono");
  if (nombre.length < 3) return { error: "Escribí tu nombre y apellido." };
  if (telefono.replace(/\D/g, "").length < 8) return { error: "Escribí tu WhatsApp con código de área (ej: 11 2345 6789)." };
  const producto = await db.producto.findFirst({
    where: { id: t(f, "productoId"), activo: true },
    include: { componentes: { include: { componente: true }, orderBy: { id: "asc" } } },
  });
  if (!producto) return { error: "Elegí un producto." };

  // Clienta: si ya existe ese WhatsApp, se usa su ficha
  let cliente = await clientePorTelefono(telefono);
  if (!cliente) {
    cliente = await db.cliente.create({
      data: {
        nombre, telefono, instagram: normalizarInstagram(t(f, "instagram")),
        direccion: t(f, "direccion") || null, localidad: t(f, "localidad") || null,
        provincia: t(f, "provincia") || null, codigoPostal: t(f, "codigoPostal") || null,
        dni: t(f, "dni").replace(/\D/g, "") || null,
        entreCalles: t(f, "entreCalles") || null,
      },
    });
    await registrar(null, "Creó clienta", "Cliente", cliente.id, `N° ${cliente.numero} · ${cliente.nombre} (formulario público)`);
  } else if (!cliente.instagram && t(f, "instagram")) {
    await db.cliente.update({ where: { id: cliente.id }, data: { instagram: normalizarInstagram(t(f, "instagram")) } });
  }

  // Prendas del producto con su color y talle
  const color = t(f, "color") || null;
  const eleccion = t(f, "eleccion");
  const primeraOpcion = producto.componentes.find((x) => x.aEleccion)?.componenteId;
  const comps = producto.componentes.filter((c) => !c.aEleccion || c.componenteId === (eleccion || primeraOpcion));
  const talleDe = (nombre: string) =>
    (/pantu/i.test(nombre) ? t(f, "tallePantu") : /bata/i.test(nombre) ? t(f, "talleBata") : t(f, "talleOtro")) || null;
  const prendas = comps.length
    ? comps.map((c, k) => ({ productoId: c.componenteId, nombre: c.componente.nombre, color, talle: talleDe(c.componente.nombre), orden: k }))
    : [{ productoId: producto.id, nombre: producto.nombre, color, talle: t(f, "talleBata") || null, orden: 0 }];

  type ItemNuevo = {
    productoId: string | null; nombre: string; precioUnitario: number; orden: number; bordadoTexto: string | null;
    hilo: string | null; bordadoUbicacion: string; prendas: { create: typeof prendas };
  };
  const items: ItemNuevo[] = [{
    productoId: producto.id, nombre: producto.nombre, precioUnitario: producto.precio ?? 0, orden: 0,
    bordadoTexto: t(f, "bordado") || null, hilo: t(f, "hilo") || null, bordadoUbicacion: "Espalda",
    prendas: { create: prendas },
  }];
  if (t(f, "bordadoExtra")) {
    const extra = await db.producto.findFirst({ where: { tipo: "ADICIONAL", nombre: { contains: "Bordado", mode: "insensitive" } } });
    items.push({
      productoId: extra?.id ?? null, nombre: extra?.nombre ?? "Bordado extra", precioUnitario: extra?.precio ?? 10000, orden: 1,
      bordadoTexto: t(f, "bordadoExtra"), hilo: t(f, "hilo") || null, bordadoUbicacion: t(f, "ubicacionExtra") || "Adelante",
      prendas: { create: [] },
    });
  }
  const total = items.reduce((s, i) => s + i.precioUnitario, 0);
  const envio = t(f, "envio") !== "retira";
  const evento = t(f, "evento");

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
      formaEnvio: envio ? "A coordinar" : "Retira",
      direccionEnvio: envio ? t(f, "direccion") || null : null,
      localidad: t(f, "localidad") || null,
      provincia: t(f, "provincia") || null,
      codigoPostal: t(f, "codigoPostal") || null,
      entreCalles: envio ? t(f, "entreCalles") || null : null,
      notas: t(f, "comentarios") || null,
      total,
      items: { create: items },
    },
  });
  await registrar(null, "Pedido desde formulario público", "Pedido", p.id, `N° ${p.numero} · ${cliente.nombre} · ${pesos(total)}`);
  await generarTareas(p.id);
  await aplicarConsumo(p.id, null);
  return { ok: true, numero: p.numero };
}
