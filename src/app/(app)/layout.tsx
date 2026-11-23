import MenuLateral from "@/components/MenuLateral";
import { requerirUsuario, NOMBRE_ROL } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requerirUsuario();
  return (
    <div className="min-h-screen">
      <MenuLateral nombre={u.nombre} rol={NOMBRE_ROL[u.rol]} esAdmin={u.rol === "ADMIN"} />
      <main className="md:ml-64 px-4 py-6 md:px-10 md:py-9 max-w-[1400px]">{children}</main>
    </div>
  );
}
