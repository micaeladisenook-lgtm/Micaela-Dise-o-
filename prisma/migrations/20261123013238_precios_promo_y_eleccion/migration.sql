-- AlterTable
ALTER TABLE "ComponenteBox" ADD COLUMN     "aEleccion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "enListaPrecios" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "precioAnterior" INTEGER;
