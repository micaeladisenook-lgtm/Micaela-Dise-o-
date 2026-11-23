import { PrismaClient, TipoProducto } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const COLORES_SATEN = ["Blanco", "Off white", "Nude", "Arena", "Camel", "Champagne", "Rosa claro", "Rosa viejo", "Rosa gold", "Lila", "Celeste", "Verde agua", "Azul francia", "Azul marino", "Petróleo", "Gris perla", "Bordó", "Rojo", "Negro"];
const TALLES_ROPA = ["XS", "S", "M", "L", "XL"];
const TALLES_PANTU = ["35", "36", "37", "38", "39", "40", "41", "42"];

async function main() {
  // 1) Usuaria administradora
  const admin = await db.usuario.upsert({
    where: { login: "micaela" },
    update: {},
    create: { nombre: "Micaela", login: "micaela", rol: "ADMIN", passwordHash: await bcrypt.hash("micaela2026", 10) },
  });

  // 2) Catálogo (solo si está vacío, para no pisar precios editados)
  if ((await db.producto.count()) === 0) {
    const suelto = (nombre: string, orden: number, colores: string[], talles: string[], descripcion?: string) =>
      db.producto.create({ data: { nombre, tipo: TipoProducto.SUELTO, orden, colores, talles, descripcion, precio: null } });

    const bata = await suelto("Bata de satén", 1, COLORES_SATEN, TALLES_ROPA);
    const pantu = await suelto("Pantufla", 2, COLORES_SATEN, TALLES_PANTU);
    const pijama = await suelto("Pijama", 3, COLORES_SATEN, TALLES_ROPA);
    const camisolin = await suelto("Camisolín", 4, COLORES_SATEN, TALLES_ROPA);
    const scrunchie = await suelto("Scrunchie", 5, COLORES_SATEN, []);

    const box = (nombre: string, orden: number, precio: number, descripcion: string, comps: { id: string; opcional?: boolean }[]) =>
      db.producto.create({
        data: {
          nombre, tipo: TipoProducto.BOX, orden, precio, descripcion,
          componentes: { create: comps.map((c) => ({ componenteId: c.id, opcional: !!c.opcional })) },
        },
      });

    await box("Box completo", 1, 169990, "Bata bordada + pantu bordada + scrunchie de regalo + tarjeta de presentación", [
      { id: bata.id }, { id: pantu.id }, { id: scrunchie.id },
    ]);
    await box("Box simple", 2, 119990, "Bata bordada + scrunchie de regalo", [{ id: bata.id }, { id: scrunchie.id }]);
    await box("Box clásico", 3, 220000, "Bata bordada + pantu bordada + pijama o camisolín opcional", [
      { id: bata.id }, { id: pantu.id }, { id: pijama.id, opcional: true }, { id: camisolin.id, opcional: true },
    ]);

    await db.producto.create({ data: { nombre: "Kit ondas sin calor", tipo: "KIT", orden: 1, precio: 16000, descripcion: "Tubo rizador + 2 scrunchies", colores: COLORES_SATEN, talles: [] } });
    await db.producto.create({ data: { nombre: "Kit de cuidado personal", tipo: "KIT", orden: 2, precio: 30000, descripcion: "Antifaz + funda + cofia + scrunchie", colores: COLORES_SATEN, talles: [] } });
    await db.producto.create({ data: { nombre: "Bordado personalizado", tipo: "ADICIONAL", orden: 1, precio: 10000, descripcion: "Bordado opcional en cualquier artículo", colores: [], talles: [] } });
  }

  console.log("Datos iniciales cargados ✔");
}

main().finally(() => db.$disconnect());
