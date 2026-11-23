import Link from "next/link";
import { notFound } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import FormTaller from "./FormTaller";
import { db } from "@/lib/db";
import { requerirPermiso } from "@/lib/acceso";

export default async function EditarTallerPage({ params }: { params: Promise<{ id: string }> }) {
  await requerirPermiso("editar_talleres");
  const { id } = await params;
  const t = id === "nuevo" ? null : await db.taller.findUnique({ where: { id } });
  if (id !== "nuevo" && !t) notFound();
  return (
    <>
      <Encabezado titulo={t ? t.nombre : "Nuevo taller"}><Link href="/talleres" className="btn-suave">Volver</Link></Encabezado>
      <div className="tarjeta p-5 max-w-xl"><FormTaller taller={t} /></div>
    </>
  );
}
