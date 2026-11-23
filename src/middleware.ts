import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, leerSesion } from "@/lib/sesion";

// Páginas que se pueden ver sin iniciar sesión
const PUBLICAS = ["/login", "/pedido", "/completar", "/c", "/api/archivos", "/api/mercadopago", "/api/copia/automatica"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  const sesion = await leerSesion(req.cookies.get(COOKIE_SESION)?.value);
  if (!sesion) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|webp|ico)$).*)"],
};
