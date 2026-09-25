"""
scripts/generate-icons.py

Genereert simpele PWA-iconen in de Ocean Depths-kleuren: een teal
afgeronde-vierkant achtergrond met een wit "spionnenmasker" (twee ogen +
een balk), zodat de app iets heeft om aan het beginscherm toe te voegen.
Puur functioneel/placeholder — vervang gerust door een eigen ontwerp.
Draai met: python3 scripts/generate-icons.py
"""

from PIL import Image, ImageDraw

BG = (26, 35, 50, 255)       # #1a2332
ACCENT = (45, 139, 139, 255)  # #2d8b8b
CREAM = (241, 250, 238, 255)  # #f1faee


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    radius = int(size * 0.22)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=ACCENT)

    # Subtiele gradient-achtige "diepte": een iets donkerdere onderrand.
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rounded_rectangle(
        [0, int(size * 0.55), size - 1, size - 1], radius=radius, fill=(*BG[:3], 90)
    )
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)

    # Masker: balk + twee ogen.
    bar_h = size * 0.16
    bar_y = size * 0.40
    draw.rounded_rectangle(
        [size * 0.16, bar_y, size * 0.84, bar_y + bar_h],
        radius=int(bar_h / 2),
        fill=CREAM,
    )
    eye_r = size * 0.07
    eye_y = bar_y + bar_h / 2
    for cx in (size * 0.36, size * 0.64):
        draw.ellipse([cx - eye_r, eye_y - eye_r, cx + eye_r, eye_y + eye_r], fill=BG)

    return img


for size, path in [
    (192, "public/icons/icon-192.png"),
    (512, "public/icons/icon-512.png"),
    (180, "public/icons/apple-touch-icon.png"),
]:
    draw_icon(size).save(path)
    print(f"geschreven: {path} ({size}x{size})")
