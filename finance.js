let chartCat=null, chartFlow=null;

const BANKS = [
  "Nubank","Caixa","Banco do Brasil","Bradesco","Itaú","Santander",
  "Inter","PicPay","Mercado Pago","C6","Sicredi","Dinheiro","Outro"
];

const CATEGORIES = [
  "Alimentação","Moradia","Luz","Água","Internet","Gás","Transporte","Combustível",
  "Saúde","Farmácia","Educação","Lazer","Assinaturas","Vestuário","Pets","Impostos",
  "Cartão","Empréstimo","Outros"
];

function monthLabel(key){
  const [y,m]=key.split("-");
  const names=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${names[parseInt(m,10)-1]}/${y}`;
}
function ensureMonth(user,key){
  user.months=user.months||{};
  if(!user.months[key]) user.months[key]={transactions:[]};
}
function sumMonth(user,key){
  ensureMonth(user,key);
  const tx=user.months[key].transactions||[];
  let income=0, expense=0, debt=0;
  for(const t of tx){
    if(t.type==="Receita") income+=t.amount;
    if(t.type==="Despesa") expense+=t.amount;
    if(t.type==="DividaParcela") debt+=t.amount;
  }
  const balance=income-expense-debt;
  return {income,expense,debt,balance};
}
function groupExpensesByCategory(user,key){
  ensureMonth(user,key);
  const tx=user.months[key].transactions||[];
  const map={};
  for(const t of tx){
    const spend=(t.type==="Despesa"||t.type==="DividaParcela");
    if(!spend) continue;
    const c=t.category||"Outros";
    map[c]=(map[c]||0)+t.amount;
  }
  return map;
}

function accountLabel(user, accId){
  if(!accId) return "";
  const acc=(user.accounts||[]).find(a=>a.id===accId);
  if(!acc) return "";
  return `${acc.name} • ${acc.bank}`;
}

function analyze(user,key){
  const {income,expense,debt,balance}=sumMonth(user,key);
  const totalIncome = income + (user.salary||0);

  const tips=[];
  if(totalIncome<=0) tips.push("Cadastre renda: adicione uma Receita (ex.: salário).");
  if(balance<0) tips.push("⚠️ Saldo negativo: corte gastos variáveis e evite parcelar.");
  if(debt>totalIncome*0.3) tips.push("⚠️ Dívidas acima de 30% da renda: renegocie juros e parcelas.");
  if(expense>totalIncome*0.6) tips.push("Despesas altas: tente manter abaixo de 60% da renda.");

  const byCat=groupExpensesByCategory(user,key);
  const top=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,3);
  if(top.length) tips.push(`Top gastos: ${top.map(([c,v])=>`${c} (${money(v)})`).join(", ")}.`);

  const invest=[
    "O que fazer com o saldo:",
    "• Primeiro: reserva de emergência (3–6 meses) em liquidez diária.",
    "• Depois: metas + renda fixa / investimentos."
  ];
  if(balance>0) invest.push(`• Sugestão: guardar 10% do saldo: ${money(balance*0.10)}.`);

  return {tips, invest};
}

function fillSelect(el, items, placeholder){
  el.innerHTML="";
  if(placeholder){
    const op=document.createElement("option");
    op.value=""; op.textContent=placeholder;
    el.appendChild(op);
  }
  for(const it of items){
    const op=document.createElement("option");
    op.value=it; op.textContent=it;
    el.appendChild(op);
  }
}

function refreshAccountSelect(user){
  const sel=document.getElementById("accSelect");
  sel.innerHTML="";
  user.accounts=user.accounts||[];
  for(const a of user.accounts){
    const op=document.createElement("option");
    op.value=a.id; op.textContent=`${a.name} • ${a.bank}`;
    sel.appendChild(op);
  }
}

function hasAccountUsage(user, accId){
  const months = user.months || {};
  for(const k of Object.keys(months)){
    const tx = months[k]?.transactions || [];
    if(tx.some(t => t.accId === accId)) return true;
  }
  if((user.recurring||[]).some(r => r.accId === accId)) return true;
  if((user.debts||[]).some(d => d.accId === accId)) return true;
  return false;
}

function renderAccounts(user){
  const box=document.getElementById("accountsList");
  box.innerHTML="";
  user.accounts=user.accounts||[];

  if(!user.accounts.length){
    box.innerHTML=`<div class="muted small">Nenhuma conta cadastrada.</div>`;
    return;
  }

  for(const a of user.accounts){
    const div=document.createElement("div");
    div.className="item";
    div.innerHTML=`
      <div>
        <div class="item-title">${a.name}</div>
        <div class="meta">${a.bank}</div>
      </div>
      <button class="iconBtn" data-del="${a.id}">Remover</button>
    `;
    box.appendChild(div);
  }

  box.querySelectorAll("button[data-del]").forEach(btn=>{
    btn.onclick=()=>{
      const id=btn.dataset.del;
      if(!confirm("Remover essa conta?")) return;
      if(hasAccountUsage(user,id)) return alert("Não dá para remover: existe histórico usando essa conta.");
      user.accounts=user.accounts.filter(x=>x.id!==id);
      saveLoggedUser(user);
      refreshAccountSelect(user);
      renderAccounts(user);
    };
  });
}

function renderTxTable(user,key){
  const tbody=document.getElementById("txTable");
  tbody.innerHTML="";
  ensureMonth(user,key);
  const tx=user.months[key].transactions||[];

  if(!tx.length){
    tbody.innerHTML=`<tr><td colspan="6" class="muted">Nenhum lançamento.</td></tr>`;
    return;
  }

  for(const t of tx){
    const bankText = t.bank || "—";
    const accText = accountLabel(user, t.accId) || "—";

    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${t.type}</td>
      <td>${t.category||"-"}</td>
      <td>${t.description}</td>
      <td>${money(t.amount)}</td>
      <td>${bankText}<br><span class="muted small">${accText}</span></td>
      <td><button class="iconBtn">Excluir</button></td>
    `;
    tr.querySelector("button").onclick=()=>{
      if(!confirm("Excluir lançamento?")) return;
      user.months[key].transactions=user.months[key].transactions.filter(x=>x.id!==t.id);
      saveLoggedUser(user);
      updateDashboard();
    };
    tbody.appendChild(tr);
  }
}

