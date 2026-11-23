-- CreateTable
CREATE TABLE "TarifaMoto" (
    "id" TEXT NOT NULL,
    "zona" TEXT NOT NULL,
    "localidad" TEXT NOT NULL,
    "precio" INTEGER NOT NULL,

    CONSTRAINT "TarifaMoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TarifaMoto_zona_localidad_key" ON "TarifaMoto"("zona", "localidad");

