"use client";
import { useTransition } from "react";
import { Check } from "lucide-react";
import { marcarRevisado } from "./acciones";

export default function BotonRevisado({ id }: { id: string }) {
  const [p, start] = useTransition();
  return (
    <button disabled={p} onClick={() => start(() => marcarRevisado(id))} className="btn bg-white border border-estado-produccion-txt/30 min-h-9 px-3 text-xs shrink-0 no-imprimir">
      <Check size={14} /> {p ? "Guardando…" : "Marcar como revisado"}
    </button>
  );
}
