#!/usr/bin/env python3
import os
import re
import bisect
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT_DIR = os.path.join(ROOT, 'Content')

H2_PATTERN = re.compile(r"<h2(\s+[^>]*)?>(.*?)</h2>", re.IGNORECASE | re.DOTALL)
BODY_PATTERN = re.compile(r"(<body[^>]*>)(.*?)(</body>)", re.IGNORECASE | re.DOTALL)

def slugify(text: str) -> str:
    # Roughly match scripts/loadContent.js slugify
    import unicodedata
    txt = unicodedata.normalize('NFKD', text or '')
    txt = txt.lower()
    # Strip tags/entities remnants first
    txt = re.sub(r"<[^>]+>", " ", txt)
    # Keep word chars, space, dash, underscore
    txt = re.sub(r"[^\w\s-]", "", txt)
    txt = txt.strip()
    txt = re.sub(r"[\s_-]+", "-", txt)
    txt = re.sub(r"^-+|-+$", "", txt)
    return txt or 'section'

def extract_title_text(h2_html: str) -> str:
    # Extract inner text of h2 (second group of H2_PATTERN)
    # Remove tags/entities minimally
    text = re.sub(r"<[^>]+>", " ", h2_html)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text

def normalize_title(title: str) -> str:
    # Keep original title; do not force canonicalization to avoid unintended changes
    return (title or '').strip()

def add_attrs_to_existing_sections(body_html: str) -> str:
    # Add section-title attribute to existing <section> tags when missing (do not modify ids)
    # Find opening <section ...> tags
    out = []
    i = 0
    open_tag_pattern = re.compile(r"<\s*section\b([^>]*)>", re.IGNORECASE)
    close_tag_pattern = re.compile(r"</\s*section\s*>", re.IGNORECASE)
    heading_pattern = re.compile(r"<\s*h[1-6]\b[^>]*>(.*?)</\s*h[1-6]\s*>", re.IGNORECASE | re.DOTALL)

    pos = 0
    while True:
        m = open_tag_pattern.search(body_html, pos)
        if not m:
            out.append(body_html[pos:])
            break
        # Append content before this tag
        out.append(body_html[pos:m.start()])
        attrs = m.group(1) or ''
        # If already has section-title or data-section-title, leave as is
        if re.search(r"\b(section-title|data-section-title)\s*=", attrs, re.IGNORECASE):
            out.append(m.group(0))
            pos = m.end()
            continue
        # Find end of this section to limit heading search
        close_m = close_tag_pattern.search(body_html, m.end())
        section_end = close_m.start() if close_m else len(body_html)
        content_after = body_html[m.end():section_end]
        hm = heading_pattern.search(content_after)
        raw_title = extract_title_text(hm.group(1)) if hm else ''
        title_text = normalize_title(raw_title)
        new_attrs = attrs
        if title_text and not re.search(r"\b(section-title|data-section-title)\s*=", attrs, re.IGNORECASE):
            new_attrs += f' section-title="{title_text}"'
        # Reconstruct opening tag
        out.append(f"<section{new_attrs}>")
        pos = m.end()
    return ''.join(out)

def wrap_sections_in_body(body_html: str) -> str:
    # If already contains section-title attributes, skip
    if re.search(r"section-title\s*=|data-section-title\s*=", body_html, re.IGNORECASE):
        # Ensure existing sections gain attributes and cleanup any duplicates
        tmp = add_attrs_to_existing_sections(body_html)
        # Reuse cleanup from below by briefly wrapping into a function here
        def cleanup_nested_dupes(s: str) -> str:
            dup_open = re.compile(
                r'(<\s*section\b[^>]*\bid="([^"]+)"[^>]*\bsection-title="([^"]+)"[^>]*>\s*)'  # outer open
                r'(<\s*section\b[^>]*\bid="\2"[^>]*\bsection-title="\3"[^>]*>\s*)',
                re.IGNORECASE
            )
            close_tag = re.compile(r'</\s*section\s*>', re.IGNORECASE)
            while True:
                m = dup_open.search(s)
                if not m:
                    return s
                inner_open_start, inner_open_end = m.start(4), m.end(4)
                cm = close_tag.search(s, inner_open_end)
                if cm:
                    s = s[:cm.start()] + s[cm.end():]
                s = s[:inner_open_start] + s[inner_open_end:]
        return cleanup_nested_dupes(tmp)

    # First, add attributes to any existing sections to make them collapsible
    body_html = add_attrs_to_existing_sections(body_html)

    # Find all h2 occurrences with their positions
    sections = []
    for m in H2_PATTERN.finditer(body_html):
        sections.append((m.start(), m.end(), m.group(0), m.group(2)))

    # If no h2s, no change
    if not sections:
        return body_html

    # Precompute positions of <section and </section> to detect nesting
    open_positions = [m.start() for m in re.finditer(r"<\s*section\b", body_html, re.IGNORECASE)]
    close_positions = [m.start() for m in re.finditer(r"</\s*section\s*>", body_html, re.IGNORECASE)]

    def inside_section(index: int) -> bool:
        opens_before = bisect.bisect_left(open_positions, index)
        closes_before = bisect.bisect_left(close_positions, index)
        return (opens_before - closes_before) > 0

    result = []
    idx = 0
    for i, (start, end, h2_full, h2_inner) in enumerate(sections):
        # Append any content before the first h2 unchanged
        if i == 0:
            result.append(body_html[:start])
        # If this h2 is inside an existing section, do not wrap; just append content until next h2
        if inside_section(start):
            next_start = sections[i+1][0] if i+1 < len(sections) else len(body_html)
            result.append(body_html[start:next_start])
            idx = next_start
            continue
        # Determine the end of this section (start of next h2 or end of body)
        next_start = sections[i+1][0] if i+1 < len(sections) else len(body_html)
        segment = body_html[start:next_start]

        title_text = normalize_title(extract_title_text(h2_inner))
        sec_id = slugify(title_text)

        wrapped = f'<section id="{sec_id}" section-title="{title_text}">\n{segment}\n</section>'
        result.append(wrapped)

        idx = next_start

    # Append any remaining tail (should be none)
    if idx < len(body_html):
        result.append(body_html[idx:])

    final_html = ''.join(result)

    return final_html

