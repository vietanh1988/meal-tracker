import { useState } from "react";
import { passwordError, PASSWORD_HINT } from "./lib/password";
import { useAuth } from "./hooks/useAuth";
import { AuthShell, Field, PasswordInput, Notice, primaryBtn } from "./AuthShell";
import { DK } from "./theme";

export function ResetPasswordScreen(){
  const [pass,setPass]=useState("");
  const [pass2,setPass2]=useState("");
  const [err,setErr]=useState("");
  const [success,setSuccess]=useState(false);
  const [saving,setSaving]=useState(false);
  const {updatePassword}=useAuth();

  const handleSubmit=async()=>{
    setErr("");
    const pe=passwordError(pass);if(pe){setErr(pe);return;}
    if(pass!==pass2){setErr("Mật khẩu nhập lại không khớp");return;}
    setSaving(true);
    try{
      await updatePassword(pass);
      setSuccess(true);
    }catch(e){setErr(e.message||"Đặt mật khẩu thất bại");}
    setSaving(false);
  };

  return <AuthShell compact title="Đặt mật khẩu mới">
    {success ? <>
      <Notice>Đã đặt mật khẩu mới thành công. Bạn dùng app tiếp được ngay.</Notice>
      <button onClick={()=>window.location.href="/"} style={primaryBtn(false)}>Vào app</button>
    </> : <>
      <span style={{fontSize:11,fontWeight:700,color:DK.t3,letterSpacing:"0.08em"}}>BƯỚC 2 · SAU KHI BẤM LINK TRONG EMAIL</span>
      <Field label="Mật khẩu mới"><PasswordInput value={pass} onChange={setPass} onEnter={handleSubmit} autoComplete="new-password" placeholder={PASSWORD_HINT}/></Field>
      <Field label="Nhập lại mật khẩu mới"><PasswordInput value={pass2} onChange={setPass2} onEnter={handleSubmit} autoComplete="new-password" placeholder="Nhập lại"/></Field>
      {err&&<Notice tone="bad">{err}</Notice>}
      <button onClick={handleSubmit} disabled={saving} style={primaryBtn(saving)}>{saving?"Đang lưu…":"Lưu và vào app"}</button>
    </>}
  </AuthShell>;
}
