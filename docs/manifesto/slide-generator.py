#!/usr/bin/env python3
"""
Manifesto re-record — slide generator (Ch 1 = the hero montage).

Emits transparent 4K PNGs -> docs/manifesto/exports/ (Descript drops them over the
blue background layer). SVG-native; no Excalidraw.

DESIGN (converged — see memory `manifesto-visuals-batch-mode`):
  * VISUAL-FIRST. Every beat is a diagram; abstract "why it matters" lines are camera
    moments in Descript, never text cards.
  * HERO-PER-CHAPTER. Each downstream chapter has ONE central graphic; Ch 1 shows them
    at altitude, then chapters revisit in depth.
  * The three rings are the LEGISLATIVE chambers only — not the whole-system motif.
  * Draw a structure once where it's established; consequences get said, not re-drawn.
  * dots-as-people. No stick figures / gears / decorative rails.
  * Cam keep-out: nothing load-bearing past x>1500 AND y>820.
  * ImageMagick ignores fill-opacity -> use SOLID or DARK(#0a2c55) fills, or stroke-only.
Run: python3 slide-generator.py
"""
import html, subprocess, os, math

W,H=1920,1080
HERE=os.path.dirname(os.path.abspath(__file__))
OUT_PNG=os.path.join(HERE,"exports"); OUT_SVG=os.path.join(OUT_PNG,"_svg")
os.makedirs(OUT_PNG,exist_ok=True); os.makedirs(OUT_SVG,exist_ok=True)

WHITE="#ffffff"; SOFT="#c7d6f5"; DIM="#8fa9d8"; DIMB="#3f5a86"
CORAL="#ff8787"; STEEL="#6f9ae0"; GREEN="#69db7c"; AMBER="#ffd43b"; DARK="#0a2c55"

def T(x,y,s,size=32,fill=WHITE,anchor="start",weight="normal",op=1.0,mono=False):
    fam="DejaVu Sans Mono" if mono else "DejaVu Sans"
    return (f'<text x="{x}" y="{y}" fill="{fill}" font-size="{size}" font-family="{fam}" '
            f'font-weight="{weight}" text-anchor="{anchor}" opacity="{op}">{html.escape(s)}</text>')
def CT(cx,y,s,size=32,fill=WHITE,weight="normal",op=1.0,mono=False): return T(cx,y,s,size,fill,"middle",weight,op,mono)
def C(cx,cy,r,stroke=WHITE,sw=3,fill="none",op=1.0):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-opacity="{op}"/>'
def L(x1,y1,x2,y2,stroke=WHITE,sw=3,op=1.0,dash=None):
    d=f' stroke-dasharray="{dash}"' if dash else ""
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{sw}" stroke-opacity="{op}"{d}/>'
def R(x,y,w,h,stroke=WHITE,sw=3,fill="none",rx=12,op=1.0):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-opacity="{op}"/>'
def PATH(d,stroke=WHITE,sw=3,fill="none",op=1.0,dash=None):
    ds=f' stroke-dasharray="{dash}"' if dash else ""
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-opacity="{op}"{ds}/>'
def ARR(x1,y1,x2,y2,stroke=WHITE,sw=4,op=1.0):
    a=math.atan2(y2-y1,x2-x1); h=15
    p1=(x2-h*math.cos(a-0.42),y2-h*math.sin(a-0.42)); p2=(x2-h*math.cos(a+0.42),y2-h*math.sin(a+0.42))
    return [L(x1,y1,x2,y2,stroke,sw,op), f'<polygon points="{x2},{y2} {p1[0]},{p1[1]} {p2[0]},{p2[1]}" fill="{stroke}" opacity="{op}"/>']
def person(x,y,r=11,col=STEEL,op=1.0): return C(x,y,r,col,2,col,op)
def BAR(x,y,w,h,frac,col):  # meter: outline + solid filled fraction (no fill-opacity)
    return [R(x,y,w,h,SOFT,2), f'<rect x="{x+3}" y="{y+3+h-6-(h-6)*frac}" width="{w-6}" height="{(h-6)*frac}" rx="4" fill="{col}"/>']
def seat(x,y,filled,col=WHITE):  # a chair; a person seated if filled
    c=col if filled else DIMB
    g=[R(x-38,y,76,16,c,3,fill=c if filled else "none"),R(x-38,y-58,14,58,c,3,fill=c if filled else "none")]
    g+=[L(x-30,y+16,x-30,y+40,c,3),L(x+30,y+16,x+30,y+40,c,3)]
    if filled: g+=[C(x+6,y-28,15,col,2,col)]
    return g

# ── Beat 0: why current tools fail ──
def f_hub():
    g=[CT(860,120,"every decision routes through one point",40,SOFT)]
    hx,hy=800,560
    for i in range(30):
        a=i*(2*math.pi/30); r=340; x,y=hx+r*math.cos(a),hy+r*math.sin(a)*0.80
        g+=[L(hx,hy,x,y,STEEL,2,0.5), person(x,y,12,STEEL)]
    g+=[C(hx,hy,50,CORAL,7,DARK), CT(hx,hy+18,"1",56,CORAL,weight="bold")]
    g+=[CT(860,1010,"it works small. it cannot scale.",34,WHITE)]
    return g

# ── Ch 2 hero: games get your hours, governing doesn't → put the gov IN the game ──
# builds: game bar → empty governing bar → the graveyard (Beat 3) → the turn
def f_opener(stage=4):
    g=[CT(860,120,"people pour themselves into games — and not into governing",38,SOFT)]
    base=720; bw=200; gx=430; gh=420; cx=930; ch=42
    g+=[L(gx-40,base,cx+bw+40,base,SOFT,2,0.5)]
    g+=[R(gx,base-gh,bw,gh,GREEN,3,fill=GREEN),CT(gx+bw/2,base-gh-72,"hundreds of hours",22,SOFT),
        CT(gx+bw/2,base-gh-30,"a game",30,GREEN,weight="bold"),
        CT(gx+bw/2,base+42,"a character you built",22,SOFT),CT(gx+bw/2,base+76,"a reputation you earned",22,SOFT)]
    if stage>=2:
        g+=[R(cx,base-ch,bw,ch,DIMB,3),CT(cx+bw/2,base-ch-30,"governing",30,DIMB,weight="bold"),
            CT(cx+bw/2,base+42,"the meeting nobody",22,DIM),CT(cx+bw/2,base+76,"comes to",22,DIM)]
    if stage>=3:  # Beat 3 — the graveyard of prior digital attempts
        g+=[CT(860,858,"the DAOs · the online democracies · the token votes — built it, and nobody came",26,CORAL)]
    if stage>=4:  # the turn
        g+=[PATH(f"M {gx+bw+30} {base-gh+60} C {gx+bw+220} {base-gh+40}, 1360 {base-260}, 1360 {base-120}",AMBER,4)]
        g+=ARR(1360,base-140,1360,base-70,AMBER,4)
        g+=[CT(1440,base-300,"the participation",26,AMBER),CT(1440,base-262,"is real —",26,AMBER),
            CT(1440,base-40,"just aimed",24,SOFT),CT(1440,base-6,"at games",24,SOFT)]
        g+=[CT(860,958,"so we aim a game at governing — and put the government inside it",32,WHITE)]
    return g

# ── Ch 3 hero: the three rings (legislative chambers) ──
def rings(cx,cy,Rr,cols=(WHITE,WHITE,WHITE),sw=7,labels=True):
    cs=[(cx-0.58*Rr,cy-0.34*Rr),(cx+0.58*Rr,cy-0.34*Rr),(cx,cy+0.62*Rr)]
    g=[C(ex,ey,Rr,col,sw) for (ex,ey),col in zip(cs,cols)]
    if labels:
        g+=[CT(cs[0][0]-40,cs[0][1]-Rr-28,"labor",32,WHITE),CT(cs[1][0]+40,cs[1][1]-Rr-28,"capital",32,WHITE),
            CT(cs[2][0],cs[2][1]+Rr+56,"consumer",32,WHITE)]
    return g,cs
def f_rings(lit=False,title="three kinds of contributor",cap="none can be pulled free of the other two"):
    cols=(GREEN,GREEN,WHITE) if lit else (WHITE,WHITE,WHITE)
    g=[CT(860,120,title,40,SOFT)]; r,_=rings(830,545,215,cols); g+=r
    if lit: g+=[CT(1500,520,"2 of 3",44,GREEN,weight="bold"),CT(1500,575,"= PASS",30,GREEN)]
    g+=[CT(830,1010,cap,34,WHITE)]; return g

# ── Beat ①: the code/judgment fork (sets up Ch 5 executive) ──
def f_fork():
    g=[CT(860,120,"not every rule reduces to code",40,SOFT), L(860,190,860,330,WHITE,4)]
    g+=ARR(860,330,560,470,GREEN,4)+ARR(860,330,1160,470,AMBER,4)
    g+=[R(400,490,330,170,GREEN,5), CT(565,560,"the machine holds it",30,GREEN), CT(565,610,"closed — no discretion",24,SOFT)]
    x0,y0,w0,h0=1000,490,330,170
    g+=[PATH(f"M {x0} {y0} L {x0} {y0+h0} L {x0+w0} {y0+h0} L {x0+w0} {y0}",AMBER,5),
        PATH(f"M {x0} {y0} L {x0+w0*0.22} {y0}",AMBER,5),PATH(f"M {x0+w0*0.78} {y0} L {x0+w0} {y0}",AMBER,5),
        CT(x0+w0/2,560,"a person must judge",30,AMBER),CT(x0+w0/2,610,"open — stays open",24,SOFT)]
    g+=[CT(860,1010,"one half closes itself. the other never will.",34,WHITE)]; return g

# ── Beat ②: the open floor (convergence vs gatekeeper) ──
def f_openfloor():
    g=[CT(860,110,"you don't lobby whoever's in charge — you put it down in the open",34,SOFT)]
    g+=[CT(470,215,"petition an authority",26,CORAL)]; gate=(470,560)
    for i in range(9):
        a=math.radians(200+i*17); x=gate[0]+230*math.cos(a); y=gate[1]-40+230*math.sin(a)*0.7
        g+=[person(x,y,10,CORAL,0.85)]+ARR(x,y,gate[0]-10,gate[1]-30,CORAL,2,0.7)
    g+=[R(gate[0]-55,gate[1]-20,110,150,CORAL,4),CT(gate[0],gate[1]+70,"1",44,CORAL,weight="bold"),
        L(360,300,600,760,CORAL,6,0.9),L(600,300,360,760,CORAL,6,0.9)]
    g+=[CT(1240,215,"one open floor",26,WHITE)]; fx0,fx1,fy=920,1560,600
    g+=[L(fx0,fy,fx1,fy,WHITE,6)]; slots=[1000,1090,1180,1270,1360,1450]
    for sx in slots: g+=[R(sx-28,fy-46,56,44,AMBER,3)]
    for i,sx in enumerate(slots): g+=[person(fx0+40+i*100,270+(i%2)*30,10,STEEL)]+ARR(fx0+40+i*100,282+(i%2)*30,sx,fy-52,STEEL,2,0.7)
    g+=[CT(1240,700,"anyone puts one down — where everyone can see",24,SOFT)]; return g

