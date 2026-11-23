-- Textos de Micaela para los formularios de clientas (editables en Mensajes de WhatsApp)
UPDATE "Plantilla" SET "texto" = '*Tenemos envíos a todo el país* 🇦🇷

• Vía Cargo: de sucursal a sucursal
• Correo Argentino Express: llega de 1 a 3 días
• Andreani: de 1 a 5 días
• Motomensajería: 48 hs

Te enviamos la cotización exacta una vez que el pedido esté listo para despachar 📦'
WHERE "clave" = 'aviso_envio' AND "texto" = '📦 El costo del envío depende de tu código postal: te lo pasamos por WhatsApp antes de despachar.';

INSERT INTO "Plantilla" ("clave", "titulo", "texto") VALUES
('aviso_pedido', 'Aviso antes de enviar el pedido (se muestra en los formularios para clientas)', '*Detalles del pedido: LEÉ CADA ÍTEM* ✅

Verificá talles, colores, bordados, modelos y cantidades al confirmar la compra. Una vez confirmado el pedido, los datos brindados son responsabilidad única de la clienta, por lo tanto no tiene devolución.

*Atención:* si querés alguna modificación, tené en cuenta que tu pedido se va a atrasar.')
ON CONFLICT ("clave") DO NOTHING;
