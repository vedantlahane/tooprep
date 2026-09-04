"""
TooPrep - PDF Page Renderer and Diagram Cropper
Uses PyMuPDF (pymupdf) for fast, pixel-perfect rendering and vector diagram cropping.
"""

import sys
import os
import json
import base64

try:
    import pymupdf
except ImportError:
    try:
        import fitz as pymupdf
    except ImportError:
        print(json.dumps({"error": "pymupdf is not installed in Python environment"}))
        sys.exit(1)


def render_page(pdf_path, page_num, output_path=None, dpi=150):
    """
    Renders a 1-indexed page of a PDF to PNG.
    If output_path is provided, writes to file.
    Otherwise, prints base64 PNG data to stdout.
    """
    doc = pymupdf.open(pdf_path)
    page_idx = int(page_num) - 1
    if page_idx < 0 or page_idx >= len(doc):
        raise ValueError(f"Page {page_num} out of bounds (1..{len(doc)})")

    page = doc[page_idx]
    pix = page.get_pixmap(dpi=int(dpi))
    png_bytes = pix.tobytes("png")

    if output_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(png_bytes)
        return {"success": True, "output_path": output_path, "bytes": len(png_bytes)}
    else:
        b64 = base64.b64encode(png_bytes).decode("ascii")
        return {"success": True, "data_url": f"data:image/png;base64,{b64}", "bytes": len(png_bytes)}


def crop_rect(pdf_path, page_num, output_path, x0, y0, x1, y1, dpi=300):
    """
    Crops a rectangular region [x0, y0, x1, y1] on page_num (points, 72 pt/in)
    and saves as a crisp, high-res PNG.
    """
    doc = pymupdf.open(pdf_path)
    page_idx = int(page_num) - 1
    if page_idx < 0 or page_idx >= len(doc):
        raise ValueError(f"Page {page_num} out of bounds (1..{len(doc)})")

    page = doc[page_idx]
    rect = pymupdf.Rect(float(x0), float(y0), float(x1), float(y1))
    pix = page.get_pixmap(clip=rect, dpi=int(dpi))
    png_bytes = pix.tobytes("png")

    if output_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(png_bytes)
        return {"success": True, "output_path": output_path, "bytes": len(png_bytes)}
    else:
        b64 = base64.b64encode(png_bytes).decode("ascii")
        return {"success": True, "data_url": f"data:image/png;base64,{b64}", "bytes": len(png_bytes)}


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Insufficient arguments"}))
        sys.exit(1)

    command = sys.argv[1]

    try:
        if command == "render_page":
            pdf_path = sys.argv[2]
            page_num = int(sys.argv[3])
            output_path = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != "-" else None
            dpi = int(sys.argv[5]) if len(sys.argv) > 5 else 150
            res = render_page(pdf_path, page_num, output_path, dpi)
            print(json.dumps(res))

        elif command == "crop_rect":
            pdf_path = sys.argv[2]
            page_num = int(sys.argv[3])
            output_path = sys.argv[4] if sys.argv[4] != "-" else None
            x0 = float(sys.argv[5])
            y0 = float(sys.argv[6])
            x1 = float(sys.argv[7])
            y1 = float(sys.argv[8])
            dpi = int(sys.argv[9]) if len(sys.argv) > 9 else 300
            res = crop_rect(pdf_path, page_num, output_path, x0, y0, x1, y1, dpi)
            print(json.dumps(res))

        else:
            print(json.dumps({"error": f"Unknown command {command}"}))
            sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
