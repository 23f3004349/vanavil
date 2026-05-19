from PIL import Image
import os

icons_dir = os.path.join(os.getcwd(), "frontend", "public", "icons")
operations = [
    ("logo.png", "icon-192.png", 192),
    ("pic.png", "icon-512.png", 512),
]

for src, dst, size in operations:
    src_path = os.path.join(icons_dir, src)
    out_path = os.path.join(icons_dir, dst)
    if not os.path.exists(src_path):
        print(f"MISSING: {src_path}")
        continue
    try:
        im = Image.open(src_path).convert("RGBA")
        im_resized = im.resize((size, size), Image.LANCZOS)
        im_resized.save(out_path, format="PNG")
        print(f"SAVED: {out_path}")
    except Exception as e:
        print(f"ERROR processing {src_path}: {e}")
