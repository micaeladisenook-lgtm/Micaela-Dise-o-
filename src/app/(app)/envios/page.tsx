import Link from "next/link";
import { AlertTriangle, Printer } from "lucide-react";
import Encabezado from "@/components/Encabezado";
import EstadoChip from "@/components/EstadoChip";
import { Acciones } from "./Tarjeta";
import Configuracion from "./Configuracion";
import MotoTarifas from "./MotoTarifas";
import { cpOrigen, estadoCorreos } from "@/lib/cotizador";
import { paqarConfigurado } from "@/lib/paqar";
import { db } from "@/lib/db";
import { requerirPermiso, permisosDe } from "@/lib/acceso";
import { fecha, fechaHora, pesos, linkWhatsApp } from "@/lib/formato";
import { fechaGuia, atrasado } from "@/lib/pedidos";
import { datosEnvio, faltantes, textoParaCopiar } from "@/lib/envios";

export default async function EnviosPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const u = await requerirPermiso("ver_envios");
  const config = (await permisosDe(u)).has("configurar_envios");
  const origen = await cpOrigen();
  const remitente = Object.fromEntries((await db.configuracion.findMany({ where: { clave: { startsWith: "remitente_" } } })).map((c) => [c.clave.replace("remitente_", ""), c.valor]));
  const paqarActivo = paqarConfigurado();
  const tarifasMoto = await db.tarifaMoto.findMany({ orderBy: { localidad: "asc" } });
  const { tab = "pendientes" } = await searchParams;
  const despachados = tab === "despachados";
  const [pedidos, plantilla] = await Promise.all([
    db.pedido.findMany({
      where: despachados
        ? { despachadoEn: { not: null, gte: new Date(Date.now() - 90 * 864e5) } }
        : { envio: true, despachadoEn: null, estado: { in: ["NUEVO", "EN_PRODUCCION", "LISTO"] } },
      include: { cliente: true, items: { select: { nombre: true } } },
      orderBy: despachados ? { despachadoEn: "desc" } : undefined,
    }),
    db.plantilla.findUnique({ where: { clave: "envio" } }),
  ]);
  const lista = despachados ? pedidos : pedidos.sort((a, b) => (fechaGuia(a)?.getTime() ?? 9e15) - (fechaGuia(b)?.getTime() ?? 9e15));
  const listos = lista.filter((p) => p.estado === "LISTO").map((p) => p.id);
  const chip = (on: boolean) => `min-h-11 px-5 inline-flex items-center rounded-full text-sm ${on ? "bg-white border border-borde font-medium text-acento" : "text-texto-2 hover:text-texto"}`;
  const textoAviso = plantilla?.texto ?? "¡Hola {nombre}! 📦 Tu pedido N° {pedido} de Micaela Diseño ya fue despachado por {forma_envio}.\n{seguimiento}\n¡Gracias por elegirnos! 💕";

  return (
    <>
      <Encabezado titulo="Envíos" subtitulo="Pedidos para despachar, con los datos listos para el correo o el repartidor.">
        {!despachados && listos.length > 0 && (
          <a href={`/imprimir-rotulos?ids=${listos.join(",")}`} target="_blank" className="btn-primario"><Printer size={16} /> Rótulos de los listos ({listos.length})</a>
        )}
      </Encabezado>
      <Configuracion cp={origen} estado={estadoCorreos()} esAdmin={config} remitente={remitente} />
      <MotoTarifas tarifas={tarifasMoto} esAdmin={config} />
      <div className="inline-flex gap-1 bg-menu rounded-full p-1 mb-5">
        <Link href="/envios" className={chip(!despachados)}>Para despachar</Link>
        <Link href="/envios?tab=despachados" className={chip(despachados)}>Despachados</Link>
      </div>

      {lista.length === 0 ? (
        <div className="tarjeta p-8 text-center text-texto-2">{despachados ? "No hay envíos despachados en los últimos 90 días." : "No hay pedidos pendientes de envío."}</div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-4">
          {lista.map((p) => {
            const d = datosEnvio(p);
            const falta = faltantes(d);
            const g = fechaGuia(p);
            const aviso = linkWhatsApp(p.cliente.telefono, textoAviso
              .replace(/\{nombre\}/g, p.cliente.nombre.split(" ")[0])
              .replace(/\{pedido\}/g, String(p.numero))
              .replace(/\{forma_envio\}/g, p.formaEnvio || "envío")
              .replace(/\{seguimiento\}/g, p.numeroSeguimiento ? `N° de seguimiento: ${p.numeroSeguimiento}` : ""));
            return (
              <section key={p.id} className="tarjeta p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <Link href={`/pedidos/${p.id}`} className="font-semibold text-acento hover:underline">Pedido N° {p.numero}</Link>
                    <p className="text-xs text-texto-2">{p.items.filter((i) => !i.nombre.startsWith("Envío ")).map((i) => i.nombre).join(", ")}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <EstadoChip estado={p.estado} atrasado={atrasado(p)} />
                    <p className="text-xs text-texto-2 mt-1">{p.formaEnvio || "Forma de envío sin definir"}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-sm mb-3">
                  <dt className="text-texto-2">Destinataria</dt><dd className="font-medium">{d.nombre}</dd>
                  <dt className="text-texto-2">DNI</dt><dd>{d.dni ?? "—"}</dd>
                  <dt className="text-texto-2">Teléfono</dt><dd>{d.telefono ?? "—"}</dd>
                  <dt className="text-texto-2">Dirección</dt><dd>{d.direccion ?? "—"}</dd>
                  <dt className="text-texto-2">Entre calles</dt><dd>{d.entreCalles ?? "—"}</dd>
                  <dt className="text-texto-2">Localidad</dt><dd>{[d.localidad, d.provincia].filter(Boolean).join(", ") || "—"}</dd>
                  <dt className="text-texto-2">Código postal</dt><dd>{d.codigoPostal ?? "—"}</dd>
                  {g && <><dt className="text-texto-2">Evento</dt><dd>{fecha(g)}{p.prioridad && <strong className="text-acento"> · PRIORIDAD</strong>}</dd></>}
                  {despachados && <><dt className="text-texto-2">Despachado</dt><dd>{fechaHora(p.despachadoEn)}{p.numeroSeguimiento ? ` · seguimiento ${p.numeroSeguimiento}` : ""}{p.costoEnvio ? ` · ${pesos(p.costoEnvio)}` : ""}</dd></>}
                </dl>
                {!despachados && falta.length > 0 && (
                  <p className="text-xs text-estado-produccion-txt bg-estado-produccion rounded-lg px-3 py-2 mb-3 flex gap-1.5"><AlertTriangle size={14} className="shrink-0 mt-0.5" /> Falta: {falta.join(", ")}</p>
                )}
                <Acciones id={p.id} datos={d} copiar={textoParaCopiar(d)} formaEnvio={p.formaEnvio} despachado={!!p.despachadoEn} avisoWa={aviso} paqar={paqarActivo} seguimiento={p.numeroSeguimiento} />
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
