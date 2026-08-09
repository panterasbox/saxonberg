#!/usr/bin/env python3
"""
Manifesto re-record — YouTube thumbnail generator (Ch 1-7).

Emits 1280x720 PNGs -> docs/manifesto/exports/thumbnails/. One per chapter,
identical layout, so the set reads as a series in a playlist sidebar.

DESIGN
  * Ground is Old Glory Blue #002868 — the same value the rings mark hard-codes
    as its casing, which is what the brand doc requires (docs/brand/README.md:
    "the casing colour must match whatever is behind the mark").
  * The rings are EXTRACTED FROM background.png (the flag), not re-drawn from
    saxonberg-rings-white.svg. Both are correct Borromean, but the SVG's casing
    is 2.55x the ink stroke, which at thumbnail scale opens gaps wide enough to
    read as three broken arcs. The flag's proportions survive the downscale.
  * Title is the load-bearing element — it has to survive 320x180 in a sidebar.
    Two lines: a quiet kicker and a large punch line. Where a chapter title
    carries an em-dash, the dash IS the split.
  * Type is MEASURED, never estimated (`label:` + `%w`), then the point size is
    stepped down until it fits the column. An earlier pass estimated advance
    widths and also used SVG letter-spacing, which rsvg applies far more
    aggressively than the spec implies — both titles overflowed the canvas.
  * No pitch copy, no arrows, no faces. The set is a label, not an ad.

Run: python3 thumbnail-generator.py
"""
import os, subprocess, sys

W, H = 1280, 720
HERE = os.path.dirname(os.path.abspath(__file__))
FLAG = os.path.join(HERE, "background.png")
OUT = os.path.join(HERE, "exports", "thumbnails")
TMP = os.path.join(OUT, "_work")
os.makedirs(OUT, exist_ok=True)
os.makedirs(TMP, exist_ok=True)

NAVY = "#002868"      # Old Glory Blue — ground AND the mark's casing
SHEEN = "#04306f"     # one quiet step up; the flag's ripple, flattened
SOFT = "#8fb4e8"
WHITE = "#ffffff"
FONT = "DejaVu-Sans-Bold"

# (number, kicker, punch) — kicker is None for a single-line title.
CHAPTERS = [
    (1, "THE WHOLE MACHINE", "END TO END"),
    (2, None,                "WHY A GAME"),
    (3, "THE CHAMBERS",      "EARNING A VOICE"),
    (4, "THE ARGUMENT MAP",  "NOT THE CROWD"),
    (5, "GOVERNING IS",      "SHIPPING SOFTWARE"),
    (6, "THE RECORD",        "DON’T TRUST, VERIFY"),
    (7, "THE DIAL",          "OPERATOR TO REPUBLIC"),
]

MARGIN = 78
COL = W - 2 * MARGIN          # text column width
RINGS_PX = 250
RINGS_XY = (MARGIN, 62)
EYEBROW_PT = 38
KICKER_MAX = 56
PUNCH_MAX = 96
Y_EYEBROW = 150               # baseline
Y_KICKER = 505
Y_PUNCH = 612


def sh(*args):
    r = subprocess.run(args, capture_output=True)
    if r.returncode != 0:
        sys.exit(f"FAILED: {' '.join(map(str, args))}\n{r.stderr.decode()[:400]}")
    return r


def width_of(text, pt):
    r = sh("convert", "-font", FONT, "-pointsize", str(pt),
           f"label:{text}", "-format", "%w", "info:")
    return int(r.stdout.decode().strip())


def fit(text, start, box=COL):
    """Largest point size at or below `start` whose measured width fits."""
    pt = start
    while pt > 24 and width_of(text, pt) > box:
        pt -= 2
    return pt


def build_rings():
    """Cut the rings out of the flag as a white, transparent-ground PNG."""
    out = os.path.join(TMP, f"rings-{RINGS_PX}.png")
    if os.path.exists(out):
        return out
    a = os.path.join(TMP, "alpha.png")
    sh("convert", FLAG, "-colorspace", "gray", "-threshold", "60%", a)
    cut = os.path.join(TMP, "rings-full.png")
    sh("convert", "-size", "3840x2160", "xc:white", a,
       "-alpha", "off", "-compose", "CopyOpacity", "-composite",
       "-trim", "+repage", "PNG32:" + cut)
    sh("convert", cut, "-resize", f"{RINGS_PX}x{RINGS_PX}", "PNG32:" + out)
    return out


def emit(num, kicker, punch, rings):
    final = os.path.join(OUT, f"ch{num}-thumb.png")
    cmd = ["convert", "-size", f"{W}x{H}", f"xc:{NAVY}"]

    # Flattened ripple: hard-edged diagonal bands, one quiet step off the ground.
    cmd += ["-fill", SHEEN, "-stroke", "none"]
    for i in range(-2, 7):
        x = i * 250
        cmd += ["-draw",
                f"polygon {x},{H} {x+130},{H} {x+500},0 {x+370},0"]

    # The mark.
    cmd += [rings, "-geometry", f"+{RINGS_XY[0]}+{RINGS_XY[1]}", "-composite"]

    # Eyebrow + its rule, set beside the mark.
    ex = MARGIN + RINGS_PX + 44
    cmd += ["-font", FONT, "-stroke", "none",
            "-fill", SOFT, "-pointsize", str(EYEBROW_PT),
            "-annotate", f"+{ex}+{Y_EYEBROW}", f"CHAPTER {num}",
            "-fill", SOFT,
            "-draw", f"rectangle {ex},{Y_EYEBROW+22} {ex+104},{Y_EYEBROW+26}"]

    # Title block. Punch shares a baseline across the whole set.
    if kicker:
        kpt = fit(kicker, KICKER_MAX)
        cmd += ["-fill", SOFT, "-pointsize", str(kpt),
                "-annotate", f"+{MARGIN}+{Y_KICKER}", kicker]
    ppt = fit(punch, PUNCH_MAX)
    cmd += ["-fill", WHITE, "-pointsize", str(ppt),
            "-annotate", f"+{MARGIN}+{Y_PUNCH}", punch]

    cmd += ["-quality", "94", final]
    sh(*cmd)
    print(f"   ch{num}  {ppt}pt  {(kicker + ' / ') if kicker else ''}{punch}")
    return final


if __name__ == "__main__":
    rings = build_rings()
    print(f"{len(CHAPTERS)} thumbnails -> {OUT}")
    for n, k, p in CHAPTERS:
        emit(n, k, p, rings)
    print("done")
