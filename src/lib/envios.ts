// Datos de envío de un pedido (usa los del pedido y, si faltan, los de la ficha de la clienta)
type ClienteEnv = { nombre: string; telefono: string | null; dni: string | null; direccion: string | null; entreCalles: string | null; localidad: string | null; provincia: string | null; codigoPostal: string | null };
type PedidoEnv = { direccionEnvio: string | null; entreCalles: string | null; localidad: string | null; provincia: string | null; codigoPostal: string | null; cliente: ClienteEnv };

export function datosEnvio(p: PedidoEnv) {
  return {
    nombre: p.cliente.nombre,
    dni: p.cliente.dni,
    telefono: p.cliente.telefono,
    direccion: p.direccionEnvio || p.cliente.direccion,
    entreCalles: p.entreCalles || p.cliente.entreCalles,
    localidad: p.localidad || p.cliente.localidad,
    provincia: p.provincia || p.cliente.provincia,
    codigoPostal: p.codigoPostal || p.cliente.codigoPostal,
  };
}

export function faltantes(d: ReturnType<typeof datosEnvio>) {
  return [
    !d.direccion && "dirección",
    !d.localidad && "localidad",
    !d.provincia && "provincia",
    !d.codigoPostal && "código postal",
    !d.telefono && "teléfono",
    !d.dni && "DNI",
  ].filter(Boolean) as string[];
}

export function textoParaCopiar(d: ReturnType<typeof datosEnvio>) {
  return [
    `Nombre y apellido: ${d.nombre}`,
    `DNI: ${d.dni ?? ""}`,
    `Teléfono: ${d.telefono ?? ""}`,
    `Dirección: ${d.direccion ?? ""}`,
    `Entre calles: ${d.entreCalles ?? ""}`,
    `Localidad: ${d.localidad ?? ""}`,
    `Provincia: ${d.provincia ?? ""}`,
    `Código postal: ${d.codigoPostal ?? ""}`,
  ].join("\n");
}
