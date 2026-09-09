import os
import sys
import json
import argparse
import math
import re
import pymupdf

def is_noise_rect(r, page_w, page_h, is_two_col=True):
    if r.width > page_w - 40 and r.height > page_h - 40:
        return True
    if r.height <= 2.5 and r.width > 100:
        return True
    if r.width <= 2.5 and r.height > 100:
        return True
    if is_two_col and r.width > 180 and r.height < 25:
        return True
    if r.width < 2.5 and r.height < 2.5:
        return True
    return False

def merge_clusters(rects, gap=16):
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
                exp = pymupdf.Rect(
                    current.x0 - gap, current.y0 - gap,
                    current.x1 + gap, current.y1 + gap
                )
                if exp.intersects(clusters[j]):
                    current.include_rect(clusters[j])
                    merged[j] = True
                    changed = True
            result.append(current)
        clusters = result
    return clusters

_Q_WORD_RE = re.compile(r'^(?:\*\*)?(?:Q|Question)\.?\s*(\d+)\.?(?:\*\*)?$', re.I)

def detect_q_words(words):
    q_words = []
    i = 0
    while i < len(words):
        w = words[i]
        raw = w[4].strip()
        m = _Q_WORD_RE.match(raw)
        if m:
            q_words.append({'q': int(m.group(1)), 'x0': w[0], 'y0': w[1], 'x1': w[2], 'y1': w[3]})
            i += 1
            continue
        if raw.upper() in ('Q.', 'Q', '**Q.**', '**Q**', 'QUESTION') and i + 1 < len(words):
            nxt = words[i + 1]
            nxt_raw = nxt[4].strip().rstrip('.')
            if nxt_raw.isdigit() and abs(nxt[1] - w[1]) < 5:
                q_words.append({
                    'q': int(nxt_raw),
                    'x0': w[0], 'y0': w[1],
                    'x1': nxt[2], 'y1': nxt[3]
                })
                i += 2
                continue
        i += 1
    return q_words

def detect_opt_words(words):
    opt_words = []
    opt_map = {'1': 'A', '2': 'B', '3': 'C', '4': 'D'}
    for i, w in enumerate(words):
        prev_w = words[i - 1][4].lower() if i > 0 else ''
        if 'ans' in prev_w or 'sol' in prev_w:
            continue
        m = re.match(r'^(?:\(([A-Da-d1-4])\)|\[([A-Da-d1-4])\]|\b([A-Da-d1-4])\.\s*)$', w[4].strip())
        if m:
            raw_val = (m.group(1) or m.group(2) or m.group(3)).upper()
            opt_key = opt_map.get(raw_val, raw_val)
            opt_words.append({
                'opt': opt_key,
                'raw': raw_val,
                'x0': w[0], 'y0': w[1], 'x1': w[2], 'y1': w[3]
            })
    return opt_words

