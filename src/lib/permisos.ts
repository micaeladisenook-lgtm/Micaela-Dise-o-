// Lista de permisos que se pueden activar o desactivar por rol
export const PERMISOS = [
  { clave: "ver_panel", grupo: "General", texto: "Ver el panel principal" },
  { clave: "ver_pedidos", grupo: "Pedidos", texto: "Ver pedidos" },
  { clave: "crear_pedidos", grupo: "Pedidos", texto: "Cargar y editar pedidos" },
  { clave: "borrar_pedidos", grupo: "Pedidos", texto: "Borrar pedidos" },
  { clave: "editar_mensajes", grupo: "Pedidos", texto: "Editar los mensajes de WhatsApp" },
  { clave: "ver_clientes", grupo: "Clientes", texto: "Ver y cargar clientas" },
  { clave: "borrar_clientes", grupo: "Clientes", texto: "Borrar clientas" },
  { clave: "ver_calendario", grupo: "Calendario", texto: "Ver el calendario" },
  { clave: "ver_pagos", grupo: "Pagos", texto: "Ver pagos y deudas" },
  { clave: "registrar_pagos", grupo: "Pagos", texto: "Registrar pagos y generar links de Mercado Pago" },
  { clave: "ver_catalogo", grupo: "Catálogo", texto: "Ver catálogo, precios y galería" },
  { clave: "editar_precios", grupo: "Catálogo", texto: "Editar productos y precios" },
  { clave: "ver_talleres", grupo: "Talleres", texto: "Ver los trabajos de todos los talleres" },
  { clave: "marcar_tareas", grupo: "Talleres", texto: "Marcar trabajos como terminados" },
  { clave: "ver_stock", grupo: "Stock", texto: "Ver stock" },
  { clave: "editar_stock", grupo: "Stock", texto: "Cargar entradas y salidas de stock" },
  { clave: "ver_gastos", grupo: "Gastos y ganancias", texto: "Ver gastos, ganancias y costos" },
] as const;

export type ClavePermiso = (typeof PERMISOS)[number]["clave"];

// Valores iniciales (la administradora puede cambiarlos)
export const PERMISOS_INICIALES: Record<"VENDEDOR" | "TALLER", ClavePermiso[]> = {
  VENDEDOR: [
    "ver_panel", "ver_pedidos", "crear_pedidos", "ver_clientes", "ver_calendario", "ver_pagos",
    "registrar_pagos", "ver_catalogo", "ver_talleres", "marcar_tareas", "ver_stock", "editar_stock",
  ],
  // Un usuario de taller solo ve SUS trabajos y los marca como terminados
  TALLER: ["marcar_tareas"],
};

// Página de inicio según lo que puede ver
export const PAGINAS: { href: string; clave: ClavePermiso | "taller" }[] = [
  { href: "/", clave: "ver_panel" },
  { href: "/pedidos", clave: "ver_pedidos" },
  { href: "/talleres", clave: "taller" },
  { href: "/calendario", clave: "ver_calendario" },
  { href: "/clientes", clave: "ver_clientes" },
];
