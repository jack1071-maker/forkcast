"""Draws a QR code for the live web app (docs/web-qr.png).

Uses the tiny `toqr` encoder that already ships with Expo's tools, then draws it with Pillow.
Run from the project folder:  python scripts/make-qr.py
"""
import json
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

URL = 'https://jack1071-forkcast.expo.app'
ROOT = Path(__file__).resolve().parent.parent
NAVY = (11, 20, 38)

# toqr returns one byte per module (1 = dark), row by row. ECLevel 2 = High error correction.
bits = json.loads(
    subprocess.check_output(
        ['node', '-e', f'process.stdout.write(JSON.stringify(Array.from(require("toqr").toQR({json.dumps(URL)}, 2))))'],
        cwd=ROOT,
    )
)
n = int(math.isqrt(len(bits)))
assert n * n == len(bits), 'unexpected QR size'

box, quiet = 20, 4  # pixels per module, white border in modules
size = (n + quiet * 2) * box
img = Image.new('RGB', (size, size), 'white')
d = ImageDraw.Draw(img)
for y in range(n):
    for x in range(n):
        if bits[y * n + x]:
            x0, y0 = (x + quiet) * box, (y + quiet) * box
            d.rectangle([x0, y0, x0 + box - 1, y0 + box - 1], fill=NAVY)

# The Forkcast icon in the middle (High error correction leaves room for it).
icon = Image.open(ROOT / 'public/icon-192.png').convert('RGBA')
side = int(size * 0.2)
icon = icon.resize((side, side), Image.LANCZOS)
pad = box // 2
bg = Image.new('RGB', (side + pad * 2, side + pad * 2), 'white')
img.paste(bg, ((size - bg.width) // 2, (size - bg.height) // 2))
img.paste(icon, ((size - side) // 2, (size - side) // 2), icon)

out = ROOT / 'docs/web-qr.png'
img.save(out)
print('wrote', out.relative_to(ROOT), f'{n}x{n} modules')
