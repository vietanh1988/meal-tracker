import numpy as np
from PIL import Image
from scipy import ndimage
R='/home/claude/meal-tracker/public/pet'
FIG={('noel',1):'nam',('noel',2):'nam',('noel',3):'nu',('noel',4):'nu'}
def bbox(a,th=128):
    ys,xs=np.nonzero(a>th); return ys.min(),ys.max(),xs.min(),xs.max()
def headx(a,frac=.30):
    y0,y1,_,_=bbox(a); y=int(y0+(y1-y0)*frac); r=np.nonzero(a[y]>128)[0]; return (r.min()+r.max())/2
heads={}
for v in ('nam','nu'):
    for nl in (False,True):
        im=Image.open(f'{R}/than/than-{v}-mac-ao{"-khong-la" if nl else ""}.webp').convert('RGBA'); a=np.array(im)[...,3]>20
        lab,n=ndimage.label(a); H,W=a.shape; m=lab==lab[int(H*.3),W//2]
        arr=np.array(im); arr[...,3]=np.where(m,arr[...,3],0); heads[(v,nl)]=Image.fromarray(arr)
out=[]
for col in ('noel','tet','co-trang'):
    for j in range(1,5):
        v='nam' if j<=2 else 'nu'
        base=Image.open(f'{R}/than/than-{v}.webp').convert('RGBA'); ba=np.array(base)[...,3]; bW,bH=base.size
        by0,by1,_,_=bbox(ba); bcx=headx(ba)
        f=Image.open(f'figs/{col}-ao-{j}.png').convert('RGBA'); fa=np.array(f)[...,3]
        y0,y1,_,_=bbox(fa); cx=headx(fa); s=(by1-by0)/(y1-y0)
        big=f.resize((round(f.width*s),round(f.height*s)),Image.LANCZOS)
        body=Image.new('RGBA',(bW,bH),(0,0,0,0)); body.alpha_composite(big,(round(bcx-cx*s),round(by0-y0*s)))
        b=np.array(body); b[:int(bH*.52),...,3]=0; body=Image.fromarray(b)
        iid=f'{col}-ao-{j:02d}'
        for nl in (False,True):
            o=body.copy(); o.alpha_composite(heads[(v,nl)])
            o.save(f'{R}/than-ao/than-{v}{"-khong-la" if nl else ""}-{iid}.webp',quality=90)
        # ảnh ô cửa hàng: phần thân dưới cằm
        ic=np.array(body); ic[:int(bH*.585),...,3]=0; ic=Image.fromarray(ic); ic=ic.crop(ic.getbbox()); ic.save(f'{R}/bo-suu-tap/{iid}.webp',quality=90)
        out.append((iid,v,round(s,2)))
print(out)
