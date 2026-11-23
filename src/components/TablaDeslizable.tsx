"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MoveHorizontal } from "lucide-react";

// Tabla ancha con una barra para deslizar ARRIBA (queda fija en la pantalla mientras se baja),
// con una manija que se arrastra con el mouse o el dedo, y flechas para moverla.
export default function TablaDeslizable({ children }: { children: React.ReactNode }) {
  const tabla = useRef<HTMLDivElement>(null);
  const riel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ izq: 0, ancho: 1, max: 0 }); // en proporción del riel (0 a 1)

  const medir = useCallback(() => {
    const t = tabla.current;
    if (!t) return;
    const max = t.scrollWidth - t.clientWidth;
    setPos({ ancho: t.clientWidth / t.scrollWidth, izq: t.scrollLeft / t.scrollWidth, max });
  }, []);

  useEffect(() => {
    const t = tabla.current;
    if (!t) return;
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(t);
    if (t.firstElementChild) ro.observe(t.firstElementChild);
    return () => ro.disconnect();
  }, [medir]);

  // arrastrar la manija
  const arrastre = useRef<{ x: number; inicio: number } | null>(null);
  const alApretar = (e: React.PointerEvent<HTMLDivElement>) => {
    const t = tabla.current, r = riel.current;
    if (!t || !r) return;
    e.preventDefault();
    const caja = r.getBoundingClientRect();
    const manija = (e.target as HTMLElement).dataset.manija === "1";
    if (!manija) {
      // tocar el riel: centra la manija donde se tocó
      const prop = (e.clientX - caja.left) / caja.width - pos.ancho / 2;
      t.scrollLeft = prop * t.scrollWidth;
    }
    arrastre.current = { x: e.clientX, inicio: t.scrollLeft };
    r.setPointerCapture(e.pointerId);
  };
  const alMover = (e: React.PointerEvent<HTMLDivElement>) => {
    const t = tabla.current, r = riel.current, a = arrastre.current;
    if (!t || !r || !a) return;
    const dx = e.clientX - a.x;
    t.scrollLeft = a.inicio + (dx / r.getBoundingClientRect().width) * t.scrollWidth;
  };
  const alSoltar = () => { arrastre.current = null; };

  const mover = (dir: 1 | -1) => tabla.current?.scrollBy({ left: dir * tabla.current.clientWidth * 0.6, behavior: "smooth" });
  const hayIzq = pos.izq > 0.001;
  const hayDer = pos.izq + pos.ancho < 0.999;

  return (
    <div>
      <div className={`sticky top-0 z-20 bg-fondo/95 backdrop-blur pt-1 pb-1.5 ${pos.max > 2 ? "" : "hidden"}`}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => mover(-1)} disabled={!hayIzq} aria-label="Mover la tabla a la izquierda"
            className="w-10 h-10 shrink-0 rounded-full bg-white border border-borde flex items-center justify-center hover:border-acento disabled:opacity-35 cursor-pointer disabled:cursor-default">
            <ChevronLeft size={18} />
          </button>
          <div
            ref={riel}
            role="scrollbar"
            aria-controls="tabla-deslizable"
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((pos.izq / Math.max(0.0001, 1 - pos.ancho)) * 100)}
            aria-label="Barra para deslizar la tabla"
            onPointerDown={alApretar}
            onPointerMove={alMover}
            onPointerUp={alSoltar}
            onPointerCancel={alSoltar}
            className="relative flex-1 h-10 cursor-pointer touch-none select-none"
          >
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 rounded-full bg-white border border-borde" />
            <div
              data-manija="1"
              className="absolute top-1/2 -translate-y-1/2 h-5 rounded-full bg-acento shadow-sm cursor-grab active:cursor-grabbing"
              style={{ left: `${pos.izq * 100}%`, width: `${Math.max(pos.ancho * 100, 8)}%` }}
            />
          </div>
          <button type="button" onClick={() => mover(1)} disabled={!hayDer} aria-label="Mover la tabla a la derecha"
            className="w-10 h-10 shrink-0 rounded-full bg-white border border-borde flex items-center justify-center hover:border-acento disabled:opacity-35 cursor-pointer disabled:cursor-default">
            <ChevronRight size={18} />
          </button>
        </div>
        <p className="text-[11px] text-texto-2 flex items-center gap-1"><MoveHorizontal size={12} /> Arrastrá la barra, usá las flechas o deslizá la tabla con el dedo</p>
      </div>
      <div id="tabla-deslizable" ref={tabla} onScroll={medir} className="tarjeta overflow-x-auto overscroll-x-contain">
        {children}
      </div>
    </div>
  );
}
