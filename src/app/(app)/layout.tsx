import MenuLateral from "@/components/MenuLateral";
import { requerirUsuario, NOMBRE_ROL } from "@/lib/auth";
import { permisosDe } from "@/lib/acceso";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requerirUsuario();
  const permisos = [...(await permisosDe(u))];
  if (u.rol === "ADMIN") permisos.push("admin");
  if (u.rol === "TALLER" || permisos.includes("ver_talleres")) permisos.push("talleres");
  return (
    <div className="min-h-screen">
      <MenuLateral nombre={u.nombre} rol={NOMBRE_ROL[u.rol]} permisos={permisos} />
      <main className="md:ml-64 px-4 py-6 md:px-10 md:py-9 max-w-[1400px]">{children}</main>
    </div>
  );
}
