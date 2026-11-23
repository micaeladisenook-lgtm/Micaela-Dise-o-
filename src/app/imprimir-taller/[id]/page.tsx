import { notFound } from "next/navigation";
import BotonImprimir from "@/components/BotonImprimir";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { permisosDe } from "@/lib/acceso";
import { fecha } from "@/lib/formato";
import { hoyAR } from "@/lib/pedidos";
import { vistaTarea, itemDeTarea } from "@/lib/vistaTaller";
import { tareasDeSemana } from "@/lib/datosTalleres";

export default async function ImprimirTallerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fecha?: string }> }) {
  const u = await requerirUsuario();
  const { id } = await params;
  if (u.rol === "TALLER" ? u.tallerId !== id : !(await permisosDe(u)).has("enviar_listas_talleres")) notFound();
  const sp = await searchParams;
  const taller = await db.taller.findUnique({ where: { id } });
  if (!taller) notFound();
  const base = sp.fecha ? new Date(`${sp.fecha}T12:00:00-03:00`) : hoyAR();
  const { sem, tareas } = await tareasDeSemana(base, id);
  const pendientes = tareas.filter((t) => t.etapa !== "LISTO");
  return (
    <div className="min-h-screen bg-white p-6 md:p-10 max-w-[900px] mx-auto">
      <div className="no-imprimir mb-4"><BotonImprimir texto="Imprimir / guardar PDF" /></div>
      <header className="flex items-end justify-between border-b border-borde pb-3 mb-4">
        <div>
          <p className="titulo text-3xl italic text-acento">Micaela Diseño</p>
          <h1 className="text-2xl">Trabajos de {taller.nombre}</h1>
          <p className="text-sm text-texto-2">{taller.especialidad}</p>
        </div>
        <p className="text-sm text-right">Semana del {fecha(sem.inicio)}<br />al {fecha(sem.fin)}</p>
      </header>
      {pendientes.length === 0 ? <p>No hay trabajos pendientes.</p> : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b-2 border-texto">
              <th className="py-2 w-8">✓</th><th>Pedido</th><th>Trabajo</th><th>Detalles</th><th>Fechas</th>
            </tr>
          </thead>
          <tbody>
            {pendientes.map((t) => {
              const v = vistaTarea(t.taller.funcion, t, itemDeTarea(t.clave, t.pedido.items));
              return (
                <tr key={t.id} className="border-b border-borde align-top break-inside-avoid">
                  <td className="py-2"><span className="inline-block w-5 h-5 border-2 border-texto rounded" /></td>
                  <td className="py-2 pr-2 whitespace-nowrap">N° {t.pedido.numero}{t.pedido.prioridad && <strong className="block text-xs">PRIORIDAD</strong>}</td>
                  <td className="py-2 pr-2"><span className="block text-xs uppercase text-texto-2">{v.accion}</span>{v.prenda}</td>
                  <td className="py-2 pr-2">
                    {v.datos.map((d) => <p key={d.etiqueta}><span className="text-texto-2">{d.etiqueta}:</span> {d.destacado ? <strong>{d.valor}</strong> : d.valor}</p>)}
                    {v.notas.map((n, i) => <p key={i} className="text-texto-2">{n}</p>)}
                    {v.fotos.length > 0 && <div className="flex gap-1 mt-1">{v.fotos.map((u) => <img key={u} src={u} alt="Dónde va el bordado" className="w-24 h-24 object-cover rounded border border-texto" />)}</div>}
                    {v.conDisenos && t.pedido.disenos.length > 0 && <div className="flex gap-1 mt-1">{t.pedido.disenos.map(({ diseno: d }) => <img key={d.id} src={d.imagen} alt={d.nombre} className="w-14 h-14 object-cover rounded" />)}</div>}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    {t.pedido.fechaEntrega && <p>Entrega {fecha(t.pedido.fechaEntrega)}</p>}
                    {t.pedido.fechaEvento && <p>Evento {fecha(t.pedido.fechaEvento)}</p>}
                    {!t.pedido.fechaEntrega && !t.pedido.fechaEvento && "—"}
                    {t.grupo === "atrasadas" && <strong className="block text-xs">ATRASADO</strong>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="text-xs text-texto-2 mt-6">Impreso el {fecha(new Date())} · {pendientes.length} trabajos</p>
    </div>
  );
}
