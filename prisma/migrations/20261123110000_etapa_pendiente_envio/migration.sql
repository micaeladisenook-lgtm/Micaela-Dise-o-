-- Nueva primera columna del tablero de talleres: "Pendiente de envío"
ALTER TYPE "EtapaTarea" ADD VALUE IF NOT EXISTS 'PENDIENTE_ENVIO' BEFORE 'RECIBIDO';
