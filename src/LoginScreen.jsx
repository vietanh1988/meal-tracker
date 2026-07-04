import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { supabase } from "./lib/supabase";
import { C, card, inp, lbl, redBtn } from "./theme";
import { parseContent, stripEmptyParagraphs } from "./TermsPage";
import { parseFeatureFlags } from "./adminTabs/FeatureFlagsTab";

export function LoginScreen({onLogin,appSettings}){
  const registrationEnabled=parseFeatureFlags(appSettings).registration_enabled;
  const [user,setUser]=useState("");
  const [pass,setPass]=useState("");
  const [email,setEmail]=useState("");
  const [showPass,setShowPass]=useState(false);
  const [forgotEmail,setForgotEmail]=useState("");
  const [forgotSent,setForgotSent]=useState(false);
  const [err,setErr]=useState("");
  const [mode,setMode]=useState("login");
  const [success,setSuccess]=useState("");
  const [saving,setSaving]=useState(false);
  const [termsModal,setTermsModal]=useState(null); // "tos" | "privacy" | null
  const [agreedTerms,setAgreedTerms]=useState(false);
  const [usernameStatus,setUsernameStatus]=useState(null); // null | "checking" | "taken" | "ok"
  const [emailStatus,setEmailStatus]=useState(null); // null | "checking" | "taken" | "ok"
  const {signIn,signUp,sendPasswordReset}=useAuth();

  // Check username realtime (chỉ khi đăng ký)
  useEffect(()=>{
    if(mode!=="register"||!user.trim()){setUsernameStatus(null);return;}
    setUsernameStatus("checking");
    const t=setTimeout(async()=>{
      try{
        const {data,error}=await supabase.rpc("check_username_available",{p_username:user.trim()});
        if(error){setUsernameStatus(null);return;}
        setUsernameStatus(data?"ok":"taken");
      }catch(e){setUsernameStatus(null);}
    },500);
    return()=>clearTimeout(t);
  },[user,mode]);

  // Check email realtime (chỉ khi đăng ký)
  useEffect(()=>{
    if(mode!=="register"||!email.trim()||!email.includes("@")){setEmailStatus(null);return;}
    setEmailStatus("checking");
    const t=setTimeout(async()=>{
      try{
        const {data,error}=await supabase.rpc("check_email_available",{p_email:email.trim()});
        if(error){setEmailStatus(null);return;}
        setEmailStatus(data?"ok":"taken");
      }catch(e){setEmailStatus(null);}
    },500);
    return()=>clearTimeout(t);
  },[email,mode]);

  const handleSubmit=async()=>{
    setErr("");setSuccess("");
    if(mode==="register"&&!registrationEnabled){setErr("Hiện tại chưa mở đăng ký tài khoản mới. Vui lòng quay lại sau.");return;}
    if(mode==="login"){
      if(!email.trim()||!pass.trim()){setErr("Vui lòng nhập đầy đủ");return;}
    }else{
      if(!user.trim()||!email.trim()||!pass.trim()){setErr("Vui lòng nhập đầy đủ");return;}
      if(!email.includes("@")){setErr("Vui lòng nhập email hợp lệ");return;}
      if(usernameStatus==="taken"){setErr("Tên hiển thị đã được sử dụng");return;}
      if(emailStatus==="taken"){setErr("Email đã tồn tại");return;}
      if(!agreedTerms){setErr("Bạn cần đồng ý với điều khoản dịch vụ và chính sách bảo mật để đăng ký");return;}
    }
    if(pass.length<6){setErr("Mật khẩu tối thiểu 6 ký tự");return;}
    try{
      if(mode==="register"){
        await signUp(email,pass,user.trim());
        setSuccess(`✅ Đăng ký thành công! Tài khoản "${user.trim()}" đã được kích hoạt.`);
        setTimeout(()=>onLogin(user.trim()),1500);
      }else{
        await signIn(email,pass);
        onLogin(email);
      }
    }catch(e){setErr(e.message||"Lỗi xác thực");}
  };

  const handleForgotSubmit=async()=>{
    setErr("");
    if(!forgotEmail.trim()||!forgotEmail.includes("@")){setErr("Vui lòng nhập email hợp lệ");return;}
    setSaving(true);
    try{
      await sendPasswordReset(forgotEmail.trim());
      setForgotSent(true);
    }catch(e){setErr(e.message||"Gửi yêu cầu thất bại");}
    setSaving(false);
  };

  if(mode==="forgot"){
    return <div style={{fontFamily:"'Inter',Roboto,-apple-system,'Segoe UI',sans-serif",background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <img src="/logo.png" alt="Fipilot AI" style={{width:80,height:80,borderRadius:17,objectFit:"cover"}}/>
          <div style={{fontSize:24,fontWeight:900,color:C.t1,marginTop:12,letterSpacing:"-0.02em"}}>FIPILOT AI</div>
          <div style={{fontSize:13,fontWeight:700,color:C.secondary,marginTop:2}}>Quên mật khẩu</div>
        </div>
        <div style={{...card,padding:"24px 28px"}}>
          {forgotSent ? (
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:12}}>📧</div>
              <div style={{fontSize:15,fontWeight:800,color:C.t1,marginBottom:8}}>Đã gửi email</div>
              <div style={{fontSize:13,color:C.t2,marginBottom:16,lineHeight:1.5}}>Kiểm tra hộp thư <b>{forgotEmail}</b>, bấm vào link trong email để đặt mật khẩu mới.</div>
              <div onClick={()=>{setMode("login");setForgotSent(false);setForgotEmail("");}} style={{color:C.primary,fontWeight:700,cursor:"pointer",fontSize:13}}>← Quay lại đăng nhập</div>
            </div>
          ) : (
            <>
              <div style={{fontSize:13,color:C.t2,marginBottom:16,lineHeight:1.5}}>Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu.</div>
              <div style={{marginBottom:16}}>
                <div style={{...lbl,marginBottom:6}}>Email</div>
                <input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="email@example.com" style={inp} onKeyDown={e=>e.key==="Enter"&&handleForgotSubmit()}/>
              </div>
              {err&&<div style={{marginBottom:12,padding:"8px 12px",background:C.redBg,borderRadius:8,border:`1.5px solid ${C.red}`,fontSize:12,fontWeight:700,color:"#7F1D1D"}}>❌ {err}</div>}
              <button onClick={handleForgotSubmit} disabled={saving} style={{...redBtn,opacity:saving?0.6:1}}>{saving?"Đang gửi...":"Gửi email đặt lại mật khẩu"}</button>
              <div onClick={()=>{setMode("login");setErr("");}} style={{textAlign:"center",marginTop:14,color:C.primary,fontWeight:700,cursor:"pointer",fontSize:13}}>← Quay lại đăng nhập</div>
            </>
          )}
        </div>
      </div>
    </div>;
  }

  return <div style={{fontFamily:"'Inter',Roboto,-apple-system,'Segoe UI',sans-serif",background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{width:"100%",maxWidth:400}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <img src="/logo.png" alt="Fipilot AI" style={{width:80,height:80,borderRadius:17,objectFit:"cover"}}/>
        <div style={{fontSize:24,fontWeight:900,color:C.t1,marginTop:12,letterSpacing:"-0.02em"}}>FIPILOT AI</div>
        <div style={{fontSize:13,fontWeight:700,color:C.secondary,marginTop:2}}>AI Nutrition Coach</div>
      </div>
      <div style={{...card,padding:"24px 28px"}}>
        <div style={{display:"flex",marginBottom:20,borderBottom:`2px solid ${C.border}`}}>
          {["login","register"].map(m=><button key={m} onClick={()=>{setMode(m);setErr("");setSuccess("");}} style={{
            flex:1,padding:"10px",fontSize:14,fontWeight:mode===m?900:600,border:"none",background:"transparent",cursor:"pointer",
            color:mode===m?C.t1:C.t3,borderBottom:mode===m?"3px solid #007AFF":"3px solid transparent",fontFamily:"inherit",
          }}>{m==="login"?"Đăng nhập":"Đăng ký"}</button>)}
        </div>
        {mode==="register"&&!registrationEnabled&&(
          <div style={{ textAlign: "center", padding: "20px 10px" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🚧</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.t1, marginBottom: 6 }}>Chưa mở đăng ký</div>
            <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.5 }}>Hiện tại chưa nhận đăng ký tài khoản mới. Vui lòng quay lại sau nhé!</div>
          </div>
        )}
        {mode==="register"&&registrationEnabled&&<div style={{marginBottom:12}}>
          <div style={{...lbl,marginBottom:6}}>Tên hiển thị</div>
          <input value={user} onChange={e=>setUser(e.target.value)} placeholder="VD: gymboy63" style={inp} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
          {usernameStatus==="checking"&&<div style={{fontSize:11,color:C.t3,marginTop:4}}>Đang kiểm tra...</div>}
          {usernameStatus==="taken"&&<div style={{fontSize:11,color:C.red,marginTop:4,fontWeight:700}}>❌ Tên hiển thị đã được sử dụng</div>}
          {usernameStatus==="ok"&&<div style={{fontSize:11,color:C.green,marginTop:4,fontWeight:700}}>✓ Có thể dùng</div>}
        </div>}
        {(mode==="login"||registrationEnabled)&&<div style={{marginBottom:12}}>
          <div style={{...lbl,marginBottom:6}}>Email</div>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com" style={inp} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
          {mode==="register"&&emailStatus==="checking"&&<div style={{fontSize:11,color:C.t3,marginTop:4}}>Đang kiểm tra...</div>}
          {mode==="register"&&emailStatus==="taken"&&<div style={{fontSize:11,color:C.red,marginTop:4,fontWeight:700}}>❌ Email đã tồn tại</div>}
          {mode==="register"&&emailStatus==="ok"&&<div style={{fontSize:11,color:C.green,marginTop:4,fontWeight:700}}>✓ Có thể dùng</div>}
        </div>}
        {(mode==="login"||registrationEnabled)&&<div style={{marginBottom:mode==="login"?6:16}}>
          <div style={{...lbl,marginBottom:6}}>Mật khẩu</div>
          <div style={{position:"relative"}}>
            <input type={showPass?"text":"password"} value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••" style={{...inp,paddingRight:40}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
            <span onClick={()=>setShowPass(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",cursor:"pointer",fontSize:16,userSelect:"none"}}>{showPass?"🙈":"👁️"}</span>
          </div>
        </div>}
        {mode==="login"&&<div style={{textAlign:"right",marginBottom:16}}>
          <span onClick={()=>{setMode("forgot");setErr("");setForgotEmail(email);}} style={{fontSize:12,fontWeight:700,color:C.primary,cursor:"pointer"}}>Quên mật khẩu?</span>
        </div>}
        {mode==="register"&&registrationEnabled&&<div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:16,padding:"10px 12px",background:agreedTerms?C.surface:C.redBg,borderRadius:10,border:agreedTerms?`1.5px solid ${C.border}`:`1.5px solid ${C.red}`}}>
          <input type="checkbox" checked={agreedTerms} onChange={e=>{setAgreedTerms(e.target.checked);if(e.target.checked)setErr("");}} style={{width:16,height:16,marginTop:1,flexShrink:0,cursor:"pointer"}}/>
          <span onClick={()=>setAgreedTerms(v=>!v)} style={{fontSize:11,color:C.t2,lineHeight:1.5,cursor:"pointer"}}>Tôi đồng ý với <span onClick={(e)=>{e.stopPropagation();setTermsModal("tos");}} style={{color:C.primary,fontWeight:700,cursor:"pointer"}}>📄 điều khoản dịch vụ</span> và <span onClick={(e)=>{e.stopPropagation();setTermsModal("privacy");}} style={{color:C.primary,fontWeight:700,cursor:"pointer"}}>🔒 chính sách bảo mật</span> của Fipilot AI</span>
        </div>}
        {err&&<div style={{marginBottom:12,padding:"8px 12px",background:C.redBg,borderRadius:8,border:`1.5px solid ${C.red}`,fontSize:12,fontWeight:700,color:"#7F1D1D"}}>❌ {err}</div>}
        {success&&<div style={{marginBottom:12,padding:"10px 14px",background:C.greenBg,borderRadius:8,border:`1.5px solid ${C.green}`,fontSize:13,fontWeight:700,color:"#14532D"}}>{success}</div>}
        {(mode==="login"||registrationEnabled)&&<button onClick={handleSubmit} disabled={!!success} style={{...redBtn,opacity:success?0.6:1}}>{mode==="login"?"Đăng nhập":"Đăng ký & Kích hoạt"}</button>}
        {mode==="login"&&<div style={{textAlign:"center",marginTop:12,fontSize:12,fontWeight:600,color:C.t3}}>Chưa có tài khoản? <span onClick={()=>setMode("register")} style={{color:C.primary,fontWeight:700,cursor:"pointer"}}>Đăng ký ngay</span></div>}
        {mode==="register"&&registrationEnabled&&<div style={{textAlign:"center",marginTop:12,fontSize:11,fontWeight:600,color:C.red}}>Tài khoản sẽ được kích hoạt tự động ngay sau khi đăng ký</div>}
      </div>
    </div>
    {termsModal&&(()=>{
      const pages=parseContent(appSettings);
      const page=pages.find(p=>p.id===termsModal)||pages[0];
      return <div onClick={()=>setTermsModal(null)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,zIndex:200}}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:16,maxWidth:520,width:"100%",maxHeight:"80vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1.5px solid ${C.border}`,flexShrink:0}}>
            <div style={{fontSize:15,fontWeight:800,color:C.t1}}>{page?.label||"Nội dung"}</div>
            <span onClick={()=>setTermsModal(null)} style={{cursor:"pointer",fontSize:18,color:C.t3}}>✕</span>
          </div>
          <div style={{padding:"18px 20px",overflowY:"auto",fontSize:13,color:C.t1,lineHeight:1.6}}>
            <style>{`.terms-modal-content p{margin:0 0 12px;}.terms-modal-content h1{font-size:18px;margin:14px 0 8px;font-weight:800;}.terms-modal-content h2{font-size:15px;margin:12px 0 6px;font-weight:800;}.terms-modal-content ul,.terms-modal-content ol{margin:0 0 12px;padding-left:20px;}`}</style>
            {page?.html
              ? <div className="terms-modal-content" dangerouslySetInnerHTML={{__html:stripEmptyParagraphs(page.html)}}/>
              : <div style={{textAlign:"center",color:C.t3,padding:"20px 0"}}>Nội dung đang được cập nhật.</div>}
          </div>
        </div>
      </div>;
    })()}
  </div>;
}
