#!/usr/bin/env python3
"""Usage: compare-screenshots.py <dir-a> <dir-b>
Prints, for each image in dir-a, how many pixels differ in dir-b and by how much."""
import os
import sys
from PIL import Image, ImageChops

a_dir, b_dir = sys.argv[1], sys.argv[2]
worst = 0
for name in sorted(os.listdir(a_dir)):
    if not name.endswith(".png"):
        continue
    a = Image.open(os.path.join(a_dir, name)).convert("RGB")
    b = Image.open(os.path.join(b_dir, name)).convert("RGB")
    if a.size != b.size:
        print(f"{name:16} size differs {a.size} vs {b.size}")
        worst = 1
        continue
    diff = ImageChops.difference(a, b)
    values = [max(p) for p in diff.getdata() if p != (0, 0, 0)]
    share = 100 * len(values) / (a.size[0] * a.size[1])
    biggest = max(values) if values else 0
    print(f"{name:16} differing pixels: {len(values):7} ({share:5.2f}%)  largest channel difference: {biggest}/255")
    if biggest > 40:
        worst = 1
sys.exit(worst)
