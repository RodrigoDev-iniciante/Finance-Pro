const $=id=>document.getElementById(id);
let deferredPrompt=null;

function fillMonths(){
  const sel=$("monthSelect");
  sel.innerHTML="";
  for(let i=0;i<12;i++){
    const d=new Date(); d.setMonth(d.getMonth()-i);
    const k=monthKey(d);
    const op=document.createElement("option");
    op.value=k; op.textContent=k;
    sel.appendChild(op);
  }
  sel.value=monthKey();
}
function fillCats(){
  $("txCat").innerHTML=CATEGORIES.map(c=>`<option>${c}</option>`).join("");
}
function boot(){
  const user=getLoggedUser();
  $("auth").style.display=user?"none":"grid";
  $("app").style.display=user?"block":"none";
  $("btnLogout").style.display=user?"":"none";
  $("btnExport").style.display=user?"":"none";
  if(user){
    fillMonths();
    fillCats();
    updateDashboard();
  }
}

$("btnHelp").onclick=()=>{$("helpModal").style.display="flex";};
$("helpClose").onclick=()=>{$("helpModal").style.display="none";};

$("btnRegister").onclick=async ()=>{
  try{
    await registerUser($("regUser").value,$("regPass").value,$("regFamily").value,$("regSalary").value);
    boot();
  }catch(e){alert(e.message||e);}
};
$("btnLogin").onclick=async ()=>{
  try{
    await loginUser($("loginUser").value,$("loginPass").value);
    boot();
  }catch(e){alert(e.message||e);}
};
$("btnEnablePasskeyFromLogin").onclick=async ()=>{
  try{
    await enablePasskeyFromLogin($("loginUser").value,$("loginPass").value);
    alert("Passkey ativada!");
    boot();
  }catch(e){alert(e.message||e);}
};
$("btnLoginPasskey").onclick=async ()=>{
  try{
    await loginUserWithPasskey($("loginUser").value);
    boot();
  }catch(e){alert(e.message||e);}
};

$("btnAdd").onclick=()=>{
  addTx($("txType").value,$("txCat").value,$("txDesc").value,Number($("txAmount").value));
  $("txDesc").value=""; $("txAmount").value="";
};
$("monthSelect").onchange=updateDashboard;

$("btnLogout").onclick=()=>{logoutUser();boot();};

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

$("btnExport").onclick=()=>{
  const txt=JSON.stringify(loadDB(),null,2);
  const blob=new Blob([txt],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="backup.json";
  a.click();
  URL.revokeObjectURL(a.href);
};

$("fileImport").onchange=async (ev)=>{
  const f=ev.target.files?.[0];
  if(!f) return;
  try{
    const txt=await f.text();
    const obj=JSON.parse(txt);
    saveDB(obj);
    alert("Importado!");
    boot();
  }catch(e){alert("Falhou importar.");}
};

$("btnClear").onclick=()=>{
  if(confirm("Apagar tudo?")){
    localStorage.clear();
    sessionStorage.clear();
    boot();
  }
};

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
boot();