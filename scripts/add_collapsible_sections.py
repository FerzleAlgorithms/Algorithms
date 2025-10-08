#!/usr/bin/env python3
import os
import re
import bisect
import sys
import argparse
import difflib
from html import unescape

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
        # Detect id for special-casing demo sections
        id_m = re.search(r"\bid=\"([^\"]+)\"", attrs, re.IGNORECASE)
        section_id = (id_m.group(1) if id_m else '').lower()
        # If already has section-title or data-section-title, leave as is
        if re.search(r"\b(section-title|data-section-title)\s*=", attrs, re.IGNORECASE):
            out.append(m.group(0))
            pos = m.end()
            continue
        # Find end of this section to limit heading search
        close_m = close_tag_pattern.search(body_html, m.end())
        section_end = close_m.start() if close_m else len(body_html)
        content_after = body_html[m.end():section_end]
        # Special case: demo sections should be titled as Interactive Demo
        if section_id.startswith('demo'):
            title_text = 'Interactive Demo'
        else:
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
    # Always ensure existing <section> tags have attributes first
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

    # Cleanup simple nested duplicate open/close if they arose
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

    return cleanup_nested_dupes(final_html)

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
        # Also treat id="demo*" as demo sections
        if re.search(r'\bid\s*=\s*"demo[^"]*"', sec['attrs'], re.IGNORECASE):
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

def cleanup_empty_and_dedupe_demo_sections(body_html: str) -> str:
    # Remove completely empty sections (only whitespace inside)
    open_pat = re.compile(r"<\s*section\b([^>]*)>", re.IGNORECASE)
    close_pat = re.compile(r"</\s*section\s*>", re.IGNORECASE)
    parts = []
    pos = 0
    changed = False
    while True:
        m = open_pat.search(body_html, pos)
        if not m:
            parts.append(body_html[pos:])
            break
        parts.append(body_html[pos:m.start()])
        attrs = m.group(1) or ''
        cm = close_pat.search(body_html, m.end())
        if not cm:
            # Malformed; append rest and break
            parts.append(body_html[m.start():])
            pos = len(body_html)
            break
        inner = body_html[m.end():cm.start()]
        if inner.strip() == '':
            # Drop this empty section
            changed = True
            pos = cm.end()
            continue
        # Keep as-is
        parts.append(body_html[m.start():cm.end()])
        pos = cm.end()
    s = ''.join(parts)
    # If there is a demo-2 but no demo, rename demo-2 to demo
    if re.search(r"<\s*section\b[^>]*\bid=\"demo-2\"", s, re.IGNORECASE) and not re.search(r"<\s*section\b[^>]*\bid=\"demo\"", s, re.IGNORECASE):
        s = re.sub(r"(\bid=\")demo-2(\")", r"\1demo\2", s, flags=re.IGNORECASE)
    return s

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
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)

def flatten_canonical_sections(body_html: str) -> str:
    # Disabled: flattening is risky without a real HTML parser.
    return body_html

def compute_transformed_html(path: str):
    """Return (new_html or None, original_html). If no body or no change, returns (None, original_html)."""
    html = read_text_best_effort(path)

    m = BODY_PATTERN.search(html)
    if not m:
        return None, html
    open_body, body_inner, close_body = m.group(1), m.group(2), m.group(3)
    original_body_inner = body_inner

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
    # Cleanup pass for empty sections and demo dedupe
    new_body_inner = cleanup_empty_and_dedupe_demo_sections(new_body_inner)
    # Compare against the original unmodified body content to detect any change
    if new_body_inner == original_body_inner:
        return None, html

    new_html = html[:m.start(2)] + new_body_inner + html[m.end(2):]
    return new_html, html

