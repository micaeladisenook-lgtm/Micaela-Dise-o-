import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { pedidoPorToken } from "@/lib/resumen";
import { fecha, pesos } from "@/lib/formato";
import { pagado, saldo, textoEntrega } from "@/lib/pedidos";

const ACENTO = rgb(0.612, 0.247, 0.361);
const GRIS = rgb(0.42, 0.357, 0.38);
const TEXTO = rgb(0.169, 0.137, 0.149);

// Las fuentes estándar del PDF no tienen emojis: los quitamos
const limpio = (s: string) => s.replace(/[“”]/g, '"').replace(/[^\x20-\x7E -ÿ–—•…'"]/g, "").trim();

function partir(texto: string, fuente: PDFFont, tam: number, ancho: number) {
  const palabras = limpio(texto).split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const w of palabras) {
    const prueba = actual ? `${actual} ${w}` : w;
    if (fuente.widthOfTextAtSize(prueba, tam) > ancho && actual) { lineas.push(actual); actual = w; } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await pedidoPorToken(token);
  if (!p) return new Response("No encontrado", { status: 404 });

  const doc = await PDFDocument.create();
  doc.setTitle(`Resumen pedido ${p.numero} - Micaela Diseño`);
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const cursiva = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const M = 50, W = 595, H = 842;
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - 60;
  const nueva = () => { page = doc.addPage([W, H]); y = H - 60; };
  const escribir = (t: string, x: number, o: { f?: PDFFont; s?: number; c?: ReturnType<typeof rgb> } = {}) =>
    page.drawText(limpio(t), { x, y, size: o.s ?? 10, font: o.f ?? normal, color: o.c ?? TEXTO });
  const derecha = (t: string, o: { f?: PDFFont; s?: number; c?: ReturnType<typeof rgb> } = {}) => {
    const f = o.f ?? normal, s = o.s ?? 10;
    escribir(t, W - M - f.widthOfTextAtSize(limpio(t), s), o);
  };

  // Encabezado
  const marca = "Micaela Diseño";
  page.drawText(marca, { x: (W - cursiva.widthOfTextAtSize(marca, 30)) / 2, y, size: 30, font: cursiva, color: ACENTO });
  y -= 22;
  const sub = "RESUMEN DE TU COMPRA";
  page.drawText(sub, { x: (W - normal.widthOfTextAtSize(sub, 9)) / 2, y, size: 9, font: normal, color: GRIS });
  y -= 18;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: rgb(0.92, 0.87, 0.85) });
  y -= 24;
  escribir("Clienta", M, { c: GRIS, s: 9 }); derecha(`Pedido N° ${p.numero}`, { c: GRIS, s: 9 }); y -= 14;
  escribir(p.cliente.nombre, M, { f: negrita, s: 12 }); derecha(fecha(p.fechaPedido)); y -= 28;

  // Productos
  for (const i of p.items) {
    if (y < 140) nueva();
    const titulo = `${i.cantidad > 1 ? `${i.cantidad} x ` : ""}${i.nombre}${i.persona ? ` · ${i.persona}` : ""}`;
    for (const [k, l] of partir(titulo, negrita, 11, W - 2 * M - 90).entries()) {
      escribir(l, M, { f: negrita, s: 11 });
      if (k === 0 && i.precioUnitario) derecha(pesos(i.precioUnitario * i.cantidad), { s: 11 });
      y -= 15;
    }
    const detalles = [
      ...i.prendas.map((pr) => `– ${pr.nombre}${pr.color ? `: ${pr.color}` : ""}${pr.talle ? ` · talle ${pr.talle}` : ""}`),
      ...(i.bordadoTexto ? [`– Bordado: "${i.bordadoTexto}"${i.bordadoUbicacion ? ` · ${i.bordadoUbicacion}` : ""}${i.hilo ? ` · hilo ${i.hilo.toLowerCase()}` : ""}`] : []),
    ];
    for (const d of detalles) for (const l of partir(d, normal, 9.5, W - 2 * M - 10)) { if (y < 80) nueva(); escribir(l, M + 8, { s: 9.5, c: GRIS }); y -= 13; }
    y -= 8;
  }

  // Totales
  if (y < 160) nueva();
  page.drawLine({ start: { x: M, y: y + 4 }, end: { x: W - M, y: y + 4 }, thickness: 1.2, color: TEXTO });
  y -= 14;
  const sal = saldo(p.total, p.pagos);
  escribir("Total", M, { f: negrita, s: 12 }); derecha(pesos(p.total), { f: negrita, s: 12 }); y -= 16;
  escribir("Abonado", M); derecha(pesos(pagado(p.pagos))); y -= 14;
  escribir("Saldo", M, { f: negrita, c: ACENTO }); derecha(sal > 0 ? pesos(sal) : "Pagado", { f: negrita, c: ACENTO }); y -= 26;

  if (p.fechaEvento) { escribir(`Evento: ${fecha(p.fechaEvento)}`, M, { s: 10 }); y -= 14; }
  for (const l of partir(`Entrega: ${textoEntrega(p)}`, normal, 10, W - 2 * M)) { escribir(l, M); y -= 14; }
  y -= 20;
  const gracias = "¡Gracias por elegirnos! Ante cualquier duda escribinos por WhatsApp o Instagram.";
  page.drawText(gracias, { x: (W - normal.widthOfTextAtSize(gracias, 9)) / 2, y, size: 9, font: normal, color: GRIS });

  const bytes = await doc.save();
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="micaela-diseno-pedido-${p.numero}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
