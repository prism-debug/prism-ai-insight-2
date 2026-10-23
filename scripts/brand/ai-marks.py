"""Joy and Dash marks and lockups, built from the client's abstract gradient shapes
(prism-ai/00-inputs/ai-shapes-2026-10-15/) and recoloured to the brand's teal and tangerine.

Joy: the flower (shape 01), a spark popping off it (03) and a confetti dot. No letters, no face.
Dash: the fast-forward shape (20) pushed right, speed streaks behind it, a four-point spark leading (17).

Writes public/brand/{joy,dash}-mark.svg (the app icon, square) and public/brand/{joy,dash}-lockup[-light].svg
(icon + name, for brand use). Names are Albert Sans Bold converted to outlines, so the lockups need no font.

    pip install fonttools brotli
    python3 scripts/brand/ai-marks.py
"""
import re
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'brand'
SHAPES = ROOT.parent / '00-inputs' / 'ai-shapes-2026-10-15'
FONT = ROOT / 'node_modules/@fontsource-variable/albert-sans/files/albert-sans-latin-wght-normal.woff2'
INK = '#062A2D'

SUN = [(0, '#FFD08A'), (1, '#FF9A4A')]                        # sun into tangerine
TEAL = [(0, '#5FD3C7'), (1, '#14A098')]                       # mint into teal
BRAND = [(0, '#5FD3C7'), (.5, '#FFD08A'), (1, '#FF9A4A')]     # teal through sun to tangerine: never through grey


def shape(n):
    return re.findall(r'<path[^>]*\bd="([^"]+)"', (SHAPES / f'Abstract Gradient Shape-{n}.svg').read_text())


def grad(gid, stops, x1, y1, x2, y2):
    st = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<linearGradient id="{gid}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" gradientUnits="userSpaceOnUse">{st}</linearGradient>'


def joy(p):
    flower, = shape('01'); spark, = shape('03')
    defs = grad(f'{p}a', BRAND, 40, 260, 260, 40) + grad(f'{p}b', TEAL, 200, 20, 290, 120)
    body = (f'<g transform="translate(18 38) scale(.8)"><path d="{flower}" fill="url(#{p}a)"/></g>'
            f'<g transform="translate(178 6) scale(.4)"><path d="{spark}" fill="url(#{p}b)"/></g>'
            '<circle cx="62" cy="58" r="17" fill="#14A098"/>')
    return defs, body


def dash(p):
    back, front = shape('20'); star, = shape('17')
    defs = grad(f'{p}a', TEAL, 60, 60, 220, 240) + grad(f'{p}b', SUN, 120, 100, 280, 250) + grad(f'{p}c', TEAL, 0, 0, 300, 300)
    lines = ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="16" rx="8" fill="url(#{p}c)"/>' for x, y, w in ((22, 104, 54), (8, 142, 62), (26, 180, 46)))
    body = (lines + f'<g transform="translate(58 20) scale(.8)"><path d="{back}" fill="url(#{p}a)"/><path d="{front}" fill="url(#{p}b)"/></g>'
            f'<g transform="translate(206 16) scale(.3)"><path d="{star}" fill="#14A098"/></g>')
    return defs, body


def outline(text, size, x0, baseline, font):
    gs, cmap = font.getGlyphSet(), font.getBestCmap()
    scale, x, paths = size / font['head'].unitsPerEm, x0, []
    for ch in text:
        name = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, baseline)))
        paths.append(pen.getCommands())
        x += gs[name].width * scale
    return ' '.join(paths), x


def main():
    font = instantiateVariableFont(TTFont(FONT), {'wght': 700})
    for who, name, build in (('joy', 'Joy', joy), ('dash', 'Dash', dash)):
        defs, body = build(who)
        (OUT / f'{who}-mark.svg').write_text(
            f'<svg width="300" height="300" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">'
            f'<title>{name}</title><defs>{defs}</defs>{body}</svg>\n')
        # lockup: icon at 300 units tall, name set beside it at cap height ~ 40% of the icon
        d, end = outline(name, 196, 330, 218, font)
        width = round(end + 10)
        for tone, fill in (('', INK), ('-light', '#FFFFFF')):
            defs_t, body_t = build(f'{who}{tone.replace("-", "")}')
            (OUT / f'{who}-lockup{tone}.svg').write_text(
                f'<svg width="{width}" height="300" viewBox="0 0 {width} 300" fill="none" xmlns="http://www.w3.org/2000/svg">'
                f'<title>{name}</title><defs>{defs_t}</defs>{body_t}<path d="{d}" fill="{fill}"/></svg>\n')
        print(who, 'mark + lockups written, lockup', width, 'x 300')


if __name__ == '__main__':
    main()
