#!/usr/bin/env python3
"""Generator for re-record manifesto Excalidraw slides.
Emits a valid .excalidraw (deliverable) + a mirror .svg (preview) per state.
Canvas 1920x1080; content authored 1080p, exported 2x -> 4K to match background.png.
"""
import json, os, html, subprocess

W, H = 1920, 1080
OUT_EX = "/home/bobalu/play/saxonberg/master/docs/manifesto"
OUT_SVG = "/tmp/claude-1000/-home-bobalu-play-saxonberg-master/78ae706e-b284-4586-b904-ddedf0aa7aaf/scratchpad/prev"
OUT_PNG = "/home/bobalu/play/saxonberg/master/docs/manifesto/exports"  # final transparent 4K PNGs (gitignored)
os.makedirs(OUT_SVG, exist_ok=True)
os.makedirs(OUT_PNG, exist_ok=True)

# ---- palette (reads on royal blue) ----
WHITE = "#ffffff"; SOFT = "#dbe4ff"
GREEN = "#69db7c"; CORAL = "#ff8787"; AMBER = "#ffd43b"; STEEL = "#74c0fc"
TRANSP = "transparent"

_seed = [1000]
def _sid():
    _seed[0] += 1
    return _seed[0]

# ---------------- Excalidraw element factories ----------------
def _base(t, x, y, w, h, stroke=WHITE, bg=TRANSP, sw=2, rough=1, op=100,
          fill="solid", roundness=None, sstyle="solid"):
    i = _sid()
    return dict(id=f"e{i}", type=t, x=x, y=y, width=w, height=h, angle=0,
                strokeColor=stroke, backgroundColor=bg, fillStyle=fill,
                strokeWidth=sw, strokeStyle=sstyle, roughness=rough, opacity=op,
                groupIds=[], frameId=None, roundness=roundness, seed=i*13 % 2000000,
                version=1, versionNonce=i*7 % 2000000, isDeleted=False,
                boundElements=[], updated=1, link=None, locked=False)

def rect(x, y, w, h, **k):
    r = _base("rectangle", x, y, w, h, **k)
    if r["roundness"] is None: r["roundness"] = {"type": 3}
    return r

def ellipse(x, y, w, h, **k):
    return _base("ellipse", x, y, w, h, **k)

def circle(cx, cy, r, **k):
    return ellipse(cx-r, cy-r, 2*r, 2*r, **k)

def diamond(x, y, w, h, **k):
    return _base("diamond", x, y, w, h, **k)

def line(pts, arrow=False, **k):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    x0, y0 = min(xs), min(ys)
    w = max(xs)-x0 or 1; h = max(ys)-y0 or 1
    e = _base("arrow" if arrow else "line", x0, y0, w, h, **k)
    e["points"] = [[p[0]-x0, p[1]-y0] for p in pts]
    e["lastCommittedPoint"] = None
    e["startBinding"] = None; e["endBinding"] = None
    e["startArrowhead"] = None
    e["endArrowhead"] = "arrow" if arrow else None
    return e

def text(x, y, s, size=28, stroke=WHITE, align="left", op=100, bold=False):
    lines = s.split("\n")
    w = int(max(len(l) for l in lines) * size * 0.56) or 10
    h = int(len(lines) * size * 1.25)
    e = _base("text", x, y, w, h, stroke=stroke, op=op)
    e.update(text=s, fontSize=size, fontFamily=1, textAlign=align,
             verticalAlign="top", containerId=None, originalText=s, lineHeight=1.25)
    return e

def anchor():
    # invisible full-frame element -> identical export bounds every state.
    # transparent stroke+bg at FULL opacity (op=0 can be dropped from export bounds
    # by some Excalidraw builds); present-but-invisible pins the 0,0..W,H crop.
    return _base("rectangle", 0, 0, W, H, stroke=TRANSP, bg=TRANSP, op=100)

# ---------------- composite glyph helpers ----------------
def stick(cx, top, scale=1.0, color=WHITE, op=100):
    """simple person: head circle + body/arms/legs"""
    hr = 14*scale
    els = [circle(cx, top+hr, hr, stroke=color, op=op, sw=2)]
    by = top+2*hr
    els.append(line([[cx, by],[cx, by+40*scale]], stroke=color, op=op))          # body
    els.append(line([[cx-22*scale, by+14*scale],[cx+22*scale, by+14*scale]], stroke=color, op=op))  # arms
    els.append(line([[cx, by+40*scale],[cx-18*scale, by+70*scale]], stroke=color, op=op))  # leg
    els.append(line([[cx, by+40*scale],[cx+18*scale, by+70*scale]], stroke=color, op=op))  # leg
    return els

