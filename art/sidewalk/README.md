# Sidewalk scene

Approved scope: one gánh on the left, an empty Vietnamese sidewalk background, and the existing interactive customer queue on the right. No decoration system.

Art source: `host_image`, generated with the built-in ImageGen tool using the approved concept as a reference. No API or CLI generation was used; the tool did not expose its model identifier or price.

| Layer | Original | Prompt | Runtime |
| --- | --- | --- | --- |
| Sidewalk | [sidewalk.png](sidewalk.png) | [background.prompt.txt](background.prompt.txt) | [sidewalk.webp](../../public/art/sidewalk.webp) |
| Gánh | [ganh.png](ganh.png) | [ganh.prompt.txt](ganh.prompt.txt) | [ganh.webp](../../public/art/ganh.webp) |

`prepare.py` packages the original PNGs with Pillow, preserving real alpha and limiting the combined runtime payload to 300 KB. `assets.json` records dimensions, output hashes and provenance. Actual runtime payload: 227,502 bytes.

The background repeats horizontally at a uniform scale. The gánh preserves its aspect ratio and anchors its base to the same ground line as customer feet. The sidewalk, gánh and queue scroll together horizontally, with space for each waiting customer. Existing game state owns ordering and selection.

Customers retain their existing IDs, patience, dialogue, order selection and tutorial controls. Browser checks cover 0–4 customers and narrow/tablet/desktop viewports. Original character art remains native SVG, adjusted to face the gánh. Still art only; no video or looping background was generated.
