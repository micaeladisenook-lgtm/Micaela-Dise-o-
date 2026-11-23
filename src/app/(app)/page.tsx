import Link from "next/link";
import { Users, Tags, Images } from "lucide-react";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { fecha } from "@/lib/formato";

function saludo() {
  const h = parseInt(new Date().toLocaleString("es-AR", { hour: "numeric", hour12: false, timeZone: "America/Argentina/Buenos_Aires" }), 10);
  if (h < 13) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ "sin-permiso"?: string }> }) {
  const u = await requerirUsuario();
  const sp = await searchParams;
  const esAdmin = u.rol === "ADMIN";
  const [clientas, productos, disenos, ultimas] = await Promise.all([
    db.cliente.count(),
    db.producto.count({ where: { activo: true } }),
    db.diseno.count(),
    db.cliente.findMany({ orderBy: { creadoEn: "desc" }, take: 5 }),
  ]);

  const tarjetas = [
    { titulo: "Ventas del mes", visible: true },
    { titulo: "Por cobrar", visible: true },
    { titulo: "Gastos del mes", visible: esAdmin },
    { titulo: "Ganancia estimada", visible: esAdmin },
  ].filter((t) => t.visible);

  return (
    <>
      {sp["sin-permiso"] && (
        <p className="mb-4 text-sm text-estado-alerta-txt bg-estado-alerta rounded-xl px-4 py-3">No tenés permiso para ver esa sección.</p>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <p className="text-sm text-texto-2 capitalize">
            {new Date().toLocaleDateString("es-AR", { weekday: "long", timeZone: "America/Argentina/Buenos_Aires" })} {fecha(new Date())}
          </p>
          <h1 className="text-4xl md:text-5xl">{saludo()}, {u.nombre.split(" ")[0]}</h1>
        </div>
        <Link href="/pedidos/nuevo" className="btn-primario self-start sm:self-auto">+ Nuevo pedido</Link>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-6">
        {tarjetas.map((t) => (
          <div key={t.titulo} className="tarjeta p-4 md:p-5">
            <p className="text-xs md:text-sm text-texto-2">{t.titulo}</p>
            <p className="titulo text-3xl mt-1 text-texto-2/50">—</p>
            <p className="text-[11px] text-texto-2 mt-1">Se activa en la Etapa 3</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        <section className="tarjeta p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl">Últimas clientas</h2>
            <Link href="/clientes" className="text-sm text-acento hover:underline">Ver todas</Link>
          </div>
          {ultimas.length === 0 ? (
            <p className="text-sm text-texto-2">Todavía no hay clientas.</p>
          ) : (
            <ul className="divide-y divide-borde">
              {ultimas.map((c) => (
                <li key={c.id}>
                  <Link href={`/clientes/${c.id}`} className="flex items-center justify-between py-3 min-h-11 hover:text-acento">
                    <span><span className="text-texto-2 text-sm mr-2">N° {c.numero}</span>{c.nombre}</span>
                    <span className="text-xs text-texto-2">{fecha(c.creadoEn)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="tarjeta p-5">
          <h2 className="text-2xl mb-3">Accesos rápidos</h2>
          <div className="space-y-2">
            {[
              { href: "/clientes", icono: Users, texto: "Clientas", n: clientas },
              { href: "/catalogo", icono: Tags, texto: "Productos activos", n: productos },
              { href: "/catalogo/disenos", icono: Images, texto: "Diseños en la galería", n: disenos },
            ].map(({ href, icono: I, texto, n }) => (
              <Link key={href} href={href} className="flex items-center gap-3 rounded-xl border border-borde px-4 min-h-14 hover:border-acento">
                <I size={20} className="text-acento" strokeWidth={1.75} />
                <span className="flex-1 text-sm">{texto}</span>
                <span className="titulo text-2xl">{n}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
