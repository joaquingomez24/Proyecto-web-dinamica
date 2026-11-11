"""Genera ilustraciones minimalistas de gorras cerradas -> public/img/gorra-<color>-<f|s>-<720|1080|1400>.webp"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps
W, H, S = 1400, 1750, 2
COLORS = {'negro':'#1c1c1c','crema':'#e6dfd0','marino':'#1f2a44','oliva':'#5b6140','terracota':'#a9573a','gris':'#8a8c8f','bordo':'#5a1f2b','celeste':'#9bb4cc'}
def hx(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))
def shade(c,k): return tuple(max(0,min(255,int(v*k))) for v in c)
def grad(w,h,top,bot):
    t=np.linspace(0,1,h)[:,None,None]; a=np.array(top)[None,None,:]*(1-t)+np.array(bot)[None,None,:]*t
    return Image.fromarray(np.repeat(a,w,1).astype('uint8'))
def paint(mask,base,light=1.12,dark=0.78):
    return Image.composite(grad(*mask.size,shade(base,light),shade(base,dark)),Image.new('RGB',mask.size),mask)
def shadow(img,box,blur=40):
    sh=Image.new('L',img.size,0); ImageDraw.Draw(sh).ellipse(box,fill=70); sh=sh.filter(ImageFilter.GaussianBlur(blur))
    img.paste((120,120,118),mask=sh)
import math
def se(cx,cy,rx,ry,n=2.5,a0=0,a1=math.pi,k=80):
    pts=[]
    for i in range(k+1):
        a=a0+(a1-a0)*i/k; ca,sa=math.cos(a),math.sin(a)
        pts.append((cx+rx*math.copysign(abs(ca)**(2/n),ca),cy-ry*math.copysign(abs(sa)**(2/n),sa)))
    return pts
def poly(w,h,pts): return [(w*x,h*y) for x,y in pts]
def layer(w,h,pts):
    m=Image.new('L',(w,h),0); ImageDraw.Draw(m).polygon(poly(w,h,pts),fill=255); return m
def put(im,mask,c,l=1.1,dk=.76): im.paste(paint(mask,c,l,dk),mask=mask)
def clipped(im,mask,fn):
    t=Image.new('L',im.size,0); fn(ImageDraw.Draw(t)); t=Image.fromarray((np.array(t)*(np.array(mask)/255)).astype('uint8'))
    im.paste((0,0,0),mask=t.point(lambda v:int(v*.30)))
def chaikin(pts,n=3):
    for _ in range(n):
        o=[pts[0]]
        for a,b in zip(pts,pts[1:]): o+= [(.75*a[0]+.25*b[0],.75*a[1]+.25*b[1]),(.25*a[0]+.75*b[0],.25*a[1]+.75*b[1])]
        pts=o+[pts[-1]]
    return pts
def sheen(im,mask,cx,cy,sx,sy,amt):
    w,h=im.size; y,x=np.mgrid[0:h,0:w]; L=np.exp(-(((x-cx*w)/(sx*w))**2+((y-cy*h)/(sy*h))**2)/2)*(np.array(mask)/255)*amt
    a=np.array(im).astype(float); a+= (255-a)*L[...,None]; return Image.fromarray(a.clip(0,255).astype('uint8'))
def cap34(c):
    """Vista de tres cuartos, visera plana, copa estructurada (estilo catálogo)."""
    w,h=W*S,H*S; im=grad(w,h,(255,255,255),(245,245,244)); shadow(im,(w*.08,h*.66,w*.82,h*.80),45*S)
    cx,cy,rx,ry=.58,.57,.29,.095
    base=[(cx+rx*math.cos(t),cy+ry*math.sin(t)) for t in [math.pi*(1-k/60) for k in range(61)]]
    m=layer(w,h,se(cx,cy,rx,.34,2.6)+base); put(im,m,c,1.10,.70)
    im=sheen(im,m,.45,.33,.13,.12,.22); dark=sum(c)<200
    B=(cx-.01,.235)
    def seams(d):
        for deg in (150,115,80,45):
            t=math.radians(deg); P=(cx+rx*math.cos(t),cy+ry*math.sin(t)); M=((B[0]+P[0])/2+.045*math.cos(t),(B[1]+P[1])/2)
            pts=[(((1-u)**2)*B[0]+2*u*(1-u)*M[0]+u*u*P[0],((1-u)**2)*B[1]+2*u*(1-u)*M[1]+u*u*P[1]) for u in [k/30 for k in range(31)]]
            d.line(poly(w,h,pts),fill=255,width=4*S)
    t=Image.new('L',(w,h),0); seams(ImageDraw.Draw(t)); t=Image.fromarray((np.array(t)*(np.array(m)/255)).astype('uint8'))
    im.paste((255,255,255) if dark else (0,0,0),mask=t.point(lambda v:int(v*(.13 if dark else .28))))
    d=ImageDraw.Draw(im)
    d.ellipse((w*(B[0]-.017),h*(B[1]-.011),w*(B[0]+.017),h*(B[1]+.011)),fill=shade(c,.72))
    for ex,ey in ((.415,.43),(.79,.41)): d.ellipse((w*(ex-.007),h*(ey-.005),w*(ex+.007),h*(ey+.005)),fill=shade(c,.45))
    inner=[(cx+rx*math.cos(math.radians(a)),cy+ry*math.sin(math.radians(a))) for a in range(105,181,5)]
    outer=chaikin([inner[-1],(.20,.595),(.11,.64),(.065,.69),(.09,.735),(.20,.748),(.34,.73),(.44,.70),inner[0]])
    brim=outer+inner
    under=layer(w,h,[(x,y+.014) for x,y in brim]); put(im,under,c,.62,.42)
    bm=layer(w,h,brim); put(im,bm,c,1.12,.88)
    im=sheen(im,bm,.20,.70,.10,.04,.14)
    st=Image.new('L',(w,h),0); ImageDraw.Draw(st).line(poly(w,h,[(.30+(x-.30)*.92,.68+(y-.68)*.86) for x,y in outer]),fill=255,width=3*S)
    st=Image.fromarray((np.array(st)*(np.array(bm)/255)).astype('uint8'))
    im.paste((255,255,255) if dark else (0,0,0),mask=st.point(lambda v:int(v*(.16 if dark else .25))))
    return im.resize((W,H),Image.LANCZOS)
front=cap34
def side(c): return ImageOps.mirror(cap34(c))
for n,hexv in COLORS.items():
    c=hx(hexv)
    for v,f in (('a',front),('b',side)):
        img=f(c)
        for sz in (720,1080,1400): img.resize((sz,round(sz*H/W)),Image.LANCZOS).save(f'public/img/gorra-{n}-3q{v}-{sz}.webp',quality=82)
print('ok',len(COLORS)*2*3)
