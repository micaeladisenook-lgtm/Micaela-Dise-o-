-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "codigoPostal" TEXT,
ADD COLUMN     "dni" TEXT,
ADD COLUMN     "provincia" TEXT;

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "codigoPostal" TEXT,
ADD COLUMN     "costoEnvio" INTEGER,
ADD COLUMN     "despachadoEn" TIMESTAMP(3),
ADD COLUMN     "numeroSeguimiento" TEXT,
ADD COLUMN     "provincia" TEXT,
ADD COLUMN     "tokenPublico" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_tokenPublico_key" ON "Pedido"("tokenPublico");

