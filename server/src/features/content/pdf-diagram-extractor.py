#!/usr/bin/env python3
"""
Automated PDF Diagram & Chemical Structure Extractor for TooPrep.
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

def extract_diagrams(pdf_path, output_dir, dpi=300, min_size=15):
    os.makedirs(output_dir, exist_ok=True)
    doc = pymupdf.open(pdf_path)
    
    diagrams_by_q = {}
    
    # Process all pages that contain exam questions
    for pno in range(len(doc)):
        page = doc[pno]
        pw, ph = page.rect.width, page.rect.height
        words = page.get_text('words')
        if not words:
            continue

        # 1. Detect question headers: Q.1, Q.2, etc.
        q_words = []
        for w in words:
            m = re.match(r'^Q\.(\d+)$', w[4])
            if m:
                q_words.append({
                    'q': int(m.group(1)),
                    'x0': w[0], 'y0': w[1], 'x1': w[2], 'y1': w[3]
                })

        # If no questions on this page, skip
        if not q_words:
            continue

        # Multi-column detection (JEE papers standardly 2 columns)
        is_two_col = any(q['x0'] > 250 for q in q_words)
        col_split = 295.0 if is_two_col else pw

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

        # Also check raster images on page
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

        # 4. Cluster nearby drawings into diagram envelopes
        clusters = []
        for r in candidate_rects:
            merged = False
            for c in clusters:
                exp = pymupdf.Rect(c.x0 - 12, c.y0 - 12, c.x1 + 12, c.y1 + 12)
                if exp.intersects(r):
                    c.include_rect(r)
                    merged = True
                    break
            if not merged:
                clusters.append(pymupdf.Rect(r))

        # Iteratively merge overlapping/adjacent clusters
        changed = True
        while changed:
            changed = False
            new_c = []
            while clusters:
                curr = clusters.pop(0)
                merged = False
                for other in clusters:
                    exp = pymupdf.Rect(curr.x0 - 12, curr.y0 - 12, curr.x1 + 12, curr.y1 + 12)
                    if exp.intersects(other):
                        other.include_rect(curr)
                        merged = True
                        changed = True
                        break
                if not merged:
                    new_c.append(curr)
            clusters = new_c

        # Filter out flat fraction lines and small symbols
        valid_diagrams = []
        for c in clusters:
            if c.width < min_size or c.height < min_size:
                continue
            # Expand to encapsulate touching chemical/symbol text words (e.g. Br, CH3, OH, R1, C1)
            expanded = pymupdf.Rect(c)
            for w in words:
                if (c.x0 - 8 <= w[0] and w[2] <= c.x1 + 8 and
                    c.y0 - 8 <= w[1] and w[3] <= c.y1 + 8):
                    expanded.include_rect(pymupdf.Rect(w[0], w[1], w[2], w[3]))
            valid_diagrams.append(expanded)

        # 5. Define column boundaries
        columns = [
            {'x0': 30, 'x1': col_split},
            {'x0': col_split, 'x1': pw - 20}
        ] if is_two_col else [{'x0': 30, 'x1': pw - 20}]

        for col in columns:
            col_qs = [q for q in q_words if col['x0'] <= q['x0'] < col['x1']]
            col_qs.sort(key=lambda x: x['y0'])

            for i, q in enumerate(col_qs):
                q_num = q['q']
                top_y = q['y0'] - 6
                bot_y = col_qs[i + 1]['y0'] - 6 if i + 1 < len(col_qs) else ph - 30

                # Options belonging to this question
                q_opts = [o for o in opt_words if col['x0'] <= o['x0'] < col['x1'] and top_y <= o['y0'] < bot_y]
                q_opts.sort(key=lambda x: (x['y0'], x['x0']))
                first_opt_y = min([o['y0'] for o in q_opts]) if q_opts else bot_y

                # Find all diagrams situated inside this question's vertical and horizontal envelope
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

                # Group stem diagrams vs option diagrams:
                # In every exam question, the stem diagram is placed strictly before the options (d.y1 <= first_opt_y + 1).
                # Option diagrams extend at or below the option markers (d.y1 > first_opt_y + 1).
                stem_diags = [d for d in q_diags if d.y1 <= first_opt_y + 1]
                opt_diags = [d for d in q_diags if d.y1 > first_opt_y + 1]

                # Merge all stem diagrams for this question into a single composite stem bbox
                if stem_diags:
                    composite_stem = pymupdf.Rect(stem_diags[0])
                    for sd in stem_diags[1:]:
                        composite_stem.include_rect(sd)
                    # Also include any text words inside or between the stem drawings (reaction reagents, arrows)
                    for w in words:
                        if (composite_stem.x0 - 5 <= w[0] and w[2] <= composite_stem.x1 + 5 and
                            composite_stem.y0 - 5 <= w[1] and w[3] <= composite_stem.y1 + 5 and
                            w[3] < first_opt_y - 4):
                            composite_stem.include_rect(pymupdf.Rect(w[0], w[1], w[2], w[3]))

                    # Crop and save stem diagram
                    stem_crop_rect = pymupdf.Rect(
                        max(0, composite_stem.x0 - 6),
                        max(0, composite_stem.y0 - 6),
                        min(pw, composite_stem.x1 + 6),
                        min(ph, composite_stem.y1 + 6)
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

                # Map option diagrams to closest option marker
                for od in opt_diags:
                    if not q_opts:
                        continue
                    # Find closest option marker using Euclidean distance
                    best_opt = min(q_opts, key=lambda o: math.hypot(od.x0 - o['x0'], od.y0 - o['y0']))
                    opt_key = best_opt['opt']

                    # Expand slightly
                    opt_crop_rect = pymupdf.Rect(
                        max(0, od.x0 - 6),
                        max(0, od.y0 - 6),
                        min(pw, od.x1 + 6),
                        min(ph, od.y1 + 6)
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

    # Clean up empty entries
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
