"use client";
import { useTransition } from "react";
import { X } from "lucide-react";
import { borrarPago } from "./acciones";

export default function BorrarPago({ id }: { id: string }) {
  const [p, start] = useTransition();
  return (
    <button disabled={p} title="Borrar pago" onClick={() => confirm("¿Borrar este pago?") && start(() => borrarPago(id))}
      className="w-8 h-8 rounded-full inline-flex items-center justify-center text-texto-2 hover:bg-estado-alerta hover:text-estado-alerta-txt cursor-pointer no-imprimir">
      <X size={14} />
    </button>
  );
}
