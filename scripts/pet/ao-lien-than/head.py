# Ghép: thân mặc áo mới (ChatGPT) + đầu gốc (giữ đúng dáng đầu, mắt/miệng/mũ/kính đã căn) đè lên
import numpy as np
from PIL import Image
from scipy import ndimage
S='/tmp/claude-0/-home-claude/d69c2595-9aca-50fa-965f-fefb6af7dfaa/scratchpad/aoin'; R='/home/claude/meal-tracker/public/pet'
ids={'nam':['01','02','03','04','05','06'],'nu':['08','09','10','11','12','13']}
def headmask(f):
    im=Image.open(f).convert('RGBA'); a=np.array(im)[...,3]>20
    lab,n=ndimage.label(a); H,W=a.shape; l=lab[int(H*.3),W//2]
    m=lab==l; print(f.split('/')[-1],'head rows',np.nonzero(m.any(1))[0][[0,-1]]/H)
    return im,m
for v in ids:
    for nl in (False,True):
        src=f'{R}/than/than-{v}-mac-ao{"-khong-la" if nl else ""}.webp'
        hd,m=headmask(src)
        harr=np.array(hd); harr[...,3]=np.where(m,harr[...,3],0); head=Image.fromarray(harr)
        for i in ids[v]:
            body=Image.open(f'{S}/out/than-{v}-ao-roi-{i}.png').convert('RGBA')
            b=np.array(body); cut=int(body.height*.52); b[:cut,...,3]=0; body=Image.fromarray(b)  # bỏ hẳn đầu của ảnh mới, chỉ lấy phần thân
            if False: # bỏ lá của ảnh mới: xoá mọi điểm trên chỏm đầu gốc
                b=np.array(body); top=np.nonzero(m.any(1))[0][0]; b[:top+40,...,3]=np.where(m[:top+40],b[:top+40,...,3],0); body=Image.fromarray(b)
            body.alpha_composite(head)
            body.save(f'{S}/out/F-than-{v}{"-khong-la" if nl else ""}-ao-roi-{i}.webp',quality=90)
