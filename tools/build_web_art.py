"""Build Git-friendly card-art derivatives without changing approved masters.

Exports every PNG under assets/art to the matching assets/web-art path as a
700x1050 WebP (portrait 2x display resolution). Run from the repository root:
    <bundled-python> tools/build_web_art.py
"""

from pathlib import Path
from PIL import Image, ImageOps

SOURCE = Path("assets/art")
DESTINATION = Path("assets/web-art")
SIZE = (700, 1050)
QUALITY = 82


def export(source: Path) -> int:
    destination = (DESTINATION / source.relative_to(SOURCE)).with_suffix(".webp")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        if image.size != SIZE:
            image = image.resize(SIZE, Image.Resampling.LANCZOS)
        image.save(destination, "WEBP", quality=QUALITY, method=6)
    return destination.stat().st_size


def main() -> None:
    sources = sorted(SOURCE.rglob("*.png"))
    if not sources:
        raise SystemExit("No PNG artwork found under assets/art.")
    total = sum(export(source) for source in sources)
    print(f"Exported {len(sources)} WebP files to {DESTINATION} ({total / 1024 / 1024:.1f} MiB).")


if __name__ == "__main__":
    main()
