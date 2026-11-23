/**
 * Importa clientas y pedidos históricos desde los JSON generados por convertir_planillas.py
 * (y los pedidos transcriptos del chat). Uso:
 *   npx tsx scripts/importar.ts planilla.json chat.json
 * Los archivos con datos personales quedan fuera del repositorio.
 */
import { PrismaClient, type EstadoPedido, type MedioPago, type TipoPedido } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";

const db = new PrismaClient();
const HOY = new Date("2026-11-23T12:00:00-03:00");

type Item = {
  productoTexto?: string | null; producto?: string | null; eleccion?: string | null; persona?: string;
  colorBata?: string | null; colorPijama?: string | null; hilo?: string | null; bordado?: string | null;
  ubicacion?: string; tallesTexto?: string | null; dedicatoria?: string | null; talles?: Record<string, string>;
  precioUnitario?: number; prendasManual?: [string, string, string][]; notasItem?: string;
};
type P = {
  hoja?: string; fila?: number; cliente: { nombre: string; instagram?: string | null; telefono?: string };
  estadoPlanilla?: string | null; fechaPedido?: string | null; seEntrega?: string | null; fechaEvento?: string | null;
  eventoTexto?: string | null; evento?: string; vendedora?: string | null; direccion?: string | null; localidad?: string | null;
  formaEnvio?: string | null; total?: number | null; pagado?: number | null; medio?: string | null; precioTexto?: string | null;
  prioridad?: boolean; notas: string[]; items: Item[]; chat?: boolean;
};

const norm = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const fechaDe = (s?: string | null) => (s ? new Date(`${s}T12:00:00-03:00`) : null);
const fmt = (d: Date) => d.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
const pesos = (n: number) => "$" + n.toLocaleString("es-AR");

