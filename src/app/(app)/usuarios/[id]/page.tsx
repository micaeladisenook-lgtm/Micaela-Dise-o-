import Link from "next/link";
import { notFound } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import { FormEditarUsuario } from "../Formularios";
import PermisosUsuario from "../PermisosUsuario";
import { urlLogin } from "@/lib/urlLogin";
import { db } from "@/lib/db";
import { requerirAdmin, NOMBRE_ROL } from "@/lib/auth";
import { permisosDeRol, permisosDeUsuario } from "@/lib/acceso";
import { PERMISOS } from "@/lib/permisos";

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  await requerirAdmin();
  const { id } = await params;
  const u = await db.usuario.findUnique({ where: { id }, include: { taller: true } });
  if (!u) notFound();
  const [talleres, delRol, actuales] = await Promise.all([
    db.taller.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    permisosDeRol(u.rol),
    permisosDeUsuario(u.id, u.rol),
  ]);
  return (
    <>
      <Encabezado titulo={u.nombre} subtitulo={`Usuario: ${u.login} · ${NOMBRE_ROL[u.rol]}${u.taller ? ` · ${u.taller.nombre}` : ""}`}><Link href="/usuarios" className="btn-suave">Volver</Link></Encabezado>
      <div className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
        <section className="tarjeta p-5"><FormEditarUsuario u={u} talleres={talleres} urlLogin={await urlLogin()} /></section>
        <section className="tarjeta p-5 min-w-0">
          <h2 className="text-2xl mb-1">Qué puede hacer {u.nombre.split(" ")[0]}</h2>
          {u.rol === "ADMIN" ? (
            <p className="text-sm text-texto-2">Es administradora: tiene acceso a todo, incluidos usuarios, permisos y copias de seguridad.</p>
          ) : (
            <>
              {u.rol === "TALLER" && <p className="text-sm text-texto-2 mb-3">Como usuario de taller, en Talleres ve solo los trabajos de {u.taller?.nombre ?? "su taller"}.</p>}
              <PermisosUsuario
                id={u.id}
                permisos={PERMISOS.map((p) => ({ clave: p.clave, grupo: p.grupo, texto: p.texto, ayuda: "ayuda" in p ? p.ayuda : undefined }))}
                delRol={[...delRol]}
                actuales={[...actuales]}
                nombreRol={NOMBRE_ROL[u.rol]}
              />
            </>
          )}
        </section>
      </div>
    </>
  );
}