def crowd(x, y, cols, rows, color=SOFT, op=100, gap=34, r=7):
    els = []
    for c in range(cols):
        for rr in range(rows):
            els.append(circle(x+c*gap, y+rr*gap, r, stroke=color, bg=color, op=op, sw=1.5))
    return els

def screen_glyph(x, y, label):
    """livestream + chat"""
    els = [rect(x, y, 170, 110, stroke=WHITE)]
    els.append(line([[x+65, y+35],[x+65, y+75],[x+105, y+55],[x+65, y+35]], stroke=WHITE))  # play tri
    for i in range(3):
        els.append(line([[x+185, y+25+i*28],[x+275, y+25+i*28]], stroke=SOFT))  # chat lines
    els.append(text(x+10, y+120, label, size=24, stroke=SOFT))
    return els

def discord_glyph(x, y, label):
    els = [rect(x, y, 200, 120, stroke=WHITE, roundness={"type":3})]
    for i in range(3):
        els.append(circle(x+30, y+30+i*30, 6, stroke=SOFT, bg=SOFT))
        els.append(line([[x+48, y+30+i*30],[x+150, y+30+i*30]], stroke=SOFT))
    els.append(text(x+10, y+130, label, size=24, stroke=SOFT))
    return els

def ring_trio(cx, cy, R, colors=(WHITE,WHITE,WHITE), labels=None, ops=(100,100,100), sw=6):
    """three interlocking rings echoing the logo: two top, one bottom"""
    centers = [(cx-0.58*R, cy-0.34*R), (cx+0.58*R, cy-0.34*R), (cx, cy+0.62*R)]
    els = []
    for (ex,ey), col, op in zip(centers, colors, ops):
        els.append(circle(ex, ey, R, stroke=col, op=op, sw=sw))
    if labels:
        offs = [(-0, -R-30), (0, -R-30), (0, R+18)]
        for (ex,ey),(dx,dy),lab,op in zip(centers, offs, labels, ops):
            els.append(text(ex - len(lab)*7, ey+dy, lab, size=24, stroke=WHITE, op=op, align="center"))
    return els, centers

def rail(y=70, slots=6, filled=0):
    els = [line([[120,y],[1500,y]], stroke=STEEL, op=55)]
    for i in range(slots):
        sx = 200 + i*210
        col = WHITE if i < filled else STEEL
        op = 90 if i < filled else 40
        els.append(circle(sx, y, 16, stroke=col, op=op, sw=2))
    return els

# ---------------- SVG mirror (for preview only) ----------------
def to_svg(elements):
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">']
    for e in elements:
        op = e.get("opacity",100)/100.0
        sc = e["strokeColor"]; sw = e.get("strokeWidth",2)
        bg = e.get("backgroundColor","transparent")
        fill = bg if bg!="transparent" else "none"
        t = e["type"]
        if t=="rectangle":
            out.append(f'<rect x="{e["x"]}" y="{e["y"]}" width="{e["width"]}" height="{e["height"]}" rx="8" fill="{fill}" stroke="{sc}" stroke-width="{sw}" opacity="{op}"/>')
        elif t=="ellipse":
            out.append(f'<ellipse cx="{e["x"]+e["width"]/2}" cy="{e["y"]+e["height"]/2}" rx="{e["width"]/2}" ry="{e["height"]/2}" fill="{fill}" stroke="{sc}" stroke-width="{sw}" opacity="{op}"/>')
        elif t=="diamond":
            x,y,w,h=e["x"],e["y"],e["width"],e["height"]
            pts=f"{x+w/2},{y} {x+w},{y+h/2} {x+w/2},{y+h} {x},{y+h/2}"
            out.append(f'<polygon points="{pts}" fill="{fill}" stroke="{sc}" stroke-width="{sw}" opacity="{op}"/>')
        elif t in ("line","arrow"):
            pts=" ".join(f"{e['x']+p[0]},{e['y']+p[1]}" for p in e["points"])
            out.append(f'<polyline points="{pts}" fill="none" stroke="{sc}" stroke-width="{sw}" opacity="{op}"/>')
            if t=="arrow" and len(e["points"])>=2:
                (ax,ay),(bx,by)=e["points"][-2],e["points"][-1]
                out.append(f'<circle cx="{e["x"]+bx}" cy="{e["y"]+by}" r="6" fill="{sc}" opacity="{op}"/>')
        elif t=="text":
            fs=e["fontSize"]
            anchor={"left":"start","center":"middle","right":"end"}[e["textAlign"]]
            for i,ln in enumerate(e["text"].split("\n")):
                out.append(f'<text x="{e["x"]}" y="{e["y"]+fs*(0.9+i*1.25)}" fill="{sc}" font-size="{fs}" font-family="DejaVu Sans" text-anchor="{anchor}" opacity="{op}">{html.escape(ln)}</text>')
    out.append('</svg>')
    return "\n".join(out)

