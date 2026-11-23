"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

import { registrar } from "@/lib/registro";
import { generarTareas, actualizarEstadoPorTareas } from "@/lib/produccion";
import { aplicarConsumo, revertirConsumo } from "@/lib/stock";
import { clientePorTelefono, normalizarInstagram } from "@/lib/clientes";
import { armarMensaje, conLinkResumen, leerFecha, ESTADOS, MEDIOS, NOMBRE_ESTADO, NOMBRE_MEDIO } from "@/lib/pedidos";
import { linkResumen } from "@/lib/resumen";
import { pesos, leerPesos } from "@/lib/formato";
import type { PedidoForm, ResultadoGuardar } from "./tipos";
import type { EstadoPedido, MedioPago, TipoPedido } from "@prisma/client";
import { exigirPermiso, permisosDe } from "@/lib/acceso";
import { guardarImagen, esUrlPropia } from "@/lib/archivos";
import { tipografiaValida } from "@/lib/tipografias";

export async function buscarClientes(q: string) {
  await exigirPermiso(["crear_pedidos", "editar_pedidos"]);
  const t = q.trim();
  if (t.length < 2) return [];
  const num = parseInt(t.replace(/^n[°º]?\s*/i, ""), 10);
  const dig = t.replace(/\D/g, "");
  return db.cliente.findMany({
    where: {
      OR: [
        { nombre: { contains: t, mode: "insensitive" } },
        { instagram: { contains: t.replace(/^@/, ""), mode: "insensitive" } },
        ...(dig.length >= 4 ? [{ telefono: { contains: dig.slice(-6) } }] : []),
        ...(Number.isFinite(num) && /^\D*\d+$/.test(t) ? [{ numero: num }] : []),
      ],
    },
    take: 8,
    orderBy: { numero: "desc" },
    select: { id: true, numero: true, nombre: true, telefono: true, instagram: true, email: true, direccion: true, localidad: true, provincia: true, codigoPostal: true, entreCalles: true },
  });
}

const txt = (s: string | null | undefined) => (s ?? "").trim() || null;

