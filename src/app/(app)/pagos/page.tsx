import Link from "next/link";
import { MessageCircle } from "lucide-react";
import Encabezado from "@/components/Encabezado";
import EstadoChip from "@/components/EstadoChip";
import { db } from "@/lib/db";
import { fecha, pesos, linkWhatsApp } from "@/lib/formato";
import { armarMensaje, saldo, pagado, NOMBRE_MEDIO, hoyAR, fechaGuia, atrasado } from "@/lib/pedidos";

export default async function PagosPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const hoy = hoyAR();
  const [anio, mes] = (sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoy.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).slice(0, 7)).split("-").map(Number);
  const desde = new Date(`${anio}-${String(mes).padStart(2, "0")}-01T00:00:00-03:00`);
  const hasta = new Date(new Date(desde).setMonth(desde.getMonth() + 1));
  const mesAnterior = new Date(new Date(desde).setMonth(desde.getMonth() - 1)).toLocaleDateString("en-CA").slice(0, 7);
  const mesSiguiente = hasta.toLocaleDateString("en-CA").slice(0, 7);
  const nombreMes = desde.toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });

  const [conDeuda, pagosMes, plantilla] = await Promise.all([
    db.pedido.findMany({
      where: { estado: { not: "CANCELADO" } },
      include: {
        cliente: true, pagos: { select: { monto: true } },
        items: { select: { nombre: true, cantidad: true, persona: true, bordadoTexto: true, bordadoUbicacion: true, hilo: true, prendas: { select: { nombre: true, color: true, talle: true } } } },
      },
    }),
    db.pago.findMany({ where: { fecha: { gte: desde, lt: hasta } }, include: { pedido: { include: { cliente: true } } }, orderBy: { fecha: "desc" } }),
    db.plantilla.findUnique({ where: { clave: "saldo" } }),
  ]);

  const deudas = conDeuda
    .map((p) => ({ p, s: saldo(p.total, p.pagos) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => (fechaGuia(a.p)?.getTime() ?? 9e15) - (fechaGuia(b.p)?.getTime() ?? 9e15));
  const totalDeuda = deudas.reduce((s, x) => s + x.s, 0);
  const cobradoMes = pagosMes.reduce((s, p) => s + p.monto, 0);
  const porMedio = Object.entries(pagosMes.reduce<Record<string, number>>((acc, p) => ((acc[p.medio] = (acc[p.medio] ?? 0) + p.monto), acc), {}));
  const estimadas = deudas.filter((x) => x.p.revisar).reduce((s, x) => s + x.s, 0);

  return (
    <>
      <Encabezado titulo="Pagos" subtitulo="Señas, pagos parciales y lo que falta cobrar" />

      <div className="grid sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="tarjeta p-5">
          <p className="text-sm text-texto-2">Por cobrar</p>
          <p className="titulo text-4xl text-estado-alerta-txt">{pesos(totalDeuda)}</p>
          <p className="text-xs text-texto-2 mt-1">{deudas.length} pedidos con saldo{estimadas ? ` · ${pesos(estimadas)} a revisar (importados)` : ""}</p>
        </div>
        <div className="tarjeta p-5">
          <p className="text-sm text-texto-2">Cobrado en {nombreMes}</p>
          <p className="titulo text-4xl">{pesos(cobradoMes)}</p>
          <p className="text-xs text-texto-2 mt-1">{pagosMes.length} pagos</p>
        </div>
        <div className="tarjeta p-5">
          <p className="text-sm text-texto-2 mb-1">Por medio de pago</p>
          {porMedio.length === 0 ? <p className="text-sm text-texto-2">Sin pagos este mes.</p> : (
            <ul className="text-sm space-y-0.5">{porMedio.map(([m, v]) => <li key={m} className="flex justify-between"><span>{NOMBRE_MEDIO[m]}</span><span>{pesos(v)}</span></li>)}</ul>
          )}
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-2xl mb-3">Pedidos con deuda</h2>
        {deudas.length === 0 ? <div className="tarjeta p-6 text-texto-2 text-center">¡No hay deudas! 🎉</div> : (
          <div className="tarjeta overflow-x-auto">
            <table className="tabla w-full min-w-[820px]">
              <thead><tr><th>Pedido</th><th>Clienta</th><th>Evento</th><th>Estado</th><th className="text-right!">Total</th><th className="text-right!">Pagado</th><th className="text-right!">Saldo</th><th></th></tr></thead>
              <tbody>
                {deudas.map(({ p, s }) => {
                  const wa = linkWhatsApp(p.cliente.telefono, armarMensaje(plantilla?.texto ?? "", p));
                  return (
                    <tr key={p.id} className="hover:bg-fondo">
                      <td><Link href={`/pedidos/${p.id}`} className="font-semibold text-acento hover:underline">N° {p.numero}</Link>{p.revisar && <span className="block text-[11px] text-estado-produccion-txt">a revisar</span>}</td>
                      <td>{p.cliente.nombre}<span className="block text-xs text-texto-2">{p.cliente.telefono ?? "sin teléfono"}</span></td>
                      <td className={atrasado(p) ? "text-estado-alerta-txt font-medium" : ""}>{fechaGuia(p) ? fecha(fechaGuia(p)) : "—"}</td>
                      <td><EstadoChip estado={p.estado} /></td>
                      <td className="text-right">{pesos(p.total)}</td>
                      <td className="text-right text-texto-2">{pesos(pagado(p.pagos))}</td>
                      <td className="text-right font-semibold text-estado-alerta-txt">{pesos(s)}</td>
                      <td className="text-right whitespace-nowrap">
                        {wa ? <a href={wa} target="_blank" className="btn-secundario min-h-10 px-3 text-xs"><MessageCircle size={14} /> Recordar</a>
                          : <Link href={`/clientes/${p.cliente.id}`} className="text-xs text-texto-2 underline">cargar WhatsApp</Link>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-2xl capitalize">Pagos de {nombreMes}</h2>
          <div className="flex gap-2">
            <Link href={`/pagos?mes=${mesAnterior}`} className="btn-suave min-h-10 px-4">← Anterior</Link>
            <Link href={`/pagos?mes=${mesSiguiente}`} className="btn-suave min-h-10 px-4">Siguiente →</Link>
          </div>
        </div>
        {pagosMes.length === 0 ? <div className="tarjeta p-6 text-texto-2 text-center">No hay pagos registrados en este mes.</div> : (
          <div className="tarjeta overflow-x-auto">
            <table className="tabla w-full min-w-[640px]">
              <thead><tr><th>Fecha</th><th>Pedido</th><th>Clienta</th><th>Medio</th><th>Nota</th><th className="text-right!">Monto</th></tr></thead>
              <tbody>
                {pagosMes.map((g) => (
                  <tr key={g.id}>
                    <td>{fecha(g.fecha)}</td>
                    <td><Link href={`/pedidos/${g.pedidoId}`} className="text-acento hover:underline">N° {g.pedido.numero}</Link></td>
                    <td>{g.pedido.cliente.nombre}</td>
                    <td>{NOMBRE_MEDIO[g.medio]}{g.esSena ? " · seña" : ""}</td>
                    <td className="text-texto-2 text-xs">{g.nota ?? ""}</td>
                    <td className="text-right font-medium">{pesos(g.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
