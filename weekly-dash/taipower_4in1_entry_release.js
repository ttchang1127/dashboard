(function(){
  "use strict";
  const VERSION="2026-08-29";
  const STORE="taipower-4in1-entry-release:v1";
  const FORM_STORE="taipower-4in1-entry-forms:v1";
  const target=new Date("2026-09-01T00:00:00+08:00");
  const gateDefs=[
    {id:"plan",title:"1. 監造計畫核定",green:"已核定",options:["待確認","審查中","退補件","已核定"],hint:"核定函、日期、版次須能互相勾稽。"},
    {id:"people",title:"2. 實際派駐人員核准",green:"已核准",options:["待確認","審查中","退補件","已核准"],hint:"不能只以勞工清冊審查取代職務資格核准。"},
    {id:"schedule",title:"3. 115年9月出勤配置核可",green:"已核可",options:["待確認","待送","審查中","退補件","已核可"],hint:"應含名單、排班、代理與最低留守人力。"}
  ];
  const conditionDefs=[
    {id:"training",title:"12小時監造職前訓練",note:"計畫、簽到、照片、測驗及結訓紀錄",critical:true,nonwaivable:true},
    {id:"insurance",title:"勞保／職災保險與到職",note:"派駐日以前生效並與名冊一致",critical:true,nonwaivable:true},
    {id:"ppe",title:"PPE領用與適用性",note:"安全帽、安全鞋、反光背心等",critical:true,nonwaivable:true},
    {id:"pass",title:"工作證／臨時工作證",note:"依工區管制要求申請及核發",critical:true,nonwaivable:false},
    {id:"health",title:"健檢／尿檢",note:"依契約及工區實際要求判定",critical:true,nonwaivable:false},
    {id:"emergency",title:"緊急聯絡網與通報路徑",note:"含事故一小時速報及代理人",critical:true,nonwaivable:true},
    {id:"vehicle",title:"車輛、駕駛及第三人責任險",note:"未使用車輛時可附依據判定不適用",critical:false,nonwaivable:false},
    {id:"office",title:"工務所設備與文件管制",note:"電腦、網路、印表機、收發及權限",critical:false,nonwaivable:false},
    {id:"opening",title:"本工作開工報告格式與通知",note:"9/1填寫，依契約期限正式送達",critical:false,nonwaivable:false}
  ];
  const formDefs=[
    ["f01","進場前送審文件總表／公文追蹤","公司自製"],["f02","監造計畫審查意見回覆與版本管制表","公司自製"],["f03","人員資格送審封面及個人附件檢核表","公司自製"],["f04","人員異動及新舊資格比較表","公司自製"],["f05","115年9月出勤配置計畫／每日排班表","公司自製"],["f06","名冊、資格、投保、配置、簽到五表勾稽表","公司自製"],["f07","12小時職前訓練計畫及課程表","公司自製"],["f08","12小時職前訓練出席、照片、測驗及結訓紀錄","公司自製"],["f09","PPE需求、領用與適用性檢點表","公司自製"],["f10","車輛進場核准與保險檢核表","公司自製"],["f11","工務所設備、通訊及緊急聯絡檢點表","公司自製"],["f12","D-1正式派駐放行表","公司自製"],["f13","115/09/01進場首日紀錄","公司自製"],["f14","門檻未齊時台電暫行書面指示確認表","公司自製"],
    ["c01","附表1 監造組織人員差勤管制督導紀錄表","契約預覽"],["c02","附表四 公共工程施工日誌","契約預覽"],["c03","附表五 公共工程監造報表","契約預覽"],
    ["t01","本工作開工報告單－格式取得追蹤","待台電格式"],["t02","工作證／臨時工作證格式取得追蹤","待台電格式"],["t03","監造人員／公共工程雲端登錄追蹤","待台電格式"],["t04","台電出勤配置計畫格式取得追蹤","待台電格式"]
  ];
  const personFields=["approved","employed","insured","trained","pass","ppe","scheduled"];
  const yesOptions=["待確認","完成","不適用"];
  const el=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const optionHtml=(options,value)=>options.map(option=>`<option ${option===value?"selected":""}>${esc(option)}</option>`).join("");

  function initial(){
    return {
      version:VERSION,
      gates:Object.fromEntries(gateDefs.map(g=>[g.id,{status:g.options[0],evidence:"",date:"",owner:"",note:""}])),
      people:["監造主任","管理人員","協辦監造工程師","文書人員1","文書人員2"].map(role=>({role,name:"",approved:"待確認",employed:"待確認",insured:"待確認",trained:"待確認",pass:"待確認",ppe:"待確認",scheduled:"待確認"})),
      conditions:Object.fromEntries(conditionDefs.map(c=>[c.id,{status:"待確認",evidence:""}])),
      directive:{status:"未取得",docno:"",issuer:"",date:"",validUntil:"",scope:"",prohibited:""},
      meeting:{date:"2026-08-31",time:"",chair:"",participants:"",actualDecision:"待確認",conditions:"",openItems:"",nextReview:"",compiler:"",supervisor:"",manager:""},
      updatedAt:null
    };
  }
  function load(){try{const data=JSON.parse(localStorage.getItem(STORE));if(data&&data.gates&&data.people)return {...initial(),...data}}catch(error){}return initial()}
  function loadForms(){try{const data=JSON.parse(localStorage.getItem(FORM_STORE));if(data&&data.forms)return data}catch(error){}return {forms:{}}}
  let state=load();
  function persist(show=false){state.version=VERSION;state.updatedAt=new Date().toISOString();localStorage.setItem(STORE,JSON.stringify(state));if(show)el("saveNote").textContent=`已保存：${new Date(state.updatedAt).toLocaleString("zh-TW")}。正式證據仍須歸入受控卷宗。`}
  function lightFor(value,greenValue){if(value===greenValue||value==="完成"||value==="不適用")return "green";if(["審查中","待送","退補件"].includes(value))return "amber";return "red"}

  function renderGates(){
    el("gateGrid").innerHTML=gateDefs.map(def=>{const value=state.gates[def.id]||{};return `<article class="gate ${lightFor(value.status,def.green)}"><h3>${esc(def.title)}</h3><div class="field-grid"><div class="field"><label>審查狀態</label><select data-gate="${def.id}" data-key="status">${optionHtml(def.options,value.status)}</select></div><div class="field"><label>核定／核可日期</label><input type="date" data-gate="${def.id}" data-key="date" value="${esc(value.date)}"></div><div class="field full"><label>公文、收文或核定證據</label><input data-gate="${def.id}" data-key="evidence" value="${esc(value.evidence)}" placeholder="文號、版次、證據位置"></div><div class="field"><label>追蹤主責</label><input data-gate="${def.id}" data-key="owner" value="${esc(value.owner)}"></div><div class="field"><label>退補件／限制</label><input data-gate="${def.id}" data-key="note" value="${esc(value.note)}"></div></div><p style="margin:9px 0 0;color:var(--muted);font-size:.72rem">${esc(def.hint)}</p></article>`}).join("");
  }
  function personReady(person){return Boolean(person.name.trim())&&personFields.every(key=>person[key]==="完成"||(key==="pass"&&person[key]==="不適用"))}
  function renderPeople(){
    el("peopleBody").innerHTML=state.people.map((person,index)=>{const ready=personReady(person),active=Boolean(person.name.trim());const decision=!active?"未列入":ready?"可派駐":"不得派駐";const cls=!active?"state-amber":ready?"state-green":"state-red";return `<tr><td><input data-person="${index}" data-key="role" value="${esc(person.role)}" aria-label="職務"></td><td><input data-person="${index}" data-key="name" value="${esc(person.name)}" aria-label="姓名" placeholder="未填不列入"></td>${personFields.map(key=>`<td><select data-person="${index}" data-key="${key}" aria-label="${key}">${optionHtml(key==="pass"?yesOptions:["待確認","完成"],person[key])}</select></td>`).join("")}<td class="state-cell ${cls}">${decision}</td><td class="no-print"><button class="small-btn" type="button" data-remove-person="${index}" aria-label="刪除此人">×</button></td></tr>`}).join("");
  }
  function renderConditions(){
    el("conditionList").innerHTML=conditionDefs.map(def=>{const value=state.conditions[def.id]||{status:"待確認",evidence:""};const options=def.nonwaivable?["待確認","未完成","完成"]:["待確認","未完成","完成","不適用"];return `<div class="condition"><div><strong>${esc(def.title)}${def.nonwaivable?' <span style="color:var(--red)">●不可免除</span>':''}</strong><small>${esc(def.note)}</small><input data-condition="${def.id}" data-key="evidence" value="${esc(value.evidence)}" aria-label="${esc(def.title)}證據" placeholder="文號／證據／不適用依據" style="margin-top:5px"></div><select data-condition="${def.id}" data-key="status" aria-label="${esc(def.title)}狀態">${optionHtml(options,value.status)}</select></div>`}).join("");
  }
  function renderDirective(){
    const d=state.directive;
    el("directiveFields").innerHTML=`<div class="field"><label>書面指示狀態</label><select data-directive="status">${optionHtml(["未取得","取得中","已取得有效書面指示","已逾期／失效"],d.status)}</select></div><div class="field"><label>文號／會議紀錄</label><input data-directive="docno" value="${esc(d.docno)}"></div><div class="field"><label>台電有權指示人員／單位</label><input data-directive="issuer" value="${esc(d.issuer)}"></div><div class="field"><label>指示日期</label><input type="date" data-directive="date" value="${esc(d.date)}"></div><div class="field"><label>有效期限</label><input type="date" data-directive="validUntil" value="${esc(d.validUntil)}"></div><div class="field full"><label>允許執行範圍</label><textarea data-directive="scope">${esc(d.scope)}</textarea></div><div class="field full"><label>禁止事項／不得簽認範圍</label><textarea data-directive="prohibited">${esc(d.prohibited)}</textarea></div>`;
  }
  function renderMeeting(){
    const m=state.meeting;
    const fields=[["date","會議日期","date"],["time","會議時間","time"],["chair","主持人","text"],["participants","參與人員","text"],["actualDecision","會議實際結論","select"],["nextReview","下次複核時間","datetime-local"],["conditions","附帶條件／允許範圍","textarea"],["openItems","未結事項、主責與期限","textarea"],["compiler","編製人","text"],["supervisor","監造主任","text"],["manager","管理人員／核決","text"]];
    el("meetingFields").innerHTML=fields.map(([key,label,type])=>{const wide=["conditions","openItems"].includes(key)?" full":"";const control=type==="select"?`<select data-meeting="${key}">${optionHtml(["待確認","放行","附條件放行","不放行"],m[key])}</select>`:type==="textarea"?`<textarea data-meeting="${key}">${esc(m[key])}</textarea>`:`<input type="${type}" data-meeting="${key}" value="${esc(m[key])}">`;return `<div class="field${wide}"><label>${esc(label)}</label>${control}</div>`}).join("");
  }
  function formStatus(def,forms){const saved=forms.forms[def[0]];return saved?.status||(def[0].startsWith("t")?"待台電格式":"未開始")}
  function renderForms(){
    const forms=loadForms();const buckets={done:0,progress:0,waiting:0,blank:0};
    el("formsBody").innerHTML=formDefs.map(def=>{const saved=forms.forms[def[0]],status=formStatus(def,forms);if(["已送審","已核定"].includes(status))buckets.done++;else if(["準備中","待用印","退補件"].includes(status))buckets.progress++;else if(status==="待台電格式")buckets.waiting++;else buckets.blank++;const cls=["已送審","已核定"].includes(status)?"state-green":["準備中","待用印","退補件","待台電格式"].includes(status)?"state-amber":"state-red";const updated=saved?.updatedAt?new Date(saved.updatedAt).toLocaleString("zh-TW"):"—";return `<tr><td>${def[0].toUpperCase()}</td><td><a class="form-link" href="./taipower_4in1_entry_forms.html?form=${def[0]}">${esc(def[1])}</a></td><td>${esc(def[2])}</td><td class="state-cell ${cls}">${esc(status)}</td><td>${esc(updated)}</td></tr>`}).join("");
    el("formsDone").textContent=buckets.done;el("formsProgress").textContent=buckets.progress;el("formsWaiting").textContent=buckets.waiting;el("formsBlank").textContent=buckets.blank;
  }
  function evaluate(){
    const gateCount=gateDefs.filter(def=>state.gates[def.id]?.status===def.green).length;
    const activePeople=state.people.filter(person=>person.name.trim());
    const readyPeople=activePeople.filter(personReady);
    const missingConditions=conditionDefs.filter(def=>def.critical&&!["完成","不適用"].includes(state.conditions[def.id]?.status));
    const hardMissing=conditionDefs.filter(def=>def.nonwaivable&&state.conditions[def.id]?.status!=="完成");
    const directiveExpires=state.directive.validUntil?new Date(`${state.directive.validUntil}T23:59:59+08:00`):null;
    const directiveValid=state.directive.status==="已取得有效書面指示"&&Boolean(state.directive.docno.trim())&&Boolean(state.directive.issuer.trim())&&Boolean(state.directive.date)&&Boolean(state.directive.validUntil)&&directiveExpires>=new Date()&&Boolean(state.directive.scope.trim());
    let level="red",title="不得正式派駐",reason="";
    if(!activePeople.length)reason="尚未填入實際派駐人員。";
    else if(readyPeople.length!==activePeople.length)reason=`${activePeople.length-readyPeople.length}名派駐人員仍有資格、投保、訓練、證件、PPE或配置缺口。`;
    else if(hardMissing.length)reason=`不可免除條件未完成：${hardMissing.map(item=>item.title).join("、")}。`;
    else if(missingConditions.length)reason=`必要進場條件未完成：${missingConditions.map(item=>item.title).join("、")}。`;
    else if(gateCount===3){level="green";title="建議正式放行";reason="三道核可、人員及必要進場條件均已完成；仍須由D-1會議簽認。"}
    else if(directiveValid){level="amber";title="有條件進場";reason="三道核可未齊，只能依台電有效書面指示的範圍及期限執行，不得擴張為正式監造簽認。"}
    else reason=`三道核心核可僅完成${gateCount}項，且未具備可供例外判定的有效書面指示。`;
    const card=el("decisionCard");card.className=`decision ${level}`;el("decisionTitle").textContent=title;el("decisionReason").textContent=reason;el("gateScore").textContent=`${gateCount}／3`;el("peopleScore").textContent=`${readyPeople.length}／${activePeople.length}`;el("gateLabel").textContent=gateCount===3?"三道核可通過":"尚未通過";el("gateLabel").className=gateCount===3?"state-green":"state-red";
    const days=Math.ceil((target-new Date())/86400000);el("countdown").textContent=days>=0?`D-${days}`:`D+${Math.abs(days)}`;
  }
  function renderAll(){renderGates();renderPeople();renderConditions();renderDirective();renderMeeting();renderForms();evaluate();el("saveNote").textContent=state.updatedAt?`最後保存：${new Date(state.updatedAt).toLocaleString("zh-TW")}。正式證據仍須歸入受控卷宗。`:"資料只保存在目前瀏覽器；正式證據仍須歸入受控卷宗。"}
  function update(target){
    if(target.dataset.gate)state.gates[target.dataset.gate][target.dataset.key]=target.value;
    else if(target.dataset.person!==undefined)state.people[Number(target.dataset.person)][target.dataset.key]=target.value;
    else if(target.dataset.condition)state.conditions[target.dataset.condition][target.dataset.key]=target.value;
    else if(target.dataset.directive)state.directive[target.dataset.directive]=target.value;
    else if(target.dataset.meeting)state.meeting[target.dataset.meeting]=target.value;
    else return false;
    return true;
  }
  function download(name,content){const blob=new Blob([content],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
  function backup(){download(`觀音中大_D-1放行看板_${VERSION}.json`,JSON.stringify({version:VERSION,exportedAt:new Date().toISOString(),release:state,forms:loadForms()},null,2))}
  function restore(file){const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);const release=data.release||data;if(!release?.gates||!Array.isArray(release.people))throw new Error("不是D-1看板備份");if(!confirm("匯入將覆蓋目前瀏覽器的D-1看板資料；備份內若含21份表單，也會一併覆蓋。確定繼續？"))return;state={...initial(),...release};localStorage.setItem(STORE,JSON.stringify(state));if(data.forms?.forms)localStorage.setItem(FORM_STORE,JSON.stringify(data.forms));renderAll();alert("備份已匯入。") }catch(error){alert(`匯入失敗：${error.message}`)}};reader.readAsText(file)}
  document.addEventListener("input",event=>{if(update(event.target)){persist(false);evaluate()}});
  document.addEventListener("change",event=>{if(update(event.target)){persist(false);renderAll()}});
  document.addEventListener("click",event=>{const button=event.target.closest("[data-remove-person]");if(!button)return;if(state.people.length<=1)return alert("至少保留一列人員資料。");state.people.splice(Number(button.dataset.removePerson),1);persist(false);renderAll()});
  el("addPersonBtn").addEventListener("click",()=>{state.people.push({role:"",name:"",approved:"待確認",employed:"待確認",insured:"待確認",trained:"待確認",pass:"待確認",ppe:"待確認",scheduled:"待確認"});persist(false);renderAll()});
  el("saveBtn").addEventListener("click",()=>{persist(true);renderForms();evaluate()});
  el("printBtn").addEventListener("click",()=>window.print());
  el("backupBtn").addEventListener("click",backup);
  el("restoreFile").addEventListener("change",event=>{if(event.target.files[0])restore(event.target.files[0]);event.target.value=""});
  el("resetBtn").addEventListener("click",()=>{if(!confirm("確定清除D-1看板全部內容？21份表單資料不會被清除。"))return;state=initial();localStorage.removeItem(STORE);renderAll()});
  window.addEventListener("storage",event=>{if(event.key===FORM_STORE)renderForms()});
  renderAll();
})();
