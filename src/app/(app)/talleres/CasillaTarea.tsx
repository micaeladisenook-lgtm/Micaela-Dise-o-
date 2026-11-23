"use client";
import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { marcarTarea } from "./acciones";

export default function CasillaTarea({ id, terminada, bloqueada }: { id: string; terminada: boolean; bloqueada?: boolean }) {
  const [, start] = useTransition();
  const [on, setOn] = useOptimistic(terminada);
  return (
    <button
      type="button"
      aria-label={on ? "Marcar como pendiente" : "Marcar como terminada"}
      title={bloqueada && !on ? "Todavía falta el paso anterior, pero podés marcarla igual" : undefined}
      onClick={() => start(async () => { setOn(!on); await marcarTarea(id, !on); })}
      className={`w-11 h-11 shrink-0 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-colors ${on ? "bg-estado-listo-txt border-estado-listo-txt text-white" : "bg-white border-borde hover:border-acento"}`}
    >
      {on && <Check size={20} strokeWidth={3} />}
    </button>
  );
}
