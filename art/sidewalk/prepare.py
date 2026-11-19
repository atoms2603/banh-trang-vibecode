"""Package the approved ImageGen layers without changing their composition."""
from pathlib import Path
import hashlib
import json
from PIL import Image

root = Path(__file__).resolve().parents[2]
source = Path(__file__).resolve().parent
runtime = root / 'public' / 'art'
runtime.mkdir(parents=True, exist_ok=True)
assets = []
for name in ('sidewalk', 'ganh'):
    original = source / f'{name}.png'
    with Image.open(original) as image:
        if name == 'ganh':
            assert image.mode == 'RGBA' and image.getextrema()[3] == (0, 255), 'Gánh needs real transparency'
        size = image.size
        image.thumbnail((1536, 768) if name == 'sidewalk' else (640, 640), Image.Resampling.LANCZOS)
        output = runtime / f'{name}.webp'
        image.save(output, 'WEBP', quality=88, method=6)
        assets.append({'name': name, 'art_source': 'host_image', 'route': 'built-in ImageGen',
                       'original_size': size, 'runtime_size': image.size,
                       'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'bytes': output.stat().st_size})
assert sum(asset['bytes'] for asset in assets) < 300_000, 'Keep the scene light enough for mobile'
(source / 'assets.json').write_text(json.dumps(assets, indent=2) + '\n', encoding='utf-8')
print(json.dumps(assets))
