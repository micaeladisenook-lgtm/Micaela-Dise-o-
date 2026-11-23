import Encabezado from "@/components/Encabezado";
import FormClave from "./FormClave";
import { requerirUsuario, NOMBRE_ROL } from "@/lib/auth";
import { salir } from "@/app/login/acciones";

export default async function CuentaPage({ searchParams }: { searchParams: Promise<{ cambiar?: string }> }) {
  const u = await requerirUsuario();
  const { cambiar } = await searchParams;
  return (
    <>
      <Encabezado titulo="Mi cuenta" subtitulo={`${u.nombre} · usuario ${u.login} · ${NOMBRE_ROL[u.rol]}`} />
      {(cambiar || u.debeCambiarClave) && <p className="mb-4 max-w-lg text-sm text-estado-produccion-txt bg-estado-produccion rounded-xl px-4 py-3">¡Bienvenida/o! Elegí tu propia contraseña para seguir.</p>}
      <section className="tarjeta p-5 max-w-lg mb-4"><h2 className="text-2xl mb-3">Cambiar contraseña</h2><FormClave /></section>
      <form action={salir}><button className="btn-suave">Cerrar sesión</button></form>
    </>
  );
}
