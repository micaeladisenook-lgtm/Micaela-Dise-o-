// Las tipografías que usa Micaela para bordar.
// "fuente" es la letra que se usa para mostrar la muestra en pantalla.
export const TIPOGRAFIAS = [
  { nombre: "Alex Brush", estilo: "Cursiva", fuente: "var(--font-alex), cursive", tamano: "1.6em" },
  { nombre: "Bodoni FLF", estilo: "Clásica con serifa", fuente: "var(--font-bodoni), 'Bodoni 72', Didot, serif", tamano: "1.25em" },
] as const;

export type NombreTipografia = (typeof TIPOGRAFIAS)[number]["nombre"];
export const NOMBRES_TIPOGRAFIA: string[] = TIPOGRAFIAS.map((t) => t.nombre);
export const tipografia = (nombre: string | null | undefined) => TIPOGRAFIAS.find((t) => t.nombre === nombre) ?? null;
// Guarda solo nombres válidos (o null)
export const tipografiaValida = (v: string | null | undefined) => (v && NOMBRES_TIPOGRAFIA.includes(v) ? v : null);
