# Sidewalk scene

Approved scope: one gánh on the left, an empty Vietnamese sidewalk background, and the existing interactive customer queue on the right. No decoration system.

Art source: `host_image`, generated with the built-in ImageGen tool using the approved concept as a reference. No API or CLI generation was used; the tool did not expose its model identifier or price.

| Layer | Original | Prompt | Runtime |
| --- | --- | --- | --- |
| Sidewalk | [sidewalk.png](sidewalk.png) | [background.prompt.txt](background.prompt.txt) | [sidewalk.webp](../../public/art/sidewalk.webp) |
| Gánh | [ganh.png](ganh.png) | [ganh.prompt.txt](ganh.prompt.txt) | [ganh.webp](../../public/art/ganh.webp) |

`prepare.py` packages the original PNGs with Pillow, preserving real alpha and limiting the combined runtime payload to 300 KB. `assets.json` records dimensions, output hashes and provenance. Actual runtime payload: 227,502 bytes.

The background repeats horizontally at a uniform scale. The gánh preserves its aspect ratio and anchors its base to the same ground line as customer feet. Draw order: sidewalk, gánh, customer queue, selected customer's dialogue, departure animation. Scene height remains 154–190 CSS pixels; the gánh reserves 88–210 pixels on the left and the queue supports up to four 44px-or-larger controls. Existing game state owns ordering and selection; this backdrop adds no map physics or navigation system.

Customers retain their existing IDs, patience, dialogue, order selection and tutorial controls. Browser checks cover 0–4 customers and narrow/tablet/desktop viewports. Original character art remains native SVG, adjusted to face the gánh. Still art only; no video or looping background was generated.
