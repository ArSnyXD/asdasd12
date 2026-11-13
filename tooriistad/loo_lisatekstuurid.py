#!/usr/bin/env python3
"""Täiendavad protseduurtekstuurid. Vajab NumPyd ja Pillow’ teeki.
Käivita: python3 tooriistad/loo_lisatekstuurid.py
Fondifaili saab määrata keskkonnamuutujaga TOKYO_FONT."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

VALJUND = os.path.join(os.path.dirname(__file__), '..', 'varad', 'tekstuurid')
FONDI_TEE = os.environ.get('TOKYO_FONT', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')
rs = np.random.default_rng(2026)


def font(size):
    try:
        return ImageFont.truetype(FONDI_TEE, size)
    except OSError:
        return ImageFont.load_default()


def mura(h, w, scale=1.0, blur=0):
    a = rs.normal(0, 1, (h, w)).astype(np.float32)
    if blur:
        im = Image.fromarray(np.clip(a * 40 + 128, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur))
        a = (np.asarray(im).astype(np.float32) - 128) / 40
    return a * scale


def save(img, name, q=90):
    p = os.path.join(VALJUND, name)
    if name.endswith('.jpg'):
        img.convert('RGB').save(p, quality=q)
    else:
        img.save(p)
    print('  ', name, img.size)


def plaadid(name, size, cols, rows, base, jitter, grout, gw, stagger=False):
    """Ühemeetrine paan: veerud ja read, värvihajuvus ning vuugi laius pikslites."""
    a = np.zeros((size, size, 3), np.float32)
    tw, th = size / cols, size / rows
    for r in range(rows):
        off = (tw / 2 if (stagger and r % 2) else 0)
        for c in range(-1, cols + 1):
            x0, y0 = int(round(c * tw + off)), int(round(r * th))
            x1, y1 = int(round((c + 1) * tw + off)), int(round((r + 1) * th))
            col = np.array(base, np.float32) + rs.normal(0, jitter, 3) * 0.5 + rs.normal(0, jitter)
            xs, xe = max(0, x0), min(size, x1)
            if xe > xs:
                a[y0:y1, xs:xe] = col
            a[y0:y1, max(0, x0):max(0, min(size, x0 + gw))] = grout
        a[int(round(r * th)):int(round(r * th)) + gw, :] = grout
    a += mura(size, size, 5.0)[..., None]
    a += mura(size, size, 7.0, blur=6)[..., None]
    save(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)), name)


def nimesilt():
    w, h = 768, 256
    a = np.full((h, w, 3), (50, 49, 47), np.float32)
    a += mura(h, w, 4)[..., None] + np.repeat(mura(1, w, 6, blur=0), h, 0)[..., None]
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    d.rectangle([10, 10, w - 11, h - 11], outline=(150, 144, 132), width=3)
    f1, f2 = font(78), font(40)
    t1 = 'U D U M A J A'
    b = d.textbbox((0, 0), t1, font=f1)
    d.text(((w - (b[2] - b[0])) / 2, 46), t1, font=f1, fill=(222, 214, 198))
    t2 = 'ELUMAJA'
    b = d.textbbox((0, 0), t2, font=f2)
    d.text(((w - (b[2] - b[0])) / 2, 162), t2, font=f2, fill=(190, 182, 168))
    save(im, 'nimesilt.png')


def automaadid():
    """Kahe joogiautomaadi atlas ja helenduskaart.
