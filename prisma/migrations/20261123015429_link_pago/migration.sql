-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "linkPago" TEXT,
ADD COLUMN     "linkPagoFecha" TIMESTAMP(3),
ADD COLUMN     "linkPagoMonto" INTEGER;
