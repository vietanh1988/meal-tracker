import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { supabase } from "./lib/supabase";
import { C } from "./theme";
import { AuthShell, Field, PasswordInput, Notice, field, primaryBtn, linkBtn } from "./AuthShell";
import { DK } from "./theme";
import { parseContent, stripEmptyParagraphs } from "./TermsPage";
import { parseFeatureFlags } from "./adminTabs/FeatureFlagsTab";

// Lỗi Supabase Auth (tiếng Anh) → câu tiếng Việt dễ hiểu
export function viAuthError(msg){
  const m=String(msg||"");
  if(/invalid login credentials/i.test(m))return "Email hoặc mật khẩu chưa đúng.";
  if(/email not confirmed/i.test(m))return "Email chưa được xác nhận. Kiểm tra hộp thư nhé.";
  if(/already registered|already been registered|user already exists/i.test(m))return "Email này đã có tài khoản — đăng nhập hoặc bấm Quên mật khẩu.";
  if(/password should be at least|weak password/i.test(m))return "Mật khẩu quá ngắn hoặc quá dễ đoán.";
  if(/rate limit|too many requests|security purposes/i.test(m))return "Thử quá nhiều lần, đợi một lát rồi thử lại.";
  if(/failed to fetch|network/i.test(m))return "Không kết nối được, kiểm tra mạng rồi thử lại.";
  if(/invalid email|unable to validate email/i.test(m))return "Email chưa đúng định dạng.";
  return m||"Có lỗi, thử lại nhé.";
}

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
        setSuccess(`Đăng ký thành công! Tài khoản "${user.trim()}" dùng được ngay.`);
        setTimeout(()=>onLogin(user.trim()),1500);
      }else{
        await signIn(email,pass);
        onLogin(email);
      }
    }catch(e){setErr(viAuthError(e.message));}
  };

  const handleForgotSubmit=async()=>{
    setErr("");
    if(!forgotEmail.trim()||!forgotEmail.includes("@")){setErr("Vui lòng nhập email hợp lệ");return;}
    setSaving(true);
    try{
      await sendPasswordReset(forgotEmail.trim());
      setForgotSent(true);
    }catch(e){setErr(viAuthError(e.message));}
    setSaving(false);
  };

  const inputStyle=field;
  const termsLinks=(<>
    <button type="button" onClick={()=>setTermsModal("tos")} style={{...linkBtn,fontSize:"inherit",padding:0}}>Điều khoản dịch vụ</button> và <button type="button" onClick={()=>setTermsModal("privacy")} style={{...linkBtn,fontSize:"inherit",padding:0}}>Chính sách bảo mật</button>
  </>);

  if(mode==="forgot"){
    return <AuthShell compact title="Quên mật khẩu" onBack={()=>{setMode("login");setErr("");setForgotSent(false);}}>
      <span style={{fontSize:11,fontWeight:700,color:DK.t3,letterSpacing:"0.08em"}}>BƯỚC 1 · GỬI EMAIL</span>
      <span style={{fontSize:14,color:DK.t2,lineHeight:1.5}}>Nhập email đã đăng ký, Fipilot sẽ gửi đường link đặt lại mật khẩu.</span>
      <Field label="Email"><input data-testid="forgot-email" type="email" autoComplete="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="ban@email.com" style={inputStyle} onKeyDown={e=>e.key==="Enter"&&handleForgotSubmit()}/></Field>
      {err&&<Notice tone="bad">{err}</Notice>}
      {forgotSent
        ?<Notice>Đã gửi tới {forgotEmail}. Kiểm tra hộp thư (cả mục Spam), bấm link trong email để đặt mật khẩu mới.</Notice>
        :<button data-testid="forgot-send" onClick={handleForgotSubmit} disabled={saving} style={primaryBtn(saving)}>{saving?"Đang gửi…":"Gửi link đặt lại"}</button>}
      <button onClick={()=>{setMode("login");setErr("");setForgotSent(false);}} style={{...linkBtn,alignSelf:"center"}}>Quay lại đăng nhập</button>
    </AuthShell>;
  }

  const isInApp = /FBAN|FBAV|Instagram|Zalo|Line|MicroMessenger|Messenger/i.test(navigator.userAgent || "");
  const isIOSDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  const browserName = isIOSDevice ? "Safari" : "Chrome";
  const handleOpenBrowser = () => {
    window.open(window.location.href, "_system") || window.open(window.location.href, "_blank");
  };
  const reg=mode==="register";
  const canReg=reg&&registrationEnabled;
  const tone=(st)=>st==="taken"?"bad":st==="ok"?"ok":null;
  const userHint=usernameStatus==="checking"?"Đang kiểm tra…":usernameStatus==="taken"?"Tên này đã có người dùng":usernameStatus==="ok"?"Có thể dùng tên này":null;
  const emailHint=!reg?null:emailStatus==="checking"?"Đang kiểm tra…":emailStatus==="taken"?"Email đã có tài khoản — đăng nhập hoặc Quên mật khẩu":emailStatus==="ok"?"Có thể dùng":null;

  return <><AuthShell title={reg?"Tạo tài khoản":"Fipilot AI"} subtitle={reg?null:"Trợ lý dinh dưỡng cho người Việt"}
    footer={!reg&&<p style={{margin:"18px 24px 0 24px",textAlign:"center",fontSize:12,color:DK.t3,lineHeight:1.6}}>Tiếp tục nghĩa là bạn đồng ý với {termsLinks} của Fipilot AI.</p>}>
      {isInApp&&<Notice tone="bad">Bạn đang mở trong ứng dụng khác. Để đăng nhập và cài app, hãy mở bằng {browserName}. <button type="button" onClick={handleOpenBrowser} style={{...linkBtn,padding:0}}>Mở bằng {browserName}</button></Notice>}
      <div role="tablist" style={{display:"grid",gridTemplateColumns:"repeat(2, minmax(0, 1fr))",gap:4,padding:3,background:DK.chip,border:`1px solid ${DK.chipLine}`,borderRadius:12}}>
        {["login","register"].map(m=><button key={m} role="tab" aria-selected={mode===m} data-testid={`auth-tab-${m}`} onClick={()=>{setMode(m);setErr("");setSuccess("");}}
          style={{height:38,borderRadius:9,border:"none",fontFamily:"inherit",fontSize:14,fontWeight:mode===m?800:600,background:mode===m?"#FFFFFF":"transparent",color:mode===m?"#0040E0":DK.t2,boxShadow:mode===m?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>{m==="login"?"Đăng nhập":"Đăng ký"}</button>)}
      </div>
      {reg&&!registrationEnabled&&<Notice tone="bad">Hiện chưa nhận đăng ký tài khoản mới. Bạn quay lại sau nhé!</Notice>}
      {canReg&&<Field label="Tên hiển thị" hint={userHint} hintTone={tone(usernameStatus)}><input data-testid="reg-username" autoComplete="nickname" value={user} onChange={e=>setUser(e.target.value)} placeholder="VD: gymboy63" style={inputStyle} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/></Field>}
      {(!reg||registrationEnabled)&&<Field label="Email" hint={emailHint} hintTone={tone(emailStatus)}><input data-testid="login-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ban@email.com" style={inputStyle} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/></Field>}
      {(!reg||registrationEnabled)&&<Field label="Mật khẩu"><PasswordInput testid="login-pass" value={pass} onChange={setPass} onEnter={handleSubmit} autoComplete={reg?"new-password":"current-password"}/></Field>}
      {!reg&&<button data-testid="forgot-open" onClick={()=>{setMode("forgot");setErr("");setForgotEmail(email);}} style={{...linkBtn,alignSelf:"flex-end"}}>Quên mật khẩu?</button>}
      {canReg&&<label style={{display:"flex",alignItems:"flex-start",gap:10,fontSize:13,color:DK.t2,lineHeight:1.5}}>
        <input data-testid="reg-terms" type="checkbox" checked={agreedTerms} onChange={e=>{setAgreedTerms(e.target.checked);if(e.target.checked)setErr("");}} style={{width:20,height:20,marginTop:1,flexShrink:0,accentColor:"#4DA3FF"}}/>
        <span>Tôi đồng ý với {termsLinks}</span>
      </label>}
      {err&&<Notice tone="bad">{err}</Notice>}
      {success&&<Notice>{success}</Notice>}
      {(!reg||registrationEnabled)&&<button data-testid="login-submit" onClick={handleSubmit} disabled={!!success} style={primaryBtn(!!success)}>{reg?"Đăng ký":"Đăng nhập"}</button>}
      {canReg&&<span style={{fontSize:12,color:DK.t3,textAlign:"center"}}>Tài khoản dùng được ngay sau khi đăng ký</span>}
    </AuthShell>
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
  </>;
}