# ── Ch 4 hero: the claim graph (builds: claims attach -> one answered -> one stays open) ──
def f_graph(stage=3):
    g=[CT(860,105,"claims attach by how they answer each other",38,SOFT)]
    def node(x,y,w,label,col): return [R(x-w/2,y,w,64,col,3),CT(x,y+42,label,28,col)]
    g+=node(830,175,300,"proposal",WHITE)+node(450,395,290,"supports",GREEN)+node(830,395,300,"objects to",CORAL)+node(1250,395,300,"objects to",CORAL)
    g+=[L(760,239,530,395,GREEN,3),CT(590,300,"supports",22,GREEN),L(830,239,830,395,CORAL,3),CT(880,320,"objects to",22,CORAL),
        L(900,239,1190,395,CORAL,3),CT(1090,295,"objects to",22,CORAL)]
    if stage>=2:  # one objection gets answered -> closes
        g+=node(830,640,300,"answers it",GREEN)+[L(830,459,830,640,GREEN,3),CT(880,560,"answers",22,GREEN),CT(830,760,"answered → closed",26,GREEN)]
    if stage>=3:  # the other has no answer -> stays open
        g+=[C(1250,427,125,AMBER,4,op=0.5),C(1250,427,155,AMBER,2,op=0.25),CT(1250,620,"nothing answers it",26,AMBER),CT(1250,665,"STAYS OPEN",32,AMBER,weight="bold")]
        g+=[CT(830,1010,"you cannot bury it — only answer it",34,WHITE)]
    return g

# ── Ch 5 hero: the pipeline with remand (builds: stations -> ships -> remand) ──
def f_pipeline(stage=3):
    g=[CT(860,110,"decide  ·  build  ·  check",40,SOFT)]; sy,sh,sw_=330,180,380
    for (sx,t1,t2) in [(120,"REQUIREMENT","what should be true"),(560,"BUILD","make it real"),(1000,"REVIEW","did it do what was asked?")]:
        g+=[R(sx,sy,sw_,sh,WHITE,4),CT(sx+sw_/2,sy+70,t1,32,WHITE,weight="bold"),CT(sx+sw_/2,sy+125,t2,24,SOFT)]
    g+=ARR(500,sy+sh/2,560,sy+sh/2,SOFT,4)+ARR(940,sy+sh/2,1000,sy+sh/2,SOFT,4)
    if stage>=2:  # conforms -> ships
        g+=ARR(1380,sy+sh/2,1462,sy+sh/2,GREEN,5)+[CT(1420,sy+sh/2-30,"ships",26,GREEN)]
    if stage>=3:  # misses -> remand loop back to build
        g+=[PATH(f"M 1190 {sy+sh} C 1190 {sy+sh+150}, 750 {sy+sh+150}, 750 {sy+sh+6}",CORAL,4)]+ARR(752,sy+sh+40,750,sy+sh+8,CORAL,4)
        g+=[CT(970,sy+sh+185,"misses → here's exactly where",28,CORAL),CT(860,1020,"the court says where it misses; the builder decides how to fix it",32,WHITE)]
    return g

# ── the SPINE: master architecture (assembles across the branch beats) ──
def master(level=4,pop="many",title="the model — three co-equal branches on one record",cap=None,sub=None):
    g=[CT(860,92,title,38,SOFT)]; colx=[170,610,1050]; colw=380; cy0=180; ch=430
    lit=AMBER if pop=="one" else WHITE
    # left->right = process order (matches the pipeline): legislative -> executive -> judicial
    heads=[("LEGISLATIVE","three chambers — two of three"),("EXECUTIVE","institutions, headed by a PM"),("JUDICIAL","juries empaneled from a pool")]
    show=[level>=2,level>=3,level>=4]
    for i,(x,(t1,t2)) in enumerate(zip(colx,heads)):
        on=show[i]; g+=[R(x,cy0,colw,ch,WHITE if on else STEEL,4,op=1 if on else 0.45),
            CT(x+colw/2,cy0+52,t1,32,WHITE if on else DIM,weight="bold")]
        if on: g+=[CT(x+colw/2,cy0+96,t2,21,SOFT)]
    if show[0]:  # LEGISLATIVE (rings) — left column
        x=colx[0]; rc=(x+colw/2,cy0+250); cols=(AMBER,AMBER,AMBER) if pop=="one" else (WHITE,WHITE,WHITE)
        r,_=rings(rc[0],rc[1],62,cols,sw=5,labels=False); g+=r+[CT(rc[0],cy0+385,"labor · capital · consumer",20,SOFT)]
    if show[1]:  # EXECUTIVE — middle column
        x=colx[1]; g+=[person(x+colw/2,cy0+175,26,lit),CT(x+colw/2,cy0+150,"PM",20,SOFT)]
        for k in range(3):
            bx=x+52+k*100; g+=[R(bx,cy0+250,80,72,WHITE,3),L(x+colw/2,cy0+201,bx+40,cy0+250,SOFT,2,0.6)]
        g+=[CT(x+colw/2,cy0+385,"institutions",20,SOFT)]
    if show[2]:  # JUDICIAL (pool -> panel) — right column
        x=colx[2]; pc=(x+106,cy0+248)
        if pop=="one": g+=[person(pc[0],pc[1],10,STEEL)]
        else:
            for k in range(14):
                a=k*(2*math.pi/14); rr=60; g+=[person(pc[0]+rr*math.cos(a),pc[1]+rr*math.sin(a),9,STEEL)]
        g+=[C(pc[0],pc[1],84,STEEL,2,op=0.5),CT(pc[0],cy0+385,"the pool",20,SOFT)]
        px,py=x+266,cy0+198; g+=[R(px-14,py-10,104,116,SOFT,2,rx=16,op=0.55)]
        for (dx,dy) in ([(40,48)] if pop=="one" else [(12,18),(58,12),(28,58),(68,64)]): g+=[person(px+dx,py+dy,13,lit)]
        g+=[CT(px+38,cy0+385,"drawn by lot",20,SOFT),L(pc[0]+90,pc[1],px-22,cy0+248,SOFT,2,0.6,dash="6 6")]
    if level>=5:
        ry=690; g+=[R(colx[0],ry,colx[2]+colw-colx[0],120,GREEN,6,fill=DARK),CT(860,ry+52,"THE RECORD",30,WHITE,weight="bold"),
            CT(860,ry+92,"tamper-evident — every step above is written here",22,SOFT)]
        for x in colx: g+=[L(x+colw/2,cy0+ch,x+colw/2,ry,SOFT,2,0.55,dash="7 7")]
    if cap: g+=[CT(860,900,cap,34,AMBER if pop=="one" else WHITE)]
    if sub: g+=[CT(860,960,sub,28,SOFT)]
    return g

# ── Ch 7 hero: the dial on a fixed floor ──
def f_continuum(safe_line="the setting moves. the floor doesn't."):
    g=[CT(860,110,"one dial. one floor.",40,SOFT)]; ax0,ax1,ay=260,1420,360
    g+=[L(ax0,ay,ax1,ay,WHITE,5)]
    for xx in (ax0,ax1): g+=[L(xx,ay-18,xx,ay+18,WHITE,5)]
    g+=[T(ax0,ay-52,"operator decides everything",26,SOFT),T(ax1,ay-52,"community decides everything",26,SOFT,anchor="end")]
    mk=ax0+(ax1-ax0)*0.26; g+=[C(mk,ay,20,AMBER,0,AMBER),CT(mk,ay-90,"you set this",26,AMBER),L(mk,ay-78,mk,ay-24,AMBER,2,0.8)]
    fy=640; g+=[R(ax0,fy,ax1-ax0,150,GREEN,6,fill=DARK)]
    for i,lab in enumerate(["money can't buy power","the record can't be faked","anyone can leave"]):
        g+=[CT(ax0+193+i*387,fy+90,lab,26,WHITE)]
    for xx in range(ax0+80,ax1,150): g+=[L(xx,ay+22,xx,fy-8,STEEL,2,0.35,dash="6 10")]
    g+=[CT(860,1000,safe_line,34,WHITE)]; return g

# ── Ch 2 supporting frames (hero = f_opener) ──
def f_investment(stage=3):  # builds: the chain → data-you-earned → cost/reward inversion
    g=[CT(860,120,"a game pulls people in — through investment",40,SOFT)]
    nodes=[("you sink\nhours in",300,STEEL),("it matters\nto you",640,AMBER),("so do\nits rules",980,GREEN),("you're in\nthe governing",1320,WHITE)]
    y,bw,bh=330,300,150
    for i,(lab,x,col) in enumerate(nodes):
        g+=[R(x,y,bw,bh,col,4)]
        for j,ln in enumerate(lab.split("\n")): g+=[CT(x+bw/2,y+60+j*40,ln,30,col)]
        if i<3: g+=ARR(x+bw,y+bh/2,x+bw+40,y+bh/2,SOFT,4)
    if stage>=2:
        g+=[CT(860,600,"it's all just data — but data you earned, so what happens to it lands like it's real",26,SOFT)]
    if stage>=3:
        g+=[CT(560,760,"civic life:",28,SOFT)]+ARR(660,752,760,752,CORAL,4)+[CT(880,760,"a cost",28,CORAL)]
        g+=[CT(1120,760,"a game:",28,SOFT)]+ARR(1220,752,1320,752,GREEN,4)+[CT(1430,760,"the reward",28,GREEN)]
    return g
def f_forkable(stage=2):  # builds: the polity block → fork off your own copy
    g=[CT(860,120,"a polity made of words — inspect it, verify it, carry it off",38,SOFT)]
    bx,by,bw,bh=250,320,520,340; g+=[R(bx,by,bw,bh,WHITE,4)]
    for i,r in enumerate(["argument  10110…","vote      01101…","law       11001…","code      00111…","record    10100…"]):
        g+=[T(bx+34,by+62+i*56,r,28,STEEL,mono=True)]
    g+=[CT(bx+bw/2,by-24,"the whole polity — all just information",24,SOFT)]
    if stage>=2:
        g+=ARR(bx+bw,by+bh/2,bx+bw+180,by+bh/2,GREEN,5)+[CT(bx+bw+130,by+bh/2-26,"fork",22,GREEN)]
        fx,fy=bx+bw+200,by+40; g+=[R(fx,fy,300,260,GREEN,3)]
        for i in range(5): g+=[L(fx+30,fy+48+i*44,fx+250,fy+48+i*44,STEEL,3,0.7)]
        g+=[CT(fx+150,fy+300,"your own copy — carry it off",22,GREEN)]
        g+=[CT(860,1000,"legible · verifiable · forkable — in a way paper and stone never were",30,WHITE)]
    return g
def f_honest(stage=2):  # builds: the honest-world foundation → real questions rise from it
    g=[CT(860,110,"the world underneath is modeled honestly — so its debates are real",38,SOFT)]
    fy=580
    g+=[R(150,fy,1620,150,GREEN,6,fill=DARK),CT(860,fy+58,"AN HONESTLY-MODELED WORLD",30,WHITE,weight="bold"),
        CT(860,fy+104,"real scarcity · real trade · real commons · real costs that land on people who didn't choose them",24,SOFT)]
    if stage>=2:
        for lab,x in [("tax what comes\nout of the ground?",380),("who pays for the\ncommons nobody funds?",860),("one group's freedom,\nanother group's cost?",1340)]:
            g+=[R(x-190,250,380,130,WHITE,3)]
            for j,ln in enumerate(lab.split("\n")): g+=[CT(x,304+j*40,ln,26,WHITE)]
            g+=ARR(x,fy-6,x,392,SOFT,3,0.8)
        g+=[CT(860,900,"not game problems in political costume — the real ones every government faces",30,WHITE)]
    return g
