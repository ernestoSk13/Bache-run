"""Agrega la foto de un bache real al juego.

Uso:
  python3 tools/add_bache.py foto.jpg "Calle A esq. Avenida B" --colonia Centro --fecha 2026-11 --credito "Nombre"

La foto se endereza, se reduce a 640 px y se vuelve a guardar SIN metadatos
(las fotos de telefono traen la ubicacion GPS exacta). Nunca subas el original al repo.
"""
import argparse, json, os, re, sys, unicodedata
from PIL import Image, ImageOps

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'baches')

def slug(t):
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')[:40] or 'bache'

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('foto'); ap.add_argument('ubicacion', help='Cruce de calles o referencia. Sin numero de casa.')
    ap.add_argument('--colonia', default=''); ap.add_argument('--fecha', default='', help='AAAA-MM en que se tomo la foto')
    ap.add_argument('--credito', default='', help='Quien tomo la foto (con su permiso)')
    ap.add_argument('--estado', default='activo', choices=['activo', 'tapado'])
    ap.add_argument('--ejemplo', action='store_true', help='Marca la foto como provisional')
    a = ap.parse_args()
    if a.fecha and not re.fullmatch(r'\d{4}-\d{2}', a.fecha): sys.exit('La fecha va como AAAA-MM, por ejemplo 2026-11.')
    if a.foto.lower().endswith(('.heic', '.heif')):
        try:
            import pillow_heif; pillow_heif.register_heif_opener()
        except ImportError:
            sys.exit('Las fotos HEIC del iPhone necesitan "pip install pillow-heif", o exporta la foto como JPEG.')
    im = ImageOps.exif_transpose(Image.open(a.foto)).convert('RGB')
    im.thumbnail((640, 640), Image.LANCZOS)
    path = os.path.join(ROOT, 'baches.json')
    data = json.load(open(path, encoding='utf8')) if os.path.exists(path) else []
    base = slug(a.ubicacion); ids = {d['id'] for d in data}; bid = base; n = 2
    while bid in ids: bid = f'{base}-{n}'; n += 1
    clean = Image.new('RGB', im.size); clean.putdata(list(im.getdata()))  # copia de pixeles: sin EXIF ni GPS
    clean.save(os.path.join(ROOT, bid + '.jpg'), quality=82, optimize=True)
    e = {'id': bid, 'foto': bid + '.jpg', 'ubicacion': a.ubicacion, 'colonia': a.colonia, 'fecha': a.fecha, 'estado': a.estado, 'credito': a.credito}
    if a.ejemplo: e['ejemplo'] = True
    data.append(e)
    json.dump(data, open(path, 'w', encoding='utf8'), ensure_ascii=False, indent=2); open(path, 'a').write('\n')
    print(f'Listo: public/baches/{bid}.jpg ({clean.size[0]}x{clean.size[1]}). Total de baches: {len(data)}')

if __name__ == '__main__':
    main()
