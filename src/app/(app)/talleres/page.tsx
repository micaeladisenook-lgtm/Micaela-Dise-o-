import Link from "next/link";
import { ChevronLeft, ChevronRight, MessageCircle, Printer, Pencil } from "lucide-react";
import Encabezado from "@/components/Encabezado";
import TableroTaller, { type Tarjeta } from "./TableroTaller";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { fecha, linkWhatsApp } from "@/lib/formato";
import { fechaGuia, hoyAR } from "@/lib/pedidos";
import { bloqueadaPor } from "@/lib/produccion";
import { tareasDeSemana, lineaTarea, type TareaSemana } from "@/lib/datosTalleres";
import { requerirPermiso } from "@/lib/acceso";

const iso = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
export default async function TalleresPage({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
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

  const tarjeta = (t: TareaSemana): Tarjeta => {
    const g = fechaGuia(t.pedido);
    return {
      id: t.id, etapa: t.etapa, prenda: t.prenda, color: t.color, talle: t.talle, bordado: t.bordado, detalle: t.detalle,
      pedidoId: t.pedido.id, numero: t.pedido.numero, cliente: t.pedido.cliente.nombre,
      evento: g ? fecha(g) : null, atrasada: t.grupo === "atrasadas", prioridad: t.pedido.prioridad,
      espera: bloqueadaPor(t, t.todas)?.taller?.nombre ?? null,
      disenos: t.pedido.disenos.map(({ diseno: d }) => ({ id: d.id, imagen: d.imagen, nombre: d.nombre })),
    };
  };

  return (
    <>
      <Encabezado titulo="Talleres y producción" subtitulo="Cada taller con sus trabajos en tres columnas: Recibido → En producción → Listo para entregar. Al tildar la casilla, el trabajo pasa a la columna siguiente." />

      <div className="flex items-center justify-between gap-2 mb-5">
        <Link href={`/talleres?fecha=${iso(new Date(base.getTime() - 7 * 864e5))}`} className="w-11 h-11 rounded-full bg-white border border-borde flex items-center justify-center hover:border-acento" aria-label="Semana anterior"><ChevronLeft size={20} /></Link>
        <div className="text-center">
          <h2 className="text-2xl">Semana del {textoSemana}</h2>
          {!esActual && <Link href="/talleres" className="text-xs text-acento hover:underline">Volver a esta semana</Link>}
        </div>
        <Link href={`/talleres?fecha=${iso(new Date(base.getTime() + 7 * 864e5))}`} className="w-11 h-11 rounded-full bg-white border border-borde flex items-center justify-center hover:border-acento" aria-label="Semana siguiente"><ChevronRight size={20} /></Link>
      </div>

      {talleres.length > 1 && (
        <nav className="flex flex-wrap gap-2 mb-4 no-imprimir">
          {talleres.map((tal) => {
            const n = tareas.filter((t) => t.tallerId === tal.id && t.etapa !== "LISTO").length;
            return <a key={tal.id} href={`#taller-${tal.id}`} className="btn-suave min-h-10 px-4">{tal.nombre} <span className="text-texto-2">· {n}</span></a>;
          })}
        </nav>
      )}

      <div className="space-y-5">
        {talleres.map((tal) => {
          const propias = tareas.filter((t) => t.tallerId === tal.id);
          const pendientes = propias.filter((t) => t.etapa !== "LISTO");
          const mensaje = (plantilla?.texto ?? "")
            .replace("{taller}", tal.nombre)
            .replace("{semana}", textoSemana)
            .replace("{trabajos}", pendientes.length ? pendientes.map(lineaTarea).join("\n") : "No hay trabajos pendientes 🙌");
          const wa = linkWhatsApp(tal.telefono, mensaje) ?? `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
          return (
            <section key={tal.id} id={`taller-${tal.id}`} className="tarjeta p-4 sm:p-5 scroll-mt-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h2 className="text-3xl leading-none">{tal.nombre}</h2>
                  <p className="text-sm text-texto-2 mt-1">{tal.especialidad}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="titulo text-3xl leading-none">{pendientes.length}</p>
                  <p className="text-xs text-texto-2">pendientes</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3 no-imprimir">
                <a href={wa} target="_blank" className="btn-primario min-h-10 px-4"><MessageCircle size={16} /> Enviar lista por WhatsApp</a>
                <Link href={`/imprimir-taller/${tal.id}?fecha=${iso(base)}`} target="_blank" className="btn-suave min-h-10 px-4"><Printer size={16} /> Imprimir</Link>
                {u.rol === "ADMIN" && <Link href={`/talleres/${tal.id}`} className="btn-suave min-h-10 px-3" title="Editar datos del taller"><Pencil size={15} /></Link>}
              </div>
              {!tal.telefono && <p className="text-xs text-texto-2 mb-2">Sin WhatsApp cargado: el botón abre WhatsApp para que elijas el contacto.</p>}
              {propias.length === 0 ? <p className="text-sm text-texto-2 py-4">No hay trabajos para esta semana.</p> : <TableroTaller tarjetas={propias.map(tarjeta)} />}
            </section>
          );
        })}
      </div>
    </>
  );
}
