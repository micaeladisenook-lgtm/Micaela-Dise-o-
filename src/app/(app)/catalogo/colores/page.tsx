import Encabezado from "@/components/Encabezado";
import Pestanas from "../Pestanas";
import CeldaColor from "./CeldaColor";
import { requerirPermiso, permisosDe } from "@/lib/acceso";
import { coloresDelCatalogo, fotosDeColores, TELAS } from "@/lib/colores";

export default async function ColoresPage() {
  const u = await requerirPermiso("ver_catalogo");
  const editar = (await permisosDe(u)).has("gestionar_disenos");
  const [colores, fotos] = await Promise.all([coloresDelCatalogo(), fotosDeColores()]);
  const cargadas = (t: string) => colores.filter((c) => fotos[t]?.[c]).length;
  return (
    <>
      <Encabezado titulo="Catálogo y precios" subtitulo="Fotos de productos, colores y bordados para elegir al cargar un pedido" />
      <Pestanas activa="colores" />
      <p className="text-sm text-texto-2 mb-4 max-w-2xl">
        Una foto por color. Las clientas las ven en el formulario de pedido y en el link para completar datos, al elegir el color de cada prenda.
        {editar && " Tocá un cuadrito para subir o cambiar la foto."} Los colores salen de los productos del catálogo.
      </p>
      <div className="grid lg:grid-cols-2 gap-6">
        {TELAS.map((tela) => (
          <section key={tela} className="tarjeta p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-2xl">{tela}</h2>
              <span className="text-xs text-texto-2">{cargadas(tela)} de {colores.length} con foto</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-3">
              {colores.map((c) => (
                <div key={c}>
                  <CeldaColor color={c} tela={tela} imagen={fotos[tela]?.[c] ?? null} puedeEditar={editar} />
                  <p className="text-xs text-center mt-1 leading-tight">{c}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
