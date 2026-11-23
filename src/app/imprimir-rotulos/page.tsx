import BotonImprimir from "@/components/BotonImprimir";
import { db } from "@/lib/db";
import { requerirPermiso } from "@/lib/acceso";
import { datosEnvio } from "@/lib/envios";

export default async function RotulosPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  await requerirPermiso("ver_pedidos");
  const ids = ((await searchParams).ids ?? "").split(",").filter(Boolean).slice(0, 100);
  const pedidos = await db.pedido.findMany({ where: { id: { in: ids } }, include: { cliente: true }, orderBy: { numero: "asc" } });
  return (
    <div className="min-h-screen bg-white p-6 print:p-0">
      <div className="no-imprimir mb-4 flex items-center gap-3"><BotonImprimir texto="Imprimir rótulos" /><span className="text-sm text-texto-2">{pedidos.length} rótulo(s) · 2 por fila en hoja A4</span></div>
      <div className="grid grid-cols-2 gap-4 print:gap-3">
        {pedidos.map((p) => {
          const d = datosEnvio(p);
          return (
            <div key={p.id} className="border-2 border-dashed border-texto rounded-xl p-5 break-inside-avoid text-[15px] leading-snug">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs uppercase tracking-widest text-texto-2">Destinatario</p>
                <p className="text-xs font-semibold">Pedido N° {p.numero}{p.formaEnvio ? ` · ${p.formaEnvio}` : ""}</p>
              </div>
              <p className="text-xl font-bold">{d.nombre}</p>
              {d.dni && <p>DNI {d.dni}</p>}
              <p className="mt-1 font-medium">{d.direccion ?? "(sin dirección)"}</p>
              {d.entreCalles && <p>Entre calles: {d.entreCalles}</p>}
              <p>{[d.localidad, d.provincia].filter(Boolean).join(", ")}</p>
              {d.codigoPostal && <p className="font-bold">CP {d.codigoPostal}</p>}
              {d.telefono && <p>Tel: {d.telefono}</p>}
              <div className="border-t border-borde mt-3 pt-2 text-xs text-texto-2">
                <span className="uppercase tracking-widest">Remitente:</span> <span className="titulo italic text-base text-acento">Micaela Diseño</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
