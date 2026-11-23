-- Link para que la clienta complete los datos de su pedido
ALTER TABLE "Pedido" ADD COLUMN "tokenCompletar" TEXT,
ADD COLUMN "datosCompletadosEn" TIMESTAMP(3);

CREATE UNIQUE INDEX "Pedido_tokenCompletar_key" ON "Pedido"("tokenCompletar");

-- Mensaje para mandar el link (se puede editar en Pedidos → Mensajes de WhatsApp)
INSERT INTO "Plantilla" ("clave", "titulo", "texto") VALUES
('completar', 'Link para completar datos del pedido', '¡Hola {nombre}! 💕 Gracias por tu compra en Micaela Diseño.

Para empezar a preparar tu pedido N° {pedido}, completá en este link los colores, talles, el bordado y los datos de envío:
{link_completar}

¡Cualquier duda nos escribís!')
ON CONFLICT ("clave") DO NOTHING;
