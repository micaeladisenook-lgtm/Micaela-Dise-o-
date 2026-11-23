import { PrismaClient, TipoProducto } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const db = new PrismaClient();

const COLORES_SATEN = ["Rosa palo", "Champagne", "Blanco", "Negro", "Bordó", "Lila", "Celeste", "Verde salvia"];
const TALLES_ROPA = ["S", "M", "L", "XL"];
const TALLES_PANTU = ["35-36", "37-38", "39-40", "41-42"];

async function main() {
  // 1) Usuaria administradora
  const admin = await db.usuario.upsert({
    where: { login: "micaela" },
    update: {},
    create: { nombre: "Micaela", login: "micaela", rol: "ADMIN", passwordHash: await bcrypt.hash("micaela2026", 10) },
  });
  await db.usuario.upsert({
    where: { login: "sofia" },
    update: {},
    create: { nombre: "Sofía (ejemplo)", login: "sofia", rol: "VENDEDOR", passwordHash: await bcrypt.hash("sofia2026", 10) },
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

  // 3) Clientas de ejemplo (se pueden borrar después)
  if ((await db.cliente.count({ where: { esEjemplo: true } })) === 0) {
    const ejemplos = [
      { nombre: "Valentina Gómez", telefono: "11 5555 0101", instagram: "@valengomez", email: "valen@example.com", direccion: "Av. Cabildo 1234, Belgrano" },
      { nombre: "Martina López", telefono: "11 5555 0202", instagram: "@martilopez", direccion: "Thames 567, Palermo" },
      { nombre: "Camila Fernández", telefono: "11 5555 0303", instagram: "@camifer", email: "cami@example.com" },
      { nombre: "Lucía Rodríguez", telefono: "11 5555 0404", instagram: "@lu.rodriguez", direccion: "Av. Rivadavia 4500, Caballito" },
      { nombre: "Sofía Martínez (mamá de Mía, XV)", telefono: "11 5555 0505", instagram: "@sofimartinez", notas: "Fiesta de XV de Mía. Le interesan 15 batas bordadas para las amigas." },
      { nombre: "Agustina Pérez", telefono: "11 5555 0606", email: "agus@example.com", direccion: "Olazábal 2100, Belgrano" },
    ];
    for (const e of ejemplos) await db.cliente.create({ data: { ...e, esEjemplo: true, creadoPorId: admin.id } });
  }

  // 4) Diseños de ejemplo para la galería
  if ((await db.diseno.count()) === 0) {
    const carpeta = path.join(process.cwd(), "uploads");
    await mkdir(carpeta, { recursive: true });
    const guardar = async (nombre: string, svg: string) => {
      await writeFile(path.join(carpeta, nombre), svg);
      return `/api/archivos/${nombre}`;
    };
    const tonos: Record<string, string> = {
      "Rosa palo": "#E8B4BC", Champagne: "#E9D8B8", Blanco: "#F7F4F0", Negro: "#2A2628",
      "Bordó": "#7A1F35", Lila: "#C9B3D9", Celeste: "#B8D6EA", "Verde salvia": "#B5C4A8",
    };
    for (const [nombre, hex] of Object.entries(tonos)) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity=".25"/></linearGradient></defs><rect width="400" height="400" fill="${hex}"/><path d="M0 120 Q200 40 400 140 L400 400 L0 400Z" fill="#000" opacity=".04"/><rect width="400" height="400" fill="url(#g)"/></svg>`;
      const imagen = await guardar(`color-${nombre.toLowerCase().replace(/\W+/g, "-")}.svg`, svg);
      await db.diseno.create({ data: { nombre, categoria: "COLOR", imagen, descripcion: "Satén" } });
    }
    const bordados = [
      { nombre: "Nombre en cursiva", texto: "Valentina", desc: "Letra cursiva, hilo dorado", color: "#B08A3E", tam: 64 },
      { nombre: "Inicial con corona", texto: "M", desc: "Inicial grande con corona", color: "#9C3F5C", tam: 150, corona: true },
      { nombre: "Mis XV", texto: "Mis XV", desc: "Para fiestas de quince", color: "#9C3F5C", tam: 90 },
      { nombre: "Bride / Novia", texto: "Bride", desc: "Para despedidas y novias", color: "#6B5B61", tam: 96 },
      { nombre: "Nombre con flores", texto: "Sofi", desc: "Nombre con ramita de flores", color: "#7E2F48", tam: 96, flores: true },
    ];
    for (const b of bordados) {
      const corona = b.corona ? `<path d="M150 95 L170 130 L200 90 L230 130 L250 95 L242 145 L158 145Z" fill="none" stroke="${b.color}" stroke-width="5" stroke-linejoin="round"/>` : "";
      const flores = b.flores ? `<g fill="${b.color}" opacity=".8"><circle cx="110" cy="290" r="9"/><circle cx="130" cy="300" r="7"/><circle cx="290" cy="290" r="9"/><circle cx="270" cy="300" r="7"/></g><path d="M100 300 Q200 330 300 300" stroke="#8AA07A" stroke-width="4" fill="none"/>` : "";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#F4EAE6"/><circle cx="200" cy="200" r="160" fill="#fff" stroke="#EBDDD8" stroke-width="3" stroke-dasharray="6 8"/>${corona}<text x="200" y="${b.corona ? 265 : 225}" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-weight="600" font-size="${b.tam}" fill="${b.color}">${b.texto}</text>${flores}</svg>`;
      const imagen = await guardar(`bordado-${b.nombre.toLowerCase().replace(/\W+/g, "-")}.svg`, svg);
      await db.diseno.create({ data: { nombre: b.nombre, categoria: "BORDADO", imagen, descripcion: b.desc } });
    }
  }

  console.log("Datos iniciales cargados ✔");
}

main().finally(() => db.$disconnect());
