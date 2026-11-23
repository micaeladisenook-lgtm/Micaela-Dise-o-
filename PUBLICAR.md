# Cómo publicar Micaela Diseño (paso a paso)

## 1. Supabase (base de datos, fotos y copias) — gratis
1. Entrá a https://supabase.com → **Start your project** → ingresá con GitHub.
2. **New project**: nombre `micaela-diseno`, región **South America (São Paulo)**, elegí una contraseña de base de datos y **guardala**.
3. **Project Settings → Database → Connection string** (botón *Connect*):
   - Copiá la de **Transaction pooler** (puerto 6543) → será `DATABASE_URL` (agregale al final `?pgbouncer=true&connection_limit=1`).
   - Copiá la de **Session pooler** (puerto 5432) → será `DIRECT_URL`.
   - En las dos, reemplazá `[YOUR-PASSWORD]` por la contraseña del paso 2.
4. **Storage → New bucket**: `disenos` (marcá *Public*) y `copias` (sin marcar *Public*).
5. **Project Settings → API**: copiá **Project URL** (`SUPABASE_URL`) y la clave **service_role** (`SUPABASE_SERVICE_KEY`, es secreta).

## 2. Netlify (la página web) — gratis
1. Entrá a https://app.netlify.com → ingresá con GitHub.
2. **Add new site → Import an existing project → GitHub** → elegí el repositorio de Micaela Diseño.
3. Antes de publicar, en **Environment variables** cargá:
   `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `ADMIN_CLAVE_INICIAL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `COPIA_TOKEN`
   (ver `.env.example`).
4. **Deploy**. Cuando termine, copiá la dirección (ej: `https://micaela-diseno.netlify.app`) y agregala como variable `APP_URL`; después **Deploys → Trigger deploy**.

## 3. Pasar los datos
1. Entrá a la dirección publicada con usuario `micaela` y la contraseña `ADMIN_CLAVE_INICIAL`. Elegí tu contraseña definitiva.
2. **Usuarios y permisos → Copias de seguridad → Restaurar**: subí el archivo de mudanza y escribí RESTAURAR.
3. Volvé a entrar. Para Ludmila: **Editar permisos → Restablecer contraseña** y mandale los datos por WhatsApp.

## 4. Copias automáticas
En GitHub: **Settings → Secrets and variables → Actions → New repository secret**: `APP_URL` y `COPIA_TOKEN` (los mismos valores que en Netlify).

## 5. Mercado Pago
https://www.mercadopago.com.ar/developers → **Tus integraciones → Crear aplicación** (Checkout Pro) → **Credenciales de producción** → copiá el **Access Token** y cargalo en Netlify como `MP_ACCESS_TOKEN`. Volvé a publicar (Trigger deploy).
