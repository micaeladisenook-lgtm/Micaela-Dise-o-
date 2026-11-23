import "server-only";
import { db } from "./db";

export async function registrar(
  usuarioId: string | null,
  accion: string,
  entidad: string,
  entidadId?: string | null,
  detalle?: string | null,
) {
  await db.registro.create({
    data: { usuarioId, accion, entidad, entidadId: entidadId ?? null, detalle: detalle ?? null },
  });
}
