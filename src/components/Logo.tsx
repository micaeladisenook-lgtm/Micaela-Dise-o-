import Image from "next/image";

// Logo de la marca (public/logo.png, fondo transparente)
export default function Logo({ className = "", alt = "Micaela Diseño" }: { className?: string; alt?: string }) {
  return <Image src="/logo.png" alt={alt} width={938} height={296} priority className={`h-auto ${className}`} />;
}
