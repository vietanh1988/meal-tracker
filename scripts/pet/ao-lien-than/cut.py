import numpy as np, sys
from PIL import Image
S='/tmp/claude-0/-home-claude/d69c2595-9aca-50fa-965f-fefb6af7dfaa/scratchpad/aoin'; R='/home/claude/meal-tracker/public/pet'
sh=np.array(Image.open(f'{S}/sheet.png').convert('RGB')).astype(float)
Rr,G,Bb=sh[...,0],sh[...,1],sh[...,2]
a=np.clip((190-(np.minimum(Rr,Bb)-G))/110,0,1)
col=np.zeros_like(sh)
for k in range(3):
    m=np.array([255,0,255])[k]
    col[...,k]=np.where(a>0.01,(sh[...,k]-(1-a)*m)/np.maximum(a,1e-3),0)
rgba=np.dstack([np.clip(col,0,255),a*255]).astype(np.uint8)
full=Image.fromarray(rgba,'RGBA')
ids=[['01','02','03','04','05','06'],['08','09','10','11','12','13']]
def rowspan(al,thr=.5):
    ys,xs=np.nonzero(al>thr*255); return ys.min(),ys.max(),xs.min(),xs.max()
def headx(al,y0,frac):
    # tâm ngang của đầu tại hàng frac giữa đỉnh và đáy
    ys,xs=np.nonzero(al>128); H=ys.max()-ys.min(); y=int(ys.min()+H*frac); r=np.nonzero(al[y]>128)[0]; return (r.min()+r.max())/2
for r in range(2):
    v='nam' if r==0 else 'nu'
    base=Image.open(f'{R}/than/than-{v}.webp').convert('RGBA'); ba=np.array(base)[...,3]
    by0,by1,_,_=rowspan(ba); bcx=headx(ba,by0,.30); bW,bH=base.size
    for c in range(6):
        cell=full.crop((c*256,r*512,(c+1)*256,(r+1)*512)); ca=np.array(cell)[...,3]
        from scipy import ndimage
        lab,n=ndimage.label(ca>60); sz=ndimage.sum(np.ones_like(lab),lab,range(1,n+1)); keep=np.isin(lab,[k+1 for k in range(n) if sz[k]>sz.max()*.02])
        keep=ndimage.binary_dilation(keep,iterations=3); arr=np.array(cell); arr[...,3]=np.where(keep,arr[...,3],0); cell=Image.fromarray(arr); ca=arr[...,3]
        y0,y1,_,_=rowspan(ca); cx=headx(ca,y0,.30)
        s=(by1-by0)/(y1-y0)
        im=cell.resize((round(256*s),round(512*s)),Image.LANCZOS)
        out=Image.new('RGBA',(bW,bH),(0,0,0,0))
        out.alpha_composite(im,(round(bcx-cx*s),round(by0-y0*s)))
        i=ids[r][c]; out.save(f'{S}/out/than-{v}-ao-roi-{i}.png')
        # soát chồng: thân gốc mờ 50% đỏ viền
        chk=Image.new('RGBA',(bW,bH),(255,255,255,255)); chk.alpha_composite(out)
        edge=np.array(base)[...,3]>128; e=edge ^ np.roll(edge,1,0) | edge ^ np.roll(edge,1,1)
        arr=np.array(chk); arr[e]=[255,0,0,255]; Image.fromarray(arr).save(f'{S}/out/chk-{v}-{i}.png')
        print(v,i,'scale',round(s,3))
