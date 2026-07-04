import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { C, card, inp, lbl, redBtn } from "./theme";

export function ResetPasswordScreen(){
  const [pass,setPass]=useState("");
  const [pass2,setPass2]=useState("");
  const [err,setErr]=useState("");
  const [success,setSuccess]=useState(false);
  const [saving,setSaving]=useState(false);
  const {updatePassword}=useAuth();

  const handleSubmit=async()=>{
    setErr("");
    if(pass.length<6){setErr("Mật khẩu tối thiểu 6 ký tự");return;}
    if(pass!==pass2){setErr("Mật khẩu nhập lại không khớp");return;}
    setSaving(true);
    try{
      await updatePassword(pass);
      setSuccess(true);
    }catch(e){setErr(e.message||"Đặt mật khẩu thất bại");}
    setSaving(false);
  };

  return <div style={{fontFamily:"'Inter',Roboto,-apple-system,'Segoe UI',sans-serif",background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{width:"100%",maxWidth:400}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <img src="/logo.png" alt="Fipilot AI" style={{width:80,height:80,borderRadius:17,objectFit:"cover"}}/>
        <div style={{fontSize:24,fontWeight:900,color:C.t1,marginTop:12,letterSpacing:"-0.02em"}}>FIPILOT AI</div>
        <div style={{fontSize:13,fontWeight:700,color:C.secondary,marginTop:2}}>Đặt mật khẩu mới</div>
      </div>
      <div style={{...card,padding:"24px 28px"}}>
        {success ? (
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:12}}>✅</div>
            <div style={{fontSize:15,fontWeight:800,color:C.t1,marginBottom:8}}>Đã đặt mật khẩu mới thành công</div>
            <div style={{fontSize:13,color:C.t2,marginBottom:16}}>Bạn có thể tiếp tục sử dụng app ngay bây giờ.</div>
            <button onClick={()=>window.location.href="/"} style={redBtn}>Vào app</button>
          </div>
        ) : (
          <>
            <div style={{fontSize:13,color:C.t2,marginBottom:16,lineHeight:1.5}}>Nhập mật khẩu mới cho tài khoản của bạn.</div>
            <div style={{marginBottom:12}}>
              <div style={{...lbl,marginBottom:6}}>Mật khẩu mới</div>
              <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••" style={inp} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{...lbl,marginBottom:6}}>Nhập lại mật khẩu mới</div>
              <input type="password" value={pass2} onChange={e=>setPass2(e.target.value)} placeholder="••••••" style={inp} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
            </div>
            {err&&<div style={{marginBottom:12,padding:"8px 12px",background:C.redBg,borderRadius:8,border:`1.5px solid ${C.red}`,fontSize:12,fontWeight:700,color:"#7F1D1D"}}>❌ {err}</div>}
            <button onClick={handleSubmit} disabled={saving} style={{...redBtn,opacity:saving?0.6:1}}>{saving?"Đang lưu...":"Đặt mật khẩu mới"}</button>
          </>
        )}
      </div>
    </div>
  </div>;
}
