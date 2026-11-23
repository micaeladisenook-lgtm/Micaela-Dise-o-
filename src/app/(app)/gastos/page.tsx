import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import { FormGasto, BorrarGasto } from "./Formularios";
import { db } from "@/lib/db";

import { fecha, pesos } from "@/lib/formato";
import { hoyAR, fechaInput } from "@/lib/pedidos";
import { requerirPermiso } from "@/lib/acceso";

export default async function GastosPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await requerirPermiso("ver_gastos");
  const sp = await searchParams;
  const hoy = hoyAR();
  const mesIso = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : fechaInput(hoy).slice(0, 7);
  const desde = new Date(`${mesIso}-01T00:00:00-03:00`);
  const hasta = new Date(new Date(desde).setMonth(desde.getMonth() + 1));
  const mesAnt = fechaInput(new Date(new Date(desde).setMonth(desde.getMonth() - 1)));
  const nombreMes = desde.toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });

  const [gastos, talleres, ventas, cobrado] = await Promise.all([
    db.gasto.findMany({ where: { fecha: { gte: desde, lt: hasta } }, include: { taller: true }, orderBy: { fecha: "desc" } }),
    db.taller.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    db.pedido.aggregate({ where: { estado: { not: "CANCELADO" }, fechaPedido: { gte: desde, lt: hasta } }, _sum: { total: true } }),
    db.pago.aggregate({ where: { fecha: { gte: desde, lt: hasta } }, _sum: { monto: true } }),
  ]);
  const total = gastos.reduce((s, g) => s + g.monto, 0);
  const porCat = Object.entries(gastos.reduce<Record<string, number>>((a, g) => ((a[g.categoria] = (a[g.categoria] ?? 0) + g.monto), a), {})).sort((a, b) => b[1] - a[1]);
  const max = porCat[0]?.[1] ?? 1;
  const ventasMes = ventas._sum.total ?? 0;
  const cobradoMes = cobrado._sum.monto ?? 0;

  return (
    <>
      <Encabezado titulo="Gastos" subtitulo="Solo lo ve la administradora." />
      <div className="flex items-center justify-between gap-2 mb-5">
        <h2 className="text-2xl capitalize">{nombreMes}</h2>
        <div className="flex gap-2">
          <Link href={`/gastos?mes=${mesAnt.slice(0, 7)}`} className="btn-suave min-h-10 px-4">← Anterior</Link>
          <Link href={`/gastos?mes=${fechaInput(hasta).slice(0, 7)}`} className="btn-suave min-h-10 px-4">Siguiente →</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="tarjeta p-4 md:p-5"><p className="text-sm text-texto-2">Ventas del mes</p><p className="titulo text-3xl">{pesos(ventasMes)}</p></div>
        <div className="tarjeta p-4 md:p-5"><p className="text-sm text-texto-2">Cobrado del mes</p><p className="titulo text-3xl">{pesos(cobradoMes)}</p></div>
        <div className="tarjeta p-4 md:p-5"><p className="text-sm text-texto-2">Gastos del mes</p><p className="titulo text-3xl text-estado-alerta-txt">{pesos(total)}</p></div>
        <div className="tarjeta p-4 md:p-5"><p className="text-sm text-texto-2">Ganancia estimada</p><p className={`titulo text-3xl ${ventasMes - total >= 0 ? "text-estado-listo-txt" : "text-estado-alerta-txt"}`}>{pesos(ventasMes - total)}</p><p className="text-[11px] text-texto-2">ventas − gastos</p></div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="space-y-5">
          <section className="tarjeta p-5">
            <h2 className="text-2xl mb-3">Por categoría</h2>
            {porCat.length === 0 ? <p className="text-sm text-texto-2">Sin gastos este mes.</p> : (
              <ul className="space-y-2.5">
                {porCat.map(([c, v]) => (
                  <li key={c}>
                    <div className="flex justify-between text-sm mb-1"><span>{c}</span><span className="font-medium">{pesos(v)} <span className="text-texto-2 font-normal">· {Math.round((100 * v) / total)}%</span></span></div>
                    <div className="h-2.5 rounded-full bg-menu overflow-hidden"><div className="h-full rounded-full bg-acento" style={{ width: `${(100 * v) / max}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="tarjeta overflow-x-auto">
            <table className="tabla w-full min-w-[560px]">
              <thead><tr><th>Fecha</th><th>Categoría</th><th>Detalle</th><th className="text-right!">Monto</th><th></th></tr></thead>
              <tbody>
                {gastos.map((g) => (
                  <tr key={g.id}>
                    <td>{fecha(g.fecha)}</td>
                    <td>{g.categoria}{g.taller ? ` · ${g.taller.nombre}` : ""}</td>
                    <td className="text-texto-2">{g.descripcion ?? "—"}{g.medio ? ` · ${g.medio}` : ""}</td>
                    <td className="text-right font-medium">{pesos(g.monto)}</td>
                    <td className="text-right"><BorrarGasto id={g.id} /></td>
                  </tr>
                ))}
                {gastos.length === 0 && <tr><td colSpan={5} className="text-center text-texto-2">No hay gastos cargados en este mes.</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
        <aside className="tarjeta p-5 lg:sticky lg:top-6">
          <h2 className="text-2xl mb-3">Cargar gasto</h2>
          <FormGasto talleres={talleres} hoy={fechaInput(hoy)} />
        </aside>
      </div>
    </>
  );
}