async function main() {
  const [rutaPlanilla, rutaChat] = process.argv.slice(2);
  const planilla = JSON.parse(readFileSync(rutaPlanilla, "utf8")) as { pedidos: P[]; clientas2025: { nombre: string; instagram: string | null; telefono: string | null; email: string | null; direccion: string | null; localidad: string | null; fecha: string | null }[] };
  const chat = (JSON.parse(readFileSync(rutaChat, "utf8")) as P[]).map((p) => ({ ...p, chat: true }));

  if ((await db.pedido.count()) > 0) throw new Error("Ya hay pedidos cargados: la importación se hace una sola vez sobre la base vacía.");

  // Usuarias: las vendedoras que ya no están quedan inactivas (solo para el historial)
  const micaela = await db.usuario.findUniqueOrThrow({ where: { login: "micaela" } });
  const ludmila = await db.usuario.findUniqueOrThrow({ where: { login: "ludmila" } });
  const inactiva = async (login: string, nombre: string) =>
    db.usuario.upsert({ where: { login }, update: {}, create: { login, nombre, rol: "VENDEDOR", activo: false, passwordHash: await bcrypt.hash(crypto.randomUUID(), 10) } });
  const nati = await inactiva("nati", "Nati");
  const guada = await inactiva("guada", "Guada");
  const vendedora = (v?: string | null) => ({ ludmi: ludmila.id, mica: micaela.id, nati: nati.id, guada: guada.id } as Record<string, string>)[v ?? ""] ?? null;

  const productos = await db.producto.findMany({ include: { componentes: { include: { componente: true }, orderBy: { id: "asc" } } } });
  const prod = (n?: string | null) => (n ? productos.find((p) => p.nombre === n) : undefined);

  // ---------------- Clientas
  const clientes = new Map<string, string>();
  const c2025 = [...planilla.clientas2025].sort((a, b) => (a.fecha ?? "9").localeCompare(b.fecha ?? "9"));
  for (const c of c2025) {
    const k = norm(c.nombre);
    if (clientes.has(k)) continue;
    const nuevo = await db.cliente.create({
      data: { nombre: c.nombre, instagram: c.instagram, telefono: c.telefono, email: c.email, direccion: c.direccion, localidad: c.localidad, notas: "Clienta 2025 (planilla MAYO 2025)", creadoEn: fechaDe(c.fecha) ?? new Date("2025-05-01") },
    });
    clientes.set(k, nuevo.id);
  }

  const clave = (p: P) => p.fechaPedido ?? p.seEntrega ?? p.fechaEvento ?? "2026-12-31";
  const todos = [...planilla.pedidos.sort((a, b) => clave(a).localeCompare(clave(b))), ...chat];

  const avisos: Record<string, number> = {};
  const contar = (k: string) => (avisos[k] = (avisos[k] ?? 0) + 1);
  let creados = 0;

  for (const p of todos) {
    const k = norm(p.cliente.nombre);
    const retira = /retira|retiro/i.test(`${p.direccion ?? ""} ${p.localidad ?? ""}`);
    let clienteId = clientes.get(k);
    if (!clienteId) {
      const c = await db.cliente.create({
        data: {
          nombre: p.cliente.nombre, instagram: p.cliente.instagram ?? null, telefono: p.cliente.telefono ?? null,
          direccion: retira ? null : p.direccion ?? null, localidad: p.localidad ?? null,
          creadoEn: fechaDe(p.fechaPedido) ?? HOY,
        },
      });
      clienteId = c.id;
      clientes.set(k, c.id);
    } else {
      const c = await db.cliente.findUniqueOrThrow({ where: { id: clienteId } });
      await db.cliente.update({
        where: { id: clienteId },
        data: {
          instagram: c.instagram ?? p.cliente.instagram ?? null, telefono: c.telefono ?? p.cliente.telefono ?? null,
          direccion: (!retira && p.direccion) || c.direccion, localidad: p.localidad || c.localidad,
        },
      });
    }

    // ---------------- Estado
    const evento = fechaDe(p.fechaEvento);
    const pedidoEn = fechaDe(p.fechaPedido);
    const revisar: string[] = [];
    let estado: EstadoPedido;
    if (p.chat) estado = "NUEVO";
    else if (evento) estado = evento < HOY ? "ENTREGADO" : p.estadoPlanilla === "listo" ? "LISTO" : "EN_PRODUCCION";
    else {
      const ref = pedidoEn ?? fechaDe(p.seEntrega);
      estado = ref && HOY.getTime() - ref.getTime() > 90 * 864e5 ? "ENTREGADO" : "EN_PRODUCCION";
      if (estado !== "ENTREGADO") { revisar.push("sin fecha de evento"); contar("Activo sin fecha de evento"); }
    }

    // ---------------- Productos y prendas
    const items = p.items.map((it, n) => {
      const pr = prod(it.producto);
      let prendas: { productoId: string | null; nombre: string; color: string | null; talle: string | null; orden: number }[] = [];
      const t = it.talles ?? {};
      const talleDe = (nombre: string) => (/pantu/i.test(nombre) ? t.pantu : /bata/i.test(nombre) ? t.bata : /antifaz|scrunchie/i.test(nombre) ? undefined : t.pijama) ?? null;
      const colorDe = (nombre: string) => (/pijama|camis/i.test(nombre) ? it.colorPijama || it.colorBata : it.colorBata) ?? null;
      if (it.prendasManual) {
        prendas = it.prendasManual.map(([nombre, color, talle], o) => ({ productoId: prod(nombre)?.id ?? null, nombre, color, talle, orden: o }));
      } else if (pr && pr.componentes.length) {
        const opciones = pr.componentes.filter((c) => c.aEleccion);
        const elegida = opciones.find((c) => c.componente.nombre === it.eleccion) ?? opciones[0];
        prendas = pr.componentes
          .filter((c) => !c.aEleccion || c === elegida)
          .map((c, o) => ({ productoId: c.componenteId, nombre: c.componente.nombre, color: colorDe(c.componente.nombre), talle: talleDe(c.componente.nombre), orden: o }));
      } else if (pr) {
        prendas = [{ productoId: pr.id, nombre: pr.nombre, color: it.colorBata ?? null, talle: t.bata ?? null, orden: 0 }];
      } else if (it.colorBata || it.tallesTexto) {
        prendas = [{ productoId: null, nombre: it.productoTexto ?? "Prenda", color: it.colorBata ?? null, talle: null, orden: 0 }];
      }
      const notas = [
        it.tallesTexto ? `Talles (planilla): ${it.tallesTexto}` : null,
        it.dedicatoria ? `Dedicatoria: ${it.dedicatoria}` : null,
        it.notasItem ?? null,
      ].filter(Boolean).join("\n") || null;
      if (!pr) contar("Producto que no está en el catálogo actual (se guardó el nombre original)");
      return {
        productoId: pr?.id ?? null,
        nombre: it.productoTexto && !p.chat ? it.productoTexto.replace(/\s+/g, " ").trim() : (it.productoTexto ?? pr?.nombre ?? "Producto"),
        persona: it.persona ?? null,
        precioUnitario: it.precioUnitario ?? 0,
        precioLista: pr?.precio ?? null,
        bordadoTexto: it.bordado ?? null,
        bordadoUbicacion: it.ubicacion ?? null,
        hilo: it.hilo ?? null,
        notas,
        orden: n,
        prendas,
      };
    });

    // ---------------- Total y pagos
    const lista = items.every((i) => i.precioLista) ? items.reduce((s, i) => s + (i.precioLista ?? 0), 0) : null;
    let total: number;
    let pago = 0;
    let pagoNota = "Importado de la planilla";
    if (p.chat) {
      total = p.total ?? items.reduce((s, i) => s + (i.precioUnitario || i.precioLista || 0), 0);
      pago = p.pagado ?? 0;
      if (!p.total) { revisar.push("total estimado con la lista de precios actual"); contar("Total estimado con la lista actual"); }
    } else if (estado === "ENTREGADO") {
      total = p.total ?? p.pagado ?? 0;
      pago = total;
      pagoNota = p.total || p.pagado ? "Importado: pedido entregado, se asume cobrado" : pagoNota;
      if (!total) contar("Entregado sin precio en la planilla (no se marca para revisar)");
    } else {
      total = p.total ?? (p.pagado && lista ? (p.pagado >= lista * 0.85 ? p.pagado : lista) : p.pagado ?? lista ?? 0);
      pago = p.pagado ?? 0;
      if (!p.total && !p.pagado) { revisar.push(lista ? "total estimado con la lista de precios actual, sin pagos registrados" : "sin precio ni pagos en la planilla"); contar("Activo sin precio ni pagos en la planilla"); }
      else if (!p.total) { revisar.push("la planilla solo dice lo abonado: confirmar el total"); contar("Activo: solo figura lo abonado"); }
    }
    // repartir el total entre los productos
    if (p.chat && p.items.every((i) => i.precioUnitario)) items.forEach((i, n) => (i.precioUnitario = p.items[n].precioUnitario!));
    else if (items.length > 1 && lista === total) items.forEach((i) => (i.precioUnitario = i.precioLista ?? 0));
    else items.forEach((i, n) => (i.precioUnitario = n === 0 ? total : 0));

    const textos = `${p.direccion ?? ""} ${p.localidad ?? ""} ${p.notas.join(" ")}`;
    const formaEnvio = retira ? "Retira" : p.formaEnvio ?? (/correo/i.test(textos) ? "Correo Argentino" : /moto/i.test(textos) ? "Motomensajería" : null);
    const bordados = items.map((i) => i.bordadoTexto ?? "").join(" ");
    const tipoEvento = p.evento ?? (/\bxv\b|15|quince/i.test(bordados) ? "XV" : /novia|bride|boda|madrina|bridesmaid/i.test(bordados) ? "Boda" : null);
    const notas = [
      ...p.notas,
      p.seEntrega ? `Se entrega (planilla): ${fmt(fechaDe(p.seEntrega)!)}` : null,
      p.precioTexto ? `Precio en planilla: ${p.precioTexto.replace(/\n+/g, " · ")}` : null,
      p.hoja ? `Origen: hoja "${p.hoja}", fila ${p.fila}` : "Origen: chat PEDIDOS 2027",
    ].filter(Boolean).join("\n");

    await db.pedido.create({
      data: {
        clienteId,
        tipo: (items.length > 1 ? "EVENTO" : items[0]?.prendas.length > 1 ? "BOX" : "INDIVIDUAL") as TipoPedido,
        estado,
        origen: "IMPORTADO",
        fechaPedido: pedidoEn ?? fechaDe(p.seEntrega) ?? evento ?? HOY,
        fechaEvento: evento,
        evento: tipoEvento,
        eventoDetalle: p.eventoTexto ? `Evento: ${p.eventoTexto}` : null,
        envio: !retira,
        formaEnvio,
        direccionEnvio: retira ? null : p.direccion ?? null,
        localidad: p.localidad ?? null,
        prioridad: !!p.prioridad,
        total,
        notas,
        revisar: revisar.length ? revisar.join(" · ") : null,
        vendedorId: vendedora(p.vendedora),
        creadoEn: pedidoEn ?? HOY,
        items: {
          create: items.map(({ precioLista: _, prendas, ...i }) => ({ ...i, cantidad: 1, prendas: { create: prendas } })),
        },
        pagos: pago > 0 ? {
          create: [{ monto: pago, medio: ((p.medio && p.medio !== "OTRO" ? p.medio : "OTRO") as MedioPago), esSena: pago < total, fecha: pedidoEn ?? HOY, nota: pagoNota }],
        } : undefined,
      },
    });
    creados++;
  }

  await db.registro.create({
    data: { usuarioId: micaela.id, accion: "Importó datos", entidad: "Sistema", detalle: `${clientes.size} clientas y ${creados} pedidos desde las planillas y el chat PEDIDOS 2027` },
  });

  const porEstado = await db.pedido.groupBy({ by: ["estado"], _count: true });
  const activos = await db.pedido.findMany({ where: { estado: { in: ["NUEVO", "EN_PRODUCCION", "LISTO"] } }, include: { pagos: true } });
  const deuda = activos.reduce((s, p) => s + Math.max(0, p.total - p.pagos.reduce((a, b) => a + b.monto, 0)), 0);
  console.log(JSON.stringify({
    clientas: clientes.size, pedidos: creados,
    porEstado: Object.fromEntries(porEstado.map((e) => [e.estado, e._count])),
    porCobrarActivos: pesos(deuda),
    paraRevisar: await db.pedido.count({ where: { revisar: { not: null } } }),
    avisos,
  }, null, 1));
}

main().finally(() => db.$disconnect());
