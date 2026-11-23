-- Respuestas rápidas para Instagram / WhatsApp (se pueden editar desde el sistema)
INSERT INTO "Plantilla" ("clave", "titulo", "texto") VALUES
('rr_01_saludo', 'Primera consulta', '¡Hola! 💕 Gracias por escribirnos a Micaela Diseño.

Hacemos batas, pantuflas, pijamas y boxes de regalo bordados y personalizados, ideales para quince, bodas y cumpleaños.

¿Para qué ocasión lo buscás y para qué fecha lo necesitás? Así te paso las opciones 😊'),
('rr_02_precios', 'Precios', '¡Hola! Te paso nuestros precios actuales 💕

{precios}

Todos los boxes incluyen bordado personalizado. ¿Querés que te mande fotos de alguno? 📸'),
('rr_03_pedido', 'Cómo hacer el pedido', '¡Genial! 🙌 Para hacer tu pedido completá este formulario con el box, los colores, talles, el bordado y los datos de envío:

{formulario}

Apenas lo recibimos te escribimos por WhatsApp para confirmar todo y coordinar la seña 💕'),
('rr_04_talles', 'Talles', 'Los talles que manejamos son:

👘 Batas: XS, S, M, L, XL y Kids
🥿 Pantuflas: del 35 al 42

Si estás entre dos talles, contanos tu medida habitual y te ayudamos a elegir 😊'),
('rr_05_tiempos', 'Tiempos de entrega', 'Trabajamos todo por encargo y personalizado ✨

El tiempo de entrega depende de la fecha de tu evento y de los pedidos que tengamos. Contanos para cuándo lo necesitás y te confirmamos si llegamos 🙌

Si lo necesitás con urgencia, tenemos la opción de entrega prioritaria.'),
('rr_06_envios', 'Envíos', '¡Hacemos envíos a todo el país! 📦

Enviamos por Correo Argentino, Andreani o Vía Cargo, y por motomensajería en algunas zonas. También podés retirarlo.

El costo del envío depende de tu código postal: pasanos tu localidad y código postal y te lo cotizamos.'),
('rr_07_pagos', 'Seña y formas de pago', 'Para confirmar el pedido pedimos una seña 💕

Podés pagar por transferencia o por Mercado Pago (te mandamos el link). El saldo se abona antes de la entrega.

Cualquier duda, ¡escribinos!'),
('rr_08_bordado', 'Bordado personalizado', 'El bordado va con el texto que quieras (nombre, "Mis XV", "Bride", una fecha…) ✨

Podés elegir hilo dorado o plateado y dónde va: espalda, adelante, lado del corazón, pantuflas o antifaz. Si tenés una idea o una foto de referencia, ¡mandánosla!'),
('rr_09_gracias', 'Gracias por tu compra', '¡Muchas gracias por elegir Micaela Diseño! 💕

Cualquier cosa que necesites, escribinos por acá. Y si te gustó, nos encantaría que nos etiquetes en Instagram cuando lo uses ✨')
ON CONFLICT ("clave") DO NOTHING;
