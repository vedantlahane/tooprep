#!/usr/bin/env python3
"""
TooPrep - PDF Diagram & Chemical Structure Extractor.
Analyzes layout geometry, isolates vector graphics and embedded raster images,
clusters them by question/option boundaries, and renders 300 DPI cropped PNGs.
"""

import os
import sys
import json
import argparse
import math
import re
import pymupdf


def is_noise_rect(r, page_w, page_h, is_two_col=True):
    """Filters out borders, rules, section banners, dividers, and sub-pixel artifacts."""
    # Full page margin / border
    if r.width > page_w - 40 and r.height > page_h - 40:
        return True
    # Long thin horizontal rule (header / footer / question divider)
    if r.height <= 2.5 and r.width > 120:
        return True
    # Long thin vertical rule (column divider)
    if r.width <= 2.5 and r.height > 120:
        return True
    # Column-spanning divider banner (e.g. PART B - CHEMISTRY / PART C - MATHEMATICS)
    if is_two_col and r.width > 190 and r.height < 25:
        return True
    # Trivial sub-pixel or tiny dots
    if r.width < 2.5 and r.height < 2.5:
        return True
    return False


def merge_clusters(rects, gap=24):
    """
    BUG 9 FIX: O(n log n) single-pass greedy cluster merge that always terminates.
    Sort by x0 then y0; greedily expand each cluster by any rect that intersects its
    expanded bounding box. Repeat until no merges happen (bounded by n passes).
    """
    if not rects:
        return []

    clusters = [pymupdf.Rect(r) for r in rects]

    changed = True
    while changed:
        changed = False
        merged = [False] * len(clusters)
        result = []

        for i in range(len(clusters)):
            if merged[i]:
                continue
            current = pymupdf.Rect(clusters[i])
            for j in range(i + 1, len(clusters)):
                if merged[j]:
                    continue
                # Expand current cluster by gap on all sides before testing intersection
                exp = pymupdf.Rect(
                    current.x0 - gap,
                    current.y0 - gap,
                    current.x1 + gap,
                    current.y1 + gap
                )
                if exp.intersects(clusters[j]):
                    current.include_rect(clusters[j])
                    merged[j] = True
                    changed = True
            result.append(current)

        clusters = result

    return clusters


# BUG 10 FIX: Broader Q header patterns to match LlamaParse output variants:
#   Q.1, Q. 1, Q1, **Q.1**, **Q. 1**, Q.1., Q 1
_Q_WORD_RE = re.compile(
    r'^Q\.?\s*(\d+)\.?$',   # bare word: Q.1, Q1, Q.1.
)
_Q_BOLD_RE = re.compile(
    r'^\*\*Q\.?\s*(\d+)\.?\*\*$'  # bold: **Q.1**, **Q. 1**
)


def detect_q_words(words):
    """
    BUG 10 FIX: Extract question number markers from page word list.
    Handles Q.1, Q. 1, Q1, **Q.1**, **Q. 1** and space-separated "Q" + "1" adjacent words.
    Returns list of dicts with keys: q, x0, y0, x1, y1.
    """
    q_words = []
    i = 0
    while i < len(words):
        w = words[i]
        raw = w[4].strip()

        # Single-word forms: Q.1, Q1, **Q.1**
        m = _Q_WORD_RE.match(raw) or _Q_BOLD_RE.match(raw)
        if m:
            q_words.append({'q': int(m.group(1)), 'x0': w[0], 'y0': w[1], 'x1': w[2], 'y1': w[3]})
            i += 1
            continue

        # Two-word form: word "Q." or "Q" immediately followed by a digit word on the same line
        # e.g. words[i]="Q." words[i+1]="1"
        if raw in ('Q.', 'Q', '**Q.**', '**Q**') and i + 1 < len(words):
            nxt = words[i + 1]
            nxt_raw = nxt[4].strip().rstrip('.')
            if nxt_raw.isdigit() and abs(nxt[1] - w[1]) < 4:  # same line (y within 4pt)
                q_words.append({
                    'q': int(nxt_raw),
                    'x0': w[0], 'y0': w[1],
                    'x1': nxt[2], 'y1': nxt[3]
                })
                i += 2
                continue

        i += 1

    return q_words


