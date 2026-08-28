(function(){
  "use strict";
  const VERSION="2026-08-29";
  const STORE="taipower-4in1-billing:v1";
  const BASE_I_II=221265486;
  const TAX_TOTAL=28734514;
  const CONTRACT_PRETAX=250000000;
  const TAX_RATE=TAX_TOTAL/BASE_I_II;
  const items=[
    {id:"p1",group:"personnel",code:"壹.1",name:"現場監造主管（主任）",unit:"人月",qty:183,price:210729,amount:38563414,basis:"按甲方核定出勤配置，按月實作實算"},
    {id:"p21",group:"personnel",code:"壹.2.1",name:"土木主辦監造工程師",unit:"人月",qty:121,price:186783,amount:22600689,basis:"按甲方核定出勤配置，按月實作實算"},
    {id:"p22",group:"personnel",code:"壹.2.2",name:"建築主辦監造工程師",unit:"人月",qty:85,price:186783,amount:15876517,basis:"按甲方核定出勤配置，按月實作實算"},
    {id:"p23",group:"personnel",code:"壹.2.3",name:"機電主辦監造工程師",unit:"人月",qty:77,price:186783,amount:14382256,basis:"按甲方核定出勤配置，按月實作實算"},
    {id:"p31",group:"personnel",code:"壹.3.1",name:"土木協辦監造工程師",unit:"人月",qty:84,price:164752,amount:13839150,basis:"按甲方核定出勤配置，按月實作實算"},
    {id:"p32",group:"personnel",code:"壹.3.2",name:"建築協辦監造工程師",unit:"人月",qty:67,price:164752,amount:11038370,basis:"按甲方核定出勤配置，按月實作實算"},
    {id:"p33",group:"personnel",code:"壹.3.3",name:"機電協辦監造工程師",unit:"人月",qty:30,price:164752,amount:4942554,basis:"按甲方核定出勤配置，按月實作實算"},
    {id:"p4",group:"personnel",code:"壹.4",name:"協辦監造工程員",unit:"人月",qty:109,price:138890,amount:15138965,basis:"按甲方核定出勤配置，按月實作實算"},
    {id:"p5",group:"personnel",code:"壹.5",name:"職業安全衛生管理人員",unit:"人月",qty:154,price:164752,amount:25371776,basis:"須具乙級資格；按月實作實算"},
    {id:"p6",group:"personnel",code:"壹.6",name:"文書管理人員",unit:"人月",qty:182,price:84292,amount:15341073,basis:"按甲方核定出勤配置，按月實作實算"},
    {id:"f1",group:"facility",code:"貳.1",name:"監造建築師及各類技師簽證及相關服務、出席費",unit:"式",qty:1,price:4079523,amount:4079523,basis:"式項；原則依工程進度百分比核付"},
    {id:"f2",group:"facility",code:"貳.2",name:"優質獎、金質獎、金安獎、環保獎或施工查核成績優良作業費",unit:"次",qty:20,price:57472,amount:1149431,basis:"實際獲獎或查核甲等以上，按次實作實算"},
    {id:"f3",group:"facility",code:"貳.3",name:"工地車輛費用",unit:"車月",qty:300,price:28736,amount:8620734,basis:"按車月實作實算；含維修、油料、保險、保養"},
    {id:"f4",group:"facility",code:"貳.4",name:"辦公室設備及維護費",unit:"式",qty:1,price:3807491,amount:3807491,basis:"11.5.1.2.3僅列費用內容；核付比例待甲方確認"},
    {id:"f5",group:"facility",code:"貳.5",name:"監造圖說、文件報告、竣工／驗收作業費及其他",unit:"式",qty:1,price:21532676,amount:21532676,basis:"工程竣工驗收合格後分次給付"},
    {id:"f6",group:"facility",code:"貳.6",name:"勞工安全衛生護具費",unit:"式",qty:1,price:670501,amount:670501,basis:"工作說明書8.3；原則依工程進度百分比核付"},
    {id:"f7",group:"facility",code:"貳.7",name:"材料設備抽（檢）驗費",unit:"式",qty:1,price:4310367,amount:4310367,basis:"11.5.1.2.5列費用範圍；核付比例待甲方確認"}
  ];
  const statuses=["未檢核","本月無發生","待請款","已送審","已核付","不適用"];
  let state=loadState();
  let filter="all";
  const el=id=>document.getElementById(id);
  const money=n=>new Intl.NumberFormat("zh-TW",{style:"currency",currency:"TWD",maximumFractionDigits:0}).format(Number(n)||0);
  const number=n=>new Intl.NumberFormat("zh-TW",{maximumFractionDigits:2}).format(Number(n)||0);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const nowMonth=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`};
  function loadState(){try{const raw=JSON.parse(localStorage.getItem(STORE));if(raw&&raw.records)return raw}catch(e){}return {version:VERSION,records:{},updatedAt:null}}
  function persist(stamp=false){state.version=VERSION;if(stamp)state.updatedAt=new Date().toISOString();localStorage.setItem(STORE,JSON.stringify(state))}
  function monthRecord(month){if(!state.records[month])state.records[month]={};return state.records[month]}
  function record(month,id){const r=monthRecord(month);if(!r[id])r[id]={qty:0,status:"未檢核",note:""};return r[id]}
  // 決標表部分顯示單價經四捨五入，數量乘單價不會精確等於契約複價。
  // 月估驗以「契約複價 ÷ 契約數量」作比例估算，完整用量才會回到原契約複價。
  function lineRawAmount(item,qty){return qty*(item.amount/item.qty)}
  function allMonths(){return Object.keys(state.records).sort()}
  function cumulativeQty(id){return allMonths().reduce((sum,m)=>sum+(Number(state.records[m]?.[id]?.qty)||0),0)}
  function recentAverage(id){const values=allMonths().map(m=>Number(state.records[m]?.[id]?.qty)||0).filter(v=>v>0).slice(-3);return values.length?values.reduce((a,b)=>a+b,0)/values.length:0}
  function cumulativeAmount(item){return allMonths().reduce((sum,m)=>sum+lineRawAmount(item,Number(state.records[m]?.[item.id]?.qty)||0),0)}
  function addMonths(month,count){const [y,m]=month.split("-").map(Number);const d=new Date(y,m-1+Math.max(0,count),1);return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}`}
  function selectedMonth(){return el("monthPicker").value||nowMonth()}
  function filtered(item){return filter==="all"||item.group===filter}
  function renderEntry(){
    const month=selectedMonth();
    el("entryBody").innerHTML=items.filter(filtered).map(item=>{const r=record(month,item.id);const unitHint=item.unit==="式"?"<div class=\"item-code\">0.08＝8%</div>":"";return `<tr class="${item.group==='facility'?'facility':''}"><td><div class="item-code">${item.code}</div><div class="item-name">${esc(item.name)}</div></td><td>${item.unit}${unitHint}</td><td class="num">${number(item.qty)}</td><td class="num">${money(item.price)}</td><td class="num">${money(item.amount)}</td><td><input class="qty-input" data-id="${item.id}" data-field="qty" type="number" min="0" step="0.01" value="${Number(r.qty)||0}" aria-label="${esc(item.name)}本月數量"></td><td><select class="status-select ${r.status==='未檢核'?'unreviewed':''}" data-id="${item.id}" data-field="status" aria-label="${esc(item.name)}本月狀態">${statuses.map(s=>`<option ${s===r.status?'selected':''}>${s}</option>`).join('')}</select></td><td><input class="note-input" data-id="${item.id}" data-field="note" value="${esc(r.note)}" placeholder="收文、發票、簽到或進度依據" aria-label="${esc(item.name)}證據備註"></td><td class="basis">${esc(item.basis)}</td></tr>`}).join("")||`<tr><td colspan="9" class="empty">沒有符合篩選條件的項目。</td></tr>`;
    el("entryBody").querySelectorAll("input,select").forEach(control=>control.addEventListener("input",onEntryChange));
    renderMetrics();
  }
  function onEntryChange(e){const r=record(selectedMonth(),e.target.dataset.id);const field=e.target.dataset.field;r[field]=field==="qty"?Math.max(0,Number(e.target.value)||0):e.target.value;if(field==="status")e.target.classList.toggle("unreviewed",r.status==="未檢核");persist(false);renderMetrics();renderOverview()}
  function monthAmounts(month){let personnel=0,facility=0;for(const item of items){const qty=Number(state.records[month]?.[item.id]?.qty)||0;const amount=lineRawAmount(item,qty);if(item.group==="personnel")personnel+=amount;else facility+=amount}const base=Math.min(personnel+facility,BASE_I_II);const tax=base*TAX_RATE;const preTax=base+tax;const vat=preTax*.05;const gross=preTax+vat;return {personnel,facility,tax,preTax,vat,gross,payable:gross*.95}}
  function cumulativeBase(){return items.reduce((sum,item)=>sum+cumulativeAmount(item),0)}
  function renderMetrics(){
    const month=selectedMonth();const m=monthAmounts(month);const personItems=items.filter(i=>i.group==="personnel");const totalPerson=personItems.reduce((s,i)=>s+i.qty,0);const usedPerson=personItems.reduce((s,i)=>s+cumulativeQty(i.id),0);const cumulative=Math.min(cumulativeBase(),BASE_I_II);const cumulativePreTax=cumulative*(1+TAX_RATE);const cumulativeGross=cumulativePreTax*1.05;const rec=monthRecord(month);const unreviewed=items.filter(i=>(rec[i.id]?.status||"未檢核")==="未檢核").length;
    el("contractTotal").textContent=money(CONTRACT_PRETAX);el("personMonthTotal").textContent=number(totalPerson);el("usedPersonMonth").textContent=number(usedPerson);el("remainingPersonMonth").textContent=number(Math.max(0,totalPerson-usedPerson));el("cumulativeGross").textContent=money(cumulativeGross);el("unreviewedCount").textContent=unreviewed;
    el("monthI").textContent=money(m.personnel);el("monthII").textContent=money(m.facility);el("monthTax").textContent=money(m.tax);el("monthPreTax").textContent=money(m.preTax);el("monthVat").textContent=money(m.vat);el("monthGross").textContent=money(m.gross);el("monthPayable").textContent=money(m.payable);
  }
  function renderOverview(){
    const anchor=selectedMonth();
    const taxBase=Math.min(cumulativeBase(),BASE_I_II);el("overviewBody").innerHTML=items.map(item=>{const used=cumulativeQty(item.id);const remaining=item.qty-used;const avg=recentAverage(item.id);const months=avg>0&&remaining>0?remaining/avg:null;const estimate=remaining<=0?"已用罄／待調配":months===null?"待累積用量":"約 "+number(months)+"月／"+addMonths(anchor,Math.ceil(months));const claimed=cumulativeAmount(item);const remainAmount=item.amount-claimed;return `<tr class="${item.group==='facility'?'facility':''}"><td><div class="item-code">${item.code}</div><div class="item-name">${esc(item.name)}</div></td><td>${item.unit}</td><td class="num">${number(item.qty)}</td><td class="num">${number(used)}</td><td class="num ${remaining<0?'over':remaining===0?'ok':''}">${number(remaining)}</td><td class="num">${avg?number(avg):'-'}</td><td>${estimate}</td><td class="num">${money(claimed)}</td><td class="num ${remainAmount<0?'over':''}">${money(remainAmount)}</td><td class="basis">${esc(item.basis)}</td></tr>`}).join("")+`<tr class="derived"><td><div class="item-code">參</div><div class="item-name">稅雜費（含利潤、管理費、保險費）</div></td><td>式</td><td class="num">1</td><td class="num">依比例</td><td class="num">依比例</td><td class="num">-</td><td>隨壹＋貳實際估驗比例</td><td class="num">${money(taxBase*TAX_RATE)}</td><td class="num">${money(TAX_TOTAL-taxBase*TAX_RATE)}</td><td class="basis">工作說明書11.4.2.2、11.5.1.3；依官方小計計算</td></tr>`;
  }
  function saveMonth(){persist(true);renderMetrics();alert(`${selectedMonth()} 已儲存。\n尚未檢核：${el('unreviewedCount').textContent}項。`)}
  function clearMonth(){const month=selectedMonth();if(!state.records[month])return alert("本月尚無資料。");if(!confirm(`確定清除 ${month} 的全部數量、狀態與備註？`))return;delete state.records[month];persist(true);renderEntry();renderOverview()}
  function download(name,type,content){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
  function exportCsv(){const rows=[["月份","類別","項次","項目","單位","數量","狀態","證據備註","估算金額"]];for(const month of allMonths())for(const item of items){const r=state.records[month]?.[item.id]||{qty:0,status:"未檢核",note:""};rows.push([month,item.group==="personnel"?"壹、監造人事費":"貳、設施（備）及其他費用",item.code,item.name,item.unit,r.qty,r.status,r.note,lineRawAmount(item,Number(r.qty)||0)])}const csv=rows.map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");download(`台電4合1_勞務請款列管_${VERSION}.csv`,`text/csv;charset=utf-8`,`\ufeff${csv}`)}
  function exportJson(){download(`台電4合1_勞務請款備份_${VERSION}.json`,`application/json`,JSON.stringify({exportedAt:new Date().toISOString(),state},null,2))}
  function importJson(file){const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);const incoming=data.state||data;if(!incoming||typeof incoming.records!=="object")throw new Error("格式不符");if(!confirm("匯入將覆蓋目前瀏覽器內的請款列管資料，確定繼續？"))return;state=incoming;persist(true);renderEntry();renderOverview();alert("匯入完成。") }catch(e){alert("匯入失敗："+e.message)}};reader.readAsText(file)}
  function init(){
    el("monthPicker").value=nowMonth();el("monthPicker").addEventListener("change",()=>{renderEntry();renderOverview()});
    document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));btn.classList.add("active");filter=btn.dataset.filter;renderEntry()}));
    el("saveBtn").addEventListener("click",saveMonth);el("clearMonthBtn").addEventListener("click",clearMonth);el("printBtn").addEventListener("click",()=>window.print());el("csvBtn").addEventListener("click",exportCsv);el("jsonBtn").addEventListener("click",exportJson);el("importFile").addEventListener("change",e=>{if(e.target.files[0])importJson(e.target.files[0]);e.target.value=""});el("showAllBtn").addEventListener("click",()=>{filter="all";document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.filter==="all"));renderEntry();document.querySelector(".panel").scrollIntoView({behavior:"smooth"})});
    renderEntry();renderOverview();
  }
  init();
})();
