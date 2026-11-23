import { PrismaClient, TipoProducto } from "@prisma/client";
import { TARIFAS_MOTO_INICIALES } from "../src/lib/tarifasMotoIniciales";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const db = new PrismaClient();

const COLORES = ["Blanco", "Off white", "Nude", "Arena", "Camel", "Champagne", "Rosa claro", "Rosa viejo", "Rosa gold", "Lila", "Celeste", "Verde agua", "Azul francia", "Azul marino", "Petróleo", "Gris perla", "Bordó", "Rojo", "Negro"];
const TALLES_ROPA = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "Kids"];
const TALLES_PANTU = ["35", "36", "37", "38", "39", "40", "41", "42"];

async function main() {
  // 1) Usuaria administradora (solo si no hay ninguna). La contraseña inicial sale de ADMIN_CLAVE_INICIAL.
  if ((await db.usuario.count({ where: { rol: "ADMIN" } })) === 0) {
    const clave = process.env.ADMIN_CLAVE_INICIAL || randomUUID().slice(0, 12);
    await db.usuario.create({ data: { nombre: "Micaela", login: "micaela", rol: "ADMIN", passwordHash: await bcrypt.hash(clave, 10), debeCambiarClave: true } });
    if (!process.env.ADMIN_CLAVE_INICIAL) console.log(`Usuario "micaela" creado con contraseña provisoria: ${clave}`);
  }

  // Talleres
  if ((await db.taller.count()) === 0) {
    await db.taller.createMany({
      data: [
        { nombre: "Gery", especialidad: "Confección: batas, pijamas de tiras, camiseros y camisolines", funcion: "CONFECCION_ROPA", orden: 1 },
        { nombre: "Héctor", especialidad: "Bordados", funcion: "BORDADO", orden: 2 },
        { nombre: "Richard", especialidad: "Confecciona las pantuflas (cuando están los bordados)", funcion: "CONFECCION_PANTU", orden: 3 },
        { nombre: "Pedro", especialidad: "Pega las pantuflas", funcion: "PEGADO_PANTU", orden: 4 },
      ],
    });
  }

  // Plantillas de WhatsApp (solo se crean si no existen, para no pisar cambios)
  const plantillas = [
    {
      clave: "confirmacion",
      titulo: "Confirmación del pedido",
      texto: "¡Hola {nombre}! 💕 Gracias por elegir Micaela Diseño.\n\nTe confirmamos tu pedido N° {pedido}:\n{detalle}\n\n🗓️ Evento: {fecha_evento}\n📦 Entrega: {entrega}\n\n💰 Total: {total}\n✅ Abonado: {pagado}\n⏳ Saldo: {saldo}\n\nSi hay que corregir algo, avisanos por acá 🙌",
    },
    {
      clave: "saldo",
      titulo: "Recordatorio de saldo pendiente",
      texto: "¡Hola {nombre}! ¿Cómo estás? 🌸 Te escribimos de Micaela Diseño por tu pedido N° {pedido}.\n\nTe recordamos que queda un saldo pendiente de {saldo}.\n{link_pago}\n\n¡Muchas gracias!",
    },
    {
      clave: "listo",
      titulo: "Tu pedido está listo",
      texto: "¡Hola {nombre}! 🎉 Tu pedido N° {pedido} de Micaela Diseño ya está listo.\n\n{saldo_texto}Coordinamos por acá la entrega 📦 ({entrega}).\n\n¡Esperamos que lo disfrutes muchísimo! 💕",
    },
    {
      clave: "envio",
      titulo: "Aviso de envío despachado",
      texto: "¡Hola {nombre}! 📦 Tu pedido N° {pedido} de Micaela Diseño ya fue despachado por {forma_envio}.\n{seguimiento}\n\n¡Gracias por elegirnos! 💕",
    },
    {
      clave: "taller",
      titulo: "Lista de trabajos para el taller",
      texto: "¡Hola {taller}! Te paso los trabajos de la semana del {semana}:\n\n{trabajos}\n\n¡Gracias! 🙌",
    },
  ];
  for (const pl of plantillas) await db.plantilla.upsert({ where: { clave: pl.clave }, update: {}, create: pl });

  // 2) Catálogo real (solo si está vacío, para no pisar precios editados)
  if ((await db.producto.count()) === 0) {
    const INCLUYE = "Incluye scrunchies de regalo, caja para regalar y tarjeta de presentación.";
    const prenda = (nombre: string, orden: number, talles: string[], extra: Partial<{ precio: number; descripcion: string; enListaPrecios: boolean }> = {}) =>
      db.producto.create({
        data: { nombre, tipo: TipoProducto.SUELTO, orden, colores: COLORES, talles, precio: extra.precio ?? null, descripcion: extra.descripcion, enListaPrecios: extra.enListaPrecios ?? false },
      });

    // Prendas (las batas se venden sueltas; el resto son partes de los boxes)
    const bataSaten = await prenda("Bata diseñada de satén", 1, TALLES_ROPA, { precio: 89900, descripcion: "Color y bordado a elección", enListaPrecios: true });
    const bataPlush = await prenda("Bata diseñada de plush (manga larga)", 2, TALLES_ROPA, { precio: 98000, descripcion: "Color y bordado a elección", enListaPrecios: true });
    const pantuSaten = await prenda("Pantufla de satén", 3, TALLES_PANTU);
    const pantuPlush = await prenda("Pantufla de plush", 4, TALLES_PANTU);
    const camisolin = await prenda("Camisolín", 5, TALLES_ROPA);
    const pijamaTiras = await prenda("Pijama de tiras y short", 6, TALLES_ROPA);
    const camiseroCorto = await prenda("Pijama camisero corto", 7, TALLES_ROPA);
    const camiseroLargo = await prenda("Pijama camisero largo de satén", 8, TALLES_ROPA);
    const antifaz = await prenda("Antifaz", 9, []);
    await prenda("Scrunchie", 10, []);

    type Comp = { id: string; aEleccion?: boolean };
    const box = (nombre: string, orden: number, precio: number, descripcion: string, comps: Comp[], precioAnterior?: number) =>
      db.producto.create({
        data: {
          nombre, tipo: TipoProducto.BOX, orden, precio, precioAnterior, descripcion: `${descripcion}. ${INCLUYE}`,
          componentes: { create: comps.map((c) => ({ componenteId: c.id, aEleccion: !!c.aEleccion })) },
        },
      });

    await box("Bata + pantu satén bordada", 1, 129900, "Bata y pantuflas de satén bordadas", [{ id: bataSaten.id }, { id: pantuSaten.id }]);
    await box("Bata + pantu plush bordada", 2, 139900, "Bata y pantuflas de plush bordadas", [{ id: bataPlush.id }, { id: pantuPlush.id }]);
    await box("Bata + camisolín (o pijama o camisero)", 3, 149000, "Bata bordada + camisolín, pijama o camisero a elección", [
      { id: bataSaten.id }, { id: camisolin.id, aEleccion: true }, { id: pijamaTiras.id, aEleccion: true }, { id: camiseroCorto.id, aEleccion: true },
    ]);
    await box("Box completo", 4, 169900, "Bata + pantu + pijama camisero o camisolín", [
      { id: bataSaten.id }, { id: pantuSaten.id }, { id: camiseroCorto.id, aEleccion: true }, { id: camisolin.id, aEleccion: true },
    ]);
    await box("Box de invierno", 5, 185000, "Bata de plush manga larga + pantu de plush bordada + camisero largo de satén", [
      { id: bataPlush.id }, { id: pantuPlush.id }, { id: camiseroLargo.id },
    ], 202000);
    await box("Mega box satén", 6, 176000, "Bata + pantu + antifaz bordados + pijama camisero corto", [
      { id: bataSaten.id }, { id: pantuSaten.id }, { id: antifaz.id }, { id: camiseroCorto.id },
    ], 190000);

    await db.producto.create({ data: { nombre: "Kit ondas sin calor", tipo: "KIT", orden: 1, precio: 20000, descripcion: "Tubo rizador + 2 scrunchies", colores: COLORES, talles: [] } });
    await db.producto.create({ data: { nombre: "Kit de cuidado personal", tipo: "KIT", orden: 2, precio: 49000, descripcion: "Antifaz + funda + cofia + scrunchie", colores: COLORES, talles: [] } });

    await db.producto.create({ data: { nombre: "Bordado extra", tipo: "ADICIONAL", orden: 1, precio: 10000, descripcion: "Bordado adicional en otra ubicación o prenda", colores: [], talles: [] } });
    await db.producto.create({ data: { nombre: "Prioridad", tipo: "ADICIONAL", orden: 2, precio: 15000, descripcion: "Entrega prioritaria", colores: [], talles: [] } });
  }

  // Insumos básicos (sin cantidades: se cargan desde Stock)
  if ((await db.itemStock.count()) === 0) {
    const insumos: [string, string, string][] = [
      ["Cajas de regalo", "Cajas y packaging", "unidades"],
      ["Papel de seda", "Cajas y packaging", "unidades"],
      ["Cinta de raso", "Cajas y packaging", "metros"],
      ["Bolsas", "Cajas y packaging", "unidades"],
      ["Tarjetas de presentación", "Tarjetas", "unidades"],
      ["Hilo dorado", "Hilos", "conos"],
      ["Hilo plateado", "Hilos", "conos"],
      ["Scrunchies de regalo", "Accesorios", "unidades"],
    ];
    for (const [nombre, categoria, unidad] of insumos) await db.itemStock.create({ data: { nombre, categoria, unidad, tipo: "INSUMO" } });
  }
  if ((await db.consumoProducto.count()) === 0) {
    const caja = await db.itemStock.findFirst({ where: { nombre: "Cajas de regalo" } });
    const tarjeta = await db.itemStock.findFirst({ where: { nombre: "Tarjetas de presentación" } });
    const boxes = await db.producto.findMany({ where: { tipo: "BOX" } });
    for (const b of boxes) {
      if (caja) await db.consumoProducto.create({ data: { productoId: b.id, itemId: caja.id, cantidad: 1 } });
      if (tarjeta) await db.consumoProducto.create({ data: { productoId: b.id, itemId: tarjeta.id, cantidad: 1 } });
    }
  }

  // Peso y medidas de los paquetes (solo si todavía no están cargados)
  const paquetes: [string, number, number, number, number][] = [
    // nombre, gramos, alto, ancho, largo (cm)
    ["Bata + pantu satén bordada", 1000, 7, 22, 33],
    ["Bata + pantu plush bordada", 1000, 7, 22, 33],
    ["Mega box satén", 1000, 11, 27, 35],
    ["Bata diseñada de satén", 500, 7, 22, 33],
    ["Bata diseñada de plush (manga larga)", 500, 7, 22, 33],
    // estimados (se pueden corregir en Catálogo → Editar)
    ["Box completo", 1000, 11, 27, 35],
    ["Box de invierno", 1000, 11, 27, 35],
    ["Bata + camisolín (o pijama o camisero)", 1000, 7, 22, 33],
  ];
  for (const [nombre, pesoGramos, altoCm, anchoCm, largoCm] of paquetes) {
    await db.producto.updateMany({ where: { nombre, pesoGramos: null }, data: { pesoGramos, altoCm, anchoCm, largoCm } });
  }
  if ((await db.tarifaMoto.count()) === 0) {
    await db.tarifaMoto.createMany({ data: TARIFAS_MOTO_INICIALES, skipDuplicates: true });
  }
  await db.configuracion.upsert({ where: { clave: "cp_origen" }, update: {}, create: { clave: "cp_origen", valor: "1759" } });

  console.log("Datos iniciales cargados ✔");
}

main().finally(() => db.$disconnect());