def emit(name, elements):
    doc = dict(type="excalidraw", version=2, source="https://excalidraw.com",
               elements=[anchor()]+elements,
               appState=dict(gridSize=None, viewBackgroundColor="transparent", theme="light"),
               files={})
    with open(f"{OUT_EX}/{name}.excalidraw","w") as f: json.dump(doc,f)
    svgp = f"{OUT_SVG}/{name}.svg"
    with open(svgp,"w") as f: f.write(to_svg(elements))
    # final deliverable: transparent 4K PNG (density 192 on a 1920x1080 SVG -> 3840x2160).
    # heavy frames can trip ImageMagick's time-limit policy -> fall back to a 96-density
    # render upscaled to 4K (slightly softer but complete).
    pngp = f"{OUT_PNG}/{name}.png"
    r = subprocess.run(["convert","-background","none","-density","192",svgp,pngp],
                       check=False, capture_output=True)
    if r.returncode != 0 or not os.path.exists(pngp):
        subprocess.run(["convert","-background","none","-density","96",svgp,
                        "-resize","3840x2160",pngp], check=False)
    print("wrote", name)

# ================= BEAT 0 =================
def beat0():
    # 0.1 two communities
    s1 = screen_glyph(230, 250, "a livestream + chat") + discord_glyph(650, 245, "a Discord")
    emit("rerecord-ch1-0-1", s1)

    # 0.2 one hand over both, crowd with no say
    hand = [text(360, 90, "one hand decides everything", size=30, stroke=WHITE),
            line([[560,150],[440,235]], arrow=True, stroke=WHITE),
            line([[560,150],[760,235]], arrow=True, stroke=WHITE)]
    cr = crowd(240, 470, 12, 3, color=STEEL, op=70)
    emit("rerecord-ch1-0-2", s1 + hand + cr)

    # 0.3 crowd grows, spokes crack
    crack = [line([[560,150],[430,235]], stroke=CORAL, sw=3),
             line([[560,150],[770,235]], stroke=CORAL, sw=3),
             line([[600,180],[585,205],[615,220],[600,245]], stroke=CORAL, sw=3),
             text(360, 90, "works small — breaks as it grows", size=30, stroke=CORAL)]
    cr2 = crowd(200, 470, 20, 4, color=STEEL, op=70)
    emit("rerecord-ch1-0-3", s1 + crack + cr2)

    # 0.4 balanced-forces rig replaces it
    beam = [line([[380,300],[900,300]], stroke=GREEN, sw=4),                 # level beam
            line([[640,300],[640,260]], stroke=GREEN, sw=3),                 # fulcrum
            circle(440,300,26,stroke=GREEN,sw=3), circle(640,300,26,stroke=GREEN,sw=3), circle(840,300,26,stroke=GREEN,sw=3),
            text(300, 360, "scales  ·  balances the community's forces", size=30, stroke=WHITE)]
    emit("rerecord-ch1-0-4", beam)

    # 0.5 game engine gets people to show up
    game = beam + [rect(520, 470, 240, 150, stroke=WHITE),
                   circle(640, 545, 42, stroke=WHITE, sw=3),
                   line([[625,530],[625,560],[660,545],[625,530]], stroke=WHITE, sw=2),
                   text(430, 640, "a game gets people to show up and care", size=30, stroke=WHITE)]
    game += [line([[300,545],[500,545]], arrow=True, stroke=AMBER),
             line([[980,545],[790,545]], arrow=True, stroke=AMBER)]
    emit("rerecord-ch1-0-5", game)

    # 0.6 transition: empty assembly rail
    emit("rerecord-ch1-0-6", rail(70, 6, 0) + [text(700, 150, "here's the whole thing —", size=30, stroke=SOFT)])

