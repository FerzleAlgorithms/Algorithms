#!/usr/bin/env python3
import os
import sys
import argparse
import difflib

# Reuse logic from add_collapsible_sections.py without writing
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(ROOT, 'scripts'))
import add_collapsible_sections as acs  # type: ignore

def rel(path: str) -> str:
    return os.path.relpath(path, ROOT)

def write_text(path: str, text: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)

def collect_targets(inputs: list[str]) -> list[str]:
    if not inputs:
        return acs.iter_target_files(None, only_draft=False)
    out: list[str] = []
    for p in inputs:
        ap = p if os.path.isabs(p) else os.path.join(ROOT, p)
        if os.path.isdir(ap):
            for r, _d, files in os.walk(ap):
                for fn in files:
                    if fn.lower().endswith('.html'):
                        out.append(os.path.join(r, fn))
        else:
            out.append(ap)
    # de-dup and sort
    seen = set()
    uniq = []
    for t in out:
        if t not in seen:
            seen.add(t)
            uniq.append(t)
    return sorted(uniq)

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description='Generate unified diffs for proposed collapsible-section updates.')
    parser.add_argument('--out-dir', default=os.path.join(ROOT, 'ProposedDiffs'), help='Directory to write .diff files into (mirror tree).')
    parser.add_argument('paths', nargs='*', help='Files or directories to diff. Defaults to all Content/.')
    args = parser.parse_args(argv)

    targets = collect_targets(args.paths)
    if not targets:
        print('No targets found.')
        return 0

    created = 0
    for path in targets:
        new_html, old_html = acs.compute_transformed_html(path)
        if new_html is None:
            continue
        relp = rel(path)
        diff = difflib.unified_diff(
            old_html.splitlines(keepends=True),
            new_html.splitlines(keepends=True),
            fromfile=f"a/{relp}",
            tofile=f"b/{relp}",
            n=3,
        )
        diff_text = ''.join(diff)
        out_path = os.path.join(args.out_dir, relp) + '.diff'
        write_text(out_path, diff_text)
        created += 1
        print(f"Wrote diff: {os.path.relpath(out_path, ROOT)}")

    print(f"Generated diffs for {created} file(s). Output root: {os.path.relpath(args.out_dir, ROOT)}")
    return 0

if __name__ == '__main__':
    raise SystemExit(main())