function renderDebts(user){
  const el=document.getElementById("debtsList");
  el.innerHTML="";
  const debts=(user.debts||[]).filter(d=>d.remaining>0);

  if(!debts.length){
    el.innerHTML=`<div class="muted small">Nenhuma dívida ativa.</div>`;
    return;
  }

  for(const d of debts){
    const div=document.createElement("div");
    div.className="item";

    const bankText = d.bank || "—";
    const accText = accountLabel(user, d.accId) || "—";

    div.innerHTML=`
      <div>
        <div class="item-title">${d.description}</div>
        <div class="meta">Restam ${d.remaining} • Parcela ${money(d.monthlyValue)} • Total ${money(d.total)}</div>
        <div class="meta">Banco: <b>${bankText}</b> • Conta: <b>${accText}</b></div>
      </div>
    `;
    el.appendChild(div);
  }
}

function renderRecurring(user){
  const el=document.getElementById("recList");
  el.innerHTML="";
  const rec=user.recurring||[];

  if(!rec.length){
    el.innerHTML=`<div class="muted small">Nenhuma recorrência cadastrada.</div>`;
    return;
  }

  for(const r of rec){
    const div=document.createElement("div");
    div.className="item";

    const bankText = r.bank || "—";
    const accText = accountLabel(user, r.accId) || "—";

    div.innerHTML=`
      <div>
        <div class="item-title">${r.description}</div>
        <div class="meta">${r.type} • ${r.category} • ${money(r.amount)}</div>
        <div class="meta">Banco: <b>${bankText}</b> • Conta: <b>${accText}</b></div>
      </div>
    `;
    el.appendChild(div);
  }
}

function drawCharts(user,key){
  const byCat=groupExpensesByCategory(user,key);
  const labels=Object.keys(byCat);
  const values=Object.values(byCat);

  const ctx1=document.getElementById("chartCat").getContext("2d");
  if(chartCat) chartCat.destroy();
  chartCat=new Chart(ctx1,{
    type:"doughnut",
    data:{labels,datasets:[{data:values}]},
    options:{responsive:true,plugins:{legend:{position:"bottom"}}}
  });

  const {income,expense,debt}=sumMonth(user,key);
  const totalIncome = income + (user.salary||0);

  const ctx2=document.getElementById("chartFlow").getContext("2d");
  if(chartFlow) chartFlow.destroy();
  chartFlow=new Chart(ctx2,{
    type:"bar",
    data:{labels:["Renda","Despesas","Dívidas"],datasets:[{data:[totalIncome,expense,debt]}]},
    options:{responsive:true,plugins:{legend:{display:false}}}
  });
}