def ctext(cx, y, s, size=28, stroke=WHITE, op=100):
    w = int(max(len(l) for l in s.split("\n")) * size * 0.56) or 10
    return text(int(cx - w/2), y, s, size=size, stroke=stroke, op=op, align="left")

def station(x, y, w, h, title, sub=None, color=WHITE, op=100):
    els = [rect(x, y, w, h, stroke=color, op=op)]
    els.append(ctext(x+w/2, y+18, title, size=26, stroke=color, op=op))
    if sub:
        els.append(ctext(x+w/2, y+h-42, sub, size=20, stroke=SOFT, op=op))
    return els

def gear(cx, cy, r, color=GREEN, op=100):
    els=[circle(cx,cy,r,stroke=color,op=op), circle(cx,cy,r*0.4,stroke=color,op=op)]
    import math
    for k in range(8):
        a=k*math.pi/4
        els.append(line([[cx+r*math.cos(a),cy+r*math.sin(a)],[cx+(r+8)*math.cos(a),cy+(r+8)*math.sin(a)]],stroke=color,op=op,sw=3))
    return els

def coin(cx, cy, r=22, color=AMBER, op=100, label="$"):
    return [circle(cx,cy,r,stroke=color,op=op,sw=3), ctext(cx, cy-14, label, size=26, stroke=color, op=op)]

# ================= BEAT 1 =================
def beat1():
    r1=rail(70,6,0)
    emit("rerecord-ch1-1-1", r1+[ctext(760,300,"GAME",size=90),ctext(1010,300,"=",size=70,stroke=SOFT),ctext(1260,300,"GOVERNMENT",size=64)])
    # EVE emergent society
    nodes=[(560,360,"corporations"),(900,300,"alliances"),(760,560,"an economy")]
    eve=[ctext(760,120,"a real society, emerged on its own  (EVE Online)",size=28,stroke=SOFT)]
    for (x,y,l) in nodes: eve+= [circle(x,y,40,stroke=STEEL,sw=3)]+[ctext(x,y+52,l,size=22,stroke=SOFT)]
    eve+=[line([[600,375],[860,320]],stroke=STEEL,op=70),line([[880,340],[790,520]],stroke=STEEL,op=70),line([[600,395],[730,525]],stroke=STEEL,op=70)]
    emit("rerecord-ch1-1-2", r1+eve)
    # MUD genre card
    card=[rect(560,260,560,240,stroke=WHITE)]
    card+=[ctext(840,290,"a modern MUD",size=40)]
    for i,l in enumerate(["a text-based world  ·  like a text MMO","the government built in on purpose"]):
        card+=[ctext(840,370+i*48,l,size=24,stroke=SOFT)]
    emit("rerecord-ch1-1-3", r1+card)
    # THREE RINGS (the motif) — spine words only; gloss is spoken
    rings,centers=ring_trio(820,470,190,labels=["labor","capital","consumer"])
    emit("rerecord-ch1-1-4", [ctext(820,110,"three kinds of contributor",size=30,stroke=SOFT)]+rings)
    # wall + blocked coin
    wall=[rect(430,260,40,300,stroke=WHITE,bg="#ffffff",fill="solid",op=100)]
    wall+=stick(360,330,1.0,WHITE)
    wall+=[line([[430,360],[400,360]],arrow=True,stroke=CORAL,sw=3)]
    wall+=coin(760,400,26,CORAL,label="$")
    wall+=[line([[760,440],[760,500]],stroke=CORAL,sw=3),line([[735,475],[785,475]],stroke=CORAL,sw=3,sstyle="solid")]
    wall+=[ctext(760,540,"can't walk through a wall  ·  can't spend money you don't have",size=22,stroke=SOFT)]
    emit("rerecord-ch1-1-5", wall)
    # fork: machine vs human
    fork=[line([[760,240],[760,340]],stroke=WHITE,sw=3),
          line([[760,340],[520,430]],stroke=WHITE,sw=3),line([[760,340],[1000,430]],stroke=WHITE,sw=3),
          ctext(760,190,"some rules can't reduce to code",size=28,stroke=SOFT)]
    fork+=gear(520,500,46,GREEN)+[ctext(520,580,"machine-enforced",size=22,stroke=GREEN)]
    fork+=stick(1000,455,1.2,STEEL)+[ctext(1000,590,"needs a human to judge",size=22,stroke=STEEL)]
    emit("rerecord-ch1-1-6", fork)

