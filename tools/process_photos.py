"""Convierte fotos libres de Wikimedia Commons en texturas para el juego.

Uso: python3 tools/process_photos.py <carpeta_con_originales> public/assets/torreon
Los originales (01.jpg ... 17.jpg) se listan en docs/FOTOS.md.
"""
import sys, os
from PIL import Image, ImageFilter
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
o = lambda n: Image.open(os.path.join(src, n)).convert('RGB')

# 1) Fachadas: recorte frontal y correccion de perspectiva.
g = o('10.jpg').crop((0, 95, 1020, 495)).resize((1024, 400), Image.LANCZOS)
g.save(os.path.join(out, 'fachada_galicia.jpg'), quality=86)
t = o('11.jpg').transform((768, 768), Image.QUAD, (357, 128, 30, 700, 1250, 700, 910, 128), Image.BICUBIC)
t.save(os.path.join(out, 'fachada_teatro.jpg'), quality=86)

# 2) Horizonte: silueta del Cerro de las Noas recortada del cielo (PNG con alfa).
m = o('05.jpg').crop((0, 60, 850, 300))
w, h = m.size; px = m.load(); ridge = []
for x in range(w):
    run = 0; y0 = h - 1
    for y in range(h):
        r, gg, b = px[x, y]; lum = 0.3 * r + 0.59 * gg + 0.11 * b
        rock = lum < 178 and r > b - 6
        run = run + 1 if rock else 0
        if run >= 7: y0 = y - 6; break
    ridge.append(y0)
sm = []
for x in range(w):
    win = sorted(ridge[max(0, x - 9):x + 10]); sm.append(min(win[len(win) // 2], int(h * 0.6)))
a = Image.new('L', (w, h), 0); ap = a.load()
for x in range(w):
    for y in range(sm[x], h): ap[x, y] = 255
a = a.filter(ImageFilter.GaussianBlur(1.2))
m.putalpha(a)
m = m.resize((1024, int(h * 1024 / w)), Image.LANCZOS)
m.save(os.path.join(out, 'cerro_noas.png'))

# 3) Espectaculares: recortes 2:1.
def bill(n, box, name):
    o(n).crop(box).resize((1024, 512), Image.LANCZOS).save(os.path.join(out, name), quality=84)
bill('02.jpg', (0, 20, 1280, 660), 'esp_cristo.jpg')
bill('16.jpg', (640, 0, 1278, 319), 'esp_plaza.jpg')
bill('17.jpg', (0, 180, 1280, 820), 'esp_nazas.jpg')
bill('13.jpg', (0, 150, 1280, 790), 'esp_canal.jpg')
bill('08.jpg', (0, 300, 1280, 940), 'esp_reloj.jpg')
bill('07.jpg', (0, 150, 1280, 790), 'esp_plaza_mayor.jpg')
print('ok', sorted(os.listdir(out)))
