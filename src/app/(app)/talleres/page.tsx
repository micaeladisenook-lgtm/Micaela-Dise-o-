import Link from "next/link";
import { ChevronLeft, ChevronRight, MessageCircle, Printer, Pencil } from "lucide-react";
import Encabezado from "@/components/Encabezado";
import TableroTaller, { type Tarjeta } from "./TableroTaller";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { fecha, linkWhatsApp } from "@/lib/formato";
import { hoyAR } from "@/lib/pedidos";
import { bloqueadaPor, NOMBRE_FUNCION } from "@/lib/produccion";
import { tareasDeSemana, lineaTarea, type TareaSemana } from "@/lib/datosTalleres";
import { requerirPermiso, permisosDe } from "@/lib/acceso";
import { vistaTarea, itemDeTarea, ACCION_FUNCION } from "@/lib/vistaTaller";


const iso = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
export default async function TalleresPage({ searchParams }: { searchParams: Promise<{ fecha?: string; taller?: string }> }) {
  const u = await requerirUsuario();
  if (u.rol !== "TALLER") await requerirPermiso("ver_talleres");
  const sp = await searchParams;
  const base = sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? new Date(`${sp.fecha}T12:00:00-03:00`) : hoyAR();
  const { sem, tareas, esActual } = await tareasDeSemana(base, u.rol === "TALLER" ? u.tallerId ?? "-" : undefined);
  const [talleres, plantilla] = await Promise.all([
    db.taller.findMany({ where: { activo: true, ...(u.rol === "TALLER" ? { id: u.tallerId ?? "-" } : {}) }, orderBy: { orden: "asc" } }),
    db.plantilla.findUnique({ where: { clave: "taller" } }),
  ]);
  const textoSemana = `${fecha(sem.inicio)} al ${fecha(sem.fin)}`;
  const tal = talleres.find((t) => t.id === sp.taller) ?? talleres[0];
  const permisos = await permisosDe(u);
  const verPedido = u.rol !== "TALLER" && permisos.has("ver_pedidos");
  const url = (q: { fecha?: string; taller?: string }) => {
    const p = new URLSearchParams();
    const f = "fecha" in q ? q.fecha : sp.fecha;
    if (f) p.set("fecha", f);
    const t = q.taller ?? tal?.id;
    if (t && talleres.length > 1) p.set("taller", t);
    const s = p.toString();
    return `/talleres${s ? `?${s}` : ""}`;
  };

  const tarjeta = (t: TareaSemana): Tarjeta => ({
    id: t.id, etapa: t.etapa,
    vista: vistaTarea(t.taller.funcion, t, itemDeTarea(t.clave, t.pedido.items)),
    pedidoId: t.pedido.id, numero: t.pedido.numero,
    entrega: t.pedido.fechaEntrega ? fecha(t.pedido.fechaEntrega) : null,
    evento: t.pedido.fechaEvento ? fecha(t.pedido.fechaEvento) : null,
    atrasada: t.grupo === "atrasadas", prioridad: t.pedido.prioridad,
    espera: bloqueadaPor(t, t.todas)?.taller?.nombre ?? null,
    disenos: t.pedido.disenos.map(({ diseno: d }) => ({ id: d.id, imagen: d.imagen, nombre: d.nombre })),
  });

  const propias = tal ? tareas.filter((t) => t.tallerId === tal.id) : [];
  const pendientes = propias.filter((t) => t.etapa !== "LISTO");
  const mensaje = tal ? (plantilla?.texto ?? "")
    .replace("{taller}", tal.nombre)
    .replace("{semana}", textoSemana)
    .replace("{trabajos}", pendientes.length ? pendientes.map(lineaTarea).join("\n") : "No hay trabajos pendientes 🙌") : "";
  const wa = tal ? linkWhatsApp(tal.telefono, mensaje) ?? `https://wa.me/?text=${encodeURIComponent(mensaje)}` : "#";
  const ayuda = ACCION_FUNCION[tal?.funcion ?? "OTRO"] ?? ACCION_FUNCION.OTRO;

  return (
    <>
      <Encabezado titulo="Talleres y producción" subtitulo="Elegí un taller para ver sus trabajos. Al tildar la casilla, el trabajo pasa a la columna siguiente." />

      {talleres.length > 1 && (
        <nav className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1 no-imprimir" aria-label="Talleres">
          {talleres.map((x) => {
            const n = tareas.filter((t) => t.tallerId === x.id && t.etapa !== "LISTO").length;
            const activo = x.id === tal?.id;
            return (
              <Link key={x.id} href={url({ taller: x.id })} aria-current={activo ? "page" : undefined}
                className={`shrink-0 rounded-2xl border px-4 py-2 min-h-11 text-left transition-colors ${activo ? "bg-acento text-white border-acento" : "bg-white border-borde hover:border-acento"}`}>
                <span className="block font-semibold leading-tight">{x.nombre} <span className={activo ? "text-white/80" : "text-texto-2"}>· {n}</span></span>
                <span className={`block text-xs leading-tight ${activo ? "text-white/80" : "text-texto-2"}`}>{NOMBRE_FUNCION[x.funcion]}</span>
              </Link>
            );
          })}
        </nav>
      )}

      <div className="flex items-center justify-between gap-2 mb-4">
        <Link href={url({ fecha: iso(new Date(base.getTime() - 7 * 864e5)) })} className="w-11 h-11 rounded-full bg-white border border-borde flex items-center justify-center hover:border-acento" aria-label="Semana anterior"><ChevronLeft size={20} /></Link>
        <div className="text-center">
          <h2 className="text-2xl">Semana del {textoSemana}</h2>
          {!esActual && <Link href={url({ fecha: undefined })} className="text-xs text-acento hover:underline">Volver a esta semana</Link>}
        </div>
        <Link href={url({ fecha: iso(new Date(base.getTime() + 7 * 864e5)) })} className="w-11 h-11 rounded-full bg-white border border-borde flex items-center justify-center hover:border-acento" aria-label="Semana siguiente"><ChevronRight size={20} /></Link>
      </div>

      {!tal ? <p className="text-sm text-texto-2">No hay talleres cargados.</p> : (
        <section className="tarjeta p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h2 className="text-3xl leading-none">{tal.nombre}</h2>
              <p className="text-sm text-texto-2 mt-1">Tarea: <strong className="text-texto">{NOMBRE_FUNCION[tal.funcion]}</strong>{tal.especialidad ? ` · ${tal.especialidad}` : ""}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="titulo text-3xl leading-none">{pendientes.length}</p>
              <p className="text-xs text-texto-2">pendientes</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-3 no-imprimir">
            {u.rol !== "TALLER" && permisos.has("enviar_listas_talleres") && <a href={wa} target="_blank" className="btn-primario min-h-10 px-4"><MessageCircle size={16} /> Enviar lista por WhatsApp</a>}
            {(u.rol === "TALLER" || permisos.has("enviar_listas_talleres")) && <Link href={`/imprimir-taller/${tal.id}?fecha=${iso(base)}`} target="_blank" className="btn-suave min-h-10 px-4"><Printer size={16} /> Imprimir</Link>}
            {permisos.has("editar_talleres") && <Link href={`/talleres/${tal.id}`} className="btn-suave min-h-10 px-3" title="Editar datos del taller"><Pencil size={15} /></Link>}
          </div>
          {u.rol !== "TALLER" && !tal.telefono && <p className="text-xs text-texto-2 mb-2">Sin WhatsApp cargado: el botón abre WhatsApp para que elijas el contacto.</p>}
          {propias.length === 0 ? <p className="text-sm text-texto-2 py-4">No hay trabajos para esta semana.</p> : <TableroTaller tarjetas={propias.map(tarjeta)} ayuda={ayuda} verPedido={verPedido} />}
        </section>
      )}
    </>
  );
}