def f_laboratory(stage=2):  # builds: real politics one-shot → the try/break/retry loop
    g=[CT(960,120,"a laboratory — not a model OF a government, a place to RUN one",38,SOFT)]
    g+=[CT(500,240,"real politics",28,CORAL)]+ARR(300,420,720,420,CORAL,6)
    g+=[CT(510,380,"one shot · enormous scale",24,SOFT),L(560,470,600,510,CORAL,4),L(600,470,560,510,CORAL,4),CT(600,560,"no rewind",24,CORAL)]
    if stage>=2:
        g+=[CT(1400,240,"here",28,GREEN)]; cx,cy,r=1400,470,120
        for (a0,a1) in [(-80,30),(40,150),(160,270)]:
            th0=math.radians(a0); th1=math.radians(a1); x0,y0=cx+r*math.cos(th0),cy+r*math.sin(th0); x1,y1=cx+r*math.cos(th1),cy+r*math.sin(th1)
            g+=[PATH(f"M {x0} {y0} A {r} {r} 0 0 1 {x1} {y1}",GREEN,5)]+ARR(x1-6*math.cos(th1),y1-6*math.sin(th1),x1,y1,GREEN,4)
        for lab,a in [("try",-25),("it breaks",95),("try again",215)]:
            th=math.radians(a); g+=[CT(cx+(r+62)*math.cos(th),cy+(r+62)*math.sin(th)+8,lab,24,GREEN)]
        g+=[CT(960,760,"build the idea into a working world — watch how it holds up",28,SOFT),CT(960,900,"try it.  watch it break.  try again.",34,WHITE)]
    return g

def f_reach():  # 5  the reach: always digital, the data-frontier only grows outward, all in the open
    g=[CT(960,105,"whatever a community can turn into data, it governs — in the open",34,SOFT)]
    cx,cy=640,520
    g+=[C(cx,cy,300,AMBER,3,op=0.9)]                 # current frontier
    g+=[C(cx,cy,210,STEEL,3)]                        # more of community life
    g+=[C(cx,cy,120,GREEN,4,DARK)]                   # the game — a life already all data
    g+=[CT(cx,cy-6,"a game",24,GREEN,weight="bold"),CT(cx,cy+26,"a life already",17,SOFT),CT(cx,cy+48,"all data",17,SOFT)]
    for a in range(0,360,45):
        th=math.radians(a); x0=cx+300*math.cos(th); y0=cy+300*math.sin(th); x1=cx+352*math.cos(th); y1=cy+352*math.sin(th)
        g+=ARR(x0,y0,x1,y1,AMBER,3,0.9)
    lx=1120
    g+=[CT(lx,250,"the boundary only moves ONE way — outward",24,WHITE,weight="bold")]
    rows=[(GREEN,"where it runs today","a game: a community already all data"),
          (STEEL,"then more of what a community does","as each part becomes data"),
          (AMBER,"the frontier keeps moving out","as the technology turns more into data")]
    for i,(col,a,b) in enumerate(rows):
        y=360+i*130
        g+=[C(lx+16,y,15,col,3,DARK)]
        g+=[T(lx+50,y-4,a,24,WHITE),T(lx+50,y+30,b,20,SOFT)]
    g+=[CT(940,930,"it never leaves the digital — the digital just takes in more",28,WHITE,weight="bold")]
    return g

CH2=[
 ("ch2-01-opener-game",   f_opener(1)),   # 1  the game gets your hours  [Ch2 hero build]
 ("ch2-02-opener-govern", f_opener(2)),   # 1  …governing gets none
 ("ch2-03-opener-graveyard", f_opener(3)),# 3  …the DAOs built it, nobody came
 ("ch2-04-opener-turn",   f_opener(4)),   # 1  …so put the government in the game
 ("ch2-05-investment-chain",   f_investment(1)),  # 2  invest → it matters → its rules → govern
 ("ch2-06-investment-earned",  f_investment(2)),  # 2  …data you earned
 ("ch2-07-investment-inversion",f_investment(3)), # 2  …civic=cost, game=reward
 ("ch2-08-forkable-block", f_forkable(1)),        # 4  a polity made of words
 ("ch2-09-forkable-fork",  f_forkable(2)),        # 4  …fork off your own copy
 ("ch2-10-honest-world",   f_honest(1)),          # 5  built on an honestly-modeled world
 ("ch2-11-honest-questions", f_honest(2)),        # 5  …so the real questions rise
 ("ch2-12-lab-oneshot",   f_laboratory(1)),       # 5  real politics: one shot, no rewind
 ("ch2-13-lab-loop",      f_laboratory(2)),       # 5  …here: try, break, try again
 ("ch2-14-reach",         f_reach()),              # 5  …and if it holds, the form generalizes as digitization widens
]

# ── Ch 3 frames (chambers & currency; hero = the three rings) ──
def f_seat_missing(stage=2):  # builds: labor+capital seated → the consumer's empty seat
    g=[CT(960,110,"every economy runs on three forces — only two ever got organized",36,SOFT)]
    cols=[(400,"LABOR","the people who make it","unions",True),(960,"CAPITAL","the people who fund it","boards · shareholders",True)]
    if stage>=2: cols.append((1520,"CONSUMER","the people it's FOR","only exit — never voice",False))
    for (x,name,who,organ,filled) in cols:
        g+=[CT(x,230,name,34,WHITE if filled else AMBER,weight="bold"),CT(x,272,who,22,SOFT)]
        g+=seat(x,430,filled,WHITE if filled else AMBER)+[CT(x,540,organ,24,GREEN if filled else CORAL)]
    if stage>=2:
        g+=[CT(960,700,"you can't seat a hundred million people who've never met —",28,SOFT),
            CT(960,742,"all the consumer ever had was exit: buy it, or don't",28,SOFT),
            CT(960,900,"the party the whole thing exists to serve never had a seat",30,WHITE)]
    return g
def f_seat_gained():
    g=[CT(960,110,"real-time, two-way communication changes that",38,SOFT)]
    import random; random.seed(3)
    for i in range(60): g+=[person(200+random.random()*520,260+random.random()*460,7,DIMB,0.8)]
    g+=[CT(470,780,"a hundred million private decisions — noise, not a seat",24,DIM)]
    g+=ARR(780,500,940,500,STEEL,5)+[CT(860,460,"gathered,",24,STEEL),CT(860,540,"continuously",24,STEEL)]
    g+=seat(1300,470,True,GREEN)+[CT(1300,600,"a standing voice",26,GREEN)]
    for i in range(10):
        a=math.radians(200+i*14); g+=[person(1300+150*math.cos(a),470+150*math.sin(a),7,GREEN,0.6)]
    g+=[CT(960,900,"for the first time, the third force can take a seat",30,WHITE)]
    return g
def f_two_three_body(stage=2):  # builds: the two-body deadlock → the three-body tie-break
    g=[CT(960,110,"and it breaks a very old deadlock",38,SOFT)]
    g+=[CT(500,230,"a two-body problem",26,CORAL)]; fy=430
    g+=[L(320,fy,680,fy,WHITE,5),L(500,fy,500,fy-40,WHITE,4),C(360,fy,30,STEEL,3,STEEL),CT(360,fy+70,"labor",22,SOFT),
        C(640,fy,30,AMBER,3,AMBER),CT(640,fy+70,"capital",22,SOFT),CT(500,fy+150,"tug-of-war — no one to break the tie",22,SOFT)]
    if stage>=2:
        g+=[CT(1400,230,"seat the third — co-equal",26,GREEN)]
        top=(1400,320); bl=(1275,560); br=(1525,560)   # three bodies = a triangle
        g+=[L(top[0],top[1],bl[0],bl[1],WHITE,4,0.7),L(bl[0],bl[1],br[0],br[1],WHITE,4,0.7),L(br[0],br[1],top[0],top[1],WHITE,4,0.7)]
        g+=[C(bl[0],bl[1],28,STEEL,3,STEEL),CT(bl[0]-6,bl[1]+58,"labor",22,SOFT),
            C(br[0],br[1],28,AMBER,3,AMBER),CT(br[0]+6,br[1]+58,"capital",22,SOFT),
            C(top[0],top[1],28,GREEN,3,GREEN),CT(top[0],top[1]-44,"consumer",22,GREEN)]
        g+=[CT(1400,680,"the deadlock ends — the tie falls toward the people it's FOR",22,SOFT)]
    return g
def f_counts():
    g=[CT(860,110,"the same crowd, measured three ways",40,SOFT)]
    boxes=[(300,230,"labor",GREEN),(690,230,"capital",AMBER),(1080,230,"consumer",STEEL)]
    for (bx,by,lab,col) in boxes: g+=[R(bx,by,300,110,col,4),CT(bx+150,by+68,lab,32,col)]
    rowy=700; n=15; x0=330; step=76
    for i in range(n):
        px=x0+i*step
        for k,(bx,by,lab,col) in enumerate(boxes): g+=[L(px,rowy+k*26+10,bx+150,by+110,col,1.5,0.20)]
    for i in range(n):
        px=x0+i*step
        for k,col in enumerate([GREEN,AMBER,STEEL]): g+=[f'<rect x="{px-13}" y="{rowy+k*26}" width="26" height="22" rx="4" fill="{col}"/>']
    g+=[CT(860,rowy+140,"one person contributes to all three — in different proportions",28,SOFT),
        CT(860,1020,"not three groups. three readings of one group.",34,WHITE)]
    return g
def f_money_stops():
    g=[CT(860,110,"money earns a real voice — but stops at its own count",36,SOFT)]
    r,cs=rings(760,520,200,(WHITE,GREEN,WHITE)); g+=r
    g+=[CT(cs[0][0]-40,cs[0][1]-230,"labor",26,WHITE),CT(cs[1][0]+40,cs[1][1]-230,"capital",26,GREEN),CT(cs[2][0],cs[2][1]+250,"consumer",26,WHITE)]
    g+=[C(cs[1][0],cs[1][1],26,AMBER,3,DARK),CT(cs[1][0],cs[1][1]+10,"$",30,AMBER)]
    g+=[CT(1300,470,"moves the",26,GREEN),CT(1300,510,"funders' count",26,GREEN),CT(1300,610,"— and no further",24,SOFT)]
    g+=[CT(860,940,"the loudest funder in the room. not a maker, not a player, not a winner.",30,WHITE)]
    return g
def f_qq(stage=2):  # builds: the equation → the two zero-cases
    g=[CT(860,110,"standing = how much you contribute × how much others value it",36,SOFT)]; y=240; bh=200
    g+=BAR(300,y,150,bh,0.7,STEEL)+[CT(375,y+bh+40,"QUANTITY",24,STEEL,weight="bold"),CT(375,y+bh+74,"how much",20,SOFT)]
    g+=[CT(560,y+bh/2,"×",50,WHITE)]
    g+=BAR(660,y,150,bh,0.7,GREEN)+[CT(735,y+bh+40,"QUALITY",24,GREEN,weight="bold"),CT(735,y+bh+74,"how much others value it",20,SOFT)]
    g+=[CT(920,y+bh/2,"=",50,WHITE)]+BAR(1020,y,150,bh,0.6,AMBER)+[CT(1095,y+bh+40,"STANDING",24,AMBER,weight="bold")]
    if stage>=2:
        fy=760
        g+=[CT(430,fy,"all grind, nobody cares:",22,SOFT),CT(760,fy,"full × 0 = 0",26,CORAL,weight="bold"),
            CT(430,fy+50,"a name, then you vanish:",22,SOFT),CT(760,fy+50,"0 × full = 0",26,CORAL,weight="bold"),
            CT(1350,fy+25,"a product —",26,WHITE),CT(1350,fy+62,"zero of either, and it's zero",26,WHITE)]
    return g
