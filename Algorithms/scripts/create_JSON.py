#!/usr/bin/env python3
import os, json

def build_chapters_json(base_dir='chapters'):
    chapters = {}
    for chapter_dir in sorted(os.listdir(base_dir)):
        chapter_path = os.path.join(base_dir, chapter_dir)
        if os.path.isdir(chapter_path):
            sections = sorted(f for f in os.listdir(chapter_path) if f.endswith('.html'))
            chapter_name = chapter_dir.replace('_', ' ')
            chapters[chapter_name] = sections
    with open('chapters.json', 'w') as f:
        json.dump(chapters, f, indent=2)

if __name__ == "__main__":
    build_chapters_json()

