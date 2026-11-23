export default function Encabezado({
  titulo, subtitulo, children,
}: { titulo: string; subtitulo?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl md:text-4xl">{titulo}</h1>
        {subtitulo && <p className="text-texto-2 text-sm mt-1">{subtitulo}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2 no-imprimir">{children}</div>}
    </div>
  );
}
