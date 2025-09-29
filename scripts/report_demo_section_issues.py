#!/usr/bin/env python3
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT_DIR = os.path.join(ROOT, 'Content')

CANON_TITLES = {
    'Problem Solved',
    'Design and Strategy',
    'Interactive Demo',
    'Implementation in Java, C++, Python',
    'Time/Space Analysis',
    'Variations/Improvements',
    'Helpful Links and Resources',
    'Reading Comprehension Questions',
    'In-Class Activities',
    'Homework Problems',
}

def read_text(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        with open(path, 'r', encoding='latin-1', errors='replace') as f:
            return f.read()

def analyze(html):
    # Focus on <body>
    m = re.search(r"<body[^>]*>(.*)</body>", html, re.IGNORECASE | re.DOTALL)
    if not m:
        return []
    body = m.group(1)

    issues = []

    # Find sections
    open_pat = re.compile(r"<\s*section\b([^>]*)>", re.IGNORECASE)
    close_pat = re.compile(r"</\s*section\s*>", re.IGNORECASE)
    tokens = []
    for om in open_pat.finditer(body):
        tokens.append(('open', om.start(), om.end(), om.group(1) or ''))
    for cm in close_pat.finditer(body):
        tokens.append(('close', cm.start(), cm.end(), ''))
    tokens.sort(key=lambda t: t[1])

    stack = []
    sections = []
    depth = 0
    for typ, s, e, attrs in tokens:
        if typ == 'open':
            depth += 1
            stack.append((s, e, attrs, depth))
        else:
            if not stack:
                continue
            os, oe, oattrs, d = stack.pop()
            title = ''
            stm = re.search(r"section-title\s*=\s*\"([^\"]*)\"", oattrs, re.IGNORECASE)
            if stm:
                title = stm.group(1)
            sections.append({'start': os, 'open_end': oe, 'end': s, 'close_end': e, 'attrs': oattrs, 'title': title, 'depth': d})
            depth -= 1

    # Detect nested canonical sections (keep reporting as it indicates structure problems)
    for sec in sections:
        if sec['title'] in CANON_TITLES and sec['depth'] > 1:
            issues.append(f"Nested canonical section: '{sec['title']}' at depth {sec['depth']}")

    # Identify demo blocks: prefer embeddedDemoContainer blocks; if none, detect standalone iframes
    container_blocks = list(re.finditer(r"<div\s+class=\"embeddedDemoContainer\"[^>]*>.*?</div>", body, re.IGNORECASE | re.DOTALL))
    iframes = list(re.finditer(r"<iframe\b[^>]*class=\"embeddedDemo\"[^>]*>.*?</iframe>", body, re.IGNORECASE | re.DOTALL))
    demo_blocks = []
    if container_blocks:
        for m in container_blocks:
            demo_blocks.append((m.start(), m.end()))
    else:
        for m in iframes:
            demo_blocks.append((m.start(), m.end()))

    # For each demo, determine if it is standalone (not in any section) or trailing in a non-demo section
    for start, end in demo_blocks:
        containing = None
        for sec in sections:
            if sec['open_end'] <= start <= sec['end']:
                if not containing or sec['depth'] > containing['depth']:
                    containing = sec
        if not containing:
            issues.append("Standalone demo (outside any section)")
            continue
        if containing['title'] == 'Interactive Demo':
            continue
        # trailing if only whitespace exists between demo end and section close
        remainder = body[end:containing['end']]
        if remainder.strip() == '':
            issues.append(f"Trailing demo inside '{containing['title'] or '(untitled)'}'")

    return issues

def main():
    report = []
    for root, dirs, files in os.walk(CONTENT_DIR):
        # Skip Problems and Demos
        rel = os.path.relpath(root, CONTENT_DIR)
        parts = [] if rel == '.' else rel.split(os.sep)
        if parts and parts[0].lower() in ('problems', 'demos'):
            dirs[:] = []
            continue
        for fn in files:
            if not fn.lower().endswith('.html'):
                continue
            p = os.path.join(root, fn)
            html = read_text(p)
            issues = analyze(html)
            if issues:
                report.append((os.path.relpath(p, ROOT), issues))

    if report:
        print("Potential issues found:")
        for path, issues in report:
            print("-", path)
            for iss in issues:
                print("  *", iss)
    else:
        print("No potential demo/section issues detected.")

if __name__ == '__main__':
    main()
