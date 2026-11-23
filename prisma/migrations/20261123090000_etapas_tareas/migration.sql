-- CreateEnum
CREATE TYPE "EtapaTarea" AS ENUM ('RECIBIDO', 'EN_PRODUCCION', 'LISTO');

-- AlterTable
ALTER TABLE "Tarea" ADD COLUMN     "etapa" "EtapaTarea" NOT NULL DEFAULT 'RECIBIDO';

-- Las tareas ya terminadas pasan a "Listo para entregar"
UPDATE "Tarea" SET "etapa" = 'LISTO' WHERE "terminada" = true;
