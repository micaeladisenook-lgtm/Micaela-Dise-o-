"use client";
import { useTransition } from "react";
import { cambiarEstado } from "./acciones";
import { ESTADOS, NOMBRE_ESTADO, COLOR_ESTADO } from "@/lib/pedidos";

export default function BotonesEstado({ pedidoId, estado }: { pedidoId: string; estado: string }) {
  const [p, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {ESTADOS.map((e) => {
        const on = e === estado;
        return (
          <button key={e} disabled={p || on} onClick={() => {
            if (e === "CANCELADO" && !confirm("¿Seguro que querés cancelar este pedido?")) return;
            start(() => cambiarEstado(pedidoId, e));
          }}
            className={`btn min-h-10 px-4 ${on ? `${COLOR_ESTADO[e]} ring-2 ring-offset-1 ring-current disabled:opacity-100` : "bg-white border border-borde hover:border-acento"}`}>
            {NOMBRE_ESTADO[e]}
          </button>
        );
      })}
    </div>
  );
}
