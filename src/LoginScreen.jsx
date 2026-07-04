import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { C, card, inp, lbl, redBtn } from "./theme";

export function LoginScreen({onLogin}){
  const [user,setUser]=useState("");
  const [pass,setPass]=useState("");
  const [email,setEmail]=useState("");
  const [forgotEmail,setForgotEmail]=useState("");
  const [forgotSent,setForgotSent]=useState(false);
  const [err,setErr]=useState("");
  const [mode,setMode]=useState("login");
  const [success,setSuccess]=useState("");
  const [saving,setSaving]=useState(false);
  const {signIn,signUp,sendPasswordReset}=useAuth();

  const handleSubmit=async()=>{
    setErr("");setSuccess("");
    if(mode==="login"){
      if(!email.trim()||!pass.trim()){setErr("Vui lòng nhập đầy đủ");return;}
    }else{
      if(!user.trim()||!email.trim()||!pass.trim()){setErr("Vui lòng nhập đầy đủ");return;}
      if(!email.includes("@")){setErr("Vui lòng nhập email hợp lệ");return;}
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
        {mode==="register"&&<div style={{marginBottom:12}}>
          <div style={{...lbl,marginBottom:6}}>Tên hiển thị</div>
          <input value={user} onChange={e=>setUser(e.target.value)} placeholder="VD: gymboy63" style={inp} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
        </div>}
        <div style={{marginBottom:12}}>
          <div style={{...lbl,marginBottom:6}}>Email</div>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com" style={inp} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
        </div>
        <div style={{marginBottom:mode==="login"?6:16}}>
          <div style={{...lbl,marginBottom:6}}>Mật khẩu</div>
          <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••" style={inp} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
        </div>
        {mode==="login"&&<div style={{textAlign:"right",marginBottom:16}}>
          <span onClick={()=>{setMode("forgot");setErr("");setForgotEmail(email);}} style={{fontSize:12,fontWeight:700,color:C.primary,cursor:"pointer"}}>Quên mật khẩu?</span>
        </div>}
        {err&&<div style={{marginBottom:12,padding:"8px 12px",background:C.redBg,borderRadius:8,border:`1.5px solid ${C.red}`,fontSize:12,fontWeight:700,color:"#7F1D1D"}}>❌ {err}</div>}
        {success&&<div style={{marginBottom:12,padding:"10px 14px",background:C.greenBg,borderRadius:8,border:`1.5px solid ${C.green}`,fontSize:13,fontWeight:700,color:"#14532D"}}>{success}</div>}
        <button onClick={handleSubmit} disabled={!!success} style={{...redBtn,opacity:success?0.6:1}}>{mode==="login"?"Đăng nhập":"Đăng ký & Kích hoạt"}</button>
        {mode==="login"&&<div style={{textAlign:"center",marginTop:12,fontSize:12,fontWeight:600,color:C.t3}}>Chưa có tài khoản? <span onClick={()=>setMode("register")} style={{color:C.primary,fontWeight:700,cursor:"pointer"}}>Đăng ký ngay</span></div>}
        {mode==="register"&&<div style={{textAlign:"center",marginTop:12,fontSize:11,fontWeight:600,color:C.red}}>Tài khoản sẽ được kích hoạt tự động ngay sau khi đăng ký</div>}
        {mode==="register"&&<div style={{textAlign:"center",marginTop:8,fontSize:11,color:C.t3,lineHeight:1.5}}>Bằng việc đăng ký, bạn đồng ý với <span style={{color:C.primary,fontWeight:700}}>📄 điều khoản dịch vụ</span> và <span style={{color:C.primary,fontWeight:700}}>🔒 chính sách bảo mật</span></div>}
      </div>
    </div>
  </div>;
}
