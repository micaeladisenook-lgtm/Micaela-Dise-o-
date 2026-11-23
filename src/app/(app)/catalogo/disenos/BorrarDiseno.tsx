"use client";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { borrarDiseno } from "./acciones";

export default function BorrarDiseno({ id, nombre }: { id: string; nombre: string }) {
  const [p, start] = useTransition();
  return (
    <button disabled={p} title="Borrar" onClick={() => confirm(`¿Borrar "${nombre}" de la galería?`) && start(() => borrarDiseno(id))}
      className="w-10 h-10 rounded-full bg-white/90 text-estado-alerta-txt flex items-center justify-center hover:bg-white cursor-pointer shadow-sm">
      <Trash2 size={16} />
    </button>
  );
}
