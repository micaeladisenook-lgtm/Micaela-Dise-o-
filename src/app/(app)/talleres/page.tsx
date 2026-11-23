import Link from "next/link";
import { ChevronLeft, ChevronRight, MessageCircle, Printer, Pencil, Clock } from "lucide-react";
import Encabezado from "@/components/Encabezado";
import CasillaTarea from "./CasillaTarea";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { fecha, linkWhatsApp } from "@/lib/formato";
import { fechaGuia, hoyAR } from "@/lib/pedidos";
import { bloqueadaPor } from "@/lib/produccion";
import { tareasDeSemana, lineaTarea, type TareaSemana } from "@/lib/datosTalleres";
import { requerirPermiso } from "@/lib/acceso";

const iso = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
const GRUPOS = [
  { k: "atrasadas", t: "Atrasadas (evento ya pasó)", c: "text-estado-alerta-txt" },
  { k: "semana", t: "Esta semana", c: "" },
  { k: "sinFecha", t: "Sin fecha de evento", c: "text-texto-2" },
] as const;

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

  function Fila({ t }: { t: TareaSemana }) {
    const previa = bloqueadaPor(t, t.todas);
    const g = fechaGuia(t.pedido);
    return (
      <li className={`flex gap-3 py-2.5 ${t.terminada ? "opacity-60" : ""}`}>
        <CasillaTarea id={t.id} terminada={t.terminada} bloqueada={!!previa} />
        <div className="min-w-0 text-sm">
          <p className={`font-medium ${t.terminada ? "line-through" : ""}`}>
            {t.prenda}{t.color ? ` · ${t.color}` : ""}{t.talle ? ` · talle ${t.talle}` : ""}
          </p>
          {t.bordado && <p className="text-acento-oscuro">Bordado: {t.bordado}</p>}
          {t.detalle && <p className="text-texto-2 text-xs">{t.detalle}</p>}
          <p className="text-xs text-texto-2">
            <Link href={`/pedidos/${t.pedido.id}`} className="text-acento hover:underline">N° {t.pedido.numero}</Link> · {t.pedido.cliente.nombre}
            {g ? ` · evento ${fecha(g)}` : ""}{t.pedido.prioridad ? " · " : ""}{t.pedido.prioridad && <strong className="text-acento">PRIORIDAD</strong>}
          </p>
          {previa && !t.terminada && <p className="text-xs text-estado-produccion-txt flex items-center gap-1 mt-0.5"><Clock size={12} /> Espera a {previa.taller?.nombre}</p>}
          {t.bordado && t.pedido.disenos.length > 0 && (
            <div className="flex gap-1 mt-1">{t.pedido.disenos.map(({ diseno: d }) => <img key={d.id} src={d.imagen} alt={d.nombre} title={d.nombre} className="w-10 h-10 rounded-lg object-cover border border-borde" />)}</div>
          )}
        </div>
      </li>
    );
  }

  return (
    <>
      <Encabezado titulo="Talleres y producción" subtitulo="Qué hay que hacer esta semana en cada taller, según la fecha del evento." />

      <div className="flex items-center justify-between gap-2 mb-5">
        <Link href={`/talleres?fecha=${iso(new Date(base.getTime() - 7 * 864e5))}`} className="w-11 h-11 rounded-full bg-white border border-borde flex items-center justify-center hover:border-acento" aria-label="Semana anterior"><ChevronLeft size={20} /></Link>
        <div className="text-center">
          <h2 className="text-2xl">Semana del {textoSemana}</h2>
          {!esActual && <Link href="/talleres" className="text-xs text-acento hover:underline">Volver a esta semana</Link>}
        </div>
        <Link href={`/talleres?fecha=${iso(new Date(base.getTime() + 7 * 864e5))}`} className="w-11 h-11 rounded-full bg-white border border-borde flex items-center justify-center hover:border-acento" aria-label="Semana siguiente"><ChevronRight size={20} /></Link>
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        {talleres.map((tal) => {
          const propias = tareas.filter((t) => t.tallerId === tal.id);
          const pendientes = propias.filter((t) => !t.terminada);
          const mensaje = (plantilla?.texto ?? "")
            .replace("{taller}", tal.nombre)
            .replace("{semana}", textoSemana)
            .replace("{trabajos}", pendientes.length ? pendientes.map(lineaTarea).join("\n") : "No hay trabajos pendientes 🙌");
          const wa = linkWhatsApp(tal.telefono, mensaje) ?? `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
          return (
            <section key={tal.id} className="tarjeta p-5">
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
              {propias.length === 0 ? <p className="text-sm text-texto-2 py-4">No hay trabajos para esta semana.</p> : (
                GRUPOS.map((g) => {
                  const lista = propias.filter((t) => t.grupo === g.k);
                  if (!lista.length) return null;
                  return (
                    <div key={g.k} className="mt-2">
                      <p className={`text-xs font-semibold uppercase tracking-wide ${g.c || "text-texto-2"}`}>{g.t} · {lista.length}</p>
                      <ul className="divide-y divide-borde">{lista.map((t) => <Fila key={t.id} t={t} />)}</ul>
                    </div>
                  );
                })
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
