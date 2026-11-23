import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import Encabezado from "@/components/Encabezado";
import EstadoChip from "@/components/EstadoChip";
import { db } from "@/lib/db";
import { fecha, pesos } from "@/lib/formato";
import { COLOR_ESTADO, NOMBRE_ESTADO, ESTADOS, atrasado, fechaGuia, hoyAR, semana, saldo } from "@/lib/pedidos";
import { requerirPermiso } from "@/lib/acceso";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const iso = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
const diaDe = (d: Date) => new Date(`${iso(d)}T12:00:00-03:00`);

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<{ vista?: string; fecha?: string }> }) {
  await requerirPermiso("ver_calendario");
  const sp = await searchParams;
  const vista = sp.vista === "mes" ? "mes" : "semana";
  const hoy = hoyAR();
  const base = sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? new Date(`${sp.fecha}T12:00:00-03:00`) : hoy;

  // rango a mostrar
  let inicio: Date, fin: Date, titulo: string, anterior: string, siguiente: string;
  if (vista === "semana") {
    ({ inicio, fin } = semana(base));
    titulo = `Semana del ${fecha(inicio)} al ${fecha(fin)}`;
    anterior = iso(new Date(base.getTime() - 7 * 864e5));
    siguiente = iso(new Date(base.getTime() + 7 * 864e5));
  } else {
    const primero = new Date(`${iso(base).slice(0, 8)}01T12:00:00-03:00`);
    const ultimo = new Date(new Date(primero).setMonth(primero.getMonth() + 1) - 864e5);
    inicio = semana(primero).inicio;
    fin = semana(ultimo).fin;
    titulo = primero.toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });
    anterior = iso(new Date(new Date(primero).setMonth(primero.getMonth() - 1)));
    siguiente = iso(new Date(new Date(primero).setMonth(primero.getMonth() + 1)));
  }
  const mesActual = iso(base).slice(0, 7);

  const [pedidos, proximos, pendientes] = await Promise.all([
    db.pedido.findMany({
      where: { estado: { not: "CANCELADO" }, OR: [{ fechaEvento: { gte: inicio, lte: fin } }, { fechaEvento: null, fechaEntrega: { gte: inicio, lte: fin } }] },
      include: { cliente: true, items: { select: { nombre: true, bordadoTexto: true } } },
    }),
    db.pedido.findMany({
      where: { estado: { notIn: ["CANCELADO", "ENTREGADO"] }, fechaEvento: { gte: new Date(hoy.getTime() - 12 * 3600e3), lte: new Date(hoy.getTime() + 30 * 864e5) } },
      include: { cliente: true, pagos: { select: { monto: true } } },
      orderBy: { fechaEvento: "asc" },
    }),
    db.pedido.findMany({
      where: { estado: { in: ["NUEVO", "EN_PRODUCCION", "LISTO"] } },
      include: { cliente: true },
    }),
  ]);

  const dias: Date[] = [];
  for (let t = diaDe(inicio).getTime(); t <= fin.getTime(); t += 864e5) dias.push(new Date(t));
  const delDia = (d: Date) =>
    pedidos.filter((p) => iso(fechaGuia(p)!) === iso(d)).sort((a, b) => a.numero - b.numero);

  const atrasados = pendientes.filter((p) => atrasado(p));
  const en7 = pendientes.filter((p) => {
    const g = fechaGuia(p);
    return g && p.estado !== "LISTO" && !atrasado(p) && g.getTime() <= hoy.getTime() + 7 * 864e5;
  });
  const url = (cambios: Record<string, string>) => `/calendario?${new URLSearchParams({ vista, fecha: iso(base), ...cambios })}`;

  return (
    <>
      <Encabezado titulo="Calendario de entregas" subtitulo="Organizado por fecha del evento: la semana del evento es la prioridad.">
        <div className="inline-flex gap-1 bg-menu rounded-full p-1">
          {(["semana", "mes"] as const).map((v) => (
            <Link key={v} href={url({ vista: v })} className={`min-h-10 px-5 inline-flex items-center rounded-full text-sm ${vista === v ? "bg-white border border-borde font-medium text-acento" : "text-texto-2"}`}>
              {v === "semana" ? "Semana" : "Mes"}
            </Link>
          ))}
        </div>
      </Encabezado>

      {(atrasados.length > 0 || en7.length > 0) && (
        <div className="grid md:grid-cols-2 gap-3 mb-5">
          {atrasados.length > 0 && (
            <Link href="/pedidos?estado=atrasados" className="rounded-tarjeta bg-estado-alerta text-estado-alerta-txt p-4 flex gap-3 items-start">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <span><strong>{atrasados.length} pedido{atrasados.length > 1 ? "s" : ""} atrasado{atrasados.length > 1 ? "s" : ""}</strong>: el evento ya pasó y no figura como entregado.<br /><span className="text-sm">{atrasados.slice(0, 4).map((p) => `N° ${p.numero} ${p.cliente.nombre}`).join(" · ")}</span></span>
            </Link>
          )}
          {en7.length > 0 && (
            <div className="rounded-tarjeta bg-estado-produccion text-estado-produccion-txt p-4 flex gap-3 items-start">
              <Clock size={20} className="shrink-0 mt-0.5" />
              <span><strong>{en7.length} pedido{en7.length > 1 ? "s" : ""} con evento en los próximos 7 días</strong> que todavía no están listos.<br />
                <span className="text-sm">{en7.slice(0, 5).map((p) => `N° ${p.numero} (${fecha(fechaGuia(p))})`).join(" · ")}</span></span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mb-3">
        <Link href={url({ fecha: anterior })} className="w-11 h-11 rounded-full bg-white border border-borde flex items-center justify-center hover:border-acento" aria-label="Anterior"><ChevronLeft size={20} /></Link>
        <div className="text-center">
          <h2 className={`text-2xl ${vista === "mes" ? "capitalize" : ""}`}>{titulo}</h2>
          <Link href={url({ fecha: iso(hoy) })} className="text-xs text-acento hover:underline">Ir a hoy</Link>
        </div>
        <Link href={url({ fecha: siguiente })} className="w-11 h-11 rounded-full bg-white border border-borde flex items-center justify-center hover:border-acento" aria-label="Siguiente"><ChevronRight size={20} /></Link>
      </div>

      {vista === "semana" ? (
        <div className="grid lg:grid-cols-7 gap-2 mb-5">
          {dias.map((d, i) => {
            const lista = delDia(d);
            const esHoy = iso(d) === iso(hoy);
            return (
              <div key={i} className={`tarjeta p-2 min-h-32 ${esHoy ? "ring-2 ring-acento" : ""}`}>
                <p className={`text-xs font-semibold px-1 mb-2 ${esHoy ? "text-acento" : "text-texto-2"}`}>{DIAS[i]} {fecha(d).slice(0, 5)} {lista.length > 0 && <span className="font-normal">· {lista.length}</span>}</p>
                <div className="space-y-1.5">
                  {lista.map((p) => (
                    <Link key={p.id} href={`/pedidos/${p.id}`} className={`block rounded-lg px-2 py-1.5 text-xs leading-snug hover:opacity-80 ${atrasado(p) ? "bg-estado-alerta text-estado-alerta-txt" : COLOR_ESTADO[p.estado]}`}>
                      <span className="font-semibold">N° {p.numero}</span> · {p.cliente.nombre}
                      <span className="block opacity-80 truncate">{p.items[0]?.nombre}{p.items.length > 1 ? ` +${p.items.length - 1}` : ""}</span>
                      {p.items[0]?.bordadoTexto && <span className="block opacity-70 truncate">“{p.items[0].bordadoTexto}”</span>}
                      {p.prioridad && <span className="block font-semibold">PRIORIDAD</span>}
                    </Link>
                  ))}
                  {lista.length === 0 && <p className="text-xs text-texto-2/60 px-1">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="tarjeta overflow-hidden mb-5">
          <div className="grid grid-cols-7 border-b border-borde">
            {DIAS.map((d) => <div key={d} className="text-xs font-semibold text-texto-2 px-2 py-2 text-center">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {dias.map((d, i) => {
              const lista = delDia(d);
              const fuera = iso(d).slice(0, 7) !== mesActual;
              const esHoy = iso(d) === iso(hoy);
              return (
                <Link key={i} href={`/calendario?vista=semana&fecha=${iso(d)}`} className={`min-h-20 md:min-h-28 border-b border-r border-borde p-1 md:p-1.5 hover:bg-fondo ${fuera ? "bg-fondo/60 text-texto-2/50" : ""}`}>
                  <p className={`text-xs mb-1 ${esHoy ? "inline-flex w-6 h-6 rounded-full bg-acento text-white items-center justify-center" : ""}`}>{d.getUTCDate()}</p>
                  <div className="space-y-0.5 hidden md:block">
                    {lista.slice(0, 3).map((p) => (
                      <span key={p.id} className={`block truncate rounded px-1 text-[11px] ${atrasado(p) ? "bg-estado-alerta text-estado-alerta-txt" : COLOR_ESTADO[p.estado]}`}>N° {p.numero} {p.cliente.nombre.split(" ")[0]}</span>
                    ))}
                    {lista.length > 3 && <span className="block text-[11px] text-texto-2">+{lista.length - 3} más</span>}
                  </div>
                  {lista.length > 0 && <span className="md:hidden inline-flex min-w-5 h-5 px-1 rounded-full bg-acento text-white text-[10px] items-center justify-center">{lista.length}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center mb-8 text-xs">
        <span className="text-texto-2">Colores:</span>
        {ESTADOS.filter((e) => e !== "CANCELADO").map((e) => <span key={e} className={`chip ${COLOR_ESTADO[e]}`}>{NOMBRE_ESTADO[e]}</span>)}
        <span className="chip bg-estado-alerta text-estado-alerta-txt">Atrasado</span>
      </div>

      <section>
        <h2 className="text-2xl mb-3">Próximos eventos (30 días)</h2>
        {proximos.length === 0 ? <div className="tarjeta p-6 text-center text-texto-2">No hay eventos en los próximos 30 días.</div> : (
          <div className="tarjeta overflow-x-auto">
            <table className="tabla w-full min-w-[680px]">
              <thead><tr><th>Fecha de la fiesta</th><th>Entrega</th><th>Pedido</th><th>Clienta</th><th>Evento</th><th>Estado</th><th className="text-right!">Saldo</th></tr></thead>
              <tbody>
                {proximos.map((p) => {
                  const s = saldo(p.total, p.pagos);
                  return (
                    <tr key={p.id}>
                      <td className="font-medium">{fecha(p.fechaEvento)}</td>
                      <td className="text-texto-2">{p.fechaEntrega ? fecha(p.fechaEntrega) : "—"}</td>
                      <td><Link href={`/pedidos/${p.id}`} className="text-acento font-semibold hover:underline">N° {p.numero}</Link></td>
                      <td>{p.cliente.nombre}</td>
                      <td className="text-texto-2">{[p.evento, p.eventoDetalle?.replace(/^Evento: /, "")].filter(Boolean).join(" · ") || "—"}</td>
                      <td><EstadoChip estado={p.estado} /></td>
                      <td className={`text-right ${s > 0 ? "text-estado-alerta-txt font-medium" : "text-texto-2"}`}>{s > 0 ? pesos(s) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
