"use client";
export default function BotonImprimir({ texto = "Imprimir", icono }: { texto?: string; icono?: React.ReactNode }) {
  return <button type="button" onClick={() => window.print()} className="btn-suave">{icono}{texto}</button>;
}
