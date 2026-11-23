// Datos que viajan entre el formulario de pedido y el servidor
export type PrendaForm = {
  productoId: string | null;
  nombre: string;
  color: string;
  talle: string;
  bordada: boolean;
};

export type ItemForm = {
  key: string;
  productoId: string | null;
  nombre: string;
  persona: string;
  cantidad: number;
  precioUnitario: number;
  bordadoTexto: string;
  bordadoUbicacion: string;
  bordadoDetalle: string;
  bordadoFotos: string[];
  hilo: string;
  notas: string;
  prendas: PrendaForm[];
  eleccionId?: string | null;
};

export type ClienteForm = {
  id: string | null;
  numero?: number;
  nombre: string;
  telefono: string;
  instagram: string;
  email: string;
};

export type PedidoForm = {
  cliente: ClienteForm;
  tipo: "INDIVIDUAL" | "BOX" | "EVENTO";
  items: ItemForm[];
  disenos: string[];
  fechaEvento: string;
  evento: string;
  eventoDetalle: string;
  fechaEntrega: string;
  envio: boolean;
  formaEnvio: string;
  direccionEnvio: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  entreCalles: string;
  prioridad: boolean;
  notas: string;
  vendedorId: string;
  estado: string;
  sena: number;
  medioSena: string;
};

export type ResultadoGuardar =
  | { ok: true; id: string; numero: number; telefono: string | null; mensaje: string; avisoCliente?: string }
  | { ok: false; error: string };