def f_conferral():
    g=[CT(860,110,"quality is conferred by others — you can't manufacture it",36,SOFT)]; cx,cy=560,540
    g+=[C(cx,cy,58,GREEN,4,DARK),C(cx,cy,40,GREEN,0,GREEN)]
    for i in range(7):
        a=math.radians(i*(360/7)); px=cx+250*math.cos(a); py=cy+250*math.sin(a)
        g+=[person(px,py,13,STEEL)]+ARR(px,py,cx+58*math.cos(a),cy+58*math.sin(a),STEEL,3,0.85)
    g+=[CT(cx,cy+330,"others give it → it's real",26,GREEN)]; fx,fy=1300,540; g+=[C(fx,fy,58,CORAL,4,DARK)]
    ring=[(fx+210*math.cos(math.radians(i*45)),fy+210*math.sin(math.radians(i*45))) for i in range(8)]
    for (px,py) in ring: g+=[C(px,py,12,CORAL,2,"none",0.8)]
    for i in range(8): g+=[L(ring[i][0],ring[i][1],ring[(i+1)%8][0],ring[(i+1)%8][1],CORAL,2,0.5)]
    g+=[CT(fx,fy+8,"0",44,CORAL,weight="bold"),CT(fx,fy+330,"a thousand fakes give nothing",26,CORAL)]
    return g
def f_conviction(stage=2):  # builds: the weight ramp → the flip-resets
    g=[CT(860,110,"you don't spend standing — you hold it as conviction",38,SOFT)]; ax0,ax1,ay=260,1400,720
    g+=[L(ax0,ay,ax1,ay,SOFT,2,0.6)]+ARR(ax1,ay,ax1+40,ay,SOFT,3)+[CT(ax1+90,ay+8,"time",22,SOFT)]
    g+=[L(ax0,ay,ax0,300,SOFT,2,0.4),T(ax0-150,320,"weight",22,SOFT)]
    g+=[f'<path d="M {ax0} {ay} L 1060 360 L 1060 {ay} Z" fill="{GREEN}" fill-opacity="0.5"/>',L(ax0,ay,1060,360,GREEN,5),CT(660,470,"hold it → it weighs more",26,GREEN)]
    if stage>=2:
        g+=[L(1060,360,1120,ay,CORAL,5,1.0,dash="10 8"),CT(1240,470,"a last-second flip",24,CORAL),CT(1240,508,"resets to nothing",24,CORAL)]
        g+=[CT(860,900,"full weight on every question — spent as patience, never used up",30,WHITE)]
    return g
def f_delegation():
    g=[CT(860,110,"can't follow every issue? hand your standing to someone you trust",36,SOFT)]
    g+=[C(500,470,52,WHITE,4),CT(500,482,"you",26,WHITE),CT(500,590,"your standing",22,SOFT)]
    g+=ARR(560,470,1000,470,GREEN,5)+[CT(780,430,"delegate",24,GREEN)]
    g+=[C(1080,470,52,GREEN,4,DARK),CT(1080,482,"proxy",24,GREEN),CT(1080,590,"someone you trust",22,SOFT)]
    g+=[CT(1420,420,"per topic",24,SOFT),CT(1420,470,"revocable —",24,SOFT),CT(1420,520,"cut it anytime",24,SOFT),L(1160,470,1360,470,SOFT,2,0.5,dash="8 8")]
    g+=[CT(860,900,"liquid delegation — borrowed, not invented",30,WHITE)]
    return g

CH3=[
 ("ch3-01-seat-two",  f_seat_missing(1)),                                     # 1  labor & capital got seats
 ("ch3-02-seat-missing", f_seat_missing(2)),                                  # 1  …the consumer never did
 ("ch3-03-seat-gained", f_seat_gained()),                                     # 1  real-time comms → the third seat
 ("ch3-04-twobody", f_two_three_body(1)),                                     # 1  the two-body deadlock…
 ("ch3-05-threebody", f_two_three_body(2)),                                   # 1  …seat the third, tie breaks
 ("ch3-06-rings", f_rings(False, title="each force gets its own count — co-equal",
                          cap="none can outvote the other two")),             # 2  the three rings  [hero]
 ("ch3-07-rings-pass", f_rings(True, title="a decision needs two of three",
                               cap="no one wins alone")),                     # 2  2-of-3 to pass
 ("ch3-08-counts", f_counts()),                                               # 2  same crowd, three readings
 ("ch3-09-money", f_money_stops()),                                           # 3  money stops at its own count
 ("ch3-10-qq-equation", f_qq(1)),                                             # 4  standing = quantity × quality
 ("ch3-11-qq-zero", f_qq(2)),                                                 # 4  …zero of either, and it's zero
 ("ch3-12-conferral", f_conferral()),                                         # 4  conferred by others
 ("ch3-13-conviction-hold", f_conviction(1)),                                 # 5  hold it → it weighs more
 ("ch3-14-conviction-flip", f_conviction(2)),                                 # 5  …a flip resets to nothing
 ("ch3-15-delegation", f_delegation()),                                       # 5  liquid delegation
]

# ── Ch 4 frames (the argument; hero = the claim graph, f_graph) ──
def f_modes(stage=2):
    g=[CT(960,110,"match the mode to the moment",40,SOFT)]
    x0,y0,cw,chh,gap=560,260,400,230,40
    for j,(big,small) in enumerate([("SYNC","chat · real-time"),("ASYNC","the forum · over time")]):
        cxh=x0+cw/2+j*(cw+gap); g+=[CT(cxh,y0-52,big,30,WHITE,weight="bold"),CT(cxh,y0-18,small,20,SOFT)]
    for i,rl in enumerate(["LOOSE","STRUCTURED"]): g+=[T(x0-170,y0+chh/2+i*(chh+gap)+10,rl,26,SOFT)]
    cells=[[("casual chat","talk"),("a forum feed","talk")],[("the live floor","decisions"),("the argument map","decisions")]]
    for i in range(2):
        for j in range(2):
            lab,tag=cells[i][j]; cx=x0+j*(cw+gap); cy=y0+i*(chh+gap); lit=(i==1 and stage>=2)
            g+=[R(cx,cy,cw,chh,GREEN if lit else DIMB,4,op=1 if lit else 0.7)]
            g+=[CT(cx+cw/2,cy+chh/2-6,lab,30,WHITE if lit else DIM,weight="bold" if lit else "normal"),CT(cx+cw/2,cy+chh/2+40,tag,22,GREEN if lit else DIM)]
    g+=[CT(960,1000,"casual talk stays loose — decisions get organized by structure",30,WHITE)]
    return g
def f_pamphlet():
    g=[CT(760,110,"you already know the structured form — it comes in the mail",36,SOFT)]
    bx,by,bw,bh=340,240,460,560; g+=[R(bx,by,bw,bh,WHITE,4)]
    for i,(s,col) in enumerate([("PROPOSAL",WHITE),("THE CASE FOR",GREEN),("THE CASE AGAINST",CORAL),("REBUTTALS",AMBER)]):
        yy=by+50+i*135; g+=[CT(bx+bw/2,yy,s,26,col,weight="bold")]
        for k in range(3): g+=[L(bx+50,yy+30+k*24,bx+bw-50,yy+30+k*24,SOFT,3,0.4)]
    g+=ARR(bx+bw+40,by+bh/2,bx+bw+230,by+bh/2,GREEN,5)+[CT(bx+bw+135,by+bh/2-30,"made",24,GREEN),CT(bx+bw+135,by+bh/2+40,"interactive",24,GREEN)]
    g+=[CT(1420,by+bh/2-20,"a living map",30,WHITE),CT(1420,by+bh/2+30,"the whole community",24,SOFT),CT(1420,by+bh/2+66,"builds",24,SOFT)]
    g+=[CT(760,900,"the argument laid out by its structure — not by who shouted loudest",30,WHITE)]
    return g
def f_reputation_blind(stage=2):
    g=[CT(860,110,"the map is blind to who wrote it",38,SOFT)]
    g+=[R(730,220,300,64,WHITE,3),CT(880,262,"proposal",28,WHITE),L(820,284,560,430,CORAL,3),L(940,284,1200,430,CORAL,3),
        R(410,430,300,64,CORAL,3),CT(560,472,"objects to",26,CORAL),R(1050,430,300,64,CORAL,3),CT(1200,472,"objects to",26,CORAL)]
    if stage<2:
        g+=[person(560,570,26,STEEL),CT(560,640,"a nobody",24,SOFT),person(1200,570,26,AMBER),CT(1200,540,"★",30,AMBER),CT(1200,640,"the biggest name",24,SOFT),
            CT(860,760,"an unknown and a big name — do they attach differently?",26,SOFT)]
    else:
        for x in (560,1200): g+=[C(x,570,26,DIMB,2,op=0.5),L(x-30,540,x+30,600,CORAL,4),L(x+30,540,x-30,600,CORAL,4),CT(x,660,"identical",24,GREEN)]
        g+=[CT(860,860,"same place, same weight — what holds a point up is its structure, not the name",30,WHITE)]
    return g
