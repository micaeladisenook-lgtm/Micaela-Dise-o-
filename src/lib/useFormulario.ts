"use client";
import { useActionState, startTransition, type FormEvent } from "react";

// Igual que useActionState, pero NO borra lo que la persona escribió
// cuando el formulario vuelve con un error.
export function useFormulario<S>(accion: (prev: Awaited<S>, form: FormData) => Promise<S>, inicial: Awaited<S>) {
  const [estado, enviar, pendiente] = useActionState<S, FormData>(accion, inicial);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => enviar(datos));
  };
  return [estado, onSubmit, pendiente] as const;
}