# ================= BEAT 2 =================
def beat2():
    r=rail(70,6,1)
    fig=stick(360,300,1.2,WHITE)+[circle(360,270,10,stroke=AMBER,bg=AMBER)]+[ctext(360,430,"you want to change a rule",size=22,stroke=SOFT)]
    emit("rerecord-ch1-2-1", r+fig)
    floor=[line([[300,560],[1250,560]],stroke=WHITE,sw=4),ctext(775,610,"one open floor — every proposal goes here",size=26,stroke=SOFT)]
    floor+=[rect(720,500,110,50,stroke=AMBER)]  # the slip dropped
    floor+=[line([[400,300],[700,490]],arrow=True,stroke=STEEL,op=60)]
    floor+=[ctext(1050,330,"not petition\nan authority",size=22,stroke=CORAL)]+[line([[1120,380],[1120,430]],stroke=CORAL,sw=3),line([[1095,405],[1145,405]],stroke=CORAL,sw=3,sstyle="solid")]
    emit("rerecord-ch1-2-2", r+floor)
    floor2=[line([[300,560],[1250,560]],stroke=WHITE,sw=4),ctext(775,610,"anyone can — the community decides",size=26)]
    for i,x in enumerate([500,640,780,920]):
        floor2+=[rect(x-55,500,110,50,stroke=AMBER,op=90)]
    floor2+=[line([[430,250],[520,490]],arrow=True,stroke=STEEL,op=60),line([[1120,250],[960,490]],arrow=True,stroke=STEEL,op=60)]
    emit("rerecord-ch1-2-3", r+floor2)

# ================= BEAT 3 =================
def beat3():
    r=rail(70,6,2)
    spine=[rect(700,250,150,60,stroke=WHITE)]+[ctext(775,262,"proposal",size=22)]
    kids=[(500,430,"support",GREEN),(775,470,"objection",AMBER),(1050,430,"question",STEEL)]
    m=[]
    for (x,y,l,c) in kids:
        m+=[rect(x-80,y,160,54,stroke=c)]+[ctext(x,y+12,l,size=20,stroke=c)]
    edges=[line([[730,310],[520,430]],stroke=SOFT,op=70),line([[775,310],[775,470]],stroke=SOFT,op=70),line([[820,310],[1050,430]],stroke=SOFT,op=70)]
    thumb=[ctext(1180,250,"no upvotes",size=22,stroke=CORAL)]+[line([[1230,290],[1230,330]],stroke=CORAL,sw=3),line([[1205,310],[1255,310]],stroke=CORAL,sw=3)]
    emit("rerecord-ch1-3-1", r+spine+m+edges+thumb+[ctext(775,160,"argued — organized by how claims answer each other",size=26,stroke=SOFT)])
    # objection lit
    lit=[circle(775,497,60,stroke=AMBER,op=60,sw=3)]+[ctext(775,590,"unanswered — stays lit",size=22,stroke=AMBER)]
    emit("rerecord-ch1-3-2", r+spine+m+edges+lit)
    # structured not a mob
    mob=[ctext(1120,430,"a mob",size=24,stroke=CORAL)]
    for i in range(30):
        import math
        a=i*2.3; rr=60+ (i%5)*10
        mob+=[circle(1120+rr*math.cos(a),470+rr*math.sin(a)*0.6,4,stroke=CORAL,bg=CORAL,op=70,sw=1)]
    mob+=[line([[1030,380],[1210,560]],stroke=CORAL,sw=4),line([[1210,380],[1030,560]],stroke=CORAL,sw=4)]
    emit("rerecord-ch1-3-3", r+spine+m+edges+[ctext(500,640,"structured, not a mob",size=26)]+mob)

