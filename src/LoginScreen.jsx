import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { supabase } from "./lib/supabase";
import { C } from "./theme";
import { AuthShell, Field, PasswordInput, Notice, field, primaryBtn, linkBtn } from "./AuthShell";
import { DK } from "./theme";
import { Seg } from "./mobile/ui";
import { parseContent, stripEmptyParagraphs } from "./TermsPage";
import { parseFeatureFlags } from "./adminTabs/FeatureFlagsTab";
import { usernameFromEmail, usernameCandidate } from "./lib/onboardingCheck";

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

// Bản vẽ 109: không còn ô Tên hiển thị — lấy phần trước @ của email, trùng thì thêm số (tên2, tên3…)
async function pickUsername(email){
  const base=usernameFromEmail(email);
  for(let n=1;n<=30;n++){
    const cand=usernameCandidate(base,n);
    try{
      const {data,error}=await supabase.rpc("check_username_available",{p_username:cand});
      if(error)return cand; // không kiểm được → dùng tên đang thử (như trước: chỉ kiểm để báo, không chặn)
      if(data)return cand;
    }catch(e){return cand;}
  }
  return usernameCandidate(base,1000+Math.floor(Math.random()*9000));
}

export function LoginScreen({onLogin,appSettings}){
  const registrationEnabled=parseFeatureFlags(appSettings).registration_enabled;
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
  const [emailStatus,setEmailStatus]=useState(null); // null | "checking" | "taken" | "ok"
  const {signIn,signUp,sendPasswordReset}=useAuth();

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
      if(!email.trim()||!pass.trim()){setErr("Vui lòng nhập đầy đủ");return;}
      if(!email.includes("@")){setErr("Vui lòng nhập email hợp lệ");return;}
      if(emailStatus==="taken"){setErr("Email đã tồn tại");return;}
    }
    if(pass.length<6){setErr("Mật khẩu tối thiểu 6 ký tự");return;}
    try{
      if(mode==="register"){
        setSaving(true);
        const uname=await pickUsername(email.trim());
        await signUp(email.trim(),pass,uname);
        setSuccess("Đăng ký thành công! Đang vào app…");
        // Có phiên ngay (không cần xác nhận email) → App tự chuyển sang màn Chào qua onAuthStateChange, không tải lại trang.
        // Không có phiên (bật xác nhận email) → giữ cách cũ: tải lại để màn đăng nhập về trạng thái đầu.
        const {data:{session}}=await supabase.auth.getSession();
        if(!session)setTimeout(()=>onLogin(uname),1500);
      }else{
        await signIn(email,pass);
        onLogin(email);
      }
    }catch(e){setErr(viAuthError(e.message));}
    setSaving(false);
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
  // Bản vẽ 109: dòng chữ thay ô tích — link đậm màu DK.link
  const regLink={...linkBtn,fontSize:"inherit",padding:0,color:DK.link,fontWeight:700};
  const regTermsLinks=(<>
    <button type="button" onClick={()=>setTermsModal("tos")} style={regLink}>Điều khoản</button> và <button type="button" onClick={()=>setTermsModal("privacy")} style={regLink}>Chính sách bảo mật</button>
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
  const emailHint=!reg?null:emailStatus==="checking"?"Đang kiểm tra…":emailStatus==="taken"?"Email đã có tài khoản — đăng nhập hoặc Quên mật khẩu":emailStatus==="ok"?"Có thể dùng":null;

  return <><AuthShell title={reg?"Tạo tài khoản":"Fipilot AI"} subtitle={reg?"Miễn phí · mất 30 giây":"Trợ lý dinh dưỡng cho người Việt"}
    footer={!reg&&<p style={{margin:"18px 24px 0 24px",textAlign:"center",fontSize:12,color:DK.t3,lineHeight:1.6}}>Tiếp tục nghĩa là bạn đồng ý với {termsLinks} của Fipilot AI.</p>}>
      {isInApp&&<Notice tone="bad">Bạn đang mở trong ứng dụng khác. Để đăng nhập và cài app, hãy mở bằng {browserName}. <button type="button" onClick={handleOpenBrowser} style={{...linkBtn,padding:0}}>Mở bằng {browserName}</button></Notice>}
      <Seg dark mode="tab" value={mode} onChange={(m)=>{setMode(m);setErr("");setSuccess("");}} opts={[{value:"login",label:"Đăng nhập",testid:"auth-tab-login"},{value:"register",label:"Đăng ký",testid:"auth-tab-register"}]} />
      {reg&&!registrationEnabled&&<Notice tone="bad">Hiện chưa nhận đăng ký tài khoản mới. Bạn quay lại sau nhé!</Notice>}
      {(!reg||registrationEnabled)&&<Field label="Email" hint={emailHint} hintTone={tone(emailStatus)}><input data-testid={reg?"auth-reg-email":"login-email"} type="email" inputMode="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={reg?"ban@gmail.com":"ban@email.com"} style={inputStyle} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/></Field>}
      {(!reg||registrationEnabled)&&<Field label="Mật khẩu"><PasswordInput testid={reg?"auth-reg-pass":"login-pass"} value={pass} onChange={setPass} onEnter={handleSubmit} autoComplete={reg?"new-password":"current-password"}/></Field>}
      {!reg&&<button data-testid="forgot-open" onClick={()=>{setMode("forgot");setErr("");setForgotEmail(email);}} style={{...linkBtn,alignSelf:"flex-end"}}>Quên mật khẩu?</button>}
      {canReg&&<p data-testid="reg-terms-note" style={{margin:"0 4px",fontSize:12,color:DK.t3,lineHeight:1.5}}>Bấm Đăng ký là bạn đồng ý {regTermsLinks}.</p>}
      {err&&<Notice tone="bad">{err}</Notice>}
      {success&&<Notice>{success}</Notice>}
      {(!reg||registrationEnabled)&&<button data-testid={reg?"auth-reg-submit":"login-submit"} onClick={handleSubmit} disabled={!!success||(reg&&saving)} style={primaryBtn(!!success||(reg&&saving))}>{reg?(saving?"Đang tạo tài khoản…":"Đăng ký"):"Đăng nhập"}</button>}
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
