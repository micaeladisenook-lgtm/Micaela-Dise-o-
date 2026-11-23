import Link from "next/link";
import { Search, MessageCircle } from "lucide-react";
import Encabezado from "@/components/Encabezado";
import { db } from "@/lib/db";
import { fecha, linkWhatsApp } from "@/lib/formato";
import type { Prisma } from "@prisma/client";

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const busqueda = q.trim();
  const numero = parseInt(busqueda.replace(/^n[°º]?\s*/i, ""), 10);

  const where: Prisma.ClienteWhereInput = busqueda
    ? {
        OR: [
          { nombre: { contains: busqueda, mode: "insensitive" } },
          { instagram: { contains: busqueda.replace(/^@/, ""), mode: "insensitive" } },
          { email: { contains: busqueda, mode: "insensitive" } },
          { telefono: { contains: busqueda.replace(/\D/g, "") || busqueda } },
          ...(Number.isFinite(numero) ? [{ numero }] : []),
        ],
      }
    : {};

  const clientes = await db.cliente.findMany({ where, orderBy: { numero: "desc" }, take: 200 });
  const total = await db.cliente.count();

  return (
    <>
      <Encabezado titulo="Clientes" subtitulo={`${total} clientas registradas`}>
        <Link href="/clientes/nueva" className="btn-primario">+ Nueva clienta</Link>
      </Encabezado>

      <form className="mb-4 relative max-w-md">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-2" />
        <input name="q" defaultValue={busqueda} className="campo pl-10" placeholder="Buscar por nombre, N° de clienta, teléfono o Instagram" />
      </form>

      {clientes.length === 0 ? (
        <div className="tarjeta p-8 text-center text-texto-2">
          {busqueda ? `No encontramos clientas para "${busqueda}".` : "Todavía no hay clientas cargadas."}
        </div>
      ) : (
        <>
          {/* Computadora: tabla */}
          <div className="tarjeta overflow-hidden hidden md:block">
            <table className="tabla w-full">
              <thead>
                <tr>
                  <th>N°</th><th>Clienta</th><th>WhatsApp</th><th>Instagram</th><th>Email</th><th>Alta</th><th></th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => {
                  const wa = linkWhatsApp(c.telefono);
                  return (
                    <tr key={c.id} className="hover:bg-fondo">
                      <td className="text-texto-2 font-medium">N° {c.numero}</td>
                      <td>
                        <Link href={`/clientes/${c.id}`} className="font-medium hover:text-acento">{c.nombre}</Link>
                        {c.esEjemplo && <span className="chip bg-menu text-texto-2 ml-2">ejemplo</span>}
                      </td>
                      <td>{c.telefono ?? "—"}</td>
                      <td className="text-texto-2">{c.instagram ?? "—"}</td>
                      <td className="text-texto-2">{c.email ?? "—"}</td>
                      <td className="text-texto-2">{fecha(c.creadoEn)}</td>
                      <td className="text-right">
                        {wa && (
                          <a href={wa} target="_blank" className="inline-flex w-11 h-11 items-center justify-center rounded-full text-[#1E8E4E] hover:bg-estado-listo" title="Abrir WhatsApp">
                            <MessageCircle size={18} />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Celular: tarjetas */}
          <div className="md:hidden space-y-2">
            {clientes.map((c) => (
              <Link key={c.id} href={`/clientes/${c.id}`} className="tarjeta p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.nombre}</p>
                  <p className="text-xs text-texto-2 truncate">
                    N° {c.numero} · {c.telefono ?? "sin teléfono"}{c.instagram ? ` · ${c.instagram}` : ""}
                  </p>
                </div>
                <span className="text-acento text-xl">›</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