def wrap_demos_with_section(body_html: str) -> str:
    # Wrap standalone demo containers/iframes not already in a section
    open_positions = [m.start() for m in re.finditer(r"<\s*section\b", body_html, re.IGNORECASE)]
    close_positions = [m.start() for m in re.finditer(r"</\s*section\s*>", body_html, re.IGNORECASE)]

    def inside_section(index: int) -> bool:
        opens_before = sum(1 for p in open_positions if p <= index)
        closes_before = sum(1 for p in close_positions if p <= index)
        return (opens_before - closes_before) > 0

    changed = False

    # Prefer wrapping the container
    result = []
    pos = 0
    pat_container = re.compile(r"<div\s+class=\"embeddedDemoContainer\"[^>]*>", re.IGNORECASE)
    while True:
        m = pat_container.search(body_html, pos)
        if not m:
            result.append(body_html[pos:])
            break
        start = m.start()
        if inside_section(start):
            result.append(body_html[pos:m.end()])
            pos = m.end()
            continue
        end_m = re.search(r"</\s*div\s*>", body_html[m.end():], re.IGNORECASE)
        if not end_m:
            result.append(body_html[pos:m.end()])
            pos = m.end()
            continue
        cont_end = m.end() + end_m.end()
        segment = body_html[start:cont_end]
        wrapped = f'<section id="demo" section-title="Interactive Demo">\n{segment}\n</section>'
        result.append(body_html[pos:start])
        result.append(wrapped)
        pos = cont_end
        changed = True
    new_html = ''.join(result)

    if changed:
        return new_html

    # Fallback: wrap raw iframe.embeddedDemo
    result = []
    pos = 0
    pat_iframe = re.compile(r"<iframe\b[^>]*class=\"embeddedDemo\"[^>]*>.*?</iframe>", re.IGNORECASE | re.DOTALL)
    while True:
        m = pat_iframe.search(new_html, pos)
        if not m:
            result.append(new_html[pos:])
            break
        start = m.start()
        if inside_section(start):
            result.append(new_html[pos:m.end()])
            pos = m.end()
            continue
        wrapped = f'<section id="demo" section-title="Interactive Demo">\n{new_html[m.start():m.end()]}\n</section>'
        result.append(new_html[pos:start])
        result.append(wrapped)
        pos = m.end()
        changed = True
    return ''.join(result)

