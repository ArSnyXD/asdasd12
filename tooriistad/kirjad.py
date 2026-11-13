"""Tekstuurigeneraatorite ühine jaapani kirja font ja märgikontroll.

Font võetakse kohalikust failist; võrgust midagi ei laadita ega lisata mängu sõltuvusi.
Muu fondifaili saab määrata keskkonnamuutujatega TOKYO_FONT (tee) ja TOKYO_FONT_INDEX
(näo indeks .ttc-failis). Kontroll katkestab töö, kui mõni sildi märk fondist puudub."""
import os
from functools import lru_cache

from PIL import Image, ImageDraw, ImageFont

# (tee, näo indeks). Noto Sans CJK .ttc-failis on indeks 0 jaapani variant (JP).
KANDIDAADID = [
    ('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 0),
    ('/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc', 0),
    ('/usr/share/fonts/google-noto-cjk/NotoSansCJK-Bold.ttc', 0),
    ('/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc', 0),
    ('C:/Windows/Fonts/YuGothB.ttc', 0),
]
PROOVIMARGID = '止まれ通行'
PUUDUV = '\U000FFFFD'   # Eraplaani koodipunkt, mida fontides ei ole: puuduva märgi kujutis võrdluseks.


def _kuju(f, ch):
    im = Image.new('L', (96, 96), 0)
    ImageDraw.Draw(im).text((16, 16), ch, font=f, fill=255)
    return im.tobytes()


def _puudub(f, ch):
    k = _kuju(f, ch)
    return k == _kuju(f, PUUDUV) or not any(k)


@lru_cache(None)
def _fail():
    kandidaadid = list(KANDIDAADID)
    if os.environ.get('TOKYO_FONT'):
        kandidaadid.insert(0, (os.environ['TOKYO_FONT'], int(os.environ.get('TOKYO_FONT_INDEX', '0'))))
    for tee, indeks in kandidaadid:
        if not os.path.exists(tee):
            continue
        try:
            f = ImageFont.truetype(tee, 48, index=indeks)
        except OSError:
            continue
        if not any(_puudub(f, ch) for ch in PROOVIMARGID):
            return tee, indeks
    raise SystemExit('Jaapani märkidega fonti ei leitud. Paigalda Noto Sans CJK JP või määra TOKYO_FONT.')


@lru_cache(None)
def jaapaniFont(size):
    tee, indeks = _fail()
    return ImageFont.truetype(tee, size, index=indeks)


def kontrolliMargid(tekst):
    """Katkestab, kui fondis puudub mõni märk; muidu jääks sildile tühi kast."""
    f = jaapaniFont(48)
    puudu = sorted({ch for ch in tekst if not ch.isspace() and _puudub(f, ch)})
    if puudu:
        raise SystemExit('Fondis puuduvad märgid: ' + ', '.join('%s (U+%04X)' % (c, ord(c)) for c in puudu))


def keskel(D, cx, cy, tekst, f, fill, vahe=0, **kw):
    """Joonistab teksti nii, et selle tindikast on keskpunktis (cx, cy); vahe lisab märkide vahele ruumi."""
    kontrolliMargid(tekst)
    b = D.textbbox((0, 0), tekst, font=f)
    y = cy - (b[1] + b[3]) / 2
    if not vahe:
        D.text((cx - (b[0] + b[2]) / 2, y), tekst, font=f, fill=fill, **kw)
        return
    x = cx - (sum(f.getlength(ch) for ch in tekst) + vahe * (len(tekst) - 1)) / 2
    for ch in tekst:
        D.text((x, y), ch, font=f, fill=fill, **kw)
        x += f.getlength(ch) + vahe
