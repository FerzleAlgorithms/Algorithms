#!/usr/bin/env python3 
import os, json

def scan_dir(current_path):
    items = []
    for entry in sorted(os.listdir(current_path)):
        entry_path = os.path.join(current_path, entry)
        if os.path.isdir(entry_path):
            items.append({entry: scan_dir(entry_path)})
        elif entry.endswith('.html'):
            items.append(entry)
    return items

def build_chapters_json(base_dir='../Content'):
    chapters = {}
    for chapter_dir in sorted(os.listdir(base_dir)):
        chapter_path = os.path.join(base_dir, chapter_dir)
        if os.path.isdir(chapter_path):
            chapters[chapter_dir] = scan_dir(chapter_path)

    with open('chapters.json', 'w') as f:
        json.dump(chapters, f, indent=2)

if __name__ == "__main__":
    build_chapters_json()
