#!/usr/bin/env python3
"""Stseeni protseduurtekstuuride generaator (NumPy ja Pillow).

Käivita: python3 tooriistad/loo_tekstuurid.py
Väljund: varad/tekstuurid/. Pilte ei laadita võrgust ega kopeerita fotodelt.
Peatumiskiri joonistatakse kohaliku ladina kirjamärgistikku toetava fondiga."""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ASUKOHT = os.path.dirname(os.path.abspath(__file__))
VALJUND = os.path.join(ASUKOHT, '..', 'varad', 'tekstuurid')
os.makedirs(VALJUND, exist_ok=True)
FONDI_KANDIDAADID = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    'C:/Windows/Fonts/arialbd.ttf',
]


def juhu(seed):
    return np.random.default_rng(seed)


def vaartusmura(h, w, cy, cx, r):
    """Õmblusteta väärtusmüra 0..1 sujuva interpolatsiooniga."""
    cy = max(1, int(cy)); cx = max(1, int(cx))
    g = r.random((cy, cx)).astype(np.float32)
    y = np.arange(h, dtype=np.float32) * cy / h
    x = np.arange(w, dtype=np.float32) * cx / w
    y0 = np.floor(y).astype(int); x0 = np.floor(x).astype(int)
    fy = y - y0; fx = x - x0
    fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
    y1 = (y0 + 1) % cy; x1 = (x0 + 1) % cx; y0 %= cy; x0 %= cx
    a = g[y0][:, x0]; b = g[y0][:, x1]; c = g[y1][:, x0]; d = g[y1][:, x1]
    fx = fx[None, :]; fy = fy[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(h, w, cy, cx, r, octaves=4, pers=0.5):
    t = np.zeros((h, w), np.float32); amp = 1.0; n = 0.0
    for o in range(octaves):
        t += vaartusmura(h, w, cy * 2 ** o, cx * 2 ** o, r) * amp
        n += amp; amp *= pers
    return t / n


def blur(a, r=1, passes=2):
    """Tsükliline karpfiltriga hägustus."""
    a = a.astype(np.float32)
    for _ in range(passes):
        acc = np.zeros_like(a)
        for d in range(-r, r + 1):
            acc += np.roll(a, d, axis=0)
        a = acc / (2 * r + 1)
        acc = np.zeros_like(a)
        for d in range(-r, r + 1):
            acc += np.roll(a, d, axis=1)
        a = acc / (2 * r + 1)
    return a


def to8(a):
    return np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)


def save(arr, name, quality=90):
    path = os.path.join(VALJUND, name)
    if arr.ndim == 2:
        im = Image.fromarray(to8(arr), 'L')
    elif arr.shape[2] == 3:
        im = Image.fromarray(to8(arr), 'RGB')
    else:
        im = Image.fromarray(to8(arr), 'RGBA')
    if name.endswith('.jpg'):
        im.convert('RGB').save(path, quality=quality)
    else:
        im.save(path, optimize=True)
    print('  ', name, im.size)


def taidaLabipaistvad(rgb, a):
    """Läbipaistvate pikslite all olev värv täidetakse, et vähendatud tekstuuril ei tekiks tumedat serva."""
    m = (a > 0.5).astype(np.float32)
    col = rgb * m[..., None]
    cb = np.stack([blur(col[..., i], 3, 3) for i in range(3)], -1)
    wb = blur(m, 3, 3)
    fill = cb / np.maximum(wb[..., None], 1e-4)
    mean = (rgb * m[..., None]).sum((0, 1)) / max(m.sum(), 1)
    fill = np.where(wb[..., None] > 1e-3, fill, mean)
    return np.where(m[..., None] > 0, rgb, fill)


def leiaFont(size):
    for p in FONDI_KANDIDAADID:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return None


def joonistaServadega(S, fn):
    """Joonistamine üle pildiservade õmblusteta tekstuuri jaoks."""
    for ox in (-S, 0, S):
        for oy in (-S, 0, S):
            fn(ox, oy)


# Tekstuurirühm.

