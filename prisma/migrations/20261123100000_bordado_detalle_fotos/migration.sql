-- AlterTable
ALTER TABLE "PedidoItem" ADD COLUMN     "bordadoDetalle" TEXT,
ADD COLUMN     "bordadoFotos" TEXT[] DEFAULT ARRAY[]::TEXT[];
