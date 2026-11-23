import Link from "next/link";

export default function Pestanas({ activa }: { activa: "productos" | "disenos" }) {
  const cls = (on: boolean) =>
    `min-h-11 px-5 inline-flex items-center rounded-full text-sm ${on ? "bg-white border border-borde font-medium text-acento" : "text-texto-2 hover:text-texto"}`;
  return (
    <div className="inline-flex gap-1 bg-menu rounded-full p-1 mb-6">
      <Link href="/catalogo" className={cls(activa === "productos")}>Productos y precios</Link>
      <Link href="/catalogo/disenos" className={cls(activa === "disenos")}>Galería de diseños</Link>
    </div>
  );
}