function updateComparison(){
  const user=getLoggedUser(); if(!user) return;
  const current=document.getElementById("monthSelect").value;
  const other=document.getElementById("compareSelect").value;
  if(!other){
    document.getElementById("compareResult").textContent="Selecione um mês para comparar.";
    return;
  }

  const a=sumMonth(user,current);
  const b=sumMonth(user,other);

  const aInc=a.income+(user.salary||0);
  const bInc=b.income+(user.salary||0);

  document.getElementById("compareResult").textContent =
    `Comparando com ${monthLabel(other)}: `+
    `Renda ${money(aInc-bInc)} | Despesas ${money(a.expense-b.expense)} | Dívidas ${money(a.debt-b.debt)} | Saldo ${money(a.balance-b.balance)}.`;
}

function addTxFromUI(){
  const user=getLoggedUser();
  if(!user) return alert("Faça login.");

  const key=document.getElementById("monthSelect").value;
  ensureMonth(user,key);

  const type=document.getElementById("txType").value;
  const category=document.getElementById("txCat").value;
  const desc=document.getElementById("txDesc").value.trim();
  const amount=parseFloat(document.getElementById("txAmount").value||"0");
  const recurring=document.getElementById("txRecurring").checked;
  const installments=parseInt(document.getElementById("txInstall").value||"0",10);

  const bank=document.getElementById("bankSelect").value || "";
  const accId=document.getElementById("accSelect").value || "";

  if(!desc || !amount || amount<=0) return alert("Preencha descrição e valor.");

  if(type==="Divida"){
    if(!installments || installments<=0) return alert("Informe parcelas.");
    const monthly=amount/installments;

    user.debts=user.debts||[];
    const debt={
      id:crypto.randomUUID(),
      description:desc,
      total:amount,
      remaining:installments,
      monthlyValue:monthly,
      bank, accId
    };
    user.debts.push(debt);

    user.months[key].transactions.push({
      id:crypto.randomUUID(),
      type:"DividaParcela",
      category:"Cartão",
      description:`${desc} (parcela)`,
      amount:monthly,
      origin:"debt",
      debtId:debt.id,
      bank:debt.bank,
      accId:debt.accId,
      createdAt:Date.now()
    });
  } else {
    user.months[key].transactions.push({
      id:crypto.randomUUID(),
      type,
      category,
      description:desc,
      amount,
      origin:"manual",
      bank, accId,
      createdAt:Date.now()
    });

    if(recurring){
      user.recurring=user.recurring||[];
      user.recurring.push({
        id:crypto.randomUUID(),
        type, category,
        description:desc,
        amount,
        bank, accId
      });
    }
  }

  document.getElementById("txDesc").value="";
  document.getElementById("txAmount").value="";
  document.getElementById("txInstall").value="";
  document.getElementById("txRecurring").checked=false;

  saveLoggedUser(user);
  updateDashboard();
}

