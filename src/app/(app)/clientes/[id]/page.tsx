import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import Encabezado from "@/components/Encabezado";
import ClienteForm from "../ClienteForm";
import BotonBorrar from "@/components/BotonBorrar";
import { actualizarCliente, borrarCliente } from "../acciones";
import { db } from "@/lib/db";
import { usuarioActual } from "@/lib/auth";
import { fecha, linkWhatsApp } from "@/lib/formato";

export default async function FichaClientaPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ creada?: string }> }) {
  const { id } = await params;
  const { creada } = await searchParams;
  const c = await db.cliente.findUnique({ where: { id }, include: { creadoPor: true } });
  if (!c) notFound();
  const u = await usuarioActual();
  const wa = linkWhatsApp(c.telefono, `¡Hola ${c.nombre.split(" ")[0]}! Te escribimos de Micaela Diseño 🌸`);

  return (
    <>
      <Encabezado titulo={c.nombre} subtitulo={`Clienta N° ${c.numero} · alta el ${fecha(c.creadoEn)}${c.creadoPor ? ` por ${c.creadoPor.nombre}` : ""}`}>
        {wa && (
          <a href={wa} target="_blank" className="btn-secundario"><MessageCircle size={18} /> WhatsApp</a>
        )}
        <Link href="/clientes" className="btn-suave">Volver</Link>
      </Encabezado>

      {creada && (
        <p className="mb-4 text-sm text-estado-listo-txt bg-estado-listo rounded-xl px-4 py-3 max-w-2xl">
          ¡Listo! La clienta quedó guardada con el número <strong>N° {c.numero}</strong>.
        </p>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <section className="tarjeta p-5 md:p-6">
          <h2 className="text-2xl mb-4">Datos</h2>
          <ClienteForm accion={actualizarCliente.bind(null, c.id)} cliente={c} textoBoton="Guardar cambios" />
        </section>

        <div className="space-y-6">
          <section className="tarjeta p-5 md:p-6">
            <h2 className="text-2xl mb-2">Historial de pedidos</h2>
            <p className="text-sm text-texto-2">Todavía no hay pedidos. Cuando armemos el módulo de Pedidos (Etapa 2), acá vas a ver todos los pedidos de esta clienta.</p>
          </section>
          {u?.rol === "ADMIN" && (
            <section className="tarjeta p-5 md:p-6">
              <h2 className="text-xl mb-2">Zona peligrosa</h2>
              <BotonBorrar accion={borrarCliente.bind(null, c.id)} texto="Borrar clienta" confirmacion={`¿Seguro que querés borrar a ${c.nombre}? No se puede deshacer.`} />
            </section>
          )}
        </div>
      </div>
    </>
  );
}
