(function(){
  "use strict";
  const VERSION="2026-08-29-R4";
  const STORE="taipower-4in1-entry-release:v1";
  const FORM_STORE="taipower-4in1-entry-forms:v1";
  const target=new Date("2026-09-01T00:00:00+08:00");
  const requiredInitialRoles=["管理人員","監造主任","協辦監造工程師","文書管理人員"];
  const gateDefs=[
    {id:"plan",title:"1. 監造計畫核定",green:"已核定",options:["待確認","審查中","退補件","已核定"],hint:"核定函、日期、版次須能互相勾稽。",basis:"工作說明書7.1、5.4～5.6"},
    {id:"people",title:"2. 實際派駐人員核准",green:"已核准",options:["待確認","審查中","退補件","已核准"],hint:"不能只以勞工清冊審查取代姓名、職務與資格核准。",basis:"工作說明書7.3.4～7.3.5"},
    {id:"schedule",title:"3. 115年9月出勤配置核可／核定",green:"已核可",options:["待確認","待送","審查中","退補件","已核可"],hint:"應含組織、名單、排班、代理與最低留守人力。",basis:"工作說明書7.1、7.3.1.2.13、7.3.3"}
  ];
  const conditionDefs=[
    {id:"notice",title:"甲方書面通知開始／派駐",note:"履約期限及監造責任以甲方書面通知開始；核對文號、日期與案別",basis:"技術服務契約第7條；工作說明書5.9、7.3.1.2.13",kind:"contract",critical:true,nonwaivable:true},
    {id:"laborRoster",title:"受僱勞工名冊、書面勞動契約及備查",note:"名冊與實際派駐人員一致，勞動契約影本及投保切結已依約送甲方",basis:"技術服務契約第8條第13項",kind:"contract",critical:true,nonwaivable:true},
    {id:"insurance",title:"勞保／就保／職災保／健保／勞退",note:"派駐人員依法完成勞保、就保、職災保、健保及勞退，且與名冊、到職日一致",basis:"技術服務契約第8條第13項、第10條第7項",kind:"contract",critical:true,nonwaivable:true},
    {id:"projectInsurance",title:"本工作履約保險已生效",note:"專業責任、雇主意外、團體傷害或雇主補償依契約生效；送件期限另依第10條第6項",basis:"技術服務契約第10條第1～7項",kind:"contract",critical:true,nonwaivable:true},
    {id:"training",title:"12小時以上監造職前訓練",note:"所有監造人員均完成；留存課程、講師、簽到、照片、測驗及結訓紀錄",basis:"工作說明書7.3.6",kind:"contract",critical:true,nonwaivable:true},
    {id:"generalSafety",title:"開工前一般安全衛生教育訓練",note:"這是安全衛生教育，不得以12小時監造職前訓練互相取代",basis:"承攬商安全衛生輔導要點第46點",kind:"contract",critical:true,nonwaivable:true},
    {id:"safetyPlan",title:"監造服務職安管理文件／工作守則",note:"依本工作規模與勞工人數備妥安全衛生管理計畫、工作守則及職安人員文件",basis:"承攬商安全衛生輔導要點第10～12點",kind:"contract",critical:true,nonwaivable:true},
    {id:"oshMeeting",title:"開工前安全衛生協商／工安會議",note:"達施工或工區作業觸發時點者，應出席人員須完成會議、危害告知及決議轉知；A模式尚未觸發時須附台電時程或書面依據",basis:"工作說明書9.17；承攬商安全衛生輔導要點第6點",kind:"contract",critical:true,nonwaivable:false},
    {id:"pass",title:"工作證／臨時工作證",note:"承攬工程或勞務人員按適用要點辦理；如初期派駐免辦，須有台電書面依據",basis:"承攬商安全衛生輔導要點第18、29點及附件工作證要點",kind:"contract",critical:true,nonwaivable:false},
    {id:"ppe",title:"PPE提供、領用與適用性",note:"安全帽、安全鞋、反光背心、工作服、背負式安全帶依實際工作風險配置",basis:"工作說明書8.3、9.15；承攬商安全衛生輔導要點第15點",kind:"contract",critical:true,nonwaivable:true},
    {id:"health",title:"健康檢查與健康管理",note:"依職安法規及實際工作風險管理；本次核對未發現固定的統一檢查項目與格式",basis:"工作說明書9.18；承攬商安全衛生輔導要點第10、45點",kind:"contract",critical:true,nonwaivable:false},
    {id:"urine",title:"特定人員尿液採驗適用性及完成證據",note:"契約附件已有明文；須由台電確認監造初期4類人員是否屬特定人員、首次或後續抽驗、通知及送件方式。適用者施工前採驗，報告於採驗後10日內密件送甲方",basis:"特定條款4.1.2第3～5、7點；4.1.3第2～11點",kind:"contract",critical:true,nonwaivable:false},
    {id:"emergency",title:"緊急通報系統、聯絡網與一小時速報",note:"開工前張貼聯絡系統，並建立災害與緊急事件通報路徑",basis:"工作說明書6.2、9.13、9.22；安全衛生輔導要點第9點",kind:"contract",critical:true,nonwaivable:true},
    {id:"minStaff",title:"平日至少2人駐守及代理安排",note:"核定出勤配置須能支持最低2人駐守；若台電另有核定配置，以核定內容勾稽",basis:"工作說明書7.6.3～7.6.8",kind:"contract",critical:true,nonwaivable:true},
    {id:"vehicle",title:"車輛、駕駛及汽機車第三人責任險",note:"有車輛進場／執行公務時核對；未使用車輛須記明判定依據",basis:"技術服務契約第10條第7項；工作說明書8.4～8.7",kind:"contract",critical:false,nonwaivable:false},
    {id:"office",title:"工務所設備與文件管制",note:"電腦、合法文書軟體、A3彩色事務機、網路、收發及權限",basis:"工作說明書8.1～8.2、8.6",kind:"contract",critical:false,nonwaivable:false},
    {id:"opening",title:"本工作開工報告單（函）預填與送達管制",note:"開工日填寫並於開工日起3日內送甲方核定；未取得制式格式先追件",basis:"工作說明書4.2.6.1、13.1",kind:"contract",critical:false,nonwaivable:false}
  ];
  const formDefs=[
    ["f01","進場前送審文件總表／公文追蹤","公司自製"],["f02","監造計畫審查意見回覆與版本管制表","公司自製"],["f03","人員資格送審封面及個人附件檢核表","公司自製"],["f04","人員異動及新舊資格比較表","公司自製"],["f05","115年9月出勤配置計畫／每日排班表","公司自製"],["f06","名冊、資格、投保、配置、簽到五表勾稽表","公司自製"],["f07","12小時職前訓練計畫及課程表","公司自製"],["f08","12小時職前訓練出席、照片、測驗及結訓紀錄","公司自製"],["f09","PPE需求、領用與適用性檢點表","公司自製"],["f10","車輛進場核准與保險檢核表","公司自製"],["f11","工務所設備、通訊及緊急聯絡檢點表","公司自製"],["f12","D-1正式派駐放行表","公司自製"],["f13","115/09/01進場首日紀錄","公司自製"],["f14","正式派駐門檻未齊之限定前置作業書面指示紀錄","公司自製"],
    ["c01","附表1 監造組織人員差勤管制督導紀錄表","契約預覽"],["c02","附表四 公共工程施工日誌","契約預覽"],["c03","附表五 公共工程監造報表","契約預覽"],["c04","附表三 監造單位現場人員登錄表","契約預覽"],["c05","附表三 輸供系統承攬商工作人員工作證申請表","契約預覽"],["c06","附表一 輸變電工程處承攬商工作人員臨時工作證申請表","契約預覽"],
    ["t01","本工作開工報告單－格式取得追蹤","待台電格式"],["t02","工作證／臨時工作證格式取得追蹤","待台電格式"],["t03","監造人員／公共工程雲端登錄追蹤","待台電格式"],["t04","台電出勤配置計畫格式取得追蹤","待台電格式"]
  ];
  const personDefs=[
    {key:"qualification",options:["待確認","完成","契約無證照要求"]},
    {key:"approved",options:["待確認","完成"]},
    {key:"employed",options:["待確認","完成"]},
    {key:"insured",options:["待確認","完成"]},
    {key:"trained",options:["待確認","完成"]},
    {key:"safetyTrained",options:["待確認","完成"]},
    {key:"urine",options:["待確認","完成","台電書面確認不適用"]},
    {key:"pass",options:["待確認","完成"]},
    {key:"ppe",options:["待確認","完成"]},
    {key:"scheduled",options:["待確認","完成"]}
  ];
  const el=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const optionHtml=(options,value)=>options.map(option=>`<option ${option===value?"selected":""}>${esc(option)}</option>`).join("");

  function blankPerson(role=""){
    return {role,name:"",qualification:"待確認",approved:"待確認",employed:"待確認",insured:"待確認",trained:"待確認",safetyTrained:"待確認",urine:"待確認",pass:"待確認",ppe:"待確認",scheduled:"待確認"};
  }
  function initial(){
    return {
      version:VERSION,
      gates:Object.fromEntries(gateDefs.map(g=>[g.id,{status:g.options[0],evidence:"",date:"",owner:"",note:""}])),
      people:requiredInitialRoles.map(blankPerson),
      conditions:Object.fromEntries(conditionDefs.map(c=>[c.id,{status:"待確認",evidence:""}])),
      directive:{status:"未取得",docno:"",issuer:"",authority:"",date:"",validUntil:"",classification:"待確認",billing:"待確認",scope:"",prohibited:""},
      meeting:{date:"2026-08-31",time:"",chair:"",participants:"",actualDecision:"待確認",conditions:"",openItems:"",nextReview:"",compiler:"",supervisor:"",manager:""},
      updatedAt:null
    };
  }
  function load(){
    const base=initial();
    try{
      const data=JSON.parse(localStorage.getItem(STORE));
      if(data&&data.gates&&Array.isArray(data.people)){
        let people=data.people.map(person=>({...blankPerson(person.role),...person}));
        if(data.version!==VERSION){
          people=people.map(person=>person.role==="文書人員1"?{...person,role:"文書管理人員"}:person);
          people=people.filter(person=>!(person.role==="文書人員2"&&!person.name));
          requiredInitialRoles.forEach(role=>{if(!people.some(person=>person.role===role))people.push(blankPerson(role))});
        }
        const meeting={...base.meeting,...data.meeting};if(meeting.actualDecision==="附條件放行")meeting.actualDecision="限定前置進場（非正式派駐）";
        return {...base,...data,gates:{...base.gates,...data.gates},conditions:{...base.conditions,...data.conditions},directive:{...base.directive,...data.directive},meeting,people};
      }
    }catch(error){}
    return base;
  }
  function loadForms(){try{const data=JSON.parse(localStorage.getItem(FORM_STORE));if(data&&data.forms)return data}catch(error){}return {forms:{}}}
  let state=load();
  function persist(show=false){state.version=VERSION;state.updatedAt=new Date().toISOString();localStorage.setItem(STORE,JSON.stringify(state));if(show)el("saveNote").textContent=`已保存：${new Date(state.updatedAt).toLocaleString("zh-TW")}。正式證據仍須歸入受控卷宗。`}
  function lightFor(value,greenValue){if(value===greenValue||value==="完成"||value==="不適用")return "green";if(["審查中","待送","退補件"].includes(value))return "amber";return "red"}

  function renderGates(){
    el("gateGrid").innerHTML=gateDefs.map(def=>{const value=state.gates[def.id]||{};return `<article class="gate ${lightFor(value.status,def.green)}"><h3>${esc(def.title)}</h3><div class="field-grid"><div class="field"><label>審查狀態</label><select data-gate="${def.id}" data-key="status">${optionHtml(def.options,value.status)}</select></div><div class="field"><label>核定／核可日期</label><input type="date" data-gate="${def.id}" data-key="date" value="${esc(value.date)}"></div><div class="field full"><label>公文、收文或核定證據</label><input data-gate="${def.id}" data-key="evidence" value="${esc(value.evidence)}" placeholder="文號、版次、證據位置"></div><div class="field"><label>追蹤主責</label><input data-gate="${def.id}" data-key="owner" value="${esc(value.owner)}"></div><div class="field"><label>退補件／限制</label><input data-gate="${def.id}" data-key="note" value="${esc(value.note)}"></div></div><p style="margin:9px 0 0;color:var(--muted);font-size:.72rem">${esc(def.hint)}<br><span class="basis">依據：${esc(def.basis)}</span></p></article>`}).join("");
  }
  function personReady(person){
    if(!person.name.trim())return false;
    return personDefs.every(def=>{
      if(def.key==="qualification"&&person[def.key]==="契約無證照要求")return person.role.includes("文書");
      if(def.key==="urine"&&person[def.key]==="台電書面確認不適用")return true;
      if(def.key==="pass"&&state.conditions.pass?.status==="不適用"&&state.conditions.pass?.evidence?.trim())return true;
      return person[def.key]==="完成";
    });
  }
  function renderPeople(){
    el("peopleBody").innerHTML=state.people.map((person,index)=>{const ready=personReady(person),active=Boolean(person.name.trim());const decision=!active?"未列入":ready?"可派駐":"不得派駐";const cls=!active?"state-amber":ready?"state-green":"state-red";return `<tr><td><input data-person="${index}" data-key="role" value="${esc(person.role)}" aria-label="職務"></td><td><input data-person="${index}" data-key="name" value="${esc(person.name)}" aria-label="姓名" placeholder="未填不列入"></td>${personDefs.map(def=>`<td><select data-person="${index}" data-key="${def.key}" aria-label="${def.key}">${optionHtml(def.options,person[def.key])}</select></td>`).join("")}<td class="state-cell ${cls}">${decision}</td><td class="no-print"><button class="small-btn" type="button" data-remove-person="${index}" aria-label="刪除此人">×</button></td></tr>`}).join("");
  }
  function kindLabel(kind){return kind==="contract"?"契約明文":kind==="control"?"內部管制":"待台電確認"}
  function renderConditions(){
    el("conditionList").innerHTML=conditionDefs.map(def=>{const value=state.conditions[def.id]||{status:"待確認",evidence:""};const options=def.nonwaivable?["待確認","未完成","完成"]:["待確認","未完成","完成","不適用"];return `<div class="condition"><div><strong>${esc(def.title)}<span class="kind ${def.kind}">${kindLabel(def.kind)}</span>${def.nonwaivable?' <span style="color:var(--red)">●不可免除</span>':''}</strong><small>${esc(def.note)}</small><small class="basis">依據：${esc(def.basis)}</small><input data-condition="${def.id}" data-key="evidence" value="${esc(value.evidence)}" aria-label="${esc(def.title)}證據" placeholder="文號／證據／不適用依據" style="margin-top:5px"></div><select data-condition="${def.id}" data-key="status" aria-label="${esc(def.title)}狀態">${optionHtml(options,value.status)}</select></div>`}).join("");
  }
  function renderDirective(){
    const d=state.directive;
    el("directiveFields").innerHTML=`<div class="field"><label>書面指示狀態</label><select data-directive="status">${optionHtml(["未取得","取得中","已取得且適用9/1","已逾期／失效"],d.status)}</select></div><div class="field"><label>文號／正式會議紀錄</label><input data-directive="docno" value="${esc(d.docno)}"></div><div class="field"><label>台電有權指示人員／單位</label><input data-directive="issuer" value="${esc(d.issuer)}"></div><div class="field"><label>代表權／授權依據</label><input data-directive="authority" value="${esc(d.authority)}" placeholder="職稱、分層負責或正式函文"></div><div class="field"><label>指示日期</label><input type="date" data-directive="date" value="${esc(d.date)}"></div><div class="field"><label>有效期限</label><input type="date" data-directive="validUntil" value="${esc(d.validUntil)}"></div><div class="field"><label>性質已明載</label><select data-directive="classification">${optionHtml(["待確認","僅前置作業（非正式派駐）"],d.classification)}</select></div><div class="field"><label>計價已明載</label><select data-directive="billing">${optionHtml(["待確認","明載不計價","明載可計價","另依契約核定"],d.billing)}</select></div><div class="field full"><label>允許執行範圍</label><textarea data-directive="scope">${esc(d.scope)}</textarea></div><div class="field full"><label>禁止事項／不得查驗、簽認及計價範圍</label><textarea data-directive="prohibited">${esc(d.prohibited)}</textarea></div>`;
  }
  function renderMeeting(){
    const m=state.meeting;
    const fields=[["date","會議日期","date"],["time","會議時間","time"],["chair","主持人","text"],["participants","參與人員","text"],["actualDecision","會議實際結論","select"],["nextReview","下次複核時間","datetime-local"],["conditions","附帶條件／允許範圍","textarea"],["openItems","未結事項、主責與期限","textarea"],["compiler","編製人","text"],["supervisor","監造主任","text"],["manager","管理人員／核決","text"]];
    el("meetingFields").innerHTML=fields.map(([key,label,type])=>{const wide=["conditions","openItems"].includes(key)?" full":"";const control=type==="select"?`<select data-meeting="${key}">${optionHtml(["待確認","放行","限定前置進場（非正式派駐）","不放行"],m[key])}</select>`:type==="textarea"?`<textarea data-meeting="${key}">${esc(m[key])}</textarea>`:`<input type="${type}" data-meeting="${key}" value="${esc(m[key])}">`;return `<div class="field${wide}"><label>${esc(label)}</label>${control}</div>`}).join("");
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
    const missingRoles=requiredInitialRoles.filter(role=>!activePeople.some(person=>person.role.trim()===role&&personReady(person)));
    const conditionDone=def=>state.conditions[def.id]?.status==="完成"||(state.conditions[def.id]?.status==="不適用"&&Boolean(state.conditions[def.id]?.evidence?.trim()));
    const missingConditions=conditionDefs.filter(def=>def.critical&&!conditionDone(def));
    const hardMissing=conditionDefs.filter(def=>def.nonwaivable&&def.id!=="notice"&&state.conditions[def.id]?.status!=="完成");
    const yellowBlocking=missingConditions.filter(def=>def.id!=="notice");
    const directiveIssued=state.directive.date?new Date(`${state.directive.date}T00:00:00+08:00`):null;
    const directiveExpires=state.directive.validUntil?new Date(`${state.directive.validUntil}T23:59:59+08:00`):null;
    const directiveValid=state.directive.status==="已取得且適用9/1"&&Boolean(state.directive.docno.trim())&&Boolean(state.directive.issuer.trim())&&Boolean(state.directive.authority.trim())&&Boolean(state.directive.date)&&Boolean(state.directive.validUntil)&&directiveIssued<=target&&directiveExpires>=target&&state.directive.classification==="僅前置作業（非正式派駐）"&&state.directive.billing!=="待確認"&&Boolean(state.directive.scope.trim())&&Boolean(state.directive.prohibited.trim());
    let level="red",title="不得正式派駐",reason="";
    if(!activePeople.length)reason="尚未填入實際派駐人員。";
    else if(missingRoles.length)reason=`初期派駐必要職類尚無合格實際人員：${missingRoles.join("、")}。`;
    else if(readyPeople.length!==activePeople.length)reason=`${activePeople.length-readyPeople.length}名派駐人員仍有資格、投保、訓練、尿液採驗適用性、證件、PPE或配置缺口。`;
    else if(hardMissing.length)reason=`不可免除條件未完成：${hardMissing.map(item=>item.title).join("、")}。`;
    else if(yellowBlocking.length)reason=`必要進場條件未完成或不適用未附依據：${yellowBlocking.map(item=>item.title).join("、")}。`;
    else if(gateCount===3&&!missingConditions.length){level="green";title="建議正式放行";reason="三道核可、甲方書面通知、人員及必要進場條件均已完成；仍須由D-1會議簽認。"}
    else if(directiveValid){level="amber";title="限定前置進場（非正式派駐）";reason="契約正式派駐條件未齊，只能依有權代表之書面指示，在明載範圍、期限與計價方式內執行；不得視為免除契約義務。"}
    else reason=`正式派駐尚缺三道核可或甲方書面通知，且不具備完整有效的限定前置作業書面指示。`;
    const card=el("decisionCard");card.className=`decision ${level}`;el("decisionTitle").textContent=title;el("decisionReason").textContent=reason;el("gateScore").textContent=`${gateCount}／3`;el("peopleScore").textContent=`${readyPeople.length}／${activePeople.length}`;el("gateLabel").textContent=gateCount===3?"三道核可通過":"尚未通過";el("gateLabel").className=gateCount===3?"state-green":"state-red";
    const actual=state.meeting.actualDecision;const conflict=(level==="red"&&["放行","限定前置進場（非正式派駐）"].includes(actual))||(level==="amber"&&actual==="放行");const warning=el("meetingWarning");warning.className=`meeting-warning ${conflict?"show":""}`;warning.textContent=conflict?`警告：會議實際結論「${actual}」高於契約檢核建議「${title}」。請勿簽認，應先補齊條件或記明合法核決與契約變更依據。`:"";
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
  function restore(file){const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);const release=data.release||data;if(!release?.gates||!Array.isArray(release.people))throw new Error("不是D-1看板備份");if(!confirm("匯入將覆蓋目前瀏覽器的D-1看板資料；備份內若含24份表單，也會一併覆蓋。確定繼續？"))return;const base=initial();const meeting={...base.meeting,...release.meeting};if(meeting.actualDecision==="附條件放行")meeting.actualDecision="限定前置進場（非正式派駐）";state={...base,...release,gates:{...base.gates,...release.gates},conditions:{...base.conditions,...release.conditions},directive:{...base.directive,...release.directive},meeting,people:release.people.map(person=>({...blankPerson(person.role),...person}))};localStorage.setItem(STORE,JSON.stringify(state));if(data.forms?.forms)localStorage.setItem(FORM_STORE,JSON.stringify(data.forms));renderAll();alert("備份已匯入。") }catch(error){alert(`匯入失敗：${error.message}`)}};reader.readAsText(file)}
  document.addEventListener("input",event=>{if(update(event.target)){persist(false);evaluate()}});
  document.addEventListener("change",event=>{if(update(event.target)){persist(false);renderAll()}});
  document.addEventListener("click",event=>{const button=event.target.closest("[data-remove-person]");if(!button)return;if(state.people.length<=1)return alert("至少保留一列人員資料。");state.people.splice(Number(button.dataset.removePerson),1);persist(false);renderAll()});
  el("addPersonBtn").addEventListener("click",()=>{state.people.push(blankPerson());persist(false);renderAll()});
  el("saveBtn").addEventListener("click",()=>{persist(true);renderForms();evaluate()});
  el("printBtn").addEventListener("click",()=>window.print());
  el("backupBtn").addEventListener("click",backup);
  el("restoreFile").addEventListener("change",event=>{if(event.target.files[0])restore(event.target.files[0]);event.target.value=""});
  el("resetBtn").addEventListener("click",()=>{if(!confirm("確定清除D-1看板全部內容？24份表單資料不會被清除。"))return;state=initial();localStorage.removeItem(STORE);renderAll()});
  window.addEventListener("storage",event=>{if(event.key===FORM_STORE)renderForms()});
  renderAll();
})();
