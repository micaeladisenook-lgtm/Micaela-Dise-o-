-- CreateEnum
CREATE TYPE "FuncionTaller" AS ENUM ('CONFECCION_ROPA', 'BORDADO', 'CONFECCION_PANTU', 'PEGADO_PANTU', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoStock" AS ENUM ('PRODUCTO', 'INSUMO');

-- AlterTable
ALTER TABLE "Taller" ADD COLUMN     "funcion" "FuncionTaller" NOT NULL DEFAULT 'OTRO';

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "tallerId" TEXT;

-- CreateTable
CREATE TABLE "Tarea" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "paso" INTEGER NOT NULL,
    "prenda" TEXT NOT NULL,
    "color" TEXT,
    "talle" TEXT,
    "bordado" TEXT,
    "detalle" TEXT,
    "terminada" BOOLEAN NOT NULL DEFAULT false,
    "terminadaEn" TIMESTAMP(3),
    "terminadaPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemStock" (
    "id" TEXT NOT NULL,
    "tipo" "TipoStock" NOT NULL DEFAULT 'INSUMO',
    "categoria" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT,
    "talle" TEXT,
    "tela" TEXT,
    "unidad" TEXT NOT NULL DEFAULT 'unidades',
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "productoId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoStock" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "motivo" TEXT NOT NULL,
    "pedidoId" TEXT,
    "usuarioId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumoProducto" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "itemId" TEXT,
    "tela" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ConsumoProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT,
    "monto" INTEGER NOT NULL,
    "medio" TEXT,
    "tallerId" TEXT,
    "creadoPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tarea_tallerId_terminada_idx" ON "Tarea"("tallerId", "terminada");

-- CreateIndex
CREATE UNIQUE INDEX "Tarea_pedidoId_clave_key" ON "Tarea"("pedidoId", "clave");

-- CreateIndex
CREATE INDEX "Gasto_fecha_idx" ON "Gasto"("fecha");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "Taller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "Taller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemStock" ADD CONSTRAINT "ItemStock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemStock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumoProducto" ADD CONSTRAINT "ConsumoProducto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumoProducto" ADD CONSTRAINT "ConsumoProducto_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemStock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "Taller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
