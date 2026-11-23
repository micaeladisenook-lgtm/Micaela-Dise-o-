// Qué ve cada taller de un trabajo: solo lo que necesita para SU tarea
// (sin datos de la clienta). Sirve en servidor y en el navegador.

export type ItemParaTaller = {
  orden: number;
  nombre: string;
  persona: string | null;
  bordadoTexto: string | null;
  bordadoUbicacion: string | null;
  bordadoDetalle?: string | null;
  bordadoFotos?: string[];
  hilo: string | null;
  notas: string | null;
};

export type TareaParaTaller = {
  clave: string;
  prenda: string;
  color: string | null;
  talle: string | null;
  bordado: string | null;
  detalle: string | null;
};

export type Dato = { etiqueta: string; valor: string; destacado?: boolean };
export type VistaTarea = { accion: string; prenda: string; datos: Dato[]; notas: string[]; conDisenos: boolean; fotos: string[] };

export const ACCION_FUNCION: Record<string, { verbo: string; empezar: string; terminar: string }> = {
  CONFECCION_ROPA: { verbo: "Confeccionar", empezar: "Tildá cuando empieces a cortar/coser", terminar: "Tildá cuando la prenda esté cosida" },
  BORDADO: { verbo: "Bordar", empezar: "Tildá cuando empieces a bordar", terminar: "Tildá cuando el bordado esté hecho" },
  CONFECCION_PANTU: { verbo: "Armar pantuflas", empezar: "Tildá cuando empieces a armarlas", terminar: "Tildá cuando estén armadas" },
  PEGADO_PANTU: { verbo: "Pegar pantuflas", empezar: "Tildá cuando empieces a pegarlas", terminar: "Tildá cuando estén pegadas" },
  OTRO: { verbo: "Hacer", empezar: "Tildá cuando lo empieces", terminar: "Tildá cuando esté terminado" },
};

// "Talles (planilla): Bata M - Pantu 38 - Pijama L" → ["Bata M", "Pantu 38", "Pijama L"]
function partesTalles(notas: string | null) {
  const linea = (notas ?? "").split("\n").find((l) => /^talles/i.test(l.trim()));
  if (!linea) return [];
  return linea.replace(/^talles[^:]*:\s*/i, "").split(/\s+-\s+|\s*-(?=\s*[A-Za-zÁÉÍÓÚáéíóú])/).map((s) => s.trim()).filter(Boolean);
}

// Notas del producto que no son talles ni dedicatoria (eso no le sirve al taller)
function notasUtiles(notas: string | null, sacarPantu: boolean) {
  return (notas ?? "").split("\n").map((l) => l.trim()).filter((l) => l && !/^talles|^dedicatoria/i.test(l) && !(sacarPantu && /pantu/i.test(l)));
}

export function itemDeTarea<T extends { orden: number }>(clave: string, items: T[]) {
  const orden = Number(clave.split(".")[0]);
  return items.find((i) => i.orden === orden) ?? null;
}

export function vistaTarea(funcion: string, t: TareaParaTaller, it: ItemParaTaller | null): VistaTarea {
  const accion = ACCION_FUNCION[funcion]?.verbo ?? "Hacer";
  const prenda = t.prenda;
  const datos: Dato[] = [];
  const add = (etiqueta: string, valor: string | null | undefined, destacado = false) => { if (valor) datos.push({ etiqueta, valor, destacado }); };
  const talles = partesTalles(it?.notas ?? null);

  if (funcion === "BORDADO") {
    if (t.clave.includes("-x-")) add("Tipo", "Bordado adicional");
    add("Color de la prenda", t.color);
    add("Texto", it?.bordadoTexto ?? t.bordado, true);
    add("Ubicación", it?.bordadoUbicacion);
    add("Dónde exactamente", it?.bordadoDetalle, true);
    add("Hilo", it?.hilo);
    add("Para", it?.persona);
    return { accion, prenda, datos, notas: notasUtiles(it?.notas ?? null, false), conDisenos: true, fotos: it?.bordadoFotos ?? [] };
  }

  if (funcion === "CONFECCION_PANTU" || funcion === "PEGADO_PANTU") {
    const tallePantu = t.talle ?? talles.find((s) => /pantu/i.test(s))?.replace(/^pantu\w*\s*/i, "") ?? null;
    add("Color", t.color);
    add("Talle", tallePantu ?? "a confirmar", true);
    return { accion, prenda, datos, notas: notasUtiles(it?.notas ?? null, false).filter((l) => /pantu|suela|horma/i.test(l)), conDisenos: false, fotos: [] };
  }

  if (funcion === "CONFECCION_ROPA") {
    // talle: el de la prenda o, si no está, el de la planilla que corresponda a esta prenda (nunca el de pantuflas)
    const ropa = talles.filter((s) => !/pantu/i.test(s) || /bata|pijama|camis/i.test(s));
    const tipo = /bata/i.test(prenda) ? /bata/i : /pijama|camis|short|tiras/i.test(prenda) ? /pijama|camis/i : null;
    const propio = tipo ? ropa.filter((s) => tipo.test(s)) : [];
    add("Color", t.color);
    if (t.talle) add("Talle", t.talle, true);
    else if (propio.length) add("Talle", propio.join(" · "), true);
    else if (ropa.length && !tipo) add("Talles (planilla)", ropa.join(" · "), true);
    else add("Talle", "a confirmar", true);
    return { accion, prenda, datos, notas: notasUtiles(it?.notas ?? null, true), conDisenos: false, fotos: [] };
  }

  add("Color", t.color);
  add("Talle", t.talle);
  add("Bordado", t.bordado);
  return { accion, prenda, datos, notas: notasUtiles(it?.notas ?? null, false), conDisenos: !!t.bordado, fotos: [] };
}
