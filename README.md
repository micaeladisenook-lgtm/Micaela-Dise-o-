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

## Cómo trabaja Micaela Diseño (reglas del negocio)
- **Prioridad semanal por fecha del evento:** la lista de trabajo de cada semana (lunes a domingo) son los pedidos cuyo evento cae en esa semana.
- **Telas:** todo es de satén, salvo lo que dice plush. Box de invierno = bata de plush manga larga + pantu de plush + camisero largo de satén.
- **Talleres:** Gery confecciona (batas, pijamas de tiras, camiseros, camisolines) · Héctor borda · Richard confecciona las pantuflas cuando los bordados de pantufla están listos · Pedro pega las pantuflas.
- **Vendedoras:** Micaela (administradora) y Ludmila.
