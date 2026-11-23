// Lista de permisos, agrupados por sector del sistema.
// Se activan o desactivan por rol (Vendedor/a, Taller) y además se pueden personalizar para cada usuario.
//
// "padre": para los permisos que se agregaron después. Mientras la administradora no los toque,
// valen lo mismo que el permiso del que salieron (así nadie gana ni pierde acceso al aparecer uno nuevo).
// "inicial: false": arrancan apagados para todos menos la administradora.
type Def = { clave: string; grupo: string; texto: string; ayuda?: string; padre?: string; inicial?: false };

export const PERMISOS = [
  // Panel
  { clave: "ver_panel", grupo: "Panel", texto: "Ver el panel principal", ayuda: "Entregas de la semana, avisos de stock" },
  { clave: "ver_panel_ventas", grupo: "Panel", texto: "Ver ventas del mes y saldos por cobrar en el panel", padre: "ver_panel" },

  // Pedidos
  { clave: "ver_pedidos", grupo: "Pedidos", texto: "Ver la lista y la ficha de los pedidos" },
  { clave: "crear_pedidos", grupo: "Pedidos", texto: "Cargar pedidos nuevos" },
  { clave: "editar_pedidos", grupo: "Pedidos", texto: "Editar pedidos ya cargados", ayuda: "Productos, talles, colores, fechas, datos de entrega", padre: "crear_pedidos" },
  { clave: "cambiar_estado", grupo: "Pedidos", texto: "Cambiar el estado de un pedido", ayuda: "Nuevo, en producción, listo, entregado, cancelado", padre: "crear_pedidos" },
  { clave: "borrar_pedidos", grupo: "Pedidos", texto: "Borrar pedidos" },
  { clave: "editar_mensajes", grupo: "Pedidos", texto: "Editar los mensajes de WhatsApp" },

  // Bordados y diseños
  { clave: "subir_fotos_bordado", grupo: "Bordados y diseños", texto: "Subir fotos de dónde va el bordado en un pedido", padre: "crear_pedidos" },
  { clave: "gestionar_disenos", grupo: "Bordados y diseños", texto: "Subir y borrar diseños de la galería", padre: "ver_catalogo" },

  // Envíos
  { clave: "ver_envios", grupo: "Envíos", texto: "Ver la sección de envíos y cotizar", padre: "ver_pedidos" },
  { clave: "gestionar_envios", grupo: "Envíos", texto: "Generar envíos, rótulos y marcar despachos", padre: "crear_pedidos" },
  { clave: "configurar_envios", grupo: "Envíos", texto: "Cambiar tarifas, código postal de origen y datos del remitente", inicial: false },

  // Clientes
  { clave: "ver_clientes", grupo: "Clientes", texto: "Ver las clientas" },
  { clave: "editar_clientes", grupo: "Clientes", texto: "Cargar y editar clientas", padre: "ver_clientes" },
  { clave: "borrar_clientes", grupo: "Clientes", texto: "Borrar clientas" },

  // Calendario
  { clave: "ver_calendario", grupo: "Calendario", texto: "Ver el calendario" },

  // Pagos
  { clave: "ver_pagos", grupo: "Pagos", texto: "Ver la sección de pagos y deudas" },
  { clave: "registrar_pagos", grupo: "Pagos", texto: "Registrar pagos y señas en un pedido" },
  { clave: "links_pago", grupo: "Pagos", texto: "Generar links de Mercado Pago", padre: "registrar_pagos" },
  { clave: "borrar_pagos", grupo: "Pagos", texto: "Borrar pagos cargados", padre: "registrar_pagos" },

  // Catálogo
  { clave: "ver_catalogo", grupo: "Catálogo", texto: "Ver catálogo, precios y galería" },
  { clave: "editar_precios", grupo: "Catálogo", texto: "Editar productos y precios" },

  // Talleres
  { clave: "ver_talleres", grupo: "Talleres", texto: "Ver los trabajos de todos los talleres" },
  { clave: "marcar_tareas", grupo: "Talleres", texto: "Mover trabajos entre columnas (tildar)" },
  { clave: "enviar_listas_talleres", grupo: "Talleres", texto: "Mandar la lista por WhatsApp e imprimir la hoja del taller", padre: "ver_talleres" },
  { clave: "editar_talleres", grupo: "Talleres", texto: "Editar los datos de los talleres", inicial: false },

  // Stock
  { clave: "ver_stock", grupo: "Stock", texto: "Ver stock" },
  { clave: "editar_stock", grupo: "Stock", texto: "Cargar entradas y salidas de stock" },
  { clave: "administrar_stock", grupo: "Stock", texto: "Crear, editar y borrar ítems de stock", inicial: false },

  // Gastos
  { clave: "ver_gastos", grupo: "Gastos y ganancias", texto: "Ver y cargar gastos, ganancias y costos" },
] as const satisfies readonly Def[];

export type ClavePermiso = (typeof PERMISOS)[number]["clave"];
export const DEF_PERMISO: Record<string, Def> = Object.fromEntries((PERMISOS as readonly Def[]).map((p) => [p.clave, p]));

// Valores iniciales de los permisos originales (la administradora puede cambiarlos)
export const PERMISOS_INICIALES: Record<"VENDEDOR" | "TALLER", ClavePermiso[]> = {
  VENDEDOR: [
    "ver_panel", "ver_pedidos", "crear_pedidos", "ver_clientes", "ver_calendario", "ver_pagos",
    "registrar_pagos", "ver_catalogo", "ver_talleres", "marcar_tareas", "ver_stock", "editar_stock",
  ],
  // Un usuario de taller solo ve SUS trabajos y los marca como terminados
  TALLER: ["marcar_tareas"],
};

// Aplica los permisos guardados sobre los iniciales, resolviendo los permisos nuevos por su "padre"
export function resolverPermisos(iniciales: string[], guardados: { clave: string; permitido: boolean }[]) {
  const g = new Map(guardados.map((x) => [x.clave, x.permitido]));
  const res = new Set<string>();
  const vale = (clave: string): boolean => {
    if (g.has(clave)) return g.get(clave)!;
    const d = DEF_PERMISO[clave];
    if (d?.padre) return vale(d.padre);
    if (d?.inicial === false) return false;
    return iniciales.includes(clave);
  };
  for (const p of PERMISOS) if (vale(p.clave)) res.add(p.clave);
  return res;
}