# ================= BEAT 4 =================
def beat4():
    r=rail(70,6,3)
    rings,centers=ring_trio(700,430,175,labels=["labor","capital","consumer"])
    head=[ctext(700,110,"each force gets its own chamber",size=28,stroke=SOFT)]
    emit("rerecord-ch1-4-1", r+head+rings)
    # 2 of 3 lit green
    rings2,c2=ring_trio(700,430,175,colors=(GREEN,GREEN,WHITE),labels=["labor","capital","consumer"])
    pass_=[ctext(1150,380,"2 of 3 = PASS",size=30,stroke=GREEN)]+[ctext(1150,440,"can't pull one\nring free",size=22,stroke=SOFT)]
    emit("rerecord-ch1-4-2", r+rings2+pass_)
    # same crowd counted three ways
    cr=crowd(560,640,14,3,color=STEEL,op=80)
    tallies=[line([[700,700],[560,540]],arrow=True,stroke=SOFT,op=60),line([[720,700],[760,540]],arrow=True,stroke=SOFT,op=60),line([[740,700],[880,540]],arrow=True,stroke=SOFT,op=60)]
    emit("rerecord-ch1-4-3", r+rings+cr+tallies+[ctext(700,760,"same crowd, counted three ways",size=24,stroke=SOFT)])
    # standing token handed by others
    st=[ctext(760,140,"standing — earned, and given to you by others",size=26,stroke=SOFT)]
    st+=[diamond(720,300,80,80,stroke=AMBER)]+[ctext(760,325,"◆",size=20,stroke=AMBER)]
    st+=[line([[560,360],[700,330]],arrow=True,stroke=WHITE,op=80),line([[980,360],[830,330]],arrow=True,stroke=WHITE,op=80)]
    st+=stick(500,360,1.0,STEEL)+stick(1020,360,1.0,STEEL)
    st+=[ctext(760,430,"spent by holding a position over time",size=22,stroke=SOFT)]
    emit("rerecord-ch1-4-4", r+st)
    # capital firewall
    fw,cf=ring_trio(700,430,175,colors=(WHITE,GREEN,WHITE),labels=["labor","capital","consumer"])
    fwc=coin(cf[1][0],cf[1][1],24,GREEN,label="$")
    bounce=[line([[cf[1][0],cf[1][1]],[cf[0][0]+40,cf[0][1]]],stroke=CORAL,sw=3),
            line([[cf[1][0],cf[1][1]],[cf[2][0],cf[2][1]-40]],stroke=CORAL,sw=3)]
    world=[rect(1120,360,150,90,stroke=CORAL)]+[ctext(1195,392,"the world",size=22,stroke=CORAL)]+[line([[cf[1][0]+40,cf[1][1]],[1120,410]],stroke=CORAL,sw=3)]
    emit("rerecord-ch1-4-5", r+fw+fwc+bounce+world+[ctext(700,760,"money: real voice in its own chamber — never a vote in the others, never an advantage in the world",size=22,stroke=SOFT)])

# ================= BEAT 5 =================
def beat5():
    r=rail(70,6,4)
    base=r+[ctext(910,140,"a law is a change to the code — built like software",size=28,stroke=SOFT)]
    y=280;h=200;w=420
    x1,x2,x3=140,730,1320
    p=base+[line([[x1+w,y+h/2],[x2,y+h/2]],arrow=True,stroke=SOFT,op=70),line([[x2+w,y+h/2],[x3,y+h/2]],arrow=True,stroke=SOFT,op=70)]
    p+=[rect(x1,y,w,h,stroke=STEEL,op=40),rect(x2,y,w,h,stroke=STEEL,op=40),rect(x3-0,y,W-x3-40,h,stroke=STEEL,op=40)]
    emit("rerecord-ch1-5-1", p)
    s1=station(x1,y,w,h,"LEGISLATURE","requirement — what should be true")
    emit("rerecord-ch1-5-2", base+s1+[line([[x1+w,y+h/2],[x2,y+h/2]],arrow=True,stroke=SOFT,op=70)])
    s2=station(x2,y,w,h,"EXECUTIVE","builds it")
    s2+=gear(x2+130,y+130,34,GREEN)+stick(x2+300,y+95,0.9,STEEL)
    emit("rerecord-ch1-5-3", base+s1+s2+[line([[x1+w,y+h/2],[x2,y+h/2]],arrow=True,stroke=SOFT,op=70),line([[x2+w,y+h/2],[x3,y+h/2]],arrow=True,stroke=SOFT,op=70)])
    s3=station(x3,y,W-x3-40,h,"JUDICIARY")
    cxj=x3+(W-x3-40)/2
    s3+=[ctext(cxj,y+95,"reads the code",size=22,stroke=GREEN),ctext(cxj,y+135,"hears the appeal",size=22,stroke=AMBER)]
    emit("rerecord-ch1-5-4", base+s1+s2+s3+[line([[x1+w,y+h/2],[x2,y+h/2]],arrow=True,stroke=SOFT,op=70),line([[x2+w,y+h/2],[x3,y+h/2]],arrow=True,stroke=SOFT,op=70)])
    green=[rect(x1,y,w,h,stroke=GREEN,op=90),rect(x2,y,w,h,stroke=GREEN,op=90),rect(x3,y,W-x3-40,h,stroke=GREEN,op=90)]
    emit("rerecord-ch1-5-5", base+s1+s2+s3+green+[ctext(910,540,"requirements · build · review — governing is shipping software",size=26)])

