-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('NUEVO', 'EN_PRODUCCION', 'LISTO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoPedido" AS ENUM ('INDIVIDUAL', 'BOX', 'EVENTO');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('TRANSFERENCIA', 'EFECTIVO', 'TARJETA', 'MERCADO_PAGO', 'OTRO');

-- CreateEnum
CREATE TYPE "OrigenPedido" AS ENUM ('SISTEMA', 'FORMULARIO', 'IMPORTADO');

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "localidad" TEXT;

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" "TipoPedido" NOT NULL DEFAULT 'INDIVIDUAL',
    "estado" "EstadoPedido" NOT NULL DEFAULT 'NUEVO',
    "fechaPedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEntrega" TIMESTAMP(3),
    "fechaEvento" TIMESTAMP(3),
    "evento" TEXT,
    "eventoDetalle" TEXT,
    "envio" BOOLEAN NOT NULL DEFAULT true,
    "formaEnvio" TEXT,
    "direccionEnvio" TEXT,
    "localidad" TEXT,
    "prioridad" BOOLEAN NOT NULL DEFAULT false,
    "total" INTEGER NOT NULL DEFAULT 0,
    "notas" TEXT,
    "origen" "OrigenPedido" NOT NULL DEFAULT 'SISTEMA',
    "revisar" TEXT,
    "vendedorId" TEXT,
    "creadoPorId" TEXT,
    "modificadoPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoItem" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productoId" TEXT,
    "nombre" TEXT NOT NULL,
    "persona" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "precioUnitario" INTEGER NOT NULL DEFAULT 0,
    "bordadoTexto" TEXT,
    "bordadoUbicacion" TEXT,
    "hilo" TEXT,
    "notas" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PedidoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrendaItem" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "productoId" TEXT,
    "nombre" TEXT NOT NULL,
    "color" TEXT,
    "talle" TEXT,
    "bordada" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PrendaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisenoPedido" (
    "pedidoId" TEXT NOT NULL,
    "disenoId" TEXT NOT NULL,

    CONSTRAINT "DisenoPedido_pkey" PRIMARY KEY ("pedidoId","disenoId")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "medio" "MedioPago" NOT NULL DEFAULT 'TRANSFERENCIA',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "esSena" BOOLEAN NOT NULL DEFAULT false,
    "nota" TEXT,
    "creadoPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Taller" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "especialidad" TEXT,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Taller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plantilla" (
    "clave" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,

    CONSTRAINT "Plantilla_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_numero_key" ON "Pedido"("numero");

-- CreateIndex
CREATE INDEX "Pedido_estado_idx" ON "Pedido"("estado");

-- CreateIndex
CREATE INDEX "Pedido_fechaEntrega_idx" ON "Pedido"("fechaEntrega");

-- CreateIndex
CREATE INDEX "Pedido_fechaEvento_idx" ON "Pedido"("fechaEvento");

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_modificadoPorId_fkey" FOREIGN KEY ("modificadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrendaItem" ADD CONSTRAINT "PrendaItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PedidoItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrendaItem" ADD CONSTRAINT "PrendaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisenoPedido" ADD CONSTRAINT "DisenoPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisenoPedido" ADD CONSTRAINT "DisenoPedido_disenoId_fkey" FOREIGN KEY ("disenoId") REFERENCES "Diseno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
