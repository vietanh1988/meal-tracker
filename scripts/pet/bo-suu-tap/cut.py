import numpy as np, json
from PIL import Image
from scipy import ndimage
im=Image.open('sheet.png').convert('RGB'); A=np.array(im).astype(float)
PX=[(0,767),(769,1536)]; PY=[(0,354),(356,694),(696,1024)]
COL=['noel','tet','co-trang']
def demag(sub):
    R,G,B=sub[...,0],sub[...,1],sub[...,2]
    a=np.clip((190-(np.minimum(R,B)-G))/110,0,1)
    out=np.zeros_like(sub)
    for k,m in enumerate([255,0,255]):
        out[...,k]=np.where(a>0.01,(sub[...,k]-(1-a)*m)/np.maximum(a,1e-3),0)
    return np.dstack([np.clip(out,0,255),a*255]).astype(np.uint8)
def dewhite(sub):
    near=(sub.min(2)>232)&((sub.max(2)-sub.min(2))<18)
    lab,n=ndimage.label(near)
    edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(edge))
    bg=ndimage.binary_opening(bg,iterations=1)
    a=(~bg).astype(float)
    a=ndimage.gaussian_filter(a,0.7)
    return np.dstack([sub.astype(np.uint8),(np.clip(a,0,1)*255).astype(np.uint8)])
meta={}
for r,(y0,y1) in enumerate(PY):
    # đồ rời
    sub=A[y0+3:y1-3, PX[0][0]+3:PX[0][1]-3]; rgba=demag(sub); al=rgba[...,3]>60
    lab,n=ndimage.label(ndimage.binary_dilation(al,iterations=2))
    H,W=al.shape; cells={}
    for i in range(1,n+1):
        ys,xs=np.nonzero(lab==i)
        if len(ys)<25: continue
        cy,cx=ys.mean(),xs.mean(); c=min(3,int(cx/(W/4))); rr=min(2,int(cy/(H/3)))
        cells.setdefault(rr*4+c,[]).append(i)
    out=[]
    for k in range(12):
        m=np.isin(lab,cells.get(k,[]))
        ys,xs=np.nonzero(m); t,b,l,rt=ys.min(),ys.max(),xs.min(),xs.max()
        crop=rgba[t:b+1,l:rt+1].copy(); crop[...,3]=np.where(m[t:b+1,l:rt+1],crop[...,3],0)
        img=Image.fromarray(crop); img=img.resize((img.width*3,img.height*3),Image.LANCZOS)
        pad=Image.new('RGBA',(img.width+12,img.height+12),(0,0,0,0)); pad.alpha_composite(img,(6,6))
        pad.save(f'items/{COL[r]}-{k+1:02d}.png'); out.append(pad.size)
    # áo liền thân
    sub=A[y0+3:y1-3, PX[1][0]+3:PX[1][1]-3]; rgba=demag(sub); al=rgba[...,3]>60
    lab,n=ndimage.label(al); sizes=ndimage.sum(al,lab,range(1,n+1)); big=np.argsort(sizes)[::-1][:4]+1
    figs=sorted(big,key=lambda i: np.nonzero(lab==i)[1].mean())
    for j,i in enumerate(figs):
        m=ndimage.binary_dilation(lab==i,iterations=2); ys,xs=np.nonzero(m)
        t,b,l,rt=ys.min(),ys.max(),xs.min(),xs.max()
        crop=rgba[t:b+1,l:rt+1].copy(); crop[...,3]=np.where(m[t:b+1,l:rt+1],crop[...,3],0)
        Image.fromarray(crop).save(f'figs/{COL[r]}-ao-{j+1}.png')
    print(COL[r], out[:3])
