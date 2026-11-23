-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "debeCambiarClave" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ultimoAcceso" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Permiso" (
    "rol" "Rol" NOT NULL,
    "clave" TEXT NOT NULL,
    "permitido" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Permiso_pkey" PRIMARY KEY ("rol","clave")
);
