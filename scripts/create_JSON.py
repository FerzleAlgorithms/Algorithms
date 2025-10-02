#!/usr/bin/env python3
import os, json, urllib.parse, xml.etree.ElementTree as ET

# Edit this to match your actual root URL for the menu (include trailing slash if needed)
SITE_ROOT = "https:///Algorithms/"

# Directories to exclude from menu generation (case-insensitive)
IGNORE_DIRS = {"old", "images", "figures"}

def scan_dir(current_path, path_prefix="", draft_accumulator=None):
    items = []
    for entry in sorted(os.listdir(current_path)):
        entry_path = os.path.join(current_path, entry)
        if os.path.isdir(entry_path):
            # Skip directories like 'old', 'images', or 'figures' (any capitalization)
            if entry.lower() in IGNORE_DIRS:
                continue
            sub = scan_dir(entry_path, path_prefix + entry + "/", draft_accumulator)
            if sub:
                items.append({entry: sub})
        elif entry.endswith('.html'):
            if "DRAFT" in entry.upper():
                if draft_accumulator is not None:
                    draft_accumulator.append(path_prefix + entry)
            else:
                items.append(entry)
    return items
def build_chapters_json(base_dir='/home/cusack/public_html/Algorithms/Content'):
    chapters = {}
    drafts = []
    for chapter_dir in sorted(os.listdir(base_dir)):
        chapter_path = os.path.join(base_dir, chapter_dir)
        if os.path.isdir(chapter_path):
            # Apply the same ignore filter at the top level
            if chapter_dir.lower() in IGNORE_DIRS:
                continue
            chapters[chapter_dir] = scan_dir(chapter_path, chapter_dir + "/", drafts)
    if drafts:
        chapters.setdefault("More", []).append({"DRAFTS": sorted(drafts)})

    with open('/home/cusack/public_html/Algorithms/scripts/chapters.json', 'w') as f:
        json.dump(chapters, f, indent=2)

    return chapters
def load_chapters_json():
    with open('chapters.json', 'r') as f:
        return json.load(f)

def build_menu_paths(chapters):
    """ Recursively traverse the chapters dict to produce menu-style paths, e.g. Problems/Foundational/GCD """
    def recurse(items, prefix=""):
        paths = []
        for item in items:
            if isinstance(item, str):
                # Remove .html
                p = prefix + item[:-5]  # strip .html
                paths.append(p)
            elif isinstance(item, dict):
                for key, value in item.items():
                    paths.extend(recurse(value, prefix + key + "/"))
        return paths

    # Top-level: Home is always there (special case)
    all_paths = ["home"]
    for section, items in chapters.items():
        for path in recurse(items, section + "/"):
            all_paths.append(path)
    return all_paths

def write_sitemap(paths):
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for path in paths:
        url = ET.SubElement(urlset, "url")
        loc = ET.SubElement(url, "loc")
        # This matches your menu link logic: ?path=...
        loc.text = f"{SITE_ROOT}?path={urllib.parse.quote(path, safe='')}"
    tree = ET.ElementTree(urlset)
    tree.write("/home/cusack/public_html/Algorithms/scripts/sitemap.xml", encoding="utf-8", xml_declaration=True)

if __name__ == "__main__":
    chapters = build_chapters_json()
    menu_paths = build_menu_paths(chapters)
    write_sitemap(menu_paths)
    # print(f"Created chapters.json and sitemap.xml with {len(menu_paths)} entries.")
