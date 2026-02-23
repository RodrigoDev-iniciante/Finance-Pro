async function sha256(text){
  const enc=new TextEncoder().encode(text);
  const buf=await crypto.subtle.digest("SHA-256",enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function getUsers(db){db.users=db.users||{};return db.users}
function getUser(db,u){return getUsers(db)[u]||null}
function setUser(db,u,data){getUsers(db)[u]=data;saveDB(db)}

async function registerUser(username,password,familySize,salary){
  const u=String(username||"").trim().toLowerCase();
  if(!u||!password) throw new Error("Preencha usuário e senha.");
  const db=loadDB();
  if(getUser(db,u)) throw new Error("Usuário já existe.");
  const salt=crypto.randomUUID();
  const hash=await sha256(`${salt}:${password}`);
  const user={
    username:u,
    pass:{salt,hash},
    familySize:Number(familySize||1),
    salary:Number(salary||0),
    months:{},
    recurring:[],
    debts:[]
  };
  setUser(db,u,user);
  saveSession({username:u});
  return user;
}

async function loginUser(username,password){
  const u=String(username||"").trim().toLowerCase();
  const db=loadDB();
  const user=getUser(db,u);
  if(!user) throw new Error("Usuário não encontrado.");
  const hash=await sha256(`${user.pass.salt}:${password}`);
  if(hash!==user.pass.hash) throw new Error("Senha incorreta.");
  saveSession({username:u});
  return user;
}

async function enablePasskeyFromLogin(username,password){
  const u=String(username||"").trim().toLowerCase();
  await loginUser(u,password);
  await registerPasskey(u);
  return true;
}

async function loginUserWithPasskey(username){
  const u=String(username||"").trim().toLowerCase();
  const db=loadDB();
  const user=getUser(db,u);
  if(!user) throw new Error("Usuário não encontrado.");
  await loginWithPasskey(u);
  saveSession({username:u,via:"passkey"});
  return user;
}

function getLoggedUser(){
  const sess=loadSession();
  if(!sess?.username) return null;
  const db=loadDB();
  return getUser(db,sess.username);
}
function saveLoggedUser(user){
  const db=loadDB();
  setUser(db,user.username,user);
}
function logoutUser(){clearSession()}