import Encabezado from "./Encabezado";

export default function Proximamente({ titulo, etapa, detalle }: { titulo: string; etapa: number; detalle: string }) {
  return (
    <>
      <Encabezado titulo={titulo} />
      <div className="tarjeta p-8 text-center max-w-xl">
        <p className="titulo text-2xl italic text-acento">Próximamente</p>
        <p className="text-texto-2 mt-2 text-sm">Esta sección se construye en la <strong>Etapa {etapa}</strong>.</p>
        <p className="text-texto-2 mt-1 text-sm">{detalle}</p>
      </div>
    </>
  );
}