function initFinanceApp(user){
  const monthSel=document.getElementById("monthSelect");
  const keys=new Set(Object.keys(user.months||{}));
  keys.add(monthKey());
  const arr=[...keys].sort();

  monthSel.innerHTML="";
  for(const k of arr){
    const op=document.createElement("option");
    op.value=k; op.textContent=monthLabel(k);
    monthSel.appendChild(op);
  }
  monthSel.value=monthKey();

  const cmp=document.getElementById("compareSelect");
  cmp.innerHTML=`<option value="">-- escolher --</option>`;
  for(const k of arr){
    const op=document.createElement("option");
    op.value=k; op.textContent=monthLabel(k);
    cmp.appendChild(op);
  }

  fillSelect(document.getElementById("txCat"), CATEGORIES);
  fillSelect(document.getElementById("bankSelect"), BANKS, "Banco (opcional)");
  refreshAccountSelect(user);

  document.getElementById("btnAdd").onclick=()=>addTxFromUI();
  monthSel.onchange=()=>updateDashboard();
  document.getElementById("compareSelect").onchange=()=>updateComparison();

  document.getElementById("txType").onchange=()=>{
    const v=document.getElementById("txType").value;
    document.getElementById("installBox").style.display=(v==="Divida")?"":"none";
  };

  document.getElementById("btnAddAccount").onclick=()=>{
    const name=document.getElementById("accName").value.trim();
    const bank=(document.getElementById("accBank").value.trim() || "Outro");
    if(!name) return alert("Digite o nome da conta (ex: Cartão Nubank).");

    user.accounts=user.accounts||[];
    user.accounts.push({id:crypto.randomUUID(), name, bank});
    document.getElementById("accName").value="";
    document.getElementById("accBank").value="";
    saveLoggedUser(user);
    refreshAccountSelect(user);
    renderAccounts(user);
  };

  document.getElementById("chartExplain").innerHTML = `
    <div><b>Gastos por categoria</b>: mostra onde o dinheiro mais sai. A maior fatia é o maior gasto do mês.</div>
    <div style="margin-top:8px"><b>Fluxo do mês</b>: compara <b>Renda</b> x <b>Despesas</b> x <b>Dívidas</b>. Se Despesas+Dívidas passar da Renda, o saldo fica negativo.</div>
    <div style="margin-top:8px"><b>Dica</b>: corte 10% da maior categoria por 30 dias e compare os meses.</div>
  `;

  updateDashboard();
}

function updateDashboard(){
  const user=getLoggedUser(); if(!user) return;
  const key=document.getElementById("monthSelect").value;

  ensureMonth(user,key);

  const tx=user.months[key].transactions;

  // recorrentes (sem duplicar) — herda banco/conta do recorrente
  const recIds=new Set(tx.filter(t=>t.origin==="recurring").map(t=>t.recId));
  for(const r of (user.recurring||[])){
    if(recIds.has(r.id)) continue;
    tx.push({
      id:crypto.randomUUID(),
      type:r.type,
      category:r.category,
      description:r.description+" (recorrente)",
      amount:r.amount,
      origin:"recurring",
      recId:r.id,
      bank:r.bank || "",
      accId:r.accId || "",
      createdAt:Date.now()
    });
  }

  // dívidas (sem duplicar) — herda banco/conta da dívida
  const debtApplied=new Set(tx.filter(t=>t.origin==="debt").map(t=>t.debtId));
  for(const d of (user.debts||[])){
    if(d.remaining<=0) continue;
    if(debtApplied.has(d.id)) continue;

    tx.push({
      id:crypto.randomUUID(),
      type:"DividaParcela",
      category:"Cartão",
      description:`${d.description} (parcela)`,
      amount:d.monthlyValue,
      origin:"debt",
      debtId:d.id,
      bank:d.bank || "",
      accId:d.accId || "",
      createdAt:Date.now()
    });

    d.remaining -= 1;
  }

  saveLoggedUser(user);

  const {income,expense,debt,balance}=sumMonth(user,key);
  const totalIncome = income + (user.salary||0);

  document.getElementById("welcome").textContent=`Olá, ${user.username}`;
  document.getElementById("sumIncome").textContent=money(totalIncome);
  document.getElementById("sumExpense").textContent=money(expense);
  document.getElementById("sumDebt").textContent=money(debt);
  document.getElementById("sumBalance").textContent=money(totalIncome - expense - debt);

  const per = (totalIncome - expense - debt) / Math.max(1, user.familySize || 1);
  document.getElementById("perPerson").textContent=`Por pessoa: ${money(per)}`;
  document.getElementById("savingTarget").textContent=`Meta de reserva (10%): ${money(totalIncome*0.10)}`;

  const {tips,invest}=analyze(user,key);
  document.getElementById("analysisBox").innerHTML=tips.map(t=>`<div>• ${t}</div>`).join("");
  document.getElementById("investBox").innerHTML=invest.map(t=>`<div>${t}</div>`).join("");

  renderTxTable(user,key);
  renderAccounts(user);
  refreshAccountSelect(user);
  renderDebts(user);
  renderRecurring(user);
  drawCharts(user,key);
}