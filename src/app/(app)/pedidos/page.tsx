import Link from "next/link";
import { MessageCircle, Settings2, Link2 } from "lucide-react";
import Encabezado from "@/components/Encabezado";
import EstadoChip from "@/components/EstadoChip";
import Filtros from "./Filtros";
import { db } from "@/lib/db";
import { fecha, pesos, linkWhatsApp } from "@/lib/formato";
import { atrasado, saldo, armarMensaje, semana, hoyAR, enSemana, fechaGuia } from "@/lib/pedidos";
import type { Prisma } from "@prisma/client";
import { requerirPermiso } from "@/lib/acceso";

const VISTAS = [
  { k: "semana", t: "Esta semana" },
  { k: "proxima", t: "Próxima semana" },
  { k: "activos", t: "Activos" },
  { k: "NUEVO", t: "Nuevos" },
  { k: "EN_PRODUCCION", t: "En producción" },
  { k: "LISTO", t: "Listos" },
  { k: "atrasados", t: "Atrasados" },
  { k: "revisar", t: "Para revisar" },
  { k: "ENTREGADO", t: "Entregados" },
  { k: "CANCELADO", t: "Cancelados" },
  { k: "todos", t: "Todos" },
] as const;
const POR_PAGINA = 60;

export default async function PedidosPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; estado?: string; vendedora?: string; pago?: string; pagina?: string }> }) {
  await requerirPermiso("ver_pedidos");
  const sp = await searchParams;
  const vista = sp.estado ?? "semana";
  const estaSemana = semana();
  const proxima = semana(hoyAR(), 1);
  const q = (sp.q ?? "").trim();
  const num = /^\D{0,3}\d+$/.test(q) ? parseInt(q.replace(/\D/g, ""), 10) : NaN;

  const where: Prisma.PedidoWhereInput = {
    ...(sp.vendedora ? { vendedorId: sp.vendedora } : {}),
    ...(q
      ? {
          OR: [
            { cliente: { nombre: { contains: q, mode: "insensitive" } } },
            { cliente: { instagram: { contains: q.replace(/^@/, ""), mode: "insensitive" } } },
            { items: { some: { bordadoTexto: { contains: q, mode: "insensitive" } } } },
            ...(Number.isFinite(num) ? [{ numero: num }, { cliente: { numero: num } }] : []),
          ],
        }
      : {}),
  };

  const [todos, vendedores, plantilla] = await Promise.all([
    db.pedido.findMany({
      where,
      include: {
        cliente: true, vendedor: true, pagos: { select: { monto: true } },
        items: { select: { nombre: true, cantidad: true, persona: true, bordadoTexto: true, bordadoUbicacion: true, hilo: true, prendas: { select: { nombre: true, color: true, talle: true } } } },
      },
    }),
    db.usuario.findMany({ where: { rol: { in: ["ADMIN", "VENDEDOR"] } }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    db.plantilla.findUnique({ where: { clave: "saldo" } }),
  ]);

  const conPago = todos.filter((p) => {
    const s = saldo(p.total, p.pagos);
    if (sp.pago === "deuda") return s > 0 && p.estado !== "CANCELADO";
    if (sp.pago === "pagado") return s === 0;
    return true;
  });

  const enVista = (p: (typeof todos)[number], v: string) => {
    if (v === "todos") return true;
    if (v === "activos") return ["NUEVO", "EN_PRODUCCION", "LISTO"].includes(p.estado);
    if (v === "semana") return p.estado !== "CANCELADO" && enSemana(fechaGuia(p), estaSemana);
    if (v === "proxima") return p.estado !== "CANCELADO" && enSemana(fechaGuia(p), proxima);
    if (v === "atrasados") return atrasado(p);
    if (v === "revisar") return !!p.revisar;
    return p.estado === v;
  };
  const cuentas = Object.fromEntries(VISTAS.map((v) => [v.k, conPago.filter((p) => enVista(p, v.k)).length]));

  const clave = (p: (typeof todos)[number]) => fechaGuia(p)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const lista = conPago
    .filter((p) => enVista(p, vista))
    .sort((a, b) => (["ENTREGADO", "CANCELADO", "todos"].includes(vista) ? clave(b) - clave(a) : clave(a) - clave(b)));
  const pagina = Math.max(1, parseInt(sp.pagina ?? "1", 10) || 1);
  const visibles = lista.slice(0, pagina * POR_PAGINA);
  const urlCon = (cambios: Record<string, string>) => {
    const n = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    Object.entries(cambios).forEach(([k, v]) => n.set(k, v));
    return `/pedidos?${n.toString()}`;
  };

  return (
    <>
      <Encabezado titulo="Pedidos" subtitulo={vista === "semana" ? `Prioridad de esta semana: eventos del ${fecha(estaSemana.inicio)} al ${fecha(estaSemana.fin)}` : vista === "proxima" ? `Eventos del ${fecha(proxima.inicio)} al ${fecha(proxima.fin)}` : `${todos.length} pedidos en total`}>
        <Link href="/pedidos/mensajes" className="btn-suave"><Settings2 size={16} /> Mensajes de WhatsApp</Link>
        <Link href="/pedido" target="_blank" className="btn-suave"><Link2 size={16} /> Formulario para clientas</Link>
        <Link href="/pedidos/nuevo" className="btn-primario">+ Nuevo pedido</Link>
      </Encabezado>

      <Filtros vendedores={vendedores} />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {VISTAS.map((v) => {
          const on = v.k === vista;
          return (
            <Link key={v.k} href={urlCon({ estado: v.k, pagina: "1" })}
              className={`shrink-0 min-h-11 px-4 inline-flex items-center gap-2 rounded-full text-sm border ${on ? "bg-acento text-white border-acento" : (v.k === "atrasados" || v.k === "revisar") && cuentas[v.k] ? "bg-estado-alerta text-estado-alerta-txt border-transparent" : "bg-white border-borde hover:border-acento"}`}>
              {v.t} <span className={on ? "opacity-80" : "text-texto-2"}>{cuentas[v.k]}</span>
            </Link>
          );
        })}
      </div>

      {lista.length === 0 ? (
        <div className="tarjeta p-8 text-center text-texto-2">No hay pedidos con estos filtros.</div>
      ) : (
        <>
          <div className="tarjeta overflow-x-auto hidden lg:block">
            <table className="tabla w-full min-w-[1000px]">
              <thead>
                <tr><th>Pedido</th><th>Clienta</th><th>Productos</th><th>Evento</th><th>Vendedora</th><th className="text-right!">Total</th><th className="text-right!">Saldo</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {visibles.map((p) => {
                  const s = saldo(p.total, p.pagos);
                  const tarde = atrasado(p);
                  const wa = s > 0 ? linkWhatsApp(p.cliente.telefono, armarMensaje(plantilla?.texto ?? "", { ...p, items: p.items })) : linkWhatsApp(p.cliente.telefono);
                  return (
                    <tr key={p.id} className="hover:bg-fondo">
                      <td><Link href={`/pedidos/${p.id}`} className="font-semibold text-acento hover:underline">N° {p.numero}</Link>{p.prioridad && <span className="block text-[11px] text-acento font-medium">PRIORIDAD</span>}</td>
                      <td><Link href={`/clientes/${p.cliente.id}`} className="hover:text-acento">{p.cliente.nombre}</Link><span className="block text-xs text-texto-2">N° {p.cliente.numero}</span></td>
                      <td className="max-w-[260px]">
                        {p.items.slice(0, 3).map((i, k) => <span key={k} className="block truncate">{i.cantidad > 1 ? `${i.cantidad}× ` : ""}{i.nombre}</span>)}
                        {p.items.length > 3 && <span className="text-xs text-texto-2">+{p.items.length - 3} más</span>}
                        {p.items[0]?.bordadoTexto && <span className="block text-xs text-texto-2 truncate">“{p.items[0].bordadoTexto}”</span>}
                      </td>
                      <td className={tarde ? "text-estado-alerta-txt font-medium" : ""}>
                        {p.fechaEvento ? fecha(p.fechaEvento) : <span className="text-texto-2">Sin fecha</span>}
                        {p.evento && <span className="block text-xs text-texto-2">{p.evento}</span>}
                        {p.fechaEntrega && <span className="block text-xs text-texto-2">Entrega {fecha(p.fechaEntrega)}</span>}
                      </td>
                      <td className="text-texto-2">{p.vendedor?.nombre ?? "—"}</td>
                      <td className="text-right whitespace-nowrap">{pesos(p.total)}</td>
                      <td className={`text-right whitespace-nowrap ${s > 0 ? "text-estado-alerta-txt font-medium" : "text-texto-2"}`}>{s > 0 ? pesos(s) : "—"}</td>
                      <td><EstadoChip estado={p.estado} atrasado={tarde} /></td>
                      <td>{wa && <a href={wa} target="_blank" title={s > 0 ? "Recordar saldo por WhatsApp" : "Abrir WhatsApp"} className="inline-flex w-11 h-11 items-center justify-center rounded-full text-[#1E8E4E] hover:bg-estado-listo"><MessageCircle size={18} /></a>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-2">
            {visibles.map((p) => {
              const s = saldo(p.total, p.pagos);
              const tarde = atrasado(p);
              return (
                <Link key={p.id} href={`/pedidos/${p.id}`} className="tarjeta p-4 block">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate"><span className="text-acento">N° {p.numero}</span> · {p.cliente.nombre}</p>
                      <p className="text-xs text-texto-2 truncate">{p.items.map((i) => i.nombre).join(", ")}</p>
                    </div>
                    <EstadoChip estado={p.estado} atrasado={tarde} />
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-texto-2">{p.fechaEvento ? `Evento ${fecha(p.fechaEvento)}` : p.fechaEntrega ? `Entrega ${fecha(p.fechaEntrega)}` : "Sin fecha"}</span>
                    <span>{pesos(p.total)}{s > 0 && <span className="text-estado-alerta-txt font-medium"> · debe {pesos(s)}</span>}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {visibles.length < lista.length && (
            <div className="text-center mt-4">
              <Link href={urlCon({ pagina: String(pagina + 1) })} scroll={false} className="btn-secundario">Ver más ({lista.length - visibles.length} restantes)</Link>
            </div>
          )}
        </>
      )}
    </>
  );
}
