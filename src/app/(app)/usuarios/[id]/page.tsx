import Link from "next/link";
import { notFound } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import { FormEditarUsuario } from "../Formularios";
import { urlLogin } from "@/lib/urlLogin";
import { db } from "@/lib/db";
import { requerirAdmin, NOMBRE_ROL } from "@/lib/auth";
import { permisosDeRol } from "@/lib/acceso";
import { PERMISOS } from "@/lib/permisos";

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  await requerirAdmin();
  const { id } = await params;
  const u = await db.usuario.findUnique({ where: { id } });
  if (!u) notFound();
  const [talleres, permisos] = await Promise.all([db.taller.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }), permisosDeRol(u.rol)]);
  return (
    <>
      <Encabezado titulo={u.nombre} subtitulo={`Usuario: ${u.login} · ${NOMBRE_ROL[u.rol]}`}><Link href="/usuarios" className="btn-suave">Volver</Link></Encabezado>
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <section className="tarjeta p-5"><FormEditarUsuario u={u} talleres={talleres} urlLogin={await urlLogin()} /></section>
        <section className="tarjeta p-5">
          <h2 className="text-2xl mb-1">Qué puede hacer</h2>
          <p className="text-sm text-texto-2 mb-3">Según su rol ({NOMBRE_ROL[u.rol]}). Se cambia en <Link href="/usuarios#permisos" className="text-acento underline">Permisos por rol</Link>.</p>
          <ul className="text-sm space-y-1">
            {PERMISOS.map((p) => <li key={p.clave} className={permisos.has(p.clave) ? "" : "text-texto-2 line-through"}>{permisos.has(p.clave) ? "✓" : "✗"} {p.texto}</li>)}
          </ul>
        </section>
      </div>
    </>
  );
}
