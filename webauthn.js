let chartCat=null, chartFlow=null;

const CATEGORIES=["Alimentação","Moradia","Transporte","Saúde","Educação","Lazer","Assinaturas","Impostos","Outros"];

function ensureMonth(user,key){
  user.months=user.months||{};
  if(!user.months[key]) user.months[key]={transactions:[]};
}
function sumMonth(user,key){
  ensureMonth(user,key);
  const tx=user.months[key].transactions||[];
  let income=0, expense=0;
  for(const t of tx){
    if(t.type==="Receita") income+=t.amount;
    else expense+=t.amount;
  }
  return {income,expense,balance:income-expense,tx};
}
function groupExpensesByCategory(user,key){
  ensureMonth(user,key);
  const map={};
  for(const t of user.months[key].transactions){
    if(t.type!=="Despesa") continue;
    map[t.category]=(map[t.category]||0)+t.amount;
  }
  return map;
}
function renderCharts(user,key){
  const byCat=groupExpensesByCategory(user,key);
  const labels=Object.keys(byCat);
  const values=Object.values(byCat);

  if(chartCat) chartCat.destroy();
  chartCat=new Chart(document.getElementById("chartCat"),{
    type:"doughnut",
    data:{labels,datasets:[{data:values}]}
  });

  const {income,expense,balance}=sumMonth(user,key);

  if(chartFlow) chartFlow.destroy();
  chartFlow=new Chart(document.getElementById("chartFlow"),{
    type:"bar",
    data:{labels:["Renda","Gastos","Saldo"],datasets:[{data:[income,expense,balance]}]},
    options:{plugins:{legend:{display:false}}}
  });
}
function renderTable(user,key){
  const tbody=document.getElementById("txTable");
  const {tx}=sumMonth(user,key);
  tbody.innerHTML=tx.map(t=>`
    <tr>
      <td>${t.type}</td>
      <td>${t.category}</td>
      <td>${t.desc}</td>
      <td>${money(t.amount)}</td>
      <td><button class="btn danger" onclick="delTx('${key}','${t.id}')">X</button></td>
    </tr>
  `).join("") || `<tr><td colspan="5" class="muted">Sem lançamentos.</td></tr>`;
}
function updateDashboard(){
  const user=getLoggedUser(); if(!user) return;
  const key=document.getElementById("monthSelect").value;
  ensureMonth(user,key);
  const {income,expense,balance}=sumMonth(user,key);

  document.getElementById("welcome").textContent=`Olá, ${user.username}`;
  document.getElementById("sumIncome").textContent=money(income);
  document.getElementById("sumExpense").textContent=money(expense);
  document.getElementById("sumDebt").textContent="R$ 0,00";
  document.getElementById("sumBalance").textContent=money(balance);

  renderTable(user,key);
  renderCharts(user,key);
  saveLoggedUser(user);
}
function addTx(type,category,desc,amount){
  const user=getLoggedUser();
  const key=document.getElementById("monthSelect").value;
  ensureMonth(user,key);
  user.months[key].transactions.push({id:crypto.randomUUID(),type,category,desc,amount});
  saveLoggedUser(user);
  updateDashboard();
}
function delTx(key,id){
  const user=getLoggedUser();
  ensureMonth(user,key);
  user.months[key].transactions=user.months[key].transactions.filter(t=>t.id!==id);
  saveLoggedUser(user);
  updateDashboard();
}