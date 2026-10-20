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
def fitc(file,v,cy,cw,cx=.5):
    im=Image.open(f'{R}/{file}'); l,t,r,b=im.split()[3].point(lambda p:255 if p>40 else 0).getbbox()
    bw,bh=B[v]; s=cw*bw/(r-l)
    return {'x':round(cx+(im.width/2-(l+r)/2)*s/bw,4),'y':round(cy+(im.height/2-(t+b)/2)*s/bh,4),'w':round(im.width*s/bw,4)}
A={}
for i in [1,2,3,4,5,6,8,9,10,11,12,13]:
    v='nam' if i<=7 else 'nu'
    A[f'ao-roi-{i:02d}']={v:fit(f'ao-roi/ao-roi-{i:02d}.webp',v,.615 if v=='nam' else .595,.995)}
for i in (1,9): A[f'phu-kien-{i:02d}']={v:fitc(f'phu-kien/phu-kien-{i:02d}.webp',v,.665,.84) for v in ('nam','nu')}  # balo sau lưng: to, ló hai bên vai
A['phu-kien-02']={v:fitc('phu-kien/phu-kien-02.webp',v,.795,.36,.66) for v in ('nam','nu')}  # túi đeo hông: giữa eo
for i in (3,4,5,12): A[f'phu-kien-{i:02d}']={'all':{'x':0.89,'y':0.76,'w':0.14}}
for i in (8,14): A[f'phu-kien-{i:02d}']={'all':{'x':0.52,'y':0.955,'w':0.78}}
for i in (8,9): A[f'hieu-ung-{i:02d}']={'all':{'x':0.5,'y':1.03,'w':0.95}}
A['hieu-ung-07']={'all':{'x':0.5,'y':0.985,'w':0.95}}
A['hieu-ung-17']={'nam':{'x':0.18,'y':0.16,'w':0.42},'nu':{'x':0.14,'y':0.26,'w':0.42}}
# --- Mũ trùm đầu: đáy vành ngay trên mắt, rộng theo nội dung ảnh ---
def fitw(file, v, bottom, cw, cx=.5):
    im=Image.open(f'{R}/{file}'); l,t,r,b=im.split()[3].point(lambda p:255 if p>40 else 0).getbbox()
    bw,bh=B[v]; s=cw*bw/(r-l)
    w=im.width*s/bw; y=(bottom*bh - b*s + im.height*s/2)/bh
    x=cx + (im.width/2-(l+r)/2)*s/bw
    return {'x':round(x,4),'y':round(y,4),'w':round(w,4)}
BRIM={'nam':0.322,'nu':0.37}
HATW={1:.72,2:.72,3:.72,6:.72,9:.72,4:.76,5:.76,8:.80}
for i,cw in HATW.items():
    A[f'doi-dau-{i:02d}']={v:fitw(f'doi-dau/doi-dau-{i:02d}.webp',v,BRIM[v],cw) for v in ('nam','nu')}
# --- Đồ cầm tay: điểm nắm (phần theo chiều cao ảnh) đặt đúng tâm bàn tay; tay vẽ đè lên → trông như đang cầm ---
HAND={'nam':(0.852,0.7828),'nu':(0.8515,0.7828)}
def grip(file, v, cw, gy, gx=.5):
    im=Image.open(f'{R}/{file}'); l,t,r,b=im.split()[3].point(lambda p:255 if p>40 else 0).getbbox()
    bw,bh=B[v]; s=cw*bw/(r-l); hx,hy=HAND[v]
    py=t+gy*(b-t); px=l+gx*(r-l)                     # điểm nắm trong ảnh (px)
    w=im.width*s/bw
    x=hx + (im.width/2-px)*s/bw
    y=hy + (im.height/2-py)*s/bh
    return {'x':round(x,4),'y':round(y,4),'w':round(w,4)}
GRIP={3:(.13,.55),4:(.13,.55),5:(.14,.55),12:(.13,.55),6:(.30,.5),7:(.24,.85),10:(.26,.08),11:(.30,.10),15:(.24,.80)}
for i,(cw,gy) in GRIP.items():
    A[f'phu-kien-{i:02d}']={v:grip(f'phu-kien/phu-kien-{i:02d}.webp',v,cw,gy) for v in ('nam','nu')}
# --- Đồ đội trên đầu không trùm (nơ, băng đô, vương miện): đáy món ngay trên lông mày, rộng theo đầu ---
for i,(bn,bu,cn,cu) in {7:(.25,.30,.55,.58),10:(.275,.325,.62,.68),11:(.262,.312,.50,.56),12:(.262,.312,.50,.56)}.items():
    A[f'doi-dau-{i:02d}']={'nam':fitw(f'doi-dau/doi-dau-{i:02d}.webp','nam',bn,cn),'nu':fitw(f'doi-dau/doi-dau-{i:02d}.webp','nu',bu,cu)}
# --- Kính: tâm tròng kính trùng tâm mắt, kính đủ rộng để ôm trọn 2 mắt ---
EYE_C={'nam':.357,'nu':.412}; GW={'nam':.58,'nu':.62}
for i in (1,2,3,6,7,8):
    A[f'kinh-tai-nghe-{i:02d}']={v:fitc(f'kinh-tai-nghe/kinh-tai-nghe-{i:02d}.webp',v,EYE_C[v],GW[v]) for v in ('nam','nu')}
# --- Tai nghe: chụp tai ôm 2 bầu má bên đầu, không lấn vào mắt; quai vòng qua đỉnh đầu ---
for i in (4,5,9,10):
    A[f'kinh-tai-nghe-{i:02d}']={'nam':fitc(f'kinh-tai-nghe/kinh-tai-nghe-{i:02d}.webp','nam',.40,.86),'nu':fitc(f'kinh-tai-nghe/kinh-tai-nghe-{i:02d}.webp','nu',.45,.90)}
# --- Khăn: quấn ngay dưới cằm, trên vai (không trùm lên mặt) ---
for f in ('ao-roi/ao-roi-07.webp','phu-kien/phu-kien-13.webp'):
    k=f.split('/')[1][:-5]
    A[k]={'nam':fitc(f,'nam',.67,.56),'nu':fitc(f,'nu',.655,.60)}
json.dump(A,open('scripts/pet/anchors.json','w'),indent=1)
print(A)
