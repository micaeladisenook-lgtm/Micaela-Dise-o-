"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, PlusCircle, CalendarDays, Scissors, Users,
  Tags, Package, Wallet, Receipt, ShieldCheck, LogOut,
} from "lucide-react";
import { salir } from "@/app/login/acciones";

type Item = { href: string; texto: string; icono: React.ElementType; soloAdmin?: boolean };

const ITEMS: Item[] = [
  { href: "/", texto: "Panel", icono: LayoutDashboard },
  { href: "/pedidos", texto: "Pedidos", icono: ClipboardList },
  { href: "/pedidos/nuevo", texto: "Nuevo pedido", icono: PlusCircle },
  { href: "/calendario", texto: "Calendario", icono: CalendarDays },
  { href: "/talleres", texto: "Talleres", icono: Scissors },
  { href: "/clientes", texto: "Clientes", icono: Users },
  { href: "/catalogo", texto: "Catálogo y precios", icono: Tags },
  { href: "/stock", texto: "Stock", icono: Package },
  { href: "/pagos", texto: "Pagos", icono: Wallet },
  { href: "/gastos", texto: "Gastos", icono: Receipt, soloAdmin: true },
  { href: "/usuarios", texto: "Usuarios y permisos", icono: ShieldCheck, soloAdmin: true },
];

function activo(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/pedidos") return path === "/pedidos" || (path.startsWith("/pedidos/") && !path.startsWith("/pedidos/nuevo"));
  return path === href || path.startsWith(href + "/");
}

export default function MenuLateral({ nombre, rol, esAdmin }: { nombre: string; rol: string; esAdmin: boolean }) {
  const path = usePathname();
  const items = ITEMS.filter((i) => !i.soloAdmin || esAdmin);

  return (
    <aside className="no-imprimir bg-menu border-b md:border-b-0 md:border-r border-borde md:fixed md:inset-y-0 md:left-0 md:w-64 flex flex-col">
      <div className="px-4 md:px-6 pt-4 md:pt-7 pb-2 md:pb-6 flex items-center justify-between md:block">
        <div>
          <p className="titulo text-2xl md:text-3xl italic leading-none">Micaela Diseño</p>
          <p className="text-xs text-texto-2 mt-1 hidden md:block">Gestión del emprendimiento</p>
        </div>
        {/* En el celular, usuario arriba a la derecha */}
        <div className="md:hidden text-right">
          <p className="text-sm font-medium leading-tight">{nombre}</p>
          <p className="text-xs text-texto-2">{rol}</p>
        </div>
      </div>

      <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible px-3 md:px-3 pb-3 md:pb-0 md:flex-1">
        {items.map((i) => {
          const on = activo(path, i.href);
          const Icono = i.icono;
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`flex items-center gap-3 shrink-0 min-h-11 px-4 rounded-full text-sm transition-colors ${
                on ? "bg-acento text-white font-medium" : "text-texto hover:bg-borde/70"
              }`}
            >
              <Icono size={18} strokeWidth={1.75} />
              <span>{i.texto}</span>
            </Link>
          );
        })}
      </nav>

      <div className="hidden md:flex items-center justify-between gap-2 border-t border-borde px-6 py-4">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{nombre}</p>
          <p className="text-xs text-texto-2">{rol}</p>
        </div>
        <form action={salir}>
          <button title="Cerrar sesión" className="w-11 h-11 rounded-full flex items-center justify-center text-texto-2 hover:bg-borde cursor-pointer">
            <LogOut size={18} />
          </button>
        </form>
      </div>
    </aside>
  );
}
