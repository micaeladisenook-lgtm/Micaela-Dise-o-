"""
Convierte las planillas de pedidos de Micaela Diseño (Google Sheets exportada a .xlsx)
en un archivo JSON ordenado, listo para importar al sistema.

Uso:
  python3 -I scripts/convertir_planillas.py planilla.xlsx salida.json

Los datos personales NO se guardan en el repositorio: el JSON se escribe donde se indique.
"""
import datetime
import json
import re
import sys
import unicodedata

import openpyxl

HOY = datetime.datetime(2026, 11, 23)


def norm(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", s).split())


def limpio(v):
    if v is None:
        return None
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return str(int(v)) if float(v).is_integer() else str(v)
    s = str(v).strip()
    return s if s and s not in ("/", "-", "—", "…", "...", "---", "???", "?") else None


def es_fecha(v):
    return isinstance(v, datetime.datetime)


def iso(d):
    return d.strftime("%Y-%m-%d") if es_fecha(d) else None


# ---------------------------------------------------------------- clientas
def separar_cliente(texto):
    """'Marina (ig: PEQ)' -> ('Marina', '@PEQ', nota)"""
    t = " ".join(str(texto).split())
    instagram, notas = None, []
    for m in re.finditer(r"\(([^)]*)\)", t):
        dentro = m.group(1).strip()
        ig = re.match(r"(?i)ig\s*:?\s*@?([\w.]+)", dentro)
        if ig:
            instagram = "@" + ig.group(1)
        elif dentro:
            notas.append(dentro)
    nombre = re.sub(r"\([^)]*\)", "", t).strip(" -·,")
    m = re.search(r"(?i)\big\s*:?\s*@?([\w.]{3,})", nombre)
    if m:
        instagram = instagram or "@" + m.group(1)
        nombre = nombre[: m.start()].strip(" -·,")
    return nombre, instagram, "; ".join(notas) or None


# ---------------------------------------------------------------- productos
COLORES = {
    "off white": "Off white", "of white": "Off white", "blanco": "Blanco", "blanca": "Blanco", "negro": "Negro", "negra": "Negro",
    "azul marino": "Azul marino", "nude": "Nude", "rosa claro": "Rosa claro", "rosa viejo": "Rosa viejo",
    "celeste": "Celeste", "champagne": "Champagne", "gris perla": "Gris perla", "bordo": "Bordó", "rosa gold": "Rosa gold",
    "lila": "Lila", "azul francia": "Azul francia", "camel": "Camel", "arena": "Arena", "petroleo": "Petróleo",
    "rojo": "Rojo", "verde agua": "Verde agua",
}


def color(v):
    t = limpio(v)
    if not t:
        return None
    return COLORES.get(norm(t), t.strip().capitalize() if t.isupper() else t.strip())


def producto_catalogo(texto):
    p = norm(texto)
    if not p:
        return None
    if "mega" in p:
        return "Mega box satén"
    if "invierno" in p:
        return "Box de invierno"
    if "completo" in p:
        return "Box completo"
    if re.search(r"bata ?pantu|bata (y|\+|con) pantu|bata y pantufla|bata pantufla", p):
        return "Bata + pantu plush bordada" if "plush" in p else "Bata + pantu satén bordada"
    if "bata" in p and re.search(r"camisol|camisero|pijama", p):
        return "Bata + camisolín (o pijama o camisero)"
    if "bata" in p:
        return "Bata diseñada de plush (manga larga)" if "plush" in p else "Bata diseñada de satén"
    return None


def eleccion(texto):
    p = norm(texto)
    if "camisol" in p:
        return "Camisolín"
    if "tiras" in p or "short" in p:
        return "Pijama de tiras y short"
    if "largo" in p:
        return "Pijama camisero largo de satén"
    if "camisero" in p or "pijama" in p:
        return "Pijama camisero corto"
    return None


def talles(texto):
    t = limpio(texto) or ""
    r = {}
    m = re.search(r"(?i)batas?(?:\s+y\s+(?:pijama|camisol\w*))?\s*(?:todas\s+en\s+)?:?\s*(xxs|xs|s|m|l|xl|xxl|kids|\d{2,3})\b", t)
    if m:
        r["bata"] = m.group(1).upper() if not m.group(1).isdigit() else m.group(1)
        if re.search(r"(?i)batas?\s+y\s+(pijama|camisol)", t):
            r["pijama"] = r["bata"]
    m = re.search(r"(?i)pantu\w*\s*:?\s*(\d{2}(?:[,.]5)?(?:\s*/\s*\d{2})?)", t)
    if m:
        r["pantu"] = m.group(1).replace(" ", "")
    m = re.search(r"(?i)(?:pijama|camisol\w*|camisero)\s*:?\s*(xs|s|m|l|xl|xxl)\b", t)
    if m:
        r["pijama"] = m.group(1).upper()
    return r


def hilo(v):
    t = norm(v)
    if "dorad" in t:
        return "Dorado"
    if "platead" in t:
        return "Plateado"
    m = re.search(r"hilo (\w+)", t)
    return m.group(1).capitalize() if m else None


# ---------------------------------------------------------------- precios
def montos(texto):
    return [int(re.sub(r"\D", "", m)) for m in re.findall(r"\$?\s?\d{1,3}(?:[.,]\d{3})+|\$\s?\d{4,7}", texto)]


def medio(texto):
    t = norm(texto)
    if "tarj" in t or "credito" in t:
        return "TARJETA"
    if "transf" in t or "trasf" in t:
        return "TRANSFERENCIA"
    if "efectivo" in t:
        return "EFECTIVO"
    if "mercado" in t or " mp" in f" {t}":
        return "MERCADO_PAGO"
    return "OTRO"


def sin_acentos(s):
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()


PAR = re.compile(r"(total|abon\w*|sen[ao]\w*|resta\w*|falta\w*|debe\w*)((?:[^$\d\n]|\d{1,3}\s?%){0,25})\$?\s?(\d{1,3}(?:[.,]\d{3})+|\d{4,7})")


def leer_precio(v):
    """Devuelve (total o None, pagado o None, medio, texto original)."""
    if v is None:
        return None, None, None, None
    if isinstance(v, (int, float)):
        return int(v), None, None, str(v)
    texto = str(v)
    t = sin_acentos(texto)
    if "presupuesto" in t:  # en presupuestos, solo cuenta la línea "total" y la seña
        t = "\n".join(l for l in t.split("\n") if "c/u" not in l)
    total = pagado = resto = None
    for clave, medio_txt, monto in PAR.findall(t):
        n = int(re.sub(r"\D", "", monto))
        if clave.startswith("abon") and "total" in medio_txt:
            total = pagado = n
        elif clave == "total":
            total = n
        elif clave.startswith(("abon", "sen")):
            pagado = (pagado or 0) + n
        else:
            resto = n
    if total is None and pagado is None and resto is None:
        m = montos(texto)
        if m:
            total = m[-1]
    if total is None and pagado is not None and resto is not None:
        total = pagado + resto
    if total is None and pagado is not None and "50%" in t:
        total = pagado * 2
    if total is not None and pagado is None and resto is not None:
        pagado = total - resto
    return total, pagado, medio(texto), texto.strip()


# ---------------------------------------------------------------- hojas
def leer_hoja(ws, nombre_hoja):
    filas = list(ws.iter_rows(values_only=True))
    # buscar fila de encabezados (tiene "Compró")
    h = next((i for i, r in enumerate(filas[:6]) if any(norm(c) == "compro" for c in r)), None)
    if h is None:
        return []
    enc = [norm(c) for c in filas[h]]
    col = {k: enc.index(k) for k in ("compro",) if k in enc}
    i_compro = col["compro"]
    i_estado, i_entrega, i_evento = i_compro - 1, i_compro + 1, i_compro + 2
    i_cliente, i_vende = i_compro + 3, i_compro + 4
    i_color = next(i for i, c in enumerate(enc) if c.startswith("color bata"))
    i_prod = i_color - 1
    i_notas = enc.index("notas") if "notas" in enc else None
    pedidos = []
    for k, r in enumerate(filas[h + 1 :], start=h + 2):
        r = list(r) + [None] * 30
        cliente = limpio(r[i_cliente])
        prod = limpio(r[i_prod])
        if cliente and norm(cliente) in ("cliente", "producto"):
            continue
        if not cliente and not prod:
            continue
        if prod and norm(prod) in ("junio", "julio", "agosto", "debe pasar pedido", "producto"):
            prod = None
            if not cliente:
                continue
        item = {
            "productoTexto": prod,
            "colorBata": color(r[i_color]),
            "colorPijama": color(r[i_color + 1]),
            "hilo": hilo(r[i_color + 2]),
            "bordado": limpio(r[i_color + 3]),
            "tallesTexto": limpio(r[i_color + 4]),
            "dedicatoria": limpio(r[i_color + 5]),
        }
        if not cliente:
            if pedidos and prod:
                pedidos[-1]["items"].append(item)
            continue
        if not isinstance(r[i_cliente], str):
            continue
        nombre, ig, nota_cli = separar_cliente(cliente)
        if len(nombre) < 3:
            continue
        total, pagado, med, ptexto = leer_precio(r[i_color + 8])
        entrega_txt = None if es_fecha(r[i_entrega]) else limpio(r[i_entrega])
        evento_txt = None if es_fecha(r[i_evento]) else limpio(r[i_evento])
        notas = [x for x in [limpio(r[i_notas]) if i_notas is not None else None, nota_cli] if x]
        if entrega_txt:
            notas.append(f"Se entrega: {entrega_txt}")
        pedidos.append({
            "hoja": nombre_hoja, "fila": k,
            "cliente": {"nombre": nombre, "instagram": ig},
            "estadoPlanilla": norm(r[i_estado]) or None,
            "fechaPedido": iso(r[i_compro]),
            "seEntrega": iso(r[i_entrega]),
            "fechaEvento": iso(r[i_evento]),
            "eventoTexto": evento_txt,
            "vendedora": norm(r[i_vende]) or None,
            "direccion": limpio(r[i_color + 6]),
            "localidad": limpio(r[i_color + 7]),
            "total": total, "pagado": pagado, "medio": med, "precioTexto": ptexto,
            "prioridad": "prioridad" in norm(" ".join(str(x) for x in r if x)),
            "notas": notas,
            "items": [item],
        })
    return pedidos


def main(entrada, salida):
    wb = openpyxl.load_workbook(entrada, data_only=True)
    principal = leer_hoja(wb["2026"], "2026")
    vistos = {norm(p["cliente"]["nombre"]) for p in principal}
    extra = []
    for hoja in ["AGOSTO 2026", "SEPTIEMBRE 2026", "OCTUBRE 2026", "NOVIEMBRE 2026", "DICIEMBRE 2026", "PRIORIDAD 15.000", "PROVINCIAS MES NOV"]:
        if hoja not in wb.sheetnames:
            continue
        for p in leer_hoja(wb[hoja], hoja):
            n = norm(p["cliente"]["nombre"])
            if n not in vistos:
                vistos.add(n)
                extra.append(p)

    # Clientas 2025 (solo datos de contacto)
    clientas2025 = []
    if "MAYO 2025" in wb.sheetnames:
        for r in list(wb["MAYO 2025"].iter_rows(values_only=True))[3:]:
            r = list(r) + [None] * 30
            if not isinstance(r[3], str) or len(r[3].strip()) < 3:
                continue
            nombre, ig, _ = separar_cliente(r[3])
            tel = limpio(r[13])
            clientas2025.append({
                "nombre": nombre, "instagram": ig,
                "telefono": tel if tel and re.sub(r"\D", "", tel) and len(re.sub(r"\D", "", tel)) >= 8 else None,
                "email": limpio(r[12]), "direccion": limpio(r[9]), "localidad": limpio(r[10]),
                "fecha": iso(r[14]),
            })

    for p in principal + extra:
        for it in p["items"]:
            it["producto"] = producto_catalogo(it["productoTexto"])
            it["eleccion"] = eleccion(it["productoTexto"])
            it["talles"] = talles(it["tallesTexto"])

    json.dump({"pedidos": principal + extra, "clientas2025": clientas2025}, open(salida, "w"), ensure_ascii=False, indent=1)
    print(f"Pedidos hoja 2026: {len(principal)} · extra de hojas por mes: {len(extra)} · clientas 2025: {len(clientas2025)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