def looAsfalt():
    r = juhu(1); S = 512
    v = 0.31 + (fbm(S, S, 3, 3, r, 5) - 0.5) * 0.09
    v += (fbm(S, S, 24, 24, r, 2) - 0.5) * 0.05
    v += (r.random((S, S)) - 0.5) * 0.08
    sp = r.random((S, S))
    v = np.where(sp > 0.972, v + 0.08 + r.random((S, S)) * 0.10, v)
    v = np.where(sp < 0.025, v - 0.07, v)
    v = 0.55 * v + 0.45 * blur(v, 1, 1)
    img = Image.new('L', (S, S), 0); d = ImageDraw.Draw(img)
    for k in range(5):
        x, y = r.random() * S, r.random() * S; ang = r.random() * math.tau
        pts = [(x, y)]
        for i in range(int(30 + r.random() * 70)):
            ang += (r.random() - 0.5) * 1.0; x += math.cos(ang) * 4; y += math.sin(ang) * 4
            pts.append((x, y))
        wdt = 1 if k % 2 else 2
        joonistaServadega(S, lambda ox, oy: d.line([(px + ox, py + oy) for px, py in pts], fill=255, width=wdt))
    crack = np.asarray(img, np.float32) / 255
    v -= blur(crack, 1, 1) * 0.06 + crack * 0.06
    rgb = np.stack([v * 0.985, v, v * 1.03], -1)
    save(rgb, 'asfalt.jpg')


def looTeekulumine():
    r = juhu(2); W, H = 128, 512  # x risti teed, y piki teed (16 m).
    u = (np.arange(W) + 0.5) / W
    tracks = np.exp(-((u - 0.30) / 0.08) ** 2) + np.exp(-((u - 0.70) / 0.08) ** 2)
    edge = np.clip((0.12 - u) / 0.12, 0, 1) ** 1.4 + np.clip((u - 0.88) / 0.12, 0, 1) ** 1.4
    n = fbm(H, W, 16, 3, r, 4)
    a = tracks[None, :] * (0.07 + 0.12 * n) + edge[None, :] * (0.10 + 0.16 * n)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    for i in range(16):
        cx = (0.5 + (r.random() - 0.5) * 0.22) * W; cy = r.random() * H; rad = 1.5 + r.random() * 3.5
        dy = np.minimum(np.abs(yy - cy), H - np.abs(yy - cy))
        a += np.clip(1 - np.hypot(xx - cx, dy * 0.6) / rad, 0, 1) * 0.30
    a = np.clip(a, 0, 0.55)
    rgba = np.zeros((H, W, 4), np.float32); rgba[..., 0:3] = 0.06; rgba[..., 3] = a
    save(rgba, 'tee_kulumine.png')


def looVarvijoon():
    r = juhu(3); W, H = 32, 256
    n = fbm(H, W, 8, 2, r, 5)
    a = np.clip(0.95 - np.clip(n - 0.52, 0, 1) * 3.2, 0.12, 1.0)
    a = np.where(r.random((H, W)) < 0.04, a * 0.35, a)
    x = (np.arange(W) + 0.5) / W
    a *= np.clip(np.minimum(x, 1 - x) * 7, 0, 1)[None, :]
    col = 0.86 + (r.random((H, W)) - 0.5) * 0.06
    save(np.stack([col, col, col * 0.97, a], -1), 'varvijoon.png')


def looPeatumiskiri():
    W = H = 512
    font = leiaFont(155)
    img = Image.new('L', (660, 240), 0); d = ImageDraw.Draw(img)
    if font:
        d.text((330, 122), 'PEATU', font=font, fill=255, anchor='mm')
    else:
        d.rectangle([20, 60, 640, 180], fill=255)
    img = img.resize((W, H), Image.BILINEAR)
    a = np.asarray(img, np.float32) / 255
    r = juhu(4); n = fbm(H, W, 6, 6, r, 5)
    a *= np.clip(1.2 - np.clip(n - 0.5, 0, 1) * 2.6, 0.2, 1)
    rgba = np.zeros((H, W, 4), np.float32); rgba[..., 0:3] = 0.88; rgba[..., 3] = a
    save(rgba, 'peatu.png')


def looTellis():
    r = juhu(5); S = 512
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    bw = S / 10.0; bh = S / 20.0          # 20 × 10 cm tellised 2 × 2 m paanis.
    row = np.floor(yy / bh); off = (row % 2) * bw * 0.5
    col = np.floor((xx + off) / bw) % 10
    lx = (xx + off) % bw; ly = yy % bh
    bid = (row * 10 + col).astype(int)
    pal = np.array([[0.50, 0.29, 0.23], [0.45, 0.26, 0.21], [0.56, 0.34, 0.26], [0.43, 0.31, 0.27],
                    [0.37, 0.22, 0.19], [0.52, 0.37, 0.30], [0.47, 0.30, 0.25]], np.float32)
    pick = r.integers(0, len(pal), 400)
    jit = 0.90 + r.random(400) * 0.2
    base = pal[pick[bid]] * jit[bid][..., None]
    ed = np.minimum(np.minimum(lx, bw - lx), np.minimum(ly, bh - ly))
    base *= (0.80 + 0.20 * np.clip(ed / 4.0, 0, 1))[..., None]
    base *= (0.93 + (r.random((S, S)) - 0.5) * 0.10)[..., None]
    dirt = fbm(S, S, 4, 4, r, 5)
    base *= (0.78 + 0.26 * dirt)[..., None]
    grout = (lx < 2.2) | (ly < 2.2)
    g = np.array([0.24, 0.22, 0.21], np.float32) * (0.9 + 0.2 * dirt[..., None])
    rgb = np.where(grout[..., None], g, base)
    save(rgb, 'tellis.jpg')


