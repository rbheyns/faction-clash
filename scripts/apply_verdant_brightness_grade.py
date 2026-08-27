"""Apply the approved 2026-08-25 Verdant tonal corrections.

This is intentionally a gamma-only pass: it improves thumbnail readability while
preserving the existing palette, saturation, contrast, composition, and dimensions.
The source assets are copied to the dated backup directory before replacement.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ART_DIR = ROOT / "assets" / "art" / "verdant"
BACKUP_DIR = ROOT / "art_backups" / "verdant-pre-grade-2026-08-25"

# Gamma below 1 brightens shadows; above 1 restrains bright images. Values were
# chosen as conservative, card-thumbnail readability corrections.
GAMMAS = {
    "VER020": 0.90,
    "VER052": 0.82,
    "VER076": 0.88,
    "VER083": 0.70,
    "VER091": 0.86,
    "VER081": 1.10,
    "VER093": 1.08,
}


def gamma_grade(image: Image.Image, gamma: float) -> Image.Image:
    lut = [round(255 * ((value / 255) ** gamma)) for value in range(256)]
    if image.mode == "RGBA":
        red, green, blue, alpha = image.split()
        return Image.merge("RGBA", (red.point(lut), green.point(lut), blue.point(lut), alpha))
    return image.convert("RGB").point(lut * 3)


def main() -> None:
    BACKUP_DIR.mkdir(parents=True, exist_ok=False)
    for card_id, gamma in GAMMAS.items():
        target = ART_DIR / f"{card_id}.png"
        if not target.is_file():
            raise FileNotFoundError(target)
        shutil.copy2(target, BACKUP_DIR / target.name)
        with Image.open(target) as source:
            if source.size != (1400, 2100):
                raise ValueError(f"{target}: expected 1400x2100, got {source.size}")
            graded = gamma_grade(source, gamma)
            graded.save(target, format="PNG")
        print(f"{card_id}: gamma {gamma:.2f}")


if __name__ == "__main__":
    main()