export async function guardarPedido(datos: PedidoForm, pedidoId?: string): Promise<ResultadoGuardar> {
  const u = await exigirPermiso(pedidoId ? "editar_pedidos" : "crear_pedidos");
  const items = datos.items.filter((i) => i.nombre.trim());
  if (!datos.cliente.nombre.trim()) return { ok: false, error: "Falta el nombre de la clienta (paso 1)." };
  if (items.length === 0) return { ok: false, error: "Agregá al menos un producto (paso 3)." };

  // 1) Clienta: existente o nueva
  let clienteId = datos.cliente.id;
  let avisoCliente: string | undefined;
  if (!clienteId) {
    const existente = await clientePorTelefono(datos.cliente.telefono);
    if (existente) {
      clienteId = existente.id;
      avisoCliente = `Ese teléfono ya era de la clienta N° ${existente.numero} (${existente.nombre}); el pedido se cargó a su ficha.`;
    } else {
      const c = await db.cliente.create({
        data: {
          nombre: datos.cliente.nombre.trim(),
          telefono: txt(datos.cliente.telefono),
          instagram: normalizarInstagram(datos.cliente.instagram),
          email: txt(datos.cliente.email)?.toLowerCase() ?? null,
          direccion: txt(datos.direccionEnvio),
          localidad: txt(datos.localidad),
          provincia: txt(datos.provincia),
          codigoPostal: txt(datos.codigoPostal),
          entreCalles: txt(datos.entreCalles),
          creadoPorId: u.id,
        },
      });
      clienteId = c.id;
      await registrar(u.id, "Creó clienta", "Cliente", c.id, `N° ${c.numero} · ${c.nombre} (desde nuevo pedido)`);
    }
  } else {
    // completar datos que falten en la ficha
    const c = await db.cliente.findUnique({ where: { id: clienteId } });
    if (c) {
      await db.cliente.update({
        where: { id: clienteId },
        data: {
          telefono: c.telefono || txt(datos.cliente.telefono),
          instagram: c.instagram || normalizarInstagram(datos.cliente.instagram),
          direccion: c.direccion || txt(datos.direccionEnvio),
          localidad: c.localidad || txt(datos.localidad),
          provincia: c.provincia || txt(datos.provincia),
          codigoPostal: c.codigoPostal || txt(datos.codigoPostal),
          entreCalles: c.entreCalles || txt(datos.entreCalles),
        },
      });
    }
  }

  const total = items.reduce((s, i) => s + Math.max(0, i.precioUnitario) * Math.max(1, i.cantidad), 0);
  let estado = (ESTADOS as readonly string[]).includes(datos.estado) ? (datos.estado as EstadoPedido) : "NUEVO";
  // sin permiso para cambiar el estado, al editar se conserva el que tenía
  if (pedidoId && !(await permisosDe(u)).has("cambiar_estado")) {
    estado = (await db.pedido.findUniqueOrThrow({ where: { id: pedidoId }, select: { estado: true } })).estado;
  }
  const campos = {
    clienteId,
    tipo: datos.tipo as TipoPedido,
    estado,
    fechaEvento: leerFecha(datos.fechaEvento),
    fechaEntrega: leerFecha(datos.fechaEntrega),
    evento: txt(datos.evento),
    eventoDetalle: txt(datos.eventoDetalle),
    envio: datos.envio,
    formaEnvio: datos.envio ? txt(datos.formaEnvio) : "Retira",
    direccionEnvio: datos.envio ? txt(datos.direccionEnvio) : null,
    localidad: txt(datos.localidad),
    provincia: txt(datos.provincia),
    codigoPostal: txt(datos.codigoPostal),
    entreCalles: datos.envio ? txt(datos.entreCalles) : null,
    prioridad: datos.prioridad,
    notas: txt(datos.notas),
    total,
    vendedorId: datos.vendedorId || u.id,
    modificadoPorId: u.id,
  };
  const itemsData = items.map((i, n) => ({
    productoId: i.productoId,
    nombre: i.nombre.trim(),
    persona: txt(i.persona),
    cantidad: Math.max(1, i.cantidad),
    precioUnitario: Math.max(0, i.precioUnitario),
    bordadoTexto: txt(i.bordadoTexto),
    bordadoUbicacion: txt(i.bordadoUbicacion),
    bordadoDetalle: txt(i.bordadoDetalle),
    bordadoTipografia: tipografiaValida(i.bordadoTipografia),
    bordadoFotos: (i.bordadoFotos ?? []).filter(esUrlPropia).slice(0, 6),
    hilo: txt(i.hilo),
    notas: txt(i.notas),
    orden: n,
    prendas: {
      create: i.prendas.map((p, k) => ({
        productoId: p.productoId, nombre: p.nombre, color: txt(p.color), talle: txt(p.talle), bordada: p.bordada, orden: k,
      })),
    },
  }));
  const disenosData = datos.disenos.map((disenoId) => ({ disenoId }));

  let id: string;
  if (pedidoId) {
    const antes = await db.pedido.findUniqueOrThrow({ where: { id: pedidoId } });
    await db.$transaction([
      db.pedidoItem.deleteMany({ where: { pedidoId } }),
      db.disenoPedido.deleteMany({ where: { pedidoId } }),
      db.pedido.update({
        where: { id: pedidoId },
        data: { ...campos, items: { create: itemsData }, disenos: { create: disenosData } },
      }),
    ]);
    id = pedidoId;
    const cambios: string[] = [];
    if (antes.total !== total) cambios.push(`total ${pesos(antes.total)} → ${pesos(total)}`);
    if (antes.estado !== estado) cambios.push(`estado ${NOMBRE_ESTADO[antes.estado]} → ${NOMBRE_ESTADO[estado]}`);
    await registrar(u.id, "Modificó pedido", "Pedido", id, `N° ${antes.numero}${cambios.length ? " · " + cambios.join(" · ") : ""}`);
  } else {
    const p = await db.pedido.create({
      data: { ...campos, creadoPorId: u.id, items: { create: itemsData }, disenos: { create: disenosData } },
    });
    id = p.id;
    if (datos.sena > 0) {
      const medio = (MEDIOS as readonly string[]).includes(datos.medioSena) ? (datos.medioSena as MedioPago) : "TRANSFERENCIA";
      await db.pago.create({ data: { pedidoId: id, monto: datos.sena, medio, esSena: true, creadoPorId: u.id } });
    }
    await registrar(u.id, "Creó pedido", "Pedido", id, `N° ${p.numero} · ${datos.cliente.nombre} · ${pesos(total)}`);
  }

  await generarTareas(id);
  await aplicarConsumo(id, u.id);
  if (pedidoId) await actualizarEstadoPorTareas(id, u.id);

  const pedido = await db.pedido.findUniqueOrThrow({
    where: { id },
    include: { cliente: true, pagos: true, items: { include: { prendas: { orderBy: { orden: "asc" } } }, orderBy: { orden: "asc" } } },
  });
  const plantilla = await db.plantilla.findUnique({ where: { clave: "confirmacion" } });
  revalidatePath("/pedidos");
  revalidatePath(`/clientes/${clienteId}`);
  return {
    ok: true,
    id,
    numero: pedido.numero,
    telefono: pedido.cliente.telefono,
    mensaje: armarMensaje(conLinkResumen(plantilla?.texto ?? ""), pedido, { link_resumen: await linkResumen(id) }),
    avisoCliente,
  };
}

