"use server";
import { exigirPermiso } from "@/lib/acceso";
import { mercadoPagoConfigurado, resumenMercadoPago, type ResumenMP } from "@/lib/mercadopago";

export async function leerMercadoPago(): Promise<{ configurado: boolean; datos?: ResumenMP; hora: string }> {
  await exigirPermiso("ver_gastos");
  const hora = new Date().toISOString();
  if (!mercadoPagoConfigurado()) return { configurado: false, hora };
  return { configurado: true, datos: await resumenMercadoPago(), hora };
}