def extract_diagrams(pdf_path, output_dir, dpi=300, min_size=15):
    os.makedirs(output_dir, exist_ok=True)
    doc = pymupdf.open(pdf_path)
    diagrams_by_q = {}

    section_offset = 0
    current_max_q = 0
    seen_sections = set()

    for pno in range(len(doc)):
        page = doc[pno]
        pw, ph = page.rect.width, page.rect.height
        words = page.get_text('words')
        if not words:
            continue

        # Section Tracking
        page_header = " ".join([w[4] for w in words[:35]]).upper()
        if ('CHEMISTRY' in page_header or 'PART B' in page_header or 'PART-B' in page_header) and 'CHEM' not in seen_sections:
            seen_sections.add('CHEM')
            if current_max_q > 0 and current_max_q <= 35:
                section_offset = max(section_offset, current_max_q)
            elif section_offset == 0:
                section_offset = 30
        elif ('MATHEMATICS' in page_header or 'PART C' in page_header or 'PART-C' in page_header or 'MATHS' in page_header) and 'MATH' not in seen_sections:
            seen_sections.add('MATH')
            if current_max_q > 0 and current_max_q <= 65:
                section_offset = max(section_offset, current_max_q)
            elif section_offset <= 30:
                section_offset = 60

        q_words = detect_q_words(words)
        if not q_words:
            continue

        is_two_col = any(q['x0'] > pw * 0.45 for q in q_words)
        col_split = pw / 2.0 if is_two_col else pw

        opt_words = detect_opt_words(words)

        # Candidate vector drawings & images
        drawings = page.get_drawings()
        candidate_rects = []
        for d in drawings:
            r = pymupdf.Rect(d['rect'])
            if not is_noise_rect(r, pw, ph, is_two_col) and (r.width > 2 or r.height > 2):
                candidate_rects.append(r)

        for img in page.get_images():
            try:
                for r in page.get_image_rects(img[0]):
                    if not is_noise_rect(r, pw, ph, is_two_col) and (r.width > 8 and r.height > 8):
                        candidate_rects.append(r)
            except Exception:
                pass

        if not candidate_rects:
            continue

        columns = (
            [{'x0': 30, 'x1': col_split}, {'x0': col_split, 'x1': pw - 20}]
            if is_two_col else [{'x0': 30, 'x1': pw - 20}]
        )

        for col in columns:
            col_qs = [q for q in q_words if col['x0'] <= q['x0'] < col['x1']]
            col_qs.sort(key=lambda x: x['y0'])

            for i, q in enumerate(col_qs):
                raw_q = q['q']
                # Dynamic section jump check
                if raw_q <= 5 and current_max_q >= 15 and raw_q < (current_max_q - 10):
                    section_offset += current_max_q
                    current_max_q = raw_q

                if raw_q > current_max_q:
                    current_max_q = raw_q

                global_q_num = raw_q if raw_q > 30 else (raw_q + section_offset)

                top_y = q['y0'] - 6
                bot_y = col_qs[i + 1]['y0'] - 6 if i + 1 < len(col_qs) else ph - 30

                # Cut off at solutions or answer keys
                sol_y = bot_y
                for w in words:
                    if col['x0'] <= w[0] < col['x1'] and top_y <= w[1] < bot_y:
                        txt = w[4].lower()
                        if txt in ('ans.', 'sol.', 'solution:', 'ans') or 'students' in txt:
                            sol_y = min(sol_y, w[1] - 4)

                q_opts = [o for o in opt_words if col['x0'] <= o['x0'] < col['x1'] and top_y <= o['y0'] < sol_y]
                q_opts.sort(key=lambda x: (x['y0'], x['x0']))
                first_opt_y = min([o['y0'] for o in q_opts]) if q_opts else sol_y

                q_rects = [r for r in candidate_rects if col['x0'] - 15 <= r.x0 and r.x1 <= col['x1'] + 15 and top_y <= (r.y0 + r.y1) / 2 < sol_y]
                if not q_rects:
                    continue

                if global_q_num not in diagrams_by_q:
                    diagrams_by_q[global_q_num] = {'stem': None, 'options': {}}

                # 1. Stem Diagrams (before first option)
                stem_rects = [r for r in q_rects if r.y1 <= first_opt_y + 2]
                if stem_rects:
                    stem_clusters = merge_clusters(stem_rects, gap=16)
                    valid_stem = [c for c in stem_clusters if c.width >= min_size or c.height >= min_size]
                    if valid_stem:
                        comp_stem = pymupdf.Rect(valid_stem[0])
                        for sd in valid_stem[1:]:
                            comp_stem.include_rect(sd)
                        # Expand to include text words inside stem drawing
                        for w in words:
                            if (col['x0'] <= w[0] < col['x1'] and
                                    comp_stem.x0 - 14 <= w[0] and w[2] <= comp_stem.x1 + 14 and
                                    comp_stem.y0 - 14 <= w[1] and w[3] <= comp_stem.y1 + 14 and
                                    w[3] < first_opt_y - 2):
                                comp_stem.include_rect(pymupdf.Rect(w[0], w[1], w[2], w[3]))

                        stem_crop_rect = pymupdf.Rect(
                            max(0, comp_stem.x0 - 12),
                            max(0, comp_stem.y0 - 12),
                            min(pw, comp_stem.x1 + 12),
                            min(ph, comp_stem.y1 + 12)
                        )
                        pix = page.get_pixmap(clip=stem_crop_rect, dpi=dpi)
                        stem_filename = f'q{global_q_num}_stem.png'
                        stem_path = os.path.join(output_dir, stem_filename)
                        pix.save(stem_path)
                        diagrams_by_q[global_q_num]['stem'] = {
                            'filename': stem_filename,
                            'path': os.path.abspath(stem_path),
                            'page': pno + 1,
                            'width': round(stem_crop_rect.width, 1),
                            'height': round(stem_crop_rect.height, 1)
                        }

                # 2. Option Diagrams
                opt_cand_rects = [r for r in q_rects if r.y1 > first_opt_y + 2]
                if q_opts and opt_cand_rects:
                    opt_rects_map = {o['opt']: [] for o in q_opts}
                    for r in opt_cand_rects:
                        r_mid_x = (r.x0 + r.x1) / 2
                        r_mid_y = (r.y0 + r.y1) / 2
                        best_opt = min(q_opts, key=lambda o: math.hypot(r_mid_x - o['x0'], (r_mid_y - o['y0']) * 2))
                        opt_rects_map[best_opt['opt']].append(r)

                    for opt_key, r_list in opt_rects_map.items():
                        if not r_list:
                            continue
                        opt_clusters = merge_clusters(r_list, gap=16)
                        valid_opt_c = [c for c in opt_clusters if c.width >= 8 and c.height >= 8]
                        if not valid_opt_c:
                            continue
                        comp_opt = pymupdf.Rect(valid_opt_c[0])
                        for oc in valid_opt_c[1:]:
                            comp_opt.include_rect(oc)

                        # Include adjacent chemical text labels
                        for w in words:
                            if (col['x0'] <= w[0] < col['x1'] and
                                    comp_opt.x0 - 10 <= w[0] and w[2] <= comp_opt.x1 + 10 and
                                    comp_opt.y0 - 10 <= w[1] and w[3] <= comp_opt.y1 + 10 and
                                    w[1] >= first_opt_y - 2 and w[3] <= sol_y + 2):
                                # Do not include option markers
                                if not re.match(r'^(?:\([A-Da-d1-4]\)|\[[A-Da-d1-4]\])$', w[4].strip()):
                                    comp_opt.include_rect(pymupdf.Rect(w[0], w[1], w[2], w[3]))

                        opt_crop_rect = pymupdf.Rect(
                            max(0, comp_opt.x0 - 10),
                            max(0, comp_opt.y0 - 10),
                            min(pw, comp_opt.x1 + 10),
                            min(ph, comp_opt.y1 + 10)
                        )
                        pix = page.get_pixmap(clip=opt_crop_rect, dpi=dpi)
                        opt_filename = f'q{global_q_num}_opt_{opt_key}.png'
                        opt_path = os.path.join(output_dir, opt_filename)
                        pix.save(opt_path)
                        diagrams_by_q[global_q_num]['options'][opt_key] = {
                            'filename': opt_filename,
                            'path': os.path.abspath(opt_path),
                            'page': pno + 1,
                            'width': round(opt_crop_rect.width, 1),
                            'height': round(opt_crop_rect.height, 1)
                        }

    clean_diagrams = {k: v for k, v in diagrams_by_q.items() if v['stem'] or (v['options'] and len(v['options']) > 0)}
    return clean_diagrams

def main():
    parser = argparse.ArgumentParser(description='Extract diagrams and figures from exam PDF.')
    parser.add_argument('pdf_path', help='Absolute path to PDF')
    parser.add_argument('--output-dir', default='public/uploads/questions', help='Directory to save cropped PNGs')
    parser.add_argument('--dpi', type=int, default=300, help='Render DPI (default: 300)')
    parser.add_argument('--min-size', type=int, default=12, help='Minimum diagram size in points')
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