def _strip_visible_text(s: str) -> str:
    # Drop scripts/styles; remove tags; unescape entities; collapse whitespace
    s = re.sub(r'<script[\s\S]*?</script>', '', s, flags=re.IGNORECASE)
    s = re.sub(r'<style[\s\S]*?</style>', '', s, flags=re.IGNORECASE)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = unescape(s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def process_file(path: str, *, dry_run: bool = False, output_dir: str | None = None, verify_text: bool = False) -> tuple[bool, str]:
    """
    Process a single HTML file.
    - If dry_run: returns (would_change, diff_text)
    - If output_dir is provided: writes changed file to that directory preserving structure
    - Else: writes in place
    """
    new_html, old_html = compute_transformed_html(path)
    if new_html is None:
        return False, ""
    if dry_run:
        rel = os.path.relpath(path, ROOT)
        diff = difflib.unified_diff(
            old_html.splitlines(keepends=True),
            new_html.splitlines(keepends=True),
            fromfile=f"a/{rel}",
            tofile=f"b/{rel}",
            n=3,
        )
        return True, "".join(diff)
    if verify_text:
        old_txt = _strip_visible_text(old_html)
        new_txt = _strip_visible_text(new_html)
        if old_txt != new_txt:
            rel = os.path.relpath(path, ROOT)
            return True, f"[verify_text FAILED] Visible text changed for {rel}. No write performed."
    # Write output
    if output_dir:
        abs_out = os.path.join(output_dir, os.path.relpath(path, ROOT))
        write_text_utf8(abs_out, new_html)
    else:
        write_text_utf8(path, new_html)
    return True, ""

def iter_target_files(files: list[str] | None, only_draft: bool) -> list[str]:
    targets: list[str] = []
    if files:
        for p in files:
            ap = p if os.path.isabs(p) else os.path.join(ROOT, p)
            if os.path.isdir(ap):
                for r, _dirs, fns in os.walk(ap):
                    for fn in fns:
                        if fn.lower().endswith('.html'):
                            targets.append(os.path.join(r, fn))
            else:
                targets.append(ap)
    else:
        for r, dirs, fns in os.walk(CONTENT_DIR):
            # Skip Problems directory and its subdirectories
            rel = os.path.relpath(r, CONTENT_DIR)
            parts = [] if rel == '.' else rel.split(os.sep)
            if parts and parts[0].lower() == 'problems':
                dirs[:] = []
                continue
            for fn in fns:
                if fn.lower().endswith('.html'):
                    targets.append(os.path.join(r, fn))
    # Filter drafts if requested
    if only_draft:
        targets = [p for p in targets if 'draft' in os.path.basename(p).lower()]
    # De-dup and sort for stable order
    seen = set()
    uniq: list[str] = []
    for t in targets:
        if t not in seen:
            seen.add(t)
            uniq.append(t)
    return sorted(uniq)

def main(argv: list[str] | None = None):
    parser = argparse.ArgumentParser(description='Add collapsible sections to HTML content with safe review options.')
    parser.add_argument('--dry-run', action='store_true', help='Do not write files; print unified diffs for changes.')
    parser.add_argument('--only-draft', action='store_true', help='Process only files with DRAFT in filename.')
    parser.add_argument('--output-dir', help='Write changed files to this directory instead of in-place.')
    parser.add_argument('--verify-text', action='store_true', help='Abort write if visible text content would change.')
    parser.add_argument('paths', nargs='*', help='Optional files or directories to process. Defaults to Content/.')
    args = parser.parse_args(argv)

    targets = iter_target_files(args.paths, args.only_draft)
    if not targets:
        print('No target files found.')
        return 0

    changed = 0
    scanned = 0
    for path in targets:
        scanned += 1
        would_change, payload = process_file(path, dry_run=args.dry_run, output_dir=args.output_dir, verify_text=args.verify_text)
        rel = os.path.relpath(path, ROOT)
        if args.dry_run:
            if would_change:
                changed += 1
                print(f"--- Proposed changes for {rel} ---")
                sys.stdout.write(payload)
                if not payload.endswith('\n'):
                    print()
                print(f"--- End of changes for {rel} ---\n")
        else:
            if would_change:
                if payload.startswith('[verify_text FAILED]'):
                    print(payload)
                else:
                    changed += 1
                    dst = os.path.join(args.output_dir, rel) if args.output_dir else rel
                    print(f"Updated: {dst}")

    summary_target = f"{len(targets)} file(s)" if not args.only_draft else f"{len(targets)} DRAFT file(s)"
    if args.dry_run:
        print(f"Scanned {summary_target}; {changed} would change.")
    else:
        print(f"Scanned {summary_target}; updated {changed}.")

if __name__ == '__main__':
    sys.exit(main() or 0)
