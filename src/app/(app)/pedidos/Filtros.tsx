"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useRef } from "react";

export default function Filtros({ vendedores }: { vendedores: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function cambiar(k: string, v: string, demora = 0) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const n = new URLSearchParams(sp.toString());
      if (v) n.set(k, v); else n.delete(k);
      n.delete("pagina");
      router.replace(`/pedidos?${n.toString()}`);
    }, demora);
  }
  return (
    <div className="grid sm:grid-cols-[1fr_200px_200px] gap-2 mb-4">
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-2" />
        <input defaultValue={sp.get("q") ?? ""} onChange={(e) => cambiar("q", e.target.value, 350)} className="campo pl-10"
          placeholder="Buscar clienta, N° de pedido o N° de clienta" />
      </div>
      <select className="campo" defaultValue={sp.get("vendedora") ?? ""} onChange={(e) => cambiar("vendedora", e.target.value)}>
        <option value="">Todas las vendedoras</option>
        {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
      </select>
      <select className="campo" defaultValue={sp.get("pago") ?? ""} onChange={(e) => cambiar("pago", e.target.value)}>
        <option value="">Pago: todos</option>
        <option value="deuda">Con saldo pendiente</option>
        <option value="pagado">Pagados</option>
      </select>
    </div>
  );
}
