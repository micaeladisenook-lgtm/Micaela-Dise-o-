// Columnas del tablero de cada taller (sirve en servidor y en el navegador)
export type Etapa = "RECIBIDO" | "EN_PRODUCCION" | "LISTO";
export const ETAPAS: Etapa[] = ["RECIBIDO", "EN_PRODUCCION", "LISTO"];
export const NOMBRE_ETAPA: Record<Etapa, string> = {
  RECIBIDO: "Recibido",
  EN_PRODUCCION: "En producción",
  LISTO: "Listo para entregar",
};
export const siguienteEtapa = (e: Etapa): Etapa | null => ETAPAS[ETAPAS.indexOf(e) + 1] ?? null;
export const etapaAnterior = (e: Etapa): Etapa | null => ETAPAS[ETAPAS.indexOf(e) - 1] ?? null;
