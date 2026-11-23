-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "altoCm" DOUBLE PRECISION,
ADD COLUMN     "anchoCm" DOUBLE PRECISION,
ADD COLUMN     "largoCm" DOUBLE PRECISION,
ADD COLUMN     "pesoGramos" INTEGER;

-- CreateTable
CREATE TABLE "Configuracion" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("clave")
);