def extract_diagrams(pdf_path, output_dir, dpi=300, min_size=15):
    os.makedirs(output_dir, exist_ok=True)
    doc = pymupdf.open(pdf_path)

    diagrams_by_q = {}

    for pno in range(len(doc)):
        page = doc[pno]
        pw, ph = page.rect.width, page.rect.height
        words = page.get_text('words')
        if not words:
            continue

        # BUG 10 FIX: Use the improved Q-header detector
        q_words = detect_q_words(words)

        if not q_words:
            continue

        # BUG 11 FIX: Derive column split from actual page width rather than hard-coding 295.0.
        # Use pw/2 as the split point. Two-column layout is confirmed if any Q header
        # appears in the right half of the page (x0 > pw * 0.45).
        is_two_col = any(q['x0'] > pw * 0.45 for q in q_words)
        col_split = pw / 2.0 if is_two_col else pw

        # 2. Detect option markers: (A), (B), (C), (D)
        opt_words = []
        for w in words:
            m = re.match(r'^\(([A-D])\)$', w[4])
            if m:
                opt_words.append({
                    'opt': m.group(1),
                    'x0': w[0], 'y0': w[1], 'x1': w[2], 'y1': w[3]
                })

        # 3. Extract all candidate drawings and raster images
        drawings = page.get_drawings()
        candidate_rects = []
        for d in drawings:
            r = pymupdf.Rect(d['rect'])
            if not is_noise_rect(r, pw, ph, is_two_col) and (r.width > 2 or r.height > 2):
                candidate_rects.append(r)

        for img in page.get_images():
            try:
                rects = page.get_image_rects(img[0])
                for r in rects:
                    if not is_noise_rect(r, pw, ph, is_two_col) and (r.width > 8 and r.height > 8):
                        candidate_rects.append(r)
            except Exception:
                pass

        if not candidate_rects:
            continue

        # BUG 9 FIX: Use the O(n²)-worst-but-bounded merge_clusters function
        # that always terminates. The old while/pop loop could cycle indefinitely.
        clusters = merge_clusters(candidate_rects, gap=24)

        # Filter out flat fraction lines and small symbols, expand to encapsulate touching text
        valid_diagrams = []
        for c in clusters:
            if c.width < min_size or c.height < min_size:
                continue
            expanded = pymupdf.Rect(c)
            for w in words:
                if (c.x0 - 18 <= w[0] and w[2] <= c.x1 + 18 and
                        c.y0 - 18 <= w[1] and w[3] <= c.y1 + 18):
                    expanded.include_rect(pymupdf.Rect(w[0], w[1], w[2], w[3]))
            valid_diagrams.append(expanded)

        # 5. Define column boundaries
        columns = (
            [{'x0': 30, 'x1': col_split}, {'x0': col_split, 'x1': pw - 20}]
            if is_two_col
            else [{'x0': 30, 'x1': pw - 20}]
        )

        for col in columns:
            col_qs = [q for q in q_words if col['x0'] <= q['x0'] < col['x1']]
            col_qs.sort(key=lambda x: x['y0'])

            for i, q in enumerate(col_qs):
                q_num = q['q']
                top_y = q['y0'] - 6
                bot_y = col_qs[i + 1]['y0'] - 6 if i + 1 < len(col_qs) else ph - 30

                q_opts = [o for o in opt_words if col['x0'] <= o['x0'] < col['x1'] and top_y <= o['y0'] < bot_y]
                q_opts.sort(key=lambda x: (x['y0'], x['x0']))
                first_opt_y = min([o['y0'] for o in q_opts]) if q_opts else bot_y

                q_diags = []
                for diag in valid_diagrams:
                    if col['x0'] - 15 <= diag.x0 and diag.x1 <= col['x1'] + 15:
                        diag_mid_y = (diag.y0 + diag.y1) / 2
                        if top_y <= diag_mid_y < bot_y:
                            q_diags.append(diag)

                if not q_diags:
                    continue

                if q_num not in diagrams_by_q:
                    diagrams_by_q[q_num] = {'stem': None, 'options': {}}

                # Stem diagrams: placed before the first option marker
                stem_diags = [d for d in q_diags if d.y1 <= first_opt_y + 1]
                opt_diags = [d for d in q_diags if d.y1 > first_opt_y + 1]

                if stem_diags:
                    composite_stem = pymupdf.Rect(stem_diags[0])
                    for sd in stem_diags[1:]:
                        composite_stem.include_rect(sd)
                    # Also include text words between the stem drawings (reagents, arrows, conditions)
                    for w in words:
                        if (composite_stem.x0 - 14 <= w[0] and w[2] <= composite_stem.x1 + 14 and
                                composite_stem.y0 - 14 <= w[1] and w[3] <= composite_stem.y1 + 14 and
                                w[3] < first_opt_y - 4):
                            composite_stem.include_rect(pymupdf.Rect(w[0], w[1], w[2], w[3]))

                    stem_crop_rect = pymupdf.Rect(
                        max(0, composite_stem.x0 - 14),
                        max(0, composite_stem.y0 - 14),
                        min(pw, composite_stem.x1 + 14),
                        min(ph, composite_stem.y1 + 14)
                    )
                    pix = page.get_pixmap(clip=stem_crop_rect, dpi=dpi)
                    stem_filename = f'q{q_num}_stem.png'
                    stem_path = os.path.join(output_dir, stem_filename)
                    pix.save(stem_path)

                    diagrams_by_q[q_num]['stem'] = {
                        'filename': stem_filename,
                        'path': os.path.abspath(stem_path),
                        'page': pno + 1,
                        'width': round(stem_crop_rect.width, 1),
                        'height': round(stem_crop_rect.height, 1)
                    }

                # Option diagrams: group by nearest option marker
                if opt_diags and q_opts:
                    opt_groups = {o['opt']: [] for o in q_opts}
                    for od in opt_diags:
                        best_opt = min(q_opts, key=lambda o: math.hypot(od.x0 - o['x0'], od.y0 - o['y0']))
                        opt_groups[best_opt['opt']].append(od)

                    for opt_key, o_diags in opt_groups.items():
                        if not o_diags:
                            continue
                        comp_opt = pymupdf.Rect(o_diags[0])
                        for od in o_diags[1:]:
                            comp_opt.include_rect(od)

                        # Include adjacent chemical text labels for this option
                        for w in words:
                            if (comp_opt.x0 - 10 <= w[0] and w[2] <= comp_opt.x1 + 10 and
                                    comp_opt.y0 - 10 <= w[1] and w[3] <= comp_opt.y1 + 10 and
                                    w[1] >= first_opt_y - 2 and w[3] <= bot_y + 2):
                                if not re.match(r'^\([A-D]\)$', w[4]):
                                    comp_opt.include_rect(pymupdf.Rect(w[0], w[1], w[2], w[3]))

                        opt_crop_rect = pymupdf.Rect(
                            max(0, comp_opt.x0 - 12),
                            max(0, comp_opt.y0 - 12),
                            min(pw, comp_opt.x1 + 12),
                            min(ph, comp_opt.y1 + 12)
                        )
                        pix = page.get_pixmap(clip=opt_crop_rect, dpi=dpi)
                        opt_filename = f'q{q_num}_opt_{opt_key}.png'
                        opt_path = os.path.join(output_dir, opt_filename)
                        pix.save(opt_path)

                        diagrams_by_q[q_num]['options'][opt_key] = {
                            'filename': opt_filename,
                            'path': os.path.abspath(opt_path),
                            'page': pno + 1,
                            'width': round(opt_crop_rect.width, 1),
                            'height': round(opt_crop_rect.height, 1)
                        }

    clean_diagrams = {k: v for k, v in diagrams_by_q.items() if v['stem'] or v['options']}
    return clean_diagrams


def main():
    parser = argparse.ArgumentParser(description='Extract diagrams and figures from exam PDF.')
    parser.add_argument('pdf_path', help='Absolute path to PDF')
    parser.add_argument('--output-dir', default='public/uploads/questions', help='Directory to save cropped PNGs')
    parser.add_argument('--dpi', type=int, default=300, help='Render DPI (default: 300)')
    parser.add_argument('--min-size', type=int, default=15, help='Minimum diagram size in points')
    args = parser.parse_args()

    if not os.path.exists(args.pdf_path):
        print(json.dumps({'success': False, 'error': f'PDF not found: {args.pdf_path}'}))
        sys.exit(1)

    try:
        diagrams = extract_diagrams(args.pdf_path, args.output_dir, dpi=args.dpi, min_size=args.min_size)
        print(json.dumps({
            'success': True,
            'pdf': args.pdf_path,
            'total_questions_with_diagrams': len(diagrams),
            'diagrams': diagrams
        }, indent=2))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
