import { headers } from "next/headers";
import Encabezado from "@/components/Encabezado";
import Respuestas from "./Respuestas";
import { db } from "@/lib/db";
import { requerirPermiso, permisosDe } from "@/lib/acceso";
import { pesos } from "@/lib/formato";

const GRUPOS: [string, string][] = [["BOX", "🎁 Boxes"], ["KIT", "✨ Kits"], ["SUELTO", "👘 Prendas sueltas"], ["ADICIONAL", "➕ Adicionales"]];

export default async function RespuestasPage() {
  const u = await requerirPermiso("usar_respuestas");
  const editar = (await permisosDe(u)).has("editar_mensajes");
  const [plantillas, productos] = await Promise.all([
    db.plantilla.findMany({ where: { clave: { startsWith: "rr_" } }, orderBy: { clave: "asc" } }),
    db.producto.findMany({ where: { activo: true, enListaPrecios: true }, orderBy: [{ tipo: "asc" }, { orden: "asc" }] }),
  ]);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const base = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;

  // Lista de precios armada con el catálogo (siempre actualizada)
  const precios = GRUPOS.map(([tipo, titulo]) => {
    const lista = productos.filter((p) => p.tipo === tipo && p.precio != null);
    if (!lista.length) return null;
    return [titulo, ...lista.map((p) => `• ${p.nombre}: ${tipo === "ADICIONAL" ? "+" : ""}${pesos(p.precio!)}${p.precioAnterior ? ` (antes ${pesos(p.precioAnterior)})` : ""}`)].join("\n");
  }).filter(Boolean).join("\n\n");

  const variables = { "{precios}": precios, "{formulario}": `${base}/pedido` };

  return (
    <>
      <Encabezado titulo="Respuestas rápidas" subtitulo="Textos listos para contestar en Instagram o WhatsApp: tocá Copiar y pegalo en el chat." />
      <Respuestas respuestas={plantillas.map((p) => ({ clave: p.clave, titulo: p.titulo, texto: p.texto }))} variables={variables} puedeEditar={editar} />
    </>
  );
}
