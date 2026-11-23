import "server-only";
import { db } from "./db";

// Todo lo que necesita el formulario de pedido
export async function datosFormularioPedido() {
  const [productos, disenos, vendedores, plantilla] = await Promise.all([
    db.producto.findMany({
      where: { activo: true, OR: [{ enListaPrecios: true }, { tipo: { not: "SUELTO" } }] },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: {
        id: true, nombre: true, tipo: true, precio: true, colores: true, talles: true,
        componentes: {
          orderBy: { id: "asc" },
          select: {
            cantidad: true, opcional: true, aEleccion: true,
            componente: { select: { id: true, nombre: true, colores: true, talles: true } },
          },
        },
      },
    }),
    db.diseno.findMany({ orderBy: [{ categoria: "asc" }, { creadoEn: "desc" }], select: { id: true, nombre: true, imagen: true, categoria: true } }),
    db.usuario.findMany({ where: { activo: true, rol: { in: ["ADMIN", "VENDEDOR"] } }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    db.plantilla.findUnique({ where: { clave: "confirmacion" } }),
  ]);
  return { productos, disenos, vendedores, plantilla: plantilla?.texto ?? "" };
}

export const includePedidoCompleto = {
  cliente: true,
  vendedor: true,
  creadoPor: true,
  modificadoPor: true,
  pagos: { orderBy: { fecha: "asc" as const }, include: { creadoPor: true } },
  items: { orderBy: { orden: "asc" as const }, include: { prendas: { orderBy: { orden: "asc" as const } } } },
  disenos: { include: { diseno: true } },
  tareas: { include: { taller: true }, orderBy: [{ clave: "asc" as const }] },
};
