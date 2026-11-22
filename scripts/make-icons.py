"""Draws Forkcast's app icon (navy square, aqua progress ring, fork) and writes every size the app needs.

Run from the project folder:  python scripts/make-icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

NAVY = (11, 20, 38, 255)  # C.bg
AQUA = (46, 230, 214, 255)  # C.accent
LINE = (35, 58, 99, 255)  # C.line
WHITE = (255, 255, 255, 255)

ROOT = Path(__file__).resolve().parent.parent
S = 1024  # draw big, then shrink for smooth edges


def draw(background=True, scale=1.0):
    img = Image.new('RGBA', (S, S), NAVY if background else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = S / 2
    r = 330 * scale
    w = int(70 * scale)
    box = [c - r, c - r, c + r, c + r]
    d.ellipse(box, outline=LINE, width=w)  # empty track
    d.arc(box, start=-90, end=180, fill=AQUA, width=w)  # 3/4 filled ring
    # Fork: three tines, a bridge, and a handle.
    fw = 150 * scale  # fork width
    top = c - 170 * scale
    tine_h = 130 * scale
    tine_w = 30 * scale
    for i in range(3):
        x = c - fw / 2 + i * (fw - tine_w) / 2
        d.rounded_rectangle([x, top, x + tine_w, top + tine_h + 20 * scale], radius=tine_w / 2, fill=WHITE)
    d.rounded_rectangle([c - fw / 2, top + tine_h, c + fw / 2, top + tine_h + 60 * scale], radius=30 * scale, fill=WHITE)
    d.rounded_rectangle(
        [c - 24 * scale, top + tine_h + 30 * scale, c + 24 * scale, c + 200 * scale], radius=24 * scale, fill=WHITE
    )
    return img


def save(img, size, path):
    path = ROOT / path
    path.parent.mkdir(parents=True, exist_ok=True)
    img.resize((size, size), Image.LANCZOS).save(path)
    print('wrote', path.relative_to(ROOT), f'{size}x{size}')


full = draw()
save(full, 1024, 'assets/images/icon.png')
save(full, 48, 'assets/images/favicon.png')
save(full, 180, 'public/apple-touch-icon.png')
save(full, 192, 'public/icon-192.png')
save(full, 512, 'public/icon-512.png')
# Splash and Android foreground: transparent background, a bit smaller so nothing gets cropped.
save(draw(background=False, scale=0.8), 1024, 'assets/images/splash-icon.png')
save(draw(background=False, scale=0.7), 1024, 'assets/images/android-icon-foreground.png')
