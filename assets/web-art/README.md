# Playtest art

This folder contains Git-friendly WebP derivatives of the approved card-art
masters in `assets/art`. Files are generated at 700x1050 (2x card-display
resolution) with WebP quality 82. The renderer prefers these files for cards
whose normal `art` path is under `assets/art`, then falls back to the local PNG
master if a derivative is unavailable.

Rebuild after approving new masters with `tools/build_web_art.py` using the
bundled Python runtime that includes Pillow. Do not edit these WebP files by hand.
