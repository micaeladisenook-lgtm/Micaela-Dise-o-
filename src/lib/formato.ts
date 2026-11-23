// Pesos argentinos: $169.990
export function pesos(n: number | null | undefined): string {
  if (n === null || n === undefined) return "A definir";
  return "$" + Math.round(n).toLocaleString("es-AR");
}

// Fechas en formato día/mes/año: 23/11/2026
export function fecha(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const f = typeof d === "string" ? new Date(d) : d;
  return f.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export function fechaHora(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const f = typeof d === "string" ? new Date(d) : d;
  return (
    fecha(f) +
    " " +
    f.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
    })
  );
}

// Convierte "169.990" o "$ 169990" en 169990
export function leerPesos(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const limpio = String(texto).replace(/[^\d]/g, "");
  if (!limpio) return null;
  return parseInt(limpio, 10);
}

// Número de WhatsApp en formato internacional argentino (549 + área + número)
export function numeroWhatsApp(tel: string | null | undefined): string | null {
  if (!tel) return null;
  let d = tel.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("549")) return d;
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  // quitar el "15" después del código de área de CABA (11 15 xxxx xxxx)
  if (d.startsWith("1115") && d.length === 12) d = "11" + d.slice(4);
  return "549" + d;
}

export function linkWhatsApp(tel: string | null | undefined, mensaje = ""): string | null {
  const n = numeroWhatsApp(tel);
  if (!n) return null;
  return `https://wa.me/${n}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ""}`;
}

export function textoLista(texto: string | null | undefined): string[] {
  if (!texto) return [];
  return texto
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Usuario de Instagram sin @ ni dirección web
export function usuarioInstagram(ig: string | null | undefined): string | null {
  if (!ig) return null;
  const u = ig.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/^@+/, "").replace(/[/?#].*$/, "");
  return /^[\w.]{1,30}$/.test(u) ? u : null;
}
// Abre el chat directo (mensaje privado) de Instagram con esa persona
export function linkInstagram(ig: string | null | undefined): string | null {
  const u = usuarioInstagram(ig);
  return u ? `https://ig.me/m/${u}` : null;
}
