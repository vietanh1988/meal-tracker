# 24/10 (soát mắt bộ pi_full): đồ cầm tay / găng còn nét viền tay cũ lơ lửng trên thân + mẩu rời → bỏ (không vẽ thêm, không đụng phần đặc của món)
import numpy as np,cv2
def clean(a, solid):
    """đồ cầm tay: bỏ nét viền tay cũ lơ lửng trên thân + mẩu rời nhỏ. Trả (ảnh mới, số px bỏ)"""
    a=a.copy(); al=(a[...,3]>40).astype(np.uint8)
    core=cv2.morphologyEx(al,cv2.MORPH_OPEN,np.ones((7,7),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(core,8)
    if n<2: return a,0
    big=1+int(np.argmax(st[1:,4]))
    main=(lab==big).astype(np.uint8)
    # phần đặc khác (vd 2 nửa vật) còn giữ nếu lớn ≥ 600px
    keep=main.copy()
    for k in range(1,n):
        if k!=big and st[k,4]>=600: keep|=(lab==k).astype(np.uint8)
    near=cv2.dilate(keep,np.ones((25,25),np.uint8))>0
    hsv=cv2.cvtColor(np.ascontiguousarray(a[...,:3]),cv2.COLOR_RGB2HSV)
    dark=hsv[...,2]<130
    rm=(al>0)&~near&solid&(dark|(core==0))
    # mẩu rời: thành phần alpha không chạm phần giữ lại, nằm trên thân
    n2,lab2,st2,_=cv2.connectedComponentsWithStats(al,8)
    for k in range(1,n2):
        m=lab2==k
        if (m&(keep>0)).any(): continue
        if solid[m].mean()>0.5 and st2[k,4]<2500: rm|=m
    a[rm,3]=0
    return a,int(rm.sum())
