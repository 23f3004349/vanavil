from PIL import Image
import os

base = os.path.join(os.getcwd(), 'frontend', 'public', 'screenshots')
ops = [
    ('mobile-home.png', 'mobile-home-390x844.png', (390, 844)),
    ('desktop-dashboard.png', 'desktop-dashboard-1365x768.png', (1365, 768)),
]

for src, dst, size in ops:
    src_path = os.path.join(base, src)
    out_path = os.path.join(base, dst)
    if not os.path.exists(src_path):
        print(f'MISSING: {src_path}')
        continue
    try:
        with Image.open(src_path) as im:
            im = im.convert('RGBA')
            resized = im.resize(size, Image.LANCZOS)
            resized.save(out_path, format='PNG')
            print(f'SAVED: {out_path} ({size[0]}x{size[1]})')
    except Exception as e:
        print(f'ERROR processing {src_path}: {e}')
