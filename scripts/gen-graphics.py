"""Fineme 視覚言語の素材生成（等高線・経緯線グリッド・羅針盤）。
線の色は currentColor ではなく stroke をSVG内で固定し、CSS側では opacity で強さを調整する。"""
import math, random, pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'assets' / 'graphics'
OUT.mkdir(parents=True, exist_ok=True)

def height_field(W, H, seed):
    rnd = random.Random(seed)
    n = min(22, max(7, int(7 * (W * H) / (800 * 480))))
    base = 800 * 0.3
    hills = [(rnd.uniform(0, W), rnd.uniform(0, H), rnd.uniform(0.6, 1.4) * base, rnd.uniform(-1, 1.4)) for _ in range(n)]
    def h(x, y):
        v = 0.0
        for cx, cy, r, a in hills:
            d2 = ((x - cx) ** 2 + (y - cy) ** 2) / (r * r)
            v += a * math.exp(-d2)
        v += 0.12 * math.sin(x / 800 * 5.1 + 0.7) * math.cos(y / 480 * 3.3)
        return v
    return h

def marching(h, W, H, step, level):
    nx, ny = int(W / step) + 1, int(H / step) + 1
    g = [[h(i * step, j * step) for i in range(nx)] for j in range(ny)]
    segs = []
    def interp(p1, p2, v1, v2):
        t = (level - v1) / (v2 - v1) if v2 != v1 else 0.5
        return (p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t)
    for j in range(ny - 1):
        for i in range(nx - 1):
            x, y = i * step, j * step
            c = [(x, y), (x + step, y), (x + step, y + step), (x, y + step)]
            v = [g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i]]
            idx = sum(1 << k for k in range(4) if v[k] > level)
            if idx in (0, 15):
                continue
            edges = []
            for k in range(4):
                a, b = k, (k + 1) % 4
                if (v[a] > level) != (v[b] > level):
                    edges.append(interp(c[a], c[b], v[a], v[b]))
            if len(edges) == 2:
                segs.append((edges[0], edges[1]))
            elif len(edges) == 4:
                segs.append((edges[0], edges[1])); segs.append((edges[2], edges[3]))
    return segs

def join(segs, eps=0.01):
    key = lambda p: (round(p[0], 2), round(p[1], 2))
    adj = {}
    for a, b in segs:
        adj.setdefault(key(a), []).append((a, b)); adj.setdefault(key(b), []).append((b, a))
    used = set(); lines = []
    for s in segs:
        if id(s) in used:
            continue
        used.add(id(s)); line = [s[0], s[1]]
        for end in (1, 0):
            while True:
                p = line[-1] if end else line[0]
                nxt = None
                for a, b in adj.get(key(p), []):
                    for cand in segs_index.get((key(a), key(b)), []):
                        if id(cand) not in used:
                            nxt = (cand, b); break
                    if nxt: break
                if not nxt: break
                used.add(id(nxt[0]))
                if end: line.append(nxt[1])
                else: line.insert(0, nxt[1])
        lines.append(line)
    return lines

def rdp(pts, eps):
    if len(pts) < 3: return pts
    (x1,y1),(x2,y2)=pts[0],pts[-1]; dx,dy=x2-x1,y2-y1; L=(dx*dx+dy*dy)**0.5 or 1e-9
    dmax,idx=0,0
    for i,(x,y) in enumerate(pts[1:-1],1):
        d=abs(dy*x-dx*y+x2*y1-y2*x1)/L
        if d>dmax: dmax,idx=d,i
    if dmax>eps: return rdp(pts[:idx+1],eps)[:-1]+rdp(pts[idx:],eps)
    return [pts[0],pts[-1]]

def chaikin(pts, n=2):
    for _ in range(n):
        out = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            out.append((0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]))
            out.append((0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]))
        out.append(pts[-1]); pts = out
    return pts