def f_live_floor(stage=2):
    g=[CT(960,110,"the live floor — a real-time debate by rules of order",36,SOFT)]
    g+=[R(560,300,800,140,WHITE,4),CT(960,285,"the floor",22,SOFT)]
    for x in [720,960,1200]: g+=[person(x,370,16,GREEN)]
    g+=[R(300,300,180,140,STEEL,3),CT(390,285,"floor-bot",22,STEEL),CT(390,350,"speaking queue",18,SOFT),CT(390,392,"time limits",18,SOFT)]
    for i in range(4): g+=[person(340+i*30,430,8,STEEL,0.7)]
    g+=[CT(960,490,"opening · rebuttal · cross-examination · closing",24,SOFT)]
    for i in range(40): g+=[person(600+(i%20)*40,580+(i//20)*40,8,DIMB,0.7)]
    g+=[CT(960,690,"a gallery watches and reacts",22,SOFT)]
    if stage>=2:
        g+=ARR(1420,400,1560,400,AMBER,5)+[C(1620,400,50,AMBER,3),CT(1620,410,"map",22,AMBER),CT(1560,330,"claims captured",22,AMBER),
            CT(960,900,"live surfaces; async decides — nothing binding happens on the floor",30,WHITE)]
    return g
def f_llm_librarian(stage=2):
    import random; random.seed(7)
    g=[CT(960,110,"at scale — the one place an LLM helps",38,SOFT)]
    for i in range(16): g+=[R(300+random.random()*360,280+random.random()*380,120,40,STEEL,2,op=0.7)]
    g+=[CT(490,720,"ten thousand near-identical claims",24,SOFT)]
    if stage>=2:
        g+=ARR(760,470,900,470,SOFT,5)+[CT(830,430,"LLM",24,AMBER),CT(830,510,"librarian",22,AMBER),
            R(1000,410,360,120,AMBER,3),CT(1180,458,"one merged claim",26,WHITE),CT(1180,502,"— proposed —",22,AMBER)]
        g+=ARR(1400,470,1520,470,GREEN,5)+[C(1580,470,44,GREEN,3),CT(1580,480,"✓",34,GREEN),CT(1580,550,"a human confirms",22,GREEN),
            CT(960,900,"a librarian, never a judge — it proposes only; touches the view, never the record",30,WHITE)]
    return g

CH4=[
 ("ch4-01-modes-off", f_modes(1)),                # 1  the four modes…
 ("ch4-02-modes", f_modes(2)),                    # 1  …two structured ones decide
 ("ch4-03-pamphlet", f_pamphlet()),               # 2  the voter guide, made interactive
 ("ch4-04-graph-attach", f_graph(1)),             # 2  claims attach  [hero]
 ("ch4-05-repblind-who", f_reputation_blind(1)),  # 3  a nobody vs a big name…
 ("ch4-06-repblind", f_reputation_blind(2)),      # 3  …names stripped, identical
 ("ch4-07-graph-answered", f_graph(2)),           # 4  one answered → closed
 ("ch4-08-graph-open", f_graph(3)),               # 4  one stays open — can't be buried
 ("ch4-09-floor", f_live_floor(1)),               # 5  the live floor…
 ("ch4-10-floor-captured", f_live_floor(2)),      # 5  …claims captured; async decides
 ("ch4-11-llm-scale", f_llm_librarian(1)),        # 6  drowning in duplicates…
 ("ch4-12-llm", f_llm_librarian(2)),              # 6  …LLM proposes a merge
]

# ── Ch 5 frames (governing is shipping software; hero = pipeline + master) ──
def f_enforce(stage=2):
    g=[CT(960,110,"the world itself is made of code — a law can be written in, so it just holds",34,SOFT)]
    g+=[CT(500,220,"every government",28,CORAL)]
    g+=[person(340,360,18,STEEL)]+ARR(370,360,520,360,SOFT,3)+[R(540,320,150,80,SOFT,3),CT(615,368,"the act",22,SOFT)]
    g+=ARR(615,410,615,480,CORAL,3)+[CT(615,540,"caught after —",22,CORAL),CT(615,576,"if at all",22,CORAL),
        CT(500,660,"enforced through institutions, always after the fact",22,SOFT)]
    if stage>=2:
        g+=[CT(1420,220,"here",28,GREEN),R(1380,300,26,220,WHITE,3,fill=WHITE)]
        g+=[person(1300,400,18,STEEL)]+ARR(1330,400,1372,400,CORAL,4)+[L(1372,380,1372,420,CORAL,5),CT(1560,400,"can't pass",22,GREEN),
            CT(1420,660,"written into the world — it just can't happen",22,SOFT),CT(960,940,"nothing catches you after the fact — the rule simply holds",30,WHITE)]
    return g
def f_wizard():
    g=[CT(960,110,"in a world made of code, the ability to write it is a power",38,SOFT)]
    g+=[R(1120,280,520,440,STEEL,3),CT(1380,255,"the world — made of code",24,SOFT)]
    for i in range(7): g+=[T(1160,330+i*52,"if (…) then rule …",26,STEEL if i!=3 else GREEN,mono=True)]
    g+=[person(430,470,30,GREEN),CT(430,560,"writes + runs code",24,GREEN)]
    g+=ARR(490,470,1110,470,GREEN,5)+[CT(760,430,"reaches in — makes a rule part of reality",24,SOFT)]
    g+=[CT(960,860,"it makes them WIZARDS —",30,AMBER,weight="bold"),CT(960,908,"the force behind everything the machine enforces here",28,SOFT)]
    return g
def f_maxim(stage=2):
    g=[CT(960,150,"what can be enforced by code, shall be enforced by code",40,WHITE,weight="bold"),CT(960,210,"— the maxim —",24,AMBER)]
    if stage>=2:
        for (name,desc,x) in [("UNIFORM","the same for everyone,\nevery time",470),("INCORRUPTIBLE","no discretion to bend it,\nno one to bribe",960),("TRANSPARENT","nothing hidden",1450)]:
            g+=[R(x-190,320,380,180,GREEN,4),CT(x,378,name,30,GREEN,weight="bold")]
            for j,ln in enumerate(desc.split("\n")): g+=[CT(x,430+j*36,ln,22,SOFT)]
        g+=[CT(960,600,"in a way no human enforcer can be",26,SOFT),CT(960,900,"so wherever a rule CAN be code, it is — and it's out of anyone's hands",28,WHITE)]
    return g
def f_admin_body():  # wizards = a code-capable SUBSET of the administration (script: "engineering sits inside")
    g=[CT(960,110,"the executive isn't all engineers — it's the whole administration",36,SOFT)]
    bx,by,bw,bh=430,260,1060,420
    g+=[R(bx,by,bw,bh,WHITE,3,rx=18),CT(bx+bw/2,by-22,"THE ADMINISTRATION — runs the place, handles the human half",24,SOFT)]
    wcx,wcy=650,470
    g+=[C(wcx,wcy,120,AMBER,3,op=0.9)]
    for (px,py) in [(wcx-45,wcy-30),(wcx+40,wcy-38),(wcx-10,wcy+35),(wcx+55,wcy+25)]: g+=[person(px,py,16,AMBER)]
    g+=[CT(wcx,wcy+165,"wizards — write + run code",22,AMBER)]
    for i in range(24): g+=[person(980+(i%6)*80,340+(i//6)*90,15,STEEL)]
    g+=[CT(960,940,"the engineering sits inside — being a wizard is one capability, not the whole job",30,WHITE)]
    return g
def f_admin_pm():  # the PM: elected by the legislature, grants wizardhood
    g=[CT(960,110,"the head of the executive isn't whoever codes best — it's who's trusted",36,SOFT)]
    g+=rings(360,440,60,labels=False)[0]+[CT(360,575,"the legislature",22,SOFT)]
    g+=ARR(470,440,650,440,GREEN,5)+[CT(560,400,"elects",22,GREEN)]
    g+=[C(790,440,56,WHITE,4),CT(790,452,"PM",32,WHITE,weight="bold"),CT(790,575,"heads the administration",22,SOFT)]
    g+=ARR(860,440,1050,440,AMBER,5)+[CT(955,400,"grants",22,AMBER)]
    g+=[R(1090,380,440,120,AMBER,3),CT(1310,426,"wizardhood",28,AMBER,weight="bold"),CT(1310,466,"who's trusted to run a live world",22,SOFT)]
    g+=[CT(960,940,"hold the legislature, and you hold the executive",30,WHITE)]
    return g
def f_sortition(stage=2):
    g=[CT(960,110,"the judiciary — no seat to appoint, drawn by lot",36,SOFT)]
    pc=(400,410)
    for k in range(16):
        a=math.radians(k*(360/16)); g+=[person(pc[0]+130*math.cos(a),pc[1]+130*math.sin(a)*0.9,10,STEEL)]
    g+=[CT(pc[0],pc[1]+195,"the citizens — past a seniority bar",22,SOFT)]
    g+=[R(pc[0]-38,700,76,16,CORAL,3),R(pc[0]-38,642,14,58,CORAL,3),L(pc[0]-70,650,pc[0]+70,760,CORAL,5),L(pc[0]+70,650,pc[0]-70,760,CORAL,5),CT(pc[0],810,"no seat to capture",22,CORAL)]
    g+=ARR(575,410,735,410,GREEN,5)+[CT(655,370,"drawn",22,GREEN),CT(655,450,"by lot",22,GREEN)]
    g+=[R(810,320,220,180,WHITE,3),CT(920,300,"a panel",22,SOFT)]
    for (dx,dy) in [(60,60),(110,50),(85,110),(150,95)]: g+=[person(810+dx,320+dy,13,GREEN)]
    if stage>=2:
        g+=ARR(1040,410,1160,410,SOFT,4)
        g+=[R(1180,300,440,110,GREEN,3),CT(1400,342,"code review —",24,GREEN),CT(1400,380,"did the law come true?",22,SOFT)]
        g+=[R(1180,450,440,110,AMBER,3),CT(1400,492,"the appeal —",24,AMBER),CT(1400,530,"was the call fair?",22,SOFT)]
    g+=[CT(960,940,"a chosen judge is a captured judge — no bench to lobby or pack",30,WHITE)]
    return g

CH5=[
 ("ch5-01-branches", master(level=4, title="turning a decision into a running system — the three branches")),  # 1
 ("ch5-02-pipeline-stations", f_pipeline(1)),   # 1  decide · build · check  [hero]
 ("ch5-03-pipeline-ships", f_pipeline(2)),      # 1  conforms → ships
 ("ch5-04-pipeline-remand", f_pipeline(3)),     # 1/5  misses → remand
 ("ch5-05-enforce-after", f_enforce(1)),        # 2  every gov enforces after the fact…
 ("ch5-06-enforce", f_enforce(2)),              # 2  …here it just can't happen
 ("ch5-07-wizard", f_wizard()),                 # 2  writing the code makes you a wizard
 ("ch5-08-maxim", f_maxim(1)),                  # 3  the maxim
 ("ch5-09-maxim-why", f_maxim(2)),              # 3  uniform · incorruptible · transparent
 ("ch5-10-fork", f_fork()),                     # 3  code handles the mechanical; people the rest
 ("ch5-11-admin-body", f_admin_body()),          # 4  wizards = a code-capable subset of the administration
 ("ch5-12-admin-pm", f_admin_pm()),             # 4  the PM: elected by the legislature, grants wizardhood
 ("ch5-13-sortition", f_sortition(1)),          # 5  drawn by lot, no seat to capture
 ("ch5-14-sortition-checks", f_sortition(2)),   # 5  checks both — code review + appeal
]

# ================= CH 6 — DON'T TRUST, VERIFY =================
def f_pen():  # 1  executive writes code, code writes the record — what stops it lying?
    g=[CT(960,110,"the executive writes the code — and the code writes the record",36,SOFT)]
    g+=[R(220,320,220,120,WHITE,3),CT(330,388,"EXECUTIVE",26,WHITE,weight="bold")]
    g+=ARR(450,380,560,380,SOFT,4)+[CT(505,345,"writes",20,SOFT)]
    g+=[R(570,320,200,120,STEEL,3),CT(670,388,"the code",26,STEEL)]
    g+=ARR(780,380,890,380,SOFT,4)+[CT(835,345,"writes",20,SOFT)]
    for i,lab in enumerate(["vote","law","verdict"]):
        x=910+i*180; g+=[R(x,340,150,80,WHITE,3),CT(x+75,388,lab,22,WHITE)]
        if i<2: g+=[L(x+150,380,x+180,380,SOFT,3)]
    g+=[CT(1200,300,"the record",22,SOFT)]
    g+=[CT(960,540,"the branch that builds the world also holds the pen that writes its history",28,WHITE)]
    g+=[CT(960,660,"— so what stops them writing code that LIES? —",26,CORAL)]
    for i,lab in enumerate(["cook a vote count","log a rule nobody passed","edit a verdict after"]):
        g+=[CT(500+i*470,730,lab,22,CORAL)]
    return g

def f_record_reality():  # 2  a digital world has no outside — the record IS reality
    g=[CT(960,110,"a digital world has no outside",40,SOFT)]
    g+=[CT(500,220,"the physical world",26,SOFT)]
    g+=[R(300,320,180,120,WHITE,3),CT(390,388,"a record",22,WHITE)]
    g+=ARR(490,380,620,380,SOFT,4)+[CT(555,345,"describes",20,SOFT)]
    g+=[R(640,300,260,160,STEEL,3),CT(770,340,"the real world",22,SOFT),CT(770,382,"witnesses · a building",18,DIM),CT(770,414,"footage · paper",18,DIM)]
    g+=[CT(500,520,"records point AT a reality that exists apart",22,SOFT)]
    g+=[CT(1430,220,"here",26,GREEN)]
    g+=[R(1280,300,300,160,GREEN,4)]
    for i in range(4): g+=[T(1310,340+i*30,"01101 10010 0110 …",22,STEEL,mono=True)]
    g+=[CT(1430,520,"a stream of 1s and 0s is all there is",22,GREEN)]
    g+=[CT(960,780,"the writing-down IS the vote — control the record, and you control what happened",30,WHITE)]
    g+=[CT(960,850,"hand it to one authority, and you've handed them the power to rewrite reality",26,SOFT)]
    return g

def f_tamper_chain(stage=2):  # 3  hero — the tamper-evident chain
    g=[CT(960,110,"the record is built so it can't be faked in secret",38,SOFT)]
    labels=["proposal","the vote","the code","a ruling"]; hashes=["#a1b2c3","#7d4e91","#c05f2a","#3b8f6d"]; x0=360; bw=270
    broken = stage>=2; edit_i=1
    for i,lab in enumerate(labels):
        x=x0+i*(bw+40); bad=broken and i>=edit_i
        col = CORAL if bad else GREEN
        g+=[R(x,420,bw,120,col,4),CT(x+bw/2,478,lab,26,WHITE)]
        g+=[CT(x+bw/2,516,("#X8f2!7" if bad else hashes[i]),18,col,mono=True)]
        if i<3: g+=[L(x+bw,480,x+bw+40,480,(CORAL if bad else GREEN),4)]
    if broken:
        ex=x0+edit_i*(bw+40)
        g+=[L(ex-10,400,ex+bw+10,560,CORAL,4),L(ex+bw+10,400,ex-10,560,CORAL,4)]
        g+=[CT(960,640,"change ONE past entry — the hashes stop matching, and the whole chain visibly breaks",28,CORAL)]
        g+=[CT(960,860,"anyone can check it — including against the people running the place",30,WHITE)]
    else:
        g+=[CT(960,640,"each entry is sealed by the one before it",26,SOFT)]
    return g

def f_selfref():  # 3  the writer is inside the written
    g=[CT(960,110,"the code that writes the record is itself an entry in it",38,SOFT)]
    labels=["the vote","THE CODE\nthat writes this","a ruling","code edited (v2)"]; cols=[WHITE,AMBER,WHITE,AMBER]
    x0=280; bw=250; y0=440
    xs=[x0+i*(bw+50) for i in range(4)]
    for i,(x,lab,col) in enumerate(zip(xs,labels,cols)):
        g+=[R(x,y0,bw,110,col,4)]
        for j,ln in enumerate(lab.split("\n")): g+=[CT(x+bw/2,y0+(48 if len(lab.split('\n'))==1 else 40)+j*30,ln,22,col,weight="bold" if col==AMBER else "normal")]
        if i<3: g+=[L(x+bw,y0+55,xs[i+1],y0+55,SOFT,3)]
    g+=[PATH(f"M {xs[1]+bw/2} {y0} C {xs[1]+bw/2} {y0-150}, {xs[0]+bw/2} {y0-150}, {xs[0]+bw/2} {y0-6}",AMBER,4),CT(xs[0]+150,y0-165,"it writes the chain…",24,AMBER)]
    g+=[PATH(f"M {xs[3]+bw/2} {y0+110} C {xs[3]+bw/2} {y0+250}, {xs[1]+bw/2} {y0+250}, {xs[1]+bw/2} {y0+116}",AMBER,4,dash="10 8"),CT(xs[2]+40,y0+290,"…so changing it is itself a logged entry",26,AMBER)]
    g+=[CT(960,900,"there is no editing the history from outside — because there is no outside",30,WHITE)]
    return g

def f_verify():  # 3  check it yourself
    g=[CT(960,110,"don't take their word — check it yourself",38,SOFT)]
    g+=[R(230,340,420,180,CORAL,4),CT(440,414,"“the vote was 60–40”",30,CORAL),CT(440,470,"— trust us",24,CORAL,op=0.9)]
    g+=ARR(680,430,820,430,SOFT,4)
    gx0,gy0=880,330; cols=10; rows=5
    for i in range(50):
        r=i//cols; c=i%cols; col=GREEN if i<30 else CORAL
        g+=[f'<rect x="{gx0+c*46}" y="{gy0+r*40}" width="30" height="26" rx="4" fill="{col}"/>']
    g+=[CT(gx0+cols*46/2-8,gy0-16,"the raw record — every entry, open to read",22,SOFT)]
    g+=ARR(gx0+cols*46/2-8,gy0+rows*40+10,gx0+cols*46/2-8,gy0+rows*40+70,GREEN,4)
    g+=[CT(gx0+cols*46/2-8,gy0+rows*40+120,"count them yourself → 60–40 ✓  (or catch that it isn't)",28,GREEN)]
    g+=[CT(960,900,"don't trust; verify",34,WHITE,weight="bold")]
    return g

def f_blockchain():  # 4  a blockchain, minus the cryptocurrency
    g=[CT(960,110,"this already has a name: a blockchain",40,SOFT)]
    g+=[CT(960,235,"the cryptocurrency bolted on top —",24,CORAL)]
    for i,lab in enumerate(["coins","a token","a price chart","something to trade"]):
        x=470+i*260; g+=[R(x-110,270,220,80,CORAL,2,op=0.55),CT(x,318,lab,22,CORAL,op=0.7)]
    g+=[CT(960,405,"…lifts away — we take none of it",22,CORAL)]
    g+=ARR(960,430,960,470,DIM,3)
    hashes=["#a1b2","#7d4e","#c05f","#3b8f","#e21c"]; x0=430; bw=180
    for i,lab in enumerate(["entry"]*5):
        x=x0+i*(bw+30); g+=[R(x,540,bw,110,GREEN,4),CT(x+bw/2,590,lab,22,WHITE),CT(x+bw/2,624,hashes[i],16,GREEN,mono=True)]
        if i<4: g+=[L(x+bw,595,x+bw+30,595,GREEN,4)]
    g+=[CT(960,710,"we keep the one property that matters:",26,WHITE)]
    g+=[CT(960,752,"an append-only record no one can secretly rewrite, that anyone can check",26,GREEN)]
    g+=[CT(960,900,"just the verifiability — doing the one thing it's genuinely good at:",28,SOFT)]
    g+=[CT(960,946,"making trust unnecessary",30,WHITE,weight="bold")]
    return g

def f_from_math():  # 5  honesty from math, not trust; the unforgivable crime
    g=[CT(960,120,"its honesty doesn't rest on trusting anyone — it rests on math",38,SOFT)]
    g+=[R(300,300,460,150,CORAL,3),CT(530,368,"“trust the keeper”",30,CORAL),CT(530,414,"— what every system asks",22,CORAL,op=0.85)]
    g+=[L(320,315,740,435,CORAL,4)]
    g+=ARR(790,375,900,375,SOFT,4)
    g+=[R(940,300,600,150,GREEN,4),CT(1240,360,"the math",30,GREEN,weight="bold")]
    g+=[CT(1240,406,"even the branch holding the pen",22,SOFT),CT(1240,436,"can't quietly change what it wrote",22,SOFT)]
    g+=[CT(960,590,"— which makes faking the record the one unforgivable crime —",28,AMBER)]
    for i,lab in enumerate(["no vote","no verdict","no law"]):
        x=560+i*400; g+=[R(x-150,660,300,90,DIMB,2),CT(x,715,lab,26,SOFT)]
    g+=ARR(960,760,960,820,CORAL,4)
    g+=[CT(960,880,"nothing can stand on a faked record",30,WHITE,weight="bold")]
    return g

def f_detectable():  # 6  the operator outside the box — detectable, not impossible
    g=[CT(960,105,"one honest limit: this binds the executive INSIDE the system",34,SOFT)]
    g+=[R(300,240,900,560,STEEL,3),CT(750,285,"THE SYSTEM",24,STEEL)]
    for i,lab in enumerate(["the record","the chambers","the courts","the code"]):
        x=380+(i%2)*430; y=360+(i//2)*180
        g+=[R(x,y,360,120,SOFT,2),CT(x+180,y+70,lab,24,SOFT)]
    g+=[CT(750,780,"the executive can't cheat the record it keeps",22,GREEN)]
    g+=[person(1560,360,34,AMBER),CT(1560,430,"the operator",24,AMBER),CT(1560,464,"owns the machine",20,SOFT)]
    g+=[R(1500,540,120,70,CORAL,3),CT(1560,584,"the plug",22,CORAL)]
    g+=ARR(1420,470,1215,470,CORAL,4)+[CT(1315,445,"outside it",20,CORAL)]
    g+=[CT(960,880,"they could delete it, hide it, or fork their own copy —",28,WHITE)]
    g+=[CT(960,926,"but not in SECRET. tampering is always visible.",28,AMBER,weight="bold")]
    return g

def f_floor():  # 6  the guarantee + the floor (fork off)
    g=[CT(960,130,"so the guarantee isn't “they can't” —",34,SOFT)]
    g+=[CT(960,186,"it's “they can't get away with it”",38,WHITE,weight="bold")]
    g+=[person(360,470,30,STEEL),CT(360,545,"you",22,SOFT)]
    g+=[R(300,600,120,70,GREEN,3),CT(360,644,"see it",22,GREEN)]
    g+=ARR(430,470,600,470,SOFT,4)+[CT(515,432,"caught",20,AMBER)]
    g+=[R(640,380,300,190,CORAL,3),CT(790,360,"a liar caught",22,CORAL)]
    g+=[person(720,470,16,STEEL),person(790,500,16,STEEL),person(860,460,16,STEEL)]
    g+=ARR(960,470,1140,470,GREEN,5)+[CT(1050,432,"fork off",24,GREEN,weight="bold"),CT(1050,510,"take your things",20,SOFT)]
    g+=[R(1180,380,320,190,GREEN,3),CT(1340,360,"somewhere honest",22,GREEN)]
    g+=[person(1270,470,16,GREEN),person(1340,500,16,GREEN),person(1410,460,16,GREEN)]
    g+=[CT(960,760,"a liar gets caught; a caught liar gets abandoned",32,WHITE,weight="bold")]
    g+=[CT(960,820,"that's the floor under everything",26,AMBER)]
    return g

def f_handoff():  # 7  hand forward to Ch7 (the dial)
    g=[CT(960,150,"you don't have to trust whoever runs this —",34,SOFT)]
    g+=[CT(960,206,"check every number yourself, and walk if they cheat",30,WHITE)]
    g+=[CT(500,340,"that covers the community",24,SOFT)]
    for i in range(9):
        a=math.radians(i*40); g+=[person(500+120*math.cos(a),470+120*math.sin(a)*0.9,14,STEEL)]
    g+=[CT(500,640,"the people who live here",22,SOFT)]
    g+=ARR(680,470,1180,470,AMBER,6)+[CT(930,430,"the last chapter flips sides",24,AMBER)]
    g+=[person(1420,470,30,AMBER),CT(1420,545,"the organizer",24,AMBER)]
    g+=[C(1420,360,44,WHITE,4),L(1420,360,1452,332,WHITE,4)]
    g+=[CT(960,820,"how do you switch on a whole constitution —",28,WHITE)]
    g+=[CT(960,866,"before the crowd to run it even exists?",28,SOFT)]
    return g

CH6=[
 ("ch6-01-pen", f_pen()),                       # 1  code writes the record — what stops it lying?
 ("ch6-02-reality", f_record_reality()),        # 2  a digital world has no outside
 ("ch6-03-tamper", f_tamper_chain(2)),          # 3  the tamper-evident chain [hero]
 ("ch6-04-selfref", f_selfref()),               # 3  the writer is inside the written
 ("ch6-05-verify", f_verify()),                 # 3  check it yourself
 ("ch6-06-blockchain", f_blockchain()),         # 4  a blockchain, minus the cryptocurrency
 ("ch6-07-frommath", f_from_math()),            # 5  honesty from math — the unforgivable crime
 ("ch6-08-detectable", f_detectable()),         # 6  the operator outside the box
 ("ch6-09-floor", f_floor()),                   # 6  they can't get away with it — fork off
 ("ch6-10-handoff", f_handoff()),               # 7  hand forward to Ch7
]

# ================= CH 7 — A DIAL ON AN HONEST FLOOR =================
def f_organizer():  # 1  this one's for the organizer; the dial from 1 to 1,000,000
    g=[CT(960,110,"every other chapter spoke to a community — this one is for the person starting one",32,SOFT)]
    g+=[CT(520,220,"chapters 1–6",24,DIM)]
    for i in range(24):
        a=math.radians(i*15); r=90+(i%3)*16; g+=[person(520+r*math.cos(a),340+r*math.sin(a)*0.85,9,DIMB,0.8)]
    g+=[CT(520,490,"a crowd",22,DIM)]
    g+=ARR(700,340,860,340,SOFT,4)+[CT(780,300,"flip",20,SOFT)]
    g+=[person(1040,340,40,AMBER),CT(1040,430,"one organizer",26,AMBER),CT(1040,490,"standing a world up",22,SOFT)]
    ax0,ax1,ay=360,1560,680; g+=[L(ax0,ay,ax1,ay,WHITE,5)]
    for xx in (ax0,ax1): g+=[L(xx,ay-16,xx,ay+16,WHITE,5)]
    g+=[CT(ax0,ay+58,"a population of 1",24,SOFT),CT(ax1,ay+58,"a population of 1,000,000",24,SOFT)]
    g+=[CT(960,ay-46,"the SAME process runs at every setting",24,GREEN)]
    g+=[CT(960,850,"you don't switch it all on at once — you turn a dial, on your own schedule",30,WHITE)]
    g+=[CT(960,910,"from “you decide everything” to “the community decides everything”",26,SOFT)]
    return g

def f_bedrock():  # 2  the honest floor: three bedrock slabs [hero]
    g=[CT(960,110,"start with the part that doesn't move — the floor the dial sits on",34,SOFT)]
    slabs=[("MONEY CAN'T\nBUY POWER","the firewall — a vote,\nnever a payout"),
           ("THE RECORD\nCAN'T BE FAKED","anyone can check\nwhat really happened"),
           ("ANYONE CAN\nALWAYS LEAVE","walk out with your account,\nstanding, everything you built")]
    x0=210; bw=480; gap=30; y=280; bh=300
    for i,(t,d) in enumerate(slabs):
        x=x0+i*(bw+gap)
        g+=[R(x,y,bw,bh,GREEN,5,fill=DARK)]
        for j,ln in enumerate(t.split("\n")): g+=[CT(x+bw/2,y+80+j*46,ln,34,WHITE,weight="bold")]
        for j,ln in enumerate(d.split("\n")): g+=[CT(x+bw/2,y+210+j*38,ln,23,SOFT)]
    for xx in range(x0,x0+3*bw+2*gap,60): g+=[L(xx,y+bh+8,xx+40,y+bh+48,GREEN,3,0.5)]
    g+=[CT(960,720,"identical at every dial setting — and not even you can switch them off",30,WHITE)]
    g+=[CT(960,790,"three slabs. bedrock.",30,GREEN,weight="bold")]
    return g

def f_moderation():  # 3  you already run a government — you just call it moderation
    g=[CT(960,110,"you already run a government — you just call it moderation",36,SOFT)]
    rows=[("the operator","the executive"),("the mods","the police"),
          ("the unwritten rules","the law"),("the ban appeals","the courts"),("the mod-log","the record")]
    y0=230; rh=88
    for i,(a,b) in enumerate(rows):
        y=y0+i*rh
        g+=[R(360,y,440,64,STEEL,3),CT(580,y+42,a,26,SOFT)]
        g+=ARR(810,y+32,900,y+32,GREEN,4)
        g+=[R(910,y,440,64,WHITE,3),CT(1130,y+42,b,26,WHITE)]
    g+=[R(1420,300,420,220,AMBER,3),CT(1630,270,"rule-of-law: a gift to you",22,AMBER)]
    g+=[CT(1630,350,"“you broke rule 4,",22,SOFT),CT(1630,386,"here's the log,",22,SOFT),CT(1630,422,"you can appeal”",22,SOFT)]
    g+=[CT(1630,482,"the rules take the heat, not you",20,GREEN)]
    g+=[CT(960,780,"this doesn't drop a government on a blank slate —",28,WHITE)]
    g+=[CT(960,822,"it formalizes the one every community already has",28,WHITE)]
    return g

def f_cap_equity():  # 4  capital chamber: an equity award (a vote, never cash)
    g=[CT(960,110,"how much does the founder start with? it FALLS OUT of the same machine",34,SOFT)]
    g+=[CT(960,168,"authority follows the work — and early on, the founder does all of it",24,SOFT)]
    g+=[CT(960,255,"the CAPITAL chamber — the funders' count",26,AMBER,weight="bold")]
    g+=[C(360,400,42,AMBER,3,DARK),CT(360,412,"$1",28,AMBER)]
    g+=[CT(360,480,"a dollar of pay",22,SOFT)]
    g+=ARR(420,400,600,400,GREEN,5)+[CT(510,360,"plowed",22,GREEN),CT(510,462,"straight back in",20,SOFT)]
    g+=[R(650,340,320,120,GREEN,4),CT(810,392,"minted as",22,SOFT),CT(810,428,"STANDING",26,GREEN,weight="bold")]
    g+=[L(810,470,810,540,CORAL,3,dash="7 7"),CT(810,585,"never reaches a pocket",20,CORAL)]
    g+=ARR(985,400,1120,400,SOFT,4)
    g+=[R(1160,320,620,170,WHITE,3),CT(1470,300,"sized to the community's own funding",22,SOFT)]
    g+=[CT(1470,375,"matched dollar-for-dollar  +  1 unit",26,WHITE)]
    g+=[CT(1470,435,"→ a hair past half: a bare majority of the funders",23,GREEN)]
    g+=[CT(960,700,"the ordinary startup move — founder equity for the work put in",26,SOFT)]
    g+=[CT(960,830,"the pool never grows, only the standing does —",28,WHITE)]
    g+=[CT(960,880,"which is exactly why it's a VOTE, not cash",30,AMBER,weight="bold")]
    return g

def f_labor_consumer():  # 4  labor dilutes; consumer ~zero; 2 of 3 = control
    g=[CT(960,110,"the other two chambers — and why two is enough",34,SOFT)]
    g+=[CT(470,220,"LABOR — the makers' count",24,GREEN,weight="bold")]
    cx,cy,r=470,440,120
    def _sector(a0,a1,col):  # clean pie sector, correct large-arc flag
        x0=cx+r*math.cos(math.radians(a0)); y0=cy+r*math.sin(math.radians(a0))
        x1=cx+r*math.cos(math.radians(a1)); y1=cy+r*math.sin(math.radians(a1))
        large=1 if (a1-a0)>180 else 0
        return f'<path d="M {cx} {cy} L {x0} {y0} A {r} {r} 0 {large} 1 {x1} {y1} Z" fill="{col}" stroke="{DARK}" stroke-width="3"/>'
    # founder still a majority (~58%), from top clockwise; the rest = other makers' slices
    fa0,fa1=-90,-90+0.58*360
    g+=[_sector(fa0,fa1,GREEN)]                      # founder wedge, solid
    g+=[C(cx,cy,r,GREEN,4)]                          # rim
    for ang in [fa1, fa1+50, fa1+100, 270]:         # radial dividers across the remaining slices
        g+=[L(cx,cy,cx+r*math.cos(math.radians(ang)),cy+r*math.sin(math.radians(ang)),STEEL,2,0.8)]
    g+=[CT(cx+34,cy+18,"founder",20,DARK,weight="bold")]
    g+=[CT(cx,cy+r+48,"100% at first — then dilutes",22,SOFT)]
    g+=ARR(cx+r+30,cy-40,cx+r+150,cy-40,SOFT,4)+[CT(cx+r+230,cy-70,"as others",22,SOFT),CT(cx+r+230,cy-34,"build alongside",22,SOFT)]
    g+=[CT(cx+r+230,cy+40,"the grip loosens by",20,SOFT),CT(cx+r+230,cy+72,"the same crediting rule",20,SOFT)]
    g+=[CT(1300,220,"CONSUMER — the players' count",24,DIM,weight="bold")]
    g+=[C(1300,430,110,DIMB,3,DARK),CT(1300,442,"~0",44,DIM)]
    g+=[CT(1300,590,"nothing automatic — earned by playing, or not at all",20,SOFT)]
    g+=[CT(1300,626,"— and they don't need it",20,SOFT)]
    g+=[CT(960,780,"a decision takes two of three chambers —",28,WHITE)]
    g+=[CT(960,830,"capital + labor are already two",30,GREEN,weight="bold")]
    g+=[CT(960,888,"consumer is the one the founder can let go from day one",24,SOFT)]
    return g

def f_branches():  # 5  chambers -> branches: PM (executive) + judiciary pool collapses to one
    g=[CT(960,100,"holding two of three chambers hands you the other two branches",34,SOFT)]
    g+=[CT(430,190,"EXECUTIVE — comes free",24,GREEN,weight="bold")]
    r,_=rings(310,360,72,(AMBER,AMBER,WHITE)); g+=r+[CT(310,485,"2 of 3 chambers",21,SOFT)]
    g+=ARR(430,340,560,340,GREEN,5)+[CT(495,302,"elect",20,GREEN)]
    g+=[C(680,340,48,WHITE,4),CT(680,352,"PM",26,WHITE,weight="bold"),CT(680,428,"the chambers ARE",20,SOFT),CT(680,458,"the executive",20,SOFT)]
    g+=[CT(1360,190,"JUDICIARY — no seat, a jury drawn by lot",24,SOFT,weight="bold")]
    ax0,ax1,ay=1050,1720,400; g+=[L(ax0,ay,ax1,ay,WHITE,3)]
    g+=[CT(ax0,ay+40,"day one",18,SOFT),CT(ax1,ay+40,"most senior",18,SOFT)]
    g+=[L(ax0+30,ay-140,ax0+30,ay+20,AMBER,4),CT(ax0+30,ay-160,"seniority bar",20,AMBER)]
    g+=[person(ax0+95,ay-70,24,AMBER),CT(ax0+95,ay-110,"the founder",18,AMBER)]
    for i in range(6): g+=[person(ax0+220+i*70,ay-60,12,DIMB,0.7)]
    g+=[CT(1385,ay+95,"the founder is the most senior citizen there is, by construction",20,SOFT)]
    g+=[CT(1385,ay+130,"→ set the bar at day one and the whole pool is you",20,SOFT)]
    g+=[CT(960,650,"the founder holds the judiciary only by keeping the pool small —",26,WHITE)]
    g+=[CT(960,696,"lower the bar and the courts pass to real citizens on their own",26,WHITE)]
    g+=[CT(960,800,"a clock you can't fake — the first branch to leave your hands as you open up",26,AMBER)]
    return g

def f_budget():  # 5  the budget coda: legislature writes the budget -> income keeps flowing
    g=[CT(960,120,"the same control has a plainer payoff, too",34,SOFT)]
    chain=[("the chambers",WHITE),("ARE the legislature",WHITE),("write the budget",GREEN),("your income:\na line you control",AMBER)]
    x0=250; bw=360; y=340; bh=150
    for i,(lab,col) in enumerate(chain):
        x=x0+i*(bw+30)
        g+=[R(x,y,bw,bh,col,4)]
        for j,ln in enumerate(lab.split("\n")): g+=[CT(x+bw/2,y+(88 if len(lab.split('\n'))==1 else 66)+j*38,ln,26,col,weight="bold" if col in (GREEN,AMBER) else "normal")]
        if i<3: g+=ARR(x+bw,y+bh/2,x+bw+30,y+bh/2,SOFT,4)
    g+=[CT(960,640,"an operator who was already making a living keeps making it —",28,WHITE)]
    g+=[CT(960,686,"paid out the way a salary is: the same revenue, a couple extra steps",26,SOFT)]
    g+=[CT(960,800,"a DRAW from one operating budget — not profit pocketed, not a lever on outcomes",24,DIM)]
    return g

def f_abstain():  # 6  graduated participation: abstention
    g=[CT(960,110,"holding all of it doesn't mean wielding all of it",36,SOFT)]
    g+=[CT(960,166,"hand specific decisions to the community — one at a time — by ABSTAINING",26,GREEN)]
    ox,oy=380,470
    g+=[R(ox-110,oy-90,220,180,DIMB,3,fill=DARK),CT(ox,oy-6,"the operator's",22,DIM),CT(ox,oy+30,"heavy weight",22,DIM)]
    g+=[L(ox-110,oy-90,ox+110,oy+90,DIMB,3),L(ox+110,oy-90,ox-110,oy+90,DIMB,3)]
    g+=[CT(ox,oy+150,"held OFF the scale",24,AMBER),CT(ox,oy+186,"(abstains)",20,SOFT)]
    g+=ARR(ox+140,oy,ox+300,oy,SOFT,4)
    bx,by,bw,bh=880,300,520,360
    g+=[R(bx,by,bw,bh,SOFT,2)]
    fillh=240; ql=by+bh-140
    g+=[f'<rect x="{bx+3}" y="{by+bh-3-fillh}" width="{bw-6}" height="{fillh}" rx="6" fill="{GREEN}" opacity="0.5"/>']
    g+=[CT(bx-70,ql+8,"quorum",22,AMBER),L(bx,ql,bx+bw,ql,AMBER,3,dash="10 8")]
    g+=[CT(bx+bw/2,by+bh-70,"the community's votes",24,WHITE)]
    g+=[CT(bx+bw/2,by+bh-fillh-24,"the tally still CLEARS the line",22,GREEN)]
    g+=[CT(960,760,"the vote reaches quorum and resolves on everyone else's — the community decides",26,WHITE)]
    g+=[CT(960,820,"defer the calls you want to, hold the ones you don't — nobody carries the whole load",24,SOFT)]
    return g

def f_ratify():  # 7  ratification: the amendment roster, welded above ordinary law [final frame]
    g=[CT(960,105,"none of it is permanent yet — until RATIFICATION",36,SOFT)]
    g+=[CT(960,160,"the point the community locks in what it wants to keep",24,SOFT)]
    cards=["due process","free expression","term limits","…and the rest"]
    x0=250; cw=340; y=250; ch=130
    for i,c in enumerate(cards):
        x=x0+i*(cw+30); col=GREEN if i<3 else STEEL
        g+=[R(x,y,cw,ch,col,3),CT(x+cw/2,y+76,c,26,col if i==3 else WHITE)]
    g+=[CT(960,440,"a roster of ready-made amendments — picked à la carte and bolted in",24,SOFT)]
    g+=[CT(960,478,"each amendment is a notch on the dial; ratification sets it and welds it",24,SOFT)]
    g+=[R(600,560,720,70,DIMB,2),CT(960,604,"ordinary law — a simple majority can change it next week",22,SOFT)]
    g+=[R(600,650,720,80,AMBER,4),CT(960,690,"an amendment — supermajority of every chamber to enact OR repeal",22,WHITE)]
    g+=[CT(1400,690,"the weld",22,AMBER)]
    g+=[CT(960,830,"nothing forces you to install any — top-down, locked in, is a legit constitution too",24,SOFT)]
    g+=[CT(960,910,"the structure doesn't force you to become a democrat. it just makes it SAFE to.",30,WHITE,weight="bold")]
    return g

CH7=[
 ("ch7-01-organizer", f_organizer()),       # 1  this one's for the organizer; the dial 1→1,000,000
 ("ch7-02-floor", f_bedrock()),             # 2  the honest floor — three bedrock slabs [hero]
 ("ch7-03-moderation", f_moderation()),     # 3  you already run a government
 ("ch7-04-dial", f_continuum()),            # 3  the dial on the floor [hero]
 ("ch7-05-cap-equity", f_cap_equity()),     # 4  capital — an equity award (a vote, not cash)
 ("ch7-06-labor-consumer", f_labor_consumer()),  # 4  labor dilutes · consumer ~0 · 2-of-3 = control
 ("ch7-07-branches", f_branches()),         # 5  chambers → executive + judiciary (seniority bar)
 ("ch7-08-budget", f_budget()),             # 5  the budget/income coda
 ("ch7-09-abstain", f_abstain()),           # 6  graduated participation — abstention
 ("ch7-10-delegation", f_delegation()),     # 6  …and delegation (callback to Ch 3)
 ("ch7-11-ratify", f_ratify()),             # 7  ratification — makes it safe to [final frame]
]

# ================= CH 1 — THE HERO MONTAGE =================
def f_next():  # end card: keep watching — chapters 2-7 teaser grid (labels = placeholder, sync to final titles)
    g=[CT(960,110,"that was the whole machine, end to end",38,WHITE,weight="bold")]
    g+=[CT(960,166,"the next six videos take it one piece at a time — keep watching:",28,SOFT)]
    chapters=[("2","Why a Game"),("3","The Three Chambers"),("4","The Argument, Not the Crowd"),
              ("5","Governing Is Shipping Software"),("6","Don't Trust, Verify"),("7","A Dial on an Honest Floor")]
    cw,chh=580,150; gx=[230,830]; gy=[230,405,580]
    for i,(num,title) in enumerate(chapters):
        col=i%2; row=i//2; x=gx[col]; y=gy[row]; nextup=(i==0); bcol=GREEN if nextup else STEEL
        g+=[R(x,y,cw,chh,bcol,3,fill=DARK)]
        pcx,pcy=x+72,y+chh/2
        g+=[C(pcx,pcy,34,bcol,3,DARK), f'<polygon points="{pcx-9},{pcy-15} {pcx-9},{pcy+15} {pcx+17},{pcy}" fill="{bcol}"/>']
        g+=[T(x+132,y+60,f"CHAPTER {num}"+("   ·  up next" if nextup else ""),20,AMBER if nextup else DIM,weight="bold")]
        g+=[T(x+132,y+104,title,26,WHITE)]
    g+=[CT(960,900,"six short deep-dives — one per piece of the machine",26,SOFT)]
    return g

CH1=[
 ("ch1-01-hub", f_hub()),                                              # 0  tools route through one point
 ("ch1-02-whyagame", f_opener()),                                     # 0/① why a game  [Ch2 hero]
 ("ch1-03-rings", f_rings(False)),                                     # ①  three contributors  [Ch3 hero]
 ("ch1-04-fork", f_fork()),                                            # ①  machine vs human (sets up Ch5)
 ("ch1-05-openfloor", f_openfloor()),                                  # ②  a proposal on the open floor
 ("ch1-06-graph-attach", f_graph(1)),                                 # ③  claims attach  [Ch4 hero build]
 ("ch1-07-graph-answered", f_graph(2)),                               # ③  …one answered, closes
 ("ch1-08-graph-open", f_graph(3)),                                   # ③  …one stays open
 ("ch1-09-chambers", f_rings(True, title="each force gets its own count",
                             cap="nothing passes by capturing just one")),  # ④  chambers, 2-of-3  [Ch3 hero]
 ("ch1-10-model-leg", master(level=2, title="a law is a change to the code — three branches make it real")),  # ⑤ assemble…
 ("ch1-11-model-exec", master(level=3)),                               # ⑤  …+executive
 ("ch1-12-model-jud", master(level=4)),                                # ⑤  …+judicial
 ("ch1-13-pipeline-stations", f_pipeline(1)),                          # ⑤  build like software…  [Ch5 hero build]
 ("ch1-14-pipeline-ships", f_pipeline(2)),                             # ⑤  …conforms → ships
 ("ch1-15-pipeline-remand", f_pipeline(3)),                            # ⑤  …misses → remand
 ("ch1-16-model-record", master(level=5)),                             # ⑥  all written down  [Ch6 hero]
 ("ch1-17-fill", master(level=5, pop="one", title="the same model, whatever the population",
                        cap="one founder can hold every seat", sub="the model doesn't change — only who fills it")),  # close
 ("ch1-18-dial", f_continuum(safe_line="it opens up as far as the founder chooses — it just makes it safe to")),  # close [Ch7 hero]
 ("ch1-19-next", f_next()),                                            # end card: keep watching → chapters 2-7
]

def emit(name,parts):
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">'+"\n".join(parts)+'</svg>'
    sp=os.path.join(OUT_SVG,name+".svg"); open(sp,"w").write(svg); pp=os.path.join(OUT_PNG,name+".png")
    r=subprocess.run(["convert","-background","none","-density","192",sp,pp],check=False,capture_output=True)
    if r.returncode!=0 or not os.path.exists(pp):
        subprocess.run(["convert","-background","none","-density","96",sp,"-resize","3840x2160",pp],check=False)
    print("  ",name)

ALL=CH1+CH2+CH3+CH4+CH5+CH6+CH7
if __name__=="__main__":
    print(f"{len(ALL)} frames -> {OUT_PNG}")
    for n,p in ALL: emit(n,p)
    print("done")
