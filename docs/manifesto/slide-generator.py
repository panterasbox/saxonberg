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
def CT(cx,y,s,size=32,fill=WHITE,weight="normal",op=1.0): return T(cx,y,s,size,fill,"middle",weight,op)
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

# ================= CH 1 — THE HERO MONTAGE =================
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
]

def emit(name,parts):
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">'+"\n".join(parts)+'</svg>'
    sp=os.path.join(OUT_SVG,name+".svg"); open(sp,"w").write(svg); pp=os.path.join(OUT_PNG,name+".png")
    r=subprocess.run(["convert","-background","none","-density","192",sp,pp],check=False,capture_output=True)
    if r.returncode!=0 or not os.path.exists(pp):
        subprocess.run(["convert","-background","none","-density","96",sp,"-resize","3840x2160",pp],check=False)
    print("  ",name)

ALL=CH1+CH2+CH3+CH4
if __name__=="__main__":
    print(f"{len(ALL)} frames -> {OUT_PNG}")
    for n,p in ALL: emit(n,p)
    print("done")
