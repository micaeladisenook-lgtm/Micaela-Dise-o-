import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import { FormInvitar, TablaPermisos } from "./Formularios";
import Copias from "./Copias";
import { db } from "@/lib/db";
import { requerirAdmin, NOMBRE_ROL } from "@/lib/auth";
import { permisosDeRol } from "@/lib/acceso";
import { PERMISOS } from "@/lib/permisos";
import { fechaHora } from "@/lib/formato";
import { urlLogin } from "@/lib/urlLogin";

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ quien?: string }> }) {
  await requerirAdmin();
  const { quien } = await searchParams;
  const [usuarios, talleres, registros, vend, tall] = await Promise.all([
    db.usuario.findMany({ include: { taller: true }, orderBy: [{ activo: "desc" }, { rol: "asc" }, { nombre: "asc" }] }),
    db.taller.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    db.registro.findMany({ where: quien ? { usuarioId: quien === "sistema" ? null : quien } : {}, include: { usuario: true }, orderBy: { fecha: "desc" }, take: 150 }),
    permisosDeRol("VENDEDOR"),
    permisosDeRol("TALLER"),
  ]);
  const valores: Record<string, boolean> = {};
  for (const p of PERMISOS) { valores[`VENDEDOR:${p.clave}`] = vend.has(p.clave); valores[`TALLER:${p.clave}`] = tall.has(p.clave); }
  const url = await urlLogin();

  return (
    <>
      <Encabezado titulo="Usuarios y permisos" subtitulo="Quién entra al sistema, qué puede hacer y quién hizo cada cambio." />
      <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start mb-8">
        <section className="tarjeta overflow-x-auto">
          <table className="tabla w-full min-w-[640px]">
            <thead><tr><th>Usuario</th><th>Rol</th><th>Último acceso</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={u.activo ? "" : "opacity-50"}>
                  <td><span className="font-medium">{u.nombre}</span><span className="block text-xs text-texto-2">{u.login}</span></td>
                  <td>{NOMBRE_ROL[u.rol]}{u.taller ? <span className="text-texto-2"> · {u.taller.nombre}</span> : null}</td>
                  <td className="text-texto-2 text-xs">{u.ultimoAcceso ? fechaHora(u.ultimoAcceso) : "Nunca"}</td>
                  <td>{u.activo ? <span className="chip bg-estado-listo text-estado-listo-txt">Activo</span> : <span className="chip bg-estado-entregado text-estado-entregado-txt">Inactivo</span>}{u.debeCambiarClave && u.activo && <span className="block text-[11px] text-texto-2 mt-1">contraseña provisoria</span>}</td>
                  <td className="text-right"><Link href={`/usuarios/${u.id}`} className="btn-suave min-h-10 px-4">Editar permisos</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <aside className="tarjeta p-5">
          <h2 className="text-2xl mb-3">+ Invitar usuario</h2>
          <FormInvitar talleres={talleres} urlLogin={url} />
        </aside>
      </div>

      <section className="tarjeta mb-8" id="permisos">
        <div className="p-5 pb-2">
          <h2 className="text-2xl">Permisos por rol</h2>
          <p className="text-sm text-texto-2">La administradora siempre tiene todo. Tildá lo que puede hacer cada rol.</p>
        </div>
        <TablaPermisos permisos={PERMISOS.map((p) => ({ ...p }))} valores={valores} />
      </section>

      <section className="tarjeta p-5 mb-8">
        <h2 className="text-2xl mb-3">Copias de seguridad</h2>
        <Copias automaticas={!!process.env.COPIA_TOKEN} />
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-2xl">Registro de cambios</h2>
          <div className="flex flex-wrap gap-1.5 text-sm">
            <Link href="/usuarios" className={`chip py-1.5 px-3 ${!quien ? "bg-acento text-white" : "bg-white border border-borde"}`}>Todos</Link>
            {usuarios.map((u) => <Link key={u.id} href={`/usuarios?quien=${u.id}`} className={`chip py-1.5 px-3 ${quien === u.id ? "bg-acento text-white" : "bg-white border border-borde"}`}>{u.nombre}</Link>)}
            <Link href="/usuarios?quien=sistema" className={`chip py-1.5 px-3 ${quien === "sistema" ? "bg-acento text-white" : "bg-white border border-borde"}`}>Formulario / sistema</Link>
          </div>
        </div>
        <div className="tarjeta overflow-x-auto">
          <table className="tabla w-full min-w-[640px]">
            <thead><tr><th>Cuándo</th><th>Quién</th><th>Qué hizo</th><th>Detalle</th></tr></thead>
            <tbody>
              {registros.map((r) => {
                const link = r.entidad === "Pedido" && r.entidadId ? `/pedidos/${r.entidadId}` : r.entidad === "Cliente" && r.entidadId ? `/clientes/${r.entidadId}` : null;
                return (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap text-xs text-texto-2">{fechaHora(r.fecha)}</td>
                    <td>{r.usuario?.nombre ?? "Formulario / sistema"}</td>
                    <td>{r.accion}</td>
                    <td className="text-texto-2 text-xs max-w-[420px]">{link ? <Link href={link} className="hover:text-acento">{r.detalle}</Link> : r.detalle}</td>
                  </tr>
                );
              })}
              {registros.length === 0 && <tr><td colSpan={4} className="text-center text-texto-2">Sin movimientos.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
