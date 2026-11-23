"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requerirUsuario, requerirAdmin } from "@/lib/auth";
import { registrar } from "@/lib/registro";
import { clientePorTelefono, normalizarInstagram } from "@/lib/clientes";
import { armarMensaje, leerFecha, ESTADOS, MEDIOS, NOMBRE_ESTADO, NOMBRE_MEDIO } from "@/lib/pedidos";
import { pesos, leerPesos } from "@/lib/formato";
import type { PedidoForm, ResultadoGuardar } from "./tipos";
import type { EstadoPedido, MedioPago, TipoPedido } from "@prisma/client";

export async function buscarClientes(q: string) {
  await requerirUsuario();
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
    select: { id: true, numero: true, nombre: true, telefono: true, instagram: true, email: true, direccion: true, localidad: true },
  });
}

const txt = (s: string | null | undefined) => (s ?? "").trim() || null;

export async function guardarPedido(datos: PedidoForm, pedidoId?: string): Promise<ResultadoGuardar> {
  const u = await requerirUsuario();
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
          creadoPorId: u.id,
        },
      });
      clienteId = c.id;
      await registrar(u.id, "Creó clienta", "Cliente", c.id, `N° ${c.numero} · ${c.nombre} (desde nuevo pedido)`);
    }
  } else if (datos.cliente.telefono || datos.cliente.instagram) {
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
        },
      });
    }
  }

  const total = items.reduce((s, i) => s + Math.max(0, i.precioUnitario) * Math.max(1, i.cantidad), 0);
  const estado = (ESTADOS as readonly string[]).includes(datos.estado) ? (datos.estado as EstadoPedido) : "NUEVO";
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
    mensaje: armarMensaje(plantilla?.texto ?? "", pedido),
    avisoCliente,
  };
}

export async function cambiarEstado(pedidoId: string, estado: string) {
  const u = await requerirUsuario();
  if (!(ESTADOS as readonly string[]).includes(estado)) return;
  const antes = await db.pedido.findUniqueOrThrow({ where: { id: pedidoId } });
  if (antes.estado === estado) return;
  await db.pedido.update({ where: { id: pedidoId }, data: { estado: estado as EstadoPedido, modificadoPorId: u.id } });
  await registrar(u.id, "Cambió estado", "Pedido", pedidoId, `N° ${antes.numero} · ${NOMBRE_ESTADO[antes.estado]} → ${NOMBRE_ESTADO[estado]}`);
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${pedidoId}`);
}

export async function registrarPago(pedidoId: string, _prev: { error?: string; ok?: string } | null, form: FormData) {
  const u = await requerirUsuario();
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
  const u = await requerirAdmin();
  const pago = await db.pago.delete({ where: { id: pagoId }, include: { pedido: true } });
  await registrar(u.id, "Borró pago", "Pedido", pago.pedidoId, `N° ${pago.pedido.numero} · ${pesos(pago.monto)}`);
  revalidatePath(`/pedidos/${pago.pedidoId}`);
}

export async function borrarPedido(pedidoId: string) {
  const u = await requerirAdmin();
  const p = await db.pedido.delete({ where: { id: pedidoId }, include: { cliente: true } });
  await registrar(u.id, "Borró pedido", "Pedido", pedidoId, `N° ${p.numero} · ${p.cliente.nombre}`);
  revalidatePath("/pedidos");
  redirect("/pedidos");
}