# ================= BEAT 6 =================
def beat6():
    r=rail(70,6,5)
    labels=["proposal","counts","code","ruling"]
    chain=[];x=360
    for i,l in enumerate(labels):
        chain+=[rect(x,320,180,80,stroke=WHITE)]+[ctext(x+90,346,l,size=22)]
        if i<3: chain+=[line([[x+180,360],[x+230,360]],stroke=SOFT)]
        x+=230
    crack=[line([[x-230+90,300],[x-230+70,340],[x-230+110,360],[x-230+90,400]],stroke=CORAL,sw=4)]
    emit("rerecord-ch1-6-1", r+chain+crack+[ctext(760,220,"written to a record no one can quietly rewrite",size=26,stroke=SOFT)])
    verify=stick(700,470,1.0,WHITE)+[line([[760,500],[900,470]],arrow=True,stroke=GREEN),ctext(1010,455,"60–40 ✓",size=30,stroke=GREEN),ctext(760,600,"check it yourself",size=26)]
    emit("rerecord-ch1-6-2", r+chain+verify)

# ================= CLOSE =================
def close():
    import math
    r=rail(70,6,6)
    # assembled machine (mini glyphs) center-left
    mach=[rect(300,250,900,300,stroke=STEEL,op=40)]
    for i,(gx,l) in enumerate([(400,"floor"),(600,"argue"),(800,"chambers"),(1000,"record")]):
        mach+=[circle(gx,360,34,stroke=WHITE)]+[ctext(gx,410,l,size=20,stroke=SOFT)]
        if i<3: mach+=[line([[gx+34,360],[gx+166,360]],arrow=True,stroke=SOFT,op=60)]
    ghosts=[ctext(760,180,"one machine any community can pick up",size=28,stroke=SOFT)]
    for gx in [300,760,1180]:
        ghosts+=[rect(gx-40,600,80,50,stroke=STEEL,op=35)]
    emit("rerecord-ch1-close-1", r+mach+ghosts)
    # the dial
    def dial(frac):
        cx,cy,R=700,470,150
        arc=[]
        for k in range(0,181,10):
            a=math.pi - k*math.pi/180
            arc.append([cx+R*math.cos(a),cy-R*math.sin(a)])
        els=[line(arc,stroke=WHITE,sw=3)]
        els+=[ctext(cx-R,cy+40,"operator",size=20,stroke=SOFT),ctext(cx+R,cy+40,"republic",size=20,stroke=SOFT)]
        a=math.pi-frac*math.pi
        els+=[line([[cx,cy],[cx+R*0.9*math.cos(a),cy-R*0.9*math.sin(a)]],arrow=True,stroke=AMBER,sw=4)]
        els+=[circle(cx,cy,8,stroke=WHITE,bg=WHITE)]
        return els
    emit("rerecord-ch1-close-2", r+dial(0.0)+[ctext(700,120,"a dial: operator → republic",size=30)])
    emit("rerecord-ch1-close-3", r+dial(0.0)+stick(700,640,0.9,STEEL)+[ctext(700,740,"starts at the operator end — one founder holds it all",size=24,stroke=SOFT)])
    emit("rerecord-ch1-close-4", r+dial(0.45)+[ctext(700,700,"opens up as far, as fast, as the founder chooses — nobody forced",size=24,stroke=SOFT)])
    fin=r+dial(0.45)+[ctext(700,690,"the structure doesn't make you give it away —",size=26)]+[ctext(700,730,"it just makes it safe to",size=26,stroke=GREEN)]
    emit("rerecord-ch1-close-5", fin)

beat0(); beat1(); beat2(); beat3(); beat4(); beat5(); beat6(); close()
print("done")
