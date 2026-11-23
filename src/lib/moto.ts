import "server-only";
import { db } from "./db";

// Normaliza nombres de localidad: sin tildes, sin puntos, abreviaturas expandidas
export function normalizarLocalidad(s: string | null | undefined) {
  return ` ${(s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")} `
    .replace(/[.,;()/-]/g, " ")
    .replace(/\bgral\b/g, "general").replace(/\bing\b/g, "ingeniero").replace(/\bpres\b/g, "presidente")
    .replace(/\bsta\b/g, "santa").replace(/\bpdo\b|\bpartido de\b/g, " ")
    .replace(/\s+/g, " ");
}
// Para comparar el nombre de la lista sin aclaraciones como "(Sur)" o "(hasta km 38)"
const nombreBase = (s: string) => normalizarLocalidad(s.replace(/\(.*?\)/g, ""));

const esCaba = (t: string) => /\b(caba|capital federal|ciudad autonoma|ciudad de buenos aires)\b/.test(t);

export type TarifaEncontrada = { zona: string; localidad: string; precio: number };

// Busca la tarifa según la localidad (o barrio) de la clienta.
// Gana la coincidencia más larga ("Merlo Gómez" antes que "Merlo").
export async function buscarTarifaMoto(localidad: string | null, provincia?: string | null, direccion?: string | null): Promise<TarifaEncontrada[]> {
  const tarifas = await db.tarifaMoto.findMany();
  const textos = [localidad, direccion].map(normalizarLocalidad).filter((t) => t.trim());
  for (const t of textos) {
    let mejores: typeof tarifas = [];
    let largo = 0;
    for (const tf of tarifas) {
      const n = nombreBase(tf.localidad);
      if (n.trim().length < 3 || !t.includes(n)) continue;
      if (n.length > largo) { mejores = [tf]; largo = n.length; } else if (n.length === largo) mejores.push(tf);
    }
    if (mejores.length) return mejores.map(({ zona, localidad, precio }) => ({ zona, localidad, precio }));
  }
  // Capital sin barrio reconocido: precio más común de CABA
  if (esCaba(normalizarLocalidad(`${localidad ?? ""} ${provincia ?? ""}`))) {
    const caba = tarifas.filter((t) => t.zona === "CABA");
    if (caba.length) {
      const cuenta = new Map<number, number>();
      caba.forEach((t) => cuenta.set(t.precio, (cuenta.get(t.precio) ?? 0) + 1));
      const precio = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return [{ zona: "CABA", localidad: "CABA", precio }];
    }
  }
  return [];
}
