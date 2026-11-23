-- Los trabajos nuevos arrancan en "Pendiente de envío" (los que ya existían quedan donde están)
ALTER TABLE "Tarea" ALTER COLUMN "etapa" SET DEFAULT 'PENDIENTE_ENVIO';