def move_trailing_demos_out_of_sections(body_html: str) -> str:
    # If a demo container/iframe appears as trailing content of a section, move it into its own
    # <section id="demo" section-title="Interactive Demo"> placed immediately after that section.
    open_pat = re.compile(r"<\s*section\b([^>]*)>", re.IGNORECASE)
    close_pat = re.compile(r"</\s*section\s*>", re.IGNORECASE)
    demo_container_pat = re.compile(r"<div\s+class=\"embeddedDemoContainer\"[^>]*>.*?</div>\s*$", re.IGNORECASE | re.DOTALL)
    demo_iframe_pat = re.compile(r"<iframe\b[^>]*class=\"embeddedDemo\"[^>]*>.*?</iframe>\s*$", re.IGNORECASE | re.DOTALL)

    # Build section ranges with stack
    tokens = []
    for m in open_pat.finditer(body_html):
        tokens.append(('open', m.start(), m.end(), m.group(1) or ''))
    for m in close_pat.finditer(body_html):
        tokens.append(('close', m.start(), m.end(), ''))
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
            # locate content inside this section from oe to s (start of close tag)
            sections.append({'start': os, 'open_end': oe, 'content_start': oe, 'content_end': s, 'close_start': s, 'close_end': e, 'attrs': oattrs, 'depth': d})
            depth -= 1

    if not sections:
        return body_html

    body = body_html
    # Process from the end to keep indices valid
    for sec in sorted(sections, key=lambda x: x['start'], reverse=True):
        # Ignore top-level demo sections already
        if re.search(r"section-title\s*=\s*\"Interactive Demo\"", sec['attrs'], re.IGNORECASE):
            continue
        content = body[sec['content_start']:sec['close_start']]
        # Strip trailing whitespace
        trail = content.rstrip()
        trailing_part = content[len(trail):]  # spaces removed
        content = trail
        # Check if trailing content is exactly a demo container or iframe
        mcont = demo_container_pat.search(content)
        mifr = demo_iframe_pat.search(content)
        hit = mcont or mifr
        if not hit:
            continue
        demo_html = hit.group(0).strip()
        # Remove the demo_html from the end of the section's content
        new_content = content[:hit.start()].rstrip()
        # Rebuild the section without the trailing demo
        before = body[:sec['content_start']]
        after_close = body[sec['close_end']:]
        section_rebuilt = before + new_content + body[sec['close_start']:sec['close_end']]

        # Determine unique demo id
        desired_id = 'demo'
        used_ids = set(m.group(1) for m in re.finditer(r"\bid=\"([^\"]+)\"", body, re.IGNORECASE))
        demo_id = desired_id if desired_id not in used_ids else (desired_id + '-2')
        demo_section = f"\n<section id=\"{demo_id}\" section-title=\"Interactive Demo\">\n{demo_html}\n</section>\n"
        # Insert demo section after this section
        body = section_rebuilt + demo_section + after_close

    return body

def normalize_existing_sections(body_html: str) -> str:
    # Only ensure a section-title exists if readable; do not change ids or titles
    out = []
    pos = 0
    open_tag_pattern = re.compile(r"<\s*section\b([^>]*)>", re.IGNORECASE)
    while True:
        m = open_tag_pattern.search(body_html, pos)
        if not m:
            out.append(body_html[pos:])
            break
        out.append(body_html[pos:m.start()])
        attrs = m.group(1) or ''
        if not re.search(r"\b(section-title|data-section-title)\s*=", attrs, re.IGNORECASE):
            # Try to pull a heading right after
            end_tag = m.end()
            hm = re.search(r"<\s*h[1-6]\b[^>]*>(.*?)</\s*h[1-6]\s*>", body_html[end_tag:end_tag+500], re.IGNORECASE | re.DOTALL)
            if hm:
                label = extract_title_text(hm.group(1))
                attrs = attrs + f' section-title="{label}"'
        out.append(f"<section{attrs}>")
        pos = m.end()
    return ''.join(out)

def read_text_best_effort(path: str) -> str:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        # Fallback for legacy encodings
        with open(path, 'r', encoding='latin-1', errors='replace') as f:
            return f.read()

def write_text_utf8(path: str, text: str) -> None:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)

def flatten_canonical_sections(body_html: str) -> str:
    # Disabled: flattening is risky without a real HTML parser.
    return body_html

def process_file(path: str) -> bool:
    html = read_text_best_effort(path)

    m = BODY_PATTERN.search(html)
    if not m:
        return False
    open_body, body_inner, close_body = m.group(1), m.group(2), m.group(3)

    # Normalize any existing sections' attributes first (non-destructive)
    body_inner = normalize_existing_sections(body_inner)
    # Then wrap standalone demos so they get their own section
    body_inner = wrap_demos_with_section(body_inner)
    # Then move trailing demos out of non-demo sections into their own section
    body_inner = move_trailing_demos_out_of_sections(body_inner)
    # Then normalize H2 sections and existing sections
    body_inner = wrap_sections_in_body(body_inner)
    # Finally, (disabled) flattening step
    new_body_inner = flatten_canonical_sections(body_inner)
    if new_body_inner == body_inner:
        return False

    new_html = html[:m.start(2)] + new_body_inner + html[m.end(2):]
    write_text_utf8(path, new_html)
    return True

def main():
    changed = 0
    scanned = 0
    for root, dirs, files in os.walk(CONTENT_DIR):
        # Skip Problems directory and its subdirectories
        rel = os.path.relpath(root, CONTENT_DIR)
        parts = [] if rel == '.' else rel.split(os.sep)
        if parts and parts[0].lower() == 'problems':
            # Do not descend into Problems
            dirs[:] = []
            continue
        for fn in files:
            if not fn.lower().endswith('.html'):
                continue
            path = os.path.join(root, fn)
            scanned += 1
            if process_file(path):
                changed += 1
                print(f"Updated: {os.path.relpath(path, ROOT)}")
    print(f"Scanned {scanned} HTML files; updated {changed}.")

if __name__ == '__main__':
    sys.exit(main() or 0)
