# Micaela Diseño · Sistema de gestión

App web para gestionar clientas, catálogo, pedidos, pagos, talleres, stock y gastos.

## Tecnología
- **Next.js** (pantallas y lógica) + **Tailwind** (diseño)
- **PostgreSQL** con **Prisma** (base de datos)

## Cómo levantarla en una computadora
1. Instalar dependencias: `npm install`
2. Crear el archivo `.env` con `DATABASE_URL` y `SESSION_SECRET`
3. Crear las tablas: `npx prisma migrate deploy`
4. Cargar datos iniciales: `npm run db:seed`
5. Iniciar: `npm run dev` y abrir http://localhost:3000

Usuario inicial: `micaela` / `micaela2026` (cambiarla al publicar).

## Etapas
- [x] Etapa 1: Base, clientes, catálogo, lista de precios PDF, galería de diseños
- [ ] Etapa 2: Pedidos, nuevo pedido, formulario público, WhatsApp
- [ ] Etapa 3: Pagos, Mercado Pago, calendario, panel
- [ ] Etapa 4: Talleres, stock, gastos
- [ ] Etapa 5: Usuarios y permisos, publicación y copias de seguridad
