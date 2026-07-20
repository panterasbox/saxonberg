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
def f_opener():
    g=[CT(860,120,"people pour themselves into games — and not into governing",38,SOFT)]
    base=720; bw=200; gx=430; gh=420
    g+=[R(gx,base-gh,bw,gh,GREEN,3,fill=GREEN),CT(gx+bw/2,base-gh-72,"hundreds of hours",22,SOFT),
        CT(gx+bw/2,base-gh-30,"a game",30,GREEN,weight="bold"),
        CT(gx+bw/2,base+42,"a character you built",22,SOFT),CT(gx+bw/2,base+76,"a reputation you earned",22,SOFT)]
    cx=930; ch=42
    g+=[R(cx,base-ch,bw,ch,DIMB,3),CT(cx+bw/2,base-ch-30,"governing",30,DIMB,weight="bold"),
        CT(cx+bw/2,base+42,"the meeting nobody",22,DIM),CT(cx+bw/2,base+76,"comes to",22,DIM)]
    g+=[L(gx-40,base,cx+bw+40,base,SOFT,2,0.5)]
    g+=[PATH(f"M {gx+bw+30} {base-gh+60} C {gx+bw+220} {base-gh+40}, 1360 {base-260}, 1360 {base-120}",AMBER,4)]
    g+=ARR(1360,base-140,1360,base-70,AMBER,4)
    g+=[CT(1440,base-300,"the participation",26,AMBER),CT(1440,base-262,"is real —",26,AMBER),
        CT(1440,base-40,"just aimed",24,SOFT),CT(1440,base-6,"at games",24,SOFT)]
    g+=[CT(860,960,"so we aim a game at governing — and put the government inside it",32,WHITE)]
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
def f_investment():
    g=[CT(860,120,"a game pulls people in — through investment",40,SOFT)]
    nodes=[("you sink\nhours in",300,STEEL),("it matters\nto you",640,AMBER),("so do\nits rules",980,GREEN),("you're in\nthe governing",1320,WHITE)]
    y,bw,bh=330,300,150
    for i,(lab,x,col) in enumerate(nodes):
        g+=[R(x,y,bw,bh,col,4)]
        for j,ln in enumerate(lab.split("\n")): g+=[CT(x+bw/2,y+60+j*40,ln,30,col)]
        if i<3: g+=ARR(x+bw,y+bh/2,x+bw+40,y+bh/2,SOFT,4)
    g+=[CT(860,600,"it's all just data — but data you earned, so what happens to it lands like it's real",26,SOFT)]
    g+=[CT(560,760,"civic life:",28,SOFT)]+ARR(660,752,760,752,CORAL,4)+[CT(880,760,"a cost",28,CORAL)]
    g+=[CT(1120,760,"a game:",28,SOFT)]+ARR(1220,752,1320,752,GREEN,4)+[CT(1430,760,"the reward",28,GREEN)]
    return g
def f_forkable():
    g=[CT(860,120,"a polity made of words — inspect it, verify it, carry it off",38,SOFT)]
    bx,by,bw,bh=250,320,520,340; g+=[R(bx,by,bw,bh,WHITE,4)]
    for i,r in enumerate(["argument  10110…","vote      01101…","law       11001…","code      00111…","record    10100…"]):
        g+=[T(bx+34,by+62+i*56,r,28,STEEL,mono=True)]
    g+=[CT(bx+bw/2,by-24,"the whole polity — all just information",24,SOFT)]
    g+=ARR(bx+bw,by+bh/2,bx+bw+180,by+bh/2,GREEN,5)+[CT(bx+bw+130,by+bh/2-26,"fork",22,GREEN)]
    fx,fy=bx+bw+200,by+40; g+=[R(fx,fy,300,260,GREEN,3)]
    for i in range(5): g+=[L(fx+30,fy+48+i*44,fx+250,fy+48+i*44,STEEL,3,0.7)]
    g+=[CT(fx+150,fy+300,"your own copy — carry it off",22,GREEN)]
    g+=[CT(860,1000,"legible · verifiable · forkable — in a way paper and stone never were",30,WHITE)]
    return g
def f_laboratory():
    g=[CT(960,120,"a laboratory — not a model OF a government, a place to RUN one",38,SOFT)]
    g+=[CT(500,240,"real politics",28,CORAL)]+ARR(300,420,720,420,CORAL,6)
    g+=[CT(510,380,"one shot · enormous scale",24,SOFT),L(560,470,600,510,CORAL,4),L(600,470,560,510,CORAL,4),CT(600,560,"no rewind",24,CORAL)]
    g+=[CT(1400,240,"here",28,GREEN)]; cx,cy,r=1400,470,120
    for (a0,a1) in [(-80,30),(40,150),(160,270)]:
        th0=math.radians(a0); th1=math.radians(a1); x0,y0=cx+r*math.cos(th0),cy+r*math.sin(th0); x1,y1=cx+r*math.cos(th1),cy+r*math.sin(th1)
        g+=[PATH(f"M {x0} {y0} A {r} {r} 0 0 1 {x1} {y1}",GREEN,5)]+ARR(x1-6*math.cos(th1),y1-6*math.sin(th1),x1,y1,GREEN,4)
    for lab,a in [("try",-25),("it breaks",95),("try again",215)]:
        th=math.radians(a); g+=[CT(cx+(r+62)*math.cos(th),cy+(r+62)*math.sin(th)+8,lab,24,GREEN)]
    g+=[CT(960,760,"build the idea into a working world — watch how it holds up",28,SOFT),CT(960,900,"try it.  watch it break.  try again.",34,WHITE)]
    return g

CH2=[
 ("ch2-01-opener", f_opener()),                    # 1  games get your hours, not governing  [Ch2 hero]
 ("ch2-02-investment", f_investment()),            # 2  why a game — the investment mechanism
 ("ch2-03-forkable", f_forkable()),                # 4  made of words — forkable
 ("ch2-04-laboratory", f_laboratory()),            # 5  the laboratory
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

ALL=CH1+CH2
if __name__=="__main__":
    print(f"{len(ALL)} frames -> {OUT_PNG}")
    for n,p in ALL: emit(n,p)
    print("done")
