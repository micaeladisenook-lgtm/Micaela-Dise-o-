import Link from "next/link";
import { MessageCircle, Scissors, Package } from "lucide-react";
import EstadoChip from "@/components/EstadoChip";
import SaldoMP from "./panel/SaldoMP";
import { db } from "@/lib/db";

import { fecha, pesos, linkWhatsApp } from "@/lib/formato";
import { armarMensaje, atrasado, fechaGuia, hoyAR, saldo, semana, enSemana } from "@/lib/pedidos";
import { tareasDeSemana } from "@/lib/datosTalleres";
import { requerirPermiso, permisosDeRol } from "@/lib/acceso";

function saludo() {
  const h = parseInt(new Date().toLocaleString("es-AR", { hour: "numeric", hour12: false, timeZone: "America/Argentina/Buenos_Aires" }), 10);
  if (h < 13) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ "sin-permiso"?: string }> }) {
  const u = await requerirPermiso("ver_panel");
  const sp = await searchParams;
  const esAdmin = (await permisosDeRol(u.rol)).has("ver_gastos");
  const hoy = hoyAR();
  const mesIso = hoy.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).slice(0, 7);
  const inicioMes = new Date(`${mesIso}-01T00:00:00-03:00`);
  const finMes = new Date(new Date(inicioMes).setMonth(inicioMes.getMonth() + 1));
  const sem = semana(hoy);

  const [pedidosMes, abiertos, pagosMes, plantilla, gastosMes, tareasSemana, stock] = await Promise.all([
    db.pedido.findMany({ where: { estado: { not: "CANCELADO" }, fechaPedido: { gte: inicioMes, lt: finMes } }, select: { total: true } }),
    db.pedido.findMany({
      where: { estado: { not: "CANCELADO" } },
      include: {
        cliente: true, pagos: { select: { monto: true } },
        items: { select: { nombre: true, cantidad: true, persona: true, bordadoTexto: true, bordadoUbicacion: true, hilo: true, prendas: { select: { nombre: true, color: true, talle: true } } } },
      },
    }),
    db.pago.aggregate({ where: { fecha: { gte: inicioMes, lt: finMes } }, _sum: { monto: true } }),
    db.plantilla.findUnique({ where: { clave: "saldo" } }),
    esAdmin ? db.gasto.aggregate({ where: { fecha: { gte: inicioMes, lt: finMes } }, _sum: { monto: true } }) : null,
    tareasDeSemana(hoy),
    db.itemStock.findMany({ where: { activo: true, minimo: { gt: 0 } } }),
  ]);
  const gastos = gastosMes?._sum.monto ?? 0;
  const talleres = await db.taller.findMany({ where: { activo: true }, orderBy: { orden: "asc" } });
  const stockBajo = stock.filter((i) => i.cantidad <= i.minimo);

  const ventasMes = pedidosMes.reduce((s, p) => s + p.total, 0);
  const conSaldo = abiertos.map((p) => ({ p, s: saldo(p.total, p.pagos) })).filter((x) => x.s > 0);
  const porCobrar = conSaldo.reduce((s, x) => s + x.s, 0);
  const estaSemana = abiertos
    .filter((p) => enSemana(fechaGuia(p), sem) || (atrasado(p) && p.estado !== "ENTREGADO"))
    .sort((a, b) => (fechaGuia(a)?.getTime() ?? 0) - (fechaGuia(b)?.getTime() ?? 0));
  const recordar = conSaldo
    .filter((x) => ["NUEVO", "EN_PRODUCCION", "LISTO"].includes(x.p.estado))
    .sort((a, b) => (fechaGuia(a.p)?.getTime() ?? 9e15) - (fechaGuia(b.p)?.getTime() ?? 9e15))
    .slice(0, 6);

  const tarjetas = [
    { titulo: "Ventas del mes", valor: pesos(ventasMes), detalle: `${pedidosMes.length} pedidos cargados`, href: "/pedidos?estado=todos" },
    { titulo: "Por cobrar", valor: pesos(porCobrar), detalle: `${conSaldo.length} pedidos · cobrado este mes ${pesos(pagosMes._sum.monto ?? 0)}`, href: "/pagos", alerta: true },
    ...(esAdmin ? [
      { titulo: "Gastos del mes", valor: pesos(gastos), detalle: "Ver detalle por categoría", href: "/gastos" },
      { titulo: "Ganancia estimada", valor: pesos(ventasMes - gastos), detalle: "ventas − gastos del mes", href: "/gastos" },
    ] : []),
  ];

  return (
    <>
      {sp["sin-permiso"] && <p className="mb-4 text-sm text-estado-alerta-txt bg-estado-alerta rounded-xl px-4 py-3">No tenés permiso para ver esa sección.</p>}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <p className="text-sm text-texto-2 capitalize">{hoy.toLocaleDateString("es-AR", { weekday: "long", timeZone: "America/Argentina/Buenos_Aires" })} {fecha(hoy)}</p>
          <h1 className="text-4xl md:text-5xl">{saludo()}, {u.nombre.split(" ")[0]}</h1>
        </div>
        <Link href="/pedidos/nuevo" className="btn-primario self-start sm:self-auto">+ Nuevo pedido</Link>
      </div>

      <div className={`grid grid-cols-2 ${esAdmin ? "xl:grid-cols-4" : ""} gap-3 md:gap-4 mb-6`}>
        {tarjetas.map((t) => (
          <Link key={t.titulo} href={t.href} className="tarjeta p-4 md:p-5 hover:border-acento">
            <p className="text-xs md:text-sm text-texto-2">{t.titulo}</p>
            <p className={`titulo text-2xl md:text-4xl mt-1 ${t.valor === "—" ? "text-texto-2/50" : t.alerta ? "text-estado-alerta-txt" : ""}`}>{t.valor}</p>
            <p className="text-[11px] md:text-xs text-texto-2 mt-1">{t.detalle}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-4 md:gap-6 items-start">
        <section className="tarjeta p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl">Entregas de la semana</h2>
            <Link href="/calendario" className="text-sm text-acento hover:underline">Calendario</Link>
          </div>
          <p className="text-xs text-texto-2 mb-3">Eventos del {fecha(sem.inicio)} al {fecha(sem.fin)} (y atrasados)</p>
          {estaSemana.length === 0 ? <p className="text-sm text-texto-2">No hay eventos esta semana.</p> : (
            <ul className="divide-y divide-borde">
              {estaSemana.map((p) => (
                <li key={p.id}>
                  <Link href={`/pedidos/${p.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-acento">
                    <span className="min-w-0">
                      <span className="font-medium">N° {p.numero} · {p.cliente.nombre}</span>
                      <span className="block text-xs text-texto-2 truncate">{fecha(fechaGuia(p))} · {p.items.map((i) => i.nombre).join(", ")}</span>
                    </span>
                    <EstadoChip estado={p.estado} atrasado={atrasado(p)} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-4 md:space-y-6">
          {esAdmin && <SaldoMP />}
          <section className="tarjeta p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl">Pagos pendientes</h2>
              <Link href="/pagos" className="text-sm text-acento hover:underline">Ver todos</Link>
            </div>
            {recordar.length === 0 ? <p className="text-sm text-texto-2">No hay saldos pendientes.</p> : (
              <ul className="space-y-3">
                {recordar.map(({ p, s }) => {
                  const wa = linkWhatsApp(p.cliente.telefono, armarMensaje(plantilla?.texto ?? "", p));
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <Link href={`/pedidos/${p.id}`} className="min-w-0 hover:text-acento">
                        <span className="block text-sm font-medium truncate">{p.cliente.nombre}</span>
                        <span className="block text-xs text-texto-2">N° {p.numero} · debe <strong className="text-estado-alerta-txt">{pesos(s)}</strong></span>
                      </Link>
                      {wa ? <a href={wa} target="_blank" className="btn-secundario min-h-10 px-3 text-xs shrink-0"><MessageCircle size={14} /> Recordar por WhatsApp</a>
                        : <span className="text-[11px] text-texto-2 shrink-0">sin WhatsApp</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="tarjeta p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl">Talleres esta semana</h2>
              <Link href="/talleres" className="text-sm text-acento hover:underline">Ver</Link>
            </div>
            <ul className="space-y-2">
              {talleres.map((t) => {
                const propias = tareasSemana.tareas.filter((x) => x.tallerId === t.id);
                const pend = propias.filter((x) => !x.terminada).length;
                return (
                  <li key={t.id} className="flex items-center gap-3 text-sm">
                    <Scissors size={16} className="text-acento shrink-0" />
                    <span className="flex-1">{t.nombre}</span>
                    <span className={pend ? "font-medium" : "text-texto-2"}>{pend} pendiente{pend === 1 ? "" : "s"}</span>
                    <span className="text-texto-2 text-xs w-16 text-right">{propias.length - pend} hechas</span>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="tarjeta p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl">Stock bajo</h2>
              <Link href="/stock" className="text-sm text-acento hover:underline">Stock</Link>
            </div>
            {stockBajo.length === 0 ? <p className="text-sm text-texto-2 flex items-center gap-2"><Package size={16} /> Todo en orden{stock.length === 0 ? " (todavía no hay mínimos configurados)" : ""}.</p> : (
              <ul className="text-sm space-y-1">{stockBajo.map((i) => <li key={i.id} className="flex justify-between"><Link href={`/stock/${i.id}`} className="hover:text-acento">{i.nombre}</Link><span className="text-estado-alerta-txt font-medium">{i.cantidad.toLocaleString("es-AR")} {i.unidad}</span></li>)}</ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
