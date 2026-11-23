import { COLOR_ESTADO, NOMBRE_ESTADO } from "@/lib/pedidos";

export default function EstadoChip({ estado, atrasado }: { estado: string; atrasado?: boolean }) {
  if (atrasado) return <span className="chip bg-estado-alerta text-estado-alerta-txt">Atrasado</span>;
  return <span className={`chip ${COLOR_ESTADO[estado]}`}>{NOMBRE_ESTADO[estado]}</span>;
}
