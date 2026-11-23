// Prendas que trae un producto (las fijas + la elegida, repetidas según cantidad), en un orden fijo.
// La usan el formulario público y el servidor, para que "prenda 0, 1, 2…" signifique lo mismo en los dos.
type Comp = { componenteId: string; cantidad: number; aEleccion: boolean; componente: { id: string; nombre: string; colores: string[]; talles: string[] } };
type Prod = { id: string; nombre: string; colores: string[]; talles: string[]; componentes: Comp[] };

export type PrendaDeProducto = { productoId: string; nombre: string; colores: string[]; talles: string[] };

export function prendasDelProducto(p: Prod, eleccionId?: string | null): PrendaDeProducto[] {
  if (p.componentes.length === 0) return [{ productoId: p.id, nombre: p.nombre, colores: p.colores, talles: p.talles }];
  const opciones = p.componentes.filter((c) => c.aEleccion);
  const elegida = opciones.find((c) => c.componenteId === eleccionId) ?? opciones[0];
  return p.componentes
    .filter((c) => !c.aEleccion || c === elegida)
    .flatMap((c) => Array.from({ length: Math.max(1, c.cantidad) }, () => ({
      productoId: c.componenteId, nombre: c.componente.nombre, colores: c.componente.colores, talles: c.componente.talles,
    })));
}

// Prendas que no se eligen por color/talle (regalos del box)
export const esAccesorio = (nombre: string) => /scrunchie|tarjeta|caja|tubo|funda|cofia/i.test(nombre);

export const PROVINCIAS_AR = [
  "Buenos Aires", "Ciudad Autónoma de Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos",
  "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis",
  "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];