def looPargiplaat():
    r = juhu(6); S = 512; t = 32; band = 64   # 4 × 4 m moodul, 25 cm plaat ja 50 cm tume riba.
    yy, xx = np.mgrid[0:S, 0:S]
    in_band = (xx < band) | (yy < band)
    tid = (yy // t) * 16 + (xx // t)
    rnd = r.random(256)
    v = np.where(in_band, 0.36 + (rnd[tid] - 0.5) * 0.07, 0.78 + (rnd[tid] - 0.5) * 0.07)
    grout = ((xx % t) < 1.5) | ((yy % t) < 1.5)
    v = np.where(grout, np.where(in_band, 0.25, 0.56), v)
    v = v + (r.random((S, S)) - 0.5) * 0.03
    dirt = fbm(S, S, 4, 4, r, 5)
    v *= 0.84 + 0.18 * dirt
    save(np.stack([v * 0.985, v, v * 0.975], -1), 'pargiplaat.jpg')


def looGraniit():
    r = juhu(7); S = 256
    v = 0.47 + (fbm(S, S, 4, 4, r, 4) - 0.5) * 0.08 + (r.random((S, S)) - 0.5) * 0.10
    sp = r.random((S, S))
    v = np.where(sp > 0.93, v + 0.14, v); v = np.where(sp < 0.08, v - 0.14, v)
    v = 0.6 * v + 0.4 * blur(v, 1, 1)
    save(np.stack([v, v, v * 0.98], -1), 'graniit.jpg')


def looBetoon():
    r = juhu(8); S = 256
    v = 0.55 + (fbm(S, S, 3, 3, r, 5) - 0.5) * 0.10 + (r.random((S, S)) - 0.5) * 0.04
    pits = r.random((S, S)) < 0.01
    v = np.where(pits, v - 0.08, v)
    save(np.stack([v * 1.0, v, v * 0.97], -1), 'betoon.jpg')


# Tekstuurirühm.

def streaks(S, r, n, dark, maxlen=0.6, wmin=2, wmax=7, top=True):
    a = np.zeros((S, S), np.float32)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    for i in range(n):
        x = r.random() * S; y0 = (r.random() * 0.3 if top else r.random()) * S
        ln = (0.08 + r.random() * maxlen) * S; w = wmin + r.random() * (wmax - wmin)
        dx = np.minimum(np.abs(xx - x), S - np.abs(xx - x))
        prof = np.clip(1 - dx / w, 0, 1)
        t = (yy - y0) / ln
        along = np.where((t >= 0) & (t <= 1), np.clip(1 - t, 0, 1) ** 1.3, 0)
        a += prof * along * dark * (0.5 + r.random())
    return a


def looH1Betoon():
    """H1 hallikasbeež betoon või krohv; paan 3,0 × 2,9 m ehk üks korrus."""
    r = juhu(9); S = 512
    v = 0.60 + (fbm(S, S, 3, 3, r, 5) - 0.5) * 0.07 + (r.random((S, S)) - 0.5) * 0.035
    v -= streaks(S, r, 7, 0.035, 0.5)
    yy, xx = np.mgrid[0:S, 0:S]
    v = np.where(yy < 3, 0.43, v)                       # Korruste vuuk.
    v = np.where((yy >= 3) & (yy < 5), v + 0.04, v)
    v = np.where(xx < 2, v - 0.07, v)                   # Postide vuuk.
    for i in range(6):
        for j in range(3):
            cx = 40 + i * 86; cy = 80 + j * 150
            v = np.where((xx - cx) ** 2 + (yy - cy) ** 2 < 5, v - 0.05, v)
    rgb = np.stack([v * 1.03, v * 1.0, v * 0.92], -1)
    save(rgb, 'betoon_h1.jpg')


def looH2Betoon():
    """H2 hele betoon; paan 3 × 3 m."""
    r = juhu(10); S = 512
    v = 0.80 + (fbm(S, S, 3, 3, r, 5) - 0.5) * 0.05 + (r.random((S, S)) - 0.5) * 0.02
    v -= streaks(S, r, 5, 0.03, 0.4)
    yy, xx = np.mgrid[0:S, 0:S]
    v = np.where((xx % 256) < 1, v - 0.04, v)
    rgb = np.stack([v * 0.985, v * 1.0, v * 0.975], -1)
    save(rgb, 'betoon_h2.jpg')


def looBeezPlaat():
    r = juhu(11); S = 256; t = 16
    yy, xx = np.mgrid[0:S, 0:S]
    tid = (yy // t) * (S // t) + (xx // t)
    rnd = r.random((S // t) ** 2)
    v = 0.66 + (rnd[tid] - 0.5) * 0.10
    grout = ((xx % t) < 1.5) | ((yy % t) < 1.5)
    v = np.where(grout, 0.55, v)
    v *= 0.9 + 0.12 * fbm(S, S, 3, 3, r, 4)
    save(np.stack([v * 1.06, v * 0.98, v * 0.84], -1), 'beez_plaat.jpg')


def looMustus():
    """Mittekorduv fassaadi määrdumiskaart teise UV-komplekti jaoks."""
    r = juhu(12); S = 256
    y = (np.arange(S) + 0.5) / S                      # 0 on pildi ülaserv.
    g = np.ones((S, S), np.float32)
    g -= (np.clip((y - 0.86) / 0.14, 0, 1) ** 1.6 * 0.42)[:, None]
    g -= (np.clip((0.06 - y) / 0.06, 0, 1) * 0.10)[:, None]
    g -= streaks(S, r, 40, 0.10, 0.45, 1, 5, top=False)
    g -= (fbm(S, S, 3, 3, r, 4) - 0.5) * 0.16
    g = np.clip(g, 0.35, 1.0)
    save(g, 'mustus.png')


def window_cell(kind, r, C=128):
    """Aknaatlase üks lahter: tagastab värvi ja helenduse."""
    yy, xx = np.mgrid[0:C, 0:C].astype(np.float32) / C
    rgb = np.zeros((C, C, 3), np.float32); em = np.zeros((C, C, 3), np.float32)
    n = fbm(C, C, 4, 4, r, 3)
    if kind in ('sky', 'dark', 'sky2'):
        top = np.array([0.40, 0.45, 0.50]) if kind != 'dark' else np.array([0.16, 0.18, 0.20])
        bot = np.array([0.17, 0.19, 0.22]) if kind != 'dark' else np.array([0.07, 0.08, 0.09])
        t = yy[..., None]
        rgb = top * (1 - t) + bot * t
        band = np.exp(-((xx + yy * 0.6 - (0.75 if kind == 'sky2' else 0.55)) / 0.10) ** 2)
        rgb += band[..., None] * (0.10 if kind != 'dark' else 0.05)
    elif kind in ('curtain', 'curtain_lit', 'curtain_blue', 'curtain_white', 'half'):
        colr = {'curtain': [0.55, 0.53, 0.48], 'curtain_lit': [0.95, 0.72, 0.42],
                'curtain_blue': [0.42, 0.48, 0.55], 'curtain_white': [0.68, 0.68, 0.65], 'half': [0.60, 0.58, 0.52]}[kind]
        folds = 0.82 + 0.18 * np.sin(xx * 46 + n * 3)
        rgb = np.array(colr)[None, None, :] * folds[..., None]
        gap = np.abs(xx - 0.5) < 0.012
        rgb[gap] *= 0.35
        if kind == 'curtain_lit':
            glow = (0.65 + 0.35 * (1 - np.abs(yy - 0.45))) * folds
            em = np.array([1.0, 0.66, 0.32])[None, None, :] * glow[..., None]
        if kind == 'half':
            lit = xx > 0.52
            room = np.array([0.90, 0.68, 0.40]) * (0.85 + 0.15 * n[..., None])
            rgb = np.where(lit[..., None], room, rgb)
            em = np.where(lit[..., None], np.array([1.0, 0.70, 0.36]) * 0.85, 0)
    elif kind == 'room':
        rgb = np.array([0.86, 0.64, 0.38]) * (0.8 + 0.2 * n[..., None])
        lamp = np.exp(-(((xx - 0.38) / 0.12) ** 2 + ((yy - 0.18) / 0.06) ** 2))
        rgb += lamp[..., None] * 0.3
        furn = (yy > 0.68) & ((xx < 0.30) | ((xx > 0.55) & (xx < 0.80)))
        rgb[furn] = [0.20, 0.15, 0.12]
        em = rgb * 0.95; em[furn] = 0.0
    elif kind in ('blinds', 'blinds_lit'):
        sl = 0.75 + 0.25 * ((yy * 22) % 1.0 > 0.18)
        base = np.array([0.62, 0.63, 0.61]) if kind == 'blinds' else np.array([0.95, 0.84, 0.62])
        rgb = base * sl[..., None]
        if kind == 'blinds_lit':
            em = np.array([1.0, 0.82, 0.55]) * sl[..., None] * 0.85
    elif kind in ('frosted', 'frosted_lit'):
        base = np.array([0.56, 0.60, 0.60]) if kind == 'frosted' else np.array([0.80, 0.86, 0.84])
        rgb = base * (0.9 + 0.1 * n[..., None])
        if kind == 'frosted_lit':
            em = rgb * 0.55
    elif kind == 'tv':
        rgb = np.array([0.30, 0.38, 0.55]) * (0.8 + 0.2 * n[..., None])
        em = np.array([0.35, 0.48, 0.80]) * (0.6 + 0.4 * n[..., None])
    # Raam.
    f = 0.055
    frame = (xx < f) | (xx > 1 - f) | (yy < f) | (yy > 1 - f)
    mull = np.abs(xx - 0.5) < 0.022 if kind in ('sky', 'dark', 'sky2', 'frosted', 'frosted_lit', 'room') else np.zeros_like(frame)
    fcol = np.array([0.50, 0.51, 0.52]) if r.random() > 0.4 else np.array([0.26, 0.26, 0.27])
    rgb = np.where((frame | mull)[..., None], fcol, rgb)
    em = np.where((frame | mull)[..., None], 0.0, em)
    sill = yy > 1 - f * 0.6
    rgb[sill] = [0.62, 0.62, 0.60]
    return rgb, em


WINDOW_KINDS = ['sky', 'curtain', 'curtain_lit', 'room',
                'blinds', 'blinds_lit', 'frosted', 'frosted_lit',
                'dark', 'curtain_blue', 'half', 'sky2',
                'curtain_white', 'tv', 'blinds', 'dark']


def tex_window_atlas():
    r = juhu(13); C = 128; S = C * 4
    rgb = np.zeros((S, S, 3), np.float32); em = np.zeros((S, S, 3), np.float32)
    for i, k in enumerate(WINDOW_KINDS):
        cx, cy = i % 4, i // 4
        a, e = window_cell(k, r, C)
        rgb[cy * C:(cy + 1) * C, cx * C:(cx + 1) * C] = a
        em[cy * C:(cy + 1) * C, cx * C:(cx + 1) * C] = e
    save(rgb, 'aknaatlas.png')
    save(np.clip(em, 0, 1), 'aknaatlase_kuma.png')


def looRoduklaas():
    """H2 kahvatu hallikasroheline mattklaas; paan 1,2 × 1,1 m."""
    r = juhu(14); S = 256
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32) / S
    top = np.array([0.66, 0.74, 0.71]); bot = np.array([0.50, 0.58, 0.56])
    t = yy[..., None]
    rgb = top * (1 - t) + bot * t
    rgb *= (0.95 + 0.05 * fbm(S, S, 2, 8, r, 3))[..., None]
    rgb += (np.sin(xx * 40) * 0.008)[..., None]
    rail = yy < 0.06
    rgb[rail] = [0.60, 0.61, 0.60]
    rgb[(yy > 0.015) & (yy < 0.03)] = [0.75, 0.76, 0.75]
    post = (xx < 0.022) | (xx > 0.978)
    rgb[post] = [0.32, 0.33, 0.33]
    rgb[yy > 0.965] = [0.28, 0.29, 0.29]
    save(rgb, 'roduklaas.jpg')


def looFuajee():
    r = juhu(15); W, H = 256, 256
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32) / H
    rgb = np.array([0.10, 0.11, 0.12]) + np.zeros((H, W, 3))
    rgb += (np.exp(-((yy - 0.35) / 0.10) ** 2) * 0.05)[..., None]
    warm = np.zeros((H, W), np.float32)
    for cx in (0.18, 0.5, 0.82):
        warm += np.exp(-(((xx - cx) / 0.07) ** 2 + ((yy - 0.12) / 0.04) ** 2))
    warm += np.clip((yy - 0.55) / 0.45, 0, 1) * 0.35 * (0.7 + 0.3 * fbm(H, W, 2, 6, r, 3))
    rgb += warm[..., None] * np.array([0.55, 0.40, 0.22])
    em = warm[..., None] * np.array([0.9, 0.62, 0.30])
    mull = ((xx * 4) % 1.0 < 0.03) | (yy < 0.03) | (yy > 0.97)
    rgb[mull] = [0.20, 0.20, 0.21]; em[mull] = 0
    save(rgb, 'fuajee.jpg')
    save(np.clip(em, 0, 1), 'fuajee_kuma.jpg')


def looVore():
    S = 256
    yy, xx = np.mgrid[0:S, 0:S]
    bars = ((xx % 16) < 4) | ((yy % 64) < 6)
    rgba = np.zeros((S, S, 4), np.float32)
    rgba[..., 0:3] = [0.40, 0.41, 0.42]
    rgba[..., 0:3] *= (0.85 + 0.15 * (((xx % 16) == 1) | ((yy % 64) == 1)))[..., None]
    rgba[..., 3] = bars
    save(rgba, 'vore.png')


def looTaustafassaad():
    """Lihtne taustafassaad: 12 × 12 m paan ja 4 × 4 aknalahtrit."""
    r = juhu(16); S = 512; C = 128
    v = 0.50 + (fbm(S, S, 3, 3, r, 4) - 0.5) * 0.08
    rgb = np.stack([v, v * 1.01, v * 1.02], -1)
    em = np.zeros((S, S, 3), np.float32)
    for j in range(4):
        for i in range(4):
            x0, y0 = i * C + 22, j * C + 30
            x1, y1 = x0 + 84, y0 + 62
            lit = r.random()
            if lit > 0.84:
                col = np.array([0.88, 0.66, 0.38]); e = col * 0.9
            elif lit > 0.78:
                col = np.array([0.70, 0.76, 0.78]); e = col * 0.5
            else:
                col = np.array([0.15, 0.17, 0.20]) * (0.8 + 0.4 * r.random()); e = np.zeros(3)
            rgb[y0:y1, x0:x1] = col; em[y0:y1, x0:x1] = e
            rgb[y0:y1, x0 + 41:x0 + 43] = 0.3; em[y0:y1, x0 + 41:x0 + 43] = 0
            rgb[y1:y1 + 4, x0 - 4:x1 + 4] = 0.62
            rgb[j * C + C - 10:j * C + C - 4, :] *= 1.12
    save(rgb, 'taustafassaad.jpg')
    save(np.clip(em, 0, 1), 'taustafassaadi_kuma.jpg')


# Tekstuurirühm.

def looPuukoor():
    r = juhu(17); W, H = 256, 512
    n = fbm(H, W, 3, 20, r, 4)
    n2 = fbm(H, W, 8, 40, r, 3)
    v = 0.40 + (n - 0.5) * 0.25 + (n2 - 0.5) * 0.10
    fiss = np.clip((0.40 - n) / 0.08, 0, 1)
    v = v * (1 - 0.55 * fiss)
    rgb = np.stack([v * 0.98, v * 0.90, v * 0.80], -1)
    lich = fbm(H, W, 6, 6, r, 3) > 0.66
    rgb[lich] = rgb[lich] * 0.6 + np.array([0.42, 0.46, 0.36]) * 0.4
    save(rgb, 'puukoor.jpg')


def joonistaLeht(d, x, y, L, ang, col):
    w = L * 0.42
    ca, sa = math.cos(ang), math.sin(ang)
    pts = []
    for t, s in ((-1, 0), (-0.55, 0.85), (0.1, 1.0), (0.6, 0.6), (1, 0), (0.6, -0.6), (0.1, -1.0), (-0.55, -0.85)):
        px = t * L * 0.5; py = s * w * 0.5
        pts.append((x + px * ca - py * sa, y + px * sa + py * ca))
    d.polygon(pts, fill=col)


LEAF_PAL = [(46, 66, 34), (58, 80, 40), (70, 92, 44), (84, 104, 50), (98, 116, 56), (62, 76, 36), (90, 98, 46)]


def looLehed():
    """Lehtedega oks lamedal läbipaistva taustaga pinnal."""
    r = juhu(18); S = 512
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    cx, cy = S / 2, S / 2
    tips = []
    for k in range(11):
        ang = k / 11 * math.tau + (r.random() - 0.5) * 0.5
        ln = S * (0.25 + r.random() * 0.17)
        x1, y1 = cx + math.cos(ang) * ln, cy + math.sin(ang) * ln
        d.line([(cx + (r.random() - 0.5) * 30, cy + (r.random() - 0.5) * 30), (x1, y1)], fill=(64, 50, 38, 255), width=3)
        tips.append((x1, y1, ang))
    for i in range(2600):
        tx, ty, ang = tips[r.integers(0, len(tips))]
        t = r.random() ** 0.7
        x = cx + (tx - cx) * t + (r.random() - 0.5) * 70 * (0.4 + t)
        y = cy + (ty - cy) * t + (r.random() - 0.5) * 70 * (0.4 + t)
        if math.hypot(x - cx, y - cy) > S * 0.47:
            continue
        L = 10 + r.random() * 12
        base = LEAF_PAL[r.integers(0, len(LEAF_PAL))]
        k = 0.75 + 0.45 * (i / 2600)
        col = tuple(int(min(255, c * k)) for c in base) + (255,)
        joonistaLeht(d, x, y, L, r.random() * math.tau, col)
    a = np.asarray(img, np.float32) / 255
    rgb = taidaLabipaistvad(a[..., 0:3], a[..., 3])
    save(np.concatenate([rgb, a[..., 3:4]], -1), 'lehed.png')


def tex_foliage_dense(name, seed, bg, pal_scale, count, lmin, lmax, S=256):
    r = juhu(seed)
    img = Image.new('RGB', (S, S), bg); d = ImageDraw.Draw(img)
    for i in range(count):
        x, y = r.random() * S, r.random() * S
        L = lmin + r.random() * (lmax - lmin)
        base = LEAF_PAL[r.integers(0, len(LEAF_PAL))]
        k = (0.55 + 0.75 * (i / count)) * pal_scale
        col = tuple(int(min(255, c * k)) for c in base)
        ang = r.random() * math.tau
        joonistaServadega(S, lambda ox, oy: joonistaLeht(d, x + ox, y + oy, L, ang, col))
    save(np.asarray(img, np.float32) / 255, name)


def looMuru():
    r = juhu(21); S = 128
    v = fbm(S, S, 4, 4, r, 4)
    rgb = np.stack([0.16 + v * 0.10, 0.22 + v * 0.14, 0.10 + v * 0.05], -1)
    rgb *= (0.85 + 0.3 * r.random((S, S)))[..., None]
    save(rgb, 'muru.jpg')


def looMuld():
    r = juhu(22); S = 256
    img = Image.new('RGB', (S, S), (40, 34, 27)); d = ImageDraw.Draw(img)
    for i in range(1600):
        x, y = r.random() * S, r.random() * S
        L = 4 + r.random() * 7
        col = [(70, 52, 32), (92, 72, 40), (52, 60, 34), (34, 28, 22), (110, 86, 50)][r.integers(0, 5)]
        ang = r.random() * math.tau
        joonistaServadega(S, lambda ox, oy: joonistaLeht(d, x + ox, y + oy, L, ang, col))
    a = np.asarray(img, np.float32) / 255
    a *= (0.8 + 0.3 * fbm(S, S, 3, 3, r, 4))[..., None]
    save(a, 'muld.jpg')


# Tekstuurirühm.

def looKivimuur():
    """Aia kivisokkel: 4 × 1 m paan, pildi ülaserv vastab müüri ülaservale."""
    r = juhu(23); W, H = 512, 128
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    v = 0.52 + (fbm(H, W, 3, 12, r, 5) - 0.5) * 0.12 + (r.random((H, W)) - 0.5) * 0.05
    row = (yy >= 64).astype(int)
    joint_v = ((xx + row * 64) % 128) < 2
    joint_h = np.abs(yy - 64) < 1.2
    v = np.where(joint_v | joint_h, v - 0.12, v)
    v = np.where(yy < 5, v + 0.05, v)
    rgb = np.stack([v, v * 1.0, v * 0.93], -1)
    moss = np.clip((yy / H - 0.35) / 0.65, 0, 1) * (0.5 + 0.7 * fbm(H, W, 4, 16, r, 4))
    moss = np.clip(moss, 0, 1)[..., None]
    rgb = rgb * (1 - 0.55 * moss) + np.array([0.24, 0.30, 0.18]) * 0.55 * moss
    st = np.zeros((H, W), np.float32)
    for i in range(40):
        x = r.random() * W; ln = (0.2 + r.random() * 0.8) * H; w = 1 + r.random() * 3
        dx = np.minimum(np.abs(xx - x), W - np.abs(xx - x))
        st += np.clip(1 - dx / w, 0, 1) * np.clip(1 - yy / ln, 0, 1) * 0.10
    rgb *= (1 - np.clip(st, 0, 0.3))[..., None]
    save(rgb, 'kivimuur.jpg')


def looAiakivi():
    """Heledad kivipostid: v piki kõrgust, all määrdunum."""
    r = juhu(24); W, H = 64, 256
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    v = 0.80 + (fbm(H, W, 6, 2, r, 4) - 0.5) * 0.10 + (r.random((H, W)) - 0.5) * 0.04
    rgb = np.stack([v, v * 0.985, v * 0.92], -1)
    g = np.clip((yy / H - 0.55) / 0.45, 0, 1) * (0.6 + 0.6 * fbm(H, W, 8, 3, r, 3))
    g = np.clip(g, 0, 1)[..., None]
    rgb = rgb * (1 - 0.45 * g) + np.array([0.40, 0.42, 0.34]) * 0.45 * g
    edge = (np.minimum(xx, W - 1 - xx) < 2)
    rgb[edge] *= 0.85
    save(rgb, 'aiakivi.jpg')


def looPost():
    r = juhu(25); W, H = 64, 512
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    v = 0.58 + (fbm(H, W, 16, 2, r, 4) - 0.5) * 0.08 + (r.random((H, W)) - 0.5) * 0.04
    v = np.where(np.abs(xx - 32) < 1, v - 0.08, v)
    v = np.where((yy % 128) < 1.5, v - 0.05, v)
    rgb = np.stack([v, v, v * 0.96], -1)
    bottom = np.clip((yy / H - 0.88) / 0.12, 0, 1)[..., None]
    rgb *= 1 - 0.35 * bottom
    plate = (xx > 18) & (xx < 46) & (yy > 300) & (yy < 330)
    rgb[plate] = [0.85, 0.85, 0.82]
    for k in range(3):
        rgb[(xx > 22) & (xx < 42) & (yy > 305 + k * 8) & (yy < 307 + k * 8)] = [0.15, 0.15, 0.15]
    for k in range(5):
        x0 = r.integers(4, 50); y0 = r.integers(330, 460)
        col = [[0.75, 0.72, 0.55], [0.6, 0.62, 0.66], [0.82, 0.80, 0.78]][k % 3]
        rgb[y0:y0 + r.integers(6, 14), x0:x0 + r.integers(6, 12)] = col
    save(rgb, 'post.jpg')


def looKaevuluuk():
    r = juhu(26); S = 256
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    rr = np.hypot(xx - S / 2 + 0.5, yy - S / 2 + 0.5) / (S / 2)
    v = 0.26 + (r.random((S, S)) - 0.5) * 0.04
    hexp = ((np.floor(xx / 12) + np.floor(yy / 12)) % 2 == 0) & (rr < 0.80) & (rr > 0.28)
    v = np.where(hexp, v + 0.07, v)
    for ring in (0.86, 0.28, 0.94):
        v = np.where(np.abs(rr - ring) < 0.02, v + 0.10, v)
    v = np.where(rr < 0.2, v + 0.04, v)
    v *= 0.9 + 0.2 * fbm(S, S, 4, 4, r, 3)
    a = np.clip((1.0 - rr) * 60, 0, 1)
    save(np.stack([v, v * 0.98, v * 0.96, a], -1), 'kaevuluuk.png')


def looLiiklusmargid():
    S = 256
    font = leiaFont(45)
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    tri = [(10, 26), (246, 26), (128, 236)]
    d.polygon(tri, fill=(236, 236, 232, 255))
    inner = [(34, 40), (222, 40), (128, 206)]
    d.polygon(inner, fill=(178, 28, 34, 255))
    if font:
        d.text((128, 92), 'PEATU', font=font, fill=(240, 240, 236, 255), anchor='mm')
    a = np.asarray(img, np.float32) / 255
    save(np.concatenate([taidaLabipaistvad(a[..., 0:3], a[..., 3]), a[..., 3:4]], -1), 'peatumismark.png')

    img = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.ellipse([6, 6, 250, 250], fill=(236, 236, 232, 255))
    d.ellipse([14, 14, 242, 242], fill=(196, 30, 36, 255))
    d.ellipse([40, 40, 216, 216], fill=(30, 78, 158, 255))
    d.line([(58, 58), (198, 198)], fill=(196, 30, 36, 255), width=26)
    a = np.asarray(img, np.float32) / 255
    save(np.concatenate([taidaLabipaistvad(a[..., 0:3], a[..., 3]), a[..., 3:4]], -1), 'parkimiskeeld.png')


def main():
    print('Tekstuuride loomise kaust:', os.path.abspath(VALJUND))
    looAsfalt(); looTeekulumine(); looVarvijoon(); looPeatumiskiri(); looTellis(); looPargiplaat()
    looGraniit(); looBetoon(); looH1Betoon(); looH2Betoon(); looBeezPlaat(); looMustus()
    tex_window_atlas(); looRoduklaas(); looFuajee(); looVore(); looTaustafassaad()
    looPuukoor(); looLehed()
    tex_foliage_dense('tihedad_lehed.jpg', 19, (20, 28, 16), 0.85, 3200, 7, 13)
    tex_foliage_dense('hekk.jpg', 20, (26, 36, 18), 1.05, 4200, 4, 8)
    looMuru(); looMuld()
    looKivimuur(); looAiakivi(); looPost(); looKaevuluuk(); looLiiklusmargid()
    print('Valmis.')


if __name__ == '__main__':
    main()
