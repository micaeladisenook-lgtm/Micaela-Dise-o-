"use client";
import { useTransition } from "react";

export default function BotonBorrar({
  accion, texto = "Borrar", confirmacion,
}: { accion: () => Promise<void>; texto?: string; confirmacion: string }) {
  const [pendiente, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-peligro"
      disabled={pendiente}
      onClick={() => {
        if (confirm(confirmacion)) start(() => accion());
      }}
    >
      {pendiente ? "Borrando…" : texto}
    </button>
  );
}
