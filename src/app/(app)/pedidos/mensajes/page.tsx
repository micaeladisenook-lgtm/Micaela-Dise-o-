import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import EditorPlantilla from "./EditorPlantilla";
import { db } from "@/lib/db";

import { VARIABLES_PLANTILLA } from "@/lib/pedidos";
import { requerirPermiso, permisosDeRol } from "@/lib/acceso";

const ORDEN = ["confirmacion", "saldo", "listo", "taller"];

export default async function MensajesPage() {
  const u = await requerirPermiso("ver_pedidos");
  const editar = (await permisosDeRol(u.rol)).has("editar_mensajes");
  const plantillas = (await db.plantilla.findMany()).sort((a, b) => ORDEN.indexOf(a.clave) - ORDEN.indexOf(b.clave));
  return (
    <>
      <Encabezado titulo="Mensajes de WhatsApp" subtitulo="Los textos que se arman solos para mandar a clientas y talleres.">
        <Link href="/pedidos" className="btn-suave">Volver a pedidos</Link>
      </Encabezado>
      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="grid lg:grid-cols-2 gap-4">
          {plantillas.map((p) => <EditorPlantilla key={p.clave} {...p} puedeEditar={editar} />)}
        </div>
        <aside className="tarjeta p-5 xl:sticky xl:top-6">
          <h2 className="text-xl mb-2">Palabras que se reemplazan solas</h2>
          <p className="text-sm text-texto-2 mb-3">Escribilas tal cual, con las llaves. Al enviar se cambian por los datos del pedido.</p>
          <ul className="space-y-1.5 text-sm">
            {VARIABLES_PLANTILLA.map((v) => (
              <li key={v.clave}><code className="bg-menu rounded px-1.5 py-0.5 text-acento-oscuro">{v.clave}</code> <span className="text-texto-2">{v.texto}</span></li>
            ))}
          </ul>
          {!editar && <p className="text-xs text-texto-2 mt-4">Solo la administradora puede editar los mensajes.</p>}
        </aside>
      </div>
    </>
  );
}
