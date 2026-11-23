import "server-only";
import { db } from "./db";

// Tablas en el orden en que se restauran (primero las que no dependen de otras)
const TABLAS = [
  "usuario", "taller", "producto", "componenteBox", "itemStock", "consumoProducto", "cliente", "diseno",
  "pedido", "pedidoItem", "prendaItem", "disenoPedido", "pago", "tarea", "movimientoStock", "gasto",
  "plantilla", "permiso", "permisoUsuario", "fotoColor", "registro",
] as const;

type Delegado = { findMany: () => Promise<unknown[]>; deleteMany: () => Promise<unknown>; createMany: (a: { data: unknown[] }) => Promise<unknown> };
const tabla = (t: string) => (db as unknown as Record<string, Delegado>)[t];

export async function exportarTodo() {
  const datos: Record<string, unknown[]> = {};
  for (const t of TABLAS) datos[t] = await tabla(t).findMany();
  return { app: "micaela-diseno", version: 1, fecha: new Date().toISOString(), datos };
}

const FECHA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const revivir = (o: unknown): unknown => {
  if (Array.isArray(o)) return o.map(revivir);
  if (o && typeof o === "object") return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "string" && FECHA.test(v) ? new Date(v) : revivir(v)]));
  return o;
};

// Reemplaza TODO el contenido de la base por el de la copia
// "conservar": la usuaria que restaura mantiene su contraseña actual (y sigue siendo administradora)
export async function restaurarTodo(copia: { app?: string; datos?: Record<string, unknown[]> }, conservar?: { login: string; passwordHash: string }) {
  if (copia.app !== "micaela-diseno" || !copia.datos) throw new Error("El archivo no es una copia de seguridad de Micaela Diseño.");
  if (conservar) {
    copia.datos.usuario = (copia.datos.usuario as { login: string }[]).map((u) =>
      u.login === conservar.login ? { ...u, passwordHash: conservar.passwordHash, rol: "ADMIN", activo: true, debeCambiarClave: false } : u);
  }
  await db.$transaction(async (tx) => {
    const t = (n: string) => (tx as unknown as Record<string, Delegado>)[n];
    for (const n of [...TABLAS].reverse()) await t(n).deleteMany();
    for (const n of TABLAS) {
      const filas = (copia.datos![n] ?? []).map(revivir);
      for (let i = 0; i < filas.length; i += 500) await t(n).createMany({ data: filas.slice(i, i + 500) });
    }
    // que los números automáticos sigan desde el último
    await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Cliente"','numero'), COALESCE((SELECT max(numero) FROM "Cliente"),0)+1, false)`);
    await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Pedido"','numero'), COALESCE((SELECT max(numero) FROM "Pedido"),0)+1, false)`);
  }, { timeout: 120000, maxWait: 20000 });
}
