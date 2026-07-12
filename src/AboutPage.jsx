import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { C, card, inp, lbl, redBtn } from "./theme";

export function AboutPage({appSettings,isAdmin,saveSetting,mob}){
  const about=(()=>{try{return appSettings.about_page?JSON.parse(appSettings.about_page):{}}catch(e){return{};}})();
  const [editing,setEditing]=useState(false);
  const [form,setForm]=useState({appName:"Fipilot AI",tagline:"",version:"3.0",description:"",devName:"",devRole:"",devBio:"",devAvatar:"",contact:"",facebook:"",hotline:"",zalo:"",features:""});
  const [uploading,setUploading]=useState(false);
  const fileRef=useRef(null);

  const uploadAvatar=async(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    if(file.size>2*1024*1024){alert("Ảnh tối đa 2MB");return;}
    setUploading(true);
    try{
      const ext=file.name.split(".").pop();
      const path=`dev-avatar-${Date.now()}.${ext}`;
      const {error}=await supabase.storage.from("avatars").upload(path,file,{upsert:true});
      if(error)throw error;
      const {data:{publicUrl}}=supabase.storage.from("avatars").getPublicUrl(path);
      setForm(f=>({...f,devAvatar:publicUrl}));
    }catch(err){alert("Upload lỗi: "+err.message);}
    setUploading(false);
    if(fileRef.current)fileRef.current.value="";
  };

  // Update form when appSettings loads
  useEffect(()=>{
    try{
      const about=appSettings.about_page?JSON.parse(appSettings.about_page):{};
      if(about.appName||about.tagline||about.features){
        setForm({
          appName:about.appName||"Fipilot AI",
          tagline:about.tagline||"Theo dõi dinh dưỡng thông minh cho người tập gym",
          version:about.version||"3.0",
          description:about.description||"",
          devName:about.devName||"Việt Anh Seoer",
          devRole:about.devRole||"Founder & Developer",
          devBio:about.devBio||"",
          devAvatar:about.devAvatar||"",
          contact:about.contact||"",
          facebook:about.facebook||"",
          hotline:about.hotline||"",
          zalo:about.zalo||"",
          features:about.features||"192 món VN verified|3 AI tích hợp|USDA database|Công thức ISSN",
        });
      }
    }catch(e){}
  },[appSettings.about_page]);

  const saveAbout=async()=>{
    await saveSetting("about_page",JSON.stringify(form));
    setEditing(false);
  };

  const features=(form.features||"").split("|").filter(Boolean);
  const displayVersion=appSettings.app_version||form.version;

  return <div>
    {/* Hero — White card giống Dashboard */}
    <div style={{...card,textAlign:"center",padding:mob?"20px 16px":"28px 24px",border:`1.5px solid ${C.border}`}}>
      <img src="/logo.png" alt="Fipilot AI" style={{width:96,height:96,borderRadius:20,objectFit:"cover"}}/>
      <div style={{fontSize:24,fontWeight:900,color:C.t1,marginTop:10,letterSpacing:"-0.02em"}}>{form.appName}</div>
      <div style={{fontSize:12,fontWeight:700,color:C.secondary,marginTop:4}}>v{displayVersion}</div>
      <div style={{fontSize:14,fontWeight:600,color:C.t2,marginTop:6}}>{form.tagline}</div>
      {features.length>0&&<div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",marginTop:14}}>
        {features.map((f,i)=><span key={i} style={{fontSize:11,padding:"4px 12px",borderRadius:20,background:i%4===0?C.primaryBg:i%4===1?"#DCFCE7":i%4===2?"#EFF6FF":"#FEF3C7",color:i%4===0?"#007AFF":i%4===1?"#00C896":i%4===2?"#1E40AF":"#92400E",fontWeight:700}}>{f}</span>)}
      </div>}
    </div>

    {/* Mô tả */}
    <div style={{...card,marginTop:12}}>
      <div style={{fontSize:15,fontWeight:900,color:C.blue,marginBottom:8}}>📖 Về ứng dụng</div>
      <div style={{fontSize:13,fontWeight:500,color:C.t2,lineHeight:1.7}}>{form.description}</div>
    </div>

    {/* Developer */}
    <div style={{...card,marginTop:12}}>
      <div style={{fontSize:15,fontWeight:900,color:C.blue,marginBottom:12}}>👨‍💻 Đội ngũ phát triển</div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        {form.devAvatar?
          <img src={form.devAvatar} alt={form.devName} style={{width:56,height:56,borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.primary}`,flexShrink:0}}/>:
          <div style={{width:56,height:56,borderRadius:"50%",background:"linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,border:"2px solid #fff",boxShadow:"0 2px 8px rgba(0,0,0,0.1)"}}>{form.devName?form.devName.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase():"VA"}</div>
        }
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:800,color:C.t1}}>{form.devName}</div>
          <div style={{fontSize:12,fontWeight:700,color:C.secondary,marginTop:2}}>{form.devRole}</div>
        </div>
      </div>
      <div style={{fontSize:13,fontWeight:600,color:C.t3,marginTop:10,lineHeight:1.6,padding:"10px 0",borderTop:`1px solid ${C.border}`}}>{form.devBio}</div>
      {(form.contact||form.facebook||form.hotline||form.zalo)&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {form.contact&&<a href={`mailto:${form.contact}`} target="_blank" rel="noopener" style={{fontSize:12,fontWeight:700,padding:"6px 14px",borderRadius:8,background:"#EFF6FF",color:"#007AFF",textDecoration:"none",border:"1px solid #BFDBFE",display:"flex",alignItems:"center",gap:4}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Email</a>}
        {form.facebook&&<a href={form.facebook} target="_blank" rel="noopener" style={{fontSize:12,fontWeight:700,padding:"6px 14px",borderRadius:8,background:"#EFF6FF",color:"#1877F2",textDecoration:"none",border:"1px solid #BFDBFE",display:"flex",alignItems:"center",gap:4}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          Facebook</a>}
        {form.hotline&&<a href={`tel:${form.hotline}`} style={{fontSize:12,fontWeight:700,padding:"6px 14px",borderRadius:8,background:"#DCFCE7",color:"#007AFF",textDecoration:"none",border:"1px solid #BBF7D0",display:"flex",alignItems:"center",gap:4}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          {form.hotline}</a>}
        {form.zalo&&<a href={`https://zalo.me/${form.zalo.replace(/\s/g,"")}`} target="_blank" rel="noopener" style={{fontSize:12,fontWeight:700,padding:"6px 14px",borderRadius:8,background:"#EBF5FF",color:"#0068FF",textDecoration:"none",border:"1px solid #B3D9FF",display:"flex",alignItems:"center",gap:4}}>
          <svg width="16" height="16" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#0068FF"/><text x="24" y="26" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="18" fontWeight="900" fontFamily="Arial,sans-serif">Z</text></svg>
          Zalo</a>}
      </div>}
    </div>

    {/* Admin: Edit */}
    {isAdmin&&!editing&&<div style={{textAlign:"center",marginTop:16,marginBottom:16}}>
      <button onClick={()=>setEditing(true)} style={{padding:"8px 20px",fontSize:13,fontWeight:700,borderRadius:10,border:`1.5px solid ${C.border}`,background:"#fff",color:C.t2,cursor:"pointer",fontFamily:"inherit"}}>✏️ Chỉnh sửa trang giới thiệu</button>
    </div>}
    {isAdmin&&editing&&<div style={{...card,marginTop:12,border:`1.5px solid ${C.primary}`,background:"rgba(0,122,255,0.02)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:800,color:C.primary}}>✏️ Chỉnh sửa trang giới thiệu</div>
        <button onClick={()=>setEditing(false)} style={{padding:"5px 14px",fontSize:12,fontWeight:700,borderRadius:8,border:`1.5px solid ${C.red}`,background:C.red,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>✕ Đóng</button>
      </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div>
            <div style={{...lbl,marginBottom:4}}>Tên ứng dụng</div>
            <input value={form.appName} onChange={e=>setForm({...form,appName:e.target.value})} style={inp}/>
          </div>
          <div>
            <div style={{...lbl,marginBottom:4}}>Version dự phòng (chỉ dùng khi chưa Deploy lần nào ở "Quản lý version")</div>
            <input value={form.version} onChange={e=>setForm({...form,version:e.target.value})} style={inp}/>
            {appSettings.app_version&&<div style={{fontSize:11,color:C.t3,marginTop:4}}>Đang hiển thị thật: v{appSettings.app_version} (lấy từ "Quản lý version", ô này bị bỏ qua)</div>}
          </div>
        </div>
        <div style={{marginBottom:8}}>
          <div style={{...lbl,marginBottom:4}}>Tagline</div>
          <input value={form.tagline} onChange={e=>setForm({...form,tagline:e.target.value})} style={inp}/>
        </div>
        <div style={{marginBottom:8}}>
          <div style={{...lbl,marginBottom:4}}>Mô tả</div>
          <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} style={{...inp,resize:"vertical"}}/>
        </div>
        <div style={{marginBottom:8}}>
          <div style={{...lbl,marginBottom:4}}>Tính năng (ngăn cách bằng |)</div>
          <input value={form.features} onChange={e=>setForm({...form,features:e.target.value})} placeholder="192 món VN|3 AI|USDA" style={inp}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div>
            <div style={{...lbl,marginBottom:4}}>Tên developer</div>
            <input value={form.devName} onChange={e=>setForm({...form,devName:e.target.value})} style={inp}/>
          </div>
          <div>
            <div style={{...lbl,marginBottom:4}}>Vai trò</div>
            <input value={form.devRole} onChange={e=>setForm({...form,devRole:e.target.value})} style={inp}/>
          </div>
        </div>
        <div style={{marginBottom:8}}>
          <div style={{...lbl,marginBottom:4}}>Avatar</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {form.devAvatar?<img src={form.devAvatar} alt="Avatar" style={{width:48,height:48,borderRadius:"50%",objectFit:"cover",border:`1.5px solid ${C.border}`}}/>:<div style={{width:48,height:48,borderRadius:"50%",background:C.surface,border:`1.5px dashed ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📷</div>}
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} style={{display:"none"}}/>
              <button onClick={()=>fileRef.current?.click()} disabled={uploading} style={{fontSize:12,fontWeight:700,padding:"6px 14px",borderRadius:8,border:`1.5px solid ${C.primary}`,background:uploading?"#eee":"#fff",color:uploading?"#999":C.primary,cursor:uploading?"wait":"pointer",fontFamily:"inherit"}}>{uploading?"⏳ Đang tải...":"📤 Tải ảnh lên"}</button>
              {form.devAvatar&&<button onClick={()=>setForm(f=>({...f,devAvatar:""}))} style={{fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:6,border:"none",background:"none",color:C.red,cursor:"pointer",fontFamily:"inherit"}}>✕ Xóa ảnh</button>}
            </div>
          </div>
          <div style={{fontSize:11,color:C.t3,marginTop:4}}>JPG, PNG, WebP — tối đa 2MB</div>
        </div>
        <div style={{marginBottom:8}}>
          <div style={{...lbl,marginBottom:4}}>Bio</div>
          <textarea value={form.devBio} onChange={e=>setForm({...form,devBio:e.target.value})} rows={2} style={{...inp,resize:"vertical"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          <div>
            <div style={{...lbl,marginBottom:4}}>Email</div>
            <input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="email@example.com" style={inp}/>
          </div>
          <div>
            <div style={{...lbl,marginBottom:4}}>Facebook URL</div>
            <input value={form.facebook} onChange={e=>setForm({...form,facebook:e.target.value})} placeholder="https://fb.com/..." style={inp}/>
          </div>
          <div>
            <div style={{...lbl,marginBottom:4}}>Hotline</div>
            <input value={form.hotline} onChange={e=>setForm({...form,hotline:e.target.value})} placeholder="0909 123 456" style={inp}/>
          </div>
          <div>
            <div style={{...lbl,marginBottom:4}}>Zalo (SĐT)</div>
            <input value={form.zalo} onChange={e=>setForm({...form,zalo:e.target.value})} placeholder="0909123456" style={inp}/>
          </div>
        </div>
        <button onClick={saveAbout} style={{...redBtn,background:"linear-gradient(135deg,#15803D,#166534)"}}>💾 Lưu thay đổi</button>
    </div>}
  </div>;
}
