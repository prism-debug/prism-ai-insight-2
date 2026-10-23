"""The PRISM wordmark: "Prism" in Gloock (Duarte Pinto, SIL Open Font License), slimmed and drawn as outlines.

Gloock comes in one weight, so the slimming is done here, on the outlines:
- 5% narrower overall;
- the stems are thinned horizontally only (each outline is intersected with itself shifted 9 units left and
  right), so they lose about 17% of their weight while the hairlines, which run across rather than up, stay
  whole. An even, all-round offset would cut the hairlines in the r, s and m.
Kerning comes from the font via HarfBuzz; tracking is -20 units (-2%).

Writes public/brand/wordmark-{midnight,light}[-bold].svg. The -bold names are kept so no page has to change; both
weights are now the same drawing.

    npm install            # brings @fontsource/gloock
    pip install fonttools skia-pathops uharfbuzz
    python3 scripts/brand/wordmark.py
"""
import io
from pathlib import Path as FsPath
from fontTools.ttLib import TTFont
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
import uharfbuzz as hb
from pathops import Path, PathOp, op

ROOT = FsPath(__file__).resolve().parents[2]
FONT = ROOT / 'node_modules/@fontsource/gloock/files/gloock-latin-400-normal.woff'
OUT = ROOT / 'public' / 'brand'
TEXT, TRACK, NARROW, THIN = 'Prism', -20, .95, 9
INKS = {'midnight': '#062A2D', 'light': '#F4F2F0'}


def shifted(p, dx):
    q = Path(); p.draw(TransformPen(q.getPen(), (1, 0, 0, 1, dx, 0))); return q


def wordmark():
    font = TTFont(FONT); font.flavor = None
    buf = io.BytesIO(); font.save(buf)
    hbf = hb.Font(hb.Face(buf.getvalue()))
    gs, order = font.getGlyphSet(), font.getGlyphOrder()
    b = hb.Buffer(); b.add_str(TEXT); b.guess_segment_properties(); hb.shape(hbf, b, {'kern': True})
    total, x = Path(), 0
    for info, pos in zip(b.glyph_infos, b.glyph_positions):
        g = Path()
        gs[order[info.codepoint]].draw(TransformPen(g.getPen(glyphSet=gs), (NARROW, 0, 0, 1, (x + pos.x_offset) * NARROW, pos.y_offset)))
        g.simplify()
        g = op(op(g, shifted(g, THIN), PathOp.INTERSECTION), shifted(g, -THIN), PathOp.INTERSECTION)
        total = op(total, g, PathOp.UNION)
        x += pos.x_advance + TRACK
    return total


def main():
    path = wordmark()
    bp = BoundsPen(None); path.draw(bp); x0, y0, x1, y1 = bp.bounds
    pen = SVGPathPen(None, ntos=lambda v: f'{v:.1f}'.rstrip('0').rstrip('.'))
    path.draw(TransformPen(pen, (1, 0, 0, -1, -x0, y1)))      # font y runs up, SVG y runs down
    w, h = round(x1 - x0), round(y1 - y0)
    for tone, ink in INKS.items():
        svg = (f'<svg width="{w / 20:g}" height="{h / 20:g}" viewBox="0 0 {w} {h}" fill="none" xmlns="http://www.w3.org/2000/svg">'
               f'<title>PRISM</title><path d="{pen.getCommands()}" fill="{ink}"/></svg>\n')
        for suffix in ('', '-bold'):
            (OUT / f'wordmark-{tone}{suffix}.svg').write_text(svg)
    print(f'wordmark {w} x {h} units, aspect {w / h:.3f}')


if __name__ == '__main__':
    main()
