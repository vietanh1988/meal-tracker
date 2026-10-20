import json
from PIL import Image
R='public/pet'
B={'nam':(588,900),'nu':(559,900)}
def fit(file,v,top,bot,cx=.5,minw=.80):
    im=Image.open(f'{R}/{file}'); l,t,r,b=im.split()[3].point(lambda p:255 if p>40 else 0).getbbox()
    bw,bh=B[v]; s=(bot-top)*bh/(b-t)
    sx=max(1.0, minw*bw/((r-l)*s))
    w=im.width*s*sx/bw; y=(top*bh - t*s + im.height*s/2)/bh
    x=cx + (im.width/2-(l+r)/2)*s*sx/bw
    d={'x':round(x,4),'y':round(y,4),'w':round(w,4)}
    if sx>1: d['h']=round(im.height*s/bh,4)
    return d
A={}
for i in [1,2,3,4,5,6,8,9,10,11,12,13]:
    v='nam' if i<=7 else 'nu'
    A[f'ao-roi-{i:02d}']={v:fit(f'ao-roi/ao-roi-{i:02d}.webp',v,.615 if v=='nam' else .595,.995)}
for i in (11,12): A[f'doi-dau-{i}']={'all':{'w':0.66},'nam':{'y':0.135},'nu':{'y':0.165}}
A['doi-dau-07']={'all':{'w':0.62}}
for i in (1,9): A[f'phu-kien-{i:02d}']={'all':{'x':0.86,'y':0.63,'w':0.46}}
A['phu-kien-02']={'all':{'y':0.79,'w':0.44}}
for i in (3,4,5,12): A[f'phu-kien-{i:02d}']={'all':{'x':0.89,'y':0.76,'w':0.14}}
for i in (8,14): A[f'phu-kien-{i:02d}']={'all':{'x':0.52,'y':0.955,'w':0.78}}
for i in (8,9): A[f'hieu-ung-{i:02d}']={'all':{'x':0.5,'y':1.03,'w':0.95}}
A['hieu-ung-07']={'all':{'x':0.5,'y':0.985,'w':0.95}}
A['hieu-ung-17']={'nam':{'x':0.18,'y':0.16,'w':0.42},'nu':{'x':0.14,'y':0.26,'w':0.42}}
json.dump(A,open('scripts/pet/anchors.json','w'),indent=1)
print(A)
