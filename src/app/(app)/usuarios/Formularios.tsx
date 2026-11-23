"use client";
import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { useFormulario } from "@/lib/useFormulario";
import { invitarUsuario, editarUsuario, restablecerClave, guardarPermisos, type EstadoUsuario } from "./acciones";

type T = { id: string; nombre: string };

function Credenciales({ e, urlLogin }: { e: EstadoUsuario; urlLogin: string }) {
  const [copiado, setCopiado] = useState(false);
  if (!e?.clave) return null;
  const texto = `¡Hola ${e.nombre?.split(" ")[0]}! Te creé un usuario en el sistema de Micaela Diseño 💕\n\nEntrá en: ${urlLogin}\nUsuario: ${e.login}\nContraseña provisoria: ${e.clave}\n\nAl entrar te va a pedir que elijas tu propia contraseña.`;
  return (
    <div className="rounded-xl border border-acento/40 bg-acento-suave/40 p-4 text-sm space-y-2">
      <p className="font-medium">Pasale estos datos (la contraseña se muestra una sola vez):</p>
      <p>Usuario: <strong>{e.login}</strong><br />Contraseña provisoria: <strong className="font-mono">{e.clave}</strong></p>
      <div className="flex gap-2">
        <button type="button" className="btn-suave min-h-10 px-3 flex-1" onClick={() => { navigator.clipboard.writeText(texto); setCopiado(true); }}><Copy size={14} /> {copiado ? "¡Copiado!" : "Copiar mensaje"}</button>
        <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" className="btn-primario min-h-10 px-3 flex-1"><MessageCircle size={14} /> WhatsApp</a>
      </div>
    </div>
  );
}

function Msg({ e }: { e: EstadoUsuario }) {
  if (e?.error) return <p className="text-sm text-estado-alerta-txt">{e.error}</p>;
  if (e?.ok && !e.clave) return <p className="text-sm text-estado-listo-txt">{e.ok}</p>;
  return null;
}

function CamposRol({ rol, setRol, talleres, tallerId }: { rol: string; setRol: (r: string) => void; talleres: T[]; tallerId?: string | null }) {
  return (
    <>
      <div>
        <label className="etiqueta">Rol</label>
        <select name="rol" className="campo" value={rol} onChange={(e) => setRol(e.target.value)}>
          <option value="VENDEDOR">Vendedor/a</option>
          <option value="TALLER">Taller (solo ve sus trabajos)</option>
          <option value="ADMIN">Administradora (acceso total)</option>
        </select>
      </div>
      {rol === "TALLER" && (
        <div>
          <label className="etiqueta">¿Qué taller es?</label>
          <select name="tallerId" className="campo" defaultValue={tallerId ?? ""}><option value="">Elegí…</option>{talleres.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select>
        </div>
      )}
    </>
  );
}

export function FormInvitar({ talleres, urlLogin }: { talleres: T[]; urlLogin: string }) {
  const [e, onSubmit, p] = useFormulario(invitarUsuario, null);
  const [rol, setRol] = useState("VENDEDOR");
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div><label className="etiqueta">Nombre</label><input name="nombre" className="campo" required /></div>
      <div><label className="etiqueta">Usuario para entrar</label><input name="login" className="campo" autoCapitalize="none" placeholder="ej: gery" required /></div>
      <CamposRol rol={rol} setRol={setRol} talleres={talleres} />
      <Msg e={e} />
      <Credenciales e={e} urlLogin={urlLogin} />
      <button className="btn-primario w-full" disabled={p}>{p ? "Creando…" : "Crear usuario"}</button>
    </form>
  );
}

export function FormEditarUsuario({ u, talleres, urlLogin }: { u: { id: string; nombre: string; rol: string; activo: boolean; tallerId: string | null }; talleres: T[]; urlLogin: string }) {
  const [e, onSubmit, p] = useFormulario(editarUsuario.bind(null, u.id), null);
  const [e2, onReset, p2] = useFormulario(restablecerClave.bind(null, u.id) as (prev: EstadoUsuario, f: FormData) => Promise<EstadoUsuario>, null);
  const [rol, setRol] = useState(u.rol);
  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-3">
        <div><label className="etiqueta">Nombre</label><input name="nombre" className="campo" defaultValue={u.nombre} /></div>
        <CamposRol rol={rol} setRol={setRol} talleres={talleres} tallerId={u.tallerId} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="activo" defaultChecked={u.activo} className="w-5 h-5 accent-acento" /> Activo (puede entrar)</label>
        <Msg e={e} />
        <button className="btn-primario" disabled={p}>{p ? "Guardando…" : "Guardar cambios"}</button>
      </form>
      <form onSubmit={onReset} className="space-y-3 border-t border-borde pt-4">
        <p className="text-sm text-texto-2">¿Se olvidó la contraseña? Generá una provisoria nueva.</p>
        <Credenciales e={e2} urlLogin={urlLogin} />
        <button className="btn-secundario" disabled={p2}>{p2 ? "Generando…" : "Restablecer contraseña"}</button>
      </form>
    </div>
  );
}

export function TablaPermisos({ permisos, valores }: { permisos: { clave: string; grupo: string; texto: string }[]; valores: Record<string, boolean> }) {
  const [e, onSubmit, p] = useFormulario(guardarPermisos, null);
  return (
    <form onSubmit={onSubmit}>
      <div className="overflow-x-auto">
        <table className="tabla w-full min-w-[560px]">
          <thead><tr><th>Permiso</th><th className="text-center!">Administradora</th><th className="text-center!">Vendedor/a</th><th className="text-center!">Taller</th></tr></thead>
          <tbody>
            {permisos.map((x, i) => (
              <tr key={x.clave}>
                <td>{(i === 0 || permisos[i - 1].grupo !== x.grupo) && <span className="block text-[11px] uppercase tracking-wide text-texto-2">{x.grupo}</span>}{x.texto}</td>
                <td className="text-center"><input type="checkbox" checked disabled className="w-5 h-5 accent-acento" aria-label="Administradora" /></td>
                {(["VENDEDOR", "TALLER"] as const).map((r) => (
                  <td key={r} className="text-center"><input type="checkbox" name={`${r}:${x.clave}`} defaultChecked={valores[`${r}:${x.clave}`]} className="w-5 h-5 accent-acento cursor-pointer" aria-label={`${r} ${x.texto}`} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 p-4 border-t border-borde">
        <button className="btn-primario" disabled={p}>{p ? "Guardando…" : "Guardar permisos"}</button>
        <Msg e={e} />
        <span className="text-xs text-texto-2">Los usuarios de taller ven solo los trabajos de su taller.</span>
      </div>
    </form>
  );
}
