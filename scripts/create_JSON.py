#!/usr/bin/env python3
import os, json, urllib.parse, xml.etree.ElementTree as ET

# Edit this to match your actual root URL for the menu (include trailing slash if needed)
SITE_ROOT = "https:///Algorithms/"

def scan_dir(current_path):
    items = []
    for entry in sorted(os.listdir(current_path)):
        entry_path = os.path.join(current_path, entry)
        if os.path.isdir(entry_path):
            items.append({entry: scan_dir(entry_path)})
        elif entry.endswith('.html') and "DRAFT" not in entry.upper():
            items.append(entry)
    return items

def build_chapters_json(base_dir='/home/cusack/public_html/Algorithms/Content'):
    chapters = {}
    for chapter_dir in sorted(os.listdir(base_dir)):
        chapter_path = os.path.join(base_dir, chapter_dir)
        if os.path.isdir(chapter_path):
            chapters[chapter_dir] = scan_dir(chapter_path)

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
