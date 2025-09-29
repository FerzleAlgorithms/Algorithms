#!/usr/bin/env python3
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEMOS_DIR = os.path.join(ROOT, 'Content', 'Demos')

def strip_attrs(html: str) -> str:
    # Remove section-title and data-section-title attributes
    html2 = re.sub(r"\s+(section-title|data-section-title)\s*=\s*\"[^\"]*\"", "", html, flags=re.IGNORECASE)
    return html2

def process_file(path: str) -> bool:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        with open(path, 'r', encoding='latin-1', errors='replace') as f:
            content = f.read()

    new_content = strip_attrs(content)
    if new_content == content:
        return False
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    return True

def main():
    changed = 0
    scanned = 0
    for root, _, files in os.walk(DEMOS_DIR):
        for fn in files:
            if not fn.lower().endswith('.html'):
                continue
            p = os.path.join(root, fn)
            scanned += 1
            if process_file(p):
                changed += 1
                print(f"Fixed: {os.path.relpath(p, ROOT)}")
    print(f"Scanned {scanned} demo HTML files; changed {changed}.")

if __name__ == '__main__':
    main()

