"""Génère les icônes de l'app (PNG pour la PWA, ICO pour l'installateur Windows).

    python tools/make_icons.py icons

Aucune dépendance : le PNG et l'ICO sont écrits à la main.
"""
import math
import os
import struct
import sys
import zlib

BG = (0x2C, 0x6B, 0x4C)      # vert accent
FG = (0xF2, 0xF5, 0xEE)      # crème

# tracé du crochet, en coordonnées normalisées 0..1
CHECK = [(0.235, 0.520), (0.420, 0.705), (0.780, 0.295)]
HALFW = 0.078


def seg_dist(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    L2 = vx * vx + vy * vy
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, (wx * vx + wy * vy) / L2))
    dx, dy = wx - t * vx, wy - t * vy
    return math.sqrt(dx * dx + dy * dy)


def render(size, scale=1.0, alpha=False):
    """Lignes d'image brutes. scale rétrécit le crochet (zone sûre maskable)."""
    cx = cy = 0.5
    pts = [(cx + (x - cx) * scale, cy + (y - cy) * scale) for x, y in CHECK]
    hw = HALFW * scale
    aa = 1.0 / size  # largeur d'un pixel, pour l'anticrénelage

    rows = []
    for j in range(size):
        py = (j + 0.5) / size
        row = bytearray()
        for i in range(size):
            px = (i + 0.5) / size
            d = min(
                seg_dist(px, py, pts[0][0], pts[0][1], pts[1][0], pts[1][1]),
                seg_dist(px, py, pts[1][0], pts[1][1], pts[2][0], pts[2][1]),
            ) - hw
            cov = max(0.0, min(1.0, 0.5 - d / aa))
            for k in range(3):
                row.append(int(round(BG[k] + (FG[k] - BG[k]) * cov)))
            if alpha:
                row.append(255)
        rows.append(bytes(row))
    return rows


def png_bytes(size, rows, alpha=False):
    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    color_type = 6 if alpha else 2
    out = b"\x89PNG\r\n\x1a\n"
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, color_type, 0, 0, 0))
    out += chunk(b"IDAT", zlib.compress(raw, 9))
    out += chunk(b"IEND", b"")
    return out


def write_png(path, size, scale=1.0):
    data = png_bytes(size, render(size, scale), alpha=False)
    with open(path, "wb") as f:
        f.write(data)
    return len(data)


def write_ico(path, sizes):
    """ICO contenant des PNG 32 bits (format accepté depuis Windows Vista)."""
    images = [png_bytes(s, render(s, 1.0, alpha=True), alpha=True) for s in sizes]
    offset = 6 + 16 * len(images)
    header = struct.pack("<HHH", 0, 1, len(images))
    entries = b""
    for s, img in zip(sizes, images):
        dim = 0 if s >= 256 else s          # 0 signifie 256 dans le format ICO
        entries += struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32, len(img), offset)
        offset += len(img)
    data = header + entries + b"".join(images)
    with open(path, "wb") as f:
        f.write(data)
    return len(data)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "icons"
    os.makedirs(out, exist_ok=True)

    for name, size, scale in [
        ("icon-512.png", 512, 1.0),
        ("icon-192.png", 192, 1.0),
        ("apple-touch-icon.png", 180, 1.0),
        ("icon-maskable-512.png", 512, 0.68),
    ]:
        n = write_png(os.path.join(out, name), size, scale)
        print("%-26s %4dpx  %7d octets" % (name, size, n))

    sizes = [16, 24, 32, 48, 64, 128, 256]
    n = write_ico(os.path.join(out, "app.ico"), sizes)
    print("%-26s %-8s %7d octets" % ("app.ico", ",".join(map(str, sizes)), n))


if __name__ == "__main__":
    main()