def contour_svg(name, W, H, seed, levels, color, width=1.0, majors_every=5):
    global segs_index
    h = height_field(W, H, seed)
    paths = []
    for li, lv in enumerate(levels):
        segs = marching(h, W, H, 8, lv)
        segs_index = {}
        for s in segs:
            segs_index.setdefault((tuple(round(c, 2) for c in s[0]), tuple(round(c, 2) for c in s[1])), []).append(s)
            segs_index.setdefault((tuple(round(c, 2) for c in s[1]), tuple(round(c, 2) for c in s[0])), []).append(s)
        for line in join(segs):
            if len(line) < 4:
                continue
            pts = rdp(chaikin(rdp(line, 0.8), 3), 0.25)
            d = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts)
            major = li % majors_every == 0
            op = 0.9 if major else 0.5
            sw = width * (1.4 if major else 1)
            paths.append(f'<path d="{d}" stroke-opacity="{op}" stroke-width="{sw:.2f}"/>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice" '
           f'fill="none" stroke="{color}" stroke-linecap="round" stroke-linejoin="round">' + ''.join(paths) + '</svg>')
    (OUT / name).write_text(svg)
    return len(paths)

levels = [-0.6 + 0.12 * i for i in range(18)]
print('contour', contour_svg('contour-ink.svg', 1600, 900, 11, levels, '#ece8df'))
print('contour belle', contour_svg('contour-belle.svg', 1600, 900, 29, levels, '#e6b3c4'))
print('contour sm', contour_svg('contour-card.svg', 800, 480, 5, levels, '#ece8df'))

# 経緯線グリッド（海図の目盛り）
def graticule(W=160, H=160):
    ticks = ''.join(f'<line x1="{x}" y1="0" x2="{x}" y2="4"/>' for x in range(0, W + 1, 16))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" fill="none" stroke="#ece8df">'
            f'<path d="M0 0.5H{W}M0.5 0V{H}" stroke-opacity="0.5"/>'
            f'<g stroke-opacity="0.35">{ticks}</g>'
            f'<circle cx="0.5" cy="0.5" r="1.5" fill="#ece8df" stroke="none" fill-opacity="0.6"/></svg>')
(OUT / 'graticule.svg').write_text(graticule())

# 羅針盤（線画）
def compass(color='#ece8df', accent='#c8a45a'):
    R = 160; c = 170
    ticks = []
    for d in range(0, 360, 5):
        a = math.radians(d); l = 12 if d % 45 == 0 else (7 if d % 15 == 0 else 4)
        x1, y1 = c + R * math.sin(a), c - R * math.cos(a)
        x2, y2 = c + (R - l) * math.sin(a), c - (R - l) * math.cos(a)
        ticks.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 340" fill="none" stroke="{color}" stroke-width="1">'
            f'<circle cx="{c}" cy="{c}" r="{R}" stroke-opacity="0.35"/><circle cx="{c}" cy="{c}" r="{R-20}" stroke-opacity="0.18"/>'
            f'<circle cx="{c}" cy="{c}" r="58" stroke-opacity="0.18"/>'
            f'<g stroke-opacity="0.4">{"".join(ticks)}</g>'
            f'<path d="M{c} 44 L{c+14} {c} L{c} 296 L{c-14} {c} Z" stroke-opacity="0.9"/>'
            f'<path d="M{c} 44 L{c+14} {c} L{c-14} {c} Z" fill="{accent}" stroke="none"/>'
            f'<path d="M44 {c} L{c} {c-9} L296 {c} L{c} {c+9} Z" stroke-opacity="0.45"/>'
            f'<circle cx="{c}" cy="{c}" r="3.5" fill="{color}" stroke="none"/>'
            f'<text x="{c}" y="30" fill="{color}" fill-opacity="0.7" stroke="none" font-family="serif" font-size="14" text-anchor="middle">北</text></svg>')
(OUT / 'compass.svg').write_text(compass())
(OUT / 'compass-belle.svg').write_text(compass(accent='#d9a1b4'))
for f in sorted(OUT.iterdir()):
    print(f.name, f.stat().st_size)
