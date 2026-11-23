-- Aclaraciones de envío que se muestran en los formularios para clientas (editable en Mensajes de WhatsApp)
INSERT INTO "Plantilla" ("clave", "titulo", "texto") VALUES
('aviso_envio', 'Aclaraciones de envío (se muestran en los formularios para clientas)', '📦 El costo del envío depende de tu código postal: te lo pasamos por WhatsApp antes de despachar.')
ON CONFLICT ("clave") DO NOTHING;