Laius 1536 pikslit: esipaneelid u=0..1/3 ja 1/3..2/3, kumbki 512 × 872 (1 × 1,7 m).
Külgpaneelid u=2/3..5/6 ja 5/6..1, kumbki 256 × 872 (0,72 × 1,7 m).
Külg joonistatakse 369 piksli laiuselt ning surutakse kokku, et mudelil kiri ei veniks.
Kollane kulunud korpus, kolm joogirida, hinnad ja nupud; paremal maksepaneel.
Korpuse sügavuse ja väljastusaluse annab hoonemooduli geomeetria.
Väljastusava ja münditagastuse asukohad vastavad geomeetriale.
Korpuse värvid vastavad automaadi külgmaterjalidele. Juhuarvugeneraator on eraldiseisev."""
    r = np.random.default_rng(606)
    W, H, FW, SWp, SW = 1536, 872, 512, 256, 369

    def nz(h, w, blur):
        a = r.normal(0, 1, (h, w)).astype(np.float32)
        im = Image.fromarray(np.clip(a * 40 + 128, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur))
        a = (np.asarray(im).astype(np.float32) - 128) / 40
        return a / (a.std() + 1e-6)

    scratch = ImageDraw.Draw(Image.new('RGB', (4, 4)))

    def keskneTekst(D, cx, y, text, maxw, size, fill, stroke=0, sfill=None):
        """Keskjoondatud tekst: tähtede ülaserv y juures; suurus väheneb, kuni tekst mahub laiusesse."""
        while True:
            f = font(size)
            b = scratch.textbbox((0, 0), text, font=f, stroke_width=stroke)
            if b[2] - b[0] <= maxw or size <= 10:
                break
            size -= 2
        D.text((cx - (b[2] - b[0]) / 2 - b[0], y - b[1]), text, font=f, fill=fill,
               stroke_width=stroke, stroke_fill=sfill)

    def shade(c, k):
        return tuple(int(max(0, min(255, v * k))) for v in c)

    col = Image.new('RGB', (W, H))
    ext = Image.new('RGB', (W, H), (0, 0, 0))       # Indikaatorite ja näidiku oma helendus.
    fac = np.zeros((H, W), np.float32)              # Pildi helendav osakaal: vaateaken ja päis.
    dc, de = ImageDraw.Draw(col), ImageDraw.Draw(ext)
    liigid = [
        dict(body=(216, 178, 56), paiseTaust=(192, 36, 30), paiseTekst=(255, 222, 64),
             pais='SOODSAD JOOGID', alampealkiri='IGA PÄEV SOODNE', plakat='munt',
             kleebis='HEA HIND IGA PÄEV!', kleebiseTaust=(204, 38, 34), kleebiseTekst=(255, 232, 80),
             hinnad=[100, 100, 100, 80, 50],
             cols=[(206, 40, 36), (240, 150, 30), (60, 150, 70), (236, 236, 228), (40, 110, 190), (120, 190, 220),
                   (250, 210, 60), (150, 200, 90), (230, 90, 120), (90, 60, 140)]),
        dict(body=(224, 166, 44), paiseTaust=(28, 84, 156), paiseTekst=(255, 255, 255),
             pais='KÜLMAD JOOGID 100 ¥', alampealkiri='KÜLMAD JA KUUMAD JOOGID', plakat='tass',
             kleebis='MAITSEV JOOGIPAUS', kleebiseTaust=(34, 96, 170), kleebiseTekst=(255, 255, 255),
             hinnad=[100, 120, 130, 130],
             cols=[(92, 56, 34), (30, 30, 34), (24, 50, 110), (200, 160, 60), (60, 120, 70), (180, 50, 40),
                   (230, 230, 220), (130, 90, 50), (40, 140, 160), (210, 120, 40)]),
    ]

    def jook(cx, base, wide, tall, c, typ):
        """Üks jook vaateaknas: pudel, kõrge teepudel või purk."""
        hw, top = wide / 2, base - tall
        dark, light = shade(c, 0.62), tuple(min(255, int(v * 1.2 + 34)) for v in c)
        if typ == 'purk':
            dc.rounded_rectangle([cx - hw, top, cx + hw, base], radius=4, fill=c)
            dc.rectangle([cx - hw, top, cx + hw, top + 5], fill=(198, 200, 202))
            dc.rectangle([cx - hw, base - 4, cx + hw, base], fill=(170, 172, 175))
            ly0 = top + tall * 0.30
        else:
            neck = tall * 0.30
            dc.rounded_rectangle([cx - hw, top + neck, cx + hw, base], radius=6, fill=c)
            dc.polygon([(cx - hw, top + neck + 6), (cx - hw * 0.40, top + 11), (cx + hw * 0.40, top + 11),
                        (cx + hw, top + neck + 6)], fill=c)
            cap = (240, 240, 236) if r.random() < 0.6 else shade(c, 0.8)
            dc.rectangle([cx - hw * 0.42, top, cx + hw * 0.42, top + 11], fill=cap)
            ly0 = top + tall * 0.48
        ly1 = ly0 + tall * 0.26
        lab = (246, 245, 238) if r.random() < 0.45 else light
        dc.rectangle([cx - hw, ly0, cx + hw, ly1], fill=lab)
        dc.rectangle([cx - hw * 0.6, ly0 + 5, cx + hw * 0.6, ly0 + 9], fill=dark)
        dc.rectangle([cx - hw * 0.4, ly0 + 13, cx + hw * 0.4, ly0 + 16], fill=dark)
        # Ruumilisus: vasakul helk, paremal vari.
        dc.rectangle([cx - hw * 0.64, top + 14, cx - hw * 0.40, base - 6], fill=light)
        dc.rectangle([cx + hw * 0.62, top + 14, cx + hw, base - 2], fill=dark)

    def glass(a0, b0, a1, b1):
        """Kaks kaldus klaasihelki vaateaknal."""
        w_, h_ = a1 - a0, b1 - b0
        ov = Image.new('RGBA', (w_, h_), (0, 0, 0, 0))
        do = ImageDraw.Draw(ov)
        for s, wd, al in ((0.30, 54, 30), (0.66, 24, 22)):
            xa = s * w_
            do.polygon([(xa, 0), (xa + wd, 0), (xa + wd - h_ * 0.35, h_), (xa - h_ * 0.35, h_)], fill=(255, 255, 255, al))
        base_ = col.crop((a0, b0, a1, b1)).convert('RGBA')
        col.paste(Image.alpha_composite(base_, ov).convert('RGB'), (a0, b0))

    for k, K in enumerate(liigid):
        x0 = k * FW
        dc.rectangle([x0, 0, x0 + FW - 1, H - 1], fill=K['body'])
        # Ülemine silt.
        dc.rectangle([x0 + 22, 16, x0 + 490, 106], fill=K['paiseTaust'])
        dc.rectangle([x0 + 22, 16, x0 + 490, 19], fill=shade(K['paiseTaust'], 1.35))
        hx0 = x0 + 30
        if k == 0:
            dc.ellipse([x0 + 30, 24, x0 + 104, 98], fill=(214, 214, 208), outline=(150, 150, 146), width=3)
            keskneTekst(dc, x0 + 67, 48, '100', 60, 28, (60, 60, 64))
            hx0 = x0 + 110
        hc = (hx0 + x0 + 484) / 2
        keskneTekst(dc, hc, 24, K['alampealkiri'], x0 + 484 - hx0, 14, K['paiseTekst'])
        keskneTekst(dc, hc, 46, K['pais'], x0 + 484 - hx0 - 8, 42, K['paiseTekst'], 2, shade(K['paiseTaust'], 0.45))
        fac[16:107, x0 + 22:x0 + 491] = 0.55
        # Kolm joogirida koos hindade ja nuppudega.
        dc.rectangle([x0 + 26, 116, x0 + 486, 556], fill=(44, 46, 50))
        dc.rectangle([x0 + 34, 124, x0 + 478, 548], fill=(196, 204, 210))
        n, cw = 8, 444 / 8
        for rr, typ in enumerate(('pudel', 'purk', 'korge')):
            ry = 124 + rr * 141
            for i in range(n):
                cx = x0 + 34 + cw * (i + 0.5)
                c = K['cols'][int(r.integers(0, len(K['cols'])))]
                if typ == 'purk':
                    jook(cx, ry + 102, cw * 0.62, 66, c, typ)
                else:
                    jook(cx, ry + 102, cw * 0.70, 94 if typ == 'pudel' else 98, c, typ)
            dc.rectangle([x0 + 34, ry + 104, x0 + 478, ry + 131], fill=(244, 244, 238))
            dc.rectangle([x0 + 34, ry + 131, x0 + 478, ry + 140], fill=(146, 150, 154))
            for i in range(n):
                cx = x0 + 34 + cw * (i + 0.5)
                dc.text((cx - 23, ry + 108), str(int(r.choice(K['hinnad']))), font=font(15), fill=(30, 30, 30))
                lc = (255, 70, 50) if r.random() < 0.1 else (70, 150, 255)
                for D in (dc, de):
                    D.rounded_rectangle([cx + 6, ry + 110, cx + 22, ry + 125], radius=3, fill=lc)
        fac[124:549, x0 + 34:x0 + 479] = 0.40
        fac[124:549, x0 + 34:x0 + 479][np.r_[104:131, 245:272, 386:413], :] = 0.30
        glass(x0 + 34, 124, x0 + 478, 548)
        # Vasak paneel.
        if K['plakat'] == 'munt':
            dc.rectangle([x0 + 36, 578, x0 + 300, 664], fill=(250, 246, 232))
            dc.ellipse([x0 + 46, 584, x0 + 120, 658], fill=(226, 188, 64), outline=(170, 130, 30), width=3)
            keskneTekst(dc, x0 + 83, 607, '100', 60, 28, (110, 76, 10))
            keskneTekst(dc, x0 + 210, 590, 'ÜHE MÜNDIGA', 170, 32, (200, 34, 30))
            keskneTekst(dc, x0 + 210, 632, 'KÕIK 100 ¥', 170, 22, (40, 40, 44))
        else:
            dc.rectangle([x0 + 36, 578, x0 + 300, 664], fill=(214, 230, 242))
            dc.ellipse([x0 + 46, 640, x0 + 124, 656], fill=(110, 74, 46))
            dc.rounded_rectangle([x0 + 56, 592, x0 + 112, 646], radius=10, fill=(244, 240, 232), outline=(110, 74, 46), width=3)
            dc.ellipse([x0 + 64, 596, x0 + 104, 608], fill=(96, 58, 34))
            keskneTekst(dc, x0 + 210, 590, 'KUUM', 170, 32, (200, 40, 34))
            keskneTekst(dc, x0 + 210, 632, 'KOHV JA TEE', 170, 22, (70, 50, 36))
        # Kleebis.
        dc.rectangle([x0 + 36, 670, x0 + 300, 700], fill=K['kleebiseTaust'])
        keskneTekst(dc, x0 + 168, 674, K['kleebis'], 250, 22, K['kleebiseTekst'], 1, shade(K['kleebiseTaust'], 0.4))
        # Maksepaneel: näidik, mündi- ja rahatäheava, tagastus, kaardilugeja.
        px0, px1, py0, py1 = x0 + 350, x0 + 486, 572, 792
        dc.rectangle([px0, py0, px1, py1], fill=(62, 64, 68))
        dc.line([(px0, py0), (px1, py0)], fill=(96, 98, 102), width=2)
        dc.line([(px0, py0), (px0, py1)], fill=(96, 98, 102), width=2)
        dc.line([(px0, py1), (px1, py1)], fill=(34, 35, 38), width=2)
        dc.line([(px1, py0), (px1, py1)], fill=(34, 35, 38), width=2)
        dc.rectangle([px0 + 14, 586, px1 - 14, 614], fill=(16, 34, 20))
        de.rectangle([px0 + 14, 586, px1 - 14, 614], fill=(20, 70, 32))
        for D, fl in ((dc, (120, 255, 150)), (de, (110, 240, 140))):
            D.text((px1 - 40, 588), '0', font=font(20), fill=fl)
        dc.rectangle([px0 + 20, 628, px0 + 50, 678], fill=(150, 152, 156))
        dc.rectangle([px0 + 32, 634, px0 + 38, 672], fill=(10, 10, 12))
        dc.text((px0 + 18, 682), 'MÜNT', font=font(11), fill=(220, 220, 220))
        dc.rectangle([px0 + 62, 630, px1 - 14, 652], fill=(22, 22, 24), outline=(70, 150, 250), width=2)
        de.rectangle([px0 + 62, 630, px1 - 14, 652], outline=(60, 140, 240), width=2)
        dc.text((px0 + 70, 656), '1000', font=font(11), fill=(220, 220, 220))
        dc.ellipse([px0 + 72, 670, px0 + 96, 694], fill=(196, 40, 36))
        dc.ellipse([px0 + 77, 674, px0 + 87, 682], fill=(236, 120, 110))
        dc.rounded_rectangle([px0 + 14, 704, px1 - 14, 736], radius=5, fill=(34, 36, 40))
        de.rounded_rectangle([px0 + 14, 704, px1 - 14, 736], radius=5, outline=(40, 90, 160), width=1)
        dc.rounded_rectangle([px0 + 24, 710, px0 + 60, 730], radius=4, fill=(230, 230, 226))
        dc.text((px0 + 33, 711), 'IC', font=font(14), fill=(30, 60, 140))
        dc.rectangle([px0 + 50, 748, px0 + 120, 784], fill=(14, 14, 16))
        # Väljastusava: varikatus, küljed ja lävi luuakse geomeetriana.
        dc.rectangle([x0 + 70, 706, x0 + 340, 814], fill=(16, 16, 18))
        dc.rectangle([x0 + 78, 714, x0 + 332, 772], fill=(50, 52, 56))
        dc.rectangle([x0 + 78, 714, x0 + 332, 720], fill=(70, 72, 76))
        keskneTekst(dc, x0 + 205, 736, 'VAJUTA', 120, 18, (200, 200, 196))
        dc.rectangle([x0 + 78, 776, x0 + 332, 806], fill=(9, 9, 10))
        # Alumine riba.
        dc.rectangle([x0 + 20, 846, x0 + 491, 862], fill=(70, 72, 74))

    # Kulumine: plekid, voolamisjäljed, mustus, tumedad servad, kriimud ja värvikahjustused.
    A = np.asarray(col).astype(np.float32)
    yy = np.arange(H, dtype=np.float32)[:, None]
    g = np.clip((yy - 560) / 312, 0, 1)
    for k, K in enumerate(liigid):
        x0 = k * FW
        sl = A[:, x0:x0 + FW]
        body = np.abs(sl - np.array(K['body'], np.float32)).sum(axis=2) < 24
        blot = nz(H, FW, 4)
        sl[body] *= (1 + 0.07 * blot[body])[:, None]
        nonshow = fac[:, x0:x0 + FW] == 0
        grime = np.broadcast_to(1 - 0.16 * g ** 1.6, (H, FW))
        sn = nz(8, FW, 2)[4]
        st = 1 - 0.12 * np.clip(sn, 0, None)[None, :] * g
        e = np.ones((H, FW), np.float32)
        e[:, :10] *= 0.84
        e[:, -10:] *= 0.84
        e[:8, :] *= 0.86
        e[-8:, :] *= 0.80
        sl *= (np.where(nonshow, grime, 1.0) * np.where(body, st * e, 1.0))[..., None]
        ys, xs = np.nonzero(body)
        for _ in range(40):  # Kriimud.
            i = int(r.integers(0, len(ys)))
            y_, x_ = ys[i], xs[i]
            ang = r.uniform(-0.6, 0.6) + (np.pi / 2 if r.random() < 0.3 else 0)
            L_ = r.uniform(8, 30)
            for t in np.linspace(0, 1, int(L_)):
                yy_, xx_ = int(y_ + np.sin(ang) * L_ * t), int(x_ + np.cos(ang) * L_ * t)
                if 0 <= yy_ < H and 0 <= xx_ < FW and body[yy_, xx_]:
                    sl[yy_, xx_] = np.minimum(255, sl[yy_, xx_] * 1.18 + 6)
        for _ in range(18):  # Värvikahjustused.
            i = int(r.integers(0, len(ys)))
            y_, x_ = ys[i], xs[i]
            rad = r.uniform(1.5, 4)
            sub = sl[int(max(0, y_ - rad)):int(min(H, y_ + rad + 1)), int(max(0, x_ - rad)):int(min(FW, x_ + rad + 1))]
            sub[...] = sub * 0.35 + np.array([150, 140, 122], np.float32) * 0.65
    col = Image.fromarray(np.clip(A, 0, 255).astype(np.uint8))

    def side_art(k, K):
        im = Image.new('RGB', (SW, H), K['body'])
        d = ImageDraw.Draw(im)
        d.rectangle([16, 18, SW - 16, 640], fill=(238, 236, 228))
        if k == 0:
            cx_, cy_ = 82, 96
            for a_ in range(12):
                t = a_ * np.pi / 6
                d.polygon([(cx_ + np.cos(t - 0.12) * 50, cy_ + np.sin(t - 0.12) * 50),
                           (cx_ + np.cos(t) * 78, cy_ + np.sin(t) * 78),
                           (cx_ + np.cos(t + 0.12) * 50, cy_ + np.sin(t + 0.12) * 50)], fill=(236, 120, 40))
            d.ellipse([cx_ - 44, cy_ - 44, cx_ + 44, cy_ + 44], fill=(222, 70, 38))
            keskneTekst(d, SW / 2 + 40, 60, 'PÄIKE', SW - 170, 60, (44, 44, 48))
            keskneTekst(d, SW / 2, 200, 'JOOGIAUTOMAAT', SW - 60, 34, (190, 40, 34))
            keskneTekst(d, SW / 2, 560, 'JAHE', SW - 90, 36, (30, 80, 160))
        else:
            d.rectangle([16, 18, SW - 16, 120], fill=(28, 84, 156))
            keskneTekst(d, SW / 2, 44, 'KÜLM JA KUUM', SW - 60, 44, (255, 255, 255))
            d.ellipse([110, 200, 260, 236], fill=(120, 80, 50))
            d.rounded_rectangle([130, 150, 240, 222], radius=16, fill=(236, 230, 220), outline=(120, 80, 50), width=4)
            d.arc([224, 164, 268, 204], start=270, end=90, fill=(120, 80, 50), width=6)
            keskneTekst(d, SW / 2, 262, 'KOHV', SW - 70, 64, (96, 58, 34))
            keskneTekst(d, SW / 2, 560, 'SOE', SW - 70, 40, (200, 40, 34))
        d.rounded_rectangle([40, 350, SW - 40, 450], radius=14, fill=(250, 212, 58))
        keskneTekst(d, SW / 2, 364, '100 ¥', SW - 110, 72, (200, 30, 30), 2, (120, 10, 10))
        keskneTekst(d, SW / 2, 474, '80 ¥ / 50 ¥' if k == 0 else '120 ¥ / 130 ¥', SW - 70, 44, (200, 30, 30))
        d.rectangle([40, 700, SW - 40, 760], fill=(244, 244, 240))
        keskneTekst(d, SW / 2, 714, 'AUTOMAAT 26-%d' % (k + 1), SW - 100, 22, (40, 40, 44))
        A_ = np.asarray(im).astype(np.float32)
        gs = np.clip((np.arange(H, dtype=np.float32)[:, None] - 520) / 352, 0, 1)
        A_ *= (1 - 0.18 * gs ** 1.5)[..., None]
        A_ *= (1 + 0.06 * nz(H, SW, 4))[..., None]
        return Image.fromarray(np.clip(A_, 0, 255).astype(np.uint8)).resize((SWp, H), Image.LANCZOS)

    for k, K in enumerate(liigid):
        col.paste(side_art(k, K), (2 * FW + k * SWp, 0))
    A = np.asarray(col).astype(np.float32) + r.normal(0, 2.5, (H, W, 1)).astype(np.float32)
    out = Image.fromarray(np.clip(A, 0, 255).astype(np.uint8))
    save(out, 'automaadid.png')
    E = np.asarray(out).astype(np.float32) * fac[..., None] + np.asarray(ext).astype(np.float32)
    save(Image.fromarray(np.clip(E, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), 'automaatide_kuma.png')


def triibud():
    s = 256
    y, x = np.mgrid[0:s, 0:s]
    band = ((x + y) // (s // 4)) % 2
    a = np.where(band[..., None] == 0, np.array((236, 186, 22), np.float32), np.array((26, 26, 26), np.float32))
    a += mura(s, s, 6)[..., None] + mura(s, s, 10, blur=8)[..., None]
    save(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)), 'tokketriibud.png')


def suletudSilt():
    w, h = 372, 504
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([4, 4, w - 5, h - 5], radius=14, fill=(244, 244, 240, 255), outline=(200, 30, 36, 255), width=12)
    for txt, f, y, c in (('EDASI', font(74), 40, (25, 25, 30)), ('TEE', font(118), 150, (205, 28, 34)),
                         ('SULETUD', font(52), 290, (205, 28, 34)), ('VABANDAME EBAMUGAVUSE PÄRAST', font(12), 440, (40, 40, 46))):
        b = d.textbbox((0, 0), txt, font=f)
        d.text(((w - (b[2] - b[0])) / 2 - b[0], y), txt, font=f, fill=c)
    save(im, 'suletud_silt.png')


def ruloo():
    w, h = 512, 512
    yy = np.arange(h, dtype=np.float32)
    rib = 0.5 + 0.5 * np.cos(yy / h * 40 * 2 * np.pi)
    a = np.zeros((h, w, 3), np.float32) + (150 + 34 * rib)[:, None, None]
    a *= np.array((1.0, 1.01, 1.0), np.float32)
    grime = np.clip((yy / h - 0.55) * 1.8, 0, 1)[:, None, None]
    a = a * (1 - 0.35 * grime) + mura(h, w, 4)[..., None] + mura(h, w, 9, blur=10)[..., None]
    a[:, :6] *= 0.6
    a[:, -6:] *= 0.6
    a[-18:] = a[-18:] * 0.5
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    d.rectangle([300, 150, 380, 262], fill=(236, 232, 218))
    d.text((312, 160), 'ÄRIPIND', font=font(15), fill=(30, 30, 30))
    d.text((318, 190), 'ÜÜRILE', font=font(16), fill=(190, 30, 30))
    d.text((308, 236), '03-xxxx', font=font(13), fill=(40, 40, 40))
    save(im, 'ruloo.jpg')


def poesilt():
    w, h = 1024, 72
    im = Image.new('RGB', (w, h), (30, 42, 66))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, w - 1, h - 1], outline=(200, 200, 205), width=3)
    t = 'UDU KEEMILINE PUHASTUS'
    f = font(44)
    b = d.textbbox((0, 0), t, font=f)
    d.text(((w - (b[2] - b[0])) / 2 - b[0], (h - (b[3] - b[1])) / 2 - b[1]), t, font=f, fill=(236, 236, 230))
    save(im, 'poesilt.png')


if __name__ == '__main__':
    import sys
    os.makedirs(VALJUND, exist_ok=True)
    # Argumentideta luuakse kõik lisatekstuurid; argumentidega ainult nimetatud tekstuurid.
    # Näide: python3 tooriistad/loo_lisatekstuurid.py automaadid
    # Automaatidel on oma juhuarvugeneraator; teiste funktsioonide osaline käivitamine muudab nende mustrit.
    tood = [
        ('vaike_plaat', lambda: plaadid('vaike_plaat.jpg', 512, 10, 20, (204, 198, 186), 7, (226, 222, 214), 2)),
        ('tume_plaat', lambda: plaadid('tume_plaat.jpg', 512, 5, 10, (78, 72, 67), 6, (50, 47, 45), 3, stagger=True)),
        ('nimesilt', nimesilt),
        ('automaadid', automaadid),
        ('triibud', triibud),
        ('suletudSilt', suletudSilt),
        ('ruloo', ruloo),
        ('poesilt', poesilt),
    ]
    valitud = set(sys.argv[1:])
    print('Lisatekstuurid:')
    for name, fn in tood:
        if not valitud or name in valitud:
            fn()