export async function cambiarEstado(pedidoId: string, estado: string) {
  const u = await exigirPermiso("cambiar_estado");
  if (!(ESTADOS as readonly string[]).includes(estado)) return;
  const antes = await db.pedido.findUniqueOrThrow({ where: { id: pedidoId } });
  if (antes.estado === estado) return;
  await db.pedido.update({ where: { id: pedidoId }, data: { estado: estado as EstadoPedido, modificadoPorId: u.id } });
  await registrar(u.id, "Cambió estado", "Pedido", pedidoId, `N° ${antes.numero} · ${NOMBRE_ESTADO[antes.estado]} → ${NOMBRE_ESTADO[estado]}`);
  if (estado === "CANCELADO") {
    await generarTareas(pedidoId);
    await revertirConsumo(pedidoId, u.id, `Pedido N° ${antes.numero} cancelado`);
  } else if (antes.estado === "CANCELADO") {
    await generarTareas(pedidoId);
    await aplicarConsumo(pedidoId, u.id);
  } else if (antes.estado === "ENTREGADO") {
    await generarTareas(pedidoId);
  }
  revalidatePath("/talleres");
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${pedidoId}`);
}

export async function registrarPago(pedidoId: string, _prev: { error?: string; ok?: string } | null, form: FormData) {
  const u = await exigirPermiso("registrar_pagos");
  const monto = leerPesos(String(form.get("monto") ?? ""));
  const medio = String(form.get("medio") ?? "TRANSFERENCIA");
  if (!monto || monto <= 0) return { error: "Ingresá el monto." };
  if (!(MEDIOS as readonly string[]).includes(medio)) return { error: "Elegí el medio de pago." };
  const fechaPago = leerFecha(form.get("fecha")) ?? new Date();
  const p = await db.pedido.findUniqueOrThrow({ where: { id: pedidoId }, include: { pagos: true } });
  await db.pago.create({
    data: {
      pedidoId, monto, medio: medio as MedioPago, fecha: fechaPago,
      esSena: p.pagos.length === 0, nota: String(form.get("nota") ?? "").trim() || null, creadoPorId: u.id,
    },
  });
  await registrar(u.id, "Registró pago", "Pedido", pedidoId, `N° ${p.numero} · ${pesos(monto)} (${NOMBRE_MEDIO[medio]})`);
  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
  return { ok: `Pago de ${pesos(monto)} registrado.` };
}

export async function borrarPago(pagoId: string) {
  const u = await exigirPermiso("borrar_pagos");
  const pago = await db.pago.delete({ where: { id: pagoId }, include: { pedido: true } });
  await registrar(u.id, "Borró pago", "Pedido", pago.pedidoId, `N° ${pago.pedido.numero} · ${pesos(pago.monto)}`);
  revalidatePath(`/pedidos/${pago.pedidoId}`);
}

export async function borrarPedido(pedidoId: string) {
  const u = await exigirPermiso("borrar_pedidos");
  await revertirConsumo(pedidoId, u.id, "Pedido borrado");
  const p = await db.pedido.delete({ where: { id: pedidoId }, include: { cliente: true } });
  await registrar(u.id, "Borró pedido", "Pedido", pedidoId, `N° ${p.numero} · ${p.cliente.nombre}`);
  revalidatePath("/pedidos");
  redirect("/pedidos");
}

export async function marcarRevisado(pedidoId: string) {
  const u = await exigirPermiso("editar_pedidos");
  const p = await db.pedido.update({ where: { id: pedidoId }, data: { revisar: null, modificadoPorId: u.id } });
  await registrar(u.id, "Marcó como revisado", "Pedido", pedidoId, `N° ${p.numero}`);
  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
}

export async function generarLinkPago(pedidoId: string, monto: number): Promise<{ ok: true; link: string } | { ok: false; error: string }> {
  const u = await exigirPermiso("links_pago");
  const p = await db.pedido.findUniqueOrThrow({ where: { id: pedidoId }, include: { cliente: true } });
  if (!monto || monto <= 0) return { ok: false, error: "El monto tiene que ser mayor a cero." };
  try {
    const { crearLinkMercadoPago } = await import("@/lib/mercadopago");
    const link = await crearLinkMercadoPago({
      titulo: `Pedido N° ${p.numero} · Micaela Diseño`, monto, referencia: p.id, email: p.cliente.email,
    });
    await db.pedido.update({ where: { id: pedidoId }, data: { linkPago: link, linkPagoMonto: monto, linkPagoFecha: new Date() } });
    await registrar(u.id, "Generó link de Mercado Pago", "Pedido", pedidoId, `N° ${p.numero} · ${pesos(monto)}`);
    revalidatePath(`/pedidos/${pedidoId}`);
    revalidatePath("/pagos");
    return { ok: true, link };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Foto de referencia de dónde va el bordado (se sube apenas la eligen en el formulario)
export async function subirFotoBordado(form: FormData): Promise<{ url: string } | { error: string }> {
  await exigirPermiso("subir_fotos_bordado");
  const archivo = form.get("foto");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elegí una foto." };
  try {
    return { url: await guardarImagen(archivo) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// Vuelve a abrir el link para que la clienta corrija sus datos
export async function reabrirLinkCompletar(pedidoId: string) {
  const u = await exigirPermiso("editar_pedidos");
  const p = await db.pedido.update({ where: { id: pedidoId }, data: { datosCompletadosEn: null, modificadoPorId: u.id } });
  await registrar(u.id, "Volvió a habilitar el link para completar datos", "Pedido", pedidoId, `N° ${p.numero}`);
  revalidatePath(`/pedidos/${pedidoId}`);
}
