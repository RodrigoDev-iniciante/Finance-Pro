const $ = (id) => document.getElementById(id);
function show(el, yes){ el.style.display = yes ? "" : "none"; }

let deferredPrompt=null;

function setupPWAInstall(){
  window.addEventListener("beforeinstallprompt",(e)=>{
    e.preventDefault();
    deferredPrompt=e;
    $("btnInstall").style.display="";
  });
  $("btnInstall").onclick=async ()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt=null;
    $("btnInstall").style.display="none";
  };
}

function setupHelp(){
  $("btnHelp").onclick=()=>{ $("helpModal").style.display="flex"; };
  $("helpClose").onclick=()=>{ $("helpModal").style.display="none"; };
  $("helpModal").onclick=(e)=>{ if(e.target.id==="helpModal") $("helpModal").style.display="none"; };
}

function setupAuth(){
  $("btnRegister").onclick=async ()=>{
    try{
      await registerUser($("regUser").value,$("regPass").value,$("regFamily").value,$("regSalary").value);
      boot();
    }catch(e){ alert(e.message||e); }
  };

  $("btnLogin").onclick=async ()=>{
    try{
      await loginUser($("loginUser").value,$("loginPass").value);
      boot();
    }catch(e){ alert(e.message||e); }
  };

  $("btnLoginPasskey").onclick=async ()=>{
    try{
      const u=$("loginUser").value.trim();
      if(!u) return alert("Digite o usuário primeiro.");
      await loginUserWithPasskey(u);
      boot();
    }catch(e){ alert(e.message||e); }
  };

  $("btnEnablePasskeyFromLogin").onclick=async ()=>{
    try{
      const u=$("loginUser").value.trim();
      const p=$("loginPass").value;
      if(!u || !p) return alert("Digite usuário e senha para ativar Passkey.");
      await enablePasskeyFromLogin(u,p);
      alert("Passkey cadastrada! Agora você pode entrar com biometria/PIN/padrão neste aparelho.");
      boot();
    }catch(e){ alert(e.message||e); }
  };
}

function setupTopbar(){
  $("btnLogout").onclick=()=>{ logoutUser(); boot(); };

  $("btnExport").onclick=()=>{
    const txt=exportBackup();
    const blob=new Blob([txt],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="familia-finance-pro-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  $("fileImport").onchange=async (ev)=>{
    const f=ev.target.files?.[0];
    if(!f) return;
    try{
      importBackup(await f.text());
      alert("Backup importado!");
      boot();
    }catch(e){ alert(e.message||e); }
    ev.target.value="";
  };

  $("btnClear").onclick=()=>{
    if(!confirm("Apagar tudo deste aparelho? Faça Backup antes.")) return;
    hardResetAll();
    alert("Apagado.");
    boot();
  };
}

function boot(){
  const user=getLoggedUser();
  show($("auth"), !user);
  show($("app"), !!user);
  $("btnLogout").style.display = user ? "" : "none";

  if(!user) return;
  initFinanceApp(user);
}

document.addEventListener("DOMContentLoaded",()=>{
  setupPWAInstall();
  setupHelp();
  setupAuth();
  setupTopbar();
  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
  boot();
});